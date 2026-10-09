"use client";
// Red unread-message counter used in the top navigation.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUnreadTotal(userId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) { setCount(0); return; }
    let active = true, sequence = 0;
    const load = () => {
      if(document.visibilityState!=="visible")return;
      const request=++sequence;
      void supabase.rpc("get_my_unread_total").then(({ data, error }) => {
        if (active && request===sequence && !error) setCount(Number(data ?? 0));
      });
    };
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener("youqiu:unread-changed", load);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    const ch = supabase
      .channel(`rt_unread_${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, load)
      .subscribe();
    return () => { active = false; clearInterval(timer); window.removeEventListener("youqiu:unread-changed", load); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", load); supabase.removeChannel(ch); };
  }, [userId]);

  // Show the number on the app icon too (supported on installed apps in Chrome/Edge/Safari).
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try { if (count > 0) void nav.setAppBadge?.(count).catch(() => {}); else void nav.clearAppBadge?.().catch(() => {}); } catch { /* not supported */ }
  }, [count]);

  return count;
}

export default function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white ${className}`}>{count > 99 ? "99+" : count}</span>;
}
