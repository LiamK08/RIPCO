/* RipCo marketing site. Shared behaviour, vanilla JS, no dependencies.
   Loaded on every page. Every module is guarded, so each runs only where
   its markup exists. The site is fully readable without JS: nav wraps,
   reveal content is visible, stats show their written values and FAQ
   answers are open. */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() { return reducedMotion.matches; }
  function onMotionChange(handler) {
    if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change', handler);
    else if (typeof reducedMotion.addListener === 'function') reducedMotion.addListener(handler);
  }
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ====================================================================
     Active navigation tab (headers are byte-identical, so the current
     tab is resolved at runtime from the URL)
     ==================================================================== */

  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav__link'));
    if (!links.length) return;
    /* Clean URLs: /beaches and /beaches.html both resolve to "beaches",
       and the home page resolves to "". */
    function pageKey(pathname) {
      return (pathname.split('/').pop() || '')
        .replace(/\.html$/, '')
        .replace(/^index$/, '');
    }
    var path = pageKey(window.location.pathname);
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('#')[0];
      if (pageKey(href) === path) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ====================================================================
     Header: scrolled hairline + scroll-progress cue
     ==================================================================== */

  (function () {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var progress = header.querySelector('[data-progress]');

    var update = function () {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle('is-scrolled', y > 4);
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(y / max, 1) : 0;
        progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* ====================================================================
     Mobile navigation
     ==================================================================== */

  (function () {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.querySelector('[data-nav]');
    if (!toggle || !nav) return;
    var desktop = window.matchMedia('(min-width: 56.0625em)');

    var isOpen = function () { return document.body.classList.contains('nav-open'); };
    var setOpen = function (open) {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    toggle.addEventListener('click', function () { setOpen(!isOpen()); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    var onViewport = function () { if (desktop.matches) setOpen(false); };
    if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onViewport);
    else if (typeof desktop.addListener === 'function') desktop.addListener(onViewport);
  })();

  /* ====================================================================
     Reveal on scroll
     ==================================================================== */

  (function () {
    var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!targets.length) return;

    var showAll = function () { targets.forEach(function (el) { el.classList.add('is-visible'); }); };

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) { showAll(); return; }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    targets.forEach(function (el) { observer.observe(el); });
    onMotionChange(function () { if (prefersReducedMotion()) { observer.disconnect(); showAll(); } });
  })();

  /* ====================================================================
     Count-up stats
     ==================================================================== */

  (function () {
    var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));
    if (!counters.length || !('IntersectionObserver' in window) || prefersReducedMotion()) return;

    var render = function (el, value) {
      el.textContent = String(value) + (el.getAttribute('data-count-suffix') || '');
    };
    var animate = function (el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      if (isNaN(target)) return;
      var duration = 1600, start = null;
      var tick = function (now) {
        if (start === null) start = now;
        var p = Math.min((now - start) / duration, 1);
        render(el, Math.round(easeOutCubic(p) * target));
        if (p < 1) window.requestAnimationFrame(tick);
      };
      render(el, 0);
      window.requestAnimationFrame(tick);
    };

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });

    counters.forEach(function (el) { render(el, 0); observer.observe(el); });
  })();

  /* ====================================================================
     Pinned scroll stepper (sticky visual, advancing steps)
     ==================================================================== */

  (function () {
    var pins = Array.prototype.slice.call(document.querySelectorAll('[data-pin]'));
    if (!pins.length || !('IntersectionObserver' in window)) return;

    pins.forEach(function (pin) {
      var steps = Array.prototype.slice.call(pin.querySelectorAll('[data-pin-step]'));
      if (!steps.length) return;

      var setActive = function (index) {
        steps.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
      };
      setActive(0);

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var index = steps.indexOf(entry.target);
            if (index !== -1) setActive(index);
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

      steps.forEach(function (s) { observer.observe(s); });
    });
  })();

  /* ====================================================================
     FAQ accordion (accessible: buttons with aria-expanded + regions)
     ==================================================================== */

  (function () {
    var accordions = Array.prototype.slice.call(document.querySelectorAll('[data-accordion]'));
    if (!accordions.length) return;

    accordions.forEach(function (acc) {
      var buttons = Array.prototype.slice.call(acc.querySelectorAll('.faq__btn'));

      var setExpanded = function (btn, expanded) {
        btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        var item = btn.closest('.faq__item');
        if (item) item.classList.toggle('is-open', expanded);
      };

      buttons.forEach(function (btn, i) {
        setExpanded(btn, i === 0); // first item open by default
        btn.addEventListener('click', function () {
          var isOpen = btn.getAttribute('aria-expanded') === 'true';
          buttons.forEach(function (other) { setExpanded(other, false); });
          setExpanded(btn, !isOpen);
        });
      });
    });
  })();

  /* ====================================================================
     Device screens: when real app captures are dropped in, a failed load
     falls back to the neutral labelled frame rather than a broken icon.
     The frames ship empty until those captures exist.
     ==================================================================== */

  (function () {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.device__screen img'));
    imgs.forEach(function (img) {
      var mark = function () {
        var host = img.closest('.device');
        if (host) host.classList.add('is-empty');
      };
      if (img.complete && img.naturalWidth === 0) mark();
      img.addEventListener('error', mark);
    });
  })();

  /* ====================================================================
     Footer year
     ==================================================================== */

  (function () {
    var el = document.querySelector('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  })();
})();
