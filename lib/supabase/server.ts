// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // ✅ 注意 await

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: {
        getItem(key: string) {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem(key: string, value: string) {
          cookieStore.set(key, value);
        },
        removeItem(key: string) {
          cookieStore.set(key, "", { maxAge: 0 });
        },
      },
    },
  });
}
