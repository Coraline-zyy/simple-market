const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('app/components/AdminDeleteButton.tsx');
function harness(overrides={}){
 let calls=[],deleted=0,errors=[];
 const ctx={admin:true,open:true,reason:'Test moderation reason',kind:'comment',id:'test-id',lock:{current:false},supabase:{rpc:async(name,args)=>{calls.push({name,args});return {error:null};}},setBusy:()=>{},setError:value=>errors.push(value),setOpen:()=>{},onDeleted:()=>deleted++,window:{location:{reload:()=>assert.fail('Callback should refresh comments')}} ,...overrides};
 const handler=source.slice(source.indexOf(' async function remove(){'),source.indexOf(' return <span'));
 const compiled=ts.transpileModule(handler,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 return {remove:new Function(...Object.keys(ctx),compiled+';return remove;')(...Object.values(ctx)),calls,ctx,deleted:()=>deleted,errors};
}
test('administrator comment deletion uses existing audited RPC and explicit confirmation',async()=>{
 const h=harness();await h.remove();assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'admin_permanently_delete_content');assert.equal(h.calls[0].args.p_confirmation,'PERMANENT DELETE');assert.equal(h.calls[0].args.p_kind,'comment');assert.equal(h.deleted(),1);assert.equal(h.ctx.lock.current,false);
});
test('ordinary users and closed confirmation cannot issue admin writes',async()=>{
 for(const values of [{admin:false},{open:false},{lock:{current:true}}]){const h=harness(values);await h.remove();assert.equal(h.calls.length,0);}
});
test('deletion needs no reason input and supplies default audit description',async()=>{
 const h=harness();await h.remove();assert.ok(h.calls[0].args.p_reason.length>=3);assert.doesNotMatch(source,/<textarea|setReason/);
});
test('rapid confirmation clicks issue one admin deletion',async()=>{
 const h=harness();await Promise.all([h.remove(),h.remove()]);assert.equal(h.calls.length,1);
});
test('failed deletion retains content and releases lock',async()=>{
 const h=harness({supabase:{rpc:async()=>({error:{message:'Administrator only'}})}});await h.remove();assert.equal(h.deleted(),0);assert.equal(h.ctx.lock.current,false);assert.equal(h.errors.at(-1),'Administrator only');
});
test('server rechecks role, records audit and validates permanent deletion',()=>{
 const sql=read('supabase/2026_super_admin_permanent_delete.sql');assert.match(sql,/if not \(public\.is_market_admin\(\) or public\.is_platform_owner\(\)\)/);assert.match(sql,/insert into public\.admin_actions/);assert.match(sql,/p_confirmation is distinct from 'PERMANENT DELETE'/);
 assert.match(read('app/components/AdminPin.tsx'),/<AdminDeleteButton admin=\{admin\} kind=\{kind\}/);
 assert.match(read('app/components/ContentActions.tsx'),/kind==="comment"&&<AdminDeleteButton/);
});
