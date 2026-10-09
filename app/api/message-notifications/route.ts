import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { deliverMessageEmail, notificationClient } from "@/lib/messageDelivery";
export const runtime = "nodejs";
export const maxDuration = 60;
function authorized(actual: string | null, expected: string | undefined) {
 if (!actual || !expected) return false;
 const a=Buffer.from(actual),b=Buffer.from(expected);
 return a.length===b.length && timingSafeEqual(a,b);
}
// Supabase Database Webhook on INSERT of message_email_outbox. Never callable by ordinary clients.
export async function POST(request: NextRequest) {
  if (!authorized(request.headers.get("x-message-webhook-secret"), process.env.MESSAGE_WEBHOOK_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.VERCEL_ENV === "preview") return NextResponse.json({ error: "Notifications are disabled on previews" }, { status: 409 });
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body = JSON.parse(raw), id = body.record?.id;
    if (body.type !== "INSERT" || body.schema !== "public" || body.table !== "message_email_outbox" || typeof id !== "string" || !/^[\da-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    return NextResponse.json({ status: await deliverMessageEmail(id) });
  } catch (error: any) { console.error("Message notification worker:", error?.message); return NextResponse.json({ error: "Delivery failed; inspect server logs and retry the outbox." }, { status: 503 }); }
}
// Optional authenticated scheduler/manual retry endpoint; no scheduler is installed automatically.
export async function GET(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"), process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.VERCEL_ENV === "preview") return NextResponse.json({ error: "Preview disabled" }, { status: 409 });
  try {
    const result = await notificationClient().from("message_email_outbox").select("id").in("status", ["pending", "failed", "processing"]).lt("attempts", 5).order("created_at").limit(3);
    if (result.error) throw result.error;
    const outcomes = [];
    for (const row of result.data ?? []) { try { outcomes.push({ id: row.id, status: await deliverMessageEmail(row.id) }); } catch { outcomes.push({ id: row.id, status: "failed" }); } }
    return NextResponse.json({ outcomes });
  } catch { return NextResponse.json({ error: "Retry worker failed" }, { status: 503 }); }
}
