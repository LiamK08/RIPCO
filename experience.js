/* Small, independent enhancements. Content and native demos work without this file. */
(function () {
  'use strict';
  function enhance(fn) {
    try { fn(); } catch (error) { if (window.console) console.error('RipCo interaction:', error); }
  }
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  enhance(function () {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    var active = new Map();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (motion.matches || entry.target.contains(document.activeElement)) return;
        // Animate only as an element enters. Nothing is hidden while waiting for JS.
        var animation = entry.target.animate([
          { opacity: .25, transform: 'translateY(20px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 650, easing: 'cubic-bezier(.2,.65,.3,1)' });
        active.set(entry.target, animation);
        animation.onfinish = function () { active.delete(entry.target); };
        var ring = entry.target.querySelector('.ring-value');
        if (ring) {
          var arc = ring.animate([
            { strokeDasharray: '0 100' },
            { strokeDasharray: ring.getAttribute('stroke-dasharray') }
          ], { duration: 900, easing: 'cubic-bezier(.2,.65,.3,1)' });
          active.set(ring, arc);
          arc.onfinish = function () { active.delete(ring); };
        }
      });
    }, { threshold: .08 });
    document.querySelectorAll('[data-reveal]').forEach(function (element) { observer.observe(element); });
    function finish() { active.forEach(function (animation) { animation.cancel(); }); active.clear(); }
    if (motion.addEventListener) motion.addEventListener('change', function () { if (motion.matches) finish(); });
    document.addEventListener('focusin', function (event) {
      active.forEach(function (animation, element) {
        if (element.contains(event.target)) { animation.cancel(); active.delete(element); }
      });
    });
    window.addEventListener('beforeprint', finish);
  });

  enhance(function () {
    var progress = document.querySelector('[data-reading-progress]');
    var topLink = document.querySelector('[data-back-top]');
    if (!progress || !topLink) return;
    var queued = false;
    function render() {
      queued = false;
      var length = document.documentElement.scrollHeight - window.innerHeight;
      var value = length > 0 ? Math.max(0, Math.min(1, window.scrollY / length)) : 0;
      progress.style.setProperty('--reading-progress', value.toFixed(4));
      topLink.hidden = window.scrollY < window.innerHeight && document.activeElement !== topLink;
    }
    function schedule() { if (!queued) { queued = true; window.requestAnimationFrame(render); } }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    topLink.addEventListener('blur', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
    render();
  });

  enhance(function () {
    var form = document.querySelector('[data-beach-filters]');
    var table = document.getElementById('beach-table');
    if (!form || !table) return;
    var query = form.querySelector('[name="beach"]');
    var region = form.querySelector('[name="region"]');
    var count = document.querySelector('[data-beach-count]');
    var empty = document.querySelector('[data-beach-empty]');
    var reset = form.querySelector('[type="reset"]');
    var groups = Array.from(table.querySelectorAll('tbody')).map(function (body) {
      return {
        element: body,
        name: body.querySelector('.table__group').textContent.trim(),
        rows: Array.from(body.querySelectorAll('tr[data-id]'))
      };
    });
    function filter() {
      var search = query.value.trim().toLocaleLowerCase('en-AU').replace(/\s+/g, ' ');
      var total = 0;
      groups.forEach(function (group) {
        var visible = 0;
        group.rows.forEach(function (row) {
          var name = row.cells[0].textContent.trim().toLocaleLowerCase('en-AU');
          var match = (!region.value || region.value === group.name) && name.includes(search);
          row.hidden = !match;
          if (match) visible++;
        });
        group.element.hidden = visible === 0;
        total += visible;
      });
      count.textContent = total + (total === 1 ? ' beach' : ' beaches') + ' shown' + (region.value ? ' · ' + region.value : ' · All areas');
      empty.hidden = total !== 0;
      reset.disabled = !query.value && !region.value;
    }
    form.addEventListener('input', filter);
    form.addEventListener('change', filter);
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    form.addEventListener('reset', function (event) {
      event.preventDefault(); query.value = ''; region.value = ''; filter(); query.focus();
    });
    filter();
    form.hidden = false;
    count.hidden = false;
  });
})();
