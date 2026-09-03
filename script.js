/* RipCo site behaviour. Vanilla JS, no dependencies, loaded on every page.
   Each module is guarded and isolated: it runs only where its markup
   exists, and a failure in one cannot stop the others. The site reads
   fully without JavaScript. */

(function () {
  'use strict';

  function module(fn) {
    try { fn(); } catch (err) { if (window.console) console.error('RipCo:', err); }
  }

  /* Mobile navigation toggle */
  module(function () {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    if (!toggle || !nav) return;
    var desktop = window.matchMedia('(min-width: 56.0625em)');

    function isOpen() { return document.body.classList.contains('nav-open'); }
    function setOpen(open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    function onViewport() { if (desktop.matches) setOpen(false); }
    if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onViewport);
    else if (typeof desktop.addListener === 'function') desktop.addListener(onViewport);
  });

  /* Device frames: a frame whose screenshot fails to load is removed
     rather than shown empty. */
  module(function () {
    var imgs = document.querySelectorAll('.device__screen img');
    Array.prototype.forEach.call(imgs, function (img) {
      function hide() {
        var host = img.closest('.device');
        if (host) host.classList.add('is-empty');
      }
      if (img.complete && img.naturalWidth === 0) hide();
      img.addEventListener('error', hide);
    });
  });
})();
