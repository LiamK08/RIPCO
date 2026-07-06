/* RipCo marketing site — vanilla JS, no dependencies.
   Everything degrades: without JS the page is fully readable, the detection
   figure shows its final (detected) state and all content is visible. */

(function () {
  'use strict';

  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function prefersReducedMotion() {
    return reducedMotionQuery.matches;
  }

  function onMotionPreferenceChange(handler) {
    if (typeof reducedMotionQuery.addEventListener === 'function') {
      reducedMotionQuery.addEventListener('change', handler);
    } else if (typeof reducedMotionQuery.addListener === 'function') {
      reducedMotionQuery.addListener(handler);
    }
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  var easeOutCubic = function (t) {
    return 1 - Math.pow(1 - t, 3);
  };

  /* ======================================================================
     Header: shadow once the page scrolls
     ====================================================================== */

  var header = document.querySelector('[data-header]');

  function updateHeader() {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    }
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ======================================================================
     Mobile navigation
     ====================================================================== */

  var navToggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  var desktopNavQuery = window.matchMedia('(min-width: 48em)');

  function navIsOpen() {
    return document.body.classList.contains('nav-open');
  }

  function setNavOpen(open) {
    document.body.classList.toggle('nav-open', open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      setNavOpen(!navIsOpen());
    });

    // Close on link click (in-page navigation)
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        setNavOpen(false);
      }
    });

    // Close on Escape, return focus to the toggle
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navIsOpen()) {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    // Close when tapping the scrim / anywhere outside the panel
    document.addEventListener('click', function (event) {
      if (
        navIsOpen() &&
        !nav.contains(event.target) &&
        !navToggle.contains(event.target)
      ) {
        setNavOpen(false);
      }
    });

    // Reset state when the viewport grows past the mobile breakpoint
    var handleViewportChange = function () {
      if (desktopNavQuery.matches) {
        setNavOpen(false);
      }
    };
    if (typeof desktopNavQuery.addEventListener === 'function') {
      desktopNavQuery.addEventListener('change', handleViewportChange);
    } else if (typeof desktopNavQuery.addListener === 'function') {
      desktopNavQuery.addListener(handleViewportChange);
    }
  }

  /* ======================================================================
     Active-section highlighting in the nav
     ====================================================================== */

  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('[data-nav-link]')
  );

  if (navLinks.length && 'IntersectionObserver' in window) {
    var sectionsByLink = navLinks
      .map(function (link) {
        var id = link.getAttribute('href').slice(1);
        var section = document.getElementById(id);
        return section ? { link: link, section: section } : null;
      })
      .filter(Boolean);

    var setActive = function (activeLink) {
      navLinks.forEach(function (link) {
        if (link === activeLink) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var match = sectionsByLink.find(function (pair) {
            return pair.section === entry.target;
          });
          if (match) setActive(match.link);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    sectionsByLink.forEach(function (pair) {
      sectionObserver.observe(pair.section);
    });
  }

  /* ======================================================================
     Reveal on scroll
     ====================================================================== */

  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll('.reveal')
  );

  function showAllReveals() {
    revealTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  if (revealTargets.length) {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      showAllReveals();
    } else {
      var revealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
      );
      revealTargets.forEach(function (el) {
        revealObserver.observe(el);
      });
      onMotionPreferenceChange(function () {
        if (prefersReducedMotion()) {
          revealObserver.disconnect();
          showAllReveals();
        }
      });
    }
  }

  /* ======================================================================
     Count-up stats
     ====================================================================== */

  var counters = Array.prototype.slice.call(
    document.querySelectorAll('[data-count-to]')
  );

  function renderCount(el, value) {
    var suffix = el.getAttribute('data-count-suffix') || '';
    el.textContent = String(value) + suffix;
  }

  if (counters.length) {
    var animateCounter = function (el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      if (isNaN(target)) return;
      if (prefersReducedMotion()) {
        renderCount(el, target);
        return;
      }
      var duration = 1600;
      var start = null;
      var tick = function (now) {
        if (start === null) start = now;
        var progress = Math.min((now - start) / duration, 1);
        renderCount(el, Math.round(easeOutCubic(progress) * target));
        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      };
      renderCount(el, 0);
      window.requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window && !prefersReducedMotion()) {
      var counterObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach(function (el) {
        renderCount(el, 0); // start from zero so the count-up never rewinds
        counterObserver.observe(el);
      });
    }
    // Otherwise the markup already contains the final values — nothing to do.
  }

  /* ======================================================================
     Hero: slow layered wave lines on canvas
     ====================================================================== */

  var heroCanvas = document.querySelector('[data-hero-canvas]');

  if (heroCanvas && heroCanvas.getContext) {
    var ctx = heroCanvas.getContext('2d');
    var heroVisible = true;
    var rafId = null;
    var startTime = null;

    var waveColors = function () {
      return [
        cssVar('--wave-line-3'),
        cssVar('--wave-line-2'),
        cssVar('--wave-line-1')
      ];
    };

    var sizeCanvas = function () {
      var rect = heroCanvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      heroCanvas.width = Math.max(1, Math.round(rect.width * dpr));
      heroCanvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var drawWaves = function (elapsedSeconds) {
      var rect = heroCanvas.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      ctx.clearRect(0, 0, w, h);

      var colors = waveColors();
      var layerCount = colors.length;

      for (var layer = 0; layer < layerCount; layer++) {
        var baseY = h * (0.62 + 0.13 * layer);
        var amplitude = 14 + layer * 9;
        var wavelength = 0.0050 - layer * 0.0011;
        var speed = 0.10 + layer * 0.05;
        var phase = elapsedSeconds * speed + layer * 2.1;

        ctx.beginPath();
        for (var x = 0; x <= w; x += 4) {
          var y =
            baseY +
            Math.sin(x * wavelength * Math.PI * 2 + phase) * amplitude +
            Math.sin(x * wavelength * Math.PI * 5 + phase * 1.6) * (amplitude * 0.22);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.strokeStyle = colors[layer];
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    var frame = function (now) {
      if (startTime === null) startTime = now;
      drawWaves((now - startTime) / 1000);
      rafId = window.requestAnimationFrame(frame);
    };

    var stopWaves = function () {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    var startWaves = function () {
      if (
        rafId === null &&
        heroVisible &&
        !document.hidden &&
        !prefersReducedMotion()
      ) {
        rafId = window.requestAnimationFrame(frame);
      }
    };

    sizeCanvas();
    if (prefersReducedMotion()) {
      drawWaves(0); // one calm, static frame
    } else {
      startWaves();
    }

    window.addEventListener('resize', function () {
      sizeCanvas();
      if (prefersReducedMotion()) drawWaves(0);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopWaves();
      } else {
        startWaves();
      }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        // records arrive oldest-first; only the newest reflects current state
        heroVisible = entries[entries.length - 1].isIntersecting;
        if (heroVisible) {
          startWaves();
        } else {
          stopWaves();
        }
      }).observe(heroCanvas);
    }

    onMotionPreferenceChange(function () {
      if (prefersReducedMotion()) {
        stopWaves();
        sizeCanvas();
        drawWaves(0);
      } else {
        startWaves();
      }
    });
  }

  /* ======================================================================
     Detection centrepiece: scan → trace outline → confidence climbs → hold
     ====================================================================== */

  var detect = document.querySelector('[data-detect]');

  if (detect) {
    var outline = detect.querySelector('[data-detect-outline]');
    var fill = detect.querySelector('[data-detect-fill]');
    var overlay = detect.querySelector('[data-detect-overlay]');
    var flow = detect.querySelector('[data-detect-flow]');
    var confEl = detect.querySelector('[data-detect-conf]');
    var statusText = detect.querySelector('[data-detect-status-text]');

    var outlineLength = 0;
    try {
      outlineLength = outline.getTotalLength();
    } catch (err) {
      outlineLength = 0;
    }

    var PHASES = [
      { name: 'scan', duration: 3200 },
      { name: 'lock', duration: 1500 },
      { name: 'hold', duration: 3800 },
      { name: 'reset', duration: 900 }
    ];

    var detectRaf = null;
    var phaseIndex = 0;
    var phaseStart = null;
    var detectVisible = true;

    var setConfidence = function (value) {
      confEl.textContent = String(Math.round(value));
    };

    var setDetectedState = function () {
      detect.classList.remove('is-scanning');
      detect.classList.add('is-detected');
      overlay.style.opacity = '1';
      outline.style.strokeDasharray = 'none';
      outline.style.strokeDashoffset = '0';
      outline.style.opacity = '1';
      fill.style.opacity = '1';
      flow.style.opacity = '0.9';
      statusText.textContent = 'Rip current detected';
      setConfidence(94);
    };

    /* The markup ships the detected state (correct for no-JS visitors);
       this rewinds it to "nothing found yet" before the loop animates. */
    var primeScanVisuals = function () {
      detect.classList.remove('is-detected');
      statusText.textContent = 'Analysing feed…';
      setConfidence(0);
      overlay.style.opacity = '1';
      fill.style.opacity = '0';
      flow.style.opacity = '0';
      if (outlineLength > 0) {
        outline.style.strokeDasharray = String(outlineLength);
        outline.style.strokeDashoffset = String(outlineLength);
        outline.style.opacity = '1';
      } else {
        // can't trace the path — keep it hidden until the detected phase
        outline.style.opacity = '0';
      }
    };

    var enterPhase = function (index, now) {
      phaseIndex = index;
      phaseStart = now;
      var name = PHASES[phaseIndex].name;

      if (name === 'scan') {
        primeScanVisuals();
        detect.classList.add('is-scanning');
      } else if (name === 'lock') {
        detect.classList.remove('is-scanning');
        statusText.textContent = 'Rip signature found';
      } else if (name === 'hold') {
        detect.classList.add('is-detected');
        statusText.textContent = 'Rip current detected';
        outline.style.opacity = '1';
        fill.style.opacity = '1';
        flow.style.opacity = '0.9';
      } else if (name === 'reset') {
        overlay.style.opacity = '0';
        detect.classList.remove('is-detected');
        statusText.textContent = 'Analysing feed…';
      }
    };

    var detectFrame = function (now) {
      if (phaseStart === null) enterPhase(0, now);

      var phase = PHASES[phaseIndex];
      var elapsed = now - phaseStart;
      var t = Math.min(elapsed / phase.duration, 1);

      if (phase.name === 'scan') {
        // Confidence creeps up while the sweep runs
        setConfidence(easeOutCubic(t) * 34);
      } else if (phase.name === 'lock') {
        // Trace the outline and push confidence to 94
        if (outlineLength > 0) {
          outline.style.strokeDashoffset = String(
            outlineLength * (1 - easeOutCubic(t))
          );
        }
        setConfidence(34 + easeOutCubic(t) * 60);
      } else if (phase.name === 'hold') {
        // Confidence breathes gently around its lock value
        setConfidence(94 + Math.sin(elapsed / 500) * 1.2);
      }

      if (t >= 1) {
        enterPhase((phaseIndex + 1) % PHASES.length, now);
      }
      detectRaf = window.requestAnimationFrame(detectFrame);
    };

    var stopDetect = function () {
      if (detectRaf !== null) {
        window.cancelAnimationFrame(detectRaf);
        detectRaf = null;
      }
    };

    var startDetect = function () {
      if (prefersReducedMotion()) {
        stopDetect();
        setDetectedState();
        return;
      }
      if (detectRaf === null && detectVisible && !document.hidden) {
        phaseStart = null;
        phaseIndex = 0;
        detectRaf = window.requestAnimationFrame(detectFrame);
      }
    };

    if (prefersReducedMotion()) {
      setDetectedState();
    } else {
      primeScanVisuals();
    }

    // Observe regardless of the current motion preference, so visibility
    // tracking stays correct if the preference changes mid-session.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        // records arrive oldest-first; only the newest reflects current state
        detectVisible = entries[entries.length - 1].isIntersecting;
        if (detectVisible) {
          startDetect();
        } else {
          stopDetect();
        }
      }, { threshold: 0.25 }).observe(detect);
    } else if (!prefersReducedMotion()) {
      startDetect();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopDetect();
      } else {
        startDetect();
      }
    });

    onMotionPreferenceChange(function () {
      if (prefersReducedMotion()) {
        stopDetect();
        setDetectedState();
      } else {
        startDetect();
      }
    });
  }

  /* ======================================================================
     Footer year
     ====================================================================== */

  var yearEl = document.querySelector('[data-year]');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
