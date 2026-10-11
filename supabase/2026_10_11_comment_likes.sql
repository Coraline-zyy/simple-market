-- Run after the community and court/admin migrations. Safe to run again.
begin;
create table if not exists public.community_comment_likes (
 comment_id uuid not null references public.community_comments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(comment_id,user_id)
);
alter table public.community_comment_likes enable row level security;
revoke all on public.community_comment_likes from public,anon,authenticated;
grant select on public.community_comment_likes to authenticated;
grant all on public.community_comment_likes to service_role;
drop policy if exists comment_likes_read_own on public.community_comment_likes;
create policy comment_likes_read_own on public.community_comment_likes for select to authenticated using(user_id=auth.uid());

-- Public counts and the caller's own state, never other users' identities.
create or replace function public.get_comment_like_states(p_comments uuid[])
 returns table(comment_id uuid,like_count bigint,liked boolean)
 language sql stable security definer set search_path='' as $$
 select c.id,(select count(*) from public.community_comment_likes l where l.comment_id=c.id),
 exists(select 1 from public.community_comment_likes l where l.comment_id=c.id and l.user_id=auth.uid())
 from public.community_comments c join public.community_posts p on p.id=c.post_id
 where c.id=any(p_comments) and not c.moderation_deleted and not p.moderation_deleted
$$;
create or replace function public.set_comment_like(p_comment uuid,p_liked boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); total bigint;
begin
 if me is null then raise exception 'Please sign in'; end if;
 if p_liked is null then raise exception 'Invalid like state'; end if;
 if public.is_account_muted() then raise exception 'Account is muted'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment:'||p_comment::text||me::text,0));
 perform 1 from public.community_comments c join public.community_posts p on p.id=c.post_id
 where c.id=p_comment and not c.moderation_deleted and not p.moderation_deleted for share of c,p;
 if not found then raise exception 'Comment unavailable'; end if;
 if p_liked then
  insert into public.community_comment_likes(comment_id,user_id) values(p_comment,me) on conflict do nothing;
 else
  delete from public.community_comment_likes where comment_id=p_comment and user_id=me;
 end if;
 select count(*) into total from public.community_comment_likes where comment_id=p_comment;
 return jsonb_build_object('comment_id',p_comment,'like_count',total,'liked',p_liked);
end $$;
revoke all on function public.get_comment_like_states(uuid[]),public.set_comment_like(uuid,boolean) from public,anon,authenticated;
grant execute on function public.get_comment_like_states(uuid[]) to anon,authenticated;
grant execute on function public.set_comment_like(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
