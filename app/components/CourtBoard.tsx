"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
export default function CourtBoard({lang,admin=false}:{lang:"zh"|"en";admin?:boolean}){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;supabase.from("court_cases").select("id,title,status,created_at").order("created_at",{ascending:false}).limit(200).then(({data,error})=>{if(active){setRows(data??[]);setError(error?.message??"");setLoading(false)}});return()=>{active=false}},[]);
 const zh=lang==="zh";
 return <section className="mt-6 space-y-4"><h2 className="text-xl font-bold">{zh?"小法庭":"Community court"}</h2><p className="text-sm text-zinc-400">{zh?"双方举证，公众投票，管理员最终裁决。请勿公开他人的敏感信息。":"Evidence from both parties, community votes, final administrator ruling. Do not expose sensitive personal information."}</p>{error?<p className="text-rose-300">{error}</p>:loading?<p>{zh?"加载中…":"Loading…"}</p>:rows.length?<div className="grid gap-3 sm:grid-cols-2">{rows.map(row=><a key={row.id} href={`/${lang}/court/${row.id}`} className="rounded-xl border border-white/10 bg-[#11131e] p-4 hover:border-violet-400"><h3 className="font-semibold">{row.title}</h3><p className="mt-2 text-xs text-zinc-400">{row.status==="collecting"?(zh?"举证中":"Collecting evidence"):row.status==="voting"?(zh?"投票中":"Voting"):(zh?"已裁决":"Ruled")}{admin?" · Admin":""}</p></a>)}</div>:<p className="text-zinc-400">{zh?"暂无案件。登录后可查看案件。":"No cases. Sign in to view cases."}</p>}</section>
}
