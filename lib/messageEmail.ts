export type EmailNotification = { id: string; email: string; language: string; sender: string; kind: "task" | "direct" | "admin"; thread_id: string };
export function messageEmailPayload(event: EmailNotification, site: string, from: string) {
  const base = new URL(site);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))) throw new Error("Configure a valid HTTPS production SITE_URL.");
  const lang = event.language === "zh" ? "zh" : "en";
  const url = new URL(`/${lang}/me`, base.origin);
  url.searchParams.set("tab", "chat"); url.searchParams.set(event.kind === "task" ? "conv" : "dm", event.kind === "task" ? event.thread_id : `${event.kind}:${event.thread_id}`);
  const text = lang === "zh"
    ? `${event.sender} 给你发来了新消息。\n\n登录有求查看并回复：\n${url}\n\n为保护隐私，邮件不包含消息正文。你可以在网站“聊天”中关闭邮件提醒。`
    : `${event.sender} sent you a new message.\n\nSign in to youqiu to read and reply:\n${url}\n\nTo protect your privacy, this email does not contain the message. You can turn off email notifications in Chats.`;
  const alternative = new URL(url); alternative.pathname = `/${lang === "en" ? "zh" : "en"}/me`;
  return { from, to: [event.email], subject: lang === "zh" ? "有求：你收到了一条新消息" : "youqiu: You have a new message", text: `${text}\n\n${lang === "en" ? "中文" : "English"}: ${alternative}` };
}
