const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('both task chat entry points and their modals use the same guarantee copy',()=>{
 for(const file of ['app/[lang]/me/page.tsx','app/[lang]/transactions/[id]/page.tsx']){
  const source=read(file);
  assert.match(source,/import \{guaranteeCopy\} from "@\/lib\/guaranteeCopy"/);
  assert.equal(source.split('{guaranteeCopy[lang].notice}').length-1,2);
  assert.match(source,/guaranteeCopy\[lang\]\.preview/);
  assert.match(source,/guaranteeCopy\[lang\]\.confirmation/);
  assert.doesNotMatch(source,/正式开通后，对应款项将转入合规的托管账户/);
 }
});
test('copy explains verified designated accounts without claiming automatic payment',()=>{
 const source=read('lib/guaranteeCopy.ts');
 for(const phrase of ['双方确认的指定账户','请勿向未经确认的账户转账','不会扣款、转账','不代表款项已到账或管理员已接受担保','网站不会自动转付或退款'])assert.ok(source.includes(phrase));
});
