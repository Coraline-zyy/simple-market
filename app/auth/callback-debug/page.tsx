"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackDebugPage() {
  const [msg, setMsg] = useState("正在完成登录，请稍等…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error") || params.get("error_description");
    if (err) setMsg("登录失败：" + err);
    else setMsg("如果你看到这个页面，说明回调没有正常跳转。");
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-10">
      <div className="max-w-xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="text-2xl font-bold">回调调试</div>
        <div className="mt-3 text-zinc-300">{msg}</div>

        <div className="mt-6 flex gap-3">
          <a
            href="/services"
            className="rounded-xl bg-indigo-500 hover:bg-indigo-400 text-zinc-950 font-semibold px-5 py-2"
          >
            返回服务大厅
          </a>
          <a
            href="/demands"
            className="rounded-xl border border-zinc-700 hover:border-zinc-500 px-5 py-2 text-zinc-100"
          >
            返回需求大厅
          </a>
        </div>
      </div>
    </main>
  );
}
