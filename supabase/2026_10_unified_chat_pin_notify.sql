-- 2026-10 update: unified chat inbox, user-to-user private messages, unread counts,
-- administrator pinning, and email notification bookkeeping.
-- Run once in the Supabase SQL Editor AFTER all earlier scripts.
-- Safe to re-run. Does not delete any existing users, posts, chats or reviews.
begin;

-- ============================================================
-- 1) User-to-user private messages (anyone can message anyone)
-- ============================================================
create table if not exists public.direct_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint direct_threads_ordered check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.direct_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists direct_messages_thread_time on public.direct_messages(thread_id, created_at desc, id desc);
create index if not exists direct_messages_unread on public.direct_messages(thread_id, sender_id) where read_at is null;

alter table public.direct_threads enable row level security;
alter table public.direct_messages enable row level security;
revoke all on public.direct_threads, public.direct_messages from public, anon, authenticated;
grant select on public.direct_threads to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant all on public.direct_threads, public.direct_messages to service_role;

drop policy if exists direct_thread_participant_read on public.direct_threads;
create policy direct_thread_participant_read on public.direct_threads for select to authenticated
  using (auth.uid() in (user_a, user_b));

drop policy if exists direct_message_participant_read on public.direct_messages;
create policy direct_message_participant_read on public.direct_messages for select to authenticated
  using (exists (select 1 from public.direct_threads t where t.id = thread_id and auth.uid() in (t.user_a, t.user_b)));

drop policy if exists direct_message_participant_insert on public.direct_messages;
create policy direct_message_participant_insert on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and read_at is null
    and exists (select 1 from public.direct_threads t where t.id = thread_id and auth.uid() in (t.user_a, t.user_b))
  );

-- Muted accounts cannot send user-to-user messages (same rule as task chats).
drop trigger if exists direct_message_mute on public.direct_messages;
create trigger direct_message_mute before insert on public.direct_messages
  for each row execute function public.enforce_message_mute();

do $$ begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null; end $$;

create or replace function public.start_direct_chat(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); a uuid; b uuid; result uuid;
begin
  if me is null then raise exception 'Please sign in'; end if;
  if p_user is null or p_user = me or not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Invalid recipient';
  end if;
  a := least(me, p_user); b := greatest(me, p_user);
  insert into public.direct_threads(user_a, user_b, created_by) values (a, b, me)
  -- If the thread already exists but nobody has written yet, make it visible to whoever opens it now.
  on conflict (user_a, user_b) do update set created_by = case
      when exists (select 1 from public.direct_messages m where m.thread_id = direct_threads.id) then direct_threads.created_by
      else excluded.created_by end
  returning id into result;
  return result;
end $$;

-- ============================================================
-- 2) Read receipts for administrator private messages
-- ============================================================
alter table public.admin_private_messages add column if not exists read_at timestamptz;
create index if not exists admin_private_messages_unread on public.admin_private_messages(thread_id, sender_id) where read_at is null;

-- ============================================================
-- 3) Unified inbox: task chats + private messages + administrator messages
-- ============================================================
create or replace function public.get_my_chat_inbox()
returns table (
  kind text,              -- 'task' | 'direct' | 'admin'
  thread_id uuid,
  other_id uuid,
  other_username text,
  other_avatar_path text,
  title text,
  from_admin boolean,     -- true when the other side is a platform administrator
  last_message text,
  last_message_at timestamptz,
  unread bigint
)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id)
  -- task chats
  select 'task'::text, c.id,
         case when c.owner_id = me.id then c.other_id else c.owner_id end,
         p.username::text, p.avatar_path::text,
         coalesce(s.title, d.title)::text,
         false,
         lm.content, coalesce(lm.created_at, c.created_at),
         (select count(*) from public.messages m where m.conversation_id = c.id and m.sender_id <> me.id and m.read_at is null)
  from me
  join public.conversations c on me.id in (c.owner_id, c.other_id)
  left join public.profiles p on p.id = case when c.owner_id = me.id then c.other_id else c.owner_id end
  left join public.services s on c.post_type = 'service' and s.id = c.post_id
  left join public.demands d on c.post_type = 'demand' and d.id = c.post_id
  left join lateral (select m.content, m.created_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) lm on true
  union all
  -- user-to-user private messages
  select 'direct'::text, t.id,
         case when t.user_a = me.id then t.user_b else t.user_a end,
         p.username::text, p.avatar_path::text,
         null::text, false,
         lm.content, coalesce(lm.created_at, t.created_at),
         (select count(*) from public.direct_messages m where m.thread_id = t.id and m.sender_id <> me.id and m.read_at is null)
  from me
  join public.direct_threads t on me.id in (t.user_a, t.user_b)
  left join public.profiles p on p.id = case when t.user_a = me.id then t.user_b else t.user_a end
  left join lateral (select m.content, m.created_at from public.direct_messages m where m.thread_id = t.id order by m.created_at desc limit 1) lm on true
  -- hide empty threads the other person opened but never wrote in
  where lm.created_at is not null or t.created_by = me.id
  union all
  -- administrator private messages
  select 'admin'::text, t.id,
         case when t.admin_id = me.id then t.user_id else t.admin_id end,
         p.username::text, p.avatar_path::text,
         null::text, (t.user_id = me.id),
         lm.content, coalesce(lm.created_at, t.created_at),
         (select count(*) from public.admin_private_messages m where m.thread_id = t.id and m.sender_id <> me.id and m.read_at is null)
  from me
  join public.admin_private_threads t on (t.user_id = me.id or (t.admin_id = me.id and public.is_market_admin()))
  left join public.profiles p on p.id = case when t.admin_id = me.id then t.user_id else t.admin_id end
  left join lateral (select m.content, m.created_at from public.admin_private_messages m where m.thread_id = t.id order by m.created_at desc limit 1) lm on true
$$;

create or replace function public.get_my_unread_total() returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(unread), 0)::bigint from public.get_my_chat_inbox()
$$;

create or replace function public.mark_private_thread_read(p_kind text, p_thread uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Authentication required'; end if;
  if p_kind = 'direct' then
    if not exists (select 1 from public.direct_threads t where t.id = p_thread and me in (t.user_a, t.user_b)) then
      raise exception 'Conversation not found';
    end if;
    update public.direct_messages set read_at = now()
     where thread_id = p_thread and sender_id <> me and read_at is null;
  elsif p_kind = 'admin' then
    if not exists (select 1 from public.admin_private_threads t where t.id = p_thread
                   and (t.user_id = me or (t.admin_id = me and public.is_market_admin()))) then
      raise exception 'Conversation not found';
    end if;
    update public.admin_private_messages set read_at = now()
     where thread_id = p_thread and sender_id <> me and read_at is null;
  else
    raise exception 'Invalid conversation type';
  end if;
end $$;

revoke all on function public.start_direct_chat(uuid), public.get_my_chat_inbox(), public.get_my_unread_total(),
  public.mark_private_thread_read(text, uuid) from public, anon;
grant execute on function public.start_direct_chat(uuid), public.get_my_chat_inbox(), public.get_my_unread_total(),
  public.mark_private_thread_read(text, uuid) to authenticated;

-- ============================================================
-- 4) Administrator pinning for services, requests and forum/social posts
-- ============================================================
alter table public.services add column if not exists pinned_at timestamptz;
alter table public.demands add column if not exists pinned_at timestamptz;
alter table public.community_posts add column if not exists pinned_at timestamptz;
create index if not exists services_pinned_idx on public.services(pinned_at desc nulls last, created_at desc);
create index if not exists demands_pinned_idx on public.demands(pinned_at desc nulls last, created_at desc);
create index if not exists community_posts_pinned_idx on public.community_posts(kind, pinned_at desc nulls last, created_at desc);

-- Only administrators may change the pinned flag; owners can still edit their own posts.
create or replace function public.enforce_admin_pin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_market_admin() then
    if tg_op = 'INSERT' and new.pinned_at is not null then raise exception 'Administrator only'; end if;
    if tg_op = 'UPDATE' and new.pinned_at is distinct from old.pinned_at then raise exception 'Administrator only'; end if;
  end if;
  return new;
end $$;

do $$ declare tab text; begin
  foreach tab in array array['services','demands','community_posts'] loop
    execute format('drop trigger if exists admin_pin_guard on public.%I', tab);
    execute format('create trigger admin_pin_guard before insert or update on public.%I for each row execute function public.enforce_admin_pin()', tab);
  end loop;
end $$;

create or replace function public.admin_set_pinned(p_kind text, p_id uuid, p_pinned boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare tab text; n integer;
begin
  if not public.is_market_admin() then raise exception 'Administrator only'; end if;
  tab := case p_kind when 'service' then 'services' when 'demand' then 'demands' when 'post' then 'community_posts' else null end;
  if tab is null then raise exception 'Invalid content type'; end if;
  execute format('update public.%I set pinned_at = case when $2 then now() else null end where id = $1', tab)
    using p_id, coalesce(p_pinned, false);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Content not found'; end if;
  insert into public.admin_actions(admin_id, action, target_id, details)
  values (auth.uid(), case when p_pinned then 'pin_content' else 'unpin_content' end, p_id, jsonb_build_object('kind', p_kind));
end $$;
revoke all on function public.admin_set_pinned(text, uuid, boolean) from public, anon;
grant execute on function public.admin_set_pinned(text, uuid, boolean) to authenticated;

-- ============================================================
-- 5) New-message email notifications
-- ============================================================
alter table public.profiles add column if not exists email_notifications boolean not null default true;

-- Used only by the server (service role) to avoid sending an email for every single message.
create table if not exists public.message_email_log (
  recipient_id uuid not null references auth.users(id) on delete cascade,
  thread_key text not null,
  last_sent_at timestamptz not null default now(),
  primary key (recipient_id, thread_key)
);
alter table public.message_email_log enable row level security;
revoke all on public.message_email_log from public, anon, authenticated;
grant all on public.message_email_log to service_role;

notify pgrst, 'reload schema';
commit;
