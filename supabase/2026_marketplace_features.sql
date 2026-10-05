-- Run this once in Supabase SQL Editor AFTER your existing base schema.
-- Adds profiles, post images, reports and Storage policies required by the updated frontend.

create extension if not exists "pgcrypto";

-- 1) Public profile fields. auth.users.id remains the immutable system ID.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_path text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- Keep public usernames predictable. Existing null values are allowed.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

-- 2) Up to five Storage paths are stored directly on each post.
alter table public.services add column if not exists image_paths text[] not null default '{}'::text[];
alter table public.demands add column if not exists image_paths text[] not null default '{}'::text[];

-- 3) Complaints / reports.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  post_type text check (post_type is null or post_type in ('service','demand')),
  post_id uuid,
  reason text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reports_reporter_idx on public.reports(reporter_id);
create index if not exists reports_reported_user_idx on public.reports(reported_user_id);
create index if not exists reports_created_idx on public.reports(created_at desc);

alter table public.reports enable row level security;
drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
for insert to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists reports_select_self on public.reports;
create policy reports_select_self on public.reports
for select to authenticated
using (auth.uid() = reporter_id);

-- 4) Storage buckets. Public read is intentional so listing/avatar images render without signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Post images: folder 1 is the authenticated user's UUID.
drop policy if exists post_images_public_read on storage.objects;
create policy post_images_public_read on storage.objects for select to public
using (bucket_id = 'post-images');

drop policy if exists post_images_insert_own on storage.objects;
create policy post_images_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists post_images_update_own on storage.objects;
create policy post_images_update_own on storage.objects for update to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists post_images_delete_own on storage.objects;
create policy post_images_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars: same per-user folder rule.
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Optional but useful for realtime post updates if not already present.
do $$
begin
  begin alter publication supabase_realtime add table public.services; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.demands; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.deals; exception when duplicate_object then null; end;
end $$;

select pg_notify('pgrst', 'reload schema');

-- 5) Enforce two-party completion at the database layer.
-- Each participant may only set their own confirmation flag. Deal status is derived
-- from both flags, and the related post is completed only after both are true.
create or replace function public.enforce_two_party_deal_confirmation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  c public.conversations%rowtype;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then raise exception 'Conversation not found'; end if;

  if tg_op = 'INSERT' then
    new.owner_confirmed := false;
    new.other_confirmed := false;
  elsif auth.uid() is not null then
    if auth.uid() = c.owner_id then
      new.other_confirmed := old.other_confirmed;
    elsif auth.uid() = c.other_id then
      new.owner_confirmed := old.owner_confirmed;
    else
      raise exception 'Only conversation participants can confirm this deal';
    end if;
  end if;

  new.status := case when new.owner_confirmed and new.other_confirmed then 'done' else 'confirming' end;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_two_party_deal_confirmation_trigger on public.deals;
create trigger enforce_two_party_deal_confirmation_trigger
before insert or update on public.deals
for each row execute function public.enforce_two_party_deal_confirmation();

create or replace function public.complete_post_after_two_party_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.conversations%rowtype;
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    select * into c from public.conversations where id = new.conversation_id;
    if c.post_type = 'service' then
      update public.services set status = 'completed' where id = c.post_id;
    elsif c.post_type = 'demand' then
      update public.demands set status = 'completed' where id = c.post_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists complete_post_after_two_party_confirmation_trigger on public.deals;
create trigger complete_post_after_two_party_confirmation_trigger
after update on public.deals
for each row execute function public.complete_post_after_two_party_confirmation();

select pg_notify('pgrst', 'reload schema');
