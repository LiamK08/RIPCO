# RipCo — marketing site

Marketing site for **RipCo**, an iOS app that runs computer vision on existing
public beach cameras to detect rip currents and show them as a clear visual
warning. RipCo is an aid for beachgoers, never a substitute for lifeguards and
the red and yellow flags — the site is written and designed around that rule.

## Stack

Deliberately boring: static HTML, one hand-written stylesheet, vanilla JS.
No framework, no build step, no client-side dependencies fetched from a CDN.

| Piece | What it is |
| --- | --- |
| `*.html` | One file per page, shared header/footer markup |
| `styles.css` | The whole design system ("Sunlit Coast"); every colour is a token in `:root` |
| `script.js` | Shared behaviour (nav, reveals, FAQ, detection diagram) — all progressive enhancement |
| `map.js` | Leaflet map of Sydney beaches with live conditions (beaches page only) |
| `auth.js` | Supabase early-access signup (account page only; dormant until keys are set) |
| `api/conditions.js` | Vercel serverless function proxying Open-Meteo, edge-cached |
| `assets/vendor/` | Pinned, self-hosted copies of Leaflet and the Supabase client |

## Local development

Any static file server works:

```sh
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000>. Notes:

- Production uses Vercel's `cleanUrls`, so internal links are extension-less
  (`/features`). With a plain file server, open pages as `/features.html`.
- `/api/conditions` only runs on Vercel (`vercel dev` if you need it locally);
  the map falls back gracefully without it.

## Deployment

Deployed on Vercel, region `syd1`. `vercel.json` carries the whole config:
clean URLs, long-lived immutable caching for assets, and a strict security
header set (CSP with hashed inline script, HSTS, frame denial). If you add an
inline script, its hash must be added to the CSP or it will not execute.

A custom `404.html` is served automatically for unknown routes.

## Design system in one paragraph

Warm paper canvas, editorial Newsreader serif headlines with exactly one
italic accent word, Geist for body text, and a deep oceanic accent. Green,
amber and red are **locked safety signals** and are never used decoratively.
Missing imagery renders as quiet labelled slots — the site never fakes an app
UI, a photo or a detection result. All tokens live at the top of `styles.css`.

## House rules

- RipCo never tells anyone a beach is safe to enter. No copy, component or
  data display may imply a safety verdict.
- Every claim defers to the official sources: BeachSafe, Surf Life Saving
  Australia and the Bureau of Meteorology.
- No tracking, no analytics, no third-party requests beyond the documented
  data sources in the CSP.
