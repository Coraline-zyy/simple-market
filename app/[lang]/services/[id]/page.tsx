"use client";
import { formatTaskTime, TaskTime } from "@/lib/taskTime";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PostImageGallery from "@/app/components/PostImageGallery";
import ReportButton from "@/app/components/ReportButton";
import OwnerBadge from "@/app/components/OwnerBadge";
import AdminPinButton, { PinnedTag } from "@/app/components/AdminPin";
import { supabase } from "@/lib/supabaseClient";
import { getT, safeLang } from "@/lib/i18n";

type Service = TaskTime & {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  required_deposit: number;
  status?: "active" | "completed";
  created_at: string;
  image_paths?: string[];
  task_starts_at?: string | null;
  task_ends_at?: string | null;
  task_date_only?: boolean;
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

export default function ServiceDetailPage() {
  const params = useParams<{ lang: string; id: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);
  const id = params?.id;

  const [item, setItem] = useState<Service | null>(null);
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
    }).catch(() => setUserEmail(null));

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // load service
  useEffect(() => {
    if (!id) return;

    const run = async () => {
      setStatus("");
      setItem(null);

      const { data, error } = await supabase
        .from("services")
        .select("id, owner_id, title, description, category, price, required_deposit, status, created_at, image_paths, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone, pinned_at")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        setStatus((lang === "zh" ? "加载失败：" : "Load failed: ") + error.message);
        return;
      }

      const s = (data as Service) ?? null;
      setItem(s);

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
    const { data, error } = await supabase.from("service_contacts").select("contact").eq("service_id", id).maybeSingle();
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
    // 查找：同一个 service + 两人（无序）
    const q = await supabase
      .from("conversations")
      .select("id, post_type, post_id, owner_id, other_id, created_at, last_message_at, last_message_text")
      .eq("post_type", "service")
      .eq("post_id", postId)
      .or(`and(owner_id.eq.${meId},other_id.eq.${postOwnerId}),and(owner_id.eq.${postOwnerId},other_id.eq.${meId})`)
      .maybeSingle();

    if (q.data?.id) return q.data as Conversation;

    // 没有就创建（owner_id=我, other_id=对方）
    const ins = await supabase
      .from("conversations")
      .insert({
        post_type: "service",
        post_id: postId,
        owner_id: meId,
        other_id: postOwnerId,
      })
      .select("id, post_type, post_id, owner_id, other_id, created_at, last_message_at, last_message_text")
      .maybeSingle();

    if (ins.data?.id) return ins.data as Conversation;

    // 并发 unique 冲突：再查一次
    const q2 = await supabase
      .from("conversations")
      .select("id, post_type, post_id, owner_id, other_id, created_at, last_message_at, last_message_text")
      .eq("post_type", "service")
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
      window.location.href = `/${lang}/transactions/${conv.id}`;
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
          <a className="text-zinc-300 hover:text-white underline underline-offset-4" href={`/${lang}/services`}>
            {lang === "zh" ? "← 返回服务大厅" : "← Back to services"}
          </a>
          <a className="text-zinc-300 hover:text-white underline underline-offset-4" href={`/${lang}/me`}>
            {t.common.me}
          </a>
        </div>

        {!canUse && <div className="mt-3 text-sm text-amber-300">{t.servicesHall.needEmailToPublish}</div>}

        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          {!item ? (
            <div className="text-zinc-400">{status || (lang === "zh" ? "找不到这条服务（可能已被删除或隐藏）。" : "Service not found.")}</div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 empty:hidden"><PinnedTag pinnedAt={(item as any).pinned_at} lang={lang}/><AdminPinButton kind="service" id={item.id} pinnedAt={(item as any).pinned_at} lang={lang} onChanged={(value)=>setItem(prev=>prev?({...prev,pinned_at:value} as any):prev)}/></div>
              <OwnerBadge userId={item.owner_id} lang={lang} />
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

              <p className="mt-3 text-sm text-violet-300">{formatTaskTime(item, lang)}</p>
              <PostImageGallery paths={item.image_paths} />

              <div className="mt-4 text-sm text-zinc-500 flex gap-4 flex-wrap">
                <span>{new Date(item.created_at).toLocaleString()}</span>
                {item.price != null && <span>{lang === "zh" ? "价格" : "Price"} £{Number(item.price).toFixed(2)}</span>}
                <span className="text-amber-300">{lang==="zh"?"任务押金":"Task deposit"} £{Number(item.required_deposit??0).toFixed(2)}</span>
              </div>

              {/* chat */}
              <div className="mt-5 flex items-center gap-5 flex-wrap text-sm">
                <a href={`/${lang}/users/${item.owner_id}`} className="text-zinc-300 underline underline-offset-4 hover:text-white">
                  {lang === "zh" ? "查看发布者主页" : "View owner profile"}
                </a>
                <ReportButton reportedUserId={item.owner_id} postType="service" postId={item.id} />
              </div>

              <div className="mt-4">
                <button
                  onClick={startChat}
                  disabled={startingChat}
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2"
                >
                  {startingChat ? (lang === "zh" ? "进入中..." : "Opening...") : (lang === "zh" ? "发起聊天" : "Start chat")}
                </button>
              </div>
            </>
          )}

          {status && <div className="mt-4 text-sm text-zinc-300 whitespace-pre-wrap">{status}</div>}
        </div>
      </div>
    </main>
  );
}
