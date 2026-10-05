-- Run once after the existing schema and 2026_marketplace_features.sql.
-- Safe to run again. Adds discussion/social communities and the cooperation workflow.

create extension if not exists "pgcrypto";

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('discussion','social')),
  category text not null default 'general',
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 5 and 10000),
  location text,
  event_time timestamptz,
  is_free boolean not null default false,
  score integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_are_free check (kind <> 'social' or is_free = true)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create index if not exists community_posts_kind_created_idx on public.community_posts(kind,created_at desc);
create index if not exists community_comments_post_idx on public.community_comments(post_id,created_at);
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_votes enable row level security;

drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts for select to public using (true);
drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts for insert to authenticated with check (auth.uid()=author_id);
drop policy if exists community_posts_owner_change on public.community_posts;
create policy community_posts_owner_change on public.community_posts for update to authenticated using (auth.uid()=author_id) with check (auth.uid()=author_id);
drop policy if exists community_posts_owner_delete on public.community_posts;
create policy community_posts_owner_delete on public.community_posts for delete to authenticated using (auth.uid()=author_id);
drop policy if exists community_comments_read on public.community_comments;
create policy community_comments_read on public.community_comments for select to public using (true);
drop policy if exists community_comments_insert on public.community_comments;
create policy community_comments_insert on public.community_comments for insert to authenticated with check (auth.uid()=author_id);
drop policy if exists community_comments_owner_delete on public.community_comments;
create policy community_comments_owner_delete on public.community_comments for delete to authenticated using (auth.uid()=author_id);
drop policy if exists community_votes_read on public.community_votes;
create policy community_votes_read on public.community_votes for select to public using (true);
drop policy if exists community_votes_own on public.community_votes;
create policy community_votes_own on public.community_votes for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.refresh_community_counts() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid:=coalesce(new.post_id,old.post_id);
begin
 update community_posts p set
   score=(select coalesce(sum(value),0) from community_votes where post_id=target),
   comment_count=(select count(*) from community_comments where post_id=target)
 where p.id=target;
 return coalesce(new,old);
end $$;
drop trigger if exists community_comment_count on public.community_comments;
create trigger community_comment_count after insert or delete on public.community_comments for each row execute function public.refresh_community_counts();
drop trigger if exists community_vote_count on public.community_votes;
create trigger community_vote_count after insert or update or delete on public.community_votes for each row execute function public.refresh_community_counts();

alter table public.deals add column if not exists collaboration_owner_confirmed boolean not null default false;
alter table public.deals add column if not exists collaboration_other_confirmed boolean not null default false;
alter table public.deals add column if not exists completion_owner_confirmed boolean not null default false;
alter table public.deals add column if not exists completion_other_confirmed boolean not null default false;
alter table public.deals add column if not exists workflow_status text not null default 'chatting';
alter table public.deals drop constraint if exists deals_workflow_status_check;
alter table public.deals add constraint deals_workflow_status_check check (workflow_status in ('chatting','pending','active','completion_pending','done','arbitration'));

-- Replaces the earlier legacy trigger; workflow RPCs below are authoritative.
drop trigger if exists enforce_two_party_deal_confirmation_trigger on public.deals;

create or replace function public.confirm_collaboration(p_conversation_id uuid)
returns public.deals language plpgsql security definer set search_path=public as $$
declare c conversations%rowtype; d deals%rowtype; me uuid:=auth.uid();
begin
 select * into c from conversations where id=p_conversation_id and me in (owner_id,other_id);
 if not found then raise exception 'Not a conversation participant'; end if;
 insert into deals(conversation_id,workflow_status) values(p_conversation_id,'pending') on conflict(conversation_id) do nothing;
 if me=c.owner_id then update deals set collaboration_owner_confirmed=true where conversation_id=p_conversation_id returning * into d;
 else update deals set collaboration_other_confirmed=true where conversation_id=p_conversation_id returning * into d; end if;
 update deals set workflow_status=case when collaboration_owner_confirmed and collaboration_other_confirmed then 'active' else 'pending' end,updated_at=now() where id=d.id returning * into d;
 return d;
end $$;

create or replace function public.confirm_completion(p_deal_id uuid)
returns public.deals language plpgsql security definer set search_path=public as $$
declare c conversations%rowtype; d deals%rowtype; me uuid:=auth.uid();
begin
 select c.* into c from conversations c join deals d on d.conversation_id=c.id where d.id=p_deal_id and me in(c.owner_id,c.other_id);
 if not found then raise exception 'Not a deal participant'; end if;
 if me=c.owner_id then update deals set completion_owner_confirmed=true where id=p_deal_id returning * into d;
 else update deals set completion_other_confirmed=true where id=p_deal_id returning * into d; end if;
 update deals set workflow_status=case when completion_owner_confirmed and completion_other_confirmed then 'done' else 'completion_pending' end,
   status=case when completion_owner_confirmed and completion_other_confirmed then 'done' else 'confirming' end,
   owner_confirmed=completion_owner_confirmed,other_confirmed=completion_other_confirmed,updated_at=now()
 where id=p_deal_id returning * into d;
 if d.workflow_status='done' then
   if c.post_type='service' then update services set status='completed' where id=c.post_id;
   else update demands set status='completed' where id=c.post_id; end if;
 end if;
 return d;
end $$;

create or replace function public.open_deal_arbitration(p_deal_id uuid)
returns public.deals language plpgsql security definer set search_path=public as $$
declare d deals%rowtype; me uuid:=auth.uid();
begin
 update deals set workflow_status='arbitration',updated_at=now() where id=p_deal_id and exists(select 1 from conversations c where c.id=deals.conversation_id and me in(c.owner_id,c.other_id)) returning * into d;
 if not found then raise exception 'Not a deal participant'; end if; return d;
end $$;

grant execute on function public.confirm_collaboration(uuid) to authenticated;
grant execute on function public.confirm_completion(uuid) to authenticated;
grant execute on function public.open_deal_arbitration(uuid) to authenticated;
select pg_notify('pgrst','reload schema');
