-- Run once in Supabase SQL Editor. Additive and safe to rerun.
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.messages add column if not exists read_at timestamptz;

create index if not exists messages_conversation_unread_idx
  on public.messages (conversation_id, read_at, sender_id);

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and me in (c.owner_id, c.other_id)
  ) then raise exception 'Conversation not found'; end if;

  update public.messages
  set read_at = coalesce(read_at, now())
  where conversation_id = p_conversation_id
    and sender_id <> me
    and read_at is null;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
