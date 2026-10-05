"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getT, safeLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";

type Row = { id: string; post_type: "service" | "demand"; post_id: string; created_at: string; last_message_at: string | null; last_message_text: string | null; dealStatus: "confirming" | "done" | null; workflowStatus: string | null; postStatus: "active" | "completed" | null; title: string };

export default function TransactionsPage() {
  const params = useParams<{ lang: string }>(); const lang = safeLang(params.lang); const t = useMemo(() => getT(lang), [lang]);
  const [uid, setUid] = useState<string | null>(null); const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [status, setStatus] = useState("");

  async function load(userId: string) {
    setLoading(true); setStatus("");
    const { data: convs, error } = await supabase.from("conversations").select("id, post_type, post_id, created_at, last_message_at, last_message_text, owner_id, other_id").or(`owner_id.eq.${userId},other_id.eq.${userId}`).order("last_message_at", { ascending: false, nullsFirst: false }).limit(200);
    if (error) { setStatus(error.message); setLoading(false); return; }
    const output: Row[] = [];
    for (const c of convs ?? []) {
      const [d, p] = await Promise.all([
        supabase.from("deals").select("status, workflow_status").eq("conversation_id", c.id).maybeSingle(),
        supabase.from(c.post_type === "service" ? "services" : "demands").select("title, status").eq("id", c.post_id).maybeSingle(),
      ]);
      output.push({ id: c.id, post_type: c.post_type, post_id: c.post_id, created_at: c.created_at, last_message_at: c.last_message_at, last_message_text: c.last_message_text, dealStatus: (d.data as any)?.status ?? null, workflowStatus: (d.data as any)?.workflow_status ?? "chatting", postStatus: (p.data as any)?.status ?? null, title: (p.data as any)?.title ?? `${c.post_type}-${c.post_id.slice(0, 8)}` });
    }
    setRows(output); setLoading(false);
  }

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { const id = data.session?.user?.id ?? null; setUid(id); if (id) load(id); else setLoading(false); }).catch(()=>{setUid(null);setLoading(false)}); const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { const id = session?.user?.id ?? null; setUid(id); if (id) load(id); else { setRows([]); setLoading(false); } }); return () => sub.subscription.unsubscribe(); }, []);

  const isDone = (r: Row) => r.workflowStatus === "done" || r.dealStatus === "done";
  const active = rows.filter((r) => !isDone(r)); const completed = rows.filter(isDone);

  function Card({ row }: { row: Row }) { const label=row.workflowStatus==="arbitration"?(lang==="zh"?"仲裁中":"Arbitration"):isDone(row)?t.me.completed:row.workflowStatus==="completion_pending"?(lang==="zh"?"结束中":"Finishing"):row.workflowStatus==="active"?t.me.active:(lang==="zh"?"聊天":"Chat"); return <a href={`/${lang}/transactions/${row.id}`} className="block rounded-xl border border-white/10 bg-[#11131e] p-4 transition hover:border-violet-400/40"><div className="flex items-start justify-between gap-3"><div className="font-semibold">{row.title}</div><span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300">{label}</span></div><div className="mt-2 line-clamp-2 text-sm text-zinc-400">{row.last_message_text || t.transaction.noMessages}</div><div className="mt-2 text-xs text-zinc-600">{new Date(row.last_message_at || row.created_at).toLocaleString()}</div></a>; }

  return <main className="bg-zinc-950 px-6 py-10 text-zinc-100"><div className="mx-auto max-w-5xl"><div className="flex items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{t.transaction.listTitle}</h1><p className="mt-2 text-zinc-400">{t.transaction.listSubtitle}</p></div><a href={`/${lang}/me`} className="text-zinc-300 underline">{t.transaction.back}</a></div>{!uid ? <div className="mt-6 rounded-2xl border border-zinc-800 p-6 text-zinc-400">{t.transaction.loginRequired}</div> : loading ? <div className="mt-6 text-zinc-400">{t.common.loading}</div> : <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5"><h2 className="font-semibold">{t.me.active}（{active.length}）</h2><div className="mt-4 space-y-3">{active.length ? active.map((r) => <Card key={r.id} row={r} />) : <div className="text-sm text-zinc-500">{t.transaction.noneActive}</div>}</div></section><section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5"><h2 className="font-semibold">{t.me.completed}（{completed.length}）</h2><div className="mt-4 space-y-3">{completed.length ? completed.map((r) => <Card key={r.id} row={r} />) : <div className="text-sm text-zinc-500">{t.transaction.noneCompleted}</div>}</div></section></div>}{status && <div className="mt-4 text-sm text-red-300">{status}</div>}</div></main>;
}
