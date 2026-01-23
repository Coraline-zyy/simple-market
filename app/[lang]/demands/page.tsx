// app/[lang]/demands/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AuthBox from "@/app/components/AuthBox";
import { supabase } from "@/lib/supabaseClient";
import { ALL_VALUE, getT, safeLang } from "@/lib/i18n";
import { useParams } from "next/navigation";

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

function normalizeDemand(row: any): Demand {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title ?? "",
    description: row.description ?? null,
    category: row.category ?? "其他",
    budget: row.budget ?? null,
    status: row.status ?? "active",
    created_at: row.created_at ?? new Date().toISOString(),
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
  const [contact, setContact] = useState("");

  // auth
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const canUseEmail = !!userEmail;

  // search/filter
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>(ALL_VALUE);

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
    });
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
      .select("id, owner_id, title, description, category, budget, status, created_at")
      .eq("status", "active")
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
    return items.filter((it) => {
      const hitKw =
        !kw ||
        it.title.toLowerCase().includes(kw) ||
        (it.description ?? "").toLowerCase().includes(kw);
      const hitCat = filterCategory === ALL_VALUE || it.category === filterCategory;
      return hitKw && hitCat;
    });
  }, [items, q, filterCategory]);

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

    const { data: inserted, error: insertErr } = await supabase
      .from("demands")
      .insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        category: category || t.categories.other,
        budget: budgetNumber,
        status: "active",
    })
    .select("id, owner_id, title, description, category, budget, status, created_at")
    .maybeSingle();

    if (insertErr || !inserted) {
      setStatusMsg((lang === "zh" ? "发布失败：" : "Post failed: ") + (insertErr?.message ?? "Unknown"));
      return;
    }

    // ✅ 关键：不等 realtime，先本地插入，立刻看到
    const newRow = normalizeDemand(inserted);
    setItems((prev) => [newRow, ...prev.filter((x) => x.id !== newRow.id)].slice(0, 200));


    if (contact.trim()) {
      const { error: cErr } = await supabase.from("demand_contacts").upsert({
        demand_id: inserted.id,
        owner_id: user.id,
        contact: contact.trim(),
      });
      if (cErr) {
        setStatusMsg((lang === "zh" ? "需求已发布，但联系方式保存失败：" : "Posted, but contact save failed: ") + cErr.message);
        return;
      }
      setContacts((prev) => ({ ...prev, [inserted.id]: contact.trim() }));
    }

    setTitle("");
    setDescription("");
    setCategory(t.categories.other);
    setBudget("");
    setContact("");
    setStatusMsg(lang === "zh" ? "发布成功 ✅" : "Posted ✅");
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.demandsHall.title}</h1>
            <p className="text-zinc-400 mt-2">{t.demandsHall.subtitle}</p>
            <div className="mt-2 text-sm text-zinc-500">
              {t.demandsHall.current}
              {userEmail ? ` ${t.demandsHall.logged}（${userEmail}）` : ` ${t.demandsHall.guest}`}
              <span className="ml-3 text-xs text-zinc-400">{t.common.realtimeOn}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href={`/${lang}`} className="text-zinc-300 hover:text-white underline underline-offset-4">
              {t.common.backHome}
            </a>
            <a href={`/${lang}/me`} className="text-zinc-300 hover:text-white underline underline-offset-4">
              {t.common.me}
            </a>
          </div>
        </div>

        <div className="mt-6">
          <AuthBox lang={lang} />
        </div>

        {/* search + filter */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_120px]">
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
            <button
              onClick={load}
              className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-4 py-2 text-zinc-100"
              type="button"
            >
              {t.common.manualRefresh}
            </button>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {/* publish */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="text-lg font-semibold mb-3">{t.demandsHall.publishBlockTitle}</div>

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

              <input
                className="w-full rounded-xl bg-zinc-950/40 border border-zinc-800 px-4 py-3 outline-none"
                placeholder={t.demandsHall.form.contactPh}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />

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
          </section>

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
                  <div key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">{it.title}</div>
                      <div className="text-xs rounded-full border border-zinc-700 px-2 py-1 text-zinc-200">
                        {it.category || t.categories.other}
                      </div>
                    </div>

                    {it.description && <div className="text-zinc-300 mt-2 whitespace-pre-wrap">{it.description}</div>}

                    <div className="text-zinc-500 text-sm mt-2 flex gap-3 flex-wrap">
                      <span>{new Date(it.created_at).toLocaleString()}</span>
                      {it.budget != null && <span>¥ {it.budget}</span>}
                      <a className="text-zinc-300 hover:text-white underline" href={`/${lang}/demands/${it.id}`}>
                        {t.common.details}
                      </a>
                    </div>

                    {contacts[it.id] ? (
                      <div className="mt-2 text-sm text-zinc-200">
                        {t.demandsHall.item.contact}
                        <span className="font-semibold">{contacts[it.id]}</span>
                        <span className="ml-2 text-xs text-zinc-500">{t.demandsHall.item.contactRealtime}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => loadContact(it.id)}
                        className="mt-2 text-sm text-zinc-300 hover:text-white underline"
                        disabled={!!contactLoading[it.id]}
                      >
                        {contactLoading[it.id] ? t.common.loading : t.demandsHall.item.viewContact}
                      </button>
                    )}
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
