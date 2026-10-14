"use client";
import Link from "next/link";
import {usePathname,useSearchParams} from "next/navigation";
import {Suspense,useState} from "react";
import UnreadBadge from "./UnreadBadge";

function Icon({kind}:{kind:"home"|"post"|"chat"|"profile"}){
 return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==="home"?<><path d="m3 10 9-7 9 7v10H4V10"/><path d="M9 20v-7h6v7"/></>:kind==="post"?<><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>:kind==="chat"?<path d="M3 4h18v14H9l-6 4V4Z"/>:<><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>}
 </svg>;
}
function MobileBottomNavContent({lang,unread}:{lang:"zh"|"en";unread:number}){
 const pathname=usePathname(),search=useSearchParams();const [open,setOpen]=useState(false);
 const chat=search.get("tab")==="chat";
 const zh=lang==="zh";
 return <>
  <nav className="mobile-primary-links poster-bottom-nav" aria-label={zh?"手机主导航":"Mobile navigation"}>
   <Link href={`/${lang}/demands`} aria-current={/\/(demands|services|social|forum)(\/|$)/.test(pathname)?"page":undefined}><Icon kind="home"/><span>{zh?"首页":"Home"}</span></Link>
   <button type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog"><Icon kind="post"/><span>{zh?"发布":"Post"}</span></button>
   <Link href={`/${lang}/me?tab=chat`} aria-current={pathname===`/${lang}/me`&&chat?"page":undefined}><Icon kind="chat"/><span>{zh?"消息":"Messages"}</span><UnreadBadge count={unread} className="poster-unread"/></Link>
   <Link href={`/${lang}/me`} aria-current={pathname===`/${lang}/me`&&!chat?"page":undefined}><Icon kind="profile"/><span>{zh?"我的":"Profile"}</span></Link>
  </nav>
  {open&&<div className="poster-post-overlay" onClick={event=>{if(event.target===event.currentTarget)setOpen(false)}}><section role="dialog" aria-modal="true" aria-label={zh?"选择发布类型":"Choose what to post"} className="poster-post-sheet">
   <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{zh?"想发布什么？":"What would you like to post?"}</h2><button type="button" aria-label={zh?"关闭发布菜单":"Close post menu"} onClick={()=>setOpen(false)} className="min-h-11 min-w-11">×</button></div>
   {[["发布需求","Request help","demands"],["提供服务","Offer a service","services"],["举办活动","Create an activity","social"],["发起讨论","Start a discussion","forum"]].map(([cn,en,path])=><a key={path} href={`/${lang}/${path}?publish=1`} className="poster-post-choice">{zh?cn:en}<span aria-hidden="true">→</span></a>)}
  </section></div>}
 </>;
}
export default function MobileBottomNav(props:{lang:"zh"|"en";unread:number}){
 return <Suspense fallback={null}><MobileBottomNavContent {...props}/></Suspense>;
}
