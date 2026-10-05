import CommunityBoard from "@/app/components/CommunityBoard"; import {safeLang} from "@/lib/i18n";
export default async function Page({params}:{params:Promise<{lang:string}>}){const {lang}=await params;return <CommunityBoard lang={safeLang(lang)} kind="social"/>}
