# Cleveland Foundation — Digital Experience Prototype

A clickable prototype of the Foundation's public site and its three signed-in / registered experiences, built as a static site so it can be hosted on GitHub Pages.

> **Prototype only.** All people, funds, balances and grants are fictional. Nothing is sent anywhere: activity is saved in the visitor's own browser, and the Salesforce / Ren iPhi sync shown in the portal is simulated.

## How the site fits together

```
index.html  ─────────────── Landing page (clevelandfoundation.org)
   │
   ├─ Log-In / "I have a fund here" ───────► portal/            Account Holder Portal
   │                                            sign-in → dashboard (DAF + organizational funds)
   ├─ Join the Community → Community Member ► community/         Community Member experience
   ├─ Join the Community → Advisor ─────────► advisors/          Advisor experience
   ├─ Non-profit Partner → Org Fund Account ► portal/?fund=eac   Portal, organizational fund selected
   └─ Impact Map / Calculator (in-page) ────► tools/             loaded only when opened
```

Only **four pages** make up the whole system. Inside each app, moving between modules happens in place — no page reload — and every module still has its own link.

## Folder structure

```
/
├── index.html                    Landing page
├── portal/index.html             Account Holder Portal
├── portal/plan/index.html        Five-year giving plan (values, contributions, investments, gifts) — opened from My profile
├── community/index.html          Community Member experience   ┐ GENERATED from src/giving/
├── advisors/index.html           Advisor experience            ┘ (do not edit — see below)
├── tools/
│   ├── impact-map.html           Landing-page impact map
│   └── impact-calculator.html    Landing-page impact calculator
├── assets/
│   ├── img/                      Logo and images (shared by every page)
│   ├── css/                      tcf-v3.css (tokens + fonts) and the three bridge files
│   ├── fonts/                    Self-hosted brand fonts (licensed, see README.txt)
│   ├── data/grants-2025.js       THE grants dataset: map tool, community/advisor map, portal map
│   ├── landing/                  landing.css · landing.js (page + navigation) · tracks.js (non-profit door, config, prefetch)
│   ├── portal/                   portal.css · data.js (engagement content) · app.js · init.js
│   ├── giving/                   Shared by community + advisors: app.js, extras.js, giving.css, map-and-grants.js
│   ├── advisors/                 Advisor-only: advisor.css, Gift Planner, Estate Checklist + FAQ
│   ├── tools/                    Map + calculator styles and scripts
│   ├── intro/welcome.html        Welcome animation (iframe) for community/advisors
│   └── js/tcf-bridge.js          Registration hand-off + deep links for community/advisors
├── src/giving/                   Source for the two app pages: page.html (shared) + community.html / advisors.html (per-app fills)
├── scripts/stamp-assets.js       Adds a ?v= fingerprint to every local .js/.css reference so browsers never run stale code
├── scripts/build-pages.js        Builds community/ and advisors/index.html from src/giving/ (no dependencies)
├── package.json                  npm run build · npm run check · npm run serve (optional shortcuts)
├── 404.html                      Friendly not-found page
└── .nojekyll                     Tells GitHub Pages to serve files as-is
```

## Direct links to modules

| App | Link pattern | Examples |
|---|---|---|
| Portal | `portal/#/<module>` | `#/home` `#/performance` `#/allocation` `#/grants` `#/history` `#/contribute` `#/statements` `#/documents` `#/endow` `#/family` `#/advisor` `#/profile` `#/plan` `#/engage` `#/feed` `#/map` `#/legends` `#/quiz` `#/garden` `#/impact` `#/qr` (org funds) |
| Community / Advisors | `community/#/<view>` · `advisors/#/<view>` | `#/home` `#/newsfeed` `#/legends` `#/history` `#/garden` `#/impactmap` `#/calculator` |

Portal links ask the person to sign in once per browser session, then open the module the link pointed to. Community and advisor links skip the intro animation and open the module directly.

## How the pages talk to each other

| Hand-off | How |
|---|---|
| Registration → community / advisors | Landing saves name, email, interests and advisor type as `tcf_registration` in the browser; the app greets the person by name. |
| Landing Log-In → portal | Opens `portal/?signin=1`, which always starts at the sign-in screen. |
| Org fund → portal | Opens `portal/?signin=1&fund=eac` so the dashboard opens on the organizational fund. |
| Sign out (any app) → landing | Returns to `index.html`. |
| Portal profile | Saved as `tcf-donor-portal-profile-v1`; **Profile → Sync & data → Reset demo** clears it. |
| Portal session | `tcf_portal_session` in sessionStorage, or localStorage when **Keep me signed in** is ticked. |
| Five-year giving plan | The plan saves itself as `tcf-five-year-plan-v2` and, after every change, a small summary as `tcf-five-year-plan-summary`, which **My profile** reads. **Reset demo** clears both. |
| Impact map interest | `impact-map-my-interests` / `impact-map-aggregate-v1` in localStorage (this browser only on a static host). |

## Speed

- Styles, scripts and images live in separate files, so the browser downloads them once and reuses them.
- The community and advisor experiences share one `assets/giving/app.js` and the rest of `assets/giving/`, downloaded once for both.
- The 2025 grants dataset (~145 KB) exists once, in `assets/data/grants-2025.js`; every map uses it, and the browser caches it across pages.
- Map pins use the coordinates stored with each grant — no address lookups at runtime.
- The landing page's map and calculator load only when someone opens them.
- After the landing page finishes loading, it quietly pre-loads the three apps in the background, so the next click feels instant.

## Preview locally

From the folder that contains this README:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. (Opening `index.html` straight from disk mostly works, but some browsers restrict saved data for `file://` pages, so a local server is closer to the real thing.)

## Publish on GitHub Pages

1. Create a repository and upload **everything in this folder**, keeping the folder structure. `index.html` must be at the top level.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-account>.github.io/<repository-name>/`.

Every link is relative, so the site works at that address without any changes.

## Design system

The site follows **Component Library 3.0**, built on the approved Digital Style Guide 2026 (10-20-2026).

- `assets/css/tcf-v3.css` — the v3 tokens and font declarations. Every page loads it first.
- `assets/css/tcf-v3-site.css`, `tcf-v3-giving.css`, `tcf-v3-tools.css` — bridges that map each app's older token names to v3 (style guide p.103) and restyle shared components.
- `assets/fonts/` — Paralucent, Paralucent Condensed and Source Sans Pro, self-hosted (licensed).
- `assets/intro/welcome.html` — the welcome animation (Giving Portal animatic v5) used by the Community and Advisor apps.

## Needs internet

The maps (Leaflet + OpenStreetMap tiles) and the portal's QR code library load from public CDNs. Everything else, including all fonts, is in this folder.

## My profile and the giving profile

**My profile** (`portal/#/profile`) is a hub with five parts, top to bottom:

1. **Who you are + profile strength.** Contact basics count 10%, registration causes 10%, and each of the five steps below 16%.
2. **Your giving profile:** five optional steps, each showing what we already know: **Your values · Contribution plan · Matched organizations · Investments · Granting plan**.
3. **Your five-year giving plan:** the optional capstone, with contributions and grants by year once the steps are filled in, and a PDF.
4. **Tell us what you care about:** the causes tagged at registration (editable), plus three ways to go deeper: a quick pick list, a values quiz and a values card game.
5. **Settings:** Profile details, Preferences, Security and Sync & data, each on its own page (`#/profile` with `{tab}`), unchanged in what they do.

The steps, the activities and the capstone all open the five-year giving plan inside the portal (`#/plan`), which runs `portal/plan/index.html` in a frame. That page is the standalone giving-plan prototype with one marked **PORTAL INTEGRATION** block at the end, which:

- hides its own header when embedded (`?embed=1`) and opens the requested section (`step=1-5`) or activity (`values=picks|quiz|cards`);
- starts a **new** plan from the fund's real balance (`balance=`) and pre-selects the donor's registration causes in the pick list (`interests=`, mapped in `INTEREST_AREAS` in `assets/portal/app.js`);
- publishes the summary the hub reads, and tells the portal when values change or the plan is saved (shown as Salesforce updates under Sync & data).

The hub never reads the plan's internals, only the summary, so either side can change as long as the summary keeps its shape (`v: 1`).

**Tony**, the AI portfolio-allocation assistant, is linked from the Investments section. Set `TONY_URL` near the top of `portal/plan/index.html`; while it's `null`, the button explains that Tony isn't connected yet.

## Maintaining it

See **REFACTOR-NOTES.md** for what changed in the October 2026 clean-up and the shared page template, the conventions to follow (load order, where data lives, escaping), and the remaining recommendations.

- **Grants data:** edit only `assets/data/grants-2025.js`. Every record needs `lat`/`lng`; a record without them is placed at its ZIP centroid and looked up once via OpenStreetMap Nominatim.
- **Community and Advisor pages are generated.** `community/index.html` and `advisors/index.html` share ~1,550 identical lines, so both are built from one template:
  1. Edit `src/giving/page.html` for anything both apps show, or `src/giving/community.html` / `src/giving/advisors.html` for the per-app parts (title, 3 menu entries, 3 home panels, extra views, extra scripts — listed at the top of each file).
  2. Run `npm run build` (or `node scripts/stamp-assets.js` then `node scripts/build-pages.js`) and commit the source **and** the generated pages. GitHub Pages serves the files as-is; no build runs on GitHub.
  3. `npm run check` exits with an error if a page is out of date, was hand-edited, or points at an old version of a script — run it before committing.
- **After editing any .js or .css file, run `npm run build`.** Pages load scripts and stylesheets as `app.js?v=<fingerprint>`. GitHub Pages lets browsers keep files for 10 minutes, so without a new fingerprint, visitors can keep running the old file (or a mix of old and new) after a deploy. The fingerprint only changes for files you edited.
- **Seeing an old version right after a deploy?** The page itself can still be cached for up to 10 minutes: hard-refresh (Ctrl+F5 / Cmd+Shift+R). Also check the address: the old site is `…/Giving_Platform_Landing_Full/` (no `_2`).
- **Shared app code:** `assets/giving/app.js` serves both community and advisors. Advisor-only hooks are guarded with `typeof`.
- **Stylesheet order is load-bearing:** `tcf-v3.css` → app stylesheet → the matching `tcf-v3-*.css` bridge.

## Open items

- **Tony:** set `TONY_URL` in `portal/plan/index.html` when the assistant has an address.
- **Giving plan storage:** the plan and its summary live in this browser only. A real build would save values, the plan and its sections to Salesforce (and planned contributions and grants to Ren iPhi) so they follow the donor across devices and reach their advisor.
- **Grantee Portal link:** set `GRANTEE_PORTAL_URL` in `assets/landing/tracks.js`. While it's blank, that option shows the "Coming soon" window.
- Placeholder content to replace before any public use: Candid seal levels, fund documents, wiring details, spending-policy figures and QR link.
- **Figures that disagree across pages** (need an approved source): $3.9B vs $3.1B granted since 1914; $90M vs $160M granted last year; "$100M+ every year this decade" vs $90M last year; ticker labelled "2026 grants" on the landing page but "2025 grants" in the apps. Details in REFACTOR-NOTES.md.
- **Gift Planner tax logic** (QCD eligibility and the household-level limit) needs review by the tax-content owner before advisors rely on it.
- **"Open a fund"** in the portal sign-in goes to "Join the Community" — there is no dedicated open-a-fund window yet.
- **Unlinked views:** `vision` (both apps) and `calculator`/`members`/`learning` on advisors are only reachable by `#/` link. Link or remove.

### Resolved

- **10-26-2026:** Paralucent web font license confirmed to cover self-hosting in a public repository; the 257 grant records in `assets/data/grants-2025.js` (organization names, addresses, grant names) confirmed OK for public display.
