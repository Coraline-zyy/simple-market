begin;
create table if not exists public.university_visibility(user_id uuid primary key references auth.users(id),show_university boolean not null default false);
alter table public.university_visibility enable row level security;
revoke all on public.university_visibility from anon,authenticated;
grant select on public.university_visibility to authenticated;
drop policy if exists university_visibility_self on public.university_visibility;
create policy university_visibility_self on public.university_visibility for select to authenticated using(user_id=auth.uid());
create or replace function public.get_university_settings() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('school',case when u.email_confirmed_at is not null then public.university_for_email(u.email) end,'show_university',coalesce(v.show_university,false)) from auth.users u left join public.university_visibility v on v.user_id=u.id where u.id=auth.uid()
$$;
create or replace function public.set_university_visibility(p_show boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_university_member() or auth.uid() is null or p_show is null then raise exception 'Verified university account required'; end if;
 insert into public.university_visibility(user_id,show_university) values(auth.uid(),p_show) on conflict(user_id) do update set show_university=excluded.show_university;
end $$;
create or replace function public.public_verification(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('university_verified',u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and public.university_for_email(u.email) is not null,
 'university',case when u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and coalesce(p.show_university,false) then public.university_for_email(u.email) end,
 'student',u.email_confirmed_at is not null and public.university_for_email(u.email) is not null and exists(select 1 from public.student_verifications v where v.user_id=u.id and v.status='approved' and v.school=public.university_for_email(u.email) and v.expires_at>now()))
 from auth.users u left join public.university_visibility p on p.user_id=u.id where u.id=p_user
$$;
revoke all on function public.get_university_settings(),public.set_university_visibility(boolean) from public;
grant execute on function public.get_university_settings(),public.set_university_visibility(boolean) to authenticated;
-- Public badges never expose email or the hidden school; private preferences are owner-only.
create table if not exists public.student_upload_configuration(id boolean primary key default true check(id),privacy_ready boolean not null default false);
insert into public.student_upload_configuration(id,privacy_ready) values(true,false) on conflict do nothing;
alter table public.student_upload_configuration enable row level security;
revoke all on public.student_upload_configuration from anon,authenticated;
create or replace function public.student_uploads_ready() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select privacy_ready from public.student_upload_configuration where id=true),false)
$$;
revoke all on function public.student_uploads_ready() from public;
grant execute on function public.student_uploads_ready() to authenticated;
create or replace function public.can_upload_student_file(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.student_uploads_ready() and public.is_university_member() and split_part(p_path,'/',1)=auth.uid()::text
 and p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
 and not exists(select 1 from public.student_verifications where file_path=p_path)
 and not exists(select 1 from public.student_verifications where user_id=auth.uid() and status='pending')
$$;
commit;
