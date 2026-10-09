// Authenticated sender wake-up. The durable outbox is populated by database triggers;
// webhooks/retries deliver even if the sender closes the page. Clients never choose recipients.
import { NextRequest, NextResponse } from "next/server";
import { deliverMessageEmail, notificationClient } from "@/lib/messageDelivery";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:NextRequest) {
 if(process.env.VERCEL_ENV==="preview")return NextResponse.json({skipped:"preview"});
 const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return NextResponse.json({error:"Unauthorized"},{status:401});
 try {
  const client=notificationClient();
  const auth=await client.auth.getUser(token);
  if(auth.error||!auth.data.user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const raw=await request.text();
  if(raw.length>1000)return NextResponse.json({error:"Payload too large"},{status:413});
  const {kind,messageId}=JSON.parse(raw);
  if(!["task","direct","admin"].includes(kind)||typeof messageId!=="string"||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(messageId))
   return NextResponse.json({error:"Invalid request"},{status:400});
  const events=await client.from("message_email_outbox").select("id").eq("sender_id",auth.data.user.id).eq("kind",kind).eq("message_id",messageId).limit(2);
  if(events.error)throw events.error;
  for(const event of events.data??[])await deliverMessageEmail(event.id);
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Notification pending; delivery can be retried."},{status:503});}
}
