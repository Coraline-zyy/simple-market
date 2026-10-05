"use client";
import {useState} from "react";
export function todayDate(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
export default function CalendarRangePicker({from,to,onChange,lang}:{from:string;to:string;onChange:(from:string,to:string)=>void;lang:"zh"|"en"}){
 const initial=from||todayDate(),zh=lang==="zh";
 const [year,setYear]=useState(Number(initial.slice(0,4))),[month,setMonth]=useState(Number(initial.slice(5,7))-1),[target,setTarget]=useState<"from"|"to">("from");
 const firstDay=new Date(Date.UTC(year,month,1)).getUTCDay(),count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 function choose(date:string){
  if(target==="from"){onChange(date,!to||to<date?date:to);setTarget("to")}
  else{onChange(!from||date<from?date:from,!from?date:date<from?from:date);setTarget("from")}
 }
 return <div className="rounded-xl border border-white/10 bg-[#090b13] p-3">
  <div className="mb-3 grid grid-cols-2 gap-2">{(["from","to"] as const).map(key=><button key={key} type="button" onClick={()=>{setTarget(key);const d=key==="from"?from:to;if(d){setYear(Number(d.slice(0,4)));setMonth(Number(d.slice(5,7))-1)}}} className={`rounded-lg border px-2 py-2 text-sm ${target===key?"border-violet-400 bg-violet-500/10":"border-white/10"}`}><span className="block text-xs text-zinc-500">{key==="from"?(zh?"开始日期":"Start date"):(zh?"结束日期":"End date")}</span>{(key==="from"?from:to)||(zh?"点选日期":"Select date")}</button>)}</div>
  <div className="flex items-center justify-between"><button type="button" disabled={year<=1900} onClick={()=>setYear(y=>y-1)} aria-label={zh?"上一年":"Previous year"} className="rounded-lg px-3 py-1 hover:bg-white/5">‹</button><span className="font-semibold">{year}</span><button type="button" disabled={year>=2100} onClick={()=>setYear(y=>y+1)} aria-label={zh?"下一年":"Next year"} className="rounded-lg px-3 py-1 hover:bg-white/5">›</button></div>
  <div className="my-3 flex gap-1 overflow-x-auto pb-1">{Array.from({length:12},(_,m)=><button key={m} type="button" onClick={()=>setMonth(m)} aria-pressed={month===m} className={`shrink-0 rounded-lg px-2 py-1.5 text-xs ${month===m?"bg-violet-500 text-white":"text-zinc-400 hover:bg-white/5"}`}>{zh?(m+1)+"月":new Date(Date.UTC(2020,m,1)).toLocaleString("en",{month:"short",timeZone:"UTC"})}</button>)}</div>
  <div className="grid grid-cols-7 gap-1 text-center">{(zh?["日","一","二","三","四","五","六"]:["Su","Mo","Tu","We","Th","Fr","Sa"]).map(d=><span key={d} className="py-1 text-xs text-zinc-500">{d}</span>)}
   {Array.from({length:firstDay},(_,i)=><span key={"blank"+i}/>)}
   {Array.from({length:count},(_,i)=>{const date=year+"-"+String(month+1).padStart(2,"0")+"-"+String(i+1).padStart(2,"0"),edge=date===from||date===to,within=from&&to&&date>=from&&date<=to;return <button key={date} type="button" aria-label={date} aria-pressed={!!within} onClick={()=>choose(date)} className={`rounded-lg py-2 text-sm transition ${edge?"bg-violet-500 text-white":within?"bg-violet-500/15 text-violet-200":"text-zinc-300 hover:bg-white/10"}`}>{i+1}</button>})}
  </div><p className="mt-2 text-center text-xs text-zinc-500">{target==="from"?(zh?"请选择开始日期":"Select start date"):(zh?"请选择结束日期":"Select end date")}</p>
 </div>
}
