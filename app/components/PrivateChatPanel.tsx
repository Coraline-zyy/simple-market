"use client";
// One private conversation (user ↔ user, or user ↔ administrator) shown inside "Me → Chats".
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AVATARS_BUCKET, publicStorageUrl } from "@/lib/media";
import { announceUnreadChanged, notifyNewMessage } from "@/lib/notify";
import { useUserOnline } from "@/app/components/PresenceProvider";

type Message = { id: string; sender_id: string; content: string; created_at: string; read_at?: string | null };
export type PrivateThreadInfo = {
  kind: "direct" | "admin";
  threadId: string;
  otherId: string;
  otherUsername: string | null;
  otherAvatarPath: string | null;
  /** The other side is a platform administrator. */
  fromAdmin: boolean;
};

export default function PrivateChatPanel({ lang, uid, thread }: { lang: "zh" | "en"; uid: string; thread: PrivateThreadInfo }) {
  const zh = lang === "zh";
  const table = thread.kind === "direct" ? "direct_messages" : "admin_private_messages";
  const [messages, setMessages] = useState<Message[]>([]), [limit, setLimit] = useState(100);
  const [text, setText] = useState(""), [sending, setSending] = useState(false), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const bottom = useRef<HTMLDivElement>(null), sendLock = useRef(false), sequence = useRef(0);
  const online = useUserOnline(thread.otherId);
  const avatar = publicStorageUrl(AVATARS_BUCKET, thread.otherAvatarPath);
  const name = thread.otherUsername || (zh ? "未设置ID" : "No ID");
  const [verifiedAdmins, setVerifiedAdmins] = useState<string[]>([]);
  useEffect(() => { let active = true; setVerifiedAdmins([]); Promise.all([uid, thread.otherId].map(async id => { const r = await supabase.rpc("is_market_admin_user", { p_user: id }); return !r.error && r.data === true ? id : null; })).then(ids => { if (active) setVerifiedAdmins(ids.filter((id): id is string => !!id)); }); return () => { active = false; }; }, [uid, thread.otherId]);
  const iAmAdminSide = verifiedAdmins.includes(uid);
  const isAdminMessage = (m: Message) => verifiedAdmins.includes(m.sender_id);

  async function markRead(rows: Message[]) {
    const { error } = await supabase.rpc("mark_loaded_chat_read", { p_kind: thread.kind, p_thread: thread.threadId, p_ids: rows.map(m => m.id) });
    if (!error) announceUnreadChanged();
  }

  // Load + poll every 3 seconds (also listens to realtime for user-to-user messages).
  useEffect(() => {
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    setMessages([]); setLoading(true); setError("");
    async function poll() {
      const request = ++sequence.current;
      try {
        const { data, error } = await supabase.from(table).select("id,sender_id,content,created_at,read_at").eq("thread_id", thread.threadId)
          .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
        if (error) throw error;
        if (!stopped && request === sequence.current) {
          const rows = ((data ?? []) as Message[]).reverse();
          setMessages(rows);
          if (document.visibilityState === "visible" && rows.some(m => m.sender_id !== uid && !m.read_at)) void markRead(rows);
        }
      } catch (e: any) { if (!stopped) setError(e?.message || "Request failed"); }
      if (!stopped) { setLoading(false); timer = setTimeout(poll, 3000); }
    }
    const visible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void poll(); } };
    document.addEventListener("visibilitychange", visible);
    void poll();
    const channel = thread.kind === "direct"
      ? supabase.channel(`dm-${thread.threadId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `thread_id=eq.${thread.threadId}` }, () => { clearTimeout(timer); void poll(); }).subscribe()
      : null;
    return () => { document.removeEventListener("visibilitychange", visible); stopped = true; ++sequence.current; clearTimeout(timer); if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.kind, thread.threadId, limit, uid]);

  const lastId = messages.at(-1)?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [lastId, thread.threadId]);

  async function send() {
    const content = text.trim();
    if (!content || sendLock.current) return;
    sendLock.current = true; setSending(true); setError("");
    try {
      const { data, error } = await supabase.from(table).insert({ thread_id: thread.threadId, sender_id: uid, content }).select("id,sender_id,content,created_at,read_at").single();
      if (error) throw error;
      ++sequence.current;
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message]);
      setText("");
      notifyNewMessage(thread.kind, data.id);
    } catch (e: any) {
      const msg = e?.message || "Request failed";
      setError(/muted/i.test(msg) ? (zh ? "你的账号已被禁言，暂时无法发送消息。" : "Your account is muted and cannot send messages right now.") : msg);
    } finally { sendLock.current = false; setSending(false); }
  }

  return <>
    <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
      <a href={`/${lang}/users/${thread.otherId}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
        {avatar ? <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">{name[0]?.toUpperCase()}</span>}
        <div className="min-w-0">
          <div className={`truncate font-semibold ${verifiedAdmins.includes(thread.otherId) ? "text-rose-300" : ""}`}>@{name}</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {verifiedAdmins.includes(thread.otherId) ? (zh ? "管理员私聊" : "Administrator") : iAmAdminSide ? (zh ? "你以管理员身份联系该用户" : "You are messaging as administrator") : (zh ? "私聊" : "Private message")}
            {" · "}<span className={online ? "text-emerald-400" : ""}>{online ? (zh ? "在线" : "Online") : (zh ? "离线" : "Offline")}</span>
          </div>
        </div>
      </a>
      <a href={`/${lang}/users/${thread.otherId}`} className="ml-auto shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500">{zh ? "查看主页" : "View profile"}</a>
    </div>
    {error && <p role="alert" className="mt-3 break-words text-sm text-rose-300">{error}</p>}
    <div className="my-4 flex h-[420px] flex-col overflow-y-auto rounded-xl bg-black/15 p-3">
      {messages.length >= limit && <button type="button" onClick={() => setLimit(v => v + 100)} className="mb-3 text-xs text-violet-300">{zh ? "加载更早的消息" : "Load earlier messages"}</button>}
      {loading && !messages.length ? <p className="m-auto text-sm text-zinc-500">{zh ? "加载中…" : "Loading…"}</p>
        : !messages.length ? <p className="m-auto text-sm text-zinc-500">{zh ? "还没有消息，打个招呼吧 👋" : "No messages yet — say hello 👋"}</p>
        : <div className="flex flex-1 flex-col justify-end gap-3">{messages.map(m => {
          const mine = m.sender_id === uid, admin = isAdminMessage(m);
          return <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${admin ? "border border-rose-400/25 bg-rose-950/40" : mine ? "bg-violet-600" : "bg-[#202130]"}`}>
              {admin && <p className="mb-1 text-xs font-bold text-rose-300">{zh ? "管理员" : "Administrator"}</p>}
              <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{m.content}</p>
              <p className="mt-2 text-[10px] text-zinc-400">{new Date(m.created_at).toLocaleString(zh ? "zh-CN" : "en-GB")}{mine ? ` · ${m.read_at ? (zh ? "已读" : "Read") : (zh ? "未读" : "Unread")}` : ""}</p>
            </div>
          </div>;
        })}</div>}
      <div ref={bottom} />
    </div>
    <div className="flex gap-2">
      <textarea value={text} disabled={sending} maxLength={5000} rows={2} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
        placeholder={zh ? "输入消息，回车发送，Shift+回车换行…" : "Type a message, Enter to send…"} className="min-w-0 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 outline-none" />
      <button type="button" disabled={sending || !text.trim()} onClick={send} className="rounded-xl bg-violet-600 px-5 font-bold disabled:opacity-40">{sending ? (zh ? "发送中…" : "Sending…") : (zh ? "发送" : "Send")}</button>
    </div>
    <p className="mt-2 text-xs text-zinc-500">{zh ? "请勿在平台外付款或透露密码、验证码。" : "Never pay outside the platform or share passwords or codes."}</p>
  </>;
}
