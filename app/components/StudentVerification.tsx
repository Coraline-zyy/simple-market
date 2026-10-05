"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";

export function VerificationBadges({userId,lang}:{userId:string;lang:"zh"|"en"}){
 const [v,setV]=useState<{university?:string;university_verified?:boolean;student?:boolean}|null>(null);
 useEffect(()=>{let live=true;setV(null);supabase.rpc("public_verification",{p_user:userId}).then(({data,error})=>{if(live&&!error)setV(data)});return()=>{live=false}},[userId]);
 return <div className="mt-3 flex flex-wrap gap-2 text-xs">{v?.university_verified&&<span title={lang==="zh"?"仅验证邮箱访问权，不代表学校官方认证。":"Email access verified; not an official university endorsement."} className="rounded-full bg-sky-500/10 px-3 py-1 text-sky-300">{v.university? v.university+" · ":""}{lang==="zh"?"大学认证":"University verified"}</span>}</div>
}
export default function StudentVerification({userId,lang}:{userId:string;lang:"zh"|"en"}){
 const zh=lang==="zh";
 const [school,setSchool]=useState(""),[showSchool,setShowSchool]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[version,setVersion]=useState(0);
 useEffect(()=>{let live=true;supabase.rpc("get_university_settings").then(({data,error})=>{if(!live)return;if(error)setMessage(error.message);else{setSchool(data?.school??"");setShowSchool(data?.show_university===true)}});return()=>{live=false}},[userId]);
 async function changeVisibility(wanted:boolean){setBusy(true);try{const {error}=await supabase.rpc("set_university_visibility",{p_show:wanted});if(error)throw error;setShowSchool(wanted);setVersion(v=>v+1);setMessage(zh?"显示设置已保存。":"Visibility preference saved.")}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 return <section className="rounded-3xl border border-white/10 bg-[#11131e] p-6">
  <h2 className="font-bold">{zh?"大学认证":"University verification"}</h2>
  <VerificationBadges key={version} userId={userId} lang={lang}/>
  <p className="mt-3 text-sm leading-6 text-zinc-400">{zh?"通过支持的大学邮箱注册，并点击邮件中的确认链接后获得大学认证。仅验证邮箱访问权，不代表学校官方背书。":"University verification requires a supported university email and confirmation through the emailed link. It verifies email access, not university endorsement."}</p>
  {school&&<label className="mt-4 flex items-start gap-2 text-sm text-zinc-300"><input type="checkbox" checked={showSchool} disabled={busy} onChange={e=>void changeVisibility(e.target.checked)} className="mt-1 accent-violet-500"/><span>{zh?"在公开资料中显示我的大学名称":"Show my university name on my public profile"}<span className="mt-1 block text-xs text-zinc-500">{zh?"默认不显示学校名称，但保留大学认证标识。你自行写入简介或帖子的学校信息不会自动隐藏。":"Your university name is hidden by default; the verification badge remains. School names you write in your bio or posts are not hidden automatically."}</span></span></label>}
  <div className="mt-6 border-t border-white/10 pt-5">
   <div className="flex flex-wrap items-center gap-3"><h3 className="font-bold">{zh?"学生认证":"Student verification"}</h3><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{zh?"页面预览 · 未开通":"Page preview · Not available"}</span></div>
   <p className="mt-3 text-sm leading-6 text-zinc-400">{zh?"学生证人工认证暂未开放，当前不收集学生证或在读证明，也不能提交审核。大学邮箱认证不受影响。":"Manual student verification is not available. We are not collecting student cards or enrolment documents, and submissions are disabled. University email verification is unaffected."}</p>
   <button type="button" disabled className="mt-4 cursor-not-allowed rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-500">{zh?"上传学生证 · 暂未开放":"Upload student card · Not available"}</button>
  </div>
  {message&&<p role="status" className="mt-3 text-sm text-amber-300">{message}</p>}
 </section>
}
