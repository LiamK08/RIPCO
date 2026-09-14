const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(require('node:path').join(__dirname, '../journey.js'), 'utf8');
function harness({reduced=false,saveData=false,mobile=false}={}) {
  function element(attrs={}) {
    const classes=new Set(),values={},events={};
    return {attrs,values,events,hidden:false,inert:false,
      classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n),toggle(n,on){on?classes.add(n):classes.delete(n);}},
      setAttribute:(n,v)=>attrs[n]=v,removeAttribute:n=>delete attrs[n],getAttribute:n=>attrs[n]??null,
      style:{setProperty:(n,v)=>values[n]=v},addEventListener:(n,f)=>events[n]=f,
      fire(n,e={}){if(events[n])events[n](e);}};
  }
  function video() {
    const v=element({'data-src':'desktop.mp4','data-mobile-src':'mobile.mp4'});
    Object.assign(v,{duration:12,currentTime:0,seeking:false,loaded:0,paused:true,load(){this.loaded++;},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}});
    return v;
  }
  const stage=element(),opening=element(),product=element(),journey=element(),chapters=element(),controls=element(),body=element();
  const hero=video(),closing=video(),coast=element(),coastStage=element(),play=element(),label=element(),icon=element();
  const scenes=[0,.25,.5,.91].map(p=>element({'data-scene':String(p)}));
  const turns=[-1,0,1].map(p=>element({'data-turn':String(p)}));
  const events={},docEvents={},queue=[];
  const media={matches:reduced,addEventListener(n,fn){this.change=fn;}};
  const connection={saveData,addEventListener(n,fn){this.change=fn;}};
  let near;
  class IntersectionObserver {constructor(fn){near=fn;}observe(){}disconnect(){}}
  const window={scrollY:0,matchMedia:()=>media,IntersectionObserver,requestAnimationFrame:fn=>queue.push(fn),addEventListener:(n,fn)=>events[n]=fn,scrollTo(opts){this.scrollOptions=opts;this.scrollY=opts.top;events.scroll();}};
  stage.clientWidth=mobile?390:1440;stage.offsetHeight=mobile?844:1000;
  coastStage.offsetHeight=stage.offsetHeight;
  Object.defineProperty(journey,'offsetHeight',{get:()=>journey.classList.contains('is-enhanced')?stage.offsetHeight*5.4:stage.offsetHeight});
  Object.defineProperty(coast,'offsetHeight',{get:()=>coast.classList.contains('is-enhanced')?stage.offsetHeight*1.9:stage.offsetHeight});
  journey.getBoundingClientRect=()=>({top:-window.scrollY});coast.getBoundingClientRect=()=>({top:9000-window.scrollY});
  journey.querySelector=s=>({'.cinema__stage':stage,'[data-opening]':opening,'[data-product]':product,'[data-chapters]':chapters,'[data-phone-controls]':controls,'[data-hero-film]':hero}[s]);
  journey.querySelectorAll=s=>s==='[data-scene]'?scenes:turns;
  coast.querySelector=s=>({'.coastal-film__stage':coastStage,'[data-coast-play]':play,'[data-coast-video]':closing}[s]);
  play.querySelector=s=>s==='[data-play-label]'?label:icon;
  const link=element(),target={scrollIntoView:options=>target.scrollOptions=options,focus:options=>target.focusOptions=options};
  const document={body,hidden:false,querySelector:s=>s==='[data-journey]'?journey:coast,querySelectorAll:()=>[link],getElementById:()=>target,addEventListener:(n,fn)=>docEvents[n]=fn};
  const history={replaceState(a,b,url){history.url=url;}};
  vm.runInNewContext(script,{window,document,history,navigator:{connection},IntersectionObserver,console});
  function flush(){while(queue.length)queue.shift()();}
  flush();
  function scroll(p){window.scrollY=p*(journey.offsetHeight-stage.offsetHeight);events.scroll();flush();}
  return {stage,opening,product,journey,chapters,controls,body,hero,closing,coast,coastStage,play,label,scenes,turns,events,docEvents,media,connection,window,document,link,target,history,flush,scroll,near:()=>near([{isIntersecting:true}])};
}
test('a reversible timeline reveals the real product without leaving invisible links focusable',()=>{
  const h=harness();assert.equal(h.product.inert,true);assert.equal(h.opening.inert,false);
  h.scroll(.91);assert.equal(h.product.inert,false);assert.equal(h.opening.inert,true);assert.equal(h.controls.hidden,false);assert.equal(h.scenes[3].attrs['aria-current'],'step');
  h.scroll(0);assert.equal(h.product.inert,true);assert.equal(h.opening.inert,false);assert.equal(h.controls.hidden,true);
});
test('overscroll stays bounded and the content header switches on',()=>{
  const h=harness();h.scroll(5);assert.equal(h.stage.values['--progress'],'1.0000');assert.equal(h.body.classList.contains('header-solid'),true);
  h.scroll(-1);assert.equal(h.stage.values['--progress'],'0.0000');
});
test('reduced motion removes pinning, media downloads and hidden scene controls',()=>{
  const h=harness({reduced:true});assert.equal(h.journey.classList.contains('is-enhanced'),false);assert.equal(h.coast.classList.contains('is-enhanced'),false);assert.equal(h.hero.loaded,0);h.near();assert.equal(h.closing.loaded,0);assert.equal(h.chapters.hidden,true);h.scroll(1);assert.equal(h.product.inert,true);
});
test('Save-Data uses the still-image journey without video requests',()=>{
  const h=harness({saveData:true});h.near();assert.equal(h.hero.loaded,0);assert.equal(h.closing.loaded,0);h.scroll(.91);assert.equal(h.product.inert,false);
});
test('mobile loads a smaller film and the closing film waits until nearby',()=>{
  const h=harness({mobile:true});assert.equal(h.hero.src,'mobile.mp4');assert.equal(h.closing.loaded,0);h.near();assert.equal(h.closing.src,'mobile.mp4');assert.equal(h.closing.loaded,1);
});
test('scrolling before decoding is remembered, and seeking coalesces to the newest frame',()=>{
  const h=harness();h.scroll(.25);assert.equal(h.hero.currentTime,0);h.hero.fire('loadeddata');h.flush();assert.ok(Math.abs(h.hero.currentTime-5.975)<.001);
  h.hero.seeking=true;h.scroll(.4);h.scroll(.48);assert.ok(Math.abs(h.hero.currentTime-5.975)<.001);
  h.hero.seeking=false;h.hero.fire('seeked');assert.ok(Math.abs(h.hero.currentTime-11.472)<.001);
  h.scroll(0);assert.equal(h.hero.currentTime,0);
});
test('failed media restores the poster while the app and navigation remain usable',()=>{
  const h=harness();h.hero.fire('loadeddata');h.hero.fire('error');assert.equal(h.hero.hidden,true);assert.equal(h.journey.classList.contains('film-ready'),false);h.scroll(.91);assert.equal(h.controls.hidden,false);assert.equal(h.product.inert,false);
});
test('runtime motion preference changes stop playback and reset transformations',()=>{
  const h=harness();h.hero.fire('loadeddata');h.near();h.closing.fire('loadeddata');h.scroll(.91);h.turns[2].fire('click');h.flush();h.media.matches=true;h.media.change();h.flush();
  assert.equal(h.hero.hidden,true);assert.equal(h.journey.classList.contains('film-ready'),false);assert.equal(h.stage.values['--user-turn'],'0.0000deg');assert.equal(h.opening.inert,false);assert.equal(h.play.hidden,true);
});
test('restoring data and motion preferences can load deferred media',()=>{
  const h=harness({saveData:true});h.near();h.connection.saveData=false;h.connection.change();h.flush();assert.equal(h.hero.loaded,1);assert.equal(h.closing.loaded,1);
});
test('scene controls use native scroll and expose the selected scene',()=>{
  const h=harness();h.scenes[3].fire('click');h.flush();assert.equal(h.window.scrollOptions.top,4004);assert.equal(h.window.scrollOptions.behavior,'smooth');assert.equal(h.scenes[3].attrs['aria-current'],'step');assert.equal(h.scenes[0].attrs['aria-current'],undefined);
});
test('phone controls have bounded rotation and a reliable reset',()=>{
  const h=harness();h.scroll(.91);for(let i=0;i<10;i++)h.turns[2].fire('click');h.flush();assert.equal(h.stage.values['--user-turn'],'54.0000deg');h.turns[1].fire('click');h.flush();assert.equal(h.stage.values['--user-turn'],'0.0000deg');
});
test('touch movement does not tilt the phone or interfere with native scrolling',()=>{
  const h=harness();h.scroll(.91);h.stage.fire('pointermove',{pointerType:'touch',clientX:10,clientY:10});h.flush();assert.equal(h.stage.values['--pointer-ry'],'0.0000deg');h.stage.fire('pointermove',{pointerType:'mouse',clientX:1440,clientY:500});h.flush();assert.equal(h.stage.values['--pointer-ry'],'7.0000deg');
});
test('skip bypasses the film immediately and moves keyboard focus to content',()=>{
  const h=harness();let prevented=false;h.link.fire('click',{preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(h.target.scrollOptions.behavior,'instant');assert.equal(h.target.focusOptions.preventScroll,true);assert.equal(h.history.url,'#discover');
});
test('explicit film playback pauses when scrolling or hiding the page',async()=>{
  const h=harness();h.near();h.closing.fire('loadeddata');h.play.fire('click');await Promise.resolve();assert.equal(h.closing.paused,false);assert.equal(h.label.textContent,'Pause beach film');h.events.scroll();assert.equal(h.closing.paused,true);assert.equal(h.label.textContent,'Play beach film');
  h.play.fire('click');await Promise.resolve();h.document.hidden=true;h.docEvents.visibilitychange();assert.equal(h.closing.paused,true);
});
test('a pending play promise cannot restart a film after scrolling cancels it',async()=>{
  const h=harness();h.near();h.closing.fire('loadeddata');let resolve;h.closing.play=()=>new Promise(r=>resolve=r);h.play.fire('click');h.events.scroll();h.closing.paused=false;resolve();await Promise.resolve();assert.equal(h.closing.paused,true);assert.equal(h.play.attrs['aria-pressed'],'false');
});
