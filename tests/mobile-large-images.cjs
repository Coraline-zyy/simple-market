const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
test('both halls explicitly opt into large mobile images',()=>{
 for(const kind of ['demands','services'])assert.match(read(`app/[lang]/${kind}/page.tsx`),/<PostImageGallery paths=\{it.image_paths\} compact mobileFeed \/>/);
});
test('prices are labeled in shared card markup for both desktop and mobile',()=>{
 for(const [kind,value] of [['demands','budget'],['services','price']]){
  const source=read(`app/[lang]/${kind}/page.tsx`);
  assert.ok(source.includes(`it.${value} != null && <span className="market-card-price">price: £{it.${value}}</span>`));
 }
});
test('large images still use the original full-image viewer and zoom controls',()=>{
 const gallery=read('app/components/PostImageGallery.tsx');assert.match(gallery,/mobileFeed = false/);assert.match(gallery,/onClick=\{\(\)=>open\(url\)\}/);assert.match(gallery,/aria-label="Zoom in"/);assert.match(gallery,/aria-label="Close"/);
});
test('rejected poster navigation, tabs and publish menu are absent',()=>{
 const nav=read('app/components/PrimaryNav.tsx');assert.doesNotMatch(nav,/MobileBottomNav/);
 for(const kind of ['demands','services'])assert.doesNotMatch(read(`app/[lang]/${kind}/page.tsx`),/MobileFeedTabs|MobileTradeSummary|get\("publish"\)/);
 assert.doesNotMatch(read('app/globals.css'),/poster-/);
});
