"use client";

import { POST_IMAGES_BUCKET, publicStorageUrl } from "@/lib/media";
import {useState} from "react";

export default function PostImageGallery({ paths, compact = false }: { paths?: string[] | null; compact?: boolean }) {
  const safe = (paths ?? []).filter(Boolean);
  const [active,setActive]=useState<string|null>(null);
  const [zoom,setZoom]=useState(1);
  if (!safe.length) return null;

  const open=(url:string)=>{setActive(url);setZoom(1)};
  const viewer=active&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4" onMouseDown={e=>e.target===e.currentTarget&&setActive(null)}><div className="flex h-full w-full flex-col"><div className="mb-3 flex justify-end gap-2"><button type="button" onClick={()=>setZoom(z=>Math.max(.5,z-.25))} className="rounded-xl border border-white/20 bg-black/60 px-4 py-2 text-white" aria-label="Zoom out">−</button><button type="button" onClick={()=>setZoom(1)} className="rounded-xl border border-white/20 bg-black/60 px-4 py-2 text-sm text-white">{Math.round(zoom*100)}%</button><button type="button" onClick={()=>setZoom(z=>Math.min(4,z+.25))} className="rounded-xl border border-white/20 bg-black/60 px-4 py-2 text-white" aria-label="Zoom in">＋</button><button type="button" onClick={()=>setActive(null)} className="rounded-xl border border-white/20 bg-black/60 px-4 py-2 text-white" aria-label="Close">×</button></div><div className="min-h-0 flex-1 overflow-auto text-center"><img src={active} alt="Post image" className="mx-auto max-w-none origin-top transition-transform" style={{width:`${zoom*100}%`,height:"auto"}}/></div></div></div>;

  if (compact) {
    const url = publicStorageUrl(POST_IMAGES_BUCKET, safe[0]);
    return url ? <><button type="button" onClick={()=>open(url)} className="float-right ml-4 mb-2 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black/20 sm:h-36 sm:w-36" aria-label="Open full-size image"><img src={url} alt="" className="h-full w-full object-contain" /></button>{viewer}</> : null;
  }

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {safe.map((path) => {
        const url = publicStorageUrl(POST_IMAGES_BUCKET, path);
        return url ? (
          <button type="button" key={path} onClick={()=>open(url)} className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black/20">
            <img src={url} alt="Post image" className="max-h-80 max-w-full object-contain" />
          </button>
        ) : null;
      })}
    <>{viewer}</>
    </div>
  );
}
