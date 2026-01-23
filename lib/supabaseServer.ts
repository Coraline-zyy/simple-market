import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies(); // ✅ 关键：Next 新版本这里是 Promise

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            // ✅ 兼容 next/headers 的 cookieStore.set
            cookieStore.set({ name, value, ...options });
          } catch {
            // 某些阶段不允许 set cookie，忽略即可
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // 同上
          }
        },
      },
    }
  );
}
