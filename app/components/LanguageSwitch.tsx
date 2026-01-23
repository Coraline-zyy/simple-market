// app/components/LanguageSwitch.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { safeLang } from "@/lib/i18n";

export default function LanguageSwitch() {
  const router = useRouter();
  const pathname = usePathname() || "/zh";

  const { currentLang, nextPath } = useMemo(() => {
    const parts = pathname.split("/");
    const seg1 = parts[1];
    const cur = safeLang(seg1);

    const next = cur === "zh" ? "en" : "zh";
    parts[1] = next;

    const rebuilt = parts.join("/") || `/${next}`;
    const finalPath = rebuilt.startsWith("/") ? rebuilt : `/${rebuilt}`;
    return { currentLang: cur, nextPath: finalPath };
  }, [pathname]);

  return (
    <button
      type="button"
      onClick={() => {
        // ✅ 用 replace 更干净；也可以 push
        router.replace(nextPath);
        // ❌ 不要 refresh（会导致 auth 状态抖动/重新初始化）
      }}
      className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-sm text-zinc-100"
    >
      {currentLang === "zh" ? "EN" : "中文"}
    </button>
  );
}
