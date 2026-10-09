# Claude 版本审计与优化 — 2026-10-08

本包以你提供的 simple-market.zip 为基础修改，不是覆盖回旧 GPT 草稿。保留统一聊天列表、用户私聊、管理员私聊、四类内容置顶、PWA 安装页，以及原来的深色背景、紫色操作按钮、圆角卡片、左右聊天气泡和管理员红色标识。

## 一、本次必须执行的 SQL

文件：`supabase/2026_10_08_audited_chat_update.sql`

在你现有 Supabase 项目中：SQL Editor → New query → 复制这个文件的全部内容 → Run。
只执行这一个本次升级文件。它已包含 Claude 的 `2026_10_unified_chat_pin_notify.sql`，不要再单独执行那份。
如果之前已经执行过 Claude 的那份，仍执行本次审计文件即可；可重复运行，不删除原有账号、发布、私聊、任务或评价。
前提：你之前上线的管理员、论坛点赞、在线状态/已读等旧迁移已执行。不要为了本次更新重跑全部旧 SQL。
建议先备份数据库，或在测试项目验证；本机没有连接你的数据库，RLS 和迁移执行结果尚未实测。

## 二、修正了什么

- 管理员气泡不能再靠输入“管理员：”或“Administrator:”冒充。任务聊天及私聊查询真实管理员身份。
- 已读接口校验对话参与者，只更新客户端已加载的消息 ID；网页在后台或不在聊天标签时不自动标记任务消息已读。
- 任务聊天原来只加载最早 500 条，现在加载最近 500 条再按时间显示，防止新消息看不到。增加可见聊天定时刷新和切换对话的过期响应保护。
- 邮件由数据库 INSERT 触发器写入待发送队列，客户端只是加速唤醒；配置 webhook 后，关网页也不会让已入队通知消失。
- 邮件发送前检查消息未读、邮箱已验证、接收人仍是参与者及邮件开关；数据库锁和发送租约处理并发，Resend 使用固定幂等键。同一对话、同一接收人 10 分钟内最多一封。
- 邮件不附带聊天正文，仅显示通知与中英文回复链接，减少锁屏/邮箱泄露。
- 置顶继续保留 Claude 的管理员按钮和排序，补上匿名写入的防护。
- PWA 更新只清理 youqiu 自己的缓存，不删除本站其他模块的缓存；不会缓存私聊 HTML/API 数据。服务脚本不缓存，减少更新后旧脚本滞留。
- 按语言生成安装名称：英文 youqiu，中文有求；未指定语言的入口仍默认英文。
- 未执行 SQL 或网络错误时，统一聊天显示明确提示，不无限等待。
- 原压缩包的 .env.local 不会放入交付包，也不应上传 GitHub。保留你自己电脑上的原文件；如果真实服务密钥曾上传公开仓库，需要在对应服务撤销并更换，单删文件不够。

## 三、Vercel 环境变量

沿用你现在的 Supabase 和 Resend。Vercel → 原项目 → Environment Variables，选择 Production：

| 名称 | 内容 |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | 原 Supabase 项目的 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 原公开 anon key |
| NEXT_PUBLIC_SITE_URL | 你的正式 HTTPS 网址，不加 /en 或 /zh |
| SITE_URL | 同一个正式 HTTPS 网址 |
| SUPABASE_SERVICE_ROLE_KEY | 同一 Supabase 项目的 service_role 密钥，仅服务器使用 |
| RESEND_API_KEY | 你已有的 Resend API key |
| NOTIFY_FROM_EMAIL | 你已验证域名下的发件人，例如 youqiu <notify@你的域名> |
| MESSAGE_WEBHOOK_SECRET | 自己生成的随机长密钥（建议至少 32 字节随机值）；和下面 webhook 请求头完全一致 |
| CRON_SECRET | 可选：重试接口的随机长密钥，仅当配置定时重试时需要 |

不要把服务密钥命名为 NEXT_PUBLIC_ 开头，不要放进代码或 GitHub。
设置后重新部署才生效。新版 .env.example 只有占位符。本地运行时自己保留 .env.local，运行 npm ci 再 npm run dev。
未配置邮件不影响聊天保存，但不能算邮件功能已上线。

## 四、配置邮件 webhook（需要做一次）

1. 先执行上面的升级 SQL。
2. 部署代码，确认正式 Production 为 Ready。
3. Supabase 后台 → Database → Webhooks → Create webhook（若要求启用则启用）。
4. 名称：youqiu_message_email。
5. Schema：public；Table：message_email_outbox；Event：只勾 INSERT。
6. 类型 HTTP Request；Method：POST。
7. URL：你的正式 HTTPS 网址 + `/api/message-notifications`。注意末尾是 notifications，不是 notify。
8. Headers：`Content-Type: application/json`；另加 `x-message-webhook-secret`，值为 Vercel 的 MESSAGE_WEBHOOK_SECRET。
9. 如可配置 timeout，设为至少 20000 毫秒（平台允许范围内）；保留 Supabase 默认的事件 JSON 正文，不要自己改成消息正文。
10. 用两个账号发一条新消息测试；接收人先不要打开聊天。检查 Resend 发送记录和接收邮箱（包括垃圾邮件）。

官方说明：[Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)。
邮件幂等机制：[Resend Idempotency Keys](https://resend.com/docs/dashboard/emails/idempotency-keys)。

失败通知保留在 message_email_outbox，最多尝试 5 次，超过 24 小时的旧事件不再补发。正常读取表数据只能使用数据库后台/受信服务器，普通客户端没有权限。
本包**没有自动安装定时任务**。若需要失败自动重试，用你自己的调度服务定时 GET 正式域名的 `/api/message-notifications`，请求头 `Authorization: Bearer <CRON_SECRET>`。每次最多处理 3 条，避免请求超时。
不配置调度时，不能保证 webhook 故障后自动重试；应检查队列并通过上述受保护接口重试。不要把带密钥的地址或请求截图发到公开地方。
Vercel Preview 接口不会主动发邮件，但若预览版和正式版共用同一个 Supabase 数据库，数据库 webhook 仍会被预览产生的数据触发；测试环境应使用独立 Supabase 项目。

## 五、上传代码，不需要删原仓库

1. 本包是完整源代码，不含 .env.local、node_modules、.next。这三项不上传，Vercel 会安装依赖并重新构建。
2. 在你原来的 GitHub 仓库，从 main 创建**一个**本次升级分支。
3. 解压后上传 simple-market **里面**的文件和文件夹，保持 app/lib/public/supabase 与 package.json 在仓库根目录；不要套成 simple-market/app。
4. GitHub 单次最多 100 个文件时分批上传，但每次都先切到**同一个升级分支**，不要每批创建新分支。也可以用 GitHub Desktop 一次提交。
5. 全部上传后只创建一个 Pull Request，base=main，compare=本次升级分支。
6. 先查看 Vercel Preview 构建结果，再做下面的测试。确认后 Merge pull request → Confirm merge，等待 Production Ready。
7. 正式站验证邮件；Preview 的邮件主动发送已禁用。

原始压缩包和先前 GPT 草稿均保留，未修改线上仓库或执行线上 SQL。

## 六、上线验收

- 普通用户 A 从用户 B 主页发私聊；B 聊天导航、聊天标签和列表显示未读数；打开对应聊天后减少，其他未打开的聊天保持未读。
- B 在其他网页标签/后台时，A 的新消息不能自动被标记已读。
- A/B 对话不应出现在 C 的账号；C 通过直接查询 thread ID 也不能读取/插入消息。
- 发“管理员：测试”不会变红；真实管理员消息为红色。管理员撤权后重新加载身份不应继续冒充管理员。
- 任务聊天、用户私聊、管理员私聊均出现在同一列表；旧链接和历史消息仍可访问。
- 超过 500 条任务聊天时，能看到最新消息；快速切换对话不会混入上一条对话内容。
- 两人连续发消息，邮件不会因并发重复发送；关掉邮件开关不再发送；邮件链接进入正确的聊天。
- 管理员置顶服务/需求/论坛/活动，并取消置顶；普通账号不能通过修改请求直接置顶。
- 双方确认完成后仍弹评价框；论坛图片、评论图片、点赞、社交加入、原任务状态流程回归检查。
- iPhone Safari → 分享 → 添加到主屏幕；安卓 Chrome → 安装应用。分别用英文/中文安装验证名称和图标，断网仅出现离线提示，不显示缓存私聊。
- App 图标角标取决于系统/浏览器支持，应用关闭后没有持续后台轮询。**本次没有 Web Push 推送、应用商店包、离线聊天**，邮件提醒独立于 PWA 运行。

## 七、已完成的验证与限制

- TypeScript：通过。
- 23 项自动检查：通过。含现有图片上传/点赞测试，新增邮件路由、授权拒绝、链接、SQL 约束检查、已读调用、PWA 缓存及 PNG 尺寸检查。
- 这些是本地静态/模拟检查，不代替真实 PostgreSQL RLS、Resend 和真机安装测试。
- 完整生产构建未确认通过：本地复用依赖的 junction 被 Turbopack 拒绝；切换 webpack 后受操作系统子进程权限限制报 spawn EPERM。请以干净依赖环境中的 npm ci + npm run build 和 Vercel 构建为最终结果。
- 没有替你执行数据库脚本、发送测试邮件、上传 GitHub 或部署线上。

