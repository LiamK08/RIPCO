/* A native-scroll film: aerial → family → phone → the real RipCo interface.
   Videos seek to the newest requested frame, never queue every scroll event.
   No wheel/touch interception; stills work offline, without JS or with less motion. */
(function () {
  'use strict';
  var journey = document.querySelector('[data-journey]');
  if (!journey) return;
  var stage = journey.querySelector('.cinema__stage');
  var opening = journey.querySelector('[data-opening]');
  var product = journey.querySelector('[data-product]');
  var productCopy = journey.querySelector('.cinema__product-copy');
  var chapters = journey.querySelector('[data-chapters]');
  var scenes = journey.querySelectorAll('[data-scene]');
  var controls = journey.querySelector('[data-phone-controls]');
  var coast = document.querySelector('[data-coastal-film]');
  var coastStage = coast && coast.querySelector('.coastal-film__stage');
  var coastButton = coast && coast.querySelector('[data-coast-play]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var queued = false, start = 0, distance = 1, coastStart = 0, coastDistance = 1;
  var width = 1, height = 1, copyBottom = 320, progress = 0, turn = 0, pointerX = 0, pointerY = 0;
  var coastNear = false, manual = false, playbackRequest = 0;
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function ramp(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function smooth(n) { return n * n * (3 - 2 * n); }
  function ease(p, a, b) { return smooth(ramp(p, a, b)); }
  function mix(a, b, n) { return a + (b - a) * n; }
  function value(name, n, unit) { stage.style.setProperty('--' + name, n.toFixed(4) + (unit || '')); }
  function motion() { return !reduce.matches; }
  function canLoad() { return motion() && !(connection && connection.saveData); }
  function interactive(el, enabled) {
    el.inert = !enabled;
    el.setAttribute('aria-hidden', enabled ? 'false' : 'true');
  }

  function scrubber(video, container) {
    var ready = false, requested = false, target = 0, failed = false;
    function seek() {
      if (!ready || !canLoad() || video.seeking || !Number.isFinite(video.duration)) return;
      var seconds = target * Math.max(0, video.duration - .05);
      if (Math.abs(video.currentTime - seconds) > .045) {
        try { video.currentTime = seconds; } catch (_) { /* Metadata can reset on a source failure. */ }
      }
    }
    video.addEventListener('loadeddata', function () {
      ready = true;
      video.hidden = !canLoad();
      container.classList.toggle('film-ready', canLoad());
      if (container === coast && coastButton) coastButton.hidden = !canLoad();
      seek();
      schedule();
    });
    video.addEventListener('seeked', function () { if (!(container === coast && manual)) seek(); });
    video.addEventListener('error', function () {
      ready = false; failed = true; video.hidden = true;
      container.classList.remove('film-ready');
      if (container === coast) { stopPlayback(); coastButton.hidden = true; }
    });
    return {
      video: video,
      load: function () {
        if (requested || failed || !canLoad()) return;
        requested = true;
        video.muted = true; video.playsInline = true; video.preload = 'auto';
        video.src = video.getAttribute(width <= 640 ? 'data-mobile-src' : 'data-src');
        video.load();
      },
      seek: function (p) { target = clamp(p, 0, 1); seek(); },
      configure: function () {
        video.hidden = !ready || !canLoad();
        container.classList.toggle('film-ready', ready && canLoad());
        if (!canLoad()) video.pause();
        if (container === coast) coastButton.hidden = !ready || !canLoad();
      }
    };
  }
  var heroFilm = scrubber(journey.querySelector('[data-hero-film]'), journey);
  var coastFilm = coast && scrubber(coast.querySelector('[data-coast-video]'), coast);

  function measure() {
    start = journey.getBoundingClientRect().top + window.scrollY;
    width = stage.clientWidth;
    height = stage.offsetHeight;
    if (productCopy) copyBottom = productCopy.offsetTop + productCopy.offsetHeight;
    distance = Math.max(1, journey.offsetHeight - height);
    if (coast) {
      coastStart = coast.getBoundingClientRect().top + window.scrollY;
      coastDistance = Math.max(1, coast.offsetHeight - coastStage.offsetHeight);
    }
    schedule();
  }
  function render() {
    queued = false;
    var p = motion() ? clamp((window.scrollY - start) / distance, 0, 1) : 0;
    progress = p;
    var reveal = ease(p, .55, .75), productReveal = ease(p, .69, .79);
    var endReveal = ease(p, .47, .55), dark = ease(p, .57, .72);
    var mobile = width <= 640;
    var imagePosition = mobile ? mix(.86, .73, ease(p, .33, .52)) : .5;
    var frameWidth = Math.max(width, height * 1672 / 941);
    var frameHeight = frameWidth * 941 / 1672;
    var frameLeft = (width - frameWidth) * imagePosition;
    var frameTop = (height - frameHeight) / 2;
    var sourceX = frameLeft + frameWidth * .712;
    var sourceY = frameTop + frameHeight * .4695;
    var sourceHeight = frameHeight * .413;
    var targetHeight = mobile ? Math.max(180, Math.min(height * .42, 370, height - copyBottom - 184)) : Math.min(height * .60, 620);
    var targetY = mobile ? Math.max(height * .57, copyBottom + 24 + targetHeight / 2) : height * .51;
    value('frame-width', frameWidth, 'px'); value('frame-height', frameHeight, 'px');
    value('frame-left', frameLeft, 'px'); value('frame-top', frameTop, 'px');
    value('image-position', imagePosition * 100, '%');
    value('fallback-scale', 1 + ease(p, .04, .45) * .7);
    value('world-opacity', 1 - dark); value('end-opacity', endReveal * (1 - dark));
    value('insert-opacity', ease(p, .51, .57)); value('shade-opacity', 1 - dark);
    value('backdrop-opacity', dark);
    value('opening-opacity', 1 - ease(p, .035, .14)); value('opening-y', ramp(p, 0, .16) * 60, 'px');
    value('moment-opacity', ease(p, .14, .19) * (1 - ease(p, .27, .32)));
    value('moment-y', mix(24, -24, ramp(p, .14, .32)), 'px');
    value('check-opacity', ease(p, .33, .38) * (1 - ease(p, .48, .53)));
    value('check-y', mix(24, -24, ramp(p, .33, .53)), 'px');
    value('device-opacity', ease(p, .565, .62));
    value('device-x', mix(sourceX, width * (mobile ? .5 : .68), reveal), 'px');
    value('device-y', mix(sourceY, targetY, reveal), 'px');
    value('device-height', mix(sourceHeight, targetHeight, reveal), 'px');
    value('phone-rx', Math.sin(ramp(p, .56, 1) * Math.PI * 1.4) * 7, 'deg');
    value('phone-ry', Math.sin(ramp(p, .56, 1) * Math.PI * 2) * 23, 'deg');
    value('phone-rz', Math.sin(ramp(p, .56, 1) * Math.PI * 1.6) * -6, 'deg');
    value('pointer-rx', p > .72 ? pointerY : 0, 'deg');
    value('pointer-ry', p > .72 ? pointerX : 0, 'deg'); value('user-turn', turn, 'deg');
    value('glass-x', 30 + p * 65, '%');
    value('product-opacity', productReveal); value('product-y', (1 - productReveal) * 30, 'px');
    value('float-opacity', ease(p, .76, .84));
    value('float-x', mix(-20, 8, ramp(p, .74, 1)), 'px');
    value('float-y', mix(20, -8, ramp(p, .74, 1)), 'px');
    value('orbit-turn', p * 70, 'deg'); value('orbit-scale', .72 + p * .28);
    value('watermark-x', (1 - p) * 200, 'px'); value('progress', p);
    interactive(opening, p < .14);
    interactive(product, motion() && p > .74);
    controls.hidden = !motion() || p < .79;
    var chapter = p < .14 ? 0 : p < .33 ? 1 : p < .69 ? 2 : 3;
    scenes.forEach(function (button, i) {
      if (chapter === i) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.body.classList.toggle('header-solid', window.scrollY > start + journey.offsetHeight - 85);
    if (canLoad()) heroFilm.seek(ramp(p, 0, .50));
    if (coast) {
      var cp = motion() ? clamp((window.scrollY - coastStart) / coastDistance, 0, 1) : 0;
      document.body.classList.toggle('cinema-closing', window.scrollY + height > coastStart && window.scrollY < coastStart + coast.offsetHeight);
      var expansion = ease(cp, 0, .38);
      coastStage.style.setProperty('--coast-inset', motion() ? ((1 - expansion) * 4).toFixed(3) + '%' : '0%');
      coastStage.style.setProperty('--coast-radius', motion() ? ((1 - expansion) * 24).toFixed(2) + 'px' : '0px');
      coastStage.style.setProperty('--coast-scale', motion() ? (1.045 - cp * .045).toFixed(3) : '1');
      coastStage.style.setProperty('--coast-copy-y', motion() ? (12 - cp * 24).toFixed(2) + 'px' : '0px');
      if (canLoad() && !manual) coastFilm.seek(cp);
    }
  }
  function schedule() { if (!queued) { queued = true; window.requestAnimationFrame(render); } }
  function playLabel(playing) {
    if (!coastButton) return;
    coastButton.querySelector('[data-play-label]').textContent = playing ? 'Pause beach film' : 'Play beach film';
    coastButton.querySelector('[data-play-icon]').textContent = playing ? 'Ⅱ' : '▷';
    coastButton.setAttribute('aria-pressed', String(playing));
  }
  function stopPlayback() {
    playbackRequest++;
    manual = false;
    if (coastFilm) coastFilm.video.pause();
    playLabel(false);
  }
  function configure() {
    journey.classList.toggle('is-enhanced', motion());
    if (coast) coast.classList.toggle('is-enhanced', motion());
    chapters.hidden = !motion();
    if (!motion()) { turn = 0; pointerX = 0; pointerY = 0; }
    stopPlayback();
    heroFilm.configure();
    if (coastFilm) coastFilm.configure();
    measure();
    heroFilm.load();
    if (coastFilm && coastNear) coastFilm.load();
  }
  scenes.forEach(function (button) {
    button.addEventListener('click', function () {
      window.scrollTo({ top: start + distance * Number(button.getAttribute('data-scene')), behavior: motion() ? 'smooth' : 'instant' });
    });
  });
  journey.querySelectorAll('[data-turn]').forEach(function (button) {
    button.addEventListener('click', function () {
      var direction = Number(button.getAttribute('data-turn'));
      turn = direction ? clamp(turn + direction * 18, -54, 54) : 0;
      pointerX = 0; pointerY = 0;
      schedule();
    });
  });
  stage.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'mouse' || progress < .72 || !motion()) return;
    pointerX = clamp((event.clientX / width - .5) * 14, -7, 7);
    pointerY = clamp((.5 - event.clientY / height) * 10, -5, 5);
    schedule();
  }, { passive: true });
  stage.addEventListener('pointerleave', function () { pointerX = 0; pointerY = 0; schedule(); });
  if (coastFilm) {
    coastButton.addEventListener('click', function () {
      if (manual) { stopPlayback(); return; }
      if (!canLoad()) return;
      var video = coastFilm.video;
      manual = true;
      var request = ++playbackRequest;
      if (video.currentTime >= video.duration - .1) video.currentTime = 0;
      var promise = video.play();
      playLabel(true);
      if (promise) promise.then(function () {
        // A scroll or preference change may cancel play while the browser buffers.
        if (request !== playbackRequest) { video.pause(); playLabel(false); }
      }).catch(function () { if (request === playbackRequest) stopPlayback(); });
    });
    coastFilm.video.addEventListener('ended', function () { stopPlayback(); });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          coastNear = true; coastFilm.load(); observer.disconnect();
        }
      }, { rootMargin: '650px' });
      observer.observe(coast);
    } else { coastNear = true; }
  }
  window.addEventListener('scroll', function () { if (manual) stopPlayback(); schedule(); }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('beforeprint', stopPlayback);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopPlayback(); });
  if (reduce.addEventListener) reduce.addEventListener('change', configure);
  else reduce.addListener(configure);
  if (connection && connection.addEventListener) connection.addEventListener('change', configure);
  document.querySelectorAll('a[href="#discover"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var target = document.getElementById('discover');
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      target.focus({ preventScroll: true });
      history.replaceState(null, '', '#discover');
    });
  });
  configure();
})();
