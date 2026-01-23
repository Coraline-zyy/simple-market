// app/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const h = await headers(); // ✅ 注意 await
  const al = (h.get("accept-language") || "").toLowerCase();
  const prefersEn = al.startsWith("en") || al.includes("en-");

  redirect(prefersEn ? "/en" : "/zh");
}
