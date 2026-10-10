"use client";
import {PlatformNotice} from "@/app/components/PlatformNotice";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import type {CSSProperties} from "react";

function scrollOverTime(top:number,onComplete:()=>void,duration=1000){
 const start=window.scrollY,target=Math.max(0,Math.min(top,document.documentElement.scrollHeight-window.innerHeight)),distance=target-start,began=performance.now();let id=0;
 function frame(now:number){const p=Math.min((now-began)/duration,1),eased=1-Math.pow(1-p,3);window.scrollTo({top:start+distance*eased,behavior:"instant"});if(p<1)id=requestAnimationFrame(frame);else onComplete()}
 id=requestAnimationFrame(frame);return()=>cancelAnimationFrame(id);
}

export default function HomeExperience({lang}:{lang:"zh"|"en"}){
 const fullTitle=lang==="zh"?"今天有什么可以帮到您？":"What can we help you with today?";
 const [scrolling,setScrolling]=useState(false),[expanded,setExpanded]=useState(false),[displayedTitle,setDisplayedTitle]=useState(fullTitle),[showSubtitle,setShowSubtitle]=useState(true);
 const cancelScroll=useRef<(()=>void)|null>(null),modulesRef=useRef<HTMLElement>(null),expandedRef=useRef(false);
 const reveal=useCallback(()=>{if(expandedRef.current)return;expandedRef.current=true;setExpanded(true)},[]);
 const explore=useCallback(()=>{
  reveal();cancelScroll.current?.();
  const top=modulesRef.current?modulesRef.current.getBoundingClientRect().top+window.scrollY-80:window.scrollY;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(window.matchMedia("(max-width: 767px)").matches||reduced){setScrolling(false);window.scrollTo({top,behavior:reduced?"instant":"smooth"})}
  else{setScrolling(true);cancelScroll.current=scrollOverTime(top,()=>setScrolling(false))}
 },[reveal]);
 useEffect(()=>{
  cancelScroll.current?.();setScrolling(false);expandedRef.current=false;setExpanded(false);window.scrollTo({top:0,behavior:"instant"});
  if(window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)").matches){setDisplayedTitle(fullTitle);setShowSubtitle(true);return}
  setDisplayedTitle("");setShowSubtitle(false);let index=0,subtitleTimer=0;
  const timer=window.setInterval(()=>{index++;setDisplayedTitle(fullTitle.slice(0,index));if(index>=fullTitle.length){clearInterval(timer);subtitleTimer=window.setTimeout(()=>setShowSubtitle(true),350)}},lang==="zh"?125:58);
  return()=>{clearInterval(timer);clearTimeout(subtitleTimer);cancelScroll.current?.()};
 },[fullTitle,lang]);
 useEffect(()=>{
  let start:{x:number;y:number}|null=null,swiped=false;
  const mobile=()=>window.matchMedia("(max-width: 767px)").matches;
  const onStart=(event:TouchEvent)=>{start=null;swiped=false;if(event.touches.length!==1||!mobile()||expandedRef.current)return;if((event.target as Element)?.closest("a,button,input,textarea,select,[role='dialog']"))return;start={x:event.touches[0].clientX,y:event.touches[0].clientY}};
  const onMove=(event:TouchEvent)=>{if(!start||event.touches.length!==1)return;const dy=start.y-event.touches[0].clientY,dx=Math.abs(start.x-event.touches[0].clientX);if(dy>40&&dy>dx*1.3){start=null;swiped=true;reveal()}};
  const onEnd=()=>{start=null;if(swiped){swiped=false;explore()}};
  const onCancel=()=>{start=null;swiped=false};
  const onScroll=()=>{if(!mobile()||expandedRef.current||!modulesRef.current)return;if(window.scrollY>24||modulesRef.current.getBoundingClientRect().top<window.innerHeight*.9)reveal()};
  window.addEventListener("touchstart",onStart,{passive:true});window.addEventListener("touchmove",onMove,{passive:true});window.addEventListener("touchend",onEnd,{passive:true});window.addEventListener("touchcancel",onCancel,{passive:true});window.addEventListener("scroll",onScroll,{passive:true});
  return()=>{window.removeEventListener("touchstart",onStart);window.removeEventListener("touchmove",onMove);window.removeEventListener("touchend",onEnd);window.removeEventListener("touchcancel",onCancel);window.removeEventListener("scroll",onScroll);cancelScroll.current?.()};
 },[explore,reveal,lang]);
 const items=[["需求","Requests","发布您的需求","Post your request","demands"],["服务","Services","为他人提供服务","Offer services to others","services"],["社交","Social","免费活动与搭子","Free activities & people","social"],["讨论","Discuss","分享观点建议","Share ideas","forum"],["我的","Me","聊天与合作进度","Chats & progress","me"]];
 function toggle(){if(scrolling)return;if(!expandedRef.current){explore();return}cancelScroll.current?.();const done=()=>{expandedRef.current=false;setExpanded(false);setScrolling(false)};if(window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)").matches){window.scrollTo({top:0,behavior:"instant"});done()}else{setScrolling(true);cancelScroll.current=scrollOverTime(0,done)}}
 return <main className="home-experience bg-[#080a12] text-center">
  <section className="home-hero relative flex min-h-[calc(100svh-4rem)] items-start justify-center overflow-hidden px-5 pt-[18vh]">
   <div className="home-glow pointer-events-none absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl"/>
   <div className="relative max-w-5xl"><h1 className="min-h-[1.2em] text-4xl font-black tracking-tight text-white sm:text-6xl">{displayedTitle}<span className={displayedTitle.length<fullTitle.length?"ml-1 inline-block h-[.9em] w-[2px] animate-pulse bg-violet-400":"hidden"}/></h1><p className={`home-subtitle mx-auto mt-7 text-base text-zinc-400 transition duration-700 sm:text-lg ${showSubtitle?"translate-y-0 opacity-100":"translate-y-3 opacity-0"}`}>{lang==="zh"?"请把您的需求发出来。您也可以为他人提供服务。":"Share what you need. You can also offer your services to others."}</p><div className={`home-notice transition duration-700 ${showSubtitle?"opacity-100":"opacity-0"}`}><PlatformNotice lang={lang}/></div></div>
  </section>
  <section ref={modulesRef} aria-label={lang==="zh"?"探索功能":"Explore features"} className="home-module-section flex min-h-[75vh] items-center px-5 pb-20 pt-28">
   <div aria-hidden={!expanded} className={`home-modules mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-5 ${expanded?"is-expanded":""}`}>
    {items.map(([zh,en,zs,es,path],i)=><Link key={path} tabIndex={expanded?0:-1} href={`/${lang}/${path}`} style={{"--module-delay":`${i*120}ms`} as CSSProperties} className="home-module group rounded-2xl border border-white/10 bg-[#121522] p-5 text-left hover:border-violet-400/50"><div className="text-lg font-bold">{lang==="zh"?zh:en}</div><div className="mt-2 text-xs text-zinc-500">{lang==="zh"?zs:es}</div><div className="mt-5 text-violet-400">→</div></Link>)}
   </div>
  </section>
  <button type="button" onClick={toggle} disabled={scrolling||!showSubtitle} aria-hidden={scrolling||!showSubtitle} className={`home-explore fixed left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3 text-violet-300 ${expanded?"is-expanded top-24":"bottom-9"} ${scrolling||!showSubtitle?"invisible pointer-events-none opacity-0":"opacity-100"}`}><span className="text-xs text-zinc-400">{expanded?(lang==="zh"?"回到首页":"Back to home"):(lang==="zh"?"向下探索":"Explore")}</span><span aria-hidden className={`block h-5 w-5 border-b-2 border-r-2 border-violet-400 ${expanded?"rotate-[225deg]":"rotate-45"}`}/></button>
 </main>;
}
