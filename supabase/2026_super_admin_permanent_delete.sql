-- Run once in Supabase SQL Editor after 2026_court_and_admin.sql.
-- Adds an irreversible deletion RPC available only to users in market_admins.

begin;

-- The verified site-owner account keeps ultimate control even if its
-- market_admins row is accidentally removed.
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from auth.users
     where id = auth.uid()
       and lower(email) = '2604635611@qq.com'
       and email_confirmed_at is not null
  )
$$;

-- Ordinary users remain protected. A verified market administrator may pass the
-- guard when deliberately using the permanent-delete RPC below.
create or replace function public.guard_order_post_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_market_admin() or public.is_platform_owner() then
    return old;
  end if;
  if exists(
    select 1 from public.conversations
     where post_id = old.id
       and post_type = case when tg_table_name = 'services' then 'service' else 'demand' end
  ) then
    raise exception 'Post has transaction history; use administrator soft removal';
  end if;
  return old;
end;
$$;

create or replace function public.admin_permanently_delete_content(
  p_kind text,
  p_id uuid,
  p_reason text,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_table text;
  affected integer;
begin
  if not (public.is_market_admin() or public.is_platform_owner()) then
    raise exception 'Administrator only';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'Reason required';
  end if;
  if p_confirmation is distinct from 'PERMANENT DELETE' then
    raise exception 'Permanent deletion confirmation required';
  end if;

  target_table := case p_kind
    when 'service' then 'services'
    when 'demand' then 'demands'
    when 'post' then 'community_posts'
    when 'comment' then 'community_comments'
    else null
  end;
  if target_table is null then
    raise exception 'Invalid content type';
  end if;

  -- Write the audit entry before deletion so an administrator action remains
  -- visible even when related content and transaction rows cascade away.
  insert into public.admin_actions(admin_id, action, target_id, details)
  values (
    auth.uid(),
    'permanently_delete_content',
    p_id,
    jsonb_build_object('kind', p_kind, 'reason', trim(p_reason))
  );

  -- A marketplace post can own a complete transaction tree. Remove database
  -- children in dependency order so the administrator is not stopped by history
  -- guards or non-cascading foreign keys. Reports are retained but detached from
  -- deleted private records for audit purposes. Do not DELETE storage.objects:
  -- Supabase requires stored files to be removed through the Storage API.
  if p_kind in ('service', 'demand') then
    delete from public.court_votes as vote_row
     using public.court_cases as court_case,
           public.deals as deal_row,
           public.conversations as conversation_row
     where vote_row.case_id = court_case.id
       and court_case.deal_id = deal_row.id
       and deal_row.conversation_id = conversation_row.id
       and conversation_row.post_id = p_id
       and conversation_row.post_type = p_kind;

    delete from public.court_evidence as evidence
     using public.court_cases as court_case,
           public.deals as deal_row,
           public.conversations as conversation_row
     where evidence.case_id = court_case.id
       and court_case.deal_id = deal_row.id
       and deal_row.conversation_id = conversation_row.id
       and conversation_row.post_id = p_id
       and conversation_row.post_type = p_kind;

    delete from public.court_cases as court_case
     using public.deals as deal_row,
           public.conversations as conversation_row
     where court_case.deal_id = deal_row.id
       and deal_row.conversation_id = conversation_row.id
       and conversation_row.post_id = p_id
       and conversation_row.post_type = p_kind;

    update public.reports as report_row
       set conversation_id = null,
           deal_id = null,
           post_type = null,
           post_id = null
     where report_row.post_id = p_id
        or report_row.conversation_id in (
          select id from public.conversations
           where post_id = p_id and post_type = p_kind
        )
        or report_row.deal_id in (
          select deal_row.id
            from public.deals as deal_row
            join public.conversations as conversation_row on conversation_row.id = deal_row.conversation_id
           where conversation_row.post_id = p_id and conversation_row.post_type = p_kind
        );

    delete from public.messages
     where conversation_id in (
       select id from public.conversations where post_id = p_id and post_type = p_kind
     );
    delete from public.deals
     where conversation_id in (
       select id from public.conversations where post_id = p_id and post_type = p_kind
     );
    delete from public.conversations where post_id = p_id and post_type = p_kind;
  end if;

  execute format('delete from public.%I where id = $1', target_table) using p_id;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Content not found';
  end if;
end;
$$;

revoke all on function public.admin_permanently_delete_content(text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.is_platform_owner() from public, anon, authenticated;
grant execute on function public.admin_permanently_delete_content(text,uuid,text,text) to authenticated;
grant execute on function public.is_platform_owner() to authenticated;

select pg_notify('pgrst', 'reload schema');
commit;
