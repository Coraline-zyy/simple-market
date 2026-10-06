-- Run after 2026_court_and_admin.sql and the existing community migrations.
-- Adds independent administrator DMs and forum likes. Existing task chats are unchanged.
begin;
create table if not exists public.admin_private_threads (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references auth.users(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint admin_private_threads_distinct check(admin_id <> user_id),
 unique(admin_id,user_id)
);
create table if not exists public.admin_private_messages (
 id uuid primary key default gen_random_uuid(),
 thread_id uuid not null references public.admin_private_threads(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(char_length(btrim(content)) between 1 and 5000),
 created_at timestamptz not null default now()
);
create index if not exists admin_private_messages_thread_time on public.admin_private_messages(thread_id,created_at desc,id desc);
alter table public.admin_private_threads enable row level security;
alter table public.admin_private_messages enable row level security;
revoke all on public.admin_private_threads, public.admin_private_messages from public,anon,authenticated;
grant select on public.admin_private_threads to authenticated;
grant select,insert on public.admin_private_messages to authenticated;
grant all on public.admin_private_threads,public.admin_private_messages to service_role;
drop policy if exists dm_thread_participant_read on public.admin_private_threads;
create policy dm_thread_participant_read on public.admin_private_threads for select to authenticated
 using(auth.uid()=user_id or (auth.uid()=admin_id and public.is_market_admin()));
drop policy if exists dm_message_participant_read on public.admin_private_messages;
create policy dm_message_participant_read on public.admin_private_messages for select to authenticated using(
 exists(select 1 from public.admin_private_threads t where t.id=thread_id));
drop policy if exists dm_message_participant_insert on public.admin_private_messages;
create policy dm_message_participant_insert on public.admin_private_messages for insert to authenticated with check(
 sender_id=auth.uid() and exists(select 1 from public.admin_private_threads t where t.id=thread_id));
-- Only the administrator may initiate; both authorized participants may reply.
create or replace function public.start_admin_private_chat(p_user uuid) returns uuid
 language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_market_admin() then raise exception 'Administrator access required'; end if;
 if p_user is null or p_user=auth.uid() or not exists(select 1 from auth.users where id=p_user) then raise exception 'Invalid recipient'; end if;
 insert into public.admin_private_threads(admin_id,user_id) values(auth.uid(),p_user)
 on conflict(admin_id,user_id) do update set admin_id=excluded.admin_id returning id into result;
 return result;
end $$;
create or replace function public.search_admin_chat_users(p_query text default '')
 returns table(id uuid,username text,avatar_path text)
 language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_market_admin() then raise exception 'Administrator access required'; end if;
 return query select p.id,p.username::text,p.avatar_path::text from public.profiles p
 where p.id<>auth.uid() and (btrim(coalesce(p_query,''))='' or strpos(lower(coalesce(p.username,'')),lower(btrim(p_query)))>0 or strpos(p.id::text,btrim(p_query))>0)
 order by p.username nulls last,p.id limit 50;
end $$;
revoke all on function public.start_admin_private_chat(uuid), public.search_admin_chat_users(text) from public,anon;
grant execute on function public.start_admin_private_chat(uuid), public.search_admin_chat_users(text) to authenticated;

create table if not exists public.community_likes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
alter table public.community_likes enable row level security;
revoke all on public.community_likes from public,anon,authenticated;
grant select on public.community_likes to authenticated;
grant all on public.community_likes to service_role;
drop policy if exists community_likes_read_own on public.community_likes;
create policy community_likes_read_own on public.community_likes for select to authenticated using(user_id=auth.uid());
-- Aggregated counts are public; the identities of other liking users are not exposed.
create or replace function public.get_forum_like_states(p_posts uuid[])
 returns table(post_id uuid,like_count bigint,liked boolean)
 language sql stable security definer set search_path='' as $$
 select p.id,(select count(*) from public.community_likes l where l.post_id=p.id),
 exists(select 1 from public.community_likes l where l.post_id=p.id and l.user_id=auth.uid())
 from public.community_posts p where p.id=any(p_posts) and p.kind='discussion'
 and (not p.moderation_deleted or public.is_market_admin())
$$;
create or replace function public.set_forum_like(p_post uuid,p_liked boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); total bigint;
begin
 if me is null then raise exception 'Please sign in'; end if;
 if p_liked is null then raise exception 'Invalid like state'; end if;
 if public.is_account_muted() then raise exception 'Account is muted'; end if;
 if not exists(select 1 from public.community_posts p where p.id=p_post and p.kind='discussion' and not p.moderation_deleted) then raise exception 'Post unavailable'; end if;
 -- Serialize repeated requests from the same user; desired-state calls are idempotent.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_post::text||me::text,0));
 if p_liked then insert into public.community_likes(post_id,user_id) values(p_post,me) on conflict do nothing;
 else delete from public.community_likes where post_id=p_post and user_id=me; end if;
 select count(*) into total from public.community_likes where post_id=p_post;
 return jsonb_build_object('post_id',p_post,'like_count',total,'liked',p_liked);
end $$;
revoke all on function public.get_forum_like_states(uuid[]),public.set_forum_like(uuid,boolean) from public,anon,authenticated;
grant execute on function public.get_forum_like_states(uuid[]) to anon,authenticated;
grant execute on function public.set_forum_like(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
