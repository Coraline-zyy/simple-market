import CourtCaseView from "@/app/components/CourtCaseView";
import {safeLang} from "@/lib/i18n";
export default async function CasePage({params}:{params:Promise<{lang:string;id:string}>}){const {lang,id}=await params;return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-5xl"><CourtCaseView id={id} lang={safeLang(lang)}/></div></main>}
