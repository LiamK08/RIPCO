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

  var TILE_URL = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  var TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

  var mapEl = document.getElementById('beach-map');
  if (!mapEl) return;

  /* Honest failure if the vendored Leaflet did not load */
  if (typeof L === 'undefined') {
    mapEl.innerHTML = '<p class="map-fallback">The interactive map could not load. Every beach and official source is listed below.</p>';
    return;
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() { return reducedMotion.matches; }

  /* ================================================================
     Live conditions from Open-Meteo, batched across all beaches in
     two requests. Values are cached for the session. A value that
     cannot be loaded is shown as "Unavailable", never invented.
     ================================================================ */

  var conditions = { status: 'pending', byId: {} };
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

  function fetchConditions() {
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

    var getJson = function (url) {
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      });
    };

    /* Each request settles independently, so one failing source never
       hides real data from the other. */
    return Promise.all([
      getJson(forecastUrl).catch(function () { return null; }),
      getJson(marineUrl).catch(function () { return null; })
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
      conditions.status = 'ready';
    }).catch(function () {
      conditions.status = 'ready'; /* per-stat values stay null: Unavailable */
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
    minZoom: 9,
    maxZoom: 16
  });
  map.attributionControl.setPrefix(false);

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    detectRetina: false,
    crossOrigin: true
  }).addTo(map);

  var bounds = L.latLngBounds(BEACHES.map(function (b) { return [b.lat, b.lng]; }));
  map.fitBounds(bounds, { padding: [36, 36], animate: false });

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

  function makeIcon(beach) {
    return L.divIcon({
      className: 'map-pin' + (beach.live ? ' map-pin--live' : ''),
      html: pinSvg(beach.live),
      iconSize: beach.live ? [30, 40] : [26, 35],
      iconAnchor: beach.live ? [15, 38] : [13, 33]
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
      icon: '<path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z"/><path d="M12 13.5V9"/>',
      format: function (c) { return Math.round(c.airC) + '\u00A0°C'; },
      has: function (c) { return c.airC !== null; }
    },
    {
      key: 'windKmh', label: 'Wind',
      icon: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h9a2.5 2.5 0 1 1-2.5 2.5"/>',
      format: function (c) {
        var dir = c.windDeg !== null ? ' ' + compass(c.windDeg) : '';
        return Math.round(c.windKmh) + '\u00A0km/h' + dir;
      },
      has: function (c) { return c.windKmh !== null; }
    },
    {
      key: 'waterC', label: 'Water temp',
      icon: '<path d="M12 3.5C12 3.5 6.5 10 6.5 14.5a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z"/>',
      format: function (c) { return Math.round(c.waterC) + '\u00A0°C'; },
      has: function (c) { return c.waterC !== null; }
    },
    {
      key: 'waveM', label: 'Swell',
      icon: '<path d="M2 14c1.8-1.5 3.6-2.3 5.4-2.3S11 12.5 12 14s3.6 2.3 5.4 2.3S21 15.5 22 14"/><path d="M2 8c1.8-1.5 3.6-2.3 5.4-2.3S11 6.5 12 8"/>',
      format: function (c) {
        var v = (Math.round(c.waveM * 10) / 10).toFixed(1) + '\u00A0m';
        if (c.waveS !== null) v += ' at ' + Math.round(c.waveS) + '\u00A0s';
        return v;
      },
      has: function (c) { return c.waveM !== null; }
    }
  ];

  function statValueHtml(beach, stat) {
    if (conditions.status === 'pending') {
      return '<span class="map-skel" aria-hidden="true"></span><span class="visually-hidden">Loading</span>';
    }
    var c = conditions.byId[beach.id];
    if (c && stat.has(c)) {
      var span = document.createElement('span');
      span.textContent = stat.format(c);
      return span.outerHTML;
    }
    return '<span class="map-stat__na">Unavailable</span>';
  }

  function renderPanel(beach) {
    var tag = beach.live
      ? '<span class="map-tag map-tag--live">Live</span>'
      : '<span class="map-tag">Conditions only</span>';
    var lockedLine = beach.live
      ? 'RipCo reads this beach live in the app.'
      : 'Detection is rolling out beach by beach.';

    var statsHtml = STATS.map(function (stat) {
      return '<div class="map-stat">' +
        '<span class="map-stat__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + stat.icon + '</svg></span>' +
        '<span class="map-stat__label">' + stat.label + '</span>' +
        '<span class="map-stat__value" data-stat="' + stat.key + '">' + statValueHtml(beach, stat) + '</span>' +
        '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="map-panel__head">' +
        '<h3 class="map-panel__name">' + beach.name + '</h3>' +
        tag +
        '<button class="map-panel__close" type="button" aria-label="Close beach details" data-map-close>' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="map-panel__stats">' + statsHtml + '</div>' +
      '<div class="map-locked">' +
        '<div class="map-locked__head">' +
          '<span class="map-locked__lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span>' +
          '<h4 class="map-locked__title">RipCo’s safety read</h4>' +
        '</div>' +
        '<div class="map-locked__shimmer" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<p class="map-locked__body">' + lockedLine + ' Rip detection, confidence and the safety colour are read in the app, and never guessed here. Always swim between the red and yellow flags.</p>' +
        '<a class="btn btn--primary map-locked__cta" href="account.html">Get early access</a>' +
      '</div>';

    panel.querySelector('[data-map-close]').addEventListener('click', closePanel);
  }

  function refreshOpenStats() {
    if (!openBeach || panel.hidden) return;
    STATS.forEach(function (stat) {
      var cell = panel.querySelector('[data-stat="' + stat.key + '"]');
      if (cell) cell.innerHTML = statValueHtml(openBeach, stat);
    });
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

  BEACHES.forEach(function (beach) {
    var marker = L.marker([beach.lat, beach.lng], {
      icon: makeIcon(beach),
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
  });

  /* Close: Escape anywhere, tap or click on the map background */
  map.on('click', closePanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });
})();
