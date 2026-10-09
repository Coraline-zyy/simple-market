// Private messages now live inside "Me → Chats". Old links keep working.
import { redirect } from "next/navigation";
import { safeLang } from "@/lib/i18n";
export default async function MessagesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = safeLang((await params).lang);
  redirect(`/${lang}/me?tab=chat`);
}
