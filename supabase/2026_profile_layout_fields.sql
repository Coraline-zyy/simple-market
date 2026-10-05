-- Run once in Supabase SQL Editor. Safe to rerun.
alter table public.profiles add column if not exists expertise text;
alter table public.profiles add column if not exists personality_tags text[] not null default '{}'::text[];
alter table public.profiles add column if not exists joined_at timestamptz;
update public.profiles p set joined_at = u.created_at from auth.users u where u.id = p.id and p.joined_at is null;
alter table public.profiles alter column joined_at set default now();
select pg_notify('pgrst', 'reload schema');
