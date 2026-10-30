#!/usr/bin/env node
/* ============================================================
   stamp-assets.js — cache-busting for GitHub Pages. No dependencies; Node 16+.

     node scripts/stamp-assets.js           update every stamp
     node scripts/stamp-assets.js --check   exit 1 if any stamp is out of date

   GitHub Pages sends every file with "Cache-Control: max-age=600", so for ten
   minutes after a deploy a browser may reuse its saved copy of a script or
   stylesheet — and can even pair a new page with an old app.js. To prevent
   that, each local <script src> / <link href> to a .js or .css file carries a
   fingerprint of that file's contents:

       <script src="../assets/portal/app.js?v=3f9a1c2e"></script>

   Change the file and its fingerprint (so its address) changes, so the browser
   has to fetch the new one. Unchanged files keep their stamp and stay cached.

   A page that script loads (the portal's five-year plan frame) is stamped the same
   way, through a data-v-src attribute the script reads:

       <meta name="tcf-plan" data-v-src="plan/index.html?v=8c41d0aa">

   That page has stamps of its own, so the run repeats until nothing changes.

   Run it after editing any .js or .css, BEFORE scripts/build-pages.js (it also
   stamps the src/giving/ template the community/advisor pages are built from).
   `npm run build` runs both in the right order.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
/* src/giving/ holds the template for community/ and advisors/index.html; its
   relative paths are written for that location, so resolve them from there. */
const RESOLVE_FROM = { [path.join(ROOT, 'src', 'giving')]: path.join(ROOT, 'community') };

const REF_RE = /\b(src|href)="((?!https?:|\/\/|data:|#)[^"?#]+\.(?:js|css))(?:\?v=[0-9a-f]*)?"/g;
const PAGE_RE = /\b(data-v-src)="((?!https?:|\/\/|data:|#)[^"?#]+\.html)(?:\?v=[0-9a-f]*)?"/g;

function htmlFiles(dir, out = []){
  for (const e of fs.readdirSync(dir, { withFileTypes: true })){
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const hashes = new Map();
function fingerprint(file){
  if (!hashes.has(file)) hashes.set(file, crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8));
  return hashes.get(file);
}

const check = process.argv.includes('--check');
let changedFiles = 0, missing = 0;
/* One pass over every page; returns how many pages it changed (or would change). */
function pass(){
  let changed = 0;
  hashes.clear();   // a page stamped in an earlier pass has a new fingerprint
  for (const file of htmlFiles(ROOT)){
    const base = RESOLVE_FROM[path.dirname(file)] || path.dirname(file);
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const before = fs.readFileSync(file, 'utf8');
    const stamp = (m, attr, url) => {
      const target = path.resolve(base, url);
      if (!fs.existsSync(target)){ console.error(`missing: ${rel} → ${url}`); missing++; return m; }
      return `${attr}="${url}?v=${fingerprint(target)}"`;
    };
    const after = before.replace(REF_RE, stamp).replace(PAGE_RE, stamp);
    if (after === before) continue;
    changed++;
    if (check) console.error('stamps out of date: ' + rel);
    else { fs.writeFileSync(file, after); console.log('stamped: ' + rel); }
  }
  return changed;
}
if (check) changedFiles = pass();
else for (let i = 0, n; i < 5 && (n = pass()); i++) changedFiles += n;
if (missing) process.exit(1);
if (check && changedFiles){ console.error(`stamp-assets: ${changedFiles} file(s) out of date — run: node scripts/stamp-assets.js`); process.exit(1); }
if (!changedFiles) console.log('stamps up to date');
