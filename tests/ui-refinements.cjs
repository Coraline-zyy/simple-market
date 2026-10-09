const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(file,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,...globals});return exports;}
const content=load('lib/communityContent.ts');
test('comments accept photos alone and still reject empty comments',()=>{
 assert.equal(content.validCommunityComment('',1),true);
 assert.equal(content.validCommunityComment('  ',1),true);
 assert.equal(content.validCommunityComment('  ',0),false);
 assert.equal(content.validCommunityComment('hello',0),true);
 assert.equal(content.validCommunityComment('x'.repeat(5001),1),false);
 assert.equal(content.validCommunityComment('',6),false);
});
test('forum posts can contain images without a body but still require a title',()=>{
 assert.equal(content.validCommunityPost('Photo','',1,false),true);
 assert.equal(content.validCommunityPost('x','',1,false),false);
 assert.equal(content.validCommunityPost('Photo','',0,false),false);
 assert.equal(content.validCommunityPost('Activity','',1,true),false);
 assert.equal(content.validCommunityPost('Activity','Details',0,true),true);
});
test('dismissal persists across reloads/navigations but resets for a new tab session',()=>{
 const values=new Map(),window={sessionStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}};
 const first=load('lib/installSession.ts',{window});assert.equal(first.isInstallDismissed(),false);first.dismissInstallPrompt();assert.equal(first.isInstallDismissed(),true);
 const nextPage=load('lib/installSession.ts',{window});assert.equal(nextPage.isInstallDismissed(),true);
 values.clear();const reopened=load('lib/installSession.ts',{window});assert.equal(reopened.isInstallDismissed(),false);
});
test('dismissal safely falls back to document memory when storage is blocked',()=>{
 const helper=load('lib/installSession.ts',{window:{sessionStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}}});
 assert.equal(helper.isInstallDismissed(),false);assert.doesNotThrow(()=>helper.dismissInstallPrompt());assert.equal(helper.isInstallDismissed(),true);
});
test('late installation events and delayed iOS timers respect dismissal',()=>{
 const source=read('app/components/AppInstall.tsx');
 assert.doesNotMatch(source,/localStorage|86400/);
 assert.match(source,/canPrompt && !isStandalone\(\) && !isInstallDismissed\(\)/);
 assert.match(source,/setTimeout\(\(\) => \{ if \(!isInstallDismissed\(\)\)/);
});
test('social list/detail support leaving, update counts from real membership and remove avatar frames',()=>{
 for(const file of ['app/components/CommunityBoard.tsx','app/[lang]/community/[id]/page.tsx']){
  const source=read(file);
  assert.match(source,/leave_community_activity/);assert.match(source,/取消参与/);assert.match(source,/bg-rose-600/);
  assert.doesNotMatch(source,/border-2 border-\[#11131e\]/);
  assert.doesNotMatch(source,/ids.unshift|participantIds.unshift/);
  assert.match(source,/participationLock.current=true/);
 }
});
test('leave migration can delete only the signed-in user membership',()=>{
 const sql=read('supabase/2026_10_09_image_comments_activity_leave.sql');
 assert.match(sql,/if me is null then raise exception/);
 assert.match(sql,/delete from public.community_participants where post_id=p_post and user_id=me/);
 assert.match(sql,/revoke all on function public.leave_community_activity\(uuid\) from public,anon/);
 assert.match(sql,/cardinality\(image_paths\)>0/);
});
test('task details remove owner information and redirect helper, preserving chat initiation',()=>{
 for(const file of ['app/[lang]/services/[id]/page.tsx','app/[lang]/demands/[id]/page.tsx']){
  const source=read(file);
  assert.doesNotMatch(source,/ownerCard|发布者信息|Will redirect|会自动跳转|发起聊天 \/ 去对话框/);
  assert.match(source,/onClick=\{startChat\}/);
  assert.match(source,/"发起聊天" : "Start chat"/);
 }
});
test('price fields state GBP and no task display uses a yuan symbol',()=>{
 const i18n=read('lib/i18n.ts');assert.match(i18n,/pricePlaceholder: "价格（GBP，可选）"/);assert.match(i18n,/pricePlaceholder: "Price \(GBP, optional\)"/);
 for(const file of ['app/[lang]/services/page.tsx','app/[lang]/demands/page.tsx','app/[lang]/services/[id]/page.tsx','app/[lang]/demands/[id]/page.tsx','app/[lang]/users/[id]/posts/page.tsx'])assert.doesNotMatch(read(file),/¥/);
});
test('this migration does not modify deposit roles, amounts or payment state',()=>{
 const sql=read('supabase/2026_10_09_image_comments_activity_leave.sql');
 assert.doesNotMatch(sql,/required_deposit|conversations|deals|deposit_paid|owner_id/);
});
