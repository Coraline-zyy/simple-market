import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return NextResponse.json({ error: "Supabase environment is not configured." }, { status: 500 });

    const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const description = String(body.description ?? "").trim();
    const reason = String(body.reason ?? "other").slice(0, 80);
    if (description.length < 10 || description.length > 4000) return NextResponse.json({ error: "Description must be 10-4000 characters." }, { status: 400 });

    let contentContext: {content_type:string;content_id:string;content_snapshot:unknown} | null = null;
    let reportedUserId = body.reportedUserId || null;
    if (body.contentType || body.contentId) {
      const targets = {
        community_post: {table:"community_posts",author:"author_id",columns:"id,author_id,kind,title,body,image_paths"},
        comment: {table:"community_comments",author:"author_id",columns:"id,author_id,post_id,body,image_paths"},
        review: {table:"reviews",author:"reviewer_id",columns:"id,reviewer_id,reviewee_id,deal_id,rating,text"},
      } as const;
      const kind=body.contentType as keyof typeof targets;
      if (!Object.hasOwn(targets,kind) || typeof body.contentId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.contentId)) return NextResponse.json({error:"Invalid report target"},{status:400});
      const target=targets[kind];
      const {data:content,error}=await supabase.from(target.table).select(target.columns).eq("id",body.contentId).maybeSingle();
      if(error || !content) return NextResponse.json({error:"Content unavailable"},{status:404});
      const snapshot=content as unknown as Record<string,unknown>;
      reportedUserId=snapshot[target.author];
      if(reportedUserId===authData.user.id)return NextResponse.json({error:"You cannot report your own content"},{status:400});
      contentContext={content_type:kind,content_id:body.contentId,content_snapshot:snapshot};
    }

    const row = {
      reporter_id: authData.user.id,
      reported_user_id: reportedUserId,
      conversation_id: body.conversationId || null,
      deal_id: body.dealId || null,
      post_type: body.postType || null,
      post_id: body.postId || null,
      reason,
      description: contentContext ? `[${contentContext.content_type}: ${contentContext.content_id}]\n${description}` : description,
      ...(contentContext || {}),
    };

    const { data: report, error: insertError } = await supabase.from("reports").insert(row).select("id, created_at").single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.REPORT_TO_EMAIL;
    const from = process.env.REPORT_FROM_EMAIL || "Marketplace Reports <onboarding@resend.dev>";
    let emailSent = false;
    if (apiKey && to) {
      const subject = `[Marketplace report] ${reason} · ${report.id}`;
      const text = [
        `Report ID: ${report.id}`,
        `Created: ${report.created_at}`,
        `Reporter: ${authData.user.id} (${authData.user.email ?? "no email"})`,
        `Reported user: ${row.reported_user_id ?? "-"}`,
        `Conversation: ${row.conversation_id ?? "-"}`,
        `Deal: ${row.deal_id ?? "-"}`,
        `Post: ${row.post_type ?? "-"} ${row.post_id ?? "-"}`,
        `Content: ${contentContext?.content_type ?? "-"} ${contentContext?.content_id ?? "-"}`,
        `Reason: ${reason}`,
        "",
        description,
      ].join("\n");
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text }),
      });
      emailSent = emailRes.ok;
    }

    return NextResponse.json({ ok: true, id: report.id, emailSent });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
