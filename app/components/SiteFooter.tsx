// /app/components/SiteFooter.tsx
import { SITE_CONTACT, safeLang, getT } from "@/lib/i18n";

export default function SiteFooter({ lang }: { lang: string }) {
  const L = safeLang(lang);
  const t = getT(L);

  return (
    <footer className="mt-10 border-t border-zinc-800 pt-6 text-sm text-zinc-400">
      <div className="max-w-6xl mx-auto px-6">
        <div>
          <span className="text-zinc-500">{t.common.footerLine} </span>
          <span className="text-zinc-200">
            {L === "zh" ? SITE_CONTACT.textZh : SITE_CONTACT.textEn}
          </span>
        </div>
        <div className="mt-2 text-zinc-500">
          {L === "zh" ? SITE_CONTACT.lineZh : SITE_CONTACT.lineEn}
        </div>
      </div>
    </footer>
  );
}
