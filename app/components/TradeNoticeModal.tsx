"use client";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {safeLang} from "@/lib/i18n";
import {guaranteeCopy} from "@/lib/guaranteeCopy";

export const OPEN_TRADE_NOTICE="simple-market:open-trade-notice";
export const AUTO_TRADE_NOTICE="simple-market:auto-trade-notice";
const HIDE_KEY="simple-market:hide-trade-notice:v1";
function hidden(){try{return localStorage.getItem(HIDE_KEY)==="1"}catch{return false}}

export default function TradeNoticeModal({lang}:{lang:string}){
 const L=safeLang(lang),pathname=usePathname(),[open,setOpen]=useState(false),[never,setNever]=useState(false),closeRef=useRef<HTMLButtonElement>(null);
 function close(){try{if(never)localStorage.setItem(HIDE_KEY,"1");else localStorage.removeItem(HIDE_KEY)}catch{}setOpen(false)}
 useEffect(()=>{
  const manual=()=>{setNever(hidden());setOpen(true)};
  const automatic=()=>{if(!hidden()){setNever(false);setOpen(true)}};
  window.addEventListener(OPEN_TRADE_NOTICE,manual);window.addEventListener(AUTO_TRADE_NOTICE,automatic);
  return()=>{window.removeEventListener(OPEN_TRADE_NOTICE,manual);window.removeEventListener(AUTO_TRADE_NOTICE,automatic)};
 },[]);
 useEffect(()=>{if(pathname.includes("/transactions/")&&!hidden()){setNever(false);setOpen(true)}},[pathname]);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;closeRef.current?.focus();const key=(e:KeyboardEvent)=>{
  if(e.key==="Escape")close();
  if(e.key==="Tab"){const items=closeRef.current?.closest("section")?.querySelectorAll<HTMLElement>("button,input");if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 };window.addEventListener("keydown",key);return()=>{window.removeEventListener("keydown",key);previous?.focus()}},[open,never]);
 if(!open)return null;
 return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>e.target===e.currentTarget&&close()}><section role="dialog" aria-modal="true" aria-labelledby="trade-notice-title" className="relative max-h-[88svh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#11131e] p-6 sm:p-8"><button ref={closeRef} type="button" onClick={close} aria-label={L==="zh"?"关闭交易注意事项":"Close transaction guidance"} className="absolute right-4 top-4 rounded-lg px-3 py-2">×</button><h2 id="trade-notice-title" className="pr-10 text-xl font-bold">{L==="zh"?"交易注意事项":"Transaction guidance"}</h2><p className="mt-5 text-sm leading-7 text-zinc-200">{guaranteeCopy[L].notice}</p><p className="mt-4 text-sm leading-7 text-amber-300">{guaranteeCopy[L].confirmation}</p><label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={never} onChange={e=>setNever(e.target.checked)} className="accent-violet-500"/>{L==="zh"?"不再提醒":"Do not remind me again"}</label><button type="button" onClick={close} className="mt-5 min-h-11 w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold">{L==="zh"?"我知道了":"Got it"}</button></section></div>;
}
