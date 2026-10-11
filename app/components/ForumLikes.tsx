"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
type LikeState = { post_id: string; like_count: number; liked: boolean };
export function useForumLikes(ids: string[], uid: string | null, onError: (message: string) => void, target: "post" | "comment" = "post") {
  const [states, setStates] = useState<Record<string, LikeState>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const locks = useRef(new Set<string>());
  const key = ids.join(",");
  useEffect(() => {
    let active = true;
    if (!key) { setStates({}); return; }
    setStates({});
    Promise.resolve(supabase.rpc(target === "comment" ? "get_comment_like_states" : "get_forum_like_states", target === "comment" ? { p_comments: key.split(",") } : { p_posts: key.split(",") })).then(({ data, error }) => {
      if (!active) return;
      if (error) { onError(error.message); return; }
      setStates(Object.fromEntries((data ?? []).map((row: any) => { const id = target === "comment" ? row.comment_id : row.post_id; return [id, { ...row, post_id: id }]; })));
    }).catch((error: any) => { if (active) onError(error?.message || "Request failed"); });
    return () => { active = false; };
  }, [key, uid, target]);
  async function toggle(id: string, lang: "zh" | "en") {
    if (locks.current.has(id)) return;
    if (!uid) { onError(lang === "zh" ? "请先登录后点赞。" : "Please sign in to like."); return; }
    if (!states[id]) return;
    locks.current.add(id); setPending(new Set(locks.current));
    try {
      const { data, error } = await supabase.rpc(target === "comment" ? "set_comment_like" : "set_forum_like", target === "comment" ? { p_comment: id, p_liked: !states[id].liked } : { p_post: id, p_liked: !states[id].liked });
      if (error) throw error;
      setStates(previous => ({ ...previous, [id]: { ...data, post_id: id } as LikeState })); onError("");
    } catch (error: any) { onError(error?.message || "Request failed"); }
    finally { locks.current.delete(id); setPending(new Set(locks.current)); }
  }
  return { states, pending, toggle };
}

export function useCommentLikes(ids: string[], uid: string | null, onError: (message: string) => void) {
  return useForumLikes(ids, uid, onError, "comment");
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
