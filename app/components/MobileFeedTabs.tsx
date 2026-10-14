"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";

export default function MobileFeedTabs({lang}:{lang:"zh"|"en"}){
 const pathname=usePathname();
 const tabs=[["需求","Requests","demands"],["服务","Offers","services"],["活动","Activities","social"],["讨论","Discussions","forum"]];
 return <nav className="poster-feed-tabs" aria-label={lang==="zh"?"浏览分类":"Browse categories"}>{tabs.map(([zh,en,path])=><Link key={path} href={`/${lang}/${path}`} aria-current={pathname===`/${lang}/${path}`?"page":undefined}>{lang==="zh"?zh:en}</Link>)}</nav>;
}
