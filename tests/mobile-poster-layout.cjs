const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
test('poster navigation preserves messages unread badge and existing inbox/profile routes',()=>{
 const source=read('app/components/MobileBottomNav.tsx');
 assert.match(source,/me\?tab=chat/);assert.match(source,/UnreadBadge count=\{unread\}/);
 assert.match(source,/href=\{`\/\$\{lang\}\/me`\}/);
 assert.match(source,/search.get\("tab"\)===\"chat\"/);
});
test('all four publication choices open the existing publisher, not placeholder actions',()=>{
 const nav=read('app/components/MobileBottomNav.tsx');
 assert.match(nav,/\?publish=1/);
 for(const route of ['demands','services','social','forum'])assert.ok(nav.includes(`"${route}"`));
 for(const kind of ['demands','services'])assert.match(read(`app/[lang]/${kind}/page.tsx`),/get\("publish"\)===\"1\"\)setShowPublish\(true\)/);
 assert.match(read('app/components/CommunityBoard.tsx'),/get\("publish"\)===\"1\"\)setOpen\(true\)/);
});
test('existing community likes, comments, joining, reporting and image viewer remain wired',()=>{
 const board=read('app/components/CommunityBoard.tsx');
 for(const token of ['likes.toggle(row.id,lang)','row.comment_count','onClick={event=>join(event,row)}','ContentActions kind="community_post"','PostImageGallery paths={row.image_paths}'])assert.ok(board.includes(token));
 const gallery=read('app/components/PostImageGallery.tsx');assert.match(gallery,/Open full-size image/);assert.match(gallery,/Zoom in/);
});
test('transaction copy remains available behind a mobile details control',()=>{
 const summary=read('app/components/MobileTradeSummary.tsx');assert.match(summary,/<details/);assert.match(summary,/我们鼓励用户线下银行转账或现金交易/);assert.match(summary,/需要担保/);
});
