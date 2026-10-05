-- Run after 2026_marketplace_features.sql and 2026_community_and_workflow.sql.
-- Reuses the post-images bucket and its existing per-user Storage API policies.
begin;
alter table public.community_posts add column if not exists image_paths text[] not null default '{}';
alter table public.community_comments add column if not exists image_paths text[] not null default '{}';
alter table public.community_posts drop constraint if exists community_posts_image_limit;
alter table public.community_posts add constraint community_posts_image_limit check (cardinality(image_paths) <= 5);
alter table public.community_comments drop constraint if exists community_comments_image_limit;
alter table public.community_comments add constraint community_comments_image_limit check (cardinality(image_paths) <= 5);
grant select on public.community_posts, public.community_comments to anon;
grant select, insert, update, delete on public.community_posts, public.community_comments to authenticated, service_role;
notify pgrst, 'reload schema';
commit;
