# 登录邮件：Youqiu 发件人和限流设置

这些设置属于远端 Supabase 项目，替换网站代码不会自动修改它们。

## 不能直接“解除”默认邮件限制

Supabase 自带邮件服务只适合测试，目前所有 Auth 邮件合计限制很低，而且邮件可能显示为 Supabase Auth。不要把限制设为无限，否则容易被滥用并影响域名信誉。

## 推荐配置

1. 选择支持 SMTP 的邮件服务，例如 Resend、Postmark、Brevo、SendGrid 或 AWS SES，并验证你控制的发件域名。
2. 打开 Supabase Dashboard → Authentication → Emails → SMTP Settings。
3. 开启 Custom SMTP，填写服务商提供的 Host、Port、Username、Password。
4. Sender name 填 `Youqiu`，Sender email 使用你验证过的地址，例如 `no-reply@auth.你的域名`。不能只改显示名称而继续依赖 Supabase 默认发件服务来获得稳定投递。
5. 保存后，到 Authentication → Rate Limits 调整 `Emails sent`。试运营建议先设为每小时 30 封，并根据真实用户量逐步调整，不建议无限制。
6. OTP / magic-link 的单邮箱冷却时间建议保留至少 60 秒，前端也不要允许连续点击发送。
7. 在 Authentication → Email Templates 分别将 Magic Link、Confirm signup、Reset password 的邮件标题和正文改成 Youqiu 品牌，并保留 Supabase 提供的确认链接模板变量。
8. 配置 SPF、DKIM、DMARC，关闭邮件服务商的链接追踪，避免登录链接被改写。

完成后用两个真实大学邮箱测试注册确认、Magic Link、忘记密码，并在 Supabase Auth Logs 和 SMTP 服务商日志中检查投递结果。

官方说明：
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-email-templates
