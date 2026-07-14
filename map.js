/* RipCo Sydney beaches map. Loaded on beaches.html only, after the
   self-hosted Leaflet build in assets/vendor/leaflet/.

   Integrity rules for this map:
   - Pins are neutral brand blue. No safety colour is ever used as a rating.
   - The panel shows real public conditions from Open-Meteo, or "Unavailable".
     Nothing is fabricated, estimated or faked.
   - RipCo's safety read (detection, confidence, colour) is app-only and is
     shown here as a locked element with no value, real or fake. */

(function () {
  'use strict';

  /* ================================================================
     Beach data. Edit here. lat/lng in WGS84, north to south.
     live: true marks live rip detection (Manly only for now).
     ================================================================ */

  var BEACHES = [
    { id: 'palm-beach',     name: 'Palm Beach',     lat: -33.5965, lng: 151.3235, live: false },
    { id: 'whale-beach',    name: 'Whale Beach',    lat: -33.6130, lng: 151.3315, live: false },
    { id: 'avalon',         name: 'Avalon Beach',   lat: -33.6357, lng: 151.3324, live: false },
    { id: 'bilgola',        name: 'Bilgola Beach',  lat: -33.6462, lng: 151.3253, live: false },
    { id: 'newport',        name: 'Newport Beach',  lat: -33.6570, lng: 151.3225, live: false },
    { id: 'bungan',         name: 'Bungan Beach',   lat: -33.6690, lng: 151.3140, live: false },
    { id: 'mona-vale',      name: 'Mona Vale Beach', lat: -33.6777, lng: 151.3130, live: false },
    { id: 'warriewood',     name: 'Warriewood Beach', lat: -33.6890, lng: 151.3100, live: false },
    { id: 'narrabeen',      name: 'Narrabeen Beach', lat: -33.7115, lng: 151.2995, live: false },
    { id: 'collaroy',       name: 'Collaroy Beach', lat: -33.7322, lng: 151.3016, live: false },
    { id: 'long-reef',      name: 'Long Reef Beach', lat: -33.7395, lng: 151.3078, live: false },
    { id: 'dee-why',        name: 'Dee Why Beach',  lat: -33.7515, lng: 151.2985, live: false },
    { id: 'curl-curl',      name: 'Curl Curl Beach', lat: -33.7685, lng: 151.2930, live: false },
    { id: 'freshwater',     name: 'Freshwater Beach', lat: -33.7785, lng: 151.2890, live: false },
    { id: 'manly',          name: 'Manly Beach',    lat: -33.7969, lng: 151.2880, live: true },
    { id: 'bondi',          name: 'Bondi Beach',    lat: -33.8910, lng: 151.2755, live: false },
    { id: 'tamarama',       name: 'Tamarama Beach', lat: -33.8980, lng: 151.2702, live: false },
    { id: 'bronte',         name: 'Bronte Beach',   lat: -33.9037, lng: 151.2671, live: false },
    { id: 'clovelly',       name: 'Clovelly Beach', lat: -33.9120, lng: 151.2605, live: false },
    { id: 'coogee',         name: 'Coogee Beach',   lat: -33.9205, lng: 151.2571, live: false },
    { id: 'maroubra',       name: 'Maroubra Beach', lat: -33.9500, lng: 151.2570, live: false },
    { id: 'malabar',        name: 'Malabar Beach',  lat: -33.9622, lng: 151.2495, live: false },
    { id: 'wanda',          name: 'Wanda Beach',    lat: -34.0390, lng: 151.1600, live: false },
    { id: 'elouera',        name: 'Elouera Beach',  lat: -34.0432, lng: 151.1575, live: false },
    { id: 'north-cronulla', name: 'North Cronulla Beach', lat: -34.0492, lng: 151.1553, live: false },
    { id: 'cronulla',       name: 'Cronulla Beach', lat: -34.0546, lng: 151.1533, live: false }
  ];

  /* --------------------------------------------------------------
     Tiles. CARTO's keyless light basemap is the interim provider and
     acceptable at launch scale with attribution. The durable answer
     is a keyed free tier: create a key at cloud.maptiler.com, paste
     it into MAPTILER_KEY below, then in the MapTiler dashboard open
     API keys, select the key, and add your production domain under
     Allowed HTTP origins so the key works nowhere else.
     -------------------------------------------------------------- */
  var MAPTILER_KEY = '';
  var TILE_URL = MAPTILER_KEY
    ? 'https://api.maptiler.com/maps/dataviz-light/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY
    : 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  var TILE_ATTRIBUTION = (MAPTILER_KEY
    ? '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">MapTiler</a> '
    : '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a> ')
    + '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

  var mapEl = document.getElementById('beach-map');
  if (!mapEl) return;

  /* Honest failure if the vendored Leaflet did not load */
  if (typeof L === 'undefined') {
    var fallbackMsg = document.createElement('p');
    fallbackMsg.className = 'map-fallback';
    fallbackMsg.textContent = 'The interactive map could not load. Every beach and official source is listed below.';
    mapEl.textContent = '';
    mapEl.appendChild(fallbackMsg);
    return;
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() { return reducedMotion.matches; }

  /* ================================================================
     Live conditions from Open-Meteo, batched across all beaches in
     two requests. Values are cached for the session. A value that
     cannot be loaded is shown as "Unavailable", never invented.
     ================================================================ */

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
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  /* Primary path: the site's own cached proxy, one request for every
     beach, so visitors do not hit Open-Meteo directly at all. */
  function fetchViaProxy() {
    return getJson('/api/conditions', 8000).then(function (json) {
      if (!json || json.error || !json.beaches) throw new Error('proxy error');
      BEACHES.forEach(function (beach) {
        var c = json.beaches[beach.id] || {};
        conditions.byId[beach.id] = {
          airC: num(c.airC), windKmh: num(c.windKmh), windDeg: num(c.windDeg),
          waterC: num(c.waterC), waveM: num(c.waveM), waveS: num(c.waveS)
        };
      });
      conditions.fetchedAt = json.fetchedAt || null;
      conditions.stale = !!json.stale;
    });
  }

  /* Second path: direct Open-Meteo from the visitor's own IP, used only
     if the proxy fails (for example a shared-IP rate limit on the edge).
     Same two batched requests the site has always made. */
  function fetchDirect() {
    var lats = BEACHES.map(function (b) { return b.lat; }).join(',');
    var lngs = BEACHES.map(function (b) { return b.lng; }).join(',');

    var forecastUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lats +
      '&longitude=' + lngs +
      '&current=temperature_2m,wind_speed_10m,wind_direction_10m' +
      '&wind_speed_unit=kmh&timezone=Australia%2FSydney';
    var marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + lats +
      '&longitude=' + lngs +
      '&current=sea_surface_temperature,wave_height,wave_period' +
      '&timezone=Australia%2FSydney';

    return Promise.all([
      getJson(forecastUrl, 8000).catch(function () { return null; }),
      getJson(marineUrl, 8000).catch(function () { return null; })
    ]).then(function (results) {
      var forecast = toList(results[0]);
      var marine = toList(results[1]);
      BEACHES.forEach(function (beach, i) {
        var f = (forecast[i] && forecast[i].current) || {};
        var m = (marine[i] && marine[i].current) || {};
        conditions.byId[beach.id] = {
          airC: num(f.temperature_2m),
          windKmh: num(f.wind_speed_10m),
          windDeg: num(f.wind_direction_10m),
          waterC: num(m.sea_surface_temperature),
          waveM: num(m.wave_height),
          waveS: num(m.wave_period)
        };
      });
      if (forecast.length || marine.length) {
        conditions.fetchedAt = new Date().toISOString();
      }
    });
  }

  function fetchConditions() {
    return fetchViaProxy().catch(function () {
      /* Not an error for the visitor: the direct path is a clean second
         route because Open-Meteo limits by IP and theirs is unused. */
      console.warn('RipCo map: conditions proxy unavailable, using direct Open-Meteo fallback.');
      return fetchDirect();
    }).catch(function () {
      /* Both paths failed: values stay null and render as Unavailable. */
    }).then(function () {
      conditions.status = 'ready';
    });
  }

  var conditionsPromise = fetchConditions();

  /* ================================================================
     Map
     ================================================================ */

  var map = L.map(mapEl, {
    scrollWheelZoom: false,       /* keep page scroll predictable */
    zoomAnimation: !prefersReducedMotion(),
    fadeAnimation: !prefersReducedMotion(),
    markerZoomAnimation: !prefersReducedMotion(),
    minZoom: 10,
    maxZoom: 16,
    /* Sydney coastline only: tight enough that inland suburbs never
       dominate the frame, and no tiles are pulled that the site does
       not need. */
    maxBounds: L.latLngBounds([-34.30, 150.90], [-33.35, 151.75]),
    maxBoundsViscosity: 1.0
  });
  map.attributionControl.setPrefix(false);

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    detectRetina: false,
    crossOrigin: true,
    /* Tile providers block requests with a stripped Referer, so make
       sure one is sent. */
    referrerPolicy: 'strict-origin-when-cross-origin'
  }).addTo(map);

  /* Fit tight to the coastline, Palm Beach to Cronulla. The eastern
     edge extends into the sea so the coast fills the frame instead of
     the inland suburbs. */
  map.fitBounds(L.latLngBounds([-34.075, 151.13], [-33.575, 151.52]), {
    padding: [12, 12],
    animate: false
  });

  /* Neutral brand-blue pins. The live-detection beach gets a filled,
     ringed variant with a permanent "Live" label. Never a safety colour. */

  function pinSvg(live) {
    if (live) {
      return '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true" focusable="false">' +
        '<path d="M15 1.5C7.8 1.5 2 7.2 2 14.3 2 24 15 38 15 38s13-14 13-23.7C28 7.2 22.2 1.5 15 1.5Z" fill="var(--accent)" stroke="var(--paper-raised)" stroke-width="2"/>' +
        '<circle cx="15" cy="14.5" r="5.4" fill="var(--paper-raised)"/>' +
        '<circle cx="15" cy="14.5" r="2.6" fill="var(--accent)"/>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 26 35" width="26" height="35" aria-hidden="true" focusable="false">' +
      '<path d="M13 1.5C6.9 1.5 2 6.4 2 12.4 2 20.8 13 33 13 33s11-12.2 11-20.6C24 6.4 19.1 1.5 13 1.5Z" fill="var(--paper-raised)" stroke="var(--accent)" stroke-width="2"/>' +
      '<circle cx="13" cy="12.6" r="3.4" fill="var(--accent)"/>' +
      '</svg>';
  }

  /* Pins in tight north-south chains overlap at low zoom, so members
     of each chain fan a few pixels east in rotation. The offset is
     dropped once the visitor zooms in far enough for the pins to
     separate naturally. The live pin never shifts, because its
     permanent label is anchored to the true position. */
  var SPREAD_MAX_ZOOM = 12;
  var SPREAD_STEP_PX = 14;
  (function assignSpread() {
    var chain = 0;
    for (var i = 0; i < BEACHES.length; i++) {
      if (i > 0 && Math.abs(BEACHES[i].lat - BEACHES[i - 1].lat) < 0.024 &&
          Math.abs(BEACHES[i].lng - BEACHES[i - 1].lng) < 0.05) {
        chain += 1;
      } else {
        chain = 0;
      }
      BEACHES[i].spread = BEACHES[i].live ? 0 : (chain % 3) * SPREAD_STEP_PX;
    }
  })();

  function currentSpread(beach) {
    return map.getZoom() <= SPREAD_MAX_ZOOM ? beach.spread : 0;
  }

  function makeIcon(beach, spreadPx) {
    return L.divIcon({
      className: 'map-pin' + (beach.live ? ' map-pin--live' : ''),
      html: pinSvg(beach.live),
      iconSize: beach.live ? [30, 40] : [26, 35],
      iconAnchor: [(beach.live ? 15 : 13) - (spreadPx || 0), beach.live ? 38 : 33]
    });
  }

  /* ================================================================
     Details panel (one shared panel, one beach at a time)
     ================================================================ */

  var card = mapEl.closest('.map-card');
  var panel = document.createElement('aside');
  panel.className = 'map-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Beach details');
  panel.hidden = true;
  card.appendChild(panel);

  var openBeach = null;
  var lastTrigger = null;

  var STATS = [
    {
      key: 'airC', label: 'Air temp',
      icon: [{ t: 'path', a: { d: 'M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z' } }, { t: 'path', a: { d: 'M12 13.5V9' } }],
      format: function (c) { return Math.round(c.airC) + '\u00A0°C'; },
      has: function (c) { return c.airC !== null; }
    },
    {
      key: 'windKmh', label: 'Wind',
      icon: [{ t: 'path', a: { d: 'M3 8h11a3 3 0 1 0-3-3' } }, { t: 'path', a: { d: 'M3 12h15a3 3 0 1 1-3 3' } }, { t: 'path', a: { d: 'M3 16h9a2.5 2.5 0 1 1-2.5 2.5' } }],
      format: function (c) {
        var dir = c.windDeg !== null ? ' ' + compass(c.windDeg) : '';
        return Math.round(c.windKmh) + '\u00A0km/h' + dir;
      },
      has: function (c) { return c.windKmh !== null; }
    },
    {
      key: 'waterC', label: 'Water temp',
      icon: [{ t: 'path', a: { d: 'M12 3.5C12 3.5 6.5 10 6.5 14.5a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z' } }],
      format: function (c) { return Math.round(c.waterC) + '\u00A0°C'; },
      has: function (c) { return c.waterC !== null; }
    },
    {
      key: 'waveM', label: 'Swell',
      icon: [{ t: 'path', a: { d: 'M2 14c1.8-1.5 3.6-2.3 5.4-2.3S11 12.5 12 14s3.6 2.3 5.4 2.3S21 15.5 22 14' } }, { t: 'path', a: { d: 'M2 8c1.8-1.5 3.6-2.3 5.4-2.3S11 6.5 12 8' } }],
      format: function (c) {
        var v = (Math.round(c.waveM * 10) / 10).toFixed(1) + '\u00A0m';
        if (c.waveS !== null) v += ' at ' + Math.round(c.waveS) + '\u00A0s';
        return v;
      },
      has: function (c) { return c.waveM !== null; }
    }
  ];

  /* All panel content is built with DOM APIs and textContent. No dynamic
     string ever reaches innerHTML. */

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svgIcon(shapes, strokeWidth) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(strokeWidth || 1.6));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    shapes.forEach(function (shape) {
      var node = document.createElementNS(SVG_NS, shape.t);
      Object.keys(shape.a).forEach(function (k) { node.setAttribute(k, shape.a[k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  var statCells = {};
  var asAtLine = null;

  function fillStatCell(cell, beach, stat) {
    cell.textContent = '';
    if (conditions.status === 'pending') {
      var skel = el('span', 'map-skel');
      skel.setAttribute('aria-hidden', 'true');
      cell.appendChild(skel);
      cell.appendChild(el('span', 'visually-hidden', 'Loading'));
      return;
    }
    var c = conditions.byId[beach.id];
    if (c && stat.has(c)) {
      cell.appendChild(el('span', null, stat.format(c)));
    } else {
      cell.appendChild(el('span', 'map-stat__na', 'Unavailable'));
    }
  }

  function asAtText() {
    if (!conditions.fetchedAt) return '';
    var d = new Date(conditions.fetchedAt);
    if (isNaN(d.getTime())) return '';
    var hh = String(d.getHours()); if (hh.length < 2) hh = '0' + hh;
    var mm = String(d.getMinutes()); if (mm.length < 2) mm = '0' + mm;
    return 'Conditions as at ' + hh + ':' + mm;
  }

  function updateAsAt() {
    if (!asAtLine) return;
    var text = asAtText();
    asAtLine.textContent = text;
    asAtLine.hidden = !text;
  }

  function renderPanel(beach) {
    panel.textContent = '';
    statCells = {};

    var head = el('div', 'map-panel__head');
    head.appendChild(el('h3', 'map-panel__name', beach.name));
    head.appendChild(el('span', beach.live ? 'map-tag map-tag--live' : 'map-tag',
      beach.live ? 'Live' : 'Conditions only'));
    var closeBtn = el('button', 'map-panel__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close beach details');
    closeBtn.appendChild(svgIcon([{ t: 'path', a: { d: 'm6 6 12 12M18 6 6 18' } }], 2));
    closeBtn.addEventListener('click', closePanel);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    var grid = el('div', 'map-panel__stats');
    STATS.forEach(function (stat) {
      var box = el('div', 'map-stat');
      var icon = el('span', 'map-stat__icon');
      icon.setAttribute('aria-hidden', 'true');
      icon.appendChild(svgIcon(stat.icon));
      box.appendChild(icon);
      box.appendChild(el('span', 'map-stat__label', stat.label));
      var value = el('span', 'map-stat__value');
      fillStatCell(value, beach, stat);
      statCells[stat.key] = value;
      box.appendChild(value);
      grid.appendChild(box);
    });
    panel.appendChild(grid);

    asAtLine = el('p', 'map-asat');
    panel.appendChild(asAtLine);
    updateAsAt();

    var locked = el('div', 'map-locked');
    var lockedHead = el('div', 'map-locked__head');
    var lock = el('span', 'map-locked__lock');
    lock.setAttribute('aria-hidden', 'true');
    lock.appendChild(svgIcon([
      { t: 'rect', a: { x: '5', y: '10.5', width: '14', height: '9.5', rx: '2.5' } },
      { t: 'path', a: { d: 'M8 10.5V8a4 4 0 0 1 8 0v2.5' } }
    ], 1.8));
    lockedHead.appendChild(lock);
    lockedHead.appendChild(el('h4', 'map-locked__title', 'RipCo\u2019s safety read'));
    locked.appendChild(lockedHead);

    var shimmer = el('div', 'map-locked__shimmer');
    shimmer.setAttribute('aria-hidden', 'true');
    for (var s = 0; s < 3; s++) shimmer.appendChild(el('span'));
    locked.appendChild(shimmer);

    locked.appendChild(el('p', 'map-locked__body',
      (beach.live ? 'RipCo reads this beach live in the app.' : 'Detection is rolling out beach by beach.') +
      ' Rip detection, confidence and the safety colour are read in the app, and never guessed here. Always swim between the red and yellow flags.'));

    var cta = el('a', 'btn btn--primary map-locked__cta', 'Get early access');
    cta.href = '/account';
    locked.appendChild(cta);
    panel.appendChild(locked);
  }

  function refreshOpenStats() {
    if (!openBeach || panel.hidden) return;
    STATS.forEach(function (stat) {
      var cell = statCells[stat.key];
      if (cell) fillStatCell(cell, openBeach, stat);
    });
    updateAsAt();
  }

  function openPanel(beach, trigger) {
    openBeach = beach;
    lastTrigger = trigger || null;
    renderPanel(beach);
    panel.hidden = false;
    card.classList.add('map-card--panel-open');
    conditionsPromise.then(refreshOpenStats);
  }

  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    openBeach = null;
    card.classList.remove('map-card--panel-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  /* ================================================================
     Markers
     ================================================================ */

  var markerRefs = [];

  BEACHES.forEach(function (beach) {
    var marker = L.marker([beach.lat, beach.lng], {
      icon: makeIcon(beach, currentSpread(beach)),
      keyboard: true,
      riseOnHover: true,
      title: beach.name + (beach.live ? ', live rip detection in the app' : ', conditions only')
    }).addTo(map);

    if (beach.live) {
      marker.bindTooltip('Live', {
        permanent: true,
        direction: 'right',
        offset: [12, -14],
        className: 'map-live-label'
      });
    }

    marker.on('add', decorate);
    decorate();
    function decorate() {
      var el = marker.getElement();
      if (!el) return;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', beach.name + (beach.live ? ', live rip detection beach. Open details.' : ', conditions only. Open details.'));
    }

    marker.on('mouseover', function () { openPanel(beach, marker.getElement()); });
    marker.on('click', function () { openPanel(beach, marker.getElement()); });
    marker.on('keypress', function (e) {
      if (e.originalEvent && (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ')) {
        openPanel(beach, marker.getElement());
      }
    });

    markerRefs.push({ marker: marker, beach: beach, decorate: decorate });
  });

  /* Re-apply or drop the fan offset as the zoom level crosses the
     threshold. setIcon replaces the element, so accessibility
     attributes are re-applied afterwards. */
  map.on('zoomend', function () {
    markerRefs.forEach(function (ref) {
      ref.marker.setIcon(makeIcon(ref.beach, currentSpread(ref.beach)));
      ref.decorate();
    });
  });

  /* Close: Escape anywhere, tap or click on the map background */
  map.on('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });
})();
