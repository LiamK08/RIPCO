/* RipCo coverage map. Loaded on coverage.html only, after the self-hosted
   Leaflet build in assets/vendor/leaflet/.

   The list of beaches lives in the HTML table on the page (#beach-table),
   so the map, the table and screen readers all read the same source.

   Rules for this map:
   - Pins are brand blue. No safety colour is ever used as a rating.
   - The panel shows public conditions from Open-Meteo, or "Unavailable".
     Nothing is estimated or invented.
   - Rip detection is described in words only ("tested" or "not tested"),
     never as a value, colour or score. */

(function () {
  'use strict';

  var mapEl = document.getElementById('beach-map');
  var table = document.getElementById('beach-table');
  var panel = document.getElementById('beach-panel');
  if (!mapEl || !table || !panel) return;

  /* ---------------- Beaches, from the table ---------------- */
  var BEACHES = [];
  Array.prototype.forEach.call(table.querySelectorAll('tbody tr[data-id]'), function (row) {
    var lat = parseFloat(row.getAttribute('data-lat'));
    var lng = parseFloat(row.getAttribute('data-lng'));
    if (isNaN(lat) || isNaN(lng)) return;
    BEACHES.push({
      id: row.getAttribute('data-id'),
      name: (row.cells[0] && row.cells[0].textContent || '').trim(),
      lat: lat,
      lng: lng,
      detect: row.getAttribute('data-detect') === 'tested'
    });
  });
  if (!BEACHES.length) return;

  /* ---------------- Honest failure states ---------------- */
  var noteEl = document.querySelector('[data-map-note]');
  function showFallback(text) {
    mapEl.textContent = '';
    var p = document.createElement('p');
    p.className = 'map__fallback';
    p.textContent = text;
    mapEl.appendChild(p);
  }
  if (typeof L === 'undefined') {
    showFallback('The interactive map could not load. Every beach is listed in the table below.');
    document.querySelectorAll('[data-map-select]').forEach(function (button) {
      button.disabled = true;
      button.title = 'The map is unavailable. Use the beach directory below.';
    });
    return;
  }

  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = motionPreference.matches;
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', function () {
    reducedMotion = motionPreference.matches;
    map.options.zoomAnimation = !reducedMotion;
    map.options.fadeAnimation = !reducedMotion;
    map.options.markerZoomAnimation = !reducedMotion;
    if (reducedMotion) map.stop();
  });

  /* ---------------- Tiles ----------------
     CARTO's keyless light basemap, with attribution. To move to a keyed
     provider, set MAPTILER_KEY and restrict the key to this domain. */
  var MAPTILER_KEY = '';
  var TILE_URL = MAPTILER_KEY
    ? 'https://api.maptiler.com/maps/dataviz-light/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY
    : 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  var TILE_ATTRIBUTION = (MAPTILER_KEY
    ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> '
    : '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a> ')
    + '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

  /* ---------------- Conditions ----------------
     One request to this site's cached proxy for every beach. If the proxy
     fails, the two batched Open-Meteo requests are made directly. */
  var conditions = { status: 'pending', byId: {}, fetchedAt: null, stale: false };
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass(deg) {
    if (typeof deg !== 'number' || isNaN(deg)) return '';
    return COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
  }
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function toList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') return [payload];
    return [];
  }
  function getJson(url, timeoutMs) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(url, { signal: controller.signal })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .finally(function () { clearTimeout(timer); });
  }
  function fetchViaProxy() {
    return getJson('/api/conditions', 8000).then(function (json) {
      if (!json || json.error || !json.beaches) throw new Error('proxy error');
      BEACHES.forEach(function (b) {
        var c = json.beaches[b.id] || {};
        conditions.byId[b.id] = { airC: num(c.airC), windKmh: num(c.windKmh), windDeg: num(c.windDeg), waterC: num(c.waterC), waveM: num(c.waveM), waveS: num(c.waveS) };
      });
      conditions.fetchedAt = json.fetchedAt || null;
      conditions.stale = !!json.stale;
    });
  }
  function fetchDirect() {
    var lats = BEACHES.map(function (b) { return b.lat; }).join(',');
    var lngs = BEACHES.map(function (b) { return b.lng; }).join(',');
    var forecastUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lats + '&longitude=' + lngs +
      '&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=Australia%2FSydney';
    var marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + lats + '&longitude=' + lngs +
      '&current=sea_surface_temperature,wave_height,wave_period&timezone=Australia%2FSydney';
    return Promise.all([
      getJson(forecastUrl, 8000).catch(function () { return null; }),
      getJson(marineUrl, 8000).catch(function () { return null; })
    ]).then(function (results) {
      var forecast = toList(results[0]);
      var marine = toList(results[1]);
      BEACHES.forEach(function (b, i) {
        var f = (forecast[i] && forecast[i].current) || {};
        var m = (marine[i] && marine[i].current) || {};
        conditions.byId[b.id] = { airC: num(f.temperature_2m), windKmh: num(f.wind_speed_10m), windDeg: num(f.wind_direction_10m), waterC: num(m.sea_surface_temperature), waveM: num(m.wave_height), waveS: num(m.wave_period) };
      });
      if (forecast.length || marine.length) conditions.fetchedAt = new Date().toISOString();
    });
  }
  var conditionsPromise = fetchViaProxy()
    .catch(function () { return fetchDirect(); })
    .catch(function () { /* both failed: values stay null and render as Unavailable */ })
    .then(function () { conditions.status = 'ready'; });

  /* ---------------- Map ---------------- */
  var map = L.map(mapEl, {
    scrollWheelZoom: false,
    zoomAnimation: !reducedMotion,
    fadeAnimation: !reducedMotion,
    markerZoomAnimation: !reducedMotion,
    minZoom: 10,
    maxZoom: 16,
    maxBounds: L.latLngBounds([-34.30, 150.90], [-33.35, 151.75]),
    maxBoundsViscosity: 1.0
  });
  map.attributionControl.setPrefix(false);

  var tiles = L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    detectRetina: false,
    crossOrigin: true,
    referrerPolicy: 'strict-origin-when-cross-origin'
  }).addTo(map);
  var tileErrors = 0, tileLoads = 0;
  tiles.on('tileload', function () { tileLoads += 1; });
  tiles.on('tileerror', function () {
    tileErrors += 1;
    if (tileErrors >= 6 && tileLoads === 0 && noteEl) {
      noteEl.textContent = 'Map tiles could not load. The pins and the table below still work.';
    }
  });

  /* Fit the coast, Palm Beach to Cronulla, with the sea filling the frame's east side. */
  var lats = BEACHES.map(function (b) { return b.lat; });
  var lngs = BEACHES.map(function (b) { return b.lng; });
  map.fitBounds(L.latLngBounds(
    [Math.min.apply(null, lats) - 0.02, Math.min.apply(null, lngs) - 0.03],
    [Math.max.apply(null, lats) + 0.02, Math.max.apply(null, lngs) + 0.12]
  ), { padding: [8, 8], animate: false });

  /* ---------------- Pins ---------------- */
  function pinSvg(detect) {
    if (detect) {
      return '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true" focusable="false">' +
        '<path d="M15 1.5C7.8 1.5 2 7.2 2 14.3 2 24 15 38 15 38s13-14 13-23.7C28 7.2 22.2 1.5 15 1.5Z" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>' +
        '<circle cx="15" cy="14.5" r="5.4" fill="var(--surface)"/></svg>';
    }
    return '<svg viewBox="0 0 26 35" width="26" height="35" aria-hidden="true" focusable="false">' +
      '<path d="M13 1.5C6.9 1.5 2 6.4 2 12.4 2 20.8 13 33 13 33s11-12.2 11-20.6C24 6.4 19.1 1.5 13 1.5Z" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>' +
      '<circle cx="13" cy="12.6" r="3.4" fill="var(--accent)"/></svg>';
  }

  /* Pins in tight north-south chains overlap at low zoom, so chain members
     fan a few pixels east in rotation until the visitor zooms in. */
  var SPREAD_MAX_ZOOM = 14, SPREAD_STEP_PX = 24;
  (function assignSpread() {
    var chain = 0;
    for (var i = 0; i < BEACHES.length; i++) {
      var prev = BEACHES[i - 1];
      chain = (prev && Math.abs(BEACHES[i].lat - prev.lat) < 0.024 && Math.abs(BEACHES[i].lng - prev.lng) < 0.05) ? chain + 1 : 0;
      BEACHES[i].spread = BEACHES[i].detect ? 0 : (chain % 3) * SPREAD_STEP_PX;
    }
  })();
  function currentSpread(b) { return map.getZoom() <= SPREAD_MAX_ZOOM ? b.spread : 0; }
  function makeIcon(b, spreadPx) {
    return L.divIcon({
      className: 'map-pin' + (b.detect ? ' map-pin--detect' : '') + (selected === b ? ' is-selected' : ''),
      html: pinSvg(b.detect),
      iconSize: b.detect ? [30, 40] : [26, 35],
      iconAnchor: [(b.detect ? 15 : 13) - (spreadPx || 0), b.detect ? 38 : 33]
    });
  }

  /* ---------------- Panel ---------------- */
  var nameEl = panel.querySelector('[data-panel-name]');
  var introEl = panel.querySelector('[data-panel-intro]');
  var bodyEl = panel.querySelector('[data-panel-body]');
  var selected = null;
  var cells = {};

  var STATS = [
    { key: 'airC', label: 'Air', has: function (c) { return c.airC !== null; }, format: function (c) { return Math.round(c.airC) + ' °C'; } },
    { key: 'windKmh', label: 'Wind', has: function (c) { return c.windKmh !== null; }, format: function (c) { return Math.round(c.windKmh) + ' km/h' + (c.windDeg !== null ? ' ' + compass(c.windDeg) : ''); } },
    { key: 'waterC', label: 'Water', has: function (c) { return c.waterC !== null; }, format: function (c) { return Math.round(c.waterC) + ' °C'; } },
    { key: 'waveM', label: 'Swell', has: function (c) { return c.waveM !== null; }, format: function (c) { var v = (Math.round(c.waveM * 10) / 10).toFixed(1) + ' m'; if (c.waveS !== null) v += ' at ' + Math.round(c.waveS) + ' s'; return v; } }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fillCell(cell, b, stat) {
    cell.textContent = '';
    if (conditions.status === 'pending') {
      var skel = el('span', 'map__skel'); skel.setAttribute('aria-hidden', 'true');
      cell.appendChild(skel);
      cell.appendChild(el('span', 'visually-hidden', 'Loading'));
      return;
    }
    var c = conditions.byId[b.id];
    if (c && stat.has(c)) cell.appendChild(el('span', null, stat.format(c)));
    else cell.appendChild(el('span', 'na', 'Unavailable'));
  }

  function asAtText() {
    if (!conditions.fetchedAt) return '';
    var d = new Date(conditions.fetchedAt);
    if (isNaN(d.getTime())) return '';
    var hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    return 'Conditions as at ' + hh + ':' + mm + (conditions.stale ? ' (last good reading)' : '');
  }

  function renderPanel(b) {
    nameEl.textContent = b.name;
    if (introEl) introEl.hidden = true;
    bodyEl.hidden = false;
    bodyEl.textContent = '';
    cells = {};

    var pill = el('span', 'pill', b.detect ? 'Rip detection tested' : 'Conditions only');

    var grid = el('div', 'map__stats');
    STATS.forEach(function (stat) {
      var box = el('div', 'map__stat');
      box.appendChild(el('span', 'map__stat-label', stat.label));
      var value = el('span', 'map__stat-value');
      fillCell(value, b, stat);
      cells[stat.key] = value;
      box.appendChild(value);
      grid.appendChild(box);
    });
    bodyEl.appendChild(grid);

    var asat = el('p', 'map__asat');
    asat.textContent = asAtText();
    asat.hidden = !asat.textContent;
    bodyEl.appendChild(asat);

    var detect = el('div', 'map__detect');
    detect.appendChild(pill);
    detect.appendChild(el('p', null, b.detect
      ? 'I trained and tested the detection model on a public camera at this beach. Outlines and confidence figures appear in the app only.'
      : 'Rip detection has not been tested at this beach. This page shows its conditions.'));
    bodyEl.appendChild(detect);

    var links = el('p', 'map__panel-links');
    var a = el('a', null, 'Patrol times and hazards on BeachSafe');
    a.href = 'https://beachsafe.org.au'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    links.appendChild(a);
    bodyEl.appendChild(links);
  }

  function refreshCells() {
    if (!selected) return;
    STATS.forEach(function (stat) { if (cells[stat.key]) fillCell(cells[stat.key], selected, stat); });
    var asat = bodyEl.querySelector('.map__asat');
    if (asat) { asat.textContent = asAtText(); asat.hidden = !asat.textContent; }
  }

  var markers = [];
  function select(b, focus) {
    selected = b;
    document.querySelectorAll('.coast-shortcuts [data-map-select]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-map-select') === b.id ? 'true' : 'false');
    });
    renderPanel(b);
    markers.forEach(function (m) { m.marker.setIcon(makeIcon(m.beach, currentSpread(m.beach))); m.decorate(); });
    conditionsPromise.then(refreshCells);
    if (focus && nameEl) nameEl.focus({ preventScroll: true });
  }

  /* ---------------- Markers ---------------- */
  BEACHES.forEach(function (b) {
    var marker = L.marker([b.lat, b.lng], {
      icon: makeIcon(b, 0),
      keyboard: false,
      riseOnHover: true,
      title: b.name + (b.detect ? ', rip detection tested' : ', conditions only')
    }).addTo(map);

    if (b.detect) {
      marker.bindTooltip('Tested', { permanent: true, direction: 'right', offset: [12, -14], className: 'map-label' });
    }

    function decorate() {
      var node = marker.getElement();
      if (!node) return;
      /* Pins are pointer targets; the keyboard path is the table's buttons. */
      node.setAttribute('aria-hidden', 'true');
    }
    marker.on('add', decorate);
    decorate();

    marker.on('click', function () {
      select(b, true);
      if (window.matchMedia('(max-width: 56em)').matches) panel.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
    });

    markers.push({ marker: marker, beach: b, decorate: decorate });
  });

  map.on('zoomend', function () {
    markers.forEach(function (m) { m.marker.setIcon(makeIcon(m.beach, currentSpread(m.beach))); m.decorate(); });
  });

  /* Table buttons: one keyboard path through the beaches. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-map-select]'), function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-map-select');
      for (var i = 0; i < BEACHES.length; i++) {
        if (BEACHES[i].id === id) {
          select(BEACHES[i], true);
          map.panTo([BEACHES[i].lat, BEACHES[i].lng], { animate: !reducedMotion });
          panel.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
          break;
        }
      }
    });
  });

  /* The tested beach is shown by default. */
  var initial = null;
  for (var i = 0; i < BEACHES.length; i++) { if (BEACHES[i].detect) { initial = BEACHES[i]; break; } }
  select(initial || BEACHES[0], false);
})();
