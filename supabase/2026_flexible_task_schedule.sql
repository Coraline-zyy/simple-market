-- Run AFTER 2026_task_time_ranges.sql. Preserves legacy timestamps unchanged.
begin;
alter table public.services add column if not exists task_schedule_v2 boolean not null default false;
alter table public.services add column if not exists task_date_from date;
alter table public.services add column if not exists task_date_to date;
alter table public.services add column if not exists task_time_from time without time zone;
alter table public.services add column if not exists task_time_to time without time zone;
alter table public.services add column if not exists task_timezone text;
alter table public.demands add column if not exists task_schedule_v2 boolean not null default false;
alter table public.demands add column if not exists task_date_from date;
alter table public.demands add column if not exists task_date_to date;
alter table public.demands add column if not exists task_time_from time without time zone;
alter table public.demands add column if not exists task_time_to time without time zone;
alter table public.demands add column if not exists task_timezone text;
do $$ declare tab text;
begin
 foreach tab in array array['services','demands'] loop
  if not exists(select 1 from pg_constraint where conname=tab||'_flexible_schedule_check' and conrelid=('public.'||tab)::regclass) then
   execute format('alter table public.%I add constraint %I check (
    (task_date_from is null and task_date_to is null or task_date_from is not null and task_date_to is not null and task_date_to>=task_date_from)
    and (task_time_from is null and task_time_to is null or task_time_from is not null and task_time_to is not null and task_time_from<>task_time_to and task_time_from<time ''24:00'' and task_time_to<time ''24:00'')
    and (not task_schedule_v2 or task_starts_at is null and task_ends_at is null and not task_date_only and task_timezone is not null)
    and (task_schedule_v2 or task_date_from is null and task_date_to is null and task_time_from is null and task_time_to is null)
   )',tab,tab||'_flexible_schedule_check');
  end if;
 end loop;
end $$;
create or replace function public.validate_schedule_timezone() returns trigger language plpgsql set search_path='' as $$
begin
 if new.task_schedule_v2 and not exists(select 1 from pg_catalog.pg_timezone_names where name=new.task_timezone) then raise exception 'Invalid schedule timezone'; end if;
 return new;
end $$;
drop trigger if exists validate_schedule_timezone on public.services;
create trigger validate_schedule_timezone before insert or update on public.services for each row execute function public.validate_schedule_timezone();
drop trigger if exists validate_schedule_timezone on public.demands;
create trigger validate_schedule_timezone before insert or update on public.demands for each row execute function public.validate_schedule_timezone();
revoke all on function public.validate_schedule_timezone() from public,anon,authenticated;
commit;
notify pgrst,'reload schema';
