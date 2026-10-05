import HomeExperience from "@/app/components/HomeExperience";
import {safeLang} from "@/lib/i18n";
export default async function HomePage({params}:{params:Promise<{lang:string}>}){const {lang}=await params;return <HomeExperience lang={safeLang(lang)}/>}
