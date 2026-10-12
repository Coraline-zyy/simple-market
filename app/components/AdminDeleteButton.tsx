"use client";
import {useRef,useState} from "react";
import {supabase} from "@/lib/supabaseClient";

export default function AdminDeleteButton({admin,kind,id,lang,onDeleted}:{admin:boolean;kind:"service"|"demand"|"post"|"comment";id:string;lang:"zh"|"en";onDeleted?:()=>void}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const lock=useRef(false);
 const zh=lang==="zh";
 if(!admin)return null;
 async function remove(){
  if(!admin||!open||lock.current)return;
  lock.current=true;setBusy(true);setError("");
  try{
   const {error}=await supabase.rpc("admin_permanently_delete_content",{p_kind:kind,p_id:id,p_reason:"Administrator deleted content from public page",p_confirmation:"PERMANENT DELETE"});
   if(error)throw error;
   setOpen(false);
   if(onDeleted)onDeleted();else window.location.reload();
  }catch(error){setError(error instanceof Error?error.message:(error as {message?:string})?.message||"Request failed");}
  finally{lock.current=false;setBusy(false);}
 }
 return <span data-card-interactive onClick={event=>event.stopPropagation()}>
  <button type="button" disabled={busy} onClick={event=>{event.preventDefault();setOpen(true);setError("");}} className="rounded-lg border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-300 disabled:opacity-40">{zh?"管理员删除":"Admin delete"}</button>
  {open&&<div role="alertdialog" aria-modal="true" aria-label={zh?"管理员永久删除":"Administrator permanent deletion"} className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4"><section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131e] p-6 text-left">
   <h2 className="text-lg font-bold">{zh?"管理员永久删除":"Administrator permanent deletion"}</h2>
   <p className="mt-3 text-sm text-zinc-300">{kind==="comment"?(zh?"该评论及其点赞将被永久删除，无法恢复。":"This comment and its likes will be permanently deleted. This cannot be undone."):kind==="post"?(zh?"该发布及关联评论、点赞和参与记录将被永久删除，无法恢复。":"This post and its comments, likes and participation records will be permanently deleted. This cannot be undone."):(zh?"该发布及关联聊天、交易、评价和仲裁记录将被永久删除，无法恢复。请确认没有需要保留的交易证据。":"This listing and its linked chats, transactions, reviews and arbitration records will be permanently deleted. Preserve any required transaction evidence first.")}</p>
   {error&&<p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
   <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setOpen(false)}>{zh?"取消":"Cancel"}</button><button type="button" disabled={busy} onClick={()=>void remove()} className="rounded-lg bg-rose-700 px-4 py-2 text-white disabled:opacity-40">{busy?(zh?"删除中…":"Deleting…"):(zh?"确认永久删除":"Confirm permanent delete")}</button></div>
  </section></div>}
 </span>;
}
