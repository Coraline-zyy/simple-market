"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { getT, safeLang } from "@/lib/i18n";

const SESSION_KEY = "simple-market:market-disclaimer-seen";

export default function SecurityDisclaimerModal() {
  const params = useParams<{ lang?: string }>();
  const pathname = usePathname();
  const lang = useMemo(() => safeLang(params?.lang), [params]);
  const t = useMemo(() => getT(lang).disclaimer, [lang]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const hall=/\/(services|demands)\/?$/.test(pathname);
    if(hall&&sessionStorage.getItem(SESSION_KEY)!=="1")setOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  function closeModal() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
      <section role="dialog" aria-modal="true" aria-labelledby="security-disclaimer-title" className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="border-b border-zinc-800 px-5 py-5 pr-16 sm:px-7">
          <div className="mb-2 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">{t.badge}</div>
          <h2 id="security-disclaimer-title" className="text-xl font-semibold text-white sm:text-2xl">{t.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{t.intro}</p>
          <button type="button" onClick={closeModal} aria-label={lang === "zh" ? "关闭免责声明" : "Close disclaimer"} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-2xl text-zinc-300 hover:bg-zinc-800">×</button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <div className="space-y-5">
            {t.sections.map((section) => <div key={section.title}><h3 className="text-sm font-semibold text-zinc-100">{section.title}</h3><p className="mt-1.5 text-sm leading-6 text-zinc-400">{section.body}</p></div>)}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><h3 className="text-sm font-semibold text-zinc-100">{t.safetyTitle}</h3><ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-400">{t.safetyItems.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:px-7">
          <p className="text-xs leading-5 text-zinc-500">{lang === "zh" ? "本次打开网站期间只显示一次；在需求大厅显示后，进入服务大厅不会重复弹出，反之亦然。" : "Shown once per browsing session. If it appears in one marketplace, it will not appear again in the other."}</p>
          <button type="button" onClick={closeModal} className="mt-4 w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-indigo-400">{t.close}</button>
        </div>
      </section>
    </div>
  );
}
