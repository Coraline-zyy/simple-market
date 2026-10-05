// app/[lang]/auth/callback/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { safeLang } from "@/lib/i18n";

export default function AuthCallbackPage() {
  const params = useParams<{ lang: string }>();
  const lang = safeLang(params?.lang);
  const [msg, setMsg] = useState<string>(lang === "zh" ? "正在完成登录……" : "Completing sign-in…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    async function run() {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const error = query.get("error") || hash.get("error");
        const errorDescription = query.get("error_description") || hash.get("error_description");

        if (error) {
          if (!cancelled) setMsg((lang === "zh" ? "登录失败：" : "Sign in failed: ") + (errorDescription || error));
          return;
        }
        // detectSessionInUrl is enabled on the shared client, so implicit-flow
        // hash tokens and PKCE codes are processed once by Supabase. Do not call
        // setSession/exchangeCodeForSession again here: React Strict Mode may run
        // effects twice in development and the duplicate request caused AbortError.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error(lang === "zh" ? "未能建立登录会话，请重新打开最新的邮箱链接。" : "No session was created. Please reopen the latest email link.");
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.replace(`/${lang}/home`);
      } catch (e: any) {
        if (!cancelled) setMsg((lang === "zh" ? "登录回调失败：" : "Sign-in callback failed: ") + (e?.message ?? "Unknown"));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="text-xl font-semibold">{lang === "zh" ? "正在登录" : "Signing in"}</div>
        <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{msg}</div>
        <a href={`/${lang}`} className="mt-6 inline-block text-sm text-violet-300 underline underline-offset-4">{lang === "zh" ? "返回登录页" : "Back to sign in"}</a>
      </div>
    </main>
  );
}
