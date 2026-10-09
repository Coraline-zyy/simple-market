"use client";
import StudentReviewAdmin from "@/app/components/StudentReviewAdmin";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import CourtBoard from "@/app/components/CourtBoard";
import AdminPrivateChat from "@/app/components/AdminPrivateChat";
import GuaranteeAdmin from "@/app/components/GuaranteeAdmin";
import AdminPinButton,{PinnedTag} from "@/app/components/AdminPin";
export default function AdminConsole({lang}:{lang:"zh"|"en"}){
 const zh=lang==="zh";const [allowed,setAllowed]=useState<boolean|null>(null),[section,setSection]=useState("cases"),[rows,setRows]=useState<any[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[query,setQuery]=useState("");
 useEffect(()=>{supabase.rpc("is_market_admin").then(({data,error})=>{setAllowed(!error&&data===true);if(error)setMessage(error.message)})},[]);
 async function load(){setRows([]);setMessage("");if(section==="cases"||section==="students"||section==="guarantees"||section==="private_chat")return;
 const table=section==="users"?"profiles":section==="audit"?"admin_actions":section;
 const columns=section==="users"?"id,username":section==="audit"?"id,action,target_id,details,created_at":section==="community_comments"?"id,body,author_id,moderation_deleted":"id,title,moderation_deleted,pinned_at";
 const {data,error}=await supabase.from(table).select(columns).limit(200);
 if(error){setMessage(error.message);return}
 if(section==="users"){
  const {data:mutes,error:muteError}=await supabase.from("account_mutes").select("user_id,until_at,reason,updated_at");
  if(muteError){setMessage(muteError.message);setRows(data??[]);return}
  const byUser=new Map((mutes??[]).map((mute:any)=>[mute.user_id,mute]));
  setRows((data??[]).map((row:any)=>({...row,mute:byUser.get(row.id)??null})));
 }else setRows(data??[]);
 }
 useEffect(()=>{if(allowed)void load()},[allowed,section]);
 async function action(row:any){if(busy)return;
 const reason=window.prompt(zh?"请输入操作理由（至少3字）":"Reason (at least 3 characters)");if(!reason||reason.trim().length<3)return;
 if(!window.confirm(zh?"确认隐藏此内容？订单和后台记录保留。":"Hide this content? Orders and audit history remain."))return;
 setBusy(true);try{
 const kinds:any={services:"service",demands:"demand",community_posts:"post",community_comments:"comment"};
 const {error}=await supabase.rpc("admin_remove_content",{p_kind:kinds[section],p_id:row.id,p_reason:reason});
 if(error)throw error;await load();setMessage(zh?"操作成功":"Done");
 }catch(e){setMessage(e instanceof Error?e.message:"Request failed")}finally{setBusy(false)}
 }
 async function muteUser(row:any){if(busy)return;
  const input=window.prompt(zh?"请输入禁言天数（1–3650天）":"Mute duration in days (1–3650)","7");if(input===null)return;
  const days=Number(input);if(!Number.isInteger(days)||days<1||days>3650){setMessage(zh?"请输入1到3650之间的整数天数。":"Enter a whole number from 1 to 3650.");return}
  const reason=window.prompt(zh?"请输入禁言理由（至少3字）":"Mute reason (at least 3 characters)");if(!reason||reason.trim().length<3){setMessage(zh?"禁言理由至少需要3个字。":"Mute reason must contain at least 3 characters.");return}
  if(!window.confirm(zh?`确认将 ${row.username??row.id} 禁言 ${days} 天？`:`Mute ${row.username??row.id} for ${days} days?`))return;
  setBusy(true);setMessage("");try{const {error}=await supabase.rpc("admin_set_mute",{p_user:row.id,p_days:days,p_reason:reason.trim()});if(error)throw error;await load();setMessage(zh?"禁言已生效。":"Account muted.")}catch(e){setMessage(e instanceof Error?e.message:"Request failed")}finally{setBusy(false)}
 }
 async function unmuteUser(row:any){if(busy)return;
  if(!window.confirm(zh?`确认立即解除 ${row.username??row.id} 的禁言？`:`Unmute ${row.username??row.id} now?`))return;
  setBusy(true);setMessage("");try{const {error}=await supabase.rpc("admin_set_mute",{p_user:row.id,p_days:0,p_reason:zh?"管理员手动解除禁言":"Manually unmuted by administrator"});if(error)throw error;await load();setMessage(zh?"已解除禁言。":"Account unmuted.")}catch(e){setMessage(e instanceof Error?e.message:"Request failed")}finally{setBusy(false)}
 }
 async function permanentlyDelete(row:any){if(busy||section==="users"||section==="audit")return;
  if(!window.confirm(zh?"确定永久删除？此操作无法恢复，并会同时删除关联的聊天、成交和仲裁记录。":"Delete permanently? This cannot be undone and will also delete related chats, deals and court records."))return;
  setBusy(true);setMessage("");
  try{const kinds:any={services:"service",demands:"demand",community_posts:"post",community_comments:"comment"};const {error}=await supabase.rpc("admin_permanently_delete_content",{p_kind:kinds[section],p_id:row.id,p_reason:"Platform owner permanent deletion",p_confirmation:"PERMANENT DELETE"});if(error)throw error;await load();setMessage(zh?"内容已永久删除，无法恢复。":"Content permanently deleted.")}
  catch(e:any){setMessage(e?.message||e?.details||e?.hint||String(e)||"Request failed")}finally{setBusy(false)}
 }
 if(allowed===null)return <p>{zh?"正在验证权限…":"Checking permissions…"}</p>;
 if(!allowed)return <p className="text-rose-300">{zh?"无管理员权限，请使用配置的管理员账号登录。":"Administrator access required."} {message}</p>;
 const tabs=[["private_chat",zh?"用户私聊":"Private messages"],["students",zh?"学生认证":"Student verification"],["cases",zh?"仲裁案件":"Cases"],["guarantees",zh?"担保":"Guarantees"],["services",zh?"服务":"Services"],["demands",zh?"需求":"Requests"],["community_posts",zh?"发文":"Posts"],["community_comments",zh?"评论":"Comments"],["users",zh?"账号禁言":"Mutes"],["audit",zh?"操作记录":"Audit"]];
 return <div><h1 className="text-3xl font-black">{zh?"管理员中心":"Administrator"}</h1><div className="mt-6 flex flex-wrap gap-2">{tabs.map(([key,label])=><button key={key} onClick={()=>{setSection(key);setQuery("")}} className={`rounded-xl border px-4 py-2 ${section===key?"border-violet-400":"border-white/10"}`}>{label}</button>)}</div>{message&&<p className="mt-4 text-amber-300">{message}</p>}{section==="private_chat"?<AdminPrivateChat lang={lang} admin/>:section==="students"?<StudentReviewAdmin lang={lang}/>:section==="cases"?<CourtBoard lang={lang} admin/>:section==="guarantees"?<GuaranteeAdmin lang={lang}/>:<div className="mt-6"><input placeholder={zh?"搜索已加载的 ID / 内容":"Search loaded IDs / content"} value={query} onChange={e=>setQuery(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-[#11131e] p-3"/><button onClick={load} className="mb-3 text-violet-300">{zh?"刷新":"Refresh"}</button><div className="space-y-3">{rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query.toLowerCase())).map(row=>{const muted=section==="users"&&row.mute&&new Date(row.mute.until_at).getTime()>Date.now();return <div key={row.id} className="rounded-xl border border-white/10 p-4"><p className="break-all">{row.title??row.body??row.username??row.action??row.id}</p><p className="mt-1 text-xs text-zinc-500">{row.id}</p>{section==="users"&&<p className={`mt-2 text-sm ${muted?"text-amber-300":"text-emerald-300"}`}>{muted?(zh?`禁言中 · 到期时间：${new Date(row.mute.until_at).toLocaleString()}`:`Muted until ${new Date(row.mute.until_at).toLocaleString()}`):(zh?"当前状态：正常":"Status: active")}{muted&&<span className="mt-1 block text-xs text-zinc-400">{zh?"理由：":"Reason: "}{row.mute.reason}</span>}</p>}{section==="audit"?<pre className="mt-2 whitespace-pre-wrap break-all text-xs text-zinc-400">{JSON.stringify(row.details,null,2)}</pre>:<div className="mt-3 flex flex-wrap gap-4">{section==="users"?(muted?<button disabled={busy} onClick={()=>unmuteUser(row)} className="rounded-lg border border-emerald-400/40 px-3 py-2 text-sm text-emerald-300 disabled:opacity-40">{zh?"立即解除禁言":"Unmute now"}</button>:<button disabled={busy} onClick={()=>muteUser(row)} className="rounded-lg border border-rose-400/40 px-3 py-2 text-sm text-rose-300 disabled:opacity-40">{zh?"禁言":"Mute"}</button>):<><button disabled={busy||row.moderation_deleted} onClick={()=>action(row)} className="text-sm text-amber-300 disabled:opacity-40">{row.moderation_deleted?(zh?"已隐藏":"Hidden"):(zh?"隐藏":"Hide")}</button><button disabled={busy} onClick={()=>permanentlyDelete(row)} className="text-sm font-semibold text-rose-400 disabled:opacity-40">{zh?"永久删除":"Delete permanently"}</button>{["services","demands","community_posts"].includes(section)&&<span className="flex items-center gap-2"><PinnedTag pinnedAt={row.pinned_at} lang={lang}/><AdminPinButton kind={section==="services"?"service":section==="demands"?"demand":"post"} id={row.id} pinnedAt={row.pinned_at} lang={lang} onChanged={value=>setRows(prev=>prev.map(item=>item.id===row.id?{...item,pinned_at:value}:item))}/></span>}</>}</div>}</div>})}</div></div>}</div>
}
