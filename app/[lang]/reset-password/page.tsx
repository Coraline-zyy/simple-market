"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";

function parseHash(hash: string) {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const sp = new URLSearchParams(h);
  return {
    accessToken: sp.get("access_token"),
    refreshToken: sp.get("refresh_token"),
    error: sp.get("error"),
    errorDescription: sp.get("error_description"),
  };
}

export default function ResetPasswordPage() {
  const params = useParams<{ lang: string }>();
  const L = safeLang(params?.lang);
  const t = useMemo(() => getT(L), [L]);

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [msg, setMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
        setChecking(false);
      }
    });

    async function prepare() {
      try {
        const hash = parseHash(window.location.hash);
        if (hash.error) {
          if (!cancelled) {
            setMsg(hash.errorDescription || hash.error);
            setChecking(false);
          }
          return;
        }

        if (hash.accessToken && hash.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.accessToken,
            refresh_token: hash.refreshToken,
          });
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } else {
          const code = new URLSearchParams(window.location.search).get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!cancelled) {
          setReady(!!data.session);
          setChecking(false);
          if (!data.session) setMsg(t.auth.resetLinkInvalid);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setChecking(false);
          setReady(false);
          setMsg(t.auth.resetLinkInvalid + (e instanceof Error ? ` ${e.message}` : ""));
        }
      }
    }

    prepare();
    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
    };
  }, [t.auth.resetLinkInvalid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (newPassword.length < 6) return setMsg(t.auth.passwordTooShort);
    if (newPassword !== confirmPassword) return setMsg(t.auth.passwordMismatch);

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setMsg(t.auth.passwordUpdateFail + error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setMsg(t.auth.resetPasswordOk);
  }

  return (
    <main className="bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-2xl font-bold">{t.auth.resetTitle}</h1>
          <p className="mt-2 text-sm text-zinc-400">{t.auth.resetSubtitle}</p>

          {checking ? (
            <div className="mt-6 text-sm text-zinc-400">{t.auth.checkingResetLink}</div>
          ) : ready && !success ? (
            <form onSubmit={submit} className="mt-6 grid gap-3">
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                placeholder={t.auth.newPasswordPlaceholder}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none focus:border-zinc-600"
                placeholder={t.auth.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={saving}
                className="w-fit rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-6 py-3"
              >
                {saving ? t.auth.savingPassword : t.auth.resetPasswordButton}
              </button>
            </form>
          ) : null}

          {msg && <div className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">{msg}</div>}

          {!checking && (!ready || success) && (
            <Link href={`/${L}`} className="mt-5 inline-block text-sm text-zinc-300 hover:text-white underline underline-offset-4">
              {t.auth.backToLogin}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
