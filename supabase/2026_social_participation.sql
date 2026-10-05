-- Run once after 2026_community_and_workflow.sql.
-- Adds flexible activity scheduling and Strava-style participation.

alter table public.community_posts add column if not exists task_schedule_v2 boolean not null default false;
alter table public.community_posts add column if not exists task_date_from date;
alter table public.community_posts add column if not exists task_date_to date;
alter table public.community_posts add column if not exists task_time_from time;
alter table public.community_posts add column if not exists task_time_to time;
alter table public.community_posts add column if not exists task_timezone text;

create table if not exists public.community_participants (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create index if not exists community_participants_post_created_idx on public.community_participants(post_id,created_at);
alter table public.community_participants enable row level security;

drop policy if exists community_participants_read on public.community_participants;
create policy community_participants_read on public.community_participants for select to public using (true);
drop policy if exists community_participants_join on public.community_participants;
create policy community_participants_join on public.community_participants for insert to authenticated
with check (auth.uid()=user_id and exists(select 1 from public.community_posts p where p.id=post_id and p.kind='social'));
drop policy if exists community_participants_leave on public.community_participants;
create policy community_participants_leave on public.community_participants for delete to authenticated using(auth.uid()=user_id);

grant select on public.community_participants to anon,authenticated;
grant insert,delete on public.community_participants to authenticated;
grant select,insert,update,delete on public.community_participants to service_role;

create or replace function public.add_social_author_as_participant() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='social' then insert into public.community_participants(post_id,user_id) values(new.id,new.author_id) on conflict do nothing; end if;
 return new;
end $$;
drop trigger if exists social_author_participates on public.community_posts;
create trigger social_author_participates after insert on public.community_posts for each row execute function public.add_social_author_as_participant();

insert into public.community_participants(post_id,user_id)
select id,author_id from public.community_posts where kind='social'
on conflict do nothing;

create or replace function public.join_community_activity(p_post uuid) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.community_posts where id=p_post and kind='social') then raise exception 'Activity not found'; end if;
 insert into public.profiles(id) values(me) on conflict(id) do nothing;
 insert into public.community_participants(post_id,user_id) values(p_post,me) on conflict do nothing;
end $$;
revoke all on function public.join_community_activity(uuid) from public,anon;
grant execute on function public.join_community_activity(uuid) to authenticated;
