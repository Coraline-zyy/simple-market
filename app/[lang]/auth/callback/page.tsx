// app/[lang]/auth/callback/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";

function parseHash(hash: string) {
  const h = (hash || "").startsWith("#") ? hash.slice(1) : hash;
  const sp = new URLSearchParams(h);
  return {
    access_token: sp.get("access_token"),
    refresh_token: sp.get("refresh_token"),
    error: sp.get("error"),
    error_description: sp.get("error_description"),
    type: sp.get("type"),
  };
}

export default function AuthCallbackPage() {
  const params = useParams<{ lang: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);

  const router = useRouter();
  const [msg, setMsg] = useState<string>("Signing in...");
  const [debug, setDebug] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const href = window.location.href;
        const { access_token, refresh_token, error, error_description, type } = parseHash(window.location.hash);

        const info = {
          step: "parseHash",
          href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          error,
          error_description,
          type,
        };
        if (!cancelled) setDebug(info);

        if (error) {
          if (!cancelled) setMsg(`Sign in failed: ${error_description || error}`);
          return;
        }

        // ✅ 你的链接是 #access_token=... #refresh_token=...
        // supabase-js v2 用 setSession 落库
        if (access_token && refresh_token) {
          const { data, error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (setErr) {
            if (!cancelled) setMsg("Sign in failed: " + setErr.message);
            return;
          }

          if (!data?.session) {
            if (!cancelled) setMsg("Missing session after setSession. Please retry the latest email link.");
            return;
          }

          if (!cancelled) setMsg("Signed in ✅ Redirecting...");
          // 清掉 hash，避免重复处理
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          router.replace(`/${lang}/me`);
          return;
        }

        // 如果没有 token（比如你以后切到 PKCE code flow），就提示
        if (!cancelled) setMsg("Missing tokens in callback URL. Please open the latest email link again.");
      } catch (e: any) {
        if (!cancelled) setMsg("Callback error: " + (e?.message ?? "Unknown"));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lang, router]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="text-xl font-semibold">Auth Callback</div>
        <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{msg}</div>

        <pre className="mt-4 text-xs text-zinc-400 whitespace-pre-wrap break-all">
          DEBUG
          {"\n"}
          {JSON.stringify(debug, null, 2)}
        </pre>
      </div>
    </main>
  );
}
