-- Apply after 2026_court_and_admin.sql. Enable Confirm email and the Auth hook separately.
begin;
create or replace function public.university_for_email(p_email text) returns text language sql immutable set search_path='' as $$
 select case lower(split_part(trim(p_email),'@',2))
 when 'ucl.ac.uk' then 'UCL' when 'lse.ac.uk' then 'LSE'
 when 'imperial.ac.uk' then 'Imperial College London' when 'ic.ac.uk' then 'Imperial College London'
 when 'kcl.ac.uk' then 'King’s College London' when 'arts.ac.uk' then 'UAL'
 when 'citystgeorges.ac.uk' then 'City St George’s' when 'city.ac.uk' then 'City St George’s' when 'sgul.ac.uk' then 'City St George’s'
 when 'qmul.ac.uk' then 'Queen Mary University of London' when 'kingston.ac.uk' then 'Kingston University'
 else case when lower(split_part(trim(p_email),'@',2)) ~ '^[a-z]{2}[0-9]{2}\.qmul\.ac\.uk$' then 'Queen Mary University of London' end end
 where p_email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
$$;
create or replace function public.is_university_member() returns boolean language sql stable security definer set search_path='' as $$
 select public.is_market_admin() or exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and public.university_for_email(u.email) is not null)
$$;
-- Register this function as Authentication > Hooks > Before User Created.
create or replace function public.before_university_user_created(event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if public.university_for_email(event->'user'->>'email') is null then
 return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Registration is limited to supported London university email addresses.'));
 end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.before_university_user_created(jsonb) from public,anon,authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_university_user_created(jsonb) to supabase_auth_admin;

-- Add restrictive policies without removing existing ownership/participant rules.
do $$ declare tab text; begin
 foreach tab in array array['profiles','services','demands','conversations','messages','deals','reviews','community_posts','community_comments','community_votes','reports','court_cases','court_evidence','court_votes'] loop
  if to_regclass('public.'||tab) is not null then
   execute format('drop policy if exists university_admission on public.%I',tab);
   execute format('create policy university_admission on public.%I as restrictive for all to authenticated using(public.is_university_member()) with check(public.is_university_member())',tab);
  end if;
 end loop;
end $$;
-- Security-definer RPCs can bypass RLS; writes are guarded at the table too.
create or replace function public.enforce_university_admission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.is_university_member() then raise exception 'Verify a supported university email before using this feature'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
do $$ declare tab text; begin
 foreach tab in array array['services','demands','conversations','messages','deals','reviews','community_posts','community_comments','community_votes','reports','court_cases','court_evidence','court_votes'] loop
 if to_regclass('public.'||tab) is not null then
 execute format('drop trigger if exists university_write_guard on public.%I',tab);
 execute format('create trigger university_write_guard before insert or update or delete on public.%I for each row execute function public.enforce_university_admission()',tab);
 end if; end loop;
end $$;

create table if not exists public.student_verifications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 school text not null,file_path text not null unique,
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 submitted_at timestamptz not null default now(), reviewed_at timestamptz,reviewed_by uuid references auth.users(id),
 reason text,expires_at timestamptz
);
create unique index if not exists one_pending_student_review on public.student_verifications(user_id) where status='pending';
alter table public.student_verifications enable row level security;
revoke all on public.student_verifications from anon,authenticated;
grant select on public.student_verifications to authenticated;
drop policy if exists student_review_read on public.student_verifications;
create policy student_review_read on public.student_verifications for select to authenticated using(public.is_university_member() and (user_id=auth.uid() or public.is_market_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-verification','student-verification',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.can_upload_student_file(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_university_member() and split_part(p_path,'/',1)=auth.uid()::text
 and p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
 and not exists(select 1 from public.student_verifications where file_path=p_path)
 and not exists(select 1 from public.student_verifications where user_id=auth.uid() and status='pending')
$$;
create or replace function public.can_read_student_file(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_university_member() and (
 (split_part(p_path,'/',1)=auth.uid()::text and not exists(select 1 from public.student_verifications where file_path=p_path))
 or exists(select 1 from public.student_verifications v where v.file_path=p_path and (public.is_market_admin() or (v.user_id=auth.uid() and (v.status='pending' or v.reviewed_at>now()-interval '7 days')))))
$$;
create or replace function public.can_delete_student_file(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_university_member() and (
 (split_part(p_path,'/',1)=auth.uid()::text and (not exists(select 1 from public.student_verifications where file_path=p_path) or exists(select 1 from public.student_verifications where file_path=p_path and user_id=auth.uid() and status='rejected' and reason='Consent withdrawn')))
 or (public.is_market_admin() and exists(select 1 from public.student_verifications where file_path=p_path and status<>'pending' and reviewed_at<=now()-interval '7 days')))
$$;
drop policy if exists student_upload on storage.objects;
create policy student_upload on storage.objects for insert to authenticated with check(bucket_id='student-verification' and public.can_upload_student_file(name));
drop policy if exists student_read on storage.objects;
create policy student_read on storage.objects for select to authenticated using(bucket_id='student-verification' and public.can_read_student_file(name));
drop policy if exists student_delete on storage.objects;
create policy student_delete on storage.objects for delete to authenticated using(bucket_id='student-verification' and public.can_delete_student_file(name));
-- Restrictive guards also protect against permissive policies on other buckets.
drop policy if exists student_guard_insert on storage.objects;
create policy student_guard_insert on storage.objects as restrictive for insert to public with check(bucket_id<>'student-verification' or public.can_upload_student_file(name));
drop policy if exists student_guard_read on storage.objects;
create policy student_guard_read on storage.objects as restrictive for select to public using(bucket_id<>'student-verification' or public.can_read_student_file(name));
drop policy if exists student_guard_update on storage.objects;
create policy student_guard_update on storage.objects as restrictive for update to public using(bucket_id<>'student-verification') with check(bucket_id<>'student-verification');
drop policy if exists student_guard_delete on storage.objects;
create policy student_guard_delete on storage.objects as restrictive for delete to public using(bucket_id<>'student-verification' or public.can_delete_student_file(name));

create or replace function public.submit_student_verification(p_path text) returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); school_name text; result uuid;
begin
 if me is null or not public.is_university_member() then raise exception 'Verified university email required'; end if;
 select public.university_for_email(email) into school_name from auth.users where id=me and email_confirmed_at is not null;
 if school_name is null then raise exception 'University account required for student verification'; end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,0));
 if not public.can_upload_student_file(p_path) or not exists(select 1 from storage.objects where bucket_id='student-verification' and name=p_path) then raise exception 'Invalid or already submitted file'; end if;
 if exists(select 1 from public.student_verifications where user_id=me and school=school_name and status='approved' and expires_at>now()) then raise exception 'Student verification already active'; end if;
 insert into public.student_verifications(user_id,school,file_path) values(me,school_name,p_path) returning id into result;
 return result;
end $$;
create or replace function public.review_student_verification(p_id uuid,p_approve boolean,p_reason text,p_expires timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare v public.student_verifications;
begin
 if not public.is_market_admin() then raise exception 'Administrator only'; end if;
 if p_approve is null or p_reason is null or char_length(trim(p_reason))<3 or char_length(p_reason)>1000 then raise exception 'Review reason required'; end if;
 select * into v from public.student_verifications where id=p_id for update;
 if not found or v.status<>'pending' then raise exception 'Pending application not found'; end if;
 if v.user_id=auth.uid() then raise exception 'Cannot review your own application'; end if;
 if p_approve and (p_expires is null or p_expires<=now() or p_expires>now()+interval '1 year') then raise exception 'Expiry must be within one year'; end if;
 if p_approve and not exists(select 1 from auth.users where id=v.user_id and email_confirmed_at is not null and public.university_for_email(email)=v.school) then raise exception 'University email no longer valid'; end if;
 update public.student_verifications set status=case when p_approve then 'approved' else 'rejected' end,reason=trim(p_reason),reviewed_at=now(),reviewed_by=auth.uid(),expires_at=case when p_approve then p_expires end where id=p_id;
 insert into public.admin_actions(admin_id,action,target_id,details) values(auth.uid(),'student_verification_review',p_id,jsonb_build_object('approved',p_approve,'reason',p_reason,'expires_at',p_expires));
end $$;
create or replace function public.public_verification(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('university',case when u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) then public.university_for_email(u.email) end,
 'student',u.email_confirmed_at is not null and public.university_for_email(u.email) is not null and exists(select 1 from public.student_verifications v where v.user_id=u.id and v.status='approved' and v.school=public.university_for_email(u.email) and v.expires_at>now()))
 from auth.users u where u.id=p_user
$$;
revoke all on function public.submit_student_verification(text),public.review_student_verification(uuid,boolean,text,timestamptz),public.public_verification(uuid),public.is_university_member(),public.can_upload_student_file(text),public.can_read_student_file(text),public.can_delete_student_file(text) from public;
grant execute on function public.submit_student_verification(text),public.review_student_verification(uuid,boolean,text,timestamptz),public.is_university_member(),public.can_upload_student_file(text),public.can_read_student_file(text),public.can_delete_student_file(text) to authenticated;
grant execute on function public.public_verification(uuid) to anon,authenticated;
create or replace function public.withdraw_student_verification() returns text[] language plpgsql security definer set search_path='' as $$
declare paths text[];
begin
 if auth.uid() is null or not public.is_university_member() then raise exception 'University account required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select coalesce(array_agg(file_path),'{}') into paths from public.student_verifications where user_id=auth.uid();
 update public.student_verifications set status='rejected',reason='Consent withdrawn',expires_at=null,reviewed_at=now() where user_id=auth.uid();
 return paths;
end $$;
create or replace function public.cleanup_student_review_records() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if not public.is_market_admin() then raise exception 'Administrator only'; end if;
 update public.student_verifications set status='rejected',reason='Application expired after 30 days',reviewed_at=now() where status='pending' and submitted_at<now()-interval '30 days';
 delete from public.student_verifications v where status<>'pending' and coalesce(expires_at,reviewed_at)<now()-interval '90 days'
 and not exists(select 1 from storage.objects o where o.bucket_id='student-verification' and o.name=v.file_path);
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.withdraw_student_verification(),public.cleanup_student_review_records() from public;
grant execute on function public.withdraw_student_verification(),public.cleanup_student_review_records() to authenticated;
drop policy if exists university_storage_admission on storage.objects;
create policy university_storage_admission on storage.objects as restrictive for all to authenticated using(public.is_university_member()) with check(public.is_university_member());
commit;
