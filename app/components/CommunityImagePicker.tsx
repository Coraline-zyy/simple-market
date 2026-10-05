"use client";

import { useEffect, useId, useState } from "react";
import { MAX_IMAGE_BYTES, MAX_POST_IMAGES } from "@/lib/media";

export default function CommunityImagePicker({ files, onChange, lang, disabled, onError }: {
  files: File[]; onChange: (files: File[]) => void; lang: "zh" | "en";
  disabled?: boolean; onError: (message: string) => void;
}) {
  const id = useId();
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map(file => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  function select(selected: File[]) {
    if (files.length + selected.length > MAX_POST_IMAGES) {
      onError(lang === "zh" ? "最多可附带 5 张图片。" : "Attach up to 5 images."); return;
    }
    if (selected.some(file => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > MAX_IMAGE_BYTES)) {
      onError(lang === "zh" ? "支持 JPG、PNG、WebP、GIF，每张不超过 5 MB。" : "Use JPG, PNG, WebP or GIF, up to 5 MB each."); return;
    }
    onError(""); onChange([...files, ...selected]);
  }
  return <div className="mt-4">
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={disabled} className="sr-only" onChange={event => { select(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <label htmlFor={id} className={`inline-flex cursor-pointer items-center rounded-lg border border-violet-400/40 px-4 py-2 text-sm text-violet-200 ${disabled ? "pointer-events-none opacity-40" : "hover:bg-violet-500/10"}`}>{lang === "zh" ? "添加图片" : "Add images"}</label>
    <span className="ml-3 text-xs text-zinc-500">{lang === "zh" ? "最多 5 张，每张不超过 5 MB" : "Up to 5 images, 5 MB each"}</span>
    <div className="mt-3 flex flex-wrap gap-3">{urls.map((url, index) => <div key={url} className="relative h-24 w-24 rounded-lg border border-white/10 bg-black/20">
      <img src={url} alt={files[index]?.name ?? ""} className="h-full w-full rounded-lg object-contain" />
      <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))} aria-label={lang === "zh" ? "移除图片" : "Remove image"} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-rose-700 text-white disabled:opacity-40">×</button>
    </div>)}</div>
  </div>;
}
