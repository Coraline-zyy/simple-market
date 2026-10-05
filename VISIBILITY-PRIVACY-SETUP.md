# 本次更新：大学名称隐私与支付标签

保留 .env.local 与已有所有迁移。先运行 2026_university_student_verification.sql，再运行新增 supabase/2026_university_visibility.sql 全文。
不要在新迁移后重新运行旧认证迁移，它会恢复旧公开学校函数；如误重跑，最后再执行新的 visibility SQL。

个人资料中的“在公开资料中显示我的大学名称”即时保存，默认隐藏。
隐藏后大学和学生认证状态仍显示，但 public_verification 不返回学校名称；只有本人私有设置接口与管理员审核可以读到学校。
用户主动写入简介、帖子或聊天的学校信息无法自动隐藏。
学校邮箱、学生证和审核详情仍私有。支付、押金与合作条件使用统一黄色标签，不启用真实收款。

## 需要你提供的真实信息

你的法定姓名、Supabase 实际区域、国际传输安排与备份/审计保留设置没有提供，不能代你编造。
在 .env.local（部署时为服务端环境变量）配置以下四项并重启/重新部署：

VERIFICATION_CONTROLLER_NAME=你的实际数据控制者姓名或已注册经营主体名称
VERIFICATION_STORAGE_REGION=从 Supabase 项目设置核对的数据库与文件实际区域
VERIFICATION_TRANSFER_DETAILS=实际处理协议、子处理者与跨境传输安排的说明
VERIFICATION_BACKUP_RETENTION=实际备份及审计保存期限、删除方式及责任人

这四项为服务端配置，不要加 NEXT_PUBLIC_ 前缀。不填写时隐私页明确提示缺失，不收集新学生证。
不要把密钥、地址证明或证件号码放进这些公开隐私说明字段。
先核对真实配置，完善其他隐私政策，并确认每周有人执行原图和记录清理；需要时请英国数据保护专业人士审阅。
准备就绪后，在 SQL Editor 执行：

update public.student_upload_configuration set privacy_ready=true where id=true;

网页和数据库都默认暂停新的材料上传；只有服务端四项配置与数据库开关均就绪，网页才开放上传。
数据库开关只代表运营者确认已准备，不自动验证文字内容；不要提前打开。
如需暂停，再将 privacy_ready 改为 false。已有认证、审核、撤回及清理不因此失效。

邮箱确认、Auth 注册钩子和 SMTP 仍需按 UNIVERSITY-STUDENT-SETUP.md 配置，线上没有自动替你修改。
