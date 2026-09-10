/* Scroll-linked opening. Native document scroll; no wheel/touch interception.
   One render per scroll frame, with a static alternative for reduced motion.
   The optional film replaces the still when data-film-src is present on the
   journey; the product UI remains a separate, crisp layer. */
(function () {
  'use strict';
  var journey = document.querySelector('[data-journey]');
  if (!journey) return;
  var stage = journey.querySelector('.journey__stage');
  var opening = journey.querySelector('[data-opening]');
  var product = journey.querySelector('[data-product]');
  var chapters = journey.querySelectorAll('[data-chapter]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var queued = false;
  var start = 0;
  var distance = 1;
  var film = null;
  var filmReady = false;
  var filmTarget = 0;

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function ramp(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function smooth(n) { return n * n * (3 - 2 * n); }
  function value(name, n) { stage.style.setProperty('--' + name, n); }
  function interactive(el, enabled) {
    el.inert = !enabled;
    el.setAttribute('aria-hidden', enabled ? 'false' : 'true');
  }
  function measure() {
    start = journey.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(1, journey.offsetHeight - stage.offsetHeight);
    schedule();
  }
  function seek() {
    if (!filmReady || film.seeking || !Number.isFinite(film.duration)) return;
    if (Math.abs(film.currentTime - filmTarget) > 0.045) film.currentTime = filmTarget;
  }
  function render() {
    queued = false;
    var p = reduce.matches ? 0 : clamp((window.scrollY - start) / distance, 0, 1);
    var reveal = smooth(ramp(p, .65, .87));
    value('close-opacity', (smooth(ramp(p, .26, .43)) * (1 - reveal)).toFixed(3));
    value('close-scale', (1 + smooth(ramp(p, .4, .8)) * .55).toFixed(4));
    value('screen-opacity', smooth(ramp(p, .43, .59)).toFixed(3));
    value('landscape-scale', (1 + smooth(ramp(p, .02, .68)) * 3.6).toFixed(4));
    value('landscape-x', (-12 * smooth(ramp(p, .02, .68))).toFixed(2) + 'vw');
    value('landscape-opacity', (1 - reveal * .83).toFixed(3));
    value('opening-opacity', (1 - ramp(p, .035, .19)).toFixed(3));
    value('opening-y', (ramp(p, 0, .22) * 70).toFixed(1) + 'px');
    value('middle-opacity', (smooth(ramp(p, .2, .3)) * (1 - smooth(ramp(p, .56, .66)))).toFixed(3));
    value('product-backdrop', (reveal * .94).toFixed(3));
    value('product-opacity', reveal.toFixed(3));
    value('product-y', ((1 - reveal) * 35).toFixed(1) + 'px');
    value('phone-scale', (.78 + smooth(ramp(p, .65, .95)) * .22).toFixed(4));
    value('phone-rotate', ((1 - reveal) * 8).toFixed(2) + 'deg');
    value('progress', p.toFixed(4));
    interactive(opening, p < .19);
    interactive(product, !reduce.matches && p > .7);
    var chapter = p < .2 ? 0 : p < .58 ? 1 : 2;
    chapters.forEach(function (el, i) { el.classList.toggle('is-active', chapter === i); });
    document.body.classList.toggle('header-solid', window.scrollY > start + journey.offsetHeight - 85);
    if (filmReady && !reduce.matches) {
      filmTarget = ramp(p, 0, .75) * Math.max(0, film.duration - .05);
      seek();
    }
  }
  function schedule() { if (!queued) { queued = true; window.requestAnimationFrame(render); } }
  function configure() {
    journey.classList.toggle('is-enhanced', !reduce.matches);
    if (film) film.hidden = reduce.matches || !filmReady;
    measure();
  }

  var source = journey.getAttribute('data-film-src');
  if (source && !reduce.matches && !(navigator.connection && navigator.connection.saveData)) {
    film = document.createElement('video');
    film.className = 'journey__film';
    film.muted = true;
    film.playsInline = true;
    film.preload = 'auto';
    film.hidden = true;
    film.setAttribute('aria-hidden', 'true');
    film.addEventListener('loadeddata', function () { filmReady = true; film.hidden = reduce.matches; journey.classList.add('film-ready'); schedule(); });
    film.addEventListener('seeked', seek);
    film.addEventListener('error', function () { filmReady = false; film.hidden = true; journey.classList.remove('film-ready'); });
    film.src = source;
    journey.querySelector('[data-landscape]').appendChild(film);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  if (reduce.addEventListener) reduce.addEventListener('change', configure);
  else reduce.addListener(configure);
  document.querySelectorAll('a[href="#discover"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var target = document.getElementById('discover');
      event.preventDefault();
      // An explicit skip should bypass the pinned sequence immediately.
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      target.focus({ preventScroll: true });
      history.replaceState(null, '', '#discover');
    });
  });
  configure();
})();
