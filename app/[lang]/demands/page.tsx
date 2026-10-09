// app/[lang]/demands/page.tsx
"use client";
import {DepositDraft} from "@/app/components/PaymentPreview";

import { useEffect, useMemo, useRef, useState } from "react";
import PostImageGallery from "@/app/components/PostImageGallery";
import { MAX_POST_IMAGES, uploadPostImages } from "@/lib/media";
import { supabase } from "@/lib/supabaseClient";
import { ALL_VALUE, getT, safeLang } from "@/lib/i18n";
import { useParams } from "next/navigation";
import OwnerBadge from "@/app/components/OwnerBadge";
import AdminPinButton, { PinnedTag, pinnedFirst } from "@/app/components/AdminPin";
import TaskTimeFields from "@/app/components/TaskTimeFields";
import { ANY_TIME, TimeRange, timePayload, overlapsTime, formatTaskTime } from "@/lib/taskTime";

type Demand = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: number | null;
  required_deposit: number;
  status: "active" | "completed";
  created_at: string;
  image_paths: string[];
  task_starts_at: string | null;
  task_ends_at: string | null;
  task_date_only: boolean;
  pinned_at?: string | null;
};

function normalizeDemand(row: any): Demand {
  return {
    ...row,
    id: row.id,
    owner_id: row.owner_id,
    title: row.title ?? "",
    description: row.description ?? null,
    category: row.category ?? "其他",
    budget: row.budget ?? null,
    required_deposit: Number(row.required_deposit ?? 0),
    status: row.status ?? "active",
    created_at: row.created_at ?? new Date().toISOString(),
    image_paths: Array.isArray(row.image_paths) ? row.image_paths : [],
    task_starts_at: row.task_starts_at ?? null,
    task_ends_at: row.task_ends_at ?? null,
    task_date_only: !!row.task_date_only,
  };
}

export default function DemandsPage() {
  const params = useParams<{ lang: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);

  // 分类保持与数据库一致（你库里大概率存中文）
  const CATEGORIES = t.categories.items as readonly string[];

  const [items, setItems] = useState<Demand[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // publish form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(t.categories.other);
  const [budget, setBudget] = useState("");
  const [requiredDeposit,setRequiredDeposit]=useState("0");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [showPublish, setShowPublish] = useState(false);

  // auth
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const canUseEmail = !!userEmail;

  // search/filter
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>(ALL_VALUE);
  const [timeRange, setTimeRange] = useState<TimeRange>(ANY_TIME);
  const [taskTime, setTaskTime] = useState<TimeRange>(ANY_TIME);

  // contacts cache (email only can view)
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [contactLoading, setContactLoading] = useState<Record<string, boolean>>({});

  const rtDemandsReadyRef = useRef(false);
  const rtContactsReadyRef = useRef(false);

  // 语言切换时，保证默认 category 合法
  useEffect(() => {
    if (!CATEGORIES.includes(category as any)) setCategory(t.categories.other);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUserEmail(u?.email ?? null);
    }).catch(() => setUserEmail(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!canUseEmail) {
      setContacts({});
      setContactLoading({});
    }
  }, [canUseEmail]);

  async function load() {
    setStatusMsg("");
    const { data, error } = await supabase
      .from("demands")
      .select("id, owner_id, title, description, category, budget, required_deposit, status, created_at, image_paths, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone, pinned_at")
      .eq("status", "active")
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatusMsg((lang === "zh" ? "读取失败：" : "Load failed: ") + error.message);
      return;
    }
    setItems(((data as any[]) ?? []).map(normalizeDemand));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime demands
  useEffect(() => {
    if (rtDemandsReadyRef.current) return;
    rtDemandsReadyRef.current = true;

    const ch = supabase
      .channel("rt_demands_hall")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "demands" }, (payload) => {
        const row = normalizeDemand(payload.new);
        if (row.status === "completed") return;
        setItems((prev) => {
          if (prev.some((x) => x.id === row.id)) return prev;
          return [row, ...prev].slice(0, 200);
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "demands" }, (payload) => {
        const row = normalizeDemand(payload.new);
        if (row.status === "completed") {
          setItems((prev) => prev.filter((x) => x.id !== row.id));
          setContacts((prev) => {
            const n = { ...prev };
            delete n[row.id];
            return n;
          });
          return;
        }
        setItems((prev) => {
          const exists = prev.some((x) => x.id === row.id);
          if (!exists) return [row, ...prev].slice(0, 200);
          return prev.map((x) => (x.id === row.id ? row : x));
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "demands" }, (payload) => {
        const oldId = (payload.old as any)?.id as string | undefined;
        if (!oldId) return;
        setItems((prev) => prev.filter((x) => x.id !== oldId));
        setContacts((prev) => {
          const n = { ...prev };
          delete n[oldId];
          return n;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      rtDemandsReadyRef.current = false;
    };
  }, []);

  // realtime contacts (email only)
  useEffect(() => {
    if (!canUseEmail) {
      rtContactsReadyRef.current = false;
      return;
    }
    if (rtContactsReadyRef.current) return;
    rtContactsReadyRef.current = true;

    const ch = supabase
      .channel("rt_demand_contacts")
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_contacts" }, (payload) => {
        const did = (payload.new as any)?.demand_id ?? (payload.old as any)?.demand_id;
        const c = (payload.new as any)?.contact as string | undefined;
        if (!did) return;

        if (payload.eventType === "DELETE") {
          setContacts((prev) => {
            if (!(did in prev)) return prev;
            const n = { ...prev };
            delete n[did];
            return n;
          });
          return;
        }

        if (!c) return;

        setContacts((prev) => {
          if (!(did in prev)) return prev; // 只更新已展示的
          if (prev[did] === c) return prev;
          return { ...prev, [did]: c };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      rtContactsReadyRef.current = false;
    };
  }, [canUseEmail]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = items.filter((it) => {
      const hitKw =
        !kw ||
        it.title.toLowerCase().includes(kw) ||
        (it.description ?? "").toLowerCase().includes(kw);
      const hitCat = filterCategory === ALL_VALUE || it.category === filterCategory;
      const hitTime = overlapsTime(it, timeRange);
      return hitKw && hitCat && hitTime;
    });
    return pinnedFirst(list);
  }, [items, q, filterCategory, timeRange]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("");

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user || !user.email || (user as any).is_anonymous) {
      setStatusMsg(t.demandsHall.form.needEmail);
      return;
    }
    if (!title.trim()) {
      setStatusMsg(lang === "zh" ? "标题不能为空。" : "Title is required.");
      return;
    }

    const budgetNumber = budget.trim() ? Number(budget) : null;
    if (budget.trim() && Number.isNaN(budgetNumber)) {
      setStatusMsg(lang === "zh" ? "预算必须是数字。" : "Budget must be a number.");
      return;
    }
    const depositNumber=Number(requiredDeposit||0);
    if(!/^\d+(\.\d{1,2})?$/.test(requiredDeposit||"0")||depositNumber<0||depositNumber>100000){setStatusMsg(lang==="zh"?"押金必须是0至100000之间、最多两位小数的数字。":"Deposit must be between 0 and 100000 with no more than two decimal places.");return}

    let taskTiming;
    try { taskTiming = timePayload(taskTime); }
    catch { setStatusMsg(lang === "zh" ? "请填写有效的起止时间，结束不能早于开始。" : "Enter a valid range. End cannot precede start."); return; }

    const { data: inserted, error: insertErr } = await supabase
      .from("demands")
      .insert({
        owner_id: user.id,
        ...taskTiming,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category: category || t.categories.other,
        budget: budgetNumber,
        required_deposit: depositNumber,
        status: "active",
    })
    .select("id, owner_id, title, description, category, budget, required_deposit, status, created_at, image_paths, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
    .maybeSingle();

    if (insertErr || !inserted) {
      setStatusMsg((lang === "zh" ? "发布失败：" : "Post failed: ") + (insertErr?.message ?? "Unknown"));
      return;
    }

    // ✅ 关键：不等 realtime，先本地插入，立刻看到
    if (imageFiles.length) {
      try {
        const paths = await uploadPostImages(user.id, "demand", inserted.id, imageFiles);
        const { error: imageUpdateError } = await supabase.from("demands").update({ image_paths: paths }).eq("id", inserted.id).eq("owner_id", user.id);
        if (imageUpdateError) throw imageUpdateError;
        (inserted as any).image_paths = paths;
      } catch (e) {
        setStatusMsg((lang === "zh" ? "发布成功，但图片上传失败：" : "Published, but image upload failed: ") + (e instanceof Error ? e.message : "Unknown"));
      }
    }

    const newRow = normalizeDemand(inserted);
    setItems((prev) => [newRow, ...prev.filter((x) => x.id !== newRow.id)].slice(0, 200));


    setTitle("");
    setDescription("");
    setCategory(t.categories.other);
    setBudget("");
    setRequiredDeposit("0");
    setStatusMsg(lang === "zh" ? "发布成功 ✅" : "Posted ✅");
    setTaskTime(ANY_TIME);
    setShowPublish(false);
  }

  async function loadContact(demandId: string) {
    setStatusMsg("");
    if (contacts[demandId]) return;

    const { data: u } = await supabase.auth.getUser();
    const user = u.user;

    if (!user || !user.email || (user as any).is_anonymous) {
      setStatusMsg(lang === "zh" ? "请使用邮箱登录后查看联系方式（匿名仅可浏览）。" : "Please sign in with email to view contacts.");
      return;
    }

    setContactLoading((p) => ({ ...p, [demandId]: true }));
    const { data, error } = await supabase
      .from("demand_contacts")
      .select("contact")
      .eq("demand_id", demandId)
      .maybeSingle();
    setContactLoading((p) => ({ ...p, [demandId]: false }));

    if (error) {
      setStatusMsg((lang === "zh" ? "读取联系方式失败：" : "Load contact failed: ") + error.message);
      return;
    }
    if (!data) {
      setStatusMsg(t.demandsHall.item.noContact);
      return;
    }
    setContacts((prev) => ({ ...prev, [demandId]: data.contact }));
  }

  return (
    <main className="min-h-screen bg-[#080a12] text-zinc-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t.demandsHall.title}</h1>
            <p className="mt-2 text-zinc-400">{lang === "zh" ? "这里有许多人需要您" : "Many people here need your help."}</p>
          </div>
          <button type="button" onClick={() => setShowPublish(true)} className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400">
            {lang === "zh" ? "发布您的需求" : "Post your request"}
          </button>
          <p className="w-full text-center text-xs font-medium text-white lg:absolute lg:left-1/2 lg:top-1/2 lg:w-auto lg:max-w-sm lg:-translate-x-1/2 lg:-translate-y-1/2">{lang==="zh"?"如需交易担保或押金支付协助，请在聊天中点击“需要担保”，由管理员介入协调。":"For transaction guarantees or help arranging a deposit payment, select “Request guarantee” in chat for administrator assistance."}</p>
        </div>

        {/* search + filter */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_120px_140px_100px]">
            <input
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 outline-none focus:border-indigo-500"
              placeholder={t.demandsHall.searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 outline-none focus:border-indigo-500"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value={ALL_VALUE}>{t.categories.allLabel}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select aria-label={lang === "zh" ? "地区" : "Location"} className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-400" disabled title={lang === "zh" ? "地区功能将在定位系统上线后启用" : "Available when location features launch"}>
              <option>{lang === "zh" ? "全部地区" : "All locations"}</option>
            </select>
            <TaskTimeFields value={timeRange} onChange={setTimeRange} lang={lang} filter />
            <button
              onClick={load}
              className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-4 py-2 text-zinc-100"
              type="button"
            >
              {t.common.manualRefresh}
            </button>
          </div>
        </div>


        <div className="mt-6">
          {/* publish */}
          {showPublish && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPublish(false); }}><section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-[#11131e] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4"><div className="text-xl font-semibold">{t.demandsHall.publishBlockTitle}</div><button type="button" onClick={() => setShowPublish(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:text-white">✕</button></div>

            <form onSubmit={submit} className="space-y-3">
              <input
                className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                placeholder={t.demandsHall.form.titlePh}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <select
                className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <textarea
                className="w-full min-h-28 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                placeholder={t.demandsHall.form.descPh}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <TaskTimeFields value={taskTime} onChange={setTaskTime} lang={lang} />
              <DepositDraft lang={lang} amount={requiredDeposit} onChange={setRequiredDeposit}/>

              <label className="block rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 px-4 py-3 text-sm text-zinc-400">
                {lang === "zh" ? `图片（最多 ${MAX_POST_IMAGES} 张，每张 ≤ 5MB）` : `Images (up to ${MAX_POST_IMAGES}, max 5MB each)`}
                <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files ?? []).slice(0, MAX_POST_IMAGES))} className="mt-2 block w-full text-xs" />
                {imageFiles.length > 0 && <div className="mt-1 text-xs text-zinc-500">{imageFiles.length}/{MAX_POST_IMAGES}</div>}
              </label>

              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                  placeholder={t.demandsHall.form.budgetPh}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={!canUseEmail}
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold px-6 py-3"
                >
                  {t.demandsHall.form.publish}
                </button>
              </div>

              {!canUseEmail && <div className="text-sm text-amber-300">{t.demandsHall.form.needEmail}</div>}
            </form>

            {statusMsg && <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{statusMsg}</div>}
          </section></div>}

          {/* list */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-lg font-semibold mb-3">
              {t.demandsHall.latestTitle}（{filtered.length}）
            </div>

            {filtered.length === 0 ? (
              <div className="text-zinc-400">{t.demandsHall.empty}</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((it) => (
                  <div key={it.id} className={`rounded-xl border p-4 ${it.pinned_at ? "border-amber-400/40 bg-amber-500/[0.04]" : "border-zinc-800 bg-zinc-950/30"}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 empty:hidden"><PinnedTag pinnedAt={it.pinned_at} lang={lang}/><AdminPinButton kind="demand" id={it.id} pinnedAt={it.pinned_at} lang={lang} onChanged={(value)=>setItems(prev=>prev.map(x=>x.id===it.id?{...x,pinned_at:value}:x))}/></div>
                    <PostImageGallery paths={it.image_paths} compact />
                    <OwnerBadge userId={it.owner_id} lang={lang}/>
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">{it.title}</div>
                      <div className="text-xs rounded-full border border-zinc-700 px-2 py-1 text-zinc-200">
                        {it.category || t.categories.other}
                      </div>
                    </div>

                    {it.description && <div className="text-zinc-300 mt-2 whitespace-pre-wrap">{it.description}</div>}

                    <p className="mt-2 text-sm text-violet-300">{formatTaskTime(it, lang)}</p>
                    <div className="text-zinc-500 text-sm mt-2 flex gap-3 flex-wrap">
                      <span>{new Date(it.created_at).toLocaleString()}</span>
                      {it.budget != null && <span>£{it.budget}</span>}
                      <span className="text-amber-300">{lang==="zh"?`押金 £${it.required_deposit.toFixed(2)}`:`Deposit £${it.required_deposit.toFixed(2)}`}</span>
                      <a className="text-zinc-300 hover:text-white underline" href={`/${lang}/demands/${it.id}`}>
                        {t.common.details}
                      </a>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
