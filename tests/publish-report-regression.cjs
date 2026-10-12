const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;

function publisher(kind,uploadFailure=false){
  const source=read(`app/[lang]/${kind}/page.tsx`);
  const handler=source.slice(source.indexOf('  async function submit('),source.indexOf('  async function loadContact('));
  const statuses=[];let inserts=0,imagesCleared=false,busy=false;
  const ctx={title:'Regression test',description:'',category:'其他',budget:'',price:'',requiredDeposit:'0',lang:'zh',taskTime:{},ANY_TIME:{},imageFiles:uploadFailure?[{}]:[],submittingRef:{current:false},
    t:{demandsHall:{form:{needEmail:'need email'}},servicesHall:{publishOk:'Posted',publishFail:'Failed',needEmailToPublish:'need email'}},
    supabase:{auth:{getUser:async()=>({data:{user:{id:'mock-user',email:'test@example.invalid'}}})},from:()=>({insert:()=>({select:()=>({maybeSingle:async()=>({data:{id:String(++inserts)},error:null})})})})},
    timePayload:()=>({}),uploadPostImages:async()=>{throw Error('Synthetic upload failure');},normalizeDemand:row=>row,normalizeService:row=>row,
    setStatusMsg:value=>statuses.push(value),setStatus:value=>statuses.push(value),setImageFiles:files=>{imagesCleared=files.length===0;},setSubmitting:value=>{busy=value;}};
  for(const name of ['setItems','setTitle','setDescription','setCategory','setBudget','setPrice','setRequiredDeposit','setTaskTime','setShowPublish'])ctx[name]=()=>{};
  const submit=new Function(...Object.keys(ctx),compile(handler)+';return submit;')(...Object.values(ctx));
  return {submit,ctx,statuses,inserts:()=>inserts,imagesCleared:()=>imagesCleared,busy:()=>busy};
}
for(const kind of ['demands','services']){
  test(`${kind}: concurrent submit inserts once and releases lock`,async()=>{
    const p=publisher(kind);await Promise.all([p.submit({preventDefault(){}}),p.submit({preventDefault(){}})]);
    assert.equal(p.inserts(),1);assert.equal(p.ctx.submittingRef.current,false);assert.equal(p.busy(),false);
    await p.submit({preventDefault(){}});assert.equal(p.inserts(),2);
  });
  test(`${kind}: upload failure stays visible and selected images are cleared`,async()=>{
    const p=publisher(kind,true);await p.submit({preventDefault(){}});
    assert.match(p.statuses.at(-1),/发布成功，但图片上传失败：Synthetic upload failure/);
    assert.equal(p.imagesCleared(),true);assert.equal(p.busy(),false);
  });
  test(`${kind}: authentication exception releases lock for retry`,async()=>{
    const p=publisher(kind);p.ctx.supabase.auth.getUser=async()=>{throw Error('Synthetic auth failure');};
    await p.submit({preventDefault(){}});assert.equal(p.ctx.submittingRef.current,false);assert.equal(p.busy(),false);assert.match(p.statuses.at(-1),/Synthetic auth failure/);
  });
}

for(const outcome of ['throw','timeout','non-ok','ok']){
  test(`saved report remains successful when mail is ${outcome}`,async()=>{
    let inserts=0;
    const api={auth:{getUser:async()=>({data:{user:{id:'mock-user'}},error:null})},from:()=>({insert:()=>{inserts++;return {select:()=>({single:async()=>({data:{id:'mock-report',created_at:'mock-time'},error:null})})};}})};
    const exports={};
    vm.runInNewContext(compile(read('app/api/reports/route.ts')),{exports,AbortSignal,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'mock-url',NEXT_PUBLIC_SUPABASE_ANON_KEY:'mock-key',RESEND_API_KEY:'mock-key',REPORT_TO_EMAIL:'test@example.invalid'}},fetch:async(_url,options)=>{assert.ok(options.signal);if(outcome==='throw'||outcome==='timeout')throw Error(outcome);return {ok:outcome==='ok'};},require:name=>name==='next/server'?{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}}:{createClient:()=>api}});
    const result=await exports.POST({headers:{get:()=> 'Bearer mock-token'},json:async()=>({description:'Isolated regression report test'})});
    assert.equal(inserts,1);assert.equal(result.status,200);assert.equal(result.body.ok,true);assert.equal(result.body.emailSent,outcome==='ok');
  });
}
