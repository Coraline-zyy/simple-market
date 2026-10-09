"use client";
// Account setting: receive an email when someone sends you a message.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EmailNotificationToggle({ userId, lang }: { userId: string; lang: "zh" | "en" }) {
  const zh = lang === "zh";
  const [enabled, setEnabled] = useState<boolean | null>(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState("");
  useEffect(() => {
    supabase.from("profiles").select("email_notifications").eq("id", userId).maybeSingle().then(({ data, error }) => {
      if (error) setEnabled(null); else setEnabled(data?.email_notifications !== false);
    });
  }, [userId]);
  if (enabled === null) return null; // database update not installed yet
  async function toggle() {
    const next = !enabled;
    setBusy(true); setMsg("");
    const { error } = await supabase.from("profiles").update({ email_notifications: next }).eq("id", userId);
    setBusy(false);
    if (error) setMsg(error.message); else setEnabled(next);
  }
  return <section className="rounded-3xl border border-white/10 bg-[#11131e] p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-bold">{zh ? "新消息邮件提醒" : "New message emails"}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{zh ? "有人给你发来未读消息时，向你的注册邮箱发送提醒（同一对话 10 分钟内最多 1 封）。" : "Get an email for unread messages (at most one per conversation every 10 minutes)."}</p>
      </div>
      <button type="button" role="switch" aria-checked={enabled} disabled={busy} onClick={toggle} className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${enabled ? "bg-violet-500" : "bg-zinc-700"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${enabled ? "left-6" : "left-1"}`} />
      </button>
    </div>
    {msg && <p className="mt-3 text-xs text-rose-300">{msg}</p>}
  </section>;
}
