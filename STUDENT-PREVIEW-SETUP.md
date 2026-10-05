# 本版：仅开放大学邮箱认证

学生认证显示“页面预览 · 未开通”，没有上传表单，不收集新的学生证。大学认证和学校名称显示开关保留。支付与押金仍仅是页面预览，没有真实收付款。

## Supabase 必做

先按 UNIVERSITY-STUDENT-SETUP.md 和 VISIBILITY-PRIVACY-SETUP.md 完成大学认证基础配置，然后在 SQL Editor 最后执行 supabase/2026_student_verification_preview.sql。已有数据库也必须执行这个新增脚本。它关闭学生材料上传、提交及审核，并隐藏学生认证标识；不会删除历史数据，也不会影响大学认证。不要随后重跑旧迁移覆盖关闭设置。

Authentication 中开启 Confirm email；配置自定义 SMTP、正确 Site URL 和中英文回调 URL，并启用 Before User Created 的大学邮箱准入钩子。只有前端限制不够。支持大学邮箱必须点击确认邮件才能使用账号。

运营者姓名默认 Yiyuan Zhang。部署区域、跨境传输及备份期限没有臆造；学生认证今后开放前须完善实际信息。代码文件存在你的电脑，不等于 Supabase 数据也存储在电脑。

替换项目时保留自己的 .env.local，本压缩包不含密钥、node_modules 或构建缓存。安装依赖后重新启动。新增 SQL 必须另行在你的 Supabase 项目执行；本地改代码不会自动修改远端配置。
