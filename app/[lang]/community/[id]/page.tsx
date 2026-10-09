"use client";
import {validCommunityComment} from "@/lib/communityContent";
import {useEffect,useRef,useState} from "react";import {useParams} from "next/navigation";import {supabase} from "@/lib/supabaseClient";import {safeLang} from "@/lib/i18n";import OwnerBadge from "@/app/components/OwnerBadge";import AdminPinButton,{PinnedTag} from "@/app/components/AdminPin";import {formatTaskTime} from "@/lib/taskTime";import CommunityImagePicker from "@/app/components/CommunityImagePicker";
import ForumLikeButton,{useForumLikes} from "@/app/components/ForumLikes";
import PostImageGallery from "@/app/components/PostImageGallery";
import {POST_IMAGES_BUCKET,uploadPostImages,AVATARS_BUCKET,publicStorageUrl} from "@/lib/media";
type Person={id:string;username:string|null;avatar_path:string|null};
function Avatars({people,lang}:{people:Person[];lang:"zh"|"en"}){return <div className="flex -space-x-2">{people.slice(0,8).map(person=>{const src=publicStorageUrl(AVATARS_BUCKET,person.avatar_path);return <a key={person.id} href={`/${lang}/users/${person.id}`} title={person.username??undefined} className="relative transition hover:z-10 hover:scale-110">{src?<img src={src} alt="" className="h-9 w-9 rounded-full object-cover"/>:<span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/25 text-xs">{(person.username||"U")[0].toUpperCase()}</span>}</a>})}</div>}
export default function CommunityPost(){const p=useParams<{lang:string;id:string}>(),lang=safeLang(p.lang);const [post,setPost]=useState<any>(null),[comments,setComments]=useState<any[]>([]),[people,setPeople]=useState<Person[]>([]),[uid,setUid]=useState<string|null>(null),[joined,setJoined]=useState(false),[text,setText]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const participationLock=useRef(false);
 const [files,setFiles]=useState<File[]>([]),[sending,setSending]=useState(false);
 const likes=useForumLikes(post?.kind==="discussion"?[post.id]:[],uid,setMsg);
 async function load(){
  const columns="id,author_id,kind,category,title,body,image_paths,location,event_time,created_at,score,pinned_at,task_schedule_v2,task_date_from,task_date_to,task_time_from,task_time_to,task_timezone";
  const [a,b,c]=await Promise.all([supabase.from("community_posts").select(columns).eq("id",p.id).maybeSingle(),supabase.from("community_comments").select("id,author_id,body,image_paths,created_at").eq("post_id",p.id).order("created_at"),supabase.from("community_participants").select("user_id,created_at").eq("post_id",p.id).order("created_at")]);
  if(a.error){setMsg(a.error.message);return}if(b.error){setMsg(b.error.message);return}if(a.data?.kind==="social"&&c.error){setMsg(c.error.message);return}
  const rawComments=b.data??[],participantIds=(c.data??[]).map(x=>x.user_id);
  const ids=[...new Set([a.data?.author_id,...rawComments.map(x=>x.author_id),...participantIds].filter(Boolean))] as string[],profiles=new Map<string,Person>();
  if(ids.length){const result=await supabase.from("profiles").select("id,username,avatar_path").in("id",ids);if(result.error){setMsg(result.error.message);return}(result.data??[]).forEach(x=>profiles.set(x.id,x as Person))}
  setMsg("");setPost(a.data);setComments(rawComments.map(x=>({...x,profiles:profiles.get(x.author_id)??null})));setPeople(participantIds.map(id=>profiles.get(id)).filter(Boolean) as Person[]);setJoined(!!uid&&participantIds.includes(uid));
 }
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setUid(data.session?.user?.id??null)).catch(()=>setUid(null))},[]);useEffect(()=>{void load()},[p.id,uid]);
 async function join(){
  if(!uid)return setMsg(lang==="zh"?"请先登录后参与活动。":"Please sign in to join.");
  if(participationLock.current||busy)return;
  participationLock.current=true;setBusy(true);setMsg("");
  try {
   const {error}=await supabase.rpc(joined?"leave_community_activity":"join_community_activity",{p_post:p.id});
   if(error)throw error;
   await load();
  }catch(error:any){setMsg(error?.message||"Request failed")}
  finally{participationLock.current=false;setBusy(false)}
 }
 async function send(){
  if(sending)return;if(!uid)return setMsg(lang==="zh"?"请先登录。":"Please sign in.");
  if(!validCommunityComment(text,files.length))return setMsg(lang==="zh"?"请输入评论内容或添加图片。":"Add text or images to your comment.");
  setSending(true);setMsg("");let paths:string[]=[];let saved=false;
  try{const id=crypto.randomUUID();paths=await uploadPostImages(uid,"forum-comment",id,files);
   const {error}=await supabase.from("community_comments").insert({id,post_id:p.id,author_id:uid,body:text.trim(),image_paths:paths});
   if(error)throw error;saved=true;setText("");setFiles([]);await load();
  }catch(e:any){if(!saved&&paths.length)await supabase.storage.from(POST_IMAGES_BUCKET).remove(paths);setMsg(e?.message||"Request failed")}finally{setSending(false)}
 }
 return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-4xl"><a href={`/${lang}/${post?.kind==="social"?"social":"forum"}`} className="text-sm text-violet-300">← {lang==="zh"?"返回":"Back"}</a>{post&&<article className="mt-6 rounded-2xl border border-white/10 bg-[#11131e] p-6"><div className="mb-2 flex flex-wrap items-center gap-2 empty:hidden"><PinnedTag pinnedAt={post.pinned_at} lang={lang}/><AdminPinButton kind="post" id={post.id} pinnedAt={post.pinned_at} lang={lang} onChanged={value=>setPost((prev:any)=>prev?{...prev,pinned_at:value}:prev)}/></div><div className="flex items-center gap-2"><OwnerBadge userId={post.author_id} lang={lang}/><span className="text-xs text-zinc-500">· {new Date(post.created_at).toLocaleString()}</span></div><h1 className="mt-4 text-2xl font-black">{post.title}</h1>{post.kind==="social"&&<dl className="mt-5 grid gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm"><div><dt className="inline text-emerald-400/70">{lang==="zh"?"时间：":"Time: "}</dt><dd className="inline text-emerald-300">{formatTaskTime(post,lang)}</dd></div><div><dt className="inline text-emerald-400/70">{lang==="zh"?"地点：":"Location: "}</dt><dd className="inline text-emerald-300">{post.location||(lang==="zh"?"待定":"TBC")}</dd></div></dl>}<p className="mt-5 whitespace-pre-wrap leading-8 text-zinc-300">{post.body}</p><PostImageGallery paths={post.image_paths}/>{post.kind==="discussion"&&<div className="mt-5"><ForumLikeButton state={likes.states[post.id]} busy={likes.pending.has(post.id)} onClick={()=>void likes.toggle(post.id,lang)} lang={lang}/></div>}{post.kind==="social"&&<div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5"><div className="flex items-center gap-3"><Avatars people={people} lang={lang}/><span className="text-sm text-zinc-400">{lang==="zh"?`当前参与 ${people.length} 人`:`${people.length} joining`}</span>{joined&&<span className="text-sm text-violet-300">{lang==="zh"?"已参与":"Joined"}</span>}</div><button disabled={busy} onClick={join} className={`rounded-lg px-5 py-2.5 text-sm font-bold disabled:opacity-40 ${joined?"bg-rose-600 hover:bg-rose-500":"bg-violet-500 hover:bg-violet-400"}`}>{joined?(lang==="zh"?"取消参与":"Leave"):(lang==="zh"?"参与":"Join")}</button></div>}</article>}<section className="mt-5 rounded-2xl border border-white/10 bg-[#11131e] p-6"><h2 className="font-bold">{lang==="zh"?`评论（${comments.length}）`:`Comments (${comments.length})`}</h2><div className="mt-4 flex gap-2"><textarea disabled={sending} value={text} onChange={e=>setText(e.target.value)} className="min-h-12 flex-1 rounded-xl border border-white/10 bg-[#090b13] px-4 py-3" placeholder={lang==="zh"?"与发布者和参与者沟通……":"Talk with the organiser and participants…"}/><button disabled={sending} onClick={send} className="rounded-xl bg-violet-500 px-5 font-bold disabled:opacity-40">{sending?(lang==="zh"?"发表中…":"Posting…"):(lang==="zh"?"发表":"Post")}</button></div><CommunityImagePicker files={files} onChange={setFiles} lang={lang} disabled={sending} onError={setMsg}/><div className="mt-6 space-y-3">{comments.map(c=><div key={c.id} className="rounded-xl border border-white/5 bg-black/10 p-4"><div className="flex items-center gap-2"><OwnerBadge userId={c.author_id} lang={lang}/><span className="text-xs text-zinc-500">· {new Date(c.created_at).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{c.body}</p><PostImageGallery paths={c.image_paths}/></div>)}</div></section>{msg&&<p className="mt-4 text-rose-300">{msg}</p>}</div></main>}
