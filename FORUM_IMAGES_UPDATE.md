# 论坛图片更新 / Forum image attachments

## 更新现有项目

1. 在 Supabase SQL Editor 执行 `supabase/2026_forum_images.sql`。此脚本可以重复运行，不会删除已有帖子或评论。
2. 替换为本版本代码，保留自己的 `.env.local`，重新启动网站。
3. 论坛发布帖子、详情页发表评论时点击“添加图片”，可附带最多 5 张 JPG、PNG、WebP 或 GIF，每张不超过 5 MB。评论仍需填写文字。
4. 可预览、移除尚未发布的图片；发布后的图片完整显示，点击可查看及放大。

本更新沿用已有 `post-images` 存储桶，以及 `2026_marketplace_features.sql` 设置的按用户目录上传/删除权限。如该基础脚本尚未执行，请先执行它。不要直接删除 Storage 数据表记录。

新增 `image_paths` 字段分别保存帖子和评论的图片路径。上传失败或内容保存失败时，通过 Storage API 清理本次已上传的图片。图片使用公开存储桶，请勿上传私人证件或敏感信息。

## Verification

- `npm run build`: passed.
- `node --test tests/forum-images.cjs`: 4 tests passed (mocked Storage API).
- Live Supabase migration and authenticated uploads must be checked after applying the SQL to your project.
