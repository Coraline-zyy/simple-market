// app/[lang]/services/page.tsx
"use client";
import {DepositDraft} from "@/app/components/PaymentPreview";

import { useEffect, useMemo, useRef, useState } from "react";
import PostImageGallery from "@/app/components/PostImageGallery";
import { MAX_POST_IMAGES, uploadPostImages } from "@/lib/media";
import { supabase } from "@/lib/supabaseClient";
import { ALL_VALUE, getT, safeLang } from "@/lib/i18n";
import { useParams } from "next/navigation";
import OwnerBadge from "@/app/components/OwnerBadge";
import TaskTimeFields from "@/app/components/TaskTimeFields";
import { ANY_TIME, TimeRange, timePayload, overlapsTime, formatTaskTime } from "@/lib/taskTime";

type Service = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  required_deposit: number;
  status: "active" | "completed";
  created_at: string;
  image_paths: string[];
  task_starts_at: string | null;
  task_ends_at: string | null;
  task_date_only: boolean;
};

function normalizeService(row: any): Service {
  return {
    ...row,
    id: row.id,
    owner_id: row.owner_id,
    title: row.title ?? "",
    description: row.description ?? null,
    category: row.category ?? "其他",
    price: row.price ?? null,
    required_deposit: Number(row.required_deposit ?? 0),
    status: row.status ?? "active",
    created_at: row.created_at ?? new Date().toISOString(),
    image_paths: Array.isArray(row.image_paths) ? row.image_paths : [],
    task_starts_at: row.task_starts_at ?? null,
    task_ends_at: row.task_ends_at ?? null,
    task_date_only: !!row.task_date_only,
  };
}

export default function ServicesPage() {
  const params = useParams<{ lang: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);

  // categories：保持与数据库一致（你库里大概率存中文）
  const CATEGORIES = t.categories.items as readonly string[];

  const [items, setItems] = useState<Service[]>([]);
  const [status, setStatus] = useState<string>("");

  // publish
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(t.categories.other);
  const [price, setPrice] = useState("");
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

  // contacts cache
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [contactLoading, setContactLoading] = useState<Record<string, boolean>>({});

  const rtServicesReadyRef = useRef(false);
  const rtContactsReadyRef = useRef(false);

  // 当语言切换时，确保 category 默认值仍然有效
  useEffect(() => {
    if (!CATEGORIES.includes(category as any)) {
      setCategory(t.categories.other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUserEmail(u?.email ?? null);
    }).catch(() => setUserEmail(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
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
    setStatus("");
    const { data, error } = await supabase
      .from("services")
      .select("id, owner_id, title, description, category, price, required_deposit, status, created_at, image_paths, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) setStatus(t.servicesHall.readFail + error.message);
    else setItems(((data as any[]) ?? []).map(normalizeService));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime services
  useEffect(() => {
    if (rtServicesReadyRef.current) return;
    rtServicesReadyRef.current = true;

    const ch = supabase
      .channel("rt_services_hall")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "services" }, (payload) => {
        const row = normalizeService(payload.new);
        if (row.status === "completed") return;
        setItems((prev) => {
          if (prev.some((x) => x.id === row.id)) return prev;
          return [row, ...prev].slice(0, 200);
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "services" }, (payload) => {
        const row = normalizeService(payload.new);

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
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "services" }, (payload) => {
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
      rtServicesReadyRef.current = false;
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
      .channel("rt_service_contacts")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_contacts" }, (payload) => {
        const sid = (payload.new as any)?.service_id ?? (payload.old as any)?.service_id;
        const c = (payload.new as any)?.contact as string | undefined;
        if (!sid) return;

        if (payload.eventType === "DELETE") {
          setContacts((prev) => {
            if (!(sid in prev)) return prev;
            const n = { ...prev };
            delete n[sid];
            return n;
          });
          return;
        }

        if (!c) return;

        setContacts((prev) => {
          if (!(sid in prev)) return prev;
          if (prev[sid] === c) return prev;
          return { ...prev, [sid]: c };
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
    return items.filter((it) => {
      const hitKw =
        !kw || it.title.toLowerCase().includes(kw) || (it.description ?? "").toLowerCase().includes(kw);
      const hitCat = filterCategory === ALL_VALUE || it.category === filterCategory;
      const hitTime = overlapsTime(it, timeRange);
      return hitKw && hitCat && hitTime;
    });
  }, [items, q, filterCategory, timeRange]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user || !user.email || (user as any).is_anonymous) {
      setStatus(t.servicesHall.needEmailToPublish);
      return;
    }
    if (!title.trim()) {
      setStatus(t.servicesHall.titleEmpty);
      return;
    }

    const priceNumber = price.trim() ? Number(price) : null;
    if (price.trim() && Number.isNaN(priceNumber)) {
      setStatus(t.servicesHall.priceMustNumber);
      return;
    }
    const depositNumber=Number(requiredDeposit||0);
    if(!/^\d+(\.\d{1,2})?$/.test(requiredDeposit||"0")||depositNumber<0||depositNumber>100000){setStatus(lang==="zh"?"押金必须是0至100000之间、最多两位小数的数字。":"Deposit must be between 0 and 100000 with no more than two decimal places.");return}

    let taskTiming;
    try { taskTiming = timePayload(taskTime); }
    catch { setStatus(lang === "zh" ? "请填写有效的起止时间，结束不能早于开始。" : "Enter a valid range. End cannot precede start."); return; }

    const { data: inserted, error: insertErr } = await supabase
      .from("services")
      .insert({
        owner_id: user.id,
        ...taskTiming,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category: category || t.categories.other,
        price: priceNumber,
        required_deposit: depositNumber,
        status: "active",
      })
      .select("id, owner_id, title, description, category, price, required_deposit, status, created_at, image_paths, task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone")
      .maybeSingle();

    if (insertErr || !inserted) {
      setStatus(t.servicesHall.publishFail + (insertErr?.message ?? "Unknown error"));
      return;
    }

    if (imageFiles.length) {
      try {
        const paths = await uploadPostImages(user.id, "service", inserted.id, imageFiles);
        const { error: imageUpdateError } = await supabase.from("services").update({ image_paths: paths }).eq("id", inserted.id).eq("owner_id", user.id);
        if (imageUpdateError) throw imageUpdateError;
        (inserted as any).image_paths = paths;
      } catch (e) {
        setStatus((lang === "zh" ? "发布成功，但图片上传失败：" : "Published, but image upload failed: ") + (e instanceof Error ? e.message : "Unknown"));
      }
    }

    // ✅ 关键：不等 realtime，先本地插入
    const newRow = normalizeService(inserted);
    setItems((prev) => [newRow, ...prev.filter((x) => x.id !== newRow.id)].slice(0, 200));


    setTitle("");
    setDescription("");
    setCategory(t.categories.other);
    setPrice("");
    setRequiredDeposit("0");
    setImageFiles([]);
    setStatus(t.servicesHall.publishOk);
    setTaskTime(ANY_TIME);
    setShowPublish(false);
  }

  async function loadContact(serviceId: string) {
    setStatus("");
    if (contacts[serviceId]) return;

    const { data: u } = await supabase.auth.getUser();
    const user = u.user;

    if (!user || !user.email || (user as any).is_anonymous) {
      setStatus(t.servicesHall.needEmailToViewContact);
      return;
    }

    setContactLoading((p) => ({ ...p, [serviceId]: true }));

    const { data, error } = await supabase
      .from("service_contacts")
      .select("contact")
      .eq("service_id", serviceId)
      .maybeSingle();

    setContactLoading((p) => ({ ...p, [serviceId]: false }));

    if (error) {
      setStatus(t.servicesHall.contactReadFail + error.message);
      return;
    }
    if (!data) {
      setStatus(t.servicesHall.contactEmpty);
      return;
    }

    setContacts((prev) => ({ ...prev, [serviceId]: data.contact }));
  }

  return (
    <main className="min-h-screen bg-[#080a12] text-zinc-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t.servicesHall.title}</h1>
            <p className="mt-2 text-zinc-400">{lang === "zh" ? "这里有许多人愿意帮助你" : "Many people here are ready to help you."}</p>
          </div>
          <button type="button" onClick={() => setShowPublish(true)} className="rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400">
            {lang === "zh" ? "发布您的服务" : "Post your service"}
          </button>
          <p className="w-full text-center text-xs text-zinc-500 lg:absolute lg:left-1/2 lg:top-1/2 lg:w-auto lg:max-w-sm lg:-translate-x-1/2 lg:-translate-y-1/2">{lang==="zh"?"如需交易担保人，可在聊天中点击“需要担保”。此协调服务无偿。":"If you need a transaction guarantor, select “Request guarantee” in chat. This coordination service is free."}</p>
        </div>

        {/* search + filter */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_120px_140px_100px]">
            <input
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 outline-none focus:border-indigo-500"
              placeholder={t.servicesHall.searchPlaceholder}
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
            <div className="mb-4 flex items-center justify-between gap-4"><div className="text-xl font-semibold">{t.servicesHall.publishTitle}</div><button type="button" onClick={() => setShowPublish(false)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:text-white">✕</button></div>

            <form onSubmit={submit} className="space-y-3">
              <input
                className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                placeholder={t.servicesHall.titlePlaceholder}
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
                placeholder={t.servicesHall.descPlaceholder}
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
                  placeholder={t.servicesHall.pricePlaceholder}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={!canUseEmail}
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold px-6 py-3"
                >
                  {t.servicesHall.publishBtn}
                </button>
              </div>

              {!canUseEmail && <div className="text-sm text-amber-300">{t.servicesHall.publishNeedLogin}</div>}
            </form>

            {status && <div className="mt-3 text-sm text-zinc-300 whitespace-pre-wrap">{status}</div>}
          </section></div>}

          {/* list */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-lg font-semibold mb-3">
              {t.servicesHall.latest}（{filtered.length}）
            </div>

            {filtered.length === 0 ? (
              <div className="text-zinc-400">{t.servicesHall.noResult}</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((it) => (
                  <div key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
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
                      {it.price != null && <span>¥ {it.price}</span>}
                      <span className="text-amber-300">{lang==="zh"?`押金 £${it.required_deposit.toFixed(2)}`:`Deposit £${it.required_deposit.toFixed(2)}`}</span>
                      <a className="text-zinc-300 hover:text-white underline" href={`/${lang}/services/${it.id}`}>
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
