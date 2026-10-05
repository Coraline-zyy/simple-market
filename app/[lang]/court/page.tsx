import CourtBoard from "@/app/components/CourtBoard";
import {safeLang} from "@/lib/i18n";
export default async function CourtPage({params}:{params:Promise<{lang:string}>}){const {lang}=await params;return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-6xl"><CourtBoard lang={safeLang(lang)}/></div></main>}
