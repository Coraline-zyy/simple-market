"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
type LikeState = { post_id: string; like_count: number; liked: boolean };
export function useForumLikes(ids: string[], uid: string | null, onError: (message: string) => void) {
  const [states, setStates] = useState<Record<string, LikeState>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const locks = useRef(new Set<string>());
  const key = ids.join(",");
  useEffect(() => {
    let active = true;
    if (!key) { setStates({}); return; }
    supabase.rpc("get_forum_like_states", { p_posts: key.split(",") }).then(({ data, error }) => {
      if (!active) return;
      if (error) { onError(error.message); return; }
      setStates(Object.fromEntries((data ?? []).map((row: LikeState) => [row.post_id, row])));
    });
    return () => { active = false; };
  }, [key, uid]);
  async function toggle(id: string, lang: "zh" | "en") {
    if (locks.current.has(id)) return;
    if (!uid) { onError(lang === "zh" ? "请先登录后点赞。" : "Please sign in to like a post."); return; }
    locks.current.add(id); setPending(new Set(locks.current));
    try {
      const { data, error } = await supabase.rpc("set_forum_like", { p_post: id, p_liked: !states[id]?.liked });
      if (error) throw error;
      setStates(previous => ({ ...previous, [id]: data as LikeState })); onError("");
    } catch (error: any) { onError(error?.message || "Request failed"); }
    finally { locks.current.delete(id); setPending(new Set(locks.current)); }
  }
  return { states, pending, toggle };
}
export default function ForumLikeButton({ state, busy, onClick, lang }: {
  state?: LikeState; busy: boolean; onClick: () => void; lang: "zh" | "en";
}) {
  return <button type="button" disabled={busy || !state} aria-pressed={!!state?.liked} onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${state?.liked ? "border-rose-400/50 bg-rose-500/10 text-rose-300" : "border-white/10 text-zinc-400 hover:text-rose-300"}`}>
    <span aria-hidden="true">{state?.liked ? "♥" : "♡"}</span>
    {state?.liked ? (lang === "zh" ? "已点赞" : "Liked") : (lang === "zh" ? "点赞" : "Like")} <span>{state?.like_count ?? "—"}</span>
  </button>;
}
