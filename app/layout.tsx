// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "有求 youqiu",
  description: "Campus services, requests, social and chat · 校园服务、需求、社交与聊天",
  applicationName: "有求 youqiu",
  // manifest is generated from app/manifest.ts
  appleWebApp: { capable: true, title: "有求", statusBarStyle: "black" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0f19",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
