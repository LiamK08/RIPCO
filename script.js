/* RipCo marketing site. Shared behaviour, vanilla JS, no dependencies.
   Loaded on every page. Every module is guarded, so each runs only where
   its markup exists. The site is fully readable without JS: nav wraps,
   reveal content is visible, the detection diagram shows its final state,
   stats show their written values and FAQ answers are open. */

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
    var path = window.location.pathname.split('/').pop() || 'index.html';
    if (path === '') path = 'index.html';
    links.forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('/').pop();
      if (href === path || (path === 'index.html' && (href === '' || href === 'index.html'))) {
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
     Detection illustration (how-it-works). Diagram only, never a result.
     Loop: scan, trace red outline, confidence climbs, hold, reset.
     Markup ships the detected state, so no-JS and reduced-motion users
     see a complete, correct illustration.
     ==================================================================== */

  (function () {
    var detect = document.querySelector('[data-detect]');
    if (!detect) return;

    var outline = detect.querySelector('[data-detect-outline]');
    var fill = detect.querySelector('[data-detect-fill]');
    var overlay = detect.querySelector('[data-detect-overlay]');
    var flow = detect.querySelector('[data-detect-flow]');
    var confEl = detect.querySelector('[data-detect-conf]');
    var statusText = detect.querySelector('[data-detect-status-text]');

    var outlineLength = 0;
    if (outline) { try { outlineLength = outline.getTotalLength(); } catch (e) { outlineLength = 0; } }

    var PHASES = [
      { name: 'scan',  duration: 3000 },
      { name: 'lock',  duration: 1500 },
      { name: 'hold',  duration: 3600 },
      { name: 'reset', duration: 900 }
    ];

    var raf = null, phaseIndex = 0, phaseStart = null, visible = true;

    var setConf = function (v) { if (confEl) confEl.textContent = String(Math.round(v)); };

    var setDetected = function () {
      detect.classList.remove('is-scanning');
      detect.classList.add('is-detected');
      if (overlay) overlay.style.opacity = '1';
      if (outline) { outline.style.strokeDasharray = 'none'; outline.style.strokeDashoffset = '0'; outline.style.opacity = '1'; }
      if (fill) fill.style.opacity = '1';
      if (flow) flow.style.opacity = '0.85';
      if (statusText) statusText.textContent = 'Rip detected';
      setConf(94);
    };

    var primeScan = function () {
      detect.classList.remove('is-detected');
      if (statusText) statusText.textContent = 'Analysing feed';
      setConf(0);
      if (overlay) overlay.style.opacity = '1';
      if (fill) fill.style.opacity = '0';
      if (flow) flow.style.opacity = '0';
      if (outline) {
        if (outlineLength > 0) {
          outline.style.strokeDasharray = String(outlineLength);
          outline.style.strokeDashoffset = String(outlineLength);
          outline.style.opacity = '1';
        } else {
          outline.style.opacity = '0';
        }
      }
    };

    var enterPhase = function (index, now) {
      phaseIndex = index; phaseStart = now;
      var name = PHASES[phaseIndex].name;
      if (name === 'scan') { primeScan(); detect.classList.add('is-scanning'); }
      else if (name === 'lock') { detect.classList.remove('is-scanning'); if (statusText) statusText.textContent = 'Rip signature found'; }
      else if (name === 'hold') {
        detect.classList.add('is-detected');
        if (statusText) statusText.textContent = 'Rip detected';
        if (outline) outline.style.opacity = '1';
        if (fill) fill.style.opacity = '1';
        if (flow) flow.style.opacity = '0.85';
      } else if (name === 'reset') {
        if (overlay) overlay.style.opacity = '0';
        detect.classList.remove('is-detected');
        if (statusText) statusText.textContent = 'Analysing feed';
      }
    };

    var frame = function (now) {
      if (phaseStart === null) enterPhase(0, now);
      var phase = PHASES[phaseIndex];
      var elapsed = now - phaseStart;
      var t = Math.min(elapsed / phase.duration, 1);

      if (phase.name === 'scan') setConf(easeOutCubic(t) * 34);
      else if (phase.name === 'lock') {
        if (outline && outlineLength > 0) outline.style.strokeDashoffset = String(outlineLength * (1 - easeOutCubic(t)));
        setConf(34 + easeOutCubic(t) * 60);
      } else if (phase.name === 'hold') setConf(94 + Math.sin(elapsed / 500) * 1.1);

      if (t >= 1) enterPhase((phaseIndex + 1) % PHASES.length, now);
      raf = window.requestAnimationFrame(frame);
    };

    var stop = function () { if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; } };
    var start = function () {
      if (prefersReducedMotion()) { stop(); setDetected(); return; }
      if (raf === null && visible && !document.hidden) { phaseStart = null; phaseIndex = 0; raf = window.requestAnimationFrame(frame); }
    };

    if (prefersReducedMotion()) setDetected(); else primeScan();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.25 }).observe(detect);
    } else if (!prefersReducedMotion()) {
      start();
    }

    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    onMotionChange(function () { if (prefersReducedMotion()) { stop(); setDetected(); } else start(); });
  })();

  /* ====================================================================
     Image slots: mark empty on load failure so the neutral placeholder
     shows instead of a broken-image icon
     ==================================================================== */

  (function () {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.slot img, .device__screen img'));
    imgs.forEach(function (img) {
      var mark = function () {
        var host = img.closest('.slot') || img.closest('.device');
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
