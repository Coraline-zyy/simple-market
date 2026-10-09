"use client";
// Registers the service worker and offers "Install the app" on phones and computers.
import { useEffect, useState } from "react";
import { isInstallDismissed, dismissInstallPrompt } from "@/lib/installSession";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; listeners.forEach(fn => fn()); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach(fn => fn()); });
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Can we show the browser's own install dialog? */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => { const fn = () => force(n => n + 1); listeners.add(fn); return () => { listeners.delete(fn); }; }, []);
  return {
    canPrompt: !!deferred,
    async install() {
      if (!deferred) return false;
      await deferred.prompt();
      const choice = await deferred.userChoice.catch(() => ({ outcome: "dismissed" as const }));
      deferred = null; listeners.forEach(fn => fn());
      return choice.outcome === "accepted";
    },
  };
}

export function ServiceWorkerRegister({lang}:{lang:"zh"|"en"}) {
  useEffect(() => { document.documentElement.lang=lang; },[lang]);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register(); else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

/** Small banner at the bottom of the screen: "Install youqiu as an app". */
export default function InstallBanner({ lang }: { lang: "zh" | "en" }) {
  const zh = lang === "zh";
  const { canPrompt, install } = useInstallPrompt();
  const [show, setShow] = useState(false), [ios, setIos] = useState(false);
  useEffect(() => {
    if (isStandalone()) return;
    if (isInstallDismissed()) return;
    const iosDevice = isIOS();
    setIos(iosDevice);
    // On iPhone/iPad there is no install dialog — show the "Share → Add to Home Screen" tip after a short delay.
    if (iosDevice) { const t = setTimeout(() => { if (!isInstallDismissed()) setShow(true); }, 4000); return () => clearTimeout(t); }
  }, []);
  useEffect(() => { if (canPrompt && !isStandalone() && !isInstallDismissed()) setShow(true); }, [canPrompt]);

  function close() {
    setShow(false);
    dismissInstallPrompt();
  }
  if (!show || (!ios && !canPrompt)) return null;

  return <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-2xl border border-violet-400/30 bg-[#141628]/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
    <div className="flex items-start gap-3">
      <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{zh ? "安装「有求」App" : "Install the youqiu app"}</p>
        {ios
          ? <p className="mt-1 text-sm leading-6 text-zinc-300">{zh ? <>在 Safari 底部点 <b>分享</b> <ShareIcon /> ，再选 <b>“添加到主屏幕”</b>。</> : <>In Safari tap <b>Share</b> <ShareIcon /> then <b>“Add to Home Screen”</b>.</>}</p>
          : <p className="mt-1 text-sm leading-6 text-zinc-300">{zh ? "像 App 一样从桌面打开。支持的浏览器可在图标上显示未读数；关闭后不会后台推送。" : "Open it from your home screen. Icon badges depend on browser support; background push is not included."}</p>}
        <div className="mt-3 flex gap-2">
          {!ios && <button type="button" onClick={async () => { if (await install()) setShow(false); }} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold">{zh ? "立即安装" : "Install"}</button>}
          <button type="button" onClick={close} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300">{zh ? "以后再说" : "Not now"}</button>
        </div>
      </div>
      <button type="button" aria-label={zh ? "关闭" : "Close"} onClick={close} className="-mr-1 -mt-1 px-2 text-xl text-zinc-500 hover:text-white">×</button>
    </div>
  </div>;
}

export function ShareIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="inline h-4 w-4 -translate-y-0.5 text-sky-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
}
