-- Run once in Supabase SQL Editor after the university verification migrations.
-- Opens registration and ordinary marketplace use to every confirmed-email account.
-- University-email verification remains available as an optional profile badge.

begin;

-- If the Before User Created hook is still enabled in the dashboard, allow all emails.
create or replace function public.before_university_user_created(event jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$ select '{}'::jsonb $$;

revoke all on function public.before_university_user_created(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_university_user_created(jsonb) to supabase_auth_admin;

-- Remove the university-only restrictive policies from ordinary platform tables.
do $$
declare tab text;
begin
  foreach tab in array array[
    'profiles','services','demands','conversations','messages','deals','reviews',
    'community_posts','community_comments','community_votes','reports',
    'court_cases','court_evidence','court_votes'
  ] loop
    if to_regclass('public.' || tab) is not null then
      execute format('drop policy if exists university_admission on public.%I', tab);
    end if;
  end loop;
end $$;

-- Remove the matching write guards. Existing ownership and participant rules remain.
do $$
declare tab text;
begin
  foreach tab in array array[
    'services','demands','conversations','messages','deals','reviews',
    'community_posts','community_comments','community_votes','reports',
    'court_cases','court_evidence','court_votes'
  ] loop
    if to_regclass('public.' || tab) is not null then
      execute format('drop trigger if exists university_write_guard on public.%I', tab);
    end if;
  end loop;
end $$;

drop policy if exists university_storage_admission on storage.objects;

select pg_notify('pgrst', 'reload schema');
commit;
