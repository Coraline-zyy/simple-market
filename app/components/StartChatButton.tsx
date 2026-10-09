"use client";
// "Message" button on a user's profile: opens (or creates) a private chat with them.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function StartChatButton({ userId, lang }: { userId: string; lang: "zh" | "en" }) {
  const zh = lang === "zh";
  const router = useRouter();
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");

  useEffect(() => {
    let active=true;
    supabase.auth.getSession().then(({ data }) => { if(active) setMe(data.session?.user?.id ?? null); }).catch(() => { if(active) setMe(null); });
    const {data}=supabase.auth.onAuthStateChange((_event,session) => { if(active) setMe(session?.user?.id ?? null); });
    return () => { active=false; data.subscription.unsubscribe(); };
  }, []);

  if (me === undefined || me === userId) return null; // still loading, or this is my own profile

  async function start() {
    setError("");
    if (!me) { router.push(`/${lang}`); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("start_direct_chat", { p_user: userId });
      if (error) throw error;
      router.push(`/${lang}/me?tab=chat&dm=direct:${data}`);
    } catch (e: any) {
      setError(e?.message || (zh ? "无法发起私聊" : "Could not start the chat"));
      setBusy(false);
    }
  }

  return <div>
    <button type="button" disabled={busy} onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-50">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      {busy ? (zh ? "正在打开…" : "Opening…") : me ? (zh ? "私聊" : "Message") : (zh ? "登录后私聊" : "Sign in to message")}
    </button>
    {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
  </div>;
}
