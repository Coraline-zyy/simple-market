// app/[lang]/layout.tsx
import type { ReactNode } from "react";
import LanguageSwitch from "@/app/components/LanguageSwitch";

export default function LangLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitch />
      </div>
      {children}
    </div>
  );
}
