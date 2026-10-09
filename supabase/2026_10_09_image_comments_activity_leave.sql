-- Run after the Oct 8 audited upgrade and existing forum-image/social migrations.
-- Additive: preserves posts, comments, activities, messages and deposits.
begin;

alter table public.community_comments drop constraint if exists community_comments_body_check;
alter table public.community_comments add constraint community_comments_body_check check(
 char_length(body)<=5000 and
 (char_length(btrim(body))>=1 or cardinality(image_paths)>0)
);
alter table public.community_posts drop constraint if exists community_posts_body_check;
alter table public.community_posts add constraint community_posts_body_check check(
 char_length(body)<=10000 and
 (char_length(btrim(body))>=5 or (kind='discussion' and cardinality(image_paths)>0))
);

-- Only the current user may leave. Repeated leave requests are harmless.
-- Leaving is still allowed if the account is muted or the activity is hidden.
create or replace function public.leave_community_activity(p_post uuid) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise exception 'Sign in required'; end if;
 delete from public.community_participants where post_id=p_post and user_id=me;
end $$;
revoke all on function public.leave_community_activity(uuid) from public,anon;
grant execute on function public.leave_community_activity(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
