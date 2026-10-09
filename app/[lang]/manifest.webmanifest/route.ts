import { safeLang } from "@/lib/i18n";
import manifest from "@/app/manifest";
export async function GET(_request:Request,{params}:{params:Promise<{lang:string}>}) {
 const lang=safeLang((await params).lang),name=lang==="zh"?"有求":"youqiu";
 const value=manifest();
 return Response.json({...value,name,short_name:name,lang,start_url:`/${lang}/home?source=app`,shortcuts:value.shortcuts?.map(item=>({...item,url:item.url.replace("/en/",`/${lang}/`)}))},{headers:{"Content-Type":"application/manifest+json; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
