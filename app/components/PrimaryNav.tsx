"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import AdminNavLink from "@/app/components/AdminNavLink";
import LanguageSwitch from "@/app/components/LanguageSwitch";
import {AVATARS_BUCKET,publicStorageUrl} from "@/lib/media";
import {supabase} from "@/lib/supabaseClient";

export default function PrimaryNav({lang}:{lang:"zh"|"en"}){
 const pathname=usePathname();const login=pathname===`/${lang}`||pathname===`/${lang}/`||pathname===`/${lang}/login`;const home=pathname===`/${lang}/home`||pathname===`/${lang}/home/`;
 const [userId,setUserId]=useState<string|null>(null),[username,setUsername]=useState<string|null>(null),[avatarPath,setAvatarPath]=useState<string|null>(null);
 async function loadUser(id:string|null){setUserId(id);if(!id){setUsername(null);setAvatarPath(null);return}const {data}=await supabase.from("profiles").select("username, avatar_path").eq("id",id).maybeSingle();setUsername(data?.username??null);setAvatarPath(data?.avatar_path??null)}
 useEffect(()=>{
  let active=true;const timers=new Set<ReturnType<typeof setTimeout>>();
  const schedule=(id:string|null)=>{const timer=setTimeout(()=>{timers.delete(timer);if(active)void loadUser(id).catch(()=>{});},0);timers.add(timer)};
  supabase.auth.getSession().then(({data})=>{if(active)schedule(data.session?.user?.id??null)}).catch(()=>{});
  // Auth callbacks must finish before profile queries acquire the auth lock.
  const {data}=supabase.auth.onAuthStateChange((_e,s)=>{schedule(s?.user?.id??null)});
  return()=>{active=false;timers.forEach(clearTimeout);data.subscription.unsubscribe()};
 },[]);
 const avatarUrl=publicStorageUrl(AVATARS_BUCKET,avatarPath),items=[["需求","Requests","demands"],["服务","Services","services"],["社交","Social","social"],["讨论","Discuss","forum"],["私聊","Messages","messages"],["我的","Me","me"]];
 return <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0d0f19]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5"><a href={`/${lang}/home`} className="group shrink-0 rounded-xl px-2 py-2 text-xl font-black text-white transition hover:bg-white/5 hover:text-violet-200">{lang==="zh"?"有求":"youqiu"}</a>{!home&&!login&&<nav className="ml-auto hidden items-center gap-1 md:flex">{items.map(([zh,en,path])=>{const href=`/${lang}/${path}`;return <Link key={path} href={href} className={`rounded-full px-3 py-2 text-sm transition ${pathname.startsWith(href)?"bg-violet-500/15 text-violet-300":"text-zinc-400 hover:bg-white/5 hover:text-white"}`}>{lang==="zh"?zh:en}</Link>})}</nav>}<div className={`${home||login?"ml-auto":"md:ml-2"} flex items-center gap-2`}><AdminNavLink lang={lang}/><LanguageSwitch/>{userId?<Link href={`/${lang}/account`} className="flex items-center gap-2 rounded-full border border-white/10 py-1.5 pl-1.5 pr-3 text-sm">{avatarUrl?<img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover"/>:<span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-300">{(username||"U")[0].toUpperCase()}</span>}<span>{username||(lang==="zh"?"未设置ID":"No ID")}</span></Link>:<Link href={`/${lang}`} className="rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-400">{lang==="zh"?"未登录":"Signed out"}</Link>}</div></div>{!home&&!login&&<nav className="flex border-t border-white/5 px-3 py-2 md:hidden">{items.map(([zh,en,path])=><Link key={path} href={`/${lang}/${path}`} className="flex-1 text-center text-xs text-zinc-400">{lang==="zh"?zh:en}</Link>)}</nav>}</header>;
}
