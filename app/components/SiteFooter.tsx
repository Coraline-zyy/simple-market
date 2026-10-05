"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { safeLang, getT } from "@/lib/i18n";
import {OPEN_AUTHOR_NOTE_EVENT} from "@/app/components/AuthorNoteModal";

export default function SiteFooter({ lang }: { lang: string }) {
  const L = safeLang(lang);
  const t = getT(L);
  const pathname = usePathname();
  const isLoginPage = pathname === `/${L}` || pathname === `/${L}/` || pathname === `/${L}/login` || pathname === `/${L}/login/`;
  return (
    <footer className={`border-t border-zinc-800 bg-zinc-950 px-6 text-sm text-zinc-400 ${isLoginPage?"py-3":"py-7"}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl leading-6"><div className="font-medium text-zinc-300">{t.home.footerLine1}</div><p className="mt-1 text-zinc-500">{t.home.footerLine2}</p></div>
        <div className="flex shrink-0 flex-wrap gap-6">
          <Link href={`/${L}/account`} className="font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 transition hover:text-white">{t.common.account}</Link>
          <button type="button" onClick={()=>window.dispatchEvent(new Event(OPEN_AUTHOR_NOTE_EVENT))} className="font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 transition hover:text-white">{L==="zh"?"作者的话":"Creator's note"}</button>
          <Link href={`/${L}/disclaimer`} className="font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-4 transition hover:text-white">{t.common.disclaimerLink}</Link>
        </div>
      </div>
    </footer>
  );
}
