# 主管理员永久删除权限

管理员中心现在同时提供“隐藏”和“永久删除”。永久删除无法恢复，并可能因数据库关联规则同时移除对应的聊天、成交、评价或仲裁记录。

Supabase 不允许 SQL 函数直接删除 `storage.objects`。因此永久删除会清除网站数据库中的内容和关联记录，但不会在同一 SQL 事务中删除已经上传到 Storage 的孤立文件；这些文件不会再被网站记录引用，后续应通过 Supabase Storage API 或后台文件管理器清理。

部署网站后，请在 Supabase 的 **SQL Editor** 中完整执行：

`supabase/2026_super_admin_permanent_delete.sql`

请在 `2026_court_and_admin.sql` 之后执行。`market_admins` 表中的管理员可以调用永久删除功能；已确认的平台主管账户 `2604635611@qq.com` 还拥有独立的最终权限，即使管理员表记录被误删，也仍可永久删除内容。前端按钮本身不能绕过数据库权限。
