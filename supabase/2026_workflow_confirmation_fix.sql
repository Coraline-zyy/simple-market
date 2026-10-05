-- Run this once in Supabase SQL Editor after all earlier migrations.
-- Fixes the ambiguous d.conversation_id error and preserves two-party confirmation.

begin;

create or replace function public.confirm_collaboration(p_conversation_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_deal public.deals%rowtype;
  v_user uuid := auth.uid();
begin
  select conversation_row.*
    into v_conversation
    from public.conversations as conversation_row
   where conversation_row.id = p_conversation_id
     and v_user in (conversation_row.owner_id, conversation_row.other_id);

  if not found then
    raise exception 'Not a conversation participant';
  end if;

  insert into public.deals (conversation_id, workflow_status)
  values (p_conversation_id, 'pending')
  on conflict (conversation_id) do nothing;

  if v_user = v_conversation.owner_id then
    update public.deals
       set collaboration_owner_confirmed = true,
           updated_at = now()
     where conversation_id = p_conversation_id
     returning * into v_deal;
  else
    update public.deals
       set collaboration_other_confirmed = true,
           updated_at = now()
     where conversation_id = p_conversation_id
     returning * into v_deal;
  end if;

  update public.deals
     set workflow_status = case
       when collaboration_owner_confirmed and collaboration_other_confirmed then 'active'
       else 'pending'
     end,
     updated_at = now()
   where id = v_deal.id
   returning * into v_deal;

  return v_deal;
end;
$$;

create or replace function public.confirm_completion(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_deal public.deals%rowtype;
  v_user uuid := auth.uid();
begin
  select conversation_row.*
    into v_conversation
    from public.conversations as conversation_row
    join public.deals as deal_row
      on deal_row.conversation_id = conversation_row.id
   where deal_row.id = p_deal_id
     and v_user in (conversation_row.owner_id, conversation_row.other_id);

  if not found then
    raise exception 'Not a deal participant';
  end if;

  if v_user = v_conversation.owner_id then
    update public.deals
       set completion_owner_confirmed = true,
           updated_at = now()
     where id = p_deal_id
     returning * into v_deal;
  else
    update public.deals
       set completion_other_confirmed = true,
           updated_at = now()
     where id = p_deal_id
     returning * into v_deal;
  end if;

  update public.deals
     set workflow_status = case
       when completion_owner_confirmed and completion_other_confirmed then 'done'
       else 'completion_pending'
     end,
     status = case
       when completion_owner_confirmed and completion_other_confirmed then 'done'
       else 'confirming'
     end,
     owner_confirmed = completion_owner_confirmed,
     other_confirmed = completion_other_confirmed,
     updated_at = now()
   where id = p_deal_id
   returning * into v_deal;

  if v_deal.workflow_status = 'done' then
    if v_conversation.post_type = 'service' then
      update public.services set status = 'completed' where id = v_conversation.post_id;
    else
      update public.demands set status = 'completed' where id = v_conversation.post_id;
    end if;
  end if;

  return v_deal;
end;
$$;

revoke all on function public.confirm_collaboration(uuid) from public;
revoke all on function public.confirm_completion(uuid) from public;
grant execute on function public.confirm_collaboration(uuid) to authenticated;
grant execute on function public.confirm_completion(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
