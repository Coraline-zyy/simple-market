// app/components/AuthBox.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";

type Props = {
  lang?: string;
  initialEmail?: string;
};

export default function AuthBox({ lang, initialEmail = "" }: Props) {
  const params = useParams<{ lang?: string }>();

  // ✅ 优先用 props.lang，其次用 URL params.lang，最后才回退 zh
  const L = useMemo(() => safeLang(lang ?? params?.lang), [lang, params]);
  const t = useMemo(() => getT(L), [L]);

  const [email, setEmail] = useState(initialEmail);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [sending, setSending] = useState(false);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user ?? null;
    setUserEmail(u?.email ?? null);
  }

  useEffect(() => {
    refreshSession();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink() {
    setMsg("");
    const e = email.trim();
    if (!e) return setMsg(t.auth.msgNeedEmail);

    setSending(true);

    // ✅ 带上 lang，确保回调回来还是同语言
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const redirectTo = `${base}/${L}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    setSending(false);

    if (error) setMsg(t.auth.msgSendFail + error.message);
    else setMsg(t.auth.msgLinkSent);
  }

  async function signOut() {
    setMsg("");
    const { error } = await supabase.auth.signOut();
    if (error) setMsg(t.auth.msgSignOutFail + error.message);
    else {
      setUserEmail(null);
      setMsg(t.auth.msgSignOutOk);
    }
  }

  const loggedIn = !!userEmail;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      {loggedIn ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-zinc-300">
            {t.auth.loggedInAs} <span className="font-semibold">{userEmail}</span>
          </div>

          <button onClick={signOut} className="text-sm text-zinc-300 hover:text-white underline">
            {t.auth.signOut}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            <input
              className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={sendLink}
                disabled={sending}
                className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-6 py-3"
              >
                {sending ? t.auth.sendLinkSending : t.auth.sendLink}
              </button>
            </div>
          </div>

          {msg && <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{msg}</div>}
          <div className="mt-2 text-xs text-zinc-500">{t.auth.hint}</div>
        </>
      )}
    </div>
  );
}
