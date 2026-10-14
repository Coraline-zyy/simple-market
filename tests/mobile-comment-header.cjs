const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
test('mobile comment author and date have separately scoped header classes',()=>{
 const page=read('app/[lang]/community/[id]/page.tsx');
 assert.match(page,/comment-author-header flex items-center gap-2"><OwnerBadge userId=\{c.author_id\}/);
 assert.match(page,/comment-published-at text-xs text-zinc-500">· \{new Date\(c.created_at\)/);
 assert.ok(page.includes('commentLikes.toggle(c.id,lang)'));
});
test('rating cannot wrap and date moves below author only on mobile',()=>{
 const rules=postcss.parse(read('app/globals.css'));
 let header=false,rating=false,date=false;
 rules.walkRules(rule=>{
  if(!rule.selector.startsWith('.comment-author-header'))return;
  assert.equal(rule.parent.name,'media');assert.equal(rule.parent.params,'(max-width:767px)');
  const values=Object.fromEntries(rule.nodes.map(node=>[node.prop,node.value]));
  if(rule.selector==='.comment-author-header'){header=true;assert.equal(values['flex-direction'],'column');}
  if(rule.selector.includes('span:last-child')){rating=true;assert.equal(values['white-space'],'nowrap');assert.equal(values['flex-shrink'],'0');}
  if(rule.selector.includes('.comment-published-at')){date=true;assert.equal(values['padding-left'],'0');}
 });
 assert.ok(header&&rating&&date);
});
