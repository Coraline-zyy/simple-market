-- Run once in Supabase SQL Editor after the base marketplace schema.
-- Stores the task deposit requirement; no payment is collected by this schema.

begin;
alter table public.services add column if not exists required_deposit numeric(12,2) not null default 0;
alter table public.demands add column if not exists required_deposit numeric(12,2) not null default 0;
alter table public.services drop constraint if exists services_required_deposit_check;
alter table public.demands drop constraint if exists demands_required_deposit_check;
alter table public.services add constraint services_required_deposit_check check(required_deposit >= 0 and required_deposit <= 100000);
alter table public.demands add constraint demands_required_deposit_check check(required_deposit >= 0 and required_deposit <= 100000);
select pg_notify('pgrst','reload schema');
commit;
