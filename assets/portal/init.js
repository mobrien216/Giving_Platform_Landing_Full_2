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
     #/<module>  open that module once signed in
   ============================================================ */
window.addEventListener('DOMContentLoaded', function(){
  applyLogo();
  $('#topLogo').innerHTML = logo('t-logo');
  $('#drLogo').innerHTML = logo('', true);

  var q = new URLSearchParams(location.search);
  var fund = q.get('fund');
  if (fund && FUNDS.some(function(f){ return f.id === fund; })){ S.fundId = fund; save(); }

  var want = routeFromHash() || 'home';
  var forced = q.has('signin');
  /* drop the one-time query params so a reload doesn't force sign-in again */
  if (forced || fund || q.has('fresh')){ try{ history.replaceState(null, '', location.pathname + location.hash); }catch(e){} }

  var session = false;
  try{ session = !forced && (sessionStorage.getItem(SESSION_KEY) === '1' || localStorage.getItem(SESSION_KEY) === '1'); }catch(e){}

  if (session){
    S.signedIn = true; go(want, null, true);
    var wasReset = false; try{ wasReset = sessionStorage.getItem('tcf_portal_reset_toast') === '1'; sessionStorage.removeItem('tcf_portal_reset_toast'); }catch(e){}
    if (wasReset) toast('Demo reset. You’re on the latest version, starting fresh.');
  }
  else {
    S.signedIn = false; save();
    window.PENDING_ROUTE = want === 'signin' ? 'home' : want;
    ROUTE = 'signin'; render();
  }
});
