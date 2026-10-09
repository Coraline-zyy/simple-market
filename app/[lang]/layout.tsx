// app/[lang]/layout.tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";

export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata> {
 const lang=safeLang((await params).lang),name=lang==="zh"?"有求":"youqiu";
 return {title:name,applicationName:name,manifest:`/${lang}/manifest.webmanifest`,appleWebApp:{capable:true,title:name,statusBarStyle:"black"}};
}
import SecurityDisclaimerModal from "@/app/components/SecurityDisclaimerModal";
import SiteFooter from "@/app/components/SiteFooter";
import PrimaryNav from "@/app/components/PrimaryNav";
import { safeLang } from "@/lib/i18n";
import { PresenceProvider } from "@/app/components/PresenceProvider";
import AuthorNoteModal from "@/app/components/AuthorNoteModal";
import InstallBanner, { ServiceWorkerRegister } from "@/app/components/AppInstall";

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const L = safeLang(lang);

  return (
    <PresenceProvider><div className="flex min-h-screen flex-col bg-[#080a12] text-zinc-100">
      <PrimaryNav lang={L} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter lang={L} />
      <SecurityDisclaimerModal />
      <AuthorNoteModal lang={L} />
      <ServiceWorkerRegister lang={L} />
      <InstallBanner lang={L} />
    </div></PresenceProvider>
  );
}
