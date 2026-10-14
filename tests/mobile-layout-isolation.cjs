const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const postcss=require('postcss');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const hash=value=>createHash('sha256').update(value.trimEnd()).digest('hex');
test('original animation and navigation markup remain byte-equivalent',()=>{
 assert.equal(hash(read('app/components/HomeExperience.tsx')),'963f9daa149087e8da67480a8367637e7e0319f6fb27eacb6f5fcceda67bd1a9');
 assert.equal(hash(read('app/components/PrimaryNav.tsx')),'52394a6c5ad6fee8167871fcdea828135506c42d22354a8f0e40cb6fa8876628');
});
test('original CSS is untouched; visible layout changes are mobile-only',()=>{
 const css=read('app/globals.css'),marker='/* Mobile layout experiment:',boundary=css.indexOf(marker);
 assert.ok(boundary>0);
 assert.equal(hash(css.slice(0,boundary)),'e0dd801829cdd08493de2c824e1f2c89eba2af68c2e23fe75dbc445429f71e5c');
 const extra=postcss.parse(css.slice(boundary));
 const rules=extra.nodes.filter(node=>node.type!=='comment');
 assert.equal(rules.length,4);
 assert.equal(rules[0].selector,'.mobile-filter-toggle');assert.equal(rules[0].nodes[0].value,'none');
 assert.equal(rules[1].selector,'.hall-optional-filters');assert.equal(rules[1].nodes[0].value,'contents');
 assert.equal(rules[2].name,'media');assert.equal(rules[2].params,'(max-width:767px)');
 assert.equal(rules[3].name,'media');assert.equal(rules[3].params,'(max-width:767px)');
});
test('both halls keep original filters and callbacks inside mobile disclosure',()=>{
 for(const kind of ['demands','services']){
  const page=read(`app/[lang]/${kind}/page.tsx`);
  assert.match(page,/<MobileHallFilters lang=\{lang\}/);
  assert.match(page,/onChange=\{\(e\) => setFilterCategory\(e\.target\.value\)\}/);
  assert.match(page,/<TaskTimeFields value=\{timeRange\} onChange=\{setTimeRange\}/);
  assert.match(page,/onClick=\{load\}/);
 }
});
test('mobile filter disclosure exposes expanded state and preserves mounted values',()=>{
 const component=read('app/components/MobileHallFilters.tsx');
 assert.match(component,/aria-expanded=\{open\}/);assert.match(component,/aria-controls=\{id\}/);
 assert.match(component,/data-open=\{open\}>\{children\}/);
});
