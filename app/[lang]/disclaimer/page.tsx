import Link from "next/link";
import { getT, safeLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DisclaimerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const L = safeLang(lang);
  const t = getT(L).disclaimer;

  return (
    <main className="bg-zinc-950 px-6 py-12 text-zinc-100">
      <article className="mx-auto max-w-3xl">
        <Link
          href={`/${L}/home`}
          className="text-sm text-zinc-400 underline underline-offset-4 transition hover:text-white"
        >
          {L === "zh" ? "← 返回首页" : "← Back Home"}
        </Link>

        <div className="mt-8 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          {t.badge}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">{t.intro}</p>

        <div className="mt-9 space-y-7">
          {t.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-zinc-100">{section.title}</h2>
              <p className="mt-2 leading-7 text-zinc-400">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-9 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-100">{t.safetyTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-zinc-400">
            {t.safetyItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-sm leading-6 text-zinc-500">
          {L === "zh"
            ? "使用本平台即表示你理解网络交易可能存在风险，并同意在交易前自行进行必要的核实和判断。本免责声明不排除适用法律下不能被排除或限制的责任。"
            : "By using this platform, you acknowledge that online transactions may involve risks and agree to make the checks and judgments you consider necessary before trading. Nothing in this disclaimer excludes or limits liability that cannot lawfully be excluded or limited."}
        </p>
      </article>
    </main>
  );
}
