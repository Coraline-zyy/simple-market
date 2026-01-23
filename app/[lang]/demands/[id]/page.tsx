"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthBox from "@/app/components/AuthBox";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";

type Demand = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: number | null;
  status?: "active" | "completed";
  created_at: string;
};

type Conversation = {
  id: string;
  post_type: "service" | "demand";
  post_id: string;
  owner_id: string;
  other_id: string;
  created_at: string;
  last_message_at: string | null;
  last_message_text: string | null;
};

export default function DemandDetailPage() {
  const params = useParams<{ lang: string; id: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);
  const id = params?.id;

  const [item, setItem] = useState<Demand | null>(null);
  const [status, setStatus] = useState("");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const canUse = useMemo(() => !!userEmail, [userEmail]);

  const [contact, setContact] = useState<string | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  const [startingChat, setStartingChat] = useState(false);

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // load demand
  useEffect(() => {
    if (!id) return;

    const run = async () => {
      setStatus("");
      setItem(null);

      const { data, error } = await supabase
        .from("demands")
        .select("id, owner_id, title, description, category, budget, status, created_at")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        setStatus((lang === "zh" ? "加载失败：" : "Load failed: ") + error.message);
        return;
      }

      setItem((data as Demand) ?? null);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lang]);

  async function loadContact() {
    setStatus("");
    if (!id) {
      setStatus(lang === "zh" ? "页面参数缺失（id）。请刷新后重试。" : "Missing page param (id). Please refresh.");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    const user = u.user;

    if (!user || !user.email || (user as any).is_anonymous) {
      setStatus(lang === "zh" ? "请使用邮箱登录后查看联系方式（匿名仅可浏览）。" : "Please sign in with email to view contacts.");
      return;
    }

    setLoadingContact(true);
    const { data, error } = await supabase.from("demand_contacts").select("contact").eq("demand_id", id).maybeSingle();
    setLoadingContact(false);

    if (error) {
      setStatus((lang === "zh" ? "读取联系方式失败：" : "Load contact failed: ") + error.message);
      return;
    }
    if (!data) {
      setStatus(lang === "zh" ? "对方未填写联系方式。" : "No contact provided.");
      return;
    }
    setContact(data.contact);
  }

  async function getOrCreateConversation(postId: string, postOwnerId: string, meId: string) {
    const q = await supabase
      .from("conversations")
      .select("id, post_type, post_id, owner_id, other_id, created_at, last_message_at, last_message_text")
      .eq("post_type", "demand")
      .eq("post_id", postId)
      .or(`and(owner_id.eq.${meId},other_id.eq.${postOwnerId}),and(owner_id.eq.${postOwnerId},other_id.eq.${meId})`)
      .maybeSingle();

    if (q.data?.id) return q.data as Conversation;

    const ins = await supabase
      .from("conversations")
      .insert({
        post_type: "demand",
        post_id: postId,
        owner_id: meId,
        other_id: postOwnerId,
      })
      .select("id, post_type, post_id, owner_id, other_id, created_at, last_message_at, last_message_text")
      .maybeSingle();

    if (ins.data?.id) return ins.data as Conversation;

    const q2 = await supabase
      .from("conversations")
      .select("id, post_type, post_id, owner_id, other_id, created_at, last_message_at, last_message_text")
      .eq("post_type", "demand")
      .eq("post_id", postId)
      .or(`and(owner_id.eq.${meId},other_id.eq.${postOwnerId}),and(owner_id.eq.${postOwnerId},other_id.eq.${meId})`)
      .maybeSingle();

    if (q2.data?.id) return q2.data as Conversation;

    throw new Error(ins.error?.message || q.error?.message || (lang === "zh" ? "创建/获取会话失败" : "Failed to create/get conversation"));
  }

  async function startChat() {
    setStatus("");
    if (!id) {
      setStatus(lang === "zh" ? "页面参数缺失（id）。请刷新后重试。" : "Missing page param (id). Please refresh.");
      return;
    }
    if (!item) return;

    const { data: u } = await supabase.auth.getUser();
    const user = u.user;

    if (!user || !user.email || (user as any).is_anonymous) {
      setStatus(lang === "zh" ? "请使用邮箱登录后发起聊天（匿名仅可浏览）。" : "Please sign in with email to start chat.");
      return;
    }
    if (user.id === item.owner_id) {
      setStatus(lang === "zh" ? "不能和自己发起聊天。" : "You cannot chat with yourself.");
      return;
    }

    setStartingChat(true);
    try {
      const conv = await getOrCreateConversation(item.id, item.owner_id, user.id);
      if (!conv?.id) throw new Error(lang === "zh" ? "会话创建失败" : "Conversation creation failed");
      window.location.href = `/${lang}/me?tab=chat&conv=${conv.id}`;
    } catch (e: any) {
      setStatus((lang === "zh" ? "发起对话失败：" : "Failed to start chat: ") + (e?.message ?? "Unknown"));
    } finally {
      setStartingChat(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <a className="text-zinc-300 hover:text-white underline underline-offset-4" href={`/${lang}/demands`}>
            {lang === "zh" ? "← 返回需求大厅" : "← Back to demands"}
          </a>
          <a className="text-zinc-300 hover:text-white underline underline-offset-4" href={`/${lang}/me`}>
            {t.common.me}
          </a>
        </div>

        <div className="mt-6">
          <AuthBox lang={lang} />
          {!canUse && <div className="mt-3 text-sm text-amber-300">{t.demandsHall.form.needEmail}</div>}
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          {!item ? (
            <div className="text-zinc-400">{status || (lang === "zh" ? "找不到这条需求（可能已被删除或隐藏）。" : "Demand not found.")}</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="text-2xl font-bold">{item.title}</div>
                <div className="flex gap-2 items-center">
                  <div className="text-xs rounded-full border border-zinc-700 px-2 py-1 text-zinc-200">
                    {item.category || t.categories.other}
                  </div>
                  {item.status === "completed" && (
                    <div className="text-xs rounded-full border border-emerald-700 px-2 py-1 text-emerald-200">
                      {lang === "zh" ? "已完成 ✅" : "Completed ✅"}
                    </div>
                  )}
                </div>
              </div>

              {item.description && <div className="mt-3 text-zinc-300 whitespace-pre-wrap">{item.description}</div>}

              <div className="mt-4 text-sm text-zinc-500 flex gap-4 flex-wrap">
                <span>{new Date(item.created_at).toLocaleString()}</span>
                {item.budget != null && <span>{lang === "zh" ? "预算" : "Budget"} ¥ {item.budget}</span>}
              </div>

              <div className="mt-6">
                {contact ? (
                  <div className="text-zinc-200">
                    {lang === "zh" ? "联系方式：" : "Contact: "} <span className="font-semibold">{contact}</span>
                  </div>
                ) : (
                  <button
                    onClick={loadContact}
                    disabled={loadingContact}
                    className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-5 py-2 text-zinc-100 disabled:opacity-40"
                  >
                    {loadingContact ? (lang === "zh" ? "加载中..." : "Loading...") : (lang === "zh" ? "查看联系方式（邮箱登录后）" : "View contact (email login)")}
                  </button>
                )}
              </div>

              <div className="mt-4">
                <button
                  onClick={startChat}
                  disabled={startingChat}
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2"
                >
                  {startingChat ? (lang === "zh" ? "进入中..." : "Opening...") : (lang === "zh" ? "发起聊天 / 去对话框" : "Start chat")}
                </button>
                <div className="mt-2 text-xs text-zinc-500">
                  {lang === "zh" ? "会自动跳转到 /me 并打开对应会话。" : "Will redirect to /me and open the conversation."}
                </div>
              </div>
            </>
          )}

          {status && <div className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">{status}</div>}
        </div>
      </div>
    </main>
  );
}
