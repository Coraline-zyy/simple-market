// app/manifest.ts — makes the website installable as an app (PWA).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "youqiu",
    short_name: "youqiu",
    description: "Campus services, requests, social and chat · 校园服务、需求、社交与聊天",
    start_url: "/en/home?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080a12",
    theme_color: "#0d0f19",
    lang: "en",
    categories: ["social", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "聊天 Chats", url: "/en/me?tab=chat", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "需求 Requests", url: "/en/demands", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "服务 Services", url: "/en/services", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
