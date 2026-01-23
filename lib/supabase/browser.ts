// lib/supabase/browser.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseBrowserClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      // ✅ 必开：让 supabase 自动从 URL（query/hash）里读取 token/code 并落地 session
      detectSessionInUrl: true,

      // ✅ 建议：magic link / oauth 在新版本里默认走 pkce 更稳
      flowType: "pkce",

      // ✅ 保持登录态
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
