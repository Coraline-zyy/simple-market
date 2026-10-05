"use client";

import { useEffect, useMemo, useState } from "react";
import { AVATARS_BUCKET, publicStorageUrl } from "@/lib/media";
import { supabase } from "@/lib/supabaseClient";

type Lang = "zh" | "en";
type Review = { id: string; reviewer_id: string; rating: number; text: string | null; created_at: string };
type PublicProfile = { id: string; username: string | null; display_name: string | null; avatar_path: string | null };

export default function ProfileReviews({ userId, lang }: { userId: string; lang: Lang }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError("");
      const result = await supabase.from("reviews").select("id, reviewer_id, rating, text, created_at").eq("reviewee_id", userId).order("created_at", { ascending: false });
      if (!active) return;
      if (result.error) { setError(result.error.message); setLoading(false); return; }
      const rows = (result.data ?? []) as Review[];
      setReviews(rows);
      const reviewerIds = [...new Set(rows.map((review) => review.reviewer_id).filter(Boolean))];
      if (reviewerIds.length) {
        const profiles = await supabase.from("profiles").select("id, username, display_name, avatar_path").in("id", reviewerIds);
        if (active && !profiles.error) setReviewers(Object.fromEntries(((profiles.data ?? []) as PublicProfile[]).map((profile) => [profile.id, profile])));
      } else setReviewers({});
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [userId]);

  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0, [reviews]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", { year: "numeric", month: "short", day: "numeric" }), [lang]);

  return <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
    <h2 className="text-lg font-semibold">{lang === "zh" ? "评分与评论" : "Ratings & reviews"}</h2>
    {loading ? <p className="mt-3 text-sm text-zinc-500">{lang === "zh" ? "正在加载…" : "Loading…"}</p> : error ? <p className="mt-3 text-sm text-red-300">{lang === "zh" ? "无法加载评价：" : "Could not load reviews: "}{error}</p> : reviews.length === 0 ? <p className="mt-3 text-sm text-zinc-500">{lang === "zh" ? "暂无评价" : "No reviews yet."}</p> : <>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-3xl font-bold">{average.toFixed(1)}</span><span className="text-amber-400" aria-label={`${average.toFixed(1)} / 5`}>★</span><span className="text-sm text-zinc-400">{lang === "zh" ? `共 ${reviews.length} 条评价` : `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}</span></div>
      <div className="mt-5 space-y-3">{reviews.map((review) => { const reviewer = reviewers[review.reviewer_id]; const avatarUrl = publicStorageUrl(AVATARS_BUCKET, reviewer?.avatar_path); const name = reviewer?.username || reviewer?.display_name || (lang === "zh" ? "用户" : "User"); return <article key={review.id} className="rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-3">{avatarUrl ? <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm">{name.slice(0, 1).toUpperCase()}</div>}<div className="min-w-0"><div className="truncate text-sm font-medium">{name}</div></div><time className="ml-auto text-xs text-zinc-500" dateTime={review.created_at}>{dateFormatter.format(new Date(review.created_at))}</time></div>
        <div className="mt-3 text-amber-400" aria-label={`${review.rating} / 5`}>{"★".repeat(review.rating)}<span className="text-zinc-700">{"★".repeat(5 - review.rating)}</span></div>{review.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{review.text}</p>}
      </article>; })}</div>
    </>}
  </section>;
}
