"use client";
import {useParams} from "next/navigation";
import {safeLang} from "@/lib/i18n";
import {FundsPreview,CooperationPreview} from "@/app/components/PaymentPreview";
export default function PaymentPreviewPage(){const params=useParams<{lang:string}>(),lang=safeLang(params.lang),zh=lang==="zh";return <main className="bg-[#080a12] px-4 py-10 text-zinc-100"><div className="mx-auto max-w-5xl"><h1 className="text-3xl font-black">{zh?"支付与押金页面预览":"Payments & deposits preview"}</h1><p className="my-4 text-sm text-amber-300">{zh?"独立演示：无真实付款、余额、认证或订单状态变更。刷新页面将重置草稿。":"Standalone demo: no real payments, balances, badges or order changes. Refresh resets drafts."}</p><div className="grid items-start gap-5 lg:grid-cols-2"><FundsPreview lang={lang}/><CooperationPreview lang={lang} demo/></div></div></main>}
