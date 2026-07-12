/* RipCo conditions proxy. Vercel Serverless Function, Node runtime,
   zero dependencies, no build step.

   Purpose: every visitor reads beach conditions from this endpoint, and
   Vercel's edge cache (s-maxage=600, stale-while-revalidate=3600) serves
   almost all of them. The function itself makes at most TWO upstream
   Open-Meteo calls per cache period, batched across all beaches with
   multi-coordinate requests, current values only (six variables total),
   which keeps the Open-Meteo call weight at 1 per request.

   Integrity rules:
   - The response carries raw public conditions only. It never computes or
     returns a safety verdict, rating, detection result, confidence figure
     or score of any kind.
   - A value that cannot be fetched is null. Nothing is ever invented.
   - If upstream fails, the last good snapshot is served with stale: true
     and its original timestamp, so recency is always honest. */

'use strict';

/* Keep this list in sync with BEACHES in /map.js (ids and coordinates). */
var BEACHES = [
  { id: 'palm-beach', lat: -33.5965, lng: 151.3235 },
  { id: 'whale-beach', lat: -33.6130, lng: 151.3315 },
  { id: 'avalon', lat: -33.6357, lng: 151.3324 },
  { id: 'bilgola', lat: -33.6462, lng: 151.3253 },
  { id: 'newport', lat: -33.6570, lng: 151.3225 },
  { id: 'bungan', lat: -33.6690, lng: 151.3140 },
  { id: 'mona-vale', lat: -33.6777, lng: 151.3130 },
  { id: 'warriewood', lat: -33.6890, lng: 151.3100 },
  { id: 'narrabeen', lat: -33.7115, lng: 151.2995 },
  { id: 'collaroy', lat: -33.7322, lng: 151.3016 },
  { id: 'long-reef', lat: -33.7395, lng: 151.3078 },
  { id: 'dee-why', lat: -33.7515, lng: 151.2985 },
  { id: 'curl-curl', lat: -33.7685, lng: 151.2930 },
  { id: 'freshwater', lat: -33.7785, lng: 151.2890 },
  { id: 'manly', lat: -33.7969, lng: 151.2880 },
  { id: 'bondi', lat: -33.8910, lng: 151.2755 },
  { id: 'tamarama', lat: -33.8980, lng: 151.2702 },
  { id: 'bronte', lat: -33.9037, lng: 151.2671 },
  { id: 'clovelly', lat: -33.9120, lng: 151.2605 },
  { id: 'coogee', lat: -33.9205, lng: 151.2571 },
  { id: 'maroubra', lat: -33.9500, lng: 151.2570 },
  { id: 'malabar', lat: -33.9622, lng: 151.2495 },
  { id: 'wanda', lat: -34.0390, lng: 151.1600 },
  { id: 'elouera', lat: -34.0432, lng: 151.1575 },
  { id: 'north-cronulla', lat: -34.0492, lng: 151.1553 },
  { id: 'cronulla', lat: -34.0546, lng: 151.1533 }
];

var LATS = BEACHES.map(function (b) { return b.lat; }).join(',');
var LNGS = BEACHES.map(function (b) { return b.lng; }).join(',');

var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + LATS +
  '&longitude=' + LNGS +
  '&current=temperature_2m,wind_speed_10m,wind_direction_10m' +
  '&wind_speed_unit=kmh&timezone=Australia%2FSydney';
var MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + LATS +
  '&longitude=' + LNGS +
  '&current=sea_surface_temperature,wave_height,wave_period' +
  '&timezone=Australia%2FSydney';

var UPSTREAM_TIMEOUT_MS = 5000;

/* Last good snapshot survives between invocations of a warm function
   instance, giving a graceful answer when upstream is down or limited. */
var lastGood = null;

function num(v) {
  return (typeof v === 'number' && isFinite(v)) ? v : null;
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') return [payload];
  return [];
}

function fetchJson(url) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, UPSTREAM_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal })
    .then(function (res) {
      /* 429 and 5xx are explicit upstream failures, not data */
      if (!res.ok) throw new Error('upstream ' + res.status);
      return res.json();
    })
    .finally(function () { clearTimeout(timer); });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');

  try {
    var results = await Promise.all([
      fetchJson(FORECAST_URL).catch(function () { return null; }),
      fetchJson(MARINE_URL).catch(function () { return null; })
    ]);

    var forecast = toList(results[0]);
    var marine = toList(results[1]);
    var gotForecast = forecast.length === BEACHES.length;
    var gotMarine = marine.length === BEACHES.length;

    /* Total upstream failure: serve the last good snapshot, marked stale,
       with its original timestamp. Never a fabricated value. */
    if (!gotForecast && !gotMarine) {
      if (lastGood) {
        res.statusCode = 200;
        res.end(JSON.stringify({
          fetchedAt: lastGood.fetchedAt,
          stale: true,
          beaches: lastGood.beaches
        }));
        return;
      }
      res.statusCode = 502;
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      res.end(JSON.stringify({ error: 'upstream unavailable' }));
      return;
    }

    var beaches = {};
    BEACHES.forEach(function (beach, i) {
      var f = (gotForecast && forecast[i] && forecast[i].current) || {};
      var m = (gotMarine && marine[i] && marine[i].current) || {};
      beaches[beach.id] = {
        airC: num(f.temperature_2m),
        windKmh: num(f.wind_speed_10m),
        windDeg: num(f.wind_direction_10m),
        waterC: num(m.sea_surface_temperature),
        waveM: num(m.wave_height),
        waveS: num(m.wave_period)
      };
    });

    var body = {
      fetchedAt: new Date().toISOString(),
      stale: false,
      beaches: beaches
    };
    lastGood = { fetchedAt: body.fetchedAt, beaches: beaches };

    res.statusCode = 200;
    res.end(JSON.stringify(body));
  } catch (err) {
    /* Belt and braces: nothing above should throw, but a hung or broken
       invocation must still answer. */
    if (lastGood) {
      res.statusCode = 200;
      res.end(JSON.stringify({
        fetchedAt: lastGood.fetchedAt,
        stale: true,
        beaches: lastGood.beaches
      }));
      return;
    }
    res.statusCode = 502;
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.end(JSON.stringify({ error: 'conditions unavailable' }));
  }
};
