# Refactor notes — October 2026 clean-up

**Scope:** the static prototype (landing page, Account Holder Portal, Community and Advisor apps, Impact Map, Impact Calculator).
**Goal:** fix loose ends, remove dead code left over from the earlier single-file builds, and make the code base easier to maintain — **without changing what visitors see**, except where something was broken.
**Diff:** a line-by-line comparison against the files as received was produced during the clean-up (`docs/refactor-2026-10.diff` in the working copy). It is not part of this repository.

Summary: 26 files touched, about 2,300 lines removed and 380 added. The code is about 430 KB smaller (fonts excluded). No console errors on any page before or after.

---

## 1. Structural changes

| Change | Why | Where |
|---|---|---|
| **One grants dataset.** The 257 grant records, pillars, ZIP and neighbourhood coordinates were copied into three files: the map tool, the in-app map, and the portal. Now one file. | One place to update. About 290 KB less per page set. Verified byte-identical before merging, and the portal copy was a field-for-field subset. | `assets/data/grants-2025.js` (new). Consumers alias `window.TCF_*`: `assets/tools/map/map.js`, `assets/giving/map-and-grants.js`, `assets/portal/data.js` |
| **One app script for community and advisors.** The two `app.js` files were identical except for two lines. | Fix once, not twice. The browser caches it across both apps. | `assets/giving/app.js`. The advisor hooks are guarded with `typeof initEstateView === 'function'`. `assets/community/` was removed. |
| **Landing navigation lives in one place.** `landing.js` defined iframe-embed versions of `enterPortal`/`enterMap`/`enterCalc`/`submitTellUs`, and `tracks.js` then overwrote them. The embed versions referenced elements and base64 blobs (`PORTAL_B64`, `#portalFrame`) that no longer exist. | Code that is defined, then silently replaced, is a trap for the next person. | `landing.js` → **SITE NAVIGATION** section. `tracks.js` now holds only the non-profit door, `GRANTEE_PORTAL_URL` config, the `#join` deep link and the prefetch list. |
| **Unreachable landing code removed.** Removed: the three-question "donor journey" router (`TRACKS`, `J_STEPS`, `jPick` …), the greeter's "welcome back" mode, and the `login`, `map`, `journey`, `sortCommunity`, `circles` and `story` popups (plus `buildMiniMap`, `openStory`, `ffGive`, `circleJoin`, `regDone`). | Nothing could open them (verified by grep across HTML and JS). `landing.js` went from 966 to 597 lines. | `assets/landing/landing.js`. The `SEGMENTS` strategy view is kept, because the "Prototype" badge still opens it. |

### 1a. Shared page template for Community and Advisors (follow-up)

The two app pages were ~1,550 identical lines with five small differences, so every shared fix had to be made twice. They are now **generated** from one source:

| File | Holds |
|---|---|
| `src/giving/page.html` | Everything both apps show, with `{{title}}` and nine `<!-- @slot name -->` markers |
| `src/giving/community.html` / `advisors.html` | Each app's fills: title, extra stylesheet, 3 drawer entries, 3 home panels, extra views, extra scripts (the slot list is at the top of each file) |
| `scripts/build-pages.js` | Dependency-free generator. `--check` fails if output is stale or hand-edited. Fails loudly on a missing, extra or duplicate slot/fill |

**Why a build step rather than runtime JavaScript?** The pages stay plain static HTML, with no flash of missing menus, no `fetch` of partials (which breaks when opened from disk), and nothing new for GitHub Pages to run. The generated files are committed, so hosting is unchanged.

**How it was proven safe:** the template and fills were extracted by script from the existing pages. The first build reproduced **both pages byte-for-byte**, apart from a one-line "GENERATED — do not edit" banner.

**One deliberate change after that proof:** on the advisor page, the Estate Checklist, Gift Planner and FAQ views had been pasted *after* `</main>` (between the dock comment and the dock), outside the page's main landmark. The `app-views` slot now sits at the end of `<main>`, so those views are inside it like every other view. No CSS or JS depended on the old position (checked). In the browser, all 23 views are inside `<main>` and render normally. The community page is unchanged.

**Left as-is on purpose:** the advisor page still carries the community-only `learning`, `calculator`, `members` and `vision` views, which are unreachable from its menus. Making them community-only is now a one-line move into `community.html`'s `app-views` fill, but it is a product decision (see open items), so the markup was not changed.

## 2. Bugs fixed

| # | Bug | Effect | Fix |
|---|---|---|---|
| 1 | **The map re-geocoded every grant on every visit.** It cached through `window.storage`, an API from the artifact environment the map was first built in. That API doesn't exist on GitHub Pages, so the cache was always empty. | Each visitor sent about 257 requests to OpenStreetMap Nominatim (around 4–5 minutes at 1 per second). That goes against Nominatim's usage policy, and pins jumped around while it ran. All 257 records already had coordinates, which were being ignored. | Pins use stored `lat`/`lng`. Lookups happen only for a record without coordinates. Storage uses `window.storage` if present, otherwise `localStorage`. **Verified: 0 Nominatim requests.** |
| 2 | `--red:var(--red)` in `map.css` and `giving.css`. | A self-referencing custom property is invalid, so `--red` was empty on those pages. "Clear all filters" lost its colour. | Removed; `tcf-v3.css` already defines `--red`. |
| 3 | Regional grants showed "Suite 900, OH" as the city. | 3 of 13 regional cards were wrong. | The city is taken from the end of the address. |
| 4 | Portal `#/map` and `#/qr` deep links always showed "needs an internet connection" / "QR library didn't load". | Leaflet and qrcodejs are loaded with `defer`, but `init.js` ran before them. | `init.js` runs on `DOMContentLoaded`. **Verified:** map tiles and the QR code render on first load. |
| 5 | Portal `#/cart` gave a blank page, or a cart sheet over the sign-in screen. | | The cart opens over the dashboard, and only after sign-in. |
| 6 | Portal accepted render hooks (`#/map_after`, `#/home_after`) as routes. | Rendered "undefined" or threw. | `isRoute()` excludes `_after` / `_range` hooks. |
| 7 | "Keep me signed in" did nothing. | | The session flag goes to `localStorage` when ticked, otherwise `sessionStorage`. Sign-out clears both. |
| 8 | Leaflet map instances leaked on every portal map re-render. | | `LMAP.remove()` runs before a new map is created. |
| 9 | Community/advisor: the calculator rendered twice on first visit. | | A single call. |
| 10 | Community/advisor: the first page load added a duplicate Back-button entry. | | The first navigation uses `replaceState`. |
| 11 | Impact Calculator: turning "others giving alongside you" off and on reset the count to 1 ("With 1 people…"). The $25 preset was highlighted while the amount was $50. | | The count is kept. "person"/"people" is pluralized. The preset state matches the amount. |
| 12 | The Impact Map page set `maximum-scale=1`. | Blocks pinch-zoom (accessibility, WCAG 1.4.4). | Removed. |

## 3. Safety and hardening

- **Escaping.** Typed text and names now go through an escape helper before `innerHTML`:
  - community/advisor garden answers, "your why" post and avatar initials (`escHtml`, `initialsOf` in `assets/giving/app.js`)
  - map attribute values: `escAttr` now escapes `&`; give links, ids and colours are escaped
  - the portal's `jsq()` now hex-escapes `"`, `<` and `&`, because its output sits inside `onclick="…"` attributes
- **Honest copy.** The map's "community interest" modal claimed a running tally of all visitors. On a static host it can only count this browser, and the text now says so.
- **Prototype data handling** is labelled in code:
  - Registration name/email stay in this browser's `localStorage` only (`submitTellUs`).
  - The non-profit help form sends nothing (`submitNonprofitHelp`).
  - A real build must send these to the CRM with consent.

## 4. Dead code and duplicate CSS removed

- **Portal**
  - Parent-frame code paths (`window.parent.exitPortal`, borrowing the logo from a parent page), `inRange()` and several no-op statements.
  - The `portal.css` token block that `tcf-v3-site.css` fully overrides, including fonts that were never loaded: 'Bricolage Grotesque', 'Spline Sans'.
- **Community and advisor apps**
  - The v8 `.bnav-item` / `.drawer-item` navigation (JS and CSS).
  - About 85 lines of CSS for the old in-page intro animation, now an iframe (`assets/intro/welcome.html`).
  - Unused `runCount` and `introTimers` in `extras.js`.
- **Fonts**
  - `'Poppins'` and `'Source Sans 3'`, which were never loaded, are replaced by the brand tokens `var(--head)` and `var(--body)` in the map styles.
  - The stale "Paralucent isn't included" comments and commented-out `@font-face` rules in `calc.css` and `advisor.css` are gone.
  - `welcome.html` links `tcf-v3.css` instead of repeating its 13 `@font-face` rules.
- **Calculator**
  - Duplicate chart and axis code is now in shared helpers.
  - The 30-year horizon is a named constant.
  - Both SVG charts have a text alternative (`role="img"` + `aria-label`).

## 5. Conventions for the next person

1. **Stylesheet order is load-bearing.** Load `tcf-v3.css` first, then the app stylesheet, then the matching bridge (`tcf-v3-site.css`, `-giving.css` or `-tools.css`). Colour and type tokens live in `tcf-v3.css` and the bridges. App stylesheets should use the tokens, not redefine them.
2. **Script order (community/advisors):** data → `map-and-grants.js` → `giving/app.js` → `extras.js` → advisor modules → `tcf-bridge.js`. Both `extras.js` and `tcf-bridge.js` wrap `navigate()`.
3. **Never hand-edit `community/index.html` or `advisors/index.html`.** Edit `src/giving/`, run `node scripts/build-pages.js`, and commit both.
4. **Data in one place.** Grants are in `assets/data/grants-2025.js`. Engagement content (legends, quiz, badges) is in `assets/portal/data.js`.
5. **Never put stored or typed text into `innerHTML` unescaped.** Use `esc()` (portal), `escHtml()` (giving app, map) or `jsq()` for values inside inline handlers.
6. **Storage keys** are listed in README → "How the pages talk to each other". Add new ones there.

## 6. Recommended next steps (not done; larger changes)

| Recommendation | Benefit | Effort |
|---|---|---|
| ~~Shared HTML template for community/advisors~~ | **Done**, see 1a. | — |
| **Run `--check` automatically** (a GitHub Action on push, or a pre-commit hook) | Stops a hand-edited generated page from drifting from its source. | Small. |
| **Collapse the bridge layer.** Each app stylesheet still carries its pre-v3 token names, mapped by a bridge file. Rename to v3 tokens at the source, then delete the bridges. | One token vocabulary. Fewer `!important` overrides. | Medium, best done one app at a time with visual checks. |
| **Shared ticker data.** The 12-item grants ticker is duplicated in `landing.js` and `extras.js`. | No drift. | Small. |
| **Replace inline `onclick` HTML strings** with delegated event listeners (`data-action`), as `estate-checklist.js` already does. | Removes a whole class of escaping bugs. Enables a strict Content-Security-Policy. | Medium. |
| **Real analytics** for "community interest" instead of browser storage. | A true site-wide tally. | Depends on the platform chosen. |

## 7. Open items needing an owner's decision

These are content or policy calls, not code. They are listed, not changed.

- **Figures that disagree.** One approved source is needed for each:
  - Granted since 1914: **$3.9B** (landing hero, `landing.js`) vs **$3.1B** (welcome animation, community and advisor home).
  - Granted last year: **$90M** (landing hero) vs **$160M** (community and advisor home).
  - "**$100M+** granted every year this decade" (landing) conflicts with $90M last year.
  - Grants ticker labelled "**2026** grants" on the landing page and "**2025** grants" in the apps, with the same list.
  - Portal quiz states an endowment of about $2.18B. Check it against approved figures.
- **Gift Planner tax logic** (`assets/advisors/gift-planner.js`):
  - QCD eligibility is granted if *either* spouse is 70½+.
  - A single $111,000 limit is applied to the household IRA balance, but QCD limits are per IRA owner.
  - Needs review by whoever owns the tax content before advisors rely on it.
- **"Open a fund"** on the portal sign-in sends people to "Join the Community". No open-a-fund flow exists yet.
- **Unlinked views.** `vision` (both apps) and `calculator`/`members`/`learning` (advisors) can only be reached by direct `#/` link. Link or remove them.
- **Stale demo dates in the portal.** Conversations dated 2026, "Updated Jan 2026", and market data only through 2026. These should be derived from today's date.

**Resolved 10-26-2026:** Paralucent web font license confirmed to cover self-hosting in a public repository; the 257 grant records in `assets/data/grants-2025.js` (organization names, addresses, grant names) confirmed OK for public display.

## 8. How this was verified

The site was served locally (`python -m http.server`) and checked in a browser:

- **Console:** no errors on any page.
- **Impact map:** 0 Nominatim requests; pins at their stored coordinates; correct regional cities; filters work; interest is saved.
- **Portal:** sign-in → `#/map` shows live tiles; first-load `#/qr` (org fund) renders the code; `#/cart` opens over the dashboard; `#/map_after` falls back to home; "keep me signed in" persists.
- **Landing:** all 25 popups render; the map tool opens in its frame and closes.
- **Registration:** advisor registration → advisors app greets the person, and markup in the name renders as text.
- **Apps:** every advisor and community module renders from the shared `app.js`.
- **Calculator:** figures identical to the original ($3,722 / $1,162,911 / $573,792 / $589,119 at the defaults).
- **Static checks:** `node --check` passes on every script, and every local `src`/`href`/`url()` reference resolves.

**Not covered:** visual comparison of every screen at every breakpoint, Safari/iOS, and screen-reader passes.
