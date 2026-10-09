const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function compile(file,imports={},extra={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
 {exports,URL,Response,Buffer,AbortSignal,process:{env:{}},console,require:name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name)},...extra});
 return exports;
}
const mail=compile('lib/messageEmail.ts');
const event={id:'event',email:'test@example.com',language:'en',sender:'Alice',kind:'direct',thread_id:'thread'};
test('private notification preserves the Claude direct-thread routing',()=>{
 const payload=mail.messageEmailPayload(event,'https://example.com/path','sender');
 const link=payload.text.match(/https:\/\/[^\s]+/)[0],url=new URL(link);
 assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,'/en/me');assert.equal(url.searchParams.get('dm'),'direct:thread');
 assert.match(payload.text,/does not contain the message/);assert.match(payload.text,/中文/);
});
test('admin and task links open their correct existing inbox entries',()=>{
 for(const kind of ['admin','task']){
  const payload=mail.messageEmailPayload({...event,kind,language:'zh'},'https://example.com','sender');
  const url=new URL(payload.text.match(/https:\/\/[^\s]+/)[0]);
  assert.equal(url.pathname,'/zh/me');
  assert.equal(url.searchParams.get(kind==='task'?'conv':'dm'),kind==='task'?'thread':'admin:thread');
 }
});
test('email links reject unsafe non-HTTPS production origins',()=>{
 for(const site of ['javascript:alert(1)','http://example.com'])assert.throws(()=>mail.messageEmailPayload(event,site,'sender'));
});
const sql=read('supabase/2026_10_08_audited_chat_update.sql');
test('read receipts authorize participants and update only loaded IDs',()=>{
 const part=sql.slice(sql.indexOf('create or replace function public.mark_loaded_chat_read'),sql.indexOf('-- A sender cannot'));
 assert.equal((part.match(/id=any\(p_ids\)/g)||[]).length,3);
 assert.equal((part.match(/Conversation not found/g)||[]).length,3);
 assert.match(part,/cardinality\(p_ids\)/);
 assert.match(part,/revoke all .* from public,anon/);
});
test('outbox is durable, service-only, and atomically reserves deliveries',()=>{
 assert.match(sql,/create trigger direct_message_email after insert/);
 assert.match(sql,/create trigger private_message_email after insert/);
 assert.match(sql,/create trigger task_message_email after insert/);
 assert.match(sql,/revoke all on public.message_email_outbox,public.message_email_delivery from public,anon,authenticated/);
 assert.match(sql,/select \* into d .* for update/);
 assert.match(sql,/lease_until>now\(\)/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/interval '10 minutes'/);
 assert.match(sql,/e.created_at<now\(\)-interval '24 hours'/);
});
test('administrator badges never trust the message body',()=>{
 for(const file of ['app/[lang]/me/page.tsx','app/[lang]/transactions/[id]/page.tsx']){
  const source=read(file);
  assert.doesNotMatch(source,/content\.startsWith\("(?:管理员|Administrator)/);
  assert.match(source,/is_market_admin_user/);
 }
 assert.match(read('app/components/PrivateChatPanel.tsx'),/verifiedAdmins.includes\(m.sender_id\)/);
});
test('latest task history is selected before reversing to chronological order',()=>{
 const source=read('app/[lang]/me/page.tsx');
 assert.match(source,/order\("created_at", \{ ascending: false \}\).order\("id", \{ ascending: false \}\)\s*\.limit\(500\)/);
 assert.match(source,/selectedView.current.tab !== "chat"/);
 assert.match(source,/document.visibilityState !== "visible"/);
 assert.match(source,/request !== messageSequence.current/);
 assert.match(read('app/components/PrivateChatPanel.tsx'),/document.visibilityState === "visible"/);
});
test('PWA only clears its own caches and does not cache private page HTML',()=>{
 const sw=read('public/sw.js');
 assert.match(sw,/k.startsWith\("youqiu-"\)/);
 assert.match(sw,/url.pathname.startsWith\("\/api\/"\)\) return/);
 assert.match(sw,/fetch\(req\).catch\(\(\) => caches.match\(OFFLINE_URL\)\)/);
 assert.doesNotMatch(sw,/cache\.put\(req/);
});
test('PWA icons are actual PNG files of the advertised dimensions',()=>{
 for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180]]){
  const data=fs.readFileSync(path.join(root,'public/icons',file));
  assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);assert.equal(data.toString('ascii',1,4),'PNG');
 }
});
function api({valid=true,rows=[{id:'event'}],env={}}={}){
 const delivered=[];
 const query={select(){return this},eq(){return this},limit:async()=>({data:rows,error:null})};
 const client={auth:{getUser:async()=>({data:{user:valid?{id:'sender'}:null},error:valid?null:{}})},from:()=>query};
 const route=compile('app/api/message-notify/route.ts',{
  'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status||200})}},
  '@/lib/messageDelivery':{notificationClient:()=>client,deliverMessageEmail:async id=>{delivered.push(id)}}
 },{process:{env}});
 const request=(body,token='Bearer token')=>({headers:{get:()=>token},text:async()=>JSON.stringify(body)});
 return {route,request,delivered};
}
const id='11111111-1111-4111-8111-111111111111';
test('notification wake-up rejects unauthenticated requests without delivering',async()=>{
 const h=api({valid:false});assert.equal((await h.route.POST(h.request({kind:'direct',messageId:id}))).status,401);assert.equal(h.delivered.length,0);
});
test('notification wake-up cannot invent recipients or deliver another sender events',async()=>{
 const h=api({rows:[]});const r=await h.route.POST(h.request({kind:'direct',messageId:id,recipient:'victim'}));assert.equal(r.status,200);assert.equal(h.delivered.length,0);
});
test('invalid notification kinds and IDs are rejected',async()=>{
 const h=api();assert.equal((await h.route.POST(h.request({kind:'invalid',messageId:id}))).status,400);
 assert.equal((await h.route.POST(h.request({kind:'task',messageId:'bad'}))).status,400);
});
test('valid wake-ups use the server-owned outbox and previews cannot send mail',async()=>{
 const h=api();assert.equal((await h.route.POST(h.request({kind:'direct',messageId:id}))).status,200);assert.deepEqual(h.delivered,['event']);
 const preview=api({env:{VERCEL_ENV:'preview'}});await preview.route.POST(preview.request({kind:'direct',messageId:id}));assert.equal(preview.delivered.length,0);
});
test('worker uses stable idempotency keys and finite network timeouts',()=>{
 const source=read('lib/messageDelivery.ts');
 assert.match(source,/"Idempotency-Key": \x60message\/\$\{id\}\x60/);
 assert.match(source,/AbortSignal.timeout\(15000\)/);
 assert.match(read('app/api/message-notifications/route.ts'),/timingSafeEqual/);
});
