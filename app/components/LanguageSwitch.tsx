// app/components/LanguageSwitch.tsx
"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { safeLang } from "@/lib/i18n";

export default function LanguageSwitch() {
  const pathname = usePathname() || "/en";

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
        window.location.assign(nextPath);
      }}
      className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-sm text-zinc-100"
    >
      {currentLang === "zh" ? "EN" : "中文"}
    </button>
  );
}
