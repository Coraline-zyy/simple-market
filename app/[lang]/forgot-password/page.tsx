"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const params = useParams<{ lang: string }>();
  const L = safeLang(params?.lang);
  const t = useMemo(() => getT(L), [L]);

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const cleanEmail = email.trim();
    if (!cleanEmail) return setMsg(t.auth.msgNeedEmail);

    setSending(true);
    const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const redirectTo = `${base}/${L}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    setSending(false);

    if (error) setMsg(t.auth.resetEmailFail + error.message);
    else setMsg(t.auth.resetEmailSent);
  }

  return (
    <main className="bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <Link href={`/${L}`} className="text-sm text-zinc-400 hover:text-white underline underline-offset-4">
          {t.auth.backToLogin}
        </Link>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-2xl font-bold">{t.auth.forgotTitle}</h1>
          <p className="mt-2 text-sm text-zinc-400">{t.auth.forgotSubtitle}</p>

          <form onSubmit={submit} className="mt-6 grid gap-3">
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
              placeholder={t.auth.emailOnlyPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending}
              className="w-fit rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-6 py-3"
            >
              {sending ? t.auth.sendingResetEmail : t.auth.sendResetEmail}
            </button>
          </form>

          {msg && <div className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">{msg}</div>}
        </div>
      </div>
    </main>
  );
}
