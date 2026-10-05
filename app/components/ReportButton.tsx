"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getT, safeLang } from "@/lib/i18n";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  reportedUserId?: string | null;
  conversationId?: string | null;
  dealId?: string | null;
  postType?: "service" | "demand" | null;
  postId?: string | null;
};

export default function ReportButton(props: Props) {
  const params = useParams<{ lang?: string }>();
  const lang = safeLang(params?.lang);
  const t = useMemo(() => getT(lang), [lang]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fraud");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return setMessage(t.report.loginRequired);
    if (description.trim().length < 10) return setMessage(t.report.detailTooShort);

    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...props, reason, description: description.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Request failed");
      if (props.dealId) {
        const court = await supabase.rpc("open_deal_arbitration", { p_deal_id: props.dealId });
        if(court.error) throw new Error((lang === "zh" ? "举报已保存，但仲裁申请失败：" : "Report saved, but court request failed: ") + court.error.message);
      }
      setMessage(t.report.success);
      setDescription("");
    } catch (e) {
      setMessage(`${t.report.failed}${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-red-300 underline underline-offset-4 hover:text-red-200">
        {t.report.button}
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{t.report.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{t.report.subtitle}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl text-zinc-400 hover:text-white">×</button>
            </div>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-5 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <option value="fraud">{t.report.reasons.fraud}</option>
              <option value="payment">{t.report.reasons.payment}</option>
              <option value="service">{t.report.reasons.service}</option>
              <option value="harassment">{t.report.reasons.harassment}</option>
              <option value="spam">{t.report.reasons.spam}</option>
              <option value="other">{t.report.reasons.other}</option>
            </select>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.report.descriptionPlaceholder} className="mt-3 min-h-36 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3" />
            {message && <div className="mt-3 text-sm text-zinc-300">{message}</div>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-700 px-4 py-2">{t.common.cancel}</button>
              <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-red-400 px-4 py-2 font-semibold text-zinc-950 disabled:opacity-50">{busy ? t.report.submitting : t.report.submit}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
