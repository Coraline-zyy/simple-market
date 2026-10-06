"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AVATARS_BUCKET, publicStorageUrl } from "@/lib/media";
type Person = { id: string; username: string | null; avatar_path: string | null };
type Thread = { id: string; admin_id: string; user_id: string; created_at: string; person?: Person };
type Message = { id: string; sender_id: string; content: string; created_at: string };
function Avatar({ person }: { person?: Person }) {
  const src = publicStorageUrl(AVATARS_BUCKET, person?.avatar_path);
  return src ? <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-200">{(person?.username || "U")[0].toUpperCase()}</span>;
}
export default function AdminPrivateChat({ lang, admin = false }: { lang: "zh" | "en"; admin?: boolean }) {
  const zh = lang === "zh";
  const [uid, setUid] = useState<string | null>(null), [ready, setReady] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]), [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]), [limit, setLimit] = useState(100);
  const [query, setQuery] = useState(""), [users, setUsers] = useState<Person[]>([]);
  const [text, setText] = useState(""), [error, setError] = useState(""), [sending, setSending] = useState(false), [starting, setStarting] = useState(false);
  const bottom = useRef<HTMLDivElement>(null), sequence = useRef(0), sendLock = useRef(false);
  const lastMessage = messages.at(-1)?.id;
  const selectedId = selected?.id;
  async function loadThreads() {
    const { data, error: failure } = await supabase.from("admin_private_threads").select("id,admin_id,user_id,created_at").order("created_at", { ascending: false });
    if (failure) throw failure;
    const rows = (data ?? []) as Thread[];
    const ids = [...new Set(rows.map(row => row.admin_id === uid ? row.user_id : row.admin_id))];
    const people = new Map<string, Person>();
    if (ids.length) {
      const result = await supabase.from("profiles").select("id,username,avatar_path").in("id", ids);
      if (result.error) throw result.error;
      (result.data ?? []).forEach(person => people.set(person.id, person));
    }
    setThreads(rows.map(row => ({ ...row, person: people.get(row.admin_id === uid ? row.user_id : row.admin_id) })));
  }
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      setUid(data.session?.user?.id ?? null); setReady(true);
    }).catch(error => { if (active) { setError(String(error)); setReady(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!uid) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { await loadThreads(); } catch (error: any) { if (!stopped) setError(error?.message || "Request failed"); }
      if (!stopped) timer = setTimeout(poll, 5000);
    }
    void poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [uid]);
  useEffect(() => {
    if (!selectedId) return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const request = ++sequence.current;
      try {
        const { data, error } = await supabase.from("admin_private_messages").select("id,sender_id,content,created_at").eq("thread_id", selectedId!).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
        if (error) throw error;
        if (!stopped && request === sequence.current) setMessages(((data ?? []) as Message[]).reverse());
      } catch (error: any) { if (!stopped) setError(error?.message || "Request failed"); }
      if (!stopped) timer = setTimeout(poll, 3000);
    }
    void poll(); return () => { stopped = true; ++sequence.current; clearTimeout(timer); };
  }, [selectedId, limit]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [selectedId, lastMessage]);
  useEffect(() => {
    if (!admin || !uid) return;
    let active = true;
    const timer = setTimeout(() => {
      supabase.rpc("search_admin_chat_users", { p_query: query }).then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message); else setUsers(data ?? []);
      });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, admin, uid]);
  function select(thread: Thread) { ++sequence.current; setSelected(thread); setMessages([]); setLimit(100); setText(""); setError(""); }
  async function start(person: Person) {
    if (starting || sending) return;
    setStarting(true); setError("");
    try {
      const { data, error } = await supabase.rpc("start_admin_private_chat", { p_user: person.id });
      if (error) throw error;
      select({ id: data, admin_id: uid!, user_id: person.id, person, created_at: new Date().toISOString() });
      await loadThreads();
    } catch (error: any) { setError(error?.message || "Request failed"); } finally { setStarting(false); }
  }
  async function send() {
    if (!selected || !uid || !text.trim() || sendLock.current) return;
    sendLock.current = true; setSending(true); setError("");
    try {
      const { data, error } = await supabase.from("admin_private_messages").insert({ thread_id: selected.id, sender_id: uid, content: text.trim() }).select("id,sender_id,content,created_at").single();
      if (error) throw error;
      ++sequence.current;
      setMessages(previous => previous.some(message => message.id === data.id) ? previous : [...previous, data]); setText("");
    } catch (error: any) { setError(error?.message || "Request failed"); } finally { sendLock.current = false; setSending(false); }
  }
  if (!ready) return <p className="mt-6 text-zinc-400">{zh ? "加载中…" : "Loading…"}</p>;
  if (!uid) return <p className="mt-6 text-zinc-400">{zh ? "请先登录查看私聊。" : "Please sign in to view messages."}</p>;
  return <div className="mt-6">
    {error && <p role="alert" className="mb-4 break-words text-sm text-rose-300">{error}</p>}
    <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-2xl border border-white/10 bg-[#11131e] p-4">
        {admin && <div className="mb-5"><h2 className="font-bold">{zh ? "发起用户私聊" : "Message a user"}</h2>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder={zh ? "搜索用户 ID" : "Search username or ID"} className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2" />
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{users.map(person => <button type="button" key={person.id} disabled={starting || sending} onClick={() => start(person)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 p-2 text-left hover:bg-white/5 disabled:opacity-40"><Avatar person={person} /><span className="min-w-0"><span className="block truncate text-sm">@{person.username || (zh ? "未设置ID" : "No ID")}</span><span className="block text-xs text-violet-300">{zh ? "发起私聊" : "Start chat"}</span></span></button>)}{!users.length && <p className="text-xs text-zinc-500">{zh ? "没有匹配的用户。" : "No matching users."}</p>}</div>
        </div>}
        <h2 className="mb-3 font-bold">{zh ? "私聊列表" : "Conversations"}</h2>
        <div className="max-h-80 space-y-2 overflow-y-auto">{threads.map(thread => <button type="button" key={thread.id} disabled={sending} onClick={() => select(thread)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-40 ${selectedId === thread.id ? "border-violet-400 bg-violet-500/10" : "border-white/10"}`}><Avatar person={thread.person} /><span className="min-w-0"><span className={`block truncate font-semibold ${thread.admin_id !== uid ? "text-rose-300" : ""}`}>{thread.person?.username || (zh ? "未设置ID" : "No ID")}</span><span className="text-xs text-zinc-500">{thread.admin_id !== uid ? (zh ? "管理员私聊" : "Administrator") : (zh ? "用户私聊" : "User conversation")}</span></span></button>)}{!threads.length && <p className="text-sm text-zinc-500">{zh ? "暂无私聊。管理员联系你后，对话会显示在这里。" : "No conversations yet. Messages from administrators will appear here."}</p>}</div>
      </aside>
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#11131e] p-4 sm:p-5">
        {selected ? <><div className="flex items-center gap-3 border-b border-white/10 pb-4"><Avatar person={selected.person} /><div><h2 className="font-bold">@{selected.person?.username || (zh ? "未设置ID" : "No ID")}</h2><p className={`text-xs ${selected.admin_id !== uid ? "text-rose-300" : "text-zinc-500"}`}>{selected.admin_id !== uid ? (zh ? "管理员" : "Administrator") : (zh ? "用户" : "User")}</p></div></div>
          <div className="my-4 flex h-[380px] flex-col overflow-y-auto rounded-xl bg-black/15 p-3 sm:h-[420px]">
            {messages.length >= limit && <button type="button" onClick={() => setLimit(value => value + 100)} className="mb-3 text-xs text-violet-300">{zh ? "加载更早的消息" : "Load earlier messages"}</button>}
            <div className="flex flex-1 flex-col justify-end gap-3">{messages.map(message => {
              const mine = message.sender_id === uid, fromAdmin = message.sender_id === selected.admin_id;
              return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${fromAdmin ? "border border-rose-400/25 bg-rose-950/40" : mine ? "bg-violet-600" : "bg-[#202130]"}`}>
                {fromAdmin && <p className="mb-1 text-xs font-bold text-rose-300">{zh ? "管理员" : "Administrator"}</p>}
                <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message.content}</p><p className="mt-2 text-[10px] text-zinc-400">{new Date(message.created_at).toLocaleString(zh ? "zh-CN" : "en-GB")}</p>
              </div></div>;
            })}</div><div ref={bottom} />
          </div>
          <div className="flex gap-2"><textarea value={text} disabled={sending} maxLength={5000} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} placeholder={zh ? "输入消息，回车发送…" : "Type a message, Enter to send…"} rows={2} className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/20 p-3" /><button type="button" disabled={sending || !text.trim()} onClick={send} className="rounded-xl bg-violet-600 px-5 font-bold disabled:opacity-40">{sending ? (zh ? "发送中…" : "Sending…") : (zh ? "发送" : "Send")}</button></div>
        </> : <p className="py-24 text-center text-zinc-500">{zh ? "请选择左侧对话" : "Select a conversation"}</p>}
      </section>
    </div>
  </div>;
}
