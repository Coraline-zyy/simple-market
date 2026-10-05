-- Run once in Supabase SQL Editor. Existing tasks stay unrestricted.
begin;
alter table public.services add column if not exists task_starts_at timestamptz;
alter table public.services add column if not exists task_ends_at timestamptz;
alter table public.services add column if not exists task_date_only boolean not null default false;
alter table public.demands add column if not exists task_starts_at timestamptz;
alter table public.demands add column if not exists task_ends_at timestamptz;
alter table public.demands add column if not exists task_date_only boolean not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname='services_task_time_valid' and conrelid='public.services'::regclass) then
    alter table public.services add constraint services_task_time_valid check (
      (task_starts_at is null and task_ends_at is null and not task_date_only) or
      (task_starts_at is not null and task_ends_at is not null and task_ends_at >= task_starts_at));
  end if;
  if not exists (select 1 from pg_constraint where conname='demands_task_time_valid' and conrelid='public.demands'::regclass) then
    alter table public.demands add constraint demands_task_time_valid check (
      (task_starts_at is null and task_ends_at is null and not task_date_only) or
      (task_starts_at is not null and task_ends_at is not null and task_ends_at >= task_starts_at));
  end if;
end $$;
create index if not exists services_task_time_idx on public.services(task_starts_at,task_ends_at);
create index if not exists demands_task_time_idx on public.demands(task_starts_at,task_ends_at);
commit;
notify pgrst, 'reload schema';
