import AuthBox from "@/app/components/AuthBox";
import { safeLang } from "@/lib/i18n";
export default async function LoginPage({params}:{params:Promise<{lang:string}>}) {
  const {lang}=await params;
  const L=safeLang(lang);
  return <main className="flex flex-1 items-center justify-center bg-[#080a12] px-5 py-4"><div className="w-full max-w-lg"><h1 className="mb-6 text-center text-white"><span className="block text-4xl font-black tracking-tight sm:whitespace-nowrap sm:text-5xl">{L === "zh" ? "有求必应" : "Ask and someone will answer"}</span><span className="mt-4 block text-base font-normal text-zinc-400 sm:whitespace-nowrap sm:text-lg">{L === "zh" ? "总会有人能满足你的需求" : "There is always someone who can meet your needs"}</span></h1><AuthBox lang={L} redirectAfterLogin={`/${L}/home`} forceLoginForm /></div></main>;
}
