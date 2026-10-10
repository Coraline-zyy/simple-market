const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,Intl,Date});return exports;}
const time=load('lib/taskTime.ts'),{publicationGroup}=load('lib/workflowOwnership.ts');
test('activity writes only columns defined by its scheduling migration',()=>{
 const sql=read('supabase/2026_social_participation.sql');
 const payload=time.activityTimePayload({...time.ANY_TIME,timezone:'Europe/London'});
 assert.equal(Object.keys(payload).length,6);
 for(const key of Object.keys(payload))assert.ok(sql.includes('add column if not exists '+key),key);
 for(const key of ['task_starts_at','task_ends_at','task_date_only'])assert.equal(key in payload,false);
 assert.equal(payload.task_schedule_v2,true);assert.equal(payload.task_date_from,null);
});
test('activity dates, overnight hours and timezone retain shared validation',()=>{
 const range={dates:true,times:true,dateFrom:'2026-10-12',dateTo:'2026-10-13',timeFrom:'23:00',timeTo:'01:00',timezone:'Europe/London'};
 const payload=time.activityTimePayload(range);
 assert.equal(payload.task_date_from,range.dateFrom);assert.equal(payload.task_time_to,'01:00');assert.equal(payload.task_timezone,range.timezone);
 assert.throws(()=>time.activityTimePayload({...range,dateTo:'2026-10-11'}));
 assert.throws(()=>time.activityTimePayload({...range,timeTo:'23:00'}));
 assert.throws(()=>time.activityTimePayload({...range,timezone:'invalid-zone'}));
});
test('activity form uses activity-only payload while task payload stays unchanged',()=>{
 assert.match(read('app/components/CommunityBoard.tsx'),/social\?activityTimePayload\(taskTime\):\{\}/);
 assert.equal(time.timePayload({...time.ANY_TIME,timezone:'UTC'}).task_date_only,false);
});
test('completed ownership follows actual publisher regardless of chat initiator',()=>{
 for(const initiator of ['publisher','participant']){
  const conversation={owner_id:initiator,publisher_id:'publisher'};
  assert.equal(publicationGroup('publisher',conversation.publisher_id),'mine');
  assert.equal(publicationGroup('participant',conversation.publisher_id),'theirs');
 }
 assert.equal(publicationGroup('participant',null),'unknown');assert.equal(publicationGroup(null,'publisher'),'unknown');
 const source=read('app/components/WorkflowPanel.tsx');
 assert.match(source,/select\("title,owner_id"\)/);assert.match(source,/publisher_id:p.data\?\.owner_id\?\?null/);
 assert.doesNotMatch(source,/r\.owner_id===userId|r\.owner_id!==userId/);
 assert.match(source,/publicationGroup\(userId,r.publisher_id\)/);
});
