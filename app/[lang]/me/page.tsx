"use client";

import { useEffect, useMemo, useState } from "react";
import AuthBox from "@/app/components/AuthBox";
import { getT, safeLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useSearchParams } from "next/navigation";

type Service = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  status: "active" | "completed";
  created_at: string;
};

type Demand = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: number | null;
  status: "active" | "completed";
  created_at: string;
};

type Conversation = {
  id: string;
  post_type: "service" | "demand";
  post_id: string;
  owner_id: string;
  other_id: string;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Deal = {
  id: string;
  conversation_id: string;
  status: "confirming" | "done";
  owner_confirmed: boolean;
  other_confirmed: boolean;
  updated_at: string | null;
};

type Review = {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  text: string | null;
  created_at: string;
};

function normService(r: any): Service {
  return {
    id: r.id,
    owner_id: r.owner_id,
    title: r.title ?? "",
    description: r.description ?? null,
    category: r.category ?? "其他",
    price: r.price ?? null,
    status: (r.status ?? "active") as any,
    created_at: r.created_at ?? new Date().toISOString(),
  };
}

function normDemand(r: any): Demand {
  return {
    id: r.id,
    owner_id: r.owner_id,
    title: r.title ?? "",
    description: r.description ?? null,
    category: r.category ?? "其他",
    budget: r.budget ?? null,
    status: (r.status ?? "active") as any,
    created_at: r.created_at ?? new Date().toISOString(),
  };
}

export default function MePage() {
  const params = useParams<{ lang: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);

  // URL params
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab"); // "chat" | "posts" | null
  const convFromUrl = searchParams.get("conv"); // conversation id | null

  const initialTab = (tabFromUrl === "chat" ? "chat" : "posts") as "posts" | "chat";
  const initialConv = convFromUrl;

  // auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAnon, setIsAnon] = useState<boolean>(false);

  const needEmail = !userEmail;

  // UI
  const [tab, setTab] = useState<"posts" | "chat">(initialTab);
  const [statusMsg, setStatusMsg] = useState("");

  // profile bio
  const [bio, setBio] = useState("");
  const [bioLoading, setBioLoading] = useState(false);

  // my posts
  const [myServicesActive, setMyServicesActive] = useState<Service[]>([]);
  const [myServicesDone, setMyServicesDone] = useState<Service[]>([]);
  const [myDemandsActive, setMyDemandsActive] = useState<Demand[]>([]);
  const [myDemandsDone, setMyDemandsDone] = useState<Demand[]>([]);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState<"service" | "demand">("service");
  const [editId, setEditId] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMoney, setEditMoney] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // conversations
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConv);

  // messages
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sendText, setSendText] = useState("");
  const [sending, setSending] = useState(false);

  // deal & review
  const [deal, setDeal] = useState<Deal | null>(null);
  const [dealLoading, setDealLoading] = useState(false);

  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherBio, setOtherBio] = useState<string>("");
  const [otherDealsCount, setOtherDealsCount] = useState<number>(0);
  const [otherReviews, setOtherReviews] = useState<Review[]>([]);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ✅ sync UI state when URL changes（保留一个就够了，删掉重复的 useEffect）
  useEffect(() => {
    const nextTab = (tabFromUrl === "chat" ? "chat" : "posts") as "posts" | "chat";
    const nextConv = convFromUrl;

    setTab((prev) => (prev === nextTab ? prev : nextTab));
    setSelectedConvId((prev) => (prev === nextConv ? prev : nextConv));
  }, [tabFromUrl, convFromUrl]);

  // auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);
      setIsAnon(!!(u as any)?.is_anonymous);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);
      setIsAnon(!!(u as any)?.is_anonymous);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const headerStatus = useMemo(() => {
    if (userEmail) return `${t.me.loggedEmail}（${userEmail}）`;
    if (userId) return t.me.loggedAnon;
    return t.me.notLogged;
  }, [t, userEmail, userId]);

  // ---------- load profile bio ----------
  async function loadBio(uid: string) {
    setBioLoading(true);
    const { data, error } = await supabase.from("profiles").select("bio").eq("id", uid).maybeSingle();
    setBioLoading(false);
    if (error) return;
    setBio((data?.bio as string) ?? "");
  }

  async function saveBio() {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.needEmail);
      return;
    }
    const v = bio.trim();
    if (v.length > 300) {
      setStatusMsg(t.me.status.bioTooLong);
      return;
    }

    setBioLoading(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, bio: v, updated_at: new Date().toISOString() });
    setBioLoading(false);

    if (error) {
      setStatusMsg(t.me.status.bioSaveFail + error.message);
      return;
    }
    setStatusMsg(t.me.status.bioSaved);
  }

  // ---------- load my posts ----------
  async function loadMyPosts(uid: string) {
    const [s1, s2, d1, d2] = await Promise.all([
      supabase
        .from("services")
        .select("id, owner_id, title, description, category, price, status, created_at")
        .eq("owner_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("services")
        .select("id, owner_id, title, description, category, price, status, created_at")
        .eq("owner_id", uid)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("demands")
        .select("id, owner_id, title, description, category, budget, status, created_at")
        .eq("owner_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("demands")
        .select("id, owner_id, title, description, category, budget, status, created_at")
        .eq("owner_id", uid)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (!s1.error) setMyServicesActive(((s1.data as any[]) ?? []).map(normService));
    if (!s2.error) setMyServicesDone(((s2.data as any[]) ?? []).map(normService));
    if (!d1.error) setMyDemandsActive(((d1.data as any[]) ?? []).map(normDemand));
    if (!d2.error) setMyDemandsDone(((d2.data as any[]) ?? []).map(normDemand));
  }

  async function markCompleted(type: "service" | "demand", id: string) {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.needEmail);
      return;
    }
    const table = type === "service" ? "services" : "demands";
    const { error } = await supabase.from(table).update({ status: "completed" }).eq("id", id).eq("owner_id", userId);
    if (error) {
      setStatusMsg((lang === "zh" ? "操作失败：" : "Failed: ") + error.message);
      return;
    }
    setStatusMsg(t.me.status.saved);
    await loadMyPosts(userId);
  }

  async function deletePost(type: "service" | "demand", id: string) {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.needEmail);
      return;
    }
    const ok = window.confirm(type === "service" ? t.me.deleteConfirmService : t.me.deleteConfirmDemand);
    if (!ok) return;
    const table = type === "service" ? "services" : "demands";
    const { error } = await supabase.from(table).delete().eq("id", id).eq("owner_id", userId);
    if (error) {
      setStatusMsg((lang === "zh" ? "删除失败：" : "Delete failed: ") + error.message);
      return;
    }
    setStatusMsg(t.me.status.deleted);
    await loadMyPosts(userId);
  }

  function openEdit(type: "service" | "demand", item: Service | Demand) {
    setEditType(type);
    setEditId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description ?? "");
    setEditCategory(item.category ?? "其他");
    setEditMoney(type === "service" ? String((item as Service).price ?? "") : String((item as Demand).budget ?? ""));
    setEditOpen(true);
  }

  async function saveEdit() {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.needEmail);
      return;
    }
    if (!editTitle.trim()) {
      setStatusMsg(t.me.status.titleEmpty);
      return;
    }

    const moneyVal = editMoney.trim() ? Number(editMoney) : null;
    if (editMoney.trim() && Number.isNaN(moneyVal)) {
      setStatusMsg(t.me.status.moneyNan);
      return;
    }

    setEditSaving(true);

    if (editType === "service") {
      const { error } = await supabase
        .from("services")
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() ? editDesc.trim() : null,
          category: editCategory || "其他",
          price: moneyVal,
        })
        .eq("id", editId)
        .eq("owner_id", userId);
      setEditSaving(false);
      if (error) {
        setStatusMsg((lang === "zh" ? "保存失败：" : "Save failed: ") + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("demands")
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() ? editDesc.trim() : null,
          category: editCategory || "其他",
          budget: moneyVal,
        })
        .eq("id", editId)
        .eq("owner_id", userId);
      setEditSaving(false);
      if (error) {
        setStatusMsg((lang === "zh" ? "保存失败：" : "Save failed: ") + error.message);
        return;
      }
    }

    setEditOpen(false);
    setStatusMsg(t.me.status.saved);
    await loadMyPosts(userId);
  }

  // ---------- conversations ----------
  async function loadConversations(uid: string) {
    setConvLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, post_type, post_id, owner_id, other_id, created_at")
      .or(`owner_id.eq.${uid},other_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(200);
    setConvLoading(false);

    if (error) return;
    setConvs((data as any[]) ?? []);
  }

  async function loadMessages(conversationId: string) {
    setMsgLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    setMsgLoading(false);

    if (error) {
      setStatusMsg(t.me.status.openConvFail);
      return;
    }
    setMsgs((data as any[]) ?? []);
  }

  async function loadDealAndSideInfo(conversationId: string, uid: string) {
    setDealLoading(true);

    const d = await supabase
      .from("deals")
      .select("id, conversation_id, status, owner_confirmed, other_confirmed, updated_at")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (!d.error && d.data) setDeal(d.data as any);
    else setDeal(null);

    // ✅ conversations 主键是 id，所以这里要 .eq("id", conversationId)
    const { data: convRow, error: convErr } = await supabase
      .from("conversations")
      .select("id, post_type, post_id, owner_id, other_id, created_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !convRow) {
      setOtherId(null);
      setOtherBio("");
      setOtherDealsCount(0);
      setOtherReviews([]);
      setMyReview(null);
      setDealLoading(false);
      return;
    }

    const oid = convRow.owner_id === uid ? convRow.other_id : convRow.owner_id;
    setOtherId(oid);

    if (oid) {
      const p = await supabase.from("profiles").select("bio").eq("id", oid).maybeSingle();
      setOtherBio((p.data?.bio as string) ?? "");

      const dc = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("reviewee_id", oid);
      setOtherDealsCount(dc.count ?? 0);

      const rr = await supabase
        .from("reviews")
        .select("id, deal_id, reviewer_id, reviewee_id, rating, text, created_at")
        .eq("reviewee_id", oid)
        .order("created_at", { ascending: false })
        .limit(20);
      setOtherReviews(((rr.data as any[]) ?? []) as any);
    } else {
      setOtherBio("");
      setOtherDealsCount(0);
      setOtherReviews([]);
    }

    if (d.data?.id) {
      const mr = await supabase
        .from("reviews")
        .select("id, deal_id, reviewer_id, reviewee_id, rating, text, created_at")
        .eq("deal_id", d.data.id)
        .eq("reviewer_id", uid)
        .maybeSingle();
      setMyReview((mr.data as any) ?? null);
    } else {
      setMyReview(null);
    }

    setDealLoading(false);
  }


  // ✅ 放在 MePage() 里面，和其它 async function 同级

  async function ensureDeal(conversationId: string) {
    // ✅ 正确字段：conversation_id
    const exist = await supabase
      .from("deals")
      .select("id, conversation_id, status, owner_confirmed, other_confirmed, updated_at")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (exist.data) return exist.data as any;

    const { data, error } = await supabase
      .from("deals")
      .insert({
        conversation_id: conversationId,
        status: "confirming",
        owner_confirmed: false,
        other_confirmed: false,
      })
      .select("id, conversation_id, status, owner_confirmed, other_confirmed, updated_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as any;
  }

  async function confirmDeal() {
    setStatusMsg("");

    if (!userId || needEmail) {
      setStatusMsg(t.me.status.confirmNeedLogin);
      return;
    }
    if (!selectedConvId) {
      setStatusMsg(t.me.status.reviewNeedConv);
      return;
    }

    setDealLoading(true);

    try {
      // ✅ 直接按 conversations.id 查
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select("id, post_type, post_id, owner_id, other_id, created_at")
        .eq("id", selectedConvId)
        .maybeSingle();

      if (convErr || !conv) {
        throw new Error(t.me.status.openConvFail);
      }

      // ✅ 确保 deal 存在
      let d = deal ?? (await ensureDeal(selectedConvId));
      if (!d) throw new Error(lang === "zh" ? "创建成交失败，请重试。" : "Failed to create deal, retry.");

      const isOwner = conv.owner_id === userId;
      const patch = isOwner ? { owner_confirmed: true } : { other_confirmed: true };

      const upd = await supabase
        .from("deals")
        .update({ ...patch, status: "confirming", updated_at: new Date().toISOString() })
        .eq("id", d.id)
        .select("id, conversation_id, status, owner_confirmed, other_confirmed, updated_at")
        .maybeSingle();

      if (upd.error || !upd.data) {
        throw new Error((lang === "zh" ? "确认失败：" : "Confirm failed: ") + (upd.error?.message ?? "Unknown"));
      }

      d = upd.data as any;

      // ✅ 双方都确认 -> done，并把帖子 completed
      if (d.owner_confirmed && d.other_confirmed) {
        const doneUpd = await supabase
          .from("deals")
          .update({ status: "done", updated_at: new Date().toISOString() })
          .eq("id", d.id)
          .select("id, conversation_id, status, owner_confirmed, other_confirmed, updated_at")
          .maybeSingle();

        if (!doneUpd.error && doneUpd.data) d = doneUpd.data as any;

        const table = conv.post_type === "service" ? "services" : "demands";
        await supabase.from(table).update({ status: "completed" }).eq("id", conv.post_id);
      }

      setDeal(d);
      setStatusMsg(d.status === "done" ? (lang === "zh" ? "已完成 ✅" : "Completed ✅") : t.me.status.confirmOk);

      await loadMyPosts(userId);
      await loadDealAndSideInfo(selectedConvId, userId);
    } catch (e: any) {
      setStatusMsg(e?.message ?? (lang === "zh" ? "确认成交失败" : "Confirm deal failed"));
    } finally {
      // ✅ 永远收尾，不卡 loading
      setDealLoading(false);
    }
  }



  async function sendMessage() {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.sendNeedLogin);
      return;
    }
    if (!selectedConvId) {
      setStatusMsg(t.me.status.reviewNeedConv);
      return;
    }
    const text = sendText.trim();
    if (!text) return;

    setSending(true);

    // ✅ messages 表结构是 conversation_id，不是 target_id/target_type
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConvId,
      sender_id: userId,
      content: text,
    });

    setSending(false);

    if (error) {
      setStatusMsg(t.me.status.sendFail + error.message);
      return;
    }
    setSendText("");
    await loadMessages(selectedConvId);
  }

  async function submitReview() {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.reviewNeedLogin);
      return;
    }
    if (!selectedConvId || !deal) {
      setStatusMsg(t.me.status.reviewNeedConv);
      return;
    }
    if (deal.status !== "done") {
      setStatusMsg(t.me.status.reviewNeedDone);
      return;
    }
    if (!otherId) {
      setStatusMsg(t.me.status.confirmMissingOwner);
      return;
    }
    if (myReview) {
      setStatusMsg(t.me.status.reviewDup);
      return;
    }

    const r = Math.max(1, Math.min(5, rating));

    setReviewSubmitting(true);
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        deal_id: deal.id,
        reviewer_id: userId,
        reviewee_id: otherId,
        rating: r,
        text: reviewText.trim() ? reviewText.trim() : null,
      })
      .select("id, deal_id, reviewer_id, reviewee_id, rating, text, created_at")
      .maybeSingle();
    setReviewSubmitting(false);

    if (error) {
      setStatusMsg((lang === "zh" ? "评价失败：" : "Review failed: ") + error.message);
      return;
    }
    setMyReview((data as any) ?? null);
    setReviewText("");
    setStatusMsg(lang === "zh" ? "评价已提交 ✅" : "Review submitted ✅");

    if (otherId) {
      const rr = await supabase
        .from("reviews")
        .select("id, deal_id, reviewer_id, reviewee_id, rating, text, created_at")
        .eq("reviewee_id", otherId)
        .order("created_at", { ascending: false })
        .limit(20);
      setOtherReviews(((rr.data as any[]) ?? []) as any);
    }
  }

  // ---------- initial load ----------
  useEffect(() => {
    setStatusMsg("");
    if (!userId) return;
    loadBio(userId);
    loadMyPosts(userId);
    loadConversations(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---------- realtime conversations list ----------
  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel("rt_conversations_me")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        loadConversations(userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  // ---------- when select conversation ----------
  useEffect(() => {
    if (!userId || !selectedConvId) return;
    setStatusMsg("");
    loadMessages(selectedConvId);
    loadDealAndSideInfo(selectedConvId, userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvId, userId]);

  // ✅ realtime messages（随 selectedConvId 变化重新订阅）
  useEffect(() => {
    if (!selectedConvId) return;

    const ch = supabase
      .channel(`rt_messages_${selectedConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as any;
        if (m?.conversation_id !== selectedConvId) return;

        setMsgs((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m as Message];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedConvId]);

  // ✅ realtime deal updates（随 selectedConvId 变化重新订阅）
  useEffect(() => {
    if (!selectedConvId) return;

    const ch = supabase
      .channel(`rt_deals_${selectedConvId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, (payload) => {
        const d = payload.new as any;
        if (d?.conversation_id !== selectedConvId) return;
        setDeal(d as Deal);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedConvId]);

  function convTitle(c: Conversation) {
    const prefix = c.post_type === "service" ? "S" : "D";
    const who = userId && c.owner_id === userId ? "→" : "←";
    return `${prefix}-${c.post_id.slice(0, 6)} ${who}`;
  }

  const canFull = !!userId && !needEmail && !isAnon;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.me.title}</h1>
            <p className="text-zinc-400 mt-2">{t.me.subtitle}</p>
            <div className="mt-2 text-sm text-zinc-500">{headerStatus}</div>
          </div>

          <div className="flex items-center gap-4">
            <a href={`/${lang}`} className="text-zinc-300 hover:text-white underline underline-offset-4">
              {t.common.backHome}
            </a>
            <a href={`/${lang}/services`} className="text-zinc-300 hover:text-white underline underline-offset-4">
              {t.common.services}
            </a>
            <a href={`/${lang}/demands`} className="text-zinc-300 hover:text-white underline underline-offset-4">
              {t.common.demands}
            </a>
          </div>
        </div>

        <div className="mt-6">
          <AuthBox lang={lang} />
        </div>

        {needEmail && <div className="mt-4 text-sm text-amber-300">{t.me.needEmailTip}</div>}

        <div className="mt-6 flex gap-2">
          <button
            className={`rounded-xl px-4 py-2 text-sm border ${
              tab === "posts" ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
            }`}
            onClick={() => setTab("posts")}
          >
            {t.me.tabPosts}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm border ${
              tab === "chat" ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
            }`}
            onClick={() => setTab("chat")}
          >
            {t.me.tabChat}
          </button>
        </div>

        {statusMsg && (
          <div className="mt-4 text-sm text-zinc-200 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            {statusMsg}
          </div>
        )}

        {/* ---------------- POSTS TAB ---------------- */}
        {tab === "posts" && (
          <div className="mt-6 grid lg:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="text-lg font-semibold">{t.me.profileCard}</div>

              <div className="mt-3 text-sm text-zinc-300">{t.me.bioLabel}</div>
              <textarea
                className="mt-2 w-full min-h-28 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                placeholder={t.me.bioPh}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />

              <div className="mt-3 flex gap-3">
                <button
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2"
                  disabled={!canFull || bioLoading}
                  onClick={saveBio}
                >
                  {bioLoading ? t.me.savingBio : t.me.saveBio}
                </button>

                <button
                  className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-5 py-2"
                  onClick={() => userId && loadBio(userId)}
                  disabled={!userId}
                >
                  {t.common.refresh}
                </button>
              </div>

              {!canFull && <div className="mt-3 text-sm text-zinc-500">{t.me.needEmailTip}</div>}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t.me.myServices}</div>
                <button
                  className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-4 py-2 text-sm"
                  onClick={() => userId && loadMyPosts(userId)}
                  disabled={!userId}
                >
                  {t.common.refresh}
                </button>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <div className="font-semibold">
                    {t.me.active}（{myServicesActive.length}）
                  </div>
                  <div className="mt-2 space-y-2">
                    {myServicesActive.length === 0 ? (
                      <div className="text-sm text-zinc-400">{t.me.noneActiveService}</div>
                    ) : (
                      myServicesActive.map((s) => (
                        <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="font-semibold">{s.title}</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {s.category} {s.price != null ? `· ¥${s.price}` : ""}
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap text-sm">
                            <button className="underline text-zinc-200 hover:text-white" onClick={() => openEdit("service", s)}>
                              {t.common.edit}
                            </button>
                            <button className="underline text-zinc-200 hover:text-white" onClick={() => markCompleted("service", s.id)}>
                              {t.common.confirm}
                            </button>
                            <button className="underline text-red-300 hover:text-red-200" onClick={() => deletePost("service", s.id)}>
                              {t.common.delete}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <div className="font-semibold">
                    {t.me.completed}（{myServicesDone.length}）
                  </div>
                  <div className="mt-2 space-y-2">
                    {myServicesDone.length === 0 ? (
                      <div className="text-sm text-zinc-400">{t.me.noneDoneService}</div>
                    ) : (
                      myServicesDone.map((s) => (
                        <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="font-semibold">{s.title}</div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {s.category} {s.price != null ? `· ¥${s.price}` : ""}
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap text-sm">
                            <button className="underline text-zinc-200 hover:text-white" onClick={() => openEdit("service", s)}>
                              {t.common.edit}
                            </button>
                            <button className="underline text-red-300 hover:text-red-200" onClick={() => deletePost("service", s.id)}>
                              {t.common.delete}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-lg font-semibold">{t.me.myDemands}</div>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="font-semibold">
                      {t.me.active}（{myDemandsActive.length}）
                    </div>
                    <div className="mt-2 space-y-2">
                      {myDemandsActive.length === 0 ? (
                        <div className="text-sm text-zinc-400">{t.me.noneActiveDemand}</div>
                      ) : (
                        myDemandsActive.map((d) => (
                          <div key={d.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                            <div className="font-semibold">{d.title}</div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {d.category} {d.budget != null ? `· ¥${d.budget}` : ""}
                            </div>
                            <div className="mt-2 flex gap-2 flex-wrap text-sm">
                              <button className="underline text-zinc-200 hover:text-white" onClick={() => openEdit("demand", d)}>
                                {t.common.edit}
                              </button>
                              <button className="underline text-zinc-200 hover:text-white" onClick={() => markCompleted("demand", d.id)}>
                                {t.common.confirm}
                              </button>
                              <button className="underline text-red-300 hover:text-red-200" onClick={() => deletePost("demand", d.id)}>
                                {t.common.delete}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="font-semibold">
                      {t.me.completed}（{myDemandsDone.length}）
                    </div>
                    <div className="mt-2 space-y-2">
                      {myDemandsDone.length === 0 ? (
                        <div className="text-sm text-zinc-400">{t.me.noneDoneDemand}</div>
                      ) : (
                        myDemandsDone.map((d) => (
                          <div key={d.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                            <div className="font-semibold">{d.title}</div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {d.category} {d.budget != null ? `· ¥${d.budget}` : ""}
                            </div>
                            <div className="mt-2 flex gap-2 flex-wrap text-sm">
                              <button className="underline text-zinc-200 hover:text-white" onClick={() => openEdit("demand", d)}>
                                {t.common.edit}
                              </button>
                              <button className="underline text-red-300 hover:text-red-200" onClick={() => deletePost("demand", d.id)}>
                                {t.common.delete}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ---------------- CHAT TAB ---------------- */}
        {tab === "chat" && (
          <div className="mt-6 grid lg:grid-cols-[320px_1fr] gap-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t.me.chats.listTitle}</div>
                <button
                  className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-sm"
                  onClick={() => userId && loadConversations(userId)}
                  disabled={!userId}
                >
                  {t.common.refresh}
                </button>
              </div>

              <div className="mt-3 text-xs text-zinc-500">{t.me.chats.selectTip}</div>

              {convLoading ? (
                <div className="mt-4 text-sm text-zinc-400">{t.common.loading}</div>
              ) : convs.length === 0 ? (
                <div className="mt-4 text-sm text-zinc-400">{t.me.chats.none}</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {convs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConvId(c.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 ${
                        selectedConvId === c.id
                          ? "border-zinc-500 bg-zinc-950/40"
                          : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
                      }`}
                    >
                      <div className="text-sm font-semibold">{convTitle(c)}</div>
                      <div className="text-xs text-zinc-500 mt-1">{new Date(c.created_at).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              {!selectedConvId ? (
                <div className="text-zinc-400">{t.me.chats.selectTip}</div>
              ) : (
                <>
                  {/* deal block */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-lg font-semibold">{t.me.deal.otherInfo}</div>
                        <div className="mt-2 text-sm text-zinc-300">
                          {t.me.deal.otherBio}:{" "}
                          <span className="text-zinc-100">{otherBio ? otherBio : t.me.deal.otherBioEmpty}</span>
                        </div>
                        <div className="mt-2 text-sm text-zinc-500">
                          {t.me.deal.otherDeals} {otherDealsCount}
                        </div>
                      </div>

                      <div className="min-w-[240px]">
                        <div className="text-sm text-zinc-300">
                          {deal ? (
                            deal.status === "done" ? (
                              <span className="text-emerald-300">{t.me.deal.done}</span>
                            ) : (
                              <span>
                                {t.me.deal.confirmingPrefix} {deal.owner_confirmed ? "✅" : "…"} / {t.me.deal.other}{" "}
                                {deal.other_confirmed ? "✅" : "…"}
                              </span>
                            )
                          ) : (
                            <span className="text-zinc-400">{t.me.deal.notStarted}</span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">{t.me.deal.rule}</div>

                        <button
                          className="mt-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2"
                          onClick={confirmDeal}
                          disabled={!canFull || dealLoading || deal?.status === "done"}
                        >
                          {deal?.status === "done" ? t.me.deal.doneBtn : dealLoading ? t.common.loading : t.me.deal.confirmBtn}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-semibold">{t.me.deal.recentReviews}</div>
                      {otherReviews.length === 0 ? (
                        <div className="mt-2 text-sm text-zinc-400">{t.me.deal.noReviews}</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {otherReviews.map((r) => (
                            <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                              <div className="text-sm text-zinc-200">
                                {t.me.deal.rating} {r.rating}/5
                              </div>
                              {r.text && <div className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{r.text}</div>}
                              <div className="mt-1 text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* review block */}
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="text-lg font-semibold">{t.me.review.title}</div>

                    {!deal || deal.status !== "done" ? (
                      <div className="mt-2 text-sm text-zinc-400">{t.me.review.needDone}</div>
                    ) : myReview ? (
                      <div className="mt-2 text-sm text-zinc-200">
                        {t.me.review.already} {myReview.rating}/5
                        <div className="mt-1 text-zinc-300">
                          {myReview.text ? (
                            <>
                              {t.me.review.yourTextPrefix}
                              <span className="whitespace-pre-wrap">{myReview.text}</span>
                            </>
                          ) : (
                            t.me.review.noText
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid md:grid-cols-[140px_1fr] gap-3 items-start">
                        <div>
                          <div className="text-sm text-zinc-300">{t.me.review.ratingLabel}</div>
                          <select
                            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 outline-none"
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                          >
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>

                          <button
                            className="mt-3 w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-4 py-2"
                            onClick={submitReview}
                            disabled={!canFull || reviewSubmitting}
                          >
                            {reviewSubmitting ? t.me.review.submitting : t.me.review.submit}
                          </button>
                        </div>

                        <textarea
                          className="w-full min-h-24 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 outline-none"
                          placeholder={t.me.review.textPh}
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* messages */}
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">{t.me.chats.messagesTitle}</div>
                      <button
                        className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-sm"
                        onClick={() => selectedConvId && loadMessages(selectedConvId)}
                      >
                        {t.common.refresh}
                      </button>
                    </div>

                    {msgLoading ? (
                      <div className="mt-4 text-sm text-zinc-400">{t.common.loading}</div>
                    ) : (
                      <div className="mt-4 space-y-2 max-h-[420px] overflow-auto pr-2">
                        {msgs.map((m) => (
                          <div
                            key={m.id}
                            className={`rounded-xl border px-3 py-2 ${
                              m.sender_id === userId ? "border-indigo-700/60 bg-indigo-500/10" : "border-zinc-800 bg-zinc-900/20"
                            }`}
                          >
                            <div className="text-sm text-zinc-200 whitespace-pre-wrap">{m.content}</div>
                            <div className="mt-1 text-xs text-zinc-500">{new Date(m.created_at).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 outline-none"
                        placeholder={t.me.chats.sendPh}
                        value={sendText}
                        onChange={(e) => setSendText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <button
                        className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2"
                        onClick={sendMessage}
                        disabled={!canFull || sending}
                      >
                        {sending ? t.me.chats.sending : t.me.chats.send}
                      </button>
                    </div>

                    {!canFull && <div className="mt-2 text-xs text-zinc-500">{t.me.needEmailTip}</div>}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* ---------------- EDIT MODAL ---------------- */}
        {editOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
            <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="text-lg font-semibold">
                {editType === "service" ? t.me.editModalTitleService : t.me.editModalTitleDemand}
              </div>
              <div className="mt-2 text-sm text-zinc-500">{t.me.editHint}</div>

              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 outline-none"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={lang === "zh" ? "标题" : "Title"}
                />
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 outline-none"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder={lang === "zh" ? "分类" : "Category"}
                />
                <textarea
                  className="w-full min-h-24 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 outline-none"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={lang === "zh" ? "描述" : "Description"}
                />
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 outline-none"
                  value={editMoney}
                  onChange={(e) => setEditMoney(e.target.value)}
                  placeholder={
                    editType === "service"
                      ? lang === "zh"
                        ? "价格（可选）"
                        : "Price (optional)"
                      : lang === "zh"
                      ? "预算（可选）"
                      : "Budget (optional)"
                  }
                />
              </div>

              <div className="mt-5 flex gap-3 justify-end">
                <button className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-4 py-2" onClick={() => setEditOpen(false)}>
                  {t.common.cancel}
                </button>
                <button
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2"
                  onClick={saveEdit}
                  disabled={!canFull || editSaving}
                >
                  {editSaving ? t.common.loading : t.common.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
