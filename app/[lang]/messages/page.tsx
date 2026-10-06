import AdminPrivateChat from "@/app/components/AdminPrivateChat";
import { safeLang } from "@/lib/i18n";
export default async function MessagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = safeLang((await params).lang);
  return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">{lang === "zh" ? "私聊" : "Private messages"}</h1><AdminPrivateChat lang={lang} /></div></main>;
}
