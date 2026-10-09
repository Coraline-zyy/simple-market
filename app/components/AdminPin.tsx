"use client";
// Administrator-only "Pin to top" control + the "Pinned" label shown on posts.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useIsAdmin() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let active=true, version=0;
    const refresh=() => {
      const request=++version;
      void supabase.rpc("is_market_admin").then(({data,error}) => {
        if(active && request===version) setAdmin(!error && data===true);
      });
    };
    refresh();
    // Supabase auth callbacks must return before issuing another auth-dependent query.
    const {data}=supabase.auth.onAuthStateChange(() => { setAdmin(false); setTimeout(() => { if(active) refresh(); },0); });
    return () => { active=false; ++version; data.subscription.unsubscribe(); };
  },[]);
  return admin;
}

export function PinnedTag({ pinnedAt, lang }: { pinnedAt?: string | null; lang: "zh" | "en" }) {
  if (!pinnedAt) return null;
  return <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">📌 {lang === "zh" ? "置顶" : "Pinned"}</span>;
}

export default function AdminPinButton({ kind, id, pinnedAt, lang, onChanged }: {
  kind: "service" | "demand" | "post"; id: string; pinnedAt?: string | null; lang: "zh" | "en"; onChanged?: (pinnedAt: string | null) => void;
}) {
  const admin = useIsAdmin();
  const [busy, setBusy] = useState(false), [pinned, setPinned] = useState(!!pinnedAt), [error, setError] = useState("");
  useEffect(() => setPinned(!!pinnedAt), [pinnedAt]);
  if (!admin) return null;
  async function toggle(event: React.MouseEvent) {
    event.preventDefault(); event.stopPropagation();
    setBusy(true); setError("");
    const next = !pinned;
    const { error } = await supabase.rpc("admin_set_pinned", { p_kind: kind, p_id: id, p_pinned: next });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setPinned(next);
    onChanged?.(next ? new Date().toISOString() : null);
  }
  return <span className="ml-auto inline-flex flex-col">
    <button type="button" disabled={busy} onClick={toggle} className={`rounded-lg border px-3 py-1 text-xs font-semibold disabled:opacity-40 ${pinned ? "border-amber-400/50 text-amber-300 hover:bg-amber-500/10" : "border-rose-400/40 text-rose-300 hover:bg-rose-500/10"}`}>
      {busy ? "…" : pinned ? (lang === "zh" ? "取消置顶" : "Unpin") : (lang === "zh" ? "管理员置顶" : "Pin to top")}
    </button>
    {error && <span className="mt-1 text-[11px] text-rose-300">{error}</span>}
  </span>;
}

/** Sort helper: pinned first (newest pin first), then newest post first. */
export function pinnedFirst<T extends { pinned_at?: string | null; created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const pa = a.pinned_at ? new Date(a.pinned_at).getTime() : 0, pb = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
