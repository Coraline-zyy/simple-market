"use client";
// "Get the app" page: one-tap install where supported, step-by-step help everywhere else.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { safeLang } from "@/lib/i18n";
import { isIOS, isStandalone, ShareIcon, useInstallPrompt } from "@/app/components/AppInstall";

export default function AppPage() {
  const lang = safeLang(useParams<{ lang: string }>().lang), zh = lang === "zh";
  const { canPrompt, install } = useInstallPrompt();
  const [installed, setInstalled] = useState(false), [ios, setIos] = useState(false);
  useEffect(() => { setInstalled(isStandalone()); setIos(isIOS()); }, []);

  const steps = [
    {
      title: zh ? "iPhone / iPad" : "iPhone / iPad",
      items: zh
        ? [<>用 <b>Safari</b> 打开本网站</>, <>点底部的 <b>分享</b> 按钮 <ShareIcon /></>, <>往下滑，选 <b>“添加到主屏幕”</b></>, <>点右上角 <b>“添加”</b>，桌面就会出现「有求」图标</>]
        : [<>Open this site in <b>Safari</b></>, <>Tap the <b>Share</b> button <ShareIcon /></>, <>Scroll down and choose <b>“Add to Home Screen”</b></>, <>Tap <b>“Add”</b> — the youqiu icon appears on your home screen</>],
    },
    {
      title: zh ? "安卓手机" : "Android",
      items: zh
        ? [<>用 <b>Chrome</b> 打开本网站</>, <>点上方的 <b>“立即安装”</b> 按钮；或点右上角 <b>⋮</b> 菜单</>, <>选 <b>“安装应用”</b> 或 <b>“添加到主屏幕”</b></>]
        : [<>Open this site in <b>Chrome</b></>, <>Tap <b>“Install now”</b> above, or the <b>⋮</b> menu</>, <>Choose <b>“Install app”</b> or <b>“Add to Home screen”</b></>],
    },
    {
      title: zh ? "电脑（Chrome / Edge）" : "Computer (Chrome / Edge)",
      items: zh
        ? [<>点上方的 <b>“立即安装”</b></>, <>或点地址栏右侧的 <b>安装图标 ⊕</b></>, <>安装后可从开始菜单 / 启动台打开</>]
        : [<>Click <b>“Install now”</b> above</>, <>Or click the <b>install icon ⊕</b> in the address bar</>, <>Then open it from your Start menu / Launchpad</>],
    },
  ];

  return <main className="px-5 py-10">
    <div className="mx-auto max-w-4xl">
      <section className="flex flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-violet-500/15 to-[#11131e] px-6 py-10 text-center">
        <img src="/icons/icon-512.png" alt="" className="h-24 w-24 rounded-3xl shadow-2xl shadow-violet-900/50" />
        <h1 className="mt-5 text-3xl font-black">{zh ? "「有求」App" : "The youqiu app"}</h1>
        <p className="mt-3 max-w-xl leading-7 text-zinc-300">{zh ? "无需应用商店，添加到桌面即可使用。支持的浏览器可显示图标未读数；新消息可通过邮件提醒。暂不含关闭应用后的后台推送。" : "No app store required. Open it from your home screen, with icon badges where supported and email alerts for new messages. Background push is not included."}</p>
        <div className="mt-6">
          {installed ? <p className="rounded-xl bg-emerald-500/15 px-5 py-3 text-emerald-300">{zh ? "✓ 你正在使用 App 版本" : "✓ You're using the app"}</p>
            : canPrompt ? <button type="button" onClick={() => void install()} className="rounded-2xl bg-violet-500 px-8 py-4 text-lg font-bold shadow-lg shadow-violet-900/40 hover:bg-violet-400">{zh ? "立即安装" : "Install now"}</button>
            : <p className="text-sm text-zinc-400">{ios ? (zh ? "请按下方「iPhone / iPad」步骤添加到主屏幕。" : "Follow the iPhone / iPad steps below.") : (zh ? "按下方对应设备的步骤安装。" : "Follow the steps for your device below.")}</p>}
        </div>
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map(step => <section key={step.title} className="rounded-2xl border border-white/10 bg-[#11131e] p-5">
          <h2 className="font-bold">{step.title}</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">{step.items.map((item, i) => <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-200">{i + 1}</span><span>{item}</span></li>)}</ol>
        </section>)}
      </div>
    </div>
  </main>;
}
