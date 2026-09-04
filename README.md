# RipCo — marketing site

Marketing site for **RipCo**, a free iPhone app that runs computer vision on
existing public beach cameras and outlines likely rip currents on the live view.
RipCo is a Year 12 Design and Technology major work. The site is written for two
readers at once: a beachgoer deciding whether to trust the app, and an HSC marker
assessing the need, the research and the design decisions behind it.

The site never says a beach is safe, never shows a fabricated detection, and
never quotes a figure it cannot source. Keep it that way.

## Pages

| URL | Job |
| --- | --- |
| `/` | The claim, the problem (sourced figures + the survey), how it works in brief, what is in the app, the safety position, a note from the maker |
| `/how-it-works` | The three stages, a plan-view diagram of a rip, the three visual cues, what the model cannot see, how the risk score is built, the Manly pilot, a glossary, FAQ |
| `/features` | Rip detection as the core feature, the three states of the Detect screen, the home screen annotated, the six tools around it, what was left out on purpose |
| `/coverage` | Map of 26 Sydney beaches with live conditions, the beach table (source of truth for the map), what it takes to add a beach |
| `/safety` | The commitment, the flags, what to do if caught in a rip |
| `/about` | The need, who it is for, what already exists, process, research, design decisions, criteria with status, evaluation, sustainability, status, sources, colophon |
| `/early-access` | The list (dormant until Supabase keys are set), what happens to your email |
| `/privacy` | What is and is not collected |
| `/summary` | One A4 page for the folio: need, how it works, criteria and status, sources; print button |

`/beaches` and `/account` redirect to `/coverage` and `/early-access`
(see `vercel.json`).

## Things only you can fill in

Search the HTML for `STUDENT:` comments. Each marks a place where a real detail
belongs and a placeholder would be worse than nothing:

- Your name, in the maker's note on the home page and the sign-off on About.
- Survey sample size, place and month (home page and About).
- The month of the patrol-member interview (About).
- Which Manly camera, the test date range and what the model got right and wrong
  (How it works, "The Manly Beach pilot").
- A contact email (Privacy), once you decide to publish one.
- The camera and the arrangement for using its feed (Safety, ethics; How it works, pilot).
- The test log (How it works, pilot: a commented-out table is ready to fill).
- What feeds the risk score and what its bands are called (How it works, risk score).
- Whether the app's own beach list and conditions source match this site's (Coverage).
- What the app profile stores (Privacy).

Spelling: this site writes **RipCo**; the app's wordmark reads **Ripco**. Pick one before the screenshots are final.

### App screenshots

The home screen capture goes at `assets/screens/home.png` (the site expects the
983×2000 crop without the status bar; if you export a different size, update the
`width`/`height` attributes on the two `<img>` tags that reference it). It appears
in the hero on the home page and in the annotated section on the features page.
Until the file exists, the hero falls back to the drawn illustration and the
annotated section hides itself.

Further captures (the Detect screen above all) go in the same folder; use the
`SCREENSHOT SLOT` comments on the home and features pages. Any capture that shows a
detection must be genuine model output; write the caption to say the beach, the
date and the confidence figure shown.

## Stack

Static HTML, one hand-written stylesheet, vanilla JS. No framework, no build step,
no third-party scripts.

| Piece | What it is |
| --- | --- |
| `*.html` | One file per page; header and footer are identical across pages apart from the current-page marker |
| `styles.css` | The whole design system; every colour, size and space is a token in `:root` |
| `assets/js-flag.js` | One line that adds the `js` class so the mobile menu can hide until it works |
| `script.js` | Mobile navigation, screenshot fallback |
| `map.js` | Leaflet map on the coverage page; reads the beach table in the HTML |
| `auth.js` | Supabase early-access signup; dormant until the two keys at the top are set |
| `api/conditions.js` | Vercel serverless function proxying Open-Meteo, edge-cached |
| `assets/fonts/` | Newsreader (optical-size cut) and Geist, self-hosted under the OFL |
| `assets/vendor/` | Pinned, self-hosted copies of Leaflet and the Supabase client |

## Local development

```sh
npx serve .
```

`serve` handles clean URLs (`/features`), which the pages rely on. The conditions
proxy only runs on Vercel (`vercel dev` if you need it); the map falls back to
Open-Meteo directly, then to "Unavailable".

## Design system in a paragraph

Warm paper, ink, one ocean-blue accent for links and buttons. Newsreader for
headings (weight 500 at display sizes, 550–600 below), Geist for everything else.
One 80rem container with a 12-column grid, left-aligned; section titles sit on the
left with their lead on the right. Diagrams are inline SVG coloured from the
tokens, numbered as figures with captions. Green, amber and red carry meaning
only: the flags, and the detection outline. There are no gradients, blur washes,
grain, scroll animations or count-ups.

## Deployment

Vercel, region `syd1`. `vercel.json` carries clean URLs, the redirects, immutable
caching for assets and a strict header set. The CSP allows scripts from this origin
only, so do not add inline scripts.
