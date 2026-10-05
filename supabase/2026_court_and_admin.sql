-- Run AFTER existing marketplace/workflow/time migrations, in SQL Editor as postgres.
-- This transaction fails safely if the designated verified account is missing.
begin;
create table if not exists public.market_admins(user_id uuid primary key references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.account_mutes(user_id uuid primary key references auth.users(id), until_at timestamptz not null, reason text not null, updated_at timestamptz not null default now());
create table if not exists public.admin_actions(id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id), action text not null, target_id uuid not null, details jsonb not null, created_at timestamptz not null default now());
alter table public.market_admins enable row level security;
alter table public.account_mutes enable row level security;
alter table public.admin_actions enable row level security;
revoke all on public.market_admins,public.account_mutes,public.admin_actions from anon,authenticated;
grant select on public.market_admins,public.account_mutes,public.admin_actions to authenticated;
create or replace function public.is_market_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.market_admins where user_id=auth.uid())
$$;
create or replace function public.is_account_muted() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.account_mutes where user_id=auth.uid() and until_at>now())
$$;
drop policy if exists admins_read_self on public.market_admins;
create policy admins_read_self on public.market_admins for select to authenticated using(user_id=auth.uid() or public.is_market_admin());
drop policy if exists mutes_read on public.account_mutes;
create policy mutes_read on public.account_mutes for select to authenticated using(user_id=auth.uid() or public.is_market_admin());
drop policy if exists audit_admin_read on public.admin_actions;
create policy audit_admin_read on public.admin_actions for select to authenticated using(public.is_market_admin());
do $$ declare target uuid; n integer;
begin
 select count(*) into n from auth.users where lower(email)='2604635611@qq.com' and email_confirmed_at is not null;
 if n<>1 then raise exception 'Expected exactly one verified account: 2604635611@qq.com. Confirm the account first.'; end if;
 select id into target from auth.users where lower(email)='2604635611@qq.com' and email_confirmed_at is not null;
 insert into public.market_admins(user_id) values(target) on conflict do nothing;
end $$;

-- Soft deletion preserves orders and evidence while removing posts from public listings.
alter table public.services add column if not exists moderation_deleted boolean not null default false;
alter table public.demands add column if not exists moderation_deleted boolean not null default false;
alter table public.community_posts add column if not exists moderation_deleted boolean not null default false;
alter table public.community_comments add column if not exists moderation_deleted boolean not null default false;
create or replace function public.enforce_content_moderation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null then
   if tg_op in ('INSERT','UPDATE') and public.is_account_muted() then raise exception 'Account is muted'; end if;
   if tg_op='INSERT' and new.moderation_deleted then raise exception 'Invalid moderation flag'; end if;
   if tg_op='UPDATE' and (old.moderation_deleted or new.moderation_deleted is distinct from old.moderation_deleted) and not public.is_market_admin() then raise exception 'Administrator only'; end if;
 end if;
 return new;
end $$;
do $$ declare tab text;
begin
 foreach tab in array array['services','demands','community_posts','community_comments'] loop
   execute format('drop trigger if exists content_moderation on public.%I',tab);
   execute format('create trigger content_moderation before insert or update on public.%I for each row execute function public.enforce_content_moderation()',tab);
   execute format('drop policy if exists hide_moderated_content on public.%I',tab);
   execute format('create policy hide_moderated_content on public.%I as restrictive for select to public using(not moderation_deleted or public.is_market_admin())',tab);
 end loop;
end $$;
create or replace function public.enforce_message_mute() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if public.is_account_muted() and (tg_op='INSERT' or new.content is distinct from old.content) then raise exception 'Account is muted'; end if;
 return new;
end $$;
drop trigger if exists message_mute on public.messages;
create trigger message_mute before insert or update on public.messages for each row execute function public.enforce_message_mute();

create or replace function public.admin_remove_content(p_kind text,p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare tab text; n integer;
begin
 if not public.is_market_admin() then raise exception 'Administrator only'; end if;
 if p_reason is null or char_length(trim(p_reason))<3 then raise exception 'Reason required'; end if;
 tab:=case p_kind when 'service' then 'services' when 'demand' then 'demands' when 'post' then 'community_posts' when 'comment' then 'community_comments' else null end;
 if tab is null then raise exception 'Invalid content type'; end if;
 execute format('update public.%I set moderation_deleted=true where id=$1 and not moderation_deleted',tab) using p_id;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Content not found or already removed'; end if;
 insert into public.admin_actions(admin_id,action,target_id,details) values(auth.uid(),'remove_content',p_id,jsonb_build_object('kind',p_kind,'reason',p_reason));
end $$;
create or replace function public.admin_set_mute(p_user uuid,p_days integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_market_admin() then raise exception 'Administrator only'; end if;
 if p_user is null or exists(select 1 from public.market_admins where user_id=p_user) then raise exception 'Cannot mute an administrator'; end if;
 if p_days is null or p_days<0 or p_days>3650 or p_reason is null or char_length(trim(p_reason))<3 then raise exception 'Invalid duration/reason'; end if;
 insert into public.account_mutes(user_id,until_at,reason) values(p_user,now()+make_interval(days=>p_days),p_reason)
 on conflict(user_id) do update set until_at=excluded.until_at,reason=excluded.reason,updated_at=now();
 insert into public.admin_actions(admin_id,action,target_id,details) values(auth.uid(),'set_mute',p_user,jsonb_build_object('days',p_days,'reason',p_reason));
end $$;

create table if not exists public.court_cases(
 id uuid primary key default gen_random_uuid(), deal_id uuid not null unique references public.deals(id),
 owner_id uuid not null references auth.users(id), other_id uuid not null references auth.users(id),
 title text not null, status text not null default 'collecting' check(status in('collecting','voting','closed')),
 verdict text check(verdict in('owner','other','neither')), verdict_reason text,
 resolved_by uuid references auth.users(id), resolved_at timestamptz,
 created_at timestamptz not null default now(),
 check(owner_id<>other_id)
);
create table if not exists public.court_evidence(
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.court_cases(id),
 author_id uuid not null references auth.users(id), statement text not null check(char_length(statement) between 10 and 10000),
 image_paths text[] not null default '{}', message_excerpts jsonb not null default '[]',
 created_at timestamptz not null default now(), unique(case_id,author_id),
 check(cardinality(image_paths)<=10)
);
create table if not exists public.court_votes(
 case_id uuid not null references public.court_cases(id), voter_id uuid not null references auth.users(id),
 choice text not null check(choice in('owner','other','neither')), created_at timestamptz not null default now(),
 primary key(case_id,voter_id)
);
alter table public.court_cases enable row level security;
alter table public.court_evidence enable row level security;
alter table public.court_votes enable row level security;
revoke all on public.court_cases,public.court_evidence,public.court_votes from anon,authenticated;
grant select on public.court_cases,public.court_evidence,public.court_votes to authenticated;
drop policy if exists court_case_read on public.court_cases;
create policy court_case_read on public.court_cases for select to authenticated using(true);
drop policy if exists court_evidence_read on public.court_evidence;
create policy court_evidence_read on public.court_evidence for select to authenticated using(
 author_id=auth.uid() or public.is_market_admin() or exists(select 1 from public.court_cases c where c.id=case_id and (auth.uid() in(c.owner_id,c.other_id) or c.status in('voting','closed'))));
drop policy if exists court_vote_self on public.court_votes;
create policy court_vote_self on public.court_votes for select to authenticated using(voter_id=auth.uid() or public.is_market_admin());

create or replace function public.open_deal_arbitration(p_deal_id uuid) returns public.deals language plpgsql security definer set search_path='' as $$
declare d public.deals%rowtype; c public.conversations%rowtype; task_title text;
begin
 select * into d from public.deals where id=p_deal_id for update;
 if not found or d.status='done' or d.workflow_status='done' then raise exception 'No open deal'; end if;
 select * into c from public.conversations where id=d.conversation_id;
 if auth.uid() is null or auth.uid() not in(c.owner_id,c.other_id) or c.owner_id=c.other_id then raise exception 'Not a participant'; end if;
 if exists(select 1 from public.court_cases where deal_id=d.id and status='closed') then raise exception 'Case already closed'; end if;
 if c.post_type='service' then select title into task_title from public.services where id=c.post_id;
 else select title into task_title from public.demands where id=c.post_id; end if;
 insert into public.court_cases(deal_id,owner_id,other_id,title) values(d.id,c.owner_id,c.other_id,coalesce(task_title,'Disputed task')) on conflict(deal_id) do nothing;
 if d.workflow_status='arbitration' then return d; end if;
 update public.deals set workflow_status='arbitration',updated_at=now() where id=d.id returning * into d;
 return d;
end $$;
-- Prevent ordinary confirmation RPCs/direct writes from overwriting an active case.
create or replace function public.guard_court_workflow() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='done' and (new.status<>'done' or new.workflow_status<>'done') then raise exception 'Completed deal is immutable'; end if;
 if old.workflow_status='arbitration' and exists(select 1 from public.court_cases where deal_id=old.id and status<>'closed') and new is distinct from old then raise exception 'Deal locked during arbitration'; end if;
 return new;
end $$;
drop trigger if exists guard_court_workflow on public.deals;
create trigger guard_court_workflow before update on public.deals for each row execute function public.guard_court_workflow();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('court-evidence','court-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.can_read_court_file(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_market_admin() or split_part(p_name,'/',1)=auth.uid()::text or exists(
 select 1 from public.court_evidence e join public.court_cases c on c.id=e.case_id
 where p_name=any(e.image_paths) and (auth.uid() in(c.owner_id,c.other_id) or c.status in('voting','closed'))))
$$;
create or replace function public.can_upload_court_file(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(p_name,'/',1)=auth.uid()::text and exists(
 select 1 from public.court_cases c where c.id::text=split_part(p_name,'/',2) and auth.uid() in(c.owner_id,c.other_id) and c.status='collecting'
 and not exists(select 1 from public.court_evidence e where e.case_id=c.id and e.author_id=auth.uid()))
$$;
drop policy if exists court_storage_insert on storage.objects;
create policy court_storage_insert on storage.objects for insert to authenticated with check(bucket_id='court-evidence' and public.can_upload_court_file(name));
drop policy if exists court_storage_read on storage.objects;
create policy court_storage_read on storage.objects for select to authenticated using(bucket_id='court-evidence' and public.can_read_court_file(name));
-- Restrictive guards also apply when an older project has broad Storage policies.
-- Helpers avoid requiring anonymous users to have SELECT on court tables.
drop policy if exists court_storage_guard_read on storage.objects;
create policy court_storage_guard_read on storage.objects as restrictive for select to public using(bucket_id<>'court-evidence' or public.can_read_court_file(name));
drop policy if exists court_storage_guard_insert on storage.objects;
create policy court_storage_guard_insert on storage.objects as restrictive for insert to public with check(bucket_id<>'court-evidence' or public.can_upload_court_file(name));
drop policy if exists court_storage_guard_update on storage.objects;
create policy court_storage_guard_update on storage.objects as restrictive for update to public using(bucket_id<>'court-evidence') with check(bucket_id<>'court-evidence');
drop policy if exists court_storage_guard_delete on storage.objects;
create policy court_storage_guard_delete on storage.objects as restrictive for delete to public using(bucket_id<>'court-evidence');

create or replace function public.submit_court_evidence(p_case uuid,p_statement text,p_paths text[],p_messages uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare c public.court_cases%rowtype; conv uuid; path text; excerpts jsonb; me uuid:=auth.uid();
begin
 select * into c from public.court_cases where id=p_case for update;
 if not found or me is null or me not in(c.owner_id,c.other_id) or c.status<>'collecting' then raise exception 'Evidence phase closed or not a participant'; end if;
 if p_statement is null or char_length(trim(p_statement)) not between 10 and 10000 or coalesce(cardinality(p_paths),0)>10 or coalesce(cardinality(p_messages),0)>50 then raise exception 'Invalid evidence'; end if;
 foreach path in array coalesce(p_paths,'{}'::text[]) loop
  if path is null or split_part(path,'/',1)<>me::text or split_part(path,'/',2)<>c.id::text or not exists(select 1 from storage.objects where bucket_id='court-evidence' and name=path) then raise exception 'Invalid attachment'; end if;
 end loop;
 select conversation_id into conv from public.deals where id=c.deal_id;
 if exists(select 1 from unnest(coalesce(p_messages,'{}'::uuid[])) x where not exists(select 1 from public.messages m where m.id=x and m.conversation_id=conv)) then raise exception 'Invalid chat record'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('content',m.content,'sender_id',m.sender_id,'created_at',m.created_at) order by m.created_at),'[]'::jsonb)
 into excerpts from public.messages m where m.conversation_id=conv and m.id=any(coalesce(p_messages,'{}'::uuid[]));
 insert into public.court_evidence(case_id,author_id,statement,image_paths,message_excerpts) values(c.id,me,trim(p_statement),coalesce(p_paths,'{}'),excerpts);
 if (select count(*) from public.court_evidence where case_id=c.id)=2 then update public.court_cases set status='voting' where id=c.id; end if;
end $$;
create or replace function public.cast_court_vote(p_case uuid,p_choice text) returns void language plpgsql security definer set search_path='' as $$
declare c public.court_cases%rowtype; me uuid:=auth.uid();
begin
 select * into c from public.court_cases where id=p_case for update;
 if not found or c.status<>'voting' or me is null or me in(c.owner_id,c.other_id) or public.is_account_muted()
 or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null and not is_anonymous) then raise exception 'Not eligible to vote'; end if;
 if p_choice is null or p_choice not in('owner','other','neither') then raise exception 'Invalid vote'; end if;
 insert into public.court_votes(case_id,voter_id,choice) values(c.id,me,p_choice);
end $$;
create or replace function public.court_vote_totals(p_case uuid) returns table(choice text,total bigint) language sql stable security definer set search_path='' as $$
 select v.choice,count(*) from public.court_votes v join public.court_cases c on c.id=v.case_id where c.id=p_case and auth.uid() is not null and c.status in('voting','closed') group by v.choice
$$;
create or replace function public.admin_open_court_voting(p_case uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_market_admin() or p_reason is null or char_length(trim(p_reason))<3 then raise exception 'Administrator and reason required'; end if;
 update public.court_cases set status='voting' where id=p_case and status='collecting';
 if not found then raise exception 'Not collecting evidence'; end if;
 insert into public.admin_actions(admin_id,action,target_id,details) values(auth.uid(),'open_voting',p_case,jsonb_build_object('reason',p_reason));
end $$;
create or replace function public.admin_resolve_court(p_case uuid,p_verdict text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare c public.court_cases%rowtype; d public.deals%rowtype;
begin
 if not public.is_market_admin() then raise exception 'Administrator only'; end if;
 if p_verdict is null or p_verdict not in('owner','other','neither') or p_reason is null or char_length(trim(p_reason)) not between 10 and 10000 then raise exception 'Verdict and reason required'; end if;
 -- Match lock ordering of open_deal_arbitration to avoid a cross-RPC deadlock.
 select d0.* into d from public.deals d0 join public.court_cases c0 on c0.deal_id=d0.id where c0.id=p_case for update of d0;
 select * into c from public.court_cases where id=p_case for update;
 if not found or c.status='closed' then raise exception 'Case missing or already closed'; end if;
 update public.court_cases set status='closed',verdict=p_verdict,verdict_reason=trim(p_reason),resolved_by=auth.uid(),resolved_at=now() where id=p_case;
 update public.deals set workflow_status='done',status='done',updated_at=now() where id=c.deal_id;
 insert into public.admin_actions(admin_id,action,target_id,details) values(auth.uid(),'resolve_court',p_case,jsonb_build_object('verdict',p_verdict,'reason',p_reason));
end $$;
-- Do not allow post deletion to cascade through historic conversations/orders.
create or replace function public.guard_order_post_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.conversations where post_id=old.id and post_type=case when tg_table_name='services' then 'service' else 'demand' end) then
   raise exception 'Post has transaction history; use administrator soft removal';
 end if;
 return old;
end $$;
drop trigger if exists guard_order_post_delete on public.services;
create trigger guard_order_post_delete before delete on public.services for each row execute function public.guard_order_post_delete();
drop trigger if exists guard_order_post_delete on public.demands;
create trigger guard_order_post_delete before delete on public.demands for each row execute function public.guard_order_post_delete();
-- Backfill cases already in arbitration without exposing private report descriptions.
insert into public.court_cases(deal_id,owner_id,other_id,title)
select d.id,c.owner_id,c.other_id,'Disputed task' from public.deals d join public.conversations c on c.id=d.conversation_id
where d.workflow_status='arbitration' and d.status<>'done' and c.owner_id<>c.other_id on conflict(deal_id) do nothing;

-- Restrict function execution; clients never write admin/court tables directly.
revoke all on function public.can_read_court_file(text),public.can_upload_court_file(text),public.is_market_admin(),public.is_account_muted(),public.enforce_content_moderation(),public.enforce_message_mute(),public.guard_court_workflow(),public.guard_order_post_delete(),public.admin_remove_content(text,uuid,text),public.admin_set_mute(uuid,integer,text),public.open_deal_arbitration(uuid),public.submit_court_evidence(uuid,text,text[],uuid[]),public.cast_court_vote(uuid,text),public.court_vote_totals(uuid),public.admin_open_court_voting(uuid,text),public.admin_resolve_court(uuid,text,text) from public,anon,authenticated;
grant execute on function public.can_read_court_file(text),public.can_upload_court_file(text),public.is_market_admin() to anon,authenticated;
grant execute on function public.is_account_muted(),public.admin_remove_content(text,uuid,text),public.admin_set_mute(uuid,integer,text),public.open_deal_arbitration(uuid),public.submit_court_evidence(uuid,text,text[],uuid[]),public.cast_court_vote(uuid,text),public.court_vote_totals(uuid),public.admin_open_court_voting(uuid,text),public.admin_resolve_court(uuid,text,text) to authenticated;
commit;
notify pgrst,'reload schema';
