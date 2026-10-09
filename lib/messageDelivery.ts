import { createClient } from "@supabase/supabase-js";
import { messageEmailPayload } from "@/lib/messageEmail";
export function notificationClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Message notification service credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function deliverMessageEmail(id: string) {
  const apiKey = process.env.RESEND_API_KEY, from = process.env.NOTIFY_FROM_EMAIL || process.env.MESSAGE_FROM_EMAIL || process.env.REPORT_FROM_EMAIL;
  const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !from || !site) throw new Error("Configure RESEND_API_KEY, MESSAGE_FROM_EMAIL and SITE_URL.");
  if(process.env.NODE_ENV==="production"&&new URL(site).protocol!=="https:")throw new Error("SITE_URL must use HTTPS in production.");
  const client = notificationClient();
  const claim = await client.rpc("claim_message_email", { p_event: id });
  if (claim.error) throw claim.error;
  if (!claim.data) return "skipped";
  try {
    const payload = messageEmailPayload(claim.data, site, from);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `message/${id}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
    const finish = await client.rpc("finish_message_email", { p_event: id, p_sent: true, p_error: null });
    if (finish.error) throw finish.error;
    return "sent";
  } catch (error: any) {
    await client.rpc("finish_message_email", { p_event: id, p_sent: false, p_error: error?.message || "Delivery failed" });
    throw error;
  }
}
