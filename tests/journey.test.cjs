const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(require('node:path').join(__dirname, '../journey.js'), 'utf8');

function harness(reduced = false) {
  const element = () => {
    const classes = new Set(), attrs = {}, values = {};
    return {
      attrs, values, inert: false,
      classList: { add: n => classes.add(n), remove: n => classes.delete(n), contains: n => classes.has(n), toggle(n, yes) { yes ? classes.add(n) : classes.delete(n); } },
      setAttribute: (n,v) => attrs[n]=v, getAttribute: n => attrs[n] || null,
      style: { setProperty: (n,v) => values[n]=v }
    };
  };
  const stage=element(), opening=element(), product=element(), body=element(), journey=element();
  const chapters=[element(),element(),element()], events={}, links={};
  const media={matches:reduced, addEventListener(n,fn){ this.change=fn; }};
  const window={scrollY:0, matchMedia:()=>media, requestAnimationFrame:fn=>fn(), addEventListener:(n,fn)=>events[n]=fn};
  stage.offsetHeight=1000;
  Object.defineProperty(journey,'offsetHeight',{get:()=>journey.classList.contains('is-enhanced')?3300:1000});
  journey.getBoundingClientRect=()=>({top:-window.scrollY});
  journey.querySelector=s=>({'.journey__stage':stage,'[data-opening]':opening,'[data-product]':product}[s]);
  journey.querySelectorAll=()=>chapters;
  const target={scrollIntoView:options=>target.scrollOptions=options,focus:options=>target.focusOptions=options};
  const document={body,querySelector:()=>journey,querySelectorAll:()=>[{addEventListener:(n,fn)=>links[n]=fn}],getElementById:()=>target};
  const history={replaceState(a,b,url){history.url=url;}};
  vm.runInNewContext(script,{window,document,history,navigator:{},console});
  return {stage,opening,product,body,journey,chapters,window,media,events,links,target,history};
}
test('scroll reveals the app and reverses back to the opening',()=>{
  const h=harness();
  assert.equal(h.product.inert,true);
  assert.equal(h.opening.inert,false);
  h.window.scrollY=2200;h.events.scroll();
  assert.equal(h.product.inert,false);
  assert.equal(h.opening.inert,true);
  assert.equal(h.chapters[2].classList.contains('is-active'),true);
  h.window.scrollY=0;h.events.scroll();
  assert.equal(h.product.inert,true);
  assert.equal(h.opening.inert,false);
  assert.equal(h.stage.values['--progress'],'0.0000');
});
test('reduced motion has no pinned scroll distance and hides inactive app controls',()=>{
  const h=harness(true);
  assert.equal(h.journey.classList.contains('is-enhanced'),false);
  h.window.scrollY=500;h.events.scroll();
  assert.equal(h.stage.values['--progress'],'0.0000');
  assert.equal(h.product.inert,true);
  assert.equal(h.opening.inert,false);
});
test('changing the system motion preference resets a partially scrolled sequence',()=>{
  const h=harness();h.window.scrollY=1900;h.events.scroll();
  h.media.matches=true;h.media.change();
  assert.equal(h.journey.classList.contains('is-enhanced'),false);
  assert.equal(h.stage.values['--landscape-scale'],'1.0000');
  assert.equal(h.opening.inert,false);
});
test('skip bypasses the intro immediately and moves keyboard focus to the content',()=>{
  const h=harness();let prevented=false;
  h.links.click({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(h.target.scrollOptions.behavior,'instant');
  assert.equal(h.target.focusOptions.preventScroll,true);
  assert.equal(h.history.url,'#discover');
});
test('overscroll is bounded and the header switches at the content',()=>{
  const h=harness();h.window.scrollY=9000;h.events.scroll();
  assert.equal(h.stage.values['--progress'],'1.0000');
  assert.equal(h.body.classList.contains('header-solid'),true);
  h.window.scrollY=-50;h.events.scroll();
  assert.equal(h.stage.values['--progress'],'0.0000');
});
