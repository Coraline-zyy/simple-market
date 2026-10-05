"use client";
import {useEffect,useState} from "react";
import {safeLang} from "@/lib/i18n";
import AuthorNote from "@/app/components/AuthorNote";

const HIDE_KEY="simple-market:hide-author-note";
const SEEN_KEY="simple-market:author-note-seen-this-session";
export const OPEN_AUTHOR_NOTE_EVENT="simple-market:open-author-note";

export default function AuthorNoteModal({lang}:{lang:string}){
 const L=safeLang(lang),[open,setOpen]=useState(false),[never,setNever]=useState(false);
 useEffect(()=>{if(localStorage.getItem(HIDE_KEY)!=="1"&&sessionStorage.getItem(SEEN_KEY)!=="1"){sessionStorage.setItem(SEEN_KEY,"1");setOpen(true)}const show=()=>{setNever(false);setOpen(true)};window.addEventListener(OPEN_AUTHOR_NOTE_EVENT,show);return()=>window.removeEventListener(OPEN_AUTHOR_NOTE_EVENT,show)},[]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";const key=(e:KeyboardEvent)=>{if(e.key==="Escape")close()};window.addEventListener("keydown",key);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",key)}},[open,never]);
 function close(){if(never)localStorage.setItem(HIDE_KEY,"1");setOpen(false)}
 if(!open)return null;
 return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={e=>e.target===e.currentTarget&&close()}><section role="dialog" aria-modal="true" aria-label={L==="zh"?"作者的话":"A note from the creator"} className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0f19] p-3 shadow-2xl"><button type="button" onClick={close} aria-label={L==="zh"?"关闭":"Close"} className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-xl text-zinc-300">×</button><AuthorNote lang={L}/><div className="px-4 pb-3 pt-4"><label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={never} onChange={e=>setNever(e.target.checked)} className="accent-violet-500"/>{L==="zh"?"以后不再自动显示":"Do not show this automatically again"}</label><button type="button" onClick={close} className="mt-4 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white">{L==="zh"?"我知道了":"Got it"}</button></div></section></div>
}
