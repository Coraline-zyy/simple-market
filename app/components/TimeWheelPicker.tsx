"use client";
import {useEffect,useId,useRef} from "react";
function Wheel({value,count,onChange,label}:{value:number;count:number;onChange:(n:number)=>void;label:string}){
 const ref=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),callback=useRef(onChange),current=useRef(value),id=useId();callback.current=onChange;current.current=value;
 useEffect(()=>{if(timer.current)clearTimeout(timer.current);if(ref.current)ref.current.scrollTop=value*36},[value]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 return <div className="relative min-w-0 flex-1"><div className="pointer-events-none absolute inset-x-0 top-[72px] z-10 h-9 rounded-lg border-y border-violet-400/30 bg-violet-500/10"/><div ref={ref} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={id+"-"+value} onKeyDown={e=>{let n=value;if(e.key==="ArrowDown")n=Math.min(count-1,value+1);else if(e.key==="ArrowUp")n=Math.max(0,value-1);else if(e.key==="Home")n=0;else if(e.key==="End")n=count-1;else return;e.preventDefault();callback.current(n)}} onScroll={()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{const n=Math.max(0,Math.min(count-1,Math.round((ref.current?.scrollTop??0)/36)));if(n!==current.current)callback.current(n)},120)}} className="relative h-[180px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-lg outline-none focus:ring-1 focus:ring-violet-400" style={{scrollbarWidth:"none",paddingTop:72,paddingBottom:72}}>
  {Array.from({length:count},(_,n)=><div id={id+"-"+n} key={n} role="option" aria-selected={value===n} className={`flex h-9 snap-center items-center justify-center text-2xl tabular-nums ${value===n?"font-semibold text-white":"text-zinc-500"}`}><button type="button" tabIndex={-1} onClick={()=>callback.current(n)} className="h-full w-full">{String(n).padStart(2,"0")}</button></div>)}
 </div><span className="mt-1 block text-center text-xs text-zinc-500">{label}</span></div>
}
export default function TimeWheelPicker({value,onChange,lang,label}:{value:string;onChange:(value:string)=>void;lang:"zh"|"en";label:string}){
 const hour=Number(value.slice(0,2))||0,minute=Number(value.slice(3,5))||0;
 const update=(h:number,m:number)=>onChange(String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"));
 return <div className="min-w-0 rounded-xl border border-white/10 bg-[#090b13] p-2"><p className="mb-1 text-center text-xs text-zinc-400">{label} · {value}</p><div className="flex items-start gap-1"><Wheel value={hour} count={24} onChange={h=>update(h,minute)} label={lang==="zh"?"时":"Hour"}/><span aria-hidden className="mt-[77px] text-xl text-zinc-400">:</span><Wheel value={minute} count={60} onChange={m=>update(hour,m)} label={lang==="zh"?"分":"Minute"}/></div></div>
}
