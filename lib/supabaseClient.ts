// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ 单例：全站只创建一个 client，避免出现“两个 client 两份 session”
// ✅ persistSession + autoRefreshToken + detectSessionInUrl：魔法链接/刷新/切页都稳定
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // storageKey 可不写（默认会按项目生成），但写死更稳定
    storageKey: "sb-auth",
  },
});
