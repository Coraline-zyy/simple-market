const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function mount({mobile=true,reduced=false}={}){
 const handlers={},refs=[],states=[],effects=[],scrolls=[],cleanups=[];
 const window={scrollY:0,innerHeight:852,matchMedia:q=>({matches:q.includes('max-width')?mobile:q.includes('reduced-motion')?reduced:false}),scrollTo:o=>scrolls.push(o),addEventListener:(n,f)=>handlers[n]=f,removeEventListener:(n,f)=>{if(handlers[n]===f)delete handlers[n]},setInterval:()=>1,clearInterval(){},setTimeout:()=>1};
 const react={useCallback:f=>f,useRef:value=>{const ref={current:value};refs.push(ref);return ref},useState:value=>{const index=states.length;states.push(value);return[value,v=>states[index]=v]},useEffect:f=>effects.push(f)};
 const exports={};const code=ts.transpileModule(read('app/components/HomeExperience.tsx'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,window,document:{documentElement:{scrollHeight:1500}},performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},clearInterval(){},clearTimeout(){},require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}:{default:()=>null,PlatformNotice:()=>null}});
 exports.default({lang:'zh'});refs[1].current={getBoundingClientRect:()=>({top:800})};for(const f of effects){const cleanup=f();if(cleanup)cleanups.push(cleanup)}scrolls.length=0;
 const touch=(x,y,interactive=false)=>({touches:[{clientX:x,clientY:y}],target:{closest:()=>interactive?{}:null}});
 return{handlers,states,scrolls,window,touch,unmount:()=>cleanups.forEach(f=>f())};
}
test('upward finger swipe reveals modules and scrolls only after release',()=>{
 const h=mount();h.handlers.touchstart(h.touch(100,500));h.handlers.touchmove(h.touch(104,440));assert.equal(h.states[1],true);assert.equal(h.scrolls.length,0);h.handlers.touchend();assert.equal(h.scrolls.length,1);assert.equal(h.scrolls[0].behavior,'smooth');h.unmount();assert.equal(Object.keys(h.handlers).length,0);
});
test('native scroll reveals modules without programmatic scroll',()=>{const h=mount();h.window.scrollY=30;h.handlers.scroll();assert.equal(h.states[1],true);assert.equal(h.scrolls.length,0)});
test('horizontal, downward, cancelled and interactive gestures do not explore',()=>{
 for(const [x,y,interactive,cancel] of [[170,490,false,false],[100,560,false,false],[100,430,true,false],[100,430,false,true]]){const h=mount();h.handlers.touchstart(h.touch(100,500,interactive));h.handlers.touchmove(h.touch(x,y));if(cancel)h.handlers.touchcancel();else h.handlers.touchend();assert.equal(h.scrolls.length,0)}
});
test('desktop gestures do not reveal; reduced motion avoids smooth scroll',()=>{
 const desktop=mount({mobile:false});desktop.handlers.touchstart(desktop.touch(100,500));desktop.handlers.touchmove(desktop.touch(100,430));desktop.handlers.touchend();assert.equal(desktop.states[1],false);
 const h=mount({reduced:true});h.handlers.touchstart(h.touch(100,500));h.handlers.touchmove(h.touch(100,430));h.handlers.touchend();assert.equal(h.scrolls[0].behavior,'instant');
});
test('mobile layouts use compact grids and lightweight animations',()=>{const css=read('app/globals.css');assert.match(css,/\.hall-filter-grid \{ grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);assert.match(css,/\.workspace-tabs \{ display:grid; grid-template-columns:repeat\(3/);assert.match(css,/\.home-glow \{ display:none/);assert.match(css,/transition:opacity 200ms ease,transform 200ms ease/);assert.doesNotMatch(read('app/components/HomeExperience.tsx'),/transition-all|duration-\[1200ms\]/)});
