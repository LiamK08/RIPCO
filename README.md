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
| `/how-it-works` | The three stages, a plan-view diagram of a rip, the three visual cues, what the model cannot see, how the risk score is built, the Palm Beach pilot, a glossary, FAQ |
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
- Which Palm Beach camera, the test date range and what the model got right and wrong
  (How it works, "The Palm Beach pilot").
- A contact email (Privacy), once you decide to publish one.
- The Palm Beach camera and the arrangement for using its feed (Safety, ethics; How it works, pilot).
- The test log (How it works, pilot: a commented-out table is ready to fill).
- What feeds the risk score and what its bands are called (How it works, risk score).
- Whether the app's own beach list and conditions source match this site's (Coverage).
- What the app profile stores (Privacy).

Spelling: this site writes **RipCo**; the app's wordmark reads **Ripco**. Pick one before the screenshots are final.

### App interface assets

`assets/screens/home-app.webp` is the actual 621 × 1264 home-screen capture
provided by the owner, losslessly encoded as WebP with photo metadata removed.
It appears in the phone close-up, the app reveal and the annotated features page.
The visible Manly Beach conditions are historical values in the screenshot, not
live site data. The Live tag refers to the camera, not tested rip detection.
Any future detection captures must be genuine model output and dated.

## Stack

Static HTML, one hand-written stylesheet, vanilla JS. No framework, no build step,
no third-party scripts.

| Piece | What it is |
| --- | --- |
| `*.html` | One file per page; header and footer are identical across pages apart from the current-page marker |
| `styles.css` | The whole design system; every colour, size and space is a token in `:root` |
| `assets/js-flag.js` | One line that adds the `js` class so the mobile menu can hide until it works |
| `script.js` | Mobile navigation, print support, optional screenshot fallback |
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

## Coastal design system

`styles.css` contains the original content components; `coastal.css` defines the
new shared ocean/sand palette, rounded actions, editorial typography, feature
cards, page introductions and dark footer. Newsreader and Geist stay self-hosted.
The homepage has a native scroll-linked opening in `journey.js`: aerial family
scene, over-the-shoulder phone view with an interface overlay, then a clean app
reveal. Scroll works in both directions, and no wheel or touch event is captured.
Reduced-motion users get a static opening. Skip intro moves both scroll and focus
to the main explanation. All routes remain static HTML with no build step.

### Media status

The current opening animates two generated still photographs. It is not yet a
continuous generated video. Higgsfield rejected the requested Seedance 2.5 video
because the connected account requires Plus or higher. No video job was created.
Image provenance and production prompts are in `assets/MEDIA.md`.

The optional film hook accepts a same-origin `data-film-src` on `[data-journey]`.
Use a silent H.264 MP4 with faststart and frequent keyframes for accurate seeking.
The script scrubs the film by scroll progress and keeps the stills if loading
fails. Integrate and visually test the actual clip before enabling this hook.

### Validation

Run `node --test tests/journey.test.cjs` for motion preference, scroll reversal,
keyboard focus after skip, and bounded progress tests. Browser QA covers desktop
and mobile layout, the menu, the intro, all ten pages, internal links, the coverage
map, and the unconfigured launch-list state.

## Deployment

Vercel, region `syd1`. `vercel.json` carries clean URLs, the redirects, immutable
caching for assets and a strict header set. The CSP allows scripts from this origin
only, so do not add inline scripts.
