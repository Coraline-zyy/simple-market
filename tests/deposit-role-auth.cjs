const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
const {depositPresentation:present}=load('lib/depositRole.ts'),{loginErrorMessage}=load('lib/authErrors.ts');
test('task publisher is exempt regardless of who initiated the conversation',()=>{
 for(const initiator of ['publisher','participant']){
  const conversation={owner_id:initiator,task_owner_id:'publisher',required_deposit:30};
  assert.equal(present('publisher',conversation.task_owner_id,conversation.required_deposit,'zh').role,'publisher');
  assert.equal(present('participant',conversation.task_owner_id,conversation.required_deposit,'zh').role,'participant');
 }
});
test('participant sees payment unavailable, not a false paid state',()=>{
 assert.equal(present('participant','publisher',30,'zh').label,'支付押金（未开通）');
 assert.equal(present('participant','publisher',30,'en').status,'Status: Payment unavailable');
});
test('zero deposit applies to both parties',()=>{
 for(const uid of ['publisher','participant'])assert.equal(present(uid,'publisher',0,'zh').role,'none');
});
test('unknown publisher, amount, or user cannot be guessed as exempt',()=>{
 for(const args of [[null,'publisher',30],['participant',null,30],['participant','publisher',null],['participant','publisher',NaN],['participant','publisher',-1]])
  assert.equal(present(...args,'zh').role,'unknown');
});
test('unified inbox fetches actual publisher for services and demands',()=>{
 const source=read('app/[lang]/me/page.tsx');
 assert.equal((source.match(/select\("id,owner_id,title,required_deposit"\)/g)||[]).length,2);
 assert.match(source,/task_owner_id:task\?\.owner_id\?\?null/);
 assert.match(source,/depositPresentation\(userId,selectedConversation\?\.task_owner_id/);
 assert.match(source,/selectedIsOwner=!!\(selectedConversation&&userId&&selectedConversation.owner_id===userId\)/);
});
test('standalone task chat uses task publisher, preserving cooperation roles',()=>{
 const source=read('app/[lang]/transactions/[id]/page.tsx');
 assert.match(source,/select\("id,owner_id,title,required_deposit"\)/);
 assert.match(source,/depositPresentation\(uid,post\?\.owner_id/);
 assert.match(source,/isOwner=!!\(conv&&uid&&conv.owner_id===uid\)/);
 assert.match(source,/setPost\(!p.error\?p.data:null\)/);
});
test('both halls show white administrator assistance copy',()=>{
 for(const file of ['app/[lang]/services/page.tsx','app/[lang]/demands/page.tsx']){
  const source=read(file);
  assert.match(source,/text-xs font-medium text-white/);
  assert.match(source,/如需交易担保或押金支付协助/);
  assert.match(source,/由管理员介入协调/);
 }
});
test('login distinguishes wrong credentials and backend throttling',()=>{
 assert.match(loginErrorMessage({code:'invalid_credentials'},'zh','失败'),/邮箱或密码错误/);
 assert.match(loginErrorMessage({status:429},'zh','失败'),/暂时限流/);
 assert.match(loginErrorMessage({code:'other',message:'Too many requests'},'en','Failed'),/temporarily rate limited/);
 assert.match(loginErrorMessage({code:'over_request_rate_limit'},'en','Failed'),/not permanently locked/);
 assert.equal(loginErrorMessage({message:'network'},'en','Failed: '),'Failed: network');
});
test('password login releases in-flight lock after either success or failure without an attempt counter',()=>{
 const source=read('app/components/AuthBox.tsx'),section=source.split('async function signInWithPassword()')[1].split('async function registerWithPassword()')[0];
 assert.match(section,/if\(authRequestLock.current\)return/);
 assert.match(section,/authRequestLock.current=true/);
 assert.match(section,/finally\s*\{\s*authRequestLock.current=false/);
 assert.doesNotMatch(section,/setTimeout|failedAttempts|attemptCount|lockUntil/);
});
