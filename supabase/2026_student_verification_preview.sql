-- Apply LAST, after university and visibility migrations. No historical data is deleted.
begin;
create or replace function public.student_uploads_ready() returns boolean language sql stable security definer set search_path='' as $$ select false $$;
create or replace function public.can_upload_student_file(p_path text) returns boolean language sql stable security definer set search_path='' as $$ select false $$;
create or replace function public.submit_student_verification(p_path text) returns uuid language plpgsql security definer set search_path='' as $$ begin raise exception 'Student verification is not available'; end $$;
create or replace function public.review_student_verification(p_id uuid,p_approve boolean,p_reason text,p_expires timestamptz) returns void language plpgsql security definer set search_path='' as $$ begin raise exception 'Student verification is not available'; end $$;
create or replace function public.public_verification(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('university_verified',u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and public.university_for_email(u.email) is not null,
 'university',case when u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and coalesce(p.show_university,false) then public.university_for_email(u.email) end,
 'student',false)
 from auth.users u left join public.university_visibility p on p.user_id=u.id where u.id=p_user
$$;
commit;
