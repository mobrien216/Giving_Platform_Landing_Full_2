/* ============================================================
   Portal start-up (multi-page build)
   Runs on DOMContentLoaded, not immediately: Leaflet and qrcodejs are
   loaded with `defer`, and deferred scripts only finish just before that
   event. Rendering earlier made #/map and #/qr deep links show their
   "offline" fallbacks on first load.

   URL contract (see README → "How the pages talk to each other"):
     ?signin=1   arriving from the landing page's Log-In: always show sign-in
     ?fund=<id>  pre-select a fund (e.g. eac = the organizational fund)
     ?fresh=<t>  one-time address used by Reset demo to load the newest page
     ?newfund=1  arriving from the online "Open a DAF" flow (open/): accept the
                 hand-off, sign the donor in and show their new fund
     #/<module>  open that module once signed in
   ============================================================ */

/* Newer version check. GitHub Pages lets a browser reuse its copy of this page for up to
   ten minutes, so right after a deploy someone can open (or Reset into) the previous portal.
   Ask the server for the current page; if any of its stamped files (scripts, stylesheets,
   the plan frame; see scripts/stamp-assets.js) differ from the ones running, reload once onto
   the new version. It remembers the version it reloaded for, so a server still catching up
   after a deploy can't cause a loop. */
function checkForNewerVersion(forced){
  /* every stamped address on a page, in order: "../assets/portal/app.js?v=03c44182 …" */
  var stamps = function(list){ return list.filter(function(u){ return /\?v=[0-9a-f]+$/.test(u || ''); }).join(' '); };
  var running = stamps(Array.prototype.map.call(document.querySelectorAll('script[src],link[href],meta[data-v-src]'), function(el){
    return el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('data-v-src');
  }));
  if (!running || !window.fetch) return;
  fetch(location.pathname, { cache: 'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }).then(function(html){
    var found = [], re = /\b(?:src|href|data-v-src)="([^"]+)"/g, m;
    while ((m = re.exec(html))) found.push(m[1]);
    var latest = stamps(found);
    if (!latest || latest === running) return;
    try{ if (sessionStorage.getItem('tcf_portal_reloaded_for') === latest) return; sessionStorage.setItem('tcf_portal_reloaded_for', latest); }catch(e){ return; }
    location.replace(location.pathname + '?fresh=' + Date.now() + (forced ? '&signin=1' : '') + location.hash);
  }).catch(function(){});
}

window.addEventListener('DOMContentLoaded', function(){
  applyLogo();
  $('#topLogo').innerHTML = logo('t-logo');
  $('#drLogo').innerHTML = logo('', true);

  var q = new URLSearchParams(location.search);
  var fund = q.get('fund');
  if (fund && FUNDS.some(function(f){ return f.id === fund; })){ S.fundId = fund; save(); }

  /* a donor who just finished the online flow arrives signed in, on their new fund */
  var opened = q.has('newfund') ? acceptNewFund() : null;
  if (opened){ try{ sessionStorage.setItem(SESSION_KEY, '1'); }catch(e){} }

  var want = opened ? 'home' : (routeFromHash() || 'home');
  var forced = q.has('signin');
  /* drop the one-time query params so a reload doesn't force sign-in again */
  if (forced || fund || q.has('fresh') || q.has('newfund')){ try{ history.replaceState(null, '', location.pathname + location.hash); }catch(e){} }

  checkForNewerVersion(forced);

  var session = false;
  try{ session = !forced && (sessionStorage.getItem(SESSION_KEY) === '1' || localStorage.getItem(SESSION_KEY) === '1'); }catch(e){}

  if (session){
    S.signedIn = true; go(want, null, true);
    if (opened) toast('Welcome, ' + S.profile.first + '. ' + opened.name + ' is set up. Sign your fund agreement to open it.');
    var wasReset = false; try{ wasReset = sessionStorage.getItem('tcf_portal_reset_toast') === '1'; sessionStorage.removeItem('tcf_portal_reset_toast'); }catch(e){}
    if (wasReset) toast('Demo reset. You’re on the latest version, starting fresh.');
  }
  else {
    S.signedIn = false; save();
    window.PENDING_ROUTE = want === 'signin' ? 'home' : want;
    ROUTE = 'signin'; render();
  }
});
