"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabaseClient";
export default function AdminNavLink({lang}:{lang:"zh"|"en"}){
 const [admin,setAdmin]=useState(false);
 useEffect(()=>{let active=true;let timer:ReturnType<typeof setTimeout>|undefined;const check=()=>{void supabase.rpc("is_market_admin").then(({data,error})=>{if(active)setAdmin(!error&&data===true)})};check();
 const {data}=supabase.auth.onAuthStateChange(()=>{clearTimeout(timer);timer=setTimeout(check,0)});
 return()=>{active=false;clearTimeout(timer);data.subscription.unsubscribe()}},[]);
 return admin?<Link href={`/${lang}/admin`} className="rounded-full border border-rose-400/30 px-3 py-2 text-xs text-rose-300">{lang==="zh"?"管理":"Admin"}</Link>:null
}
