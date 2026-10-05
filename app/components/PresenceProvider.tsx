"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PresenceContextValue = { onlineIds: Set<string> };
const PresenceContext = createContext<PresenceContextValue>({ onlineIds: new Set() });

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id;
      if (!active || !userId) return;
      const touch = () => supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
      touch();
      heartbeat = setInterval(touch, 60_000);
      channel = supabase.channel("site-presence", { config: { presence: { key: userId } } });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel?.presenceState() ?? {};
        const ids = new Set<string>();
        Object.values(state).flat().forEach((entry: any) => { if (entry?.user_id) ids.add(entry.user_id); });
        setOnlineIds(ids);
      }).subscribe(async status => { if (status === "SUBSCRIBED") await channel?.track({ user_id: userId, online_at: new Date().toISOString() }); });
    }).catch(() => { if (active) setOnlineIds(new Set()); });

    return () => { active = false; if (heartbeat) clearInterval(heartbeat); if (channel) supabase.removeChannel(channel); };
  }, []);

  const value = useMemo(() => ({ onlineIds }), [onlineIds]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function useUserOnline(userId: string | null | undefined) {
  const { onlineIds } = useContext(PresenceContext);
  return !!userId && onlineIds.has(userId);
}
