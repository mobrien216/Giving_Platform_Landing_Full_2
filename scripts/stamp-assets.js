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
for (const file of htmlFiles(ROOT)){
  const base = RESOLVE_FROM[path.dirname(file)] || path.dirname(file);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(REF_RE, (m, attr, url) => {
    const target = path.resolve(base, url);
    if (!fs.existsSync(target)){ console.error(`missing: ${rel} → ${url}`); missing++; return m; }
    return `${attr}="${url}?v=${fingerprint(target)}"`;
  });
  if (after === before) continue;
  changedFiles++;
  if (check) console.error('stamps out of date: ' + rel);
  else { fs.writeFileSync(file, after); console.log('stamped: ' + rel); }
}
if (missing) process.exit(1);
if (check && changedFiles){ console.error(`stamp-assets: ${changedFiles} file(s) out of date — run: node scripts/stamp-assets.js`); process.exit(1); }
if (!changedFiles) console.log('stamps up to date');
