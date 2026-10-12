-- Adds author-only deletion RPC and precise community/report targets.
-- Does not delete existing content when applied.
begin;
alter table public.reports add column if not exists content_type text;
alter table public.reports add column if not exists content_id uuid;
alter table public.reports add column if not exists content_snapshot jsonb;
create or replace function public.delete_my_content(p_kind text,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); removed integer;
begin
 if me is null then raise exception 'Please sign in'; end if;
 if p_kind='community_post' then
  delete from public.community_posts where id=p_id and author_id=me and not moderation_deleted;
 elsif p_kind='comment' then
  delete from public.community_comments where id=p_id and author_id=me and not moderation_deleted;
 elsif p_kind='review' then
  delete from public.reviews where id=p_id and reviewer_id=me;
 else raise exception 'Invalid content type'; end if;
 get diagnostics removed=row_count;
 if removed<>1 then raise exception 'Content unavailable or not yours'; end if;
end $$;
revoke all on function public.delete_my_content(text,uuid) from public,anon,authenticated;
grant execute on function public.delete_my_content(text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
