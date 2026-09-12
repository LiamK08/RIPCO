const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../experience.js'), 'utf8');
const coverage = fs.readFileSync(path.join(__dirname, '../coverage.html'), 'utf8');

function directory(animationFailure = false) {
  const events = {}, query = { value: '', focus() { this.focused = true; } }, region = { value: '' };
  const count = { hidden: true }, empty = { hidden: true }, reset = {};
  const groups = [...coverage.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].map(([_, html]) => {
    const name = html.match(/scope="rowgroup"[^>]*>(.*?)<\/th>/)[1];
    const rows = [...html.matchAll(/<tr[^>]*data-id="([^"]+)"[^>]*><th[^>]*>(.*?)<\/th>/g)].map(([, id, name]) => ({ id, cells: [{ textContent: name }], hidden: false }));
    return { rows, hidden: false, querySelector: () => ({ textContent: name }), querySelectorAll: () => rows };
  });
  const form = {
    hidden: true,
    querySelector: s => ({ '[name="beach"]': query, '[name="region"]': region, '[type="reset"]': reset }[s]),
    addEventListener: (name, handler) => { events[name] = handler; }
  };
  const document = {
    querySelector: s => ({ '[data-beach-filters]': form, '[data-beach-count]': count, '[data-beach-empty]': empty }[s]),
    getElementById: () => ({ querySelectorAll: () => groups })
  };
  const errors = [];
  const window = { matchMedia: () => ({ matches: false }), console };
  const BrokenObserver = function () { throw new Error('Observer unavailable'); };
  if (animationFailure) window.IntersectionObserver = BrokenObserver;
  vm.runInNewContext(script, { document, window, Element: { prototype: { animate() {} } }, IntersectionObserver: BrokenObserver, console: { error: error => errors.push(error) } });
  assert.equal(errors.length, animationFailure ? 1 : 0);
  return { query, region, count, empty, reset, form, groups, events, visible: () => groups.flatMap(g => g.rows).filter(r => !r.hidden).map(r => r.id) };
}

test('the directory enhances the actual 26-beach table without losing any entries', () => {
  const h = directory();
  assert.equal(h.visible().length, 26);
  assert.equal(h.form.hidden, false);
  assert.equal(h.reset.disabled, true);
  assert.equal(h.count.textContent, '26 beaches shown · All areas');
});
test('a trimmed case-insensitive query finds beaches and removes empty region headings', () => {
  const h = directory(); h.query.value = '  BoNdI  '; h.events.input();
  assert.deepEqual(h.visible(), ['bondi']);
  assert.equal(h.groups.filter(g => !g.hidden).length, 1);
  assert.equal(h.count.textContent, '1 beach shown · All areas');
});
test('region and text filters combine instead of overriding one another', () => {
  const h = directory(); h.region.value = 'Sutherland Shire'; h.events.change();
  assert.equal(h.visible().length, 4);
  h.query.value = 'Cronulla'; h.events.input();
  assert.deepEqual(h.visible(), ['north-cronulla', 'cronulla']);
  h.region.value = 'Northern Beaches'; h.events.change();
  assert.equal(h.visible().length, 0);
  assert.equal(h.empty.hidden, false);
});
test('reset restores all rows and region headings, dismisses the empty state and returns focus', () => {
  const h = directory(); h.query.value = 'missing'; h.region.value = 'Eastern Suburbs'; h.events.input();
  let prevented = false; h.events.reset({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.visible().length, 26);
  assert.equal(h.groups.some(g => g.hidden), false);
  assert.equal(h.empty.hidden, true);
  assert.equal(h.query.focused, true);
  assert.equal(h.reset.disabled, true);
});
test('search submits in place and handles punctuation as text', () => {
  const h = directory(); h.query.value = '<img>'; h.events.input();
  let prevented = false; h.events.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.visible().length, 0);
  assert.equal(h.count.textContent, '0 beaches shown · All areas');
});

test('an entry-animation failure cannot stop the independent directory enhancement', () => {
  const h = directory(true); h.query.value = 'Palm'; h.events.input();
  assert.deepEqual(h.visible(), ['palm-beach']);
});

function entrance(reduced = false) {
  let enter;
  const calls = [], events = {}, focus = {};
  const media = { matches: reduced, addEventListener(name, handler) { this.change = handler; } };
  const animation = { cancelled: false, cancel() { this.cancelled = true; } };
  const element = {
    contains: node => node === focus,
    querySelector: () => null,
    animate(frames, options) { calls.push({frames, options}); return animation; }
  };
  const Observer = function (callback) { enter = callback; this.observe = () => {}; this.unobserve = () => {}; };
  const document = { activeElement: null, querySelector: () => null, querySelectorAll: () => [element], addEventListener: (name, handler) => { events[name] = handler; } };
  vm.runInNewContext(script, { document, window: { IntersectionObserver: Observer, matchMedia: () => media, addEventListener: (name, handler) => { events[name] = handler; } }, Element: { prototype: { animate() {} } }, IntersectionObserver: Observer, console });
  return { calls, events, media, animation, focus, enter: () => enter([{ isIntersecting: true, target: element }]) };
}
test('reduced motion skips entrance animation entirely', () => {
  const h = entrance(true); h.enter(); assert.equal(h.calls.length, 0);
});
test('switching to reduced motion cancels an active entrance', () => {
  const h = entrance(); h.enter(); assert.equal(h.calls.length, 1);
  h.media.matches = true; h.media.change(); assert.equal(h.animation.cancelled, true);
});
test('keyboard focus and printing cancel active entrance animations immediately', () => {
  const focused = entrance(); focused.enter(); focused.events.focusin({target: focused.focus});
  assert.equal(focused.animation.cancelled, true);
  const printed = entrance(); printed.enter(); printed.events.beforeprint();
  assert.equal(printed.animation.cancelled, true);
});
