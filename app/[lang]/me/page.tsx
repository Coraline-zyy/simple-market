"use client";
import {depositPresentation} from "@/lib/depositRole";
import TaskTimeFields from "@/app/components/TaskTimeFields";
import { TaskTime, TimeRange, ANY_TIME, timePayload, formatTaskTime, rangeFromTask } from "@/lib/taskTime";
import WorkflowPanel from "@/app/components/WorkflowPanel";

import { useEffect, useMemo, useRef, useState } from "react";
import ProfileReviews from "@/app/components/ProfileReviews";
import { getT, safeLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useSearchParams } from "next/navigation";
import { useUserOnline } from "@/app/components/PresenceProvider";
import {AVATARS_BUCKET,publicStorageUrl} from "@/lib/media";
import PrivateChatPanel, { PrivateThreadInfo } from "@/app/components/PrivateChatPanel";
import { announceUnreadChanged, notifyNewMessage } from "@/lib/notify";

type InboxRow = { kind: "task" | "direct" | "admin"; thread_id: string; other_id: string; other_username: string | null; other_avatar_path: string | null; title: string | null; from_admin: boolean; last_message: string | null; last_message_at: string | null; unread: number };

type Service = TaskTime & {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  required_deposit: number;
  status: "active" | "completed";
  created_at: string;
};

type Demand = TaskTime & {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: number | null;
  required_deposit: number;
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
  other_username?:string|null;
  other_avatar_path?:string|null;
  task_title?:string|null;
  required_deposit?:number;
  task_owner_id?:string|null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Deal = {
  id: string;
  conversation_id: string;
  status: "confirming" | "done";
  owner_confirmed: boolean;
  other_confirmed: boolean;
  collaboration_owner_confirmed:boolean;
  collaboration_other_confirmed:boolean;
  completion_owner_confirmed:boolean;
  completion_other_confirmed:boolean;
  workflow_status:"chatting"|"pending"|"active"|"completion_pending"|"done"|"arbitration";
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
    ...r,
    id: r.id,
    owner_id: r.owner_id,
    title: r.title ?? "",
    description: r.description ?? null,
    category: r.category ?? "其他",
    price: r.price ?? null,
    required_deposit: Number(r.required_deposit??0),
    status: (r.status ?? "active") as any,
    created_at: r.created_at ?? new Date().toISOString(),
    task_starts_at: r.task_starts_at ?? null,
    task_ends_at: r.task_ends_at ?? null,
    task_date_only: !!r.task_date_only,
  };
}

function normDemand(r: any): Demand {
  return {
    ...r,
    id: r.id,
    owner_id: r.owner_id,
    title: r.title ?? "",
    description: r.description ?? null,
    category: r.category ?? "其他",
    budget: r.budget ?? null,
    required_deposit: Number(r.required_deposit??0),
    status: (r.status ?? "active") as any,
    created_at: r.created_at ?? new Date().toISOString(),
    task_starts_at: r.task_starts_at ?? null,
    task_ends_at: r.task_ends_at ?? null,
    task_date_only: !!r.task_date_only,
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
  const dmFromUrl = searchParams.get("dm"); // "direct:<id>" | "admin:<id>" | null

  const initialTab = (tabFromUrl === "chat" ? "chat" : "posts") as "posts" | "chat";
  const initialConv = convFromUrl;

  // auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAnon, setIsAnon] = useState<boolean>(false);

  const needEmail = !userEmail;

  // UI
  const [tab, setTab] = useState<"posts" | "chat" | "ongoing" | "settling" | "completed" | "arbitration">(initialTab);
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
  const [editTaskTime, setEditTaskTime] = useState<TimeRange>(ANY_TIME);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMoney, setEditMoney] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // conversations
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(dmFromUrl ? null : initialConv);
  // unified inbox (task chats + private messages + administrator messages)
  const [inbox, setInbox] = useState<InboxRow[] | null>(null);
  const [inboxError, setInboxError] = useState("");
  const [selectedDm, setSelectedDm] = useState<string | null>(dmFromUrl);

  // messages
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [adminSenders,setAdminSenders]=useState<string[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sendText, setSendText] = useState("");
  const [sending, setSending] = useState(false);
  const [guaranteeOpen,setGuaranteeOpen]=useState(false);
  const [guaranteeAmount,setGuaranteeAmount]=useState("");
  const [reviewOpen,setReviewOpen]=useState(false);
  const messagesEndRef=useRef<HTMLDivElement|null>(null);
  const selectedView = useRef({ id: selectedConvId, tab, dm: selectedDm });
  selectedView.current = { id: selectedConvId, tab, dm: selectedDm };
  const messageSequence = useRef(0);

  // deal & review
  const [deal, setDeal] = useState<Deal | null>(null);
  const [dealLoading, setDealLoading] = useState(false);

  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherBio, setOtherBio] = useState<string>("");
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);
  const [otherDealsCount, setOtherDealsCount] = useState<number>(0);
  const [otherReviews, setOtherReviews] = useState<Review[]>([]);

  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const otherOnline = useUserOnline(otherId);

  // ✅ sync UI state when URL changes（保留一个就够了，删掉重复的 useEffect）
  useEffect(() => {
    const nextTab = (tabFromUrl === "chat" ? "chat" : "posts") as "posts" | "chat";
    const nextConv = convFromUrl;

    setTab((prev) => (prev === nextTab ? prev : nextTab));
    if (dmFromUrl) { setSelectedDm(dmFromUrl); setSelectedConvId(null); }
    else { setSelectedDm(null); setSelectedConvId((prev) => (prev === nextConv ? prev : nextConv)); }
  }, [tabFromUrl, convFromUrl, dmFromUrl]);

  // auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);
      setIsAnon(!!(u as any)?.is_anonymous);
    }).catch(() => { setUserId(null); setUserEmail(null); setIsAnon(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);
      setIsAnon(!!(u as any)?.is_anonymous);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
        .select("id, owner_id, title, description, category, price, required_deposit, status, created_at, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
        .eq("owner_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("services")
        .select("id, owner_id, title, description, category, price, required_deposit, status, created_at, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
        .eq("owner_id", uid)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("demands")
        .select("id, owner_id, title, description, category, budget, required_deposit, status, created_at, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
        .eq("owner_id", uid)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("demands")
        .select("id, owner_id, title, description, category, budget, required_deposit, status, created_at, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
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

  async function deletePost(type: "service" | "demand", id: string) {
    setStatusMsg("");
    if (!userId || needEmail) {
      setStatusMsg(t.me.status.needEmail);
      return;
    }
    const adminCheck=await supabase.rpc("is_market_admin");
    const isAdmin=!adminCheck.error&&adminCheck.data===true;
    const ok = window.confirm(isAdmin
      ? (lang==="zh"?"确定永久删除这条发布？如果有关联聊天、成交或仲裁记录，也会一并删除且无法恢复。":"Permanently delete this post? Related chats, deals and court records will also be deleted and cannot be recovered.")
      : (type === "service" ? t.me.deleteConfirmService : t.me.deleteConfirmDemand));
    if (!ok) return;
    if(isAdmin){
      const result=await supabase.rpc("admin_permanently_delete_content",{p_kind:type,p_id:id,p_reason:"Platform owner deleted own post",p_confirmation:"PERMANENT DELETE"});
      if(result.error){setStatusMsg((lang==="zh"?"删除失败：":"Delete failed: ")+result.error.message);return}
      setEditOpen(false);setStatusMsg(t.me.status.deleted);await loadMyPosts(userId);return;
    }
    const table = type === "service" ? "services" : "demands";
    const { error } = await supabase.from(table).delete().eq("id", id).eq("owner_id", userId);
    if (error) {
      setStatusMsg((lang === "zh" ? "删除失败：" : "Delete failed: ") + error.message);
      return;
    }
    setStatusMsg(t.me.status.deleted);
    await loadMyPosts(userId);
  }

  async function deleteEditedPost() {
    const type=editType,id=editId;
    await deletePost(type,id);
  }

  function openEdit(type: "service" | "demand", item: Service | Demand) {
    setEditTaskTime(rangeFromTask(item));
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

    let timing;
    try { timing = timePayload(editTaskTime); } catch { setStatusMsg(lang === "zh" ? "请填写有效的起止时间。" : "Enter a valid time range."); return; }
    setEditSaving(true);

    if (editType === "service") {
      const { error } = await supabase
        .from("services")
        .update({
          ...timing,
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
          ...timing,
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
    const rows=(data as Conversation[])??[],otherIds=[...new Set(rows.map(c=>c.owner_id===uid?c.other_id:c.owner_id))],serviceIds=rows.filter(c=>c.post_type==="service").map(c=>c.post_id),demandIds=rows.filter(c=>c.post_type==="demand").map(c=>c.post_id);
    const [profiles,services,demands]=await Promise.all([otherIds.length?supabase.from("profiles").select("id,username,avatar_path").in("id",otherIds):Promise.resolve({data:[]}),serviceIds.length?supabase.from("services").select("id,owner_id,title,required_deposit").in("id",serviceIds):Promise.resolve({data:[]}),demandIds.length?supabase.from("demands").select("id,owner_id,title,required_deposit").in("id",demandIds):Promise.resolve({data:[]})]);
    const profileMap=new Map((profiles.data??[]).map((p:any)=>[p.id,p])),taskMap=new Map([...(services.data??[]),...(demands.data??[])].map((p:any)=>[p.id,p]));
    setConvs(rows.map(c=>{const p:any=profileMap.get(c.owner_id===uid?c.other_id:c.owner_id),task:any=taskMap.get(c.post_id);return {...c,other_username:p?.username??null,other_avatar_path:p?.avatar_path??null,task_title:task?.title??null,task_owner_id:task?.owner_id??null,required_deposit:Number(task?.required_deposit??0)}}));
  }

  async function loadInbox() {
    const { data, error } = await supabase.rpc("get_my_chat_inbox");
    if (error) { setInbox(null); setInboxError(lang==="zh"?"聊天加载失败。请确认已执行本次 SQL，并检查连接。":"Chats could not load. Check the connection and install this update’s SQL."); return; }
    setInboxError("");
    const rows = ((data ?? []) as any[]).map((r) => ({ ...r, unread: Number(r.unread ?? 0) })) as InboxRow[];
    rows.sort((a, b) => new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime());
    setInbox(rows);
  }

  async function loadMessages(conversationId: string) {
    const request = ++messageSequence.current;
    const initial = selectedView.current.id !== conversationId || !msgs.length;
    if (initial) setMsgLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, read_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .limit(500);
    if (request !== messageSequence.current || selectedView.current.id !== conversationId) return;
    setMsgLoading(false);

    if (error) {
      setStatusMsg(t.me.status.openConvFail);
      return;
    }
    const loaded=((data as any[])??[]).reverse();setMsgs(loaded);
    const senders=[...new Set(loaded.map(message=>message.sender_id))] as string[];
    const checks=await Promise.all(senders.map(async sender=>({sender,result:await supabase.rpc("is_market_admin_user",{p_user:sender})})));
    if (request !== messageSequence.current || selectedView.current.id !== conversationId) return;
    setAdminSenders(checks.filter(check=>!check.result.error&&check.result.data===true).map(check=>check.sender));
    if (document.visibilityState !== "visible" || selectedView.current.tab !== "chat" || selectedView.current.dm) return;
    await supabase.rpc("mark_loaded_chat_read", { p_kind: "task", p_thread: conversationId, p_ids: loaded.map(m => m.id) });
    announceUnreadChanged();
    void loadInbox();
  }

  async function loadDealAndSideInfo(conversationId: string, uid: string) {
    setDealLoading(true);

    const d = await supabase
      .from("deals")
      .select("id, conversation_id, status, owner_confirmed, other_confirmed, collaboration_owner_confirmed, collaboration_other_confirmed, completion_owner_confirmed, completion_other_confirmed, workflow_status, updated_at")
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
      const p = await supabase.from("profiles").select("bio, last_seen_at").eq("id", oid).maybeSingle();
      setOtherBio((p.data?.bio as string) ?? "");
      setOtherLastSeen((p.data?.last_seen_at as string) ?? null);

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
      setOtherLastSeen(null);
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
      const completion=deal?.workflow_status==="active"||deal?.workflow_status==="completion_pending";
      const result=completion?await supabase.rpc("confirm_completion",{p_deal_id:deal!.id}):await supabase.rpc("confirm_collaboration",{p_conversation_id:selectedConvId});
      if(result.error)throw result.error;
      await loadDealAndSideInfo(selectedConvId,userId);
      await loadMyPosts(userId);
      setStatusMsg(completion?(lang==="zh"?"完成确认已提交，等待双方确认。":"Completion confirmation submitted."):(lang==="zh"?"合作意向已提交，等待双方确认。":"Collaboration intent submitted."));
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
    const { data: sentRow, error } = await supabase.from("messages").insert({
      conversation_id: selectedConvId,
      sender_id: userId,
      content: text,
    }).select("id").single();

    setSending(false);

    if (error) {
      setStatusMsg(t.me.status.sendFail + error.message);
      return;
    }
    notifyNewMessage("task", sentRow?.id);
    setSendText("");
    await loadMessages(selectedConvId);
  }

  async function sendGuaranteeEvent(content:string){
    if(!userId||!selectedConvId||sending)return;
    if(content.startsWith("[[GUARANTEE_REQUEST")){
      const amount=Number(guaranteeAmount);
      const request=await supabase.rpc("request_guarantee",{p_conversation:selectedConvId,p_amount:amount});
      if(request.error){setStatusMsg(request.error.message);return}
    }
    setSending(true);const {data:sentRow,error}=await supabase.from("messages").insert({conversation_id:selectedConvId,sender_id:userId,content}).select("id").single();setSending(false);
    if(error){setStatusMsg(error.message);return}notifyNewMessage("task",sentRow?.id);setGuaranteeOpen(false);await loadMessages(selectedConvId);
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
    setReviewOpen(false);
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
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---------- keep the unified inbox (and unread numbers) fresh ----------
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => void loadInbox(), 8000);
    const refresh = () => void loadInbox();
    window.addEventListener("youqiu:unread-changed", refresh);
    const ch = supabase
      .channel("rt_inbox_me")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, refresh)
      .subscribe();
    return () => { clearInterval(timer); window.removeEventListener("youqiu:unread-changed", refresh); supabase.removeChannel(ch); };
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

  useEffect(() => {
    if (!selectedConvId || tab !== "chat" || selectedDm) return;
    const refresh = () => { if (document.visibilityState === "visible") void loadMessages(selectedConvId); };
    refresh(); const timer = setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [selectedConvId, userId, tab, selectedDm]);

  // ✅ realtime messages（随 selectedConvId 变化重新订阅）
  useEffect(() => {
    if (!selectedConvId) return;

    const ch = supabase
      .channel(`rt_messages_${selectedConvId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as any;
        if (m?.conversation_id !== selectedConvId) return;

        setMsgs((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev.map(x=>x.id===m.id?m as Message:x);
          return [...prev, m as Message];
        });
        if(m.sender_id!==userId && document.visibilityState==="visible" && selectedView.current.tab==="chat" && !selectedView.current.dm) void supabase.rpc("mark_loaded_chat_read",{p_kind:"task",p_thread:selectedConvId,p_ids:[m.id]}).then(()=>{announceUnreadChanged();void loadInbox()});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedConvId]);

  useEffect(()=>{messagesEndRef.current?.scrollIntoView({block:"end"})},[msgs.at(-1)?.id,selectedConvId]);
  useEffect(()=>{if(deal?.workflow_status==="done"&&!myReview)setReviewOpen(true)},[deal?.workflow_status,myReview,selectedConvId]);

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

  const canFull = !!userId && !needEmail && !isAnon;
  const selectedConversation=convs.find(c=>c.id===selectedConvId),selectedAvatar=publicStorageUrl(AVATARS_BUCKET,selectedConversation?.other_avatar_path),selectedName=selectedConversation?.other_username||(lang==="zh"?"未设置ID":"No ID"),averageRating=otherReviews.length?otherReviews.reduce((sum,r)=>sum+r.rating,0)/otherReviews.length:null;
  const depositView=depositPresentation(userId,selectedConversation?.task_owner_id,selectedConversation?.required_deposit,lang);
  const selectedWorkflow=deal?.workflow_status??"chatting",selectedIsOwner=!!(selectedConversation&&userId&&selectedConversation.owner_id===userId),myCollaborationConfirmed=!!deal&&(selectedIsOwner?deal.collaboration_owner_confirmed:deal.collaboration_other_confirmed),myCompletionConfirmed=!!deal&&(selectedIsOwner?deal.completion_owner_confirmed:deal.completion_other_confirmed),selectedFinished=selectedWorkflow==="done",selectedLocked=selectedWorkflow==="arbitration";
  const workflowLabel=lang==="zh"
    ? selectedWorkflow==="pending"?(myCollaborationConfirmed?"聊天 · 等待对方确认":"聊天 · 对方已确认")
      :selectedWorkflow==="completion_pending"?(myCompletionConfirmed?"正在进行中 · 等待对方确认":"正在进行中 · 对方已确认")
      :({chatting:"聊天",active:"正在进行中",done:"已完成",arbitration:"仲裁中"} as Record<string,string>)[selectedWorkflow]
    : selectedWorkflow==="pending"?(myCollaborationConfirmed?"Chatting · Waiting for the other party":"Chatting · The other party has confirmed")
      :selectedWorkflow==="completion_pending"?(myCompletionConfirmed?"In progress · Waiting for the other party":"In progress · The other party has confirmed")
      :({chatting:"Chatting",active:"In progress",done:"Completed",arbitration:"In arbitration"} as Record<string,string>)[selectedWorkflow];
  const collaborationButtonLabel=selectedFinished?(lang==="zh"?"已完成":"Completed"):selectedLocked?(lang==="zh"?"仲裁中":"In arbitration"):(selectedWorkflow==="active"||selectedWorkflow==="completion_pending")?(myCompletionConfirmed?(lang==="zh"?"等待对方确认完成":"Waiting for completion confirmation"):(lang==="zh"?"确认完成":"Confirm completion")):(myCollaborationConfirmed?(lang==="zh"?"等待对方接受":"Waiting for acceptance"):(selectedWorkflow==="pending"?(lang==="zh"?"接受合作意向":"Accept collaboration intent"):(lang==="zh"?"发起合作意向":"Propose collaboration")));
  const collaborationButtonDisabled=!canFull||dealLoading||selectedFinished||selectedLocked||((selectedWorkflow==="active"||selectedWorkflow==="completion_pending")?myCompletionConfirmed:myCollaborationConfirmed);

  const guaranteeEvents=msgs.filter(m=>m.content.startsWith("[[GUARANTEE_"));
  const latestGuarantee=guaranteeEvents[guaranteeEvents.length-1];
  const guaranteed=latestGuarantee?.content==="[[GUARANTEE_ACCEPT]]";
  const incomingGuarantee=latestGuarantee?.content.startsWith("[[GUARANTEE_REQUEST")===true&&latestGuarantee.sender_id!==userId;
  const guaranteeText=(content:string)=>content.startsWith("[[GUARANTEE_REQUEST")?(lang==="zh"?`对方已发起担保协调服务${content.includes(":")?`，金额 £${content.slice(content.indexOf(":")+1,-2)}`:""}，是否接受？`:`The other party requested guarantee coordination${content.includes(":")?` for £${content.slice(content.indexOf(":")+1,-2)}`:""}. Do you accept?`):content==="[[GUARANTEE_ACCEPT]]"?(lang==="zh"?"双方已接受担保协调服务。":"Both parties accepted guarantee coordination."):content==="[[GUARANTEE_REJECT]]"?(lang==="zh"?"对方已拒绝担保协调服务。":"The other party declined guarantee coordination."):content;
  const unreadTotal=(inbox??[]).reduce((sum,row)=>sum+row.unread,0);
  const selectedDmKind=selectedDm?.split(":")[0],selectedDmId=selectedDm?.split(":")[1];
  const selectedDmRow=inbox?.find(row=>row.kind===selectedDmKind&&row.thread_id===selectedDmId)??null;
  const selectedPrivate:PrivateThreadInfo|null=selectedDmRow&&(selectedDmRow.kind==="direct"||selectedDmRow.kind==="admin")?{kind:selectedDmRow.kind,threadId:selectedDmRow.thread_id,otherId:selectedDmRow.other_id,otherUsername:selectedDmRow.other_username,otherAvatarPath:selectedDmRow.other_avatar_path,fromAdmin:selectedDmRow.from_admin}:null;
  const openTask=(id:string)=>{setSelectedDm(null);setSelectedConvId(id)};
  const openPrivate=(row:InboxRow)=>{setSelectedConvId(null);setSelectedDm(`${row.kind}:${row.thread_id}`)};
  const previewText=(content:string|null)=>!content?(lang==="zh"?"暂无消息":"No messages yet"):content.startsWith("[[GUARANTEE_")?(lang==="zh"?"担保协调消息":"Guarantee update"):content;
  const isAdminMessage=(message:Message)=>adminSenders.includes(message.sender_id);
  return (
    <main className="min-h-screen bg-[#080a12] text-zinc-100 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t.me.title}</h1>
          </div>
        </div>

        {needEmail && <div className="mt-4 text-sm text-amber-300">{t.me.needEmailTip}</div>}

        <div className="mt-8 flex flex-wrap gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
          <button
            className={`rounded-xl px-4 py-2 text-sm border ${
              tab === "posts" ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
            }`}
            onClick={() => setTab("posts")}
          >
            {lang === "zh" ? "您的发布" : "Your posts"}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm border ${
              tab === "chat" ? "border-zinc-500" : "border-zinc-800 hover:border-zinc-700"
            }`}
            onClick={() => setTab("chat")}
          >
            {lang === "zh" ? "聊天" : "Chats"}
            {unreadTotal > 0 && <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold leading-5 text-white">{unreadTotal > 99 ? "99+" : unreadTotal}</span>}
          </button>
          {[
            [lang === "zh" ? "正在进行" : "In progress", "ongoing"],
            [lang === "zh" ? "结算中" : "Settling", "settling"],
            [lang === "zh" ? "已完成" : "Completed", "completed"],
            [lang === "zh" ? "仲裁中" : "Arbitration", "arbitration"],
          ].map(([label, status]) => <button key={status} onClick={() => setTab(status as "ongoing" | "settling" | "completed" | "arbitration")} className={`rounded-xl border px-4 py-2 text-sm hover:border-zinc-600 hover:text-white ${tab===status?"border-violet-400 bg-violet-500/15 text-violet-200":"border-zinc-800 text-zinc-300"}`}>{label}</button>)}
        </div>

        {statusMsg && (
          <div className="mt-4 text-sm text-zinc-200 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            {statusMsg}
          </div>
        )}

        {tab==="chat" && inboxError && <p role="alert" className="mt-4 text-sm text-rose-300">{inboxError}</p>}

        {/* ---------------- POSTS TAB ---------------- */}
        {tab === "posts" && <div className="mt-6 grid gap-6 md:grid-cols-2">
          {(["demand","service"] as const).map(kind=>{
            const records=kind==="service"?myServicesActive:myDemandsActive;
            return <section key={kind} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{kind==="service"?t.me.myServices:t.me.myDemands}（{records.length}）</h2><button onClick={()=>userId&&loadMyPosts(userId)} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm">{t.common.refresh}</button></div>
              <div className="mt-4 space-y-3">{records.length?records.map(row=><div key={row.id} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4"><h3 className="font-semibold">{row.title}</h3><p className="mt-2 text-sm text-violet-300">{formatTaskTime(row,lang)}</p><p className="mt-1 text-xs text-zinc-500">{row.category}</p><div className="mt-3 flex gap-3 text-sm"><a href={`/${lang}/${kind==="service"?"services":"demands"}/${row.id}`} className="underline">{t.common.details}</a>{tab==="posts"&&<><button className="underline" onClick={()=>openEdit(kind,row)}>{t.common.edit}</button><button className="text-rose-300 underline" onClick={()=>deletePost(kind,row.id)}>{lang==="zh"?"删除":"Delete"}</button></>}</div></div>):<p className="text-sm text-zinc-400">{lang==="zh"?"暂无发布。":"No posts."}</p>}</div>
            </section>
          })}
        </div>}
        {["ongoing","settling","completed","arbitration"].includes(tab)&&<WorkflowPanel userId={userId} lang={lang} mode={tab}/>}

        {/* ---------------- CHAT TAB ---------------- */}
        {tab === "chat" && (
          <div className="mt-6 grid lg:grid-cols-[320px_1fr] gap-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t.me.chats.listTitle}</div>
                <button
                  className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-sm"
                  onClick={() => { if (userId) { loadConversations(userId); void loadInbox(); } }}
                  disabled={!userId}
                >
                  {t.common.refresh}
                </button>
              </div>

              <div className="mt-3 text-xs text-zinc-500">{t.me.chats.selectTip}</div>

              {inbox ? (
                inbox.length === 0 ? (
                  <div className="mt-4 text-sm text-zinc-400">{t.me.chats.none}</div>
                ) : (
                  <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
                    {inbox.map((row) => {
                      const avatar = publicStorageUrl(AVATARS_BUCKET, row.other_avatar_path), name = row.other_username || (lang === "zh" ? "未设置ID" : "No ID");
                      const active = row.kind === "task" ? (!selectedDm && selectedConvId === row.thread_id) : selectedDm === `${row.kind}:${row.thread_id}`;
                      const label = row.kind === "task" ? (row.title || (lang === "zh" ? "任务" : "Task")) : row.from_admin ? (lang === "zh" ? "管理员私聊" : "Administrator") : row.kind === "admin" ? (lang === "zh" ? "管理员 → 用户" : "Admin → user") : (lang === "zh" ? "私聊" : "Private message");
                      return (
                        <button type="button" key={`${row.kind}:${row.thread_id}`} onClick={() => row.kind === "task" ? openTask(row.thread_id) : openPrivate(row)} className={`w-full rounded-xl border px-3 py-3 text-left ${active ? "border-zinc-500 bg-zinc-950/40" : "border-zinc-800 bg-zinc-950/20"}`}>
                          <div className="flex items-center gap-3">
                            <span className="relative shrink-0">
                              {avatar ? <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-sm text-violet-300">{name[0]?.toUpperCase()}</span>}
                              {row.unread > 0 && <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-5 text-white">{row.unread > 99 ? "99+" : row.unread}</span>}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2"><span className={`truncate text-sm font-semibold ${row.from_admin ? "text-rose-300" : ""}`}>@{name}</span>{row.last_message_at && <span className="ml-auto shrink-0 text-[10px] text-zinc-500">{new Date(row.last_message_at).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-GB")}</span>}</div>
                              <div className={`mt-0.5 truncate text-xs ${row.kind === "task" ? "text-violet-300" : row.from_admin ? "text-rose-300/80" : "text-emerald-300/80"}`}>{label}</div>
                              <div className={`mt-0.5 truncate text-xs ${row.unread > 0 ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>{previewText(row.last_message)}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : convLoading ? (
                <div className="mt-4 text-sm text-zinc-400">{t.common.loading}</div>
              ) : convs.length === 0 ? (
                <div className="mt-4 text-sm text-zinc-400">{t.me.chats.none}</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {convs.map((c) => {const avatar=publicStorageUrl(AVATARS_BUCKET,c.other_avatar_path),name=c.other_username||(lang==="zh"?"未设置ID":"No ID");return (
                    <button type="button" key={c.id} onClick={() => openTask(c.id)} className={`w-full rounded-xl border px-3 py-3 text-left ${selectedConvId === c.id ? "border-zinc-500 bg-zinc-950/40" : "border-zinc-800 bg-zinc-950/20"}`}>
                      <div className="flex items-center gap-3">{avatar?<img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover"/>:<span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-sm text-violet-300">{name[0]?.toUpperCase()}</span>}<div className="min-w-0"><div className="truncate text-sm font-semibold">@{name}</div><div className="mt-1 truncate text-sm text-zinc-300">{c.task_title||(lang==="zh"?"任务":"Task")}</div></div></div>
                    </button>
                  )})}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              {selectedDm ? (
                selectedPrivate && userId ? <PrivateChatPanel key={selectedDm} lang={lang} uid={userId} thread={selectedPrivate} /> : <div className="text-zinc-400">{inbox ? (lang === "zh" ? "找不到这个对话。" : "Conversation not found.") : t.common.loading}</div>
              ) : !selectedConvId ? (
                <div className="text-zinc-400">{t.me.chats.selectTip}</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4"><div className="grid gap-4 lg:grid-cols-[minmax(180px,.8fr)_minmax(180px,1fr)_auto] lg:items-center"><a href={otherId?`/${lang}/users/${otherId}`:"#"} className="flex min-w-0 items-center gap-3">{selectedAvatar?<img src={selectedAvatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover"/>:<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">{selectedName[0]?.toUpperCase()}</span>}<div className="min-w-0"><div className="truncate font-bold">@{selectedName}</div><div className="mt-1 flex items-center gap-2 text-xs"><span className="text-amber-400">★ {averageRating===null?"—":averageRating.toFixed(1)}</span><span className={otherOnline?"text-emerald-400":"text-zinc-500"}>{otherOnline?(lang==="zh"?"在线":"Online"):(lang==="zh"?"离线":"Offline")}</span></div></div></a><div className="min-w-0"><div className="text-xs text-zinc-500">{lang==="zh"?"任务详情":"Task"}</div><div className="mt-1 truncate text-lg font-bold">{selectedConversation?.task_title||(lang==="zh"?"任务":"Task")}</div><div className="mt-1 text-sm font-medium text-amber-300">{lang==="zh"?"当前任务押金：":"Current deposit: "}£{Number(selectedConversation?.required_deposit??0).toFixed(2)}</div></div><div className="grid gap-2 sm:grid-cols-3 lg:w-[420px]"><div><button className="w-full rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold disabled:opacity-40" onClick={confirmDeal} disabled={collaborationButtonDisabled}>{collaborationButtonLabel}</button><p className="mt-1 text-center text-[11px] text-zinc-500">{lang==="zh"?`当前状态：${workflowLabel}`:`Status: ${workflowLabel}`}</p></div><div><button type="button" disabled={!canFull||sending} onClick={()=>setGuaranteeOpen(true)} className="w-full rounded-lg border border-violet-400/40 px-3 py-2 text-xs text-violet-300 disabled:opacity-40">{lang==="zh"?"需要担保":"Request guarantee"}</button><p className={`mt-1 text-center text-[11px] ${guaranteed?"text-emerald-400":"text-zinc-500"}`}>{lang==="zh"?`当前状态：${guaranteed?"已担保":"未担保"}`:`Status: ${guaranteed?"Guaranteed":"Not guaranteed"}`}</p></div><div><button type="button" disabled className="w-full rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-300 disabled:opacity-80">{depositView.label}</button><p className="mt-1 text-center text-[11px] text-zinc-500">{depositView.status}</p></div></div></div></div>

                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-7 text-zinc-300">
                    {lang==="zh"?"平台支付与资金托管功能尚未开通。如需押金或预付款保障，请点击“需要担保”联系管理员协调。经双方明确同意并核实收款信息后，可按管理员提供的方式暂存款项；待双方确认交易完成且无争议，并通知管理员后，再由管理员转付相应款项，押金按约定原路退回。请勿向未经确认的账户转账，并保留完整的沟通与付款凭证。":"The platform’s payment and safeguarded-funds features are not yet available. If you need protection for a deposit or advance payment, select “Request guarantee” to ask an administrator to coordinate. Once both parties have expressly agreed and the payment details have been verified, funds may be held using the method confirmed by the administrator. After both parties confirm that the transaction is complete and undisputed, and notify the administrator, the relevant payment will be released and any deposit returned to its original source as agreed. Do not transfer money to an unverified account, and keep complete communication and payment records."}
                  </div>

                  {/* messages */}
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="flex items-center justify-between">
                      <div><div className="text-lg font-semibold">{t.me.chats.messagesTitle}</div>{otherId&&<div className={`mt-1 text-xs ${otherOnline?"text-emerald-400":"text-zinc-500"}`}>{otherOnline?(lang==="zh"?"对方在线":"Online"):(otherLastSeen?(lang==="zh"?`上次上线：${new Date(otherLastSeen).toLocaleString()}`:`Last seen: ${new Date(otherLastSeen).toLocaleString()}`):(lang==="zh"?"对方离线":"Offline"))}</div>}</div>
                      <button className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-3 py-2 text-sm" onClick={() => selectedConvId && loadMessages(selectedConvId)}>{t.common.refresh}</button>
                    </div>

                    {msgLoading ? (
                      <div className="mt-4 text-sm text-zinc-400">{t.common.loading}</div>
                    ) : (
                      <div className="mt-4 h-[400px] space-y-3 overflow-y-auto rounded-xl bg-black/10 p-3 pr-2">
                        {msgs.map((m) => (
                          <div
                            key={m.id}
                            className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${isAdminMessage(m)?"rounded-bl-md border border-rose-500/50 bg-rose-950/60 text-rose-50":m.sender_id === userId ? "rounded-br-md bg-violet-500 text-white" : "rounded-bl-md border border-zinc-800 bg-[#1b1e2d] text-zinc-200"}`}>
                              {isAdminMessage(m)&&<div className="mb-1 text-xs font-bold text-rose-400">{lang==="zh"?"管理员":"Administrator"}</div>}
                              <div className="whitespace-pre-wrap break-words text-sm leading-6">{guaranteeText(m.content)}</div>
                              {incomingGuarantee&&m.id===latestGuarantee?.id&&<div className="mt-3 flex gap-2"><button disabled={sending} onClick={()=>sendGuaranteeEvent("[[GUARANTEE_ACCEPT]]")} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black">{lang==="zh"?"接受":"Accept"}</button><button disabled={sending} onClick={()=>sendGuaranteeEvent("[[GUARANTEE_REJECT]]")} className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs">{lang==="zh"?"拒绝":"Decline"}</button></div>}
                              <div className={`mt-1 text-[11px] ${m.sender_id===userId?"text-violet-100/70":"text-zinc-500"}`}>{new Date(m.created_at).toLocaleString()}{m.sender_id===userId?` · ${m.read_at?(lang==="zh"?"已读":"Read"):(lang==="zh"?"未读":"Unread")}`:""}</div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef}/>
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

        {guaranteeOpen&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4" onMouseDown={e=>e.target===e.currentTarget&&setGuaranteeOpen(false)}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#11131e] p-6"><h2 className="text-xl font-bold">{lang==="zh"?"设置担保金额":"Set guarantee amount"}</h2><div className="mt-3 inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{lang==="zh"?"页面预览 · 资金托管未开通":"Page preview · Funds are not held by the platform"}</div><p className="mt-4 text-sm leading-7 text-zinc-300">{lang==="zh"?"平台支付与资金托管功能尚未开通。如需押金或预付款保障，请提交担保请求联系管理员协调。经双方明确同意并核实收款信息后，可按管理员确认的方式暂存款项；待双方确认交易完成且无争议，并通知管理员后，再转付相应款项，押金按约定原路退回。请勿向未经确认的账户转账，并保留完整的沟通与付款凭证。":"Platform payment and safeguarded-funds features are not yet available. If you need protection for a deposit or advance payment, submit a guarantee request for administrator coordination. Once both parties expressly agree and payment details are verified, funds may be held using the method confirmed by the administrator. After both parties confirm completion without dispute and notify the administrator, the relevant payment will be released and any deposit returned to its original source as agreed. Do not transfer money to an unverified account, and keep complete communication and payment records."}</p><input value={guaranteeAmount} onChange={e=>setGuaranteeAmount(e.target.value)} type="number" min="0" step="0.01" placeholder={lang==="zh"?"担保金额（GBP）":"Guarantee amount (GBP)"} className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 p-3"/><div className="mt-5 flex gap-3"><button disabled={sending||!/^\d+(\.\d{1,2})?$/.test(guaranteeAmount)||Number(guaranteeAmount)<=0} onClick={()=>sendGuaranteeEvent(`[[GUARANTEE_REQUEST:${Number(guaranteeAmount).toFixed(2)}]]`)} className="rounded-xl bg-violet-500 px-5 py-2.5 font-semibold disabled:opacity-40">{lang==="zh"?"确认发起":"Confirm request"}</button><button onClick={()=>setGuaranteeOpen(false)} className="rounded-xl border border-white/10 px-5 py-2.5">{lang==="zh"?"取消":"Cancel"}</button></div></section></div>}

        {reviewOpen&&!myReview&&<div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4"><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11131e] p-6"><h2 className="text-xl font-bold">{lang==="zh"?"交易已完成，请评价对方":"Transaction complete — review the other party"}</h2><p className="mt-2 text-sm text-zinc-400">{lang==="zh"?"你的评价会显示在对方的公开资料中。":"Your review will appear on the other person’s public profile."}</p><label className="mt-5 block text-sm text-zinc-300">{lang==="zh"?"评分":"Rating"}<select value={rating} onChange={e=>setRating(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ★</option>)}</select></label><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder={lang==="zh"?"写下你的评价（可选）":"Write a review (optional)"} className="mt-4 min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"/><div className="mt-5 flex gap-3"><button disabled={!canFull||reviewSubmitting} onClick={submitReview} className="rounded-xl bg-violet-500 px-5 py-2.5 font-semibold disabled:opacity-40">{reviewSubmitting?(lang==="zh"?"提交中…":"Submitting…"):(lang==="zh"?"提交评价":"Submit review")}</button><button onClick={()=>setReviewOpen(false)} className="rounded-xl border border-white/10 px-5 py-2.5">{lang==="zh"?"稍后评价":"Later"}</button></div></section></div>}

        {/* ---------------- EDIT MODAL ---------------- */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 sm:py-10" onMouseDown={e=>e.target===e.currentTarget&&setEditOpen(false)}>
            <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:max-h-[calc(100vh-5rem)]">
              <div className="overflow-y-auto p-5 pb-3">
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

              <div className="mt-4"><TaskTimeFields value={editTaskTime} onChange={setEditTaskTime} lang={lang}/></div>
              </div>
              <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-zinc-800 bg-zinc-950 p-4">
                <button className="mr-auto rounded-xl border border-rose-500/40 px-4 py-2 text-rose-300 hover:bg-rose-500/10" onClick={deleteEditedPost} disabled={editSaving}>
                  {lang==="zh"?"删除这条发布":"Delete this post"}
                </button>
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
