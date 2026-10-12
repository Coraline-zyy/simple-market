const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('other posts follows arbitration and uses the dedicated author-scoped manager',()=>{
 const me=read('app/[lang]/me/page.tsx'),manager=read('app/components/MyCommunityPosts.tsx');
 assert.ok(me.indexOf('"其他发布"')>me.indexOf('"仲裁中"'));assert.match(me,/tab==="other"&&<MyCommunityPosts/);
 assert.match(manager,/\.eq\("author_id",userId\)/);assert.match(manager,/\.eq\("reviewer_id",userId\)/);
 assert.match(manager,/activityTimePayload\(time\)/);assert.match(manager,/image_paths:\[\.\.\.editing.image_paths,\.\.\.paths\]/);
 assert.match(manager,/\.eq\("id",editing.id\)\.eq\("author_id",userId\)\.select\("id"\)\.single/);
});
test('deletion is explicitly confirmed and enforced by actual author in the database',()=>{
 const ui=read('app/components/ContentActions.tsx'),sql=read('supabase/2026_10_12_content_management.sql');
 assert.match(ui,/if\(busy\|\|!mine\)return/);assert.match(ui,/window.confirm\(warning\)/);assert.match(ui,/delete_my_content/);
 assert.match(sql,/me uuid:=auth.uid\(\)/);assert.match(sql,/author_id=me and not moderation_deleted/);assert.match(sql,/reviewer_id=me/);assert.match(sql,/removed<>1/);assert.match(sql,/grant execute.*to authenticated/);
 assert.doesNotMatch(sql,/delete from public\.[a-z_]+;/);
});
test('content reports resolve real authors and preserve the precise target and snapshot',()=>{
 const api=read('app/api/reports/route.ts');
 assert.match(api,/Object.hasOwn\(targets,kind\)/);assert.match(api,/reportedUserId=snapshot\[target.author\]/);assert.match(api,/content_snapshot:snapshot/);assert.match(api,/You cannot report your own content/);
 for(const kind of ['community_post','comment','review'])assert.ok(api.includes(kind+': {table:'));
});
test('comments, reviews and public community cards expose the correct actions and title is renamed',()=>{
 const detail=read('app/[lang]/community/[id]/page.tsx');assert.match(detail,/<ContentActions kind="comment"/);assert.match(detail,/<ContentActions kind="community_post"/);
 assert.match(read('app/components/ProfileReviews.tsx'),/<ContentActions kind="review"/);
 assert.match(read('app/components/CommunityBoard.tsx'),/row.author_id!==uid&&<ContentActions/);
 assert.doesNotMatch(read('lib/i18n.ts'),/我的发布 \/ 对话|My Posts \/ Chats/);
 assert.match(read('app/components/ReportButton.tsx'),/data-card-interactive role="dialog"/);
});
