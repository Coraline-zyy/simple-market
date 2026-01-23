// app/[lang]/page.tsx
import AuthBox from "@/app/components/AuthBox";
import { getT, safeLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params; // ✅ 关键：await
  const L = safeLang(lang);
  const t = getT(L);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/* DEBUG */}


        <h1 className="text-4xl font-bold tracking-tight">{t.home.title}</h1>
        <p className="text-zinc-400 mt-3">{t.home.subtitle}</p>

        <div className="mt-6">
          <AuthBox lang={L} />
        </div>

        <div className="mt-6 flex gap-6 text-lg">
          <a className="text-zinc-200 hover:text-white underline underline-offset-4" href={`/${L}/services`}>
            {t.common.services}
          </a>
          <a className="text-zinc-200 hover:text-white underline underline-offset-4" href={`/${L}/demands`}>
            {t.common.demands}
          </a>
          <a className="text-zinc-200 hover:text-white underline underline-offset-4" href={`/${L}/me`}>
            {t.common.me}
          </a>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-300">
          <div>{t.home.footerLine1}</div>
          <div className="mt-2 text-zinc-400">{t.home.footerLine2}</div>
        </div>
      </div>
    </main>
  );
}
