// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";
import { timedFetch } from "@/lib/timedFetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


// ✅ 单例：全站只创建一个 client，避免出现“两个 client 两份 session”
// ✅ persistSession + autoRefreshToken + detectSessionInUrl：魔法链接/刷新/切页都稳定
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: timedFetch },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // storageKey 可不写（默认会按项目生成），但写死更稳定
    storageKey: "sb-auth",
    // Chromium/Next development can leave a Web Locks request waiting during
    // hot reloads. A per-process lock keeps auth calls serialized without the
    // browser AbortError that prevented sign-in and email callbacks.
    lock: processLock,
  },
});
