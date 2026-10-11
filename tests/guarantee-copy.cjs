const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('task chat entry points remove long inline copy but retain payment clarification',()=>{
 for(const file of ['app/[lang]/me/page.tsx','app/[lang]/transactions/[id]/page.tsx']){
  const source=read(file);
  assert.match(source,/import \{guaranteeCopy\} from "@\/lib\/guaranteeCopy"/);
  assert.equal(source.split('{guaranteeCopy[lang].notice}').length-1,0);
  assert.match(source,/guaranteeCopy\[lang\]\.preview/);
  assert.match(source,/guaranteeCopy\[lang\]\.confirmation/);
  assert.doesNotMatch(source,/正式开通后，对应款项将转入合规的托管账户/);
 }
});
test('transaction guidance is centralized with persistent suppression and manual footer access',()=>{
 const modal=read('app/components/TradeNoticeModal.tsx'),footer=read('app/components/SiteFooter.tsx'),layout=read('app/[lang]/layout.tsx'),me=read('app/[lang]/me/page.tsx');
 assert.match(modal,/guaranteeCopy\[L\]\.notice/);assert.match(modal,/localStorage\.setItem\(HIDE_KEY,"1"\)/);assert.match(modal,/localStorage\.removeItem\(HIDE_KEY\)/);assert.match(modal,/pathname\.includes\("\/transactions\/"\)/);
 assert.match(modal,/addEventListener\(OPEN_TRADE_NOTICE,manual\)/);assert.match(modal,/addEventListener\(AUTO_TRADE_NOTICE,automatic\)/);assert.match(modal,/不再提醒/);
 assert.match(footer,/OPEN_TRADE_NOTICE/);assert.match(footer,/交易注意事项/);assert.match(layout,/<TradeNoticeModal lang=\{L\} \/>/);assert.match(me,/dispatchEvent\(new Event\(AUTO_TRADE_NOTICE\)\)/);
});
test('standalone chat gets a stable larger history region and resizable composer',()=>{
 const source=read('app/[lang]/transactions/[id]/page.tsx');assert.ok(source.includes('h-[clamp(280px,42vh,520px)]'));assert.ok(source.includes('min-h-[112px] sm:min-h-[128px]'));assert.match(source,/rows=\{4\}/);
});
test('both halls show the requested larger offline payment sentence',()=>{
 for(const file of ['app/[lang]/demands/page.tsx','app/[lang]/services/page.tsx']){const source=read(file);assert.ok(source.includes('我们鼓励用户线下银行转账或现金交易。'));assert.ok(source.includes('mt-2 block text-sm font-semibold sm:text-base'))}
});
test('copy explains verified designated accounts without claiming automatic payment',()=>{
 const source=read('lib/guaranteeCopy.ts');
 for(const phrase of ['双方确认的指定账户','请勿向未经确认的账户转账','不会扣款、转账','不代表款项已到账或管理员已接受担保','网站不会自动转付或退款'])assert.ok(source.includes(phrase));
});
