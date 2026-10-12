"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import ReportButton from "./ReportButton";

export type ManagedContent = "community_post" | "comment" | "review";
export default function ContentActions({kind,id,authorId,lang,userId,onDeleted}:{kind:ManagedContent;id:string;authorId:string;lang:"zh"|"en";userId?:string|null;onDeleted?:()=>void}) {
 const [sessionId,setSessionId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(userId!==undefined)return;let active=true;supabase.auth.getSession().then(({data})=>{if(active)setSessionId(data.session?.user.id??null)});const {data}=supabase.auth.onAuthStateChange((_event,session)=>{if(active)setSessionId(session?.user.id??null)});return()=>{active=false;data.subscription.unsubscribe()}},[userId]);
 const mine=(userId===undefined?sessionId:userId)===authorId;
 async function remove(){
  if(busy||!mine)return;
  const warning=kind==="community_post"?(lang==="zh"?"确定删除这条发布吗？关联评论和点赞也会删除，无法恢复。":"Delete this post and its comments and likes? This cannot be undone."):(lang==="zh"?"确定删除这条内容吗？删除后无法恢复。":"Delete this content? This cannot be undone.");
  if(!window.confirm(warning))return;
  setBusy(true);setError("");
  try{const {error}=await supabase.rpc("delete_my_content",{p_kind:kind,p_id:id});if(error)throw error;onDeleted?.()}catch(e:any){setError(e?.message||"Request failed")}finally{setBusy(false)}
 }
 return <div data-card-interactive className="mt-3 flex flex-wrap items-center justify-end gap-3 text-sm">
  {error&&<span role="alert" className="text-rose-300">{error}</span>}
  {mine?<button type="button" disabled={busy} onClick={remove} className="text-rose-300 underline underline-offset-4 disabled:opacity-40">{busy?(lang==="zh"?"删除中…":"Deleting…"):(lang==="zh"?"删除":"Delete")}</button>:<ReportButton reportedUserId={authorId} contentType={kind} contentId={id} label={lang==="zh"?"举报":"Report"}/>}
 </div>;
}
