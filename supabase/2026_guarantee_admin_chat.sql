-- Run once after 2026_court_and_admin.sql.
-- Registers guarantee requests and permits verified administrators to join only requested conversations.

create table if not exists public.guarantee_requests (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null unique references public.conversations(id) on delete cascade,
 requested_by uuid not null references public.profiles(id),
 amount numeric(12,2) not null check(amount>0),
 status text not null default 'open' check(status in('open','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.guarantee_requests enable row level security;
revoke all on public.guarantee_requests from anon,authenticated;
grant select,insert,update on public.guarantee_requests to authenticated;
grant select,insert,update,delete on public.guarantee_requests to service_role;

create or replace function public.is_conversation_party(p_conversation uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversations c where c.id=p_conversation and auth.uid() in(c.owner_id,c.other_id))
$$;
revoke all on function public.is_conversation_party(uuid) from public,anon;
grant execute on function public.is_conversation_party(uuid) to authenticated;

create or replace function public.is_market_admin_user(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.market_admins where user_id=p_user)
$$;
revoke all on function public.is_market_admin_user(uuid) from public,anon;
grant execute on function public.is_market_admin_user(uuid) to authenticated;

drop policy if exists guarantee_requests_parties_read on public.guarantee_requests;
create policy guarantee_requests_parties_read on public.guarantee_requests for select to authenticated using(
 public.is_market_admin() or public.is_conversation_party(conversation_id)
);
drop policy if exists guarantee_requests_admin_update on public.guarantee_requests;
create policy guarantee_requests_admin_update on public.guarantee_requests for update to authenticated using(public.is_market_admin()) with check(public.is_market_admin());

create or replace function public.request_guarantee(p_conversation uuid,p_amount numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); result uuid;
begin
 if me is null or p_amount is null or p_amount<=0 or p_amount>1000000 then raise exception 'Invalid guarantee request'; end if;
 if not exists(select 1 from public.conversations c where c.id=p_conversation and me in(c.owner_id,c.other_id)) then raise exception 'Conversation access required'; end if;
 insert into public.guarantee_requests(conversation_id,requested_by,amount,status,updated_at)
 values(p_conversation,me,p_amount,'open',now())
 on conflict(conversation_id) do update set requested_by=excluded.requested_by,amount=excluded.amount,status='open',updated_at=now()
 returning id into result;
 return result;
end $$;
revoke all on function public.request_guarantee(uuid,numeric) from public,anon;
grant execute on function public.request_guarantee(uuid,numeric) to authenticated;

drop policy if exists guarantee_admin_conversation_read on public.conversations;
create policy guarantee_admin_conversation_read on public.conversations for select to authenticated using(
 public.is_market_admin() and exists(select 1 from public.guarantee_requests g where g.conversation_id=id)
);
drop policy if exists guarantee_admin_messages_read on public.messages;
create policy guarantee_admin_messages_read on public.messages for select to authenticated using(
 public.is_market_admin() and exists(select 1 from public.guarantee_requests g where g.conversation_id=conversation_id)
);
drop policy if exists guarantee_admin_messages_insert on public.messages;
create policy guarantee_admin_messages_insert on public.messages for insert to authenticated with check(
 public.is_market_admin() and sender_id=auth.uid() and exists(select 1 from public.guarantee_requests g where g.conversation_id=conversation_id and g.status='open')
);

do $$ begin alter publication supabase_realtime add table public.guarantee_requests; exception when duplicate_object then null; end $$;
