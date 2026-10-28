/* ============================================================
   Shared bridge for the community + advisor apps
   · personalizes the app with what the person entered at registration
   · gives every module its own link (#/history, #/garden …) and makes
     Back/Forward work, without reloading the page
   · frame mode (?embed=1): the Account Holder portal shows one of this app's
     persona tools inside its own page (portal/#/giftplanner …). The portal
     supplies the header and menu, so this app's header, menu, dock and intro
     are hidden (tcf-v3-giving.css) and the linked view opens at once.
   ============================================================ */
(function(){
  var EMBED = new URLSearchParams(location.search).get('embed') === '1' && window.parent !== window;
  if (EMBED) document.documentElement.classList.add('embedded');
  /* the welcome animation tells us when it has finished; lift the overlay then */
  window.addEventListener('message', function(e){
    if (e.origin === location.origin && e.data && e.data.tcf === 'intro-done' && typeof skipIntro === 'function'){
      var el = document.getElementById('intro'); if (el && el.classList.contains('play')) skipIntro();
    }
  });
  /* registration hand-off from the landing page */
  /* key written by submitTellUs() in assets/landing/landing.js (REG_KEY) */
  var reg = null; try{ reg = JSON.parse(localStorage.getItem('tcf_registration') || 'null'); }catch(e){}
  if (reg && reg.name){
    var first = reg.name.split(/\s+/)[0], ini = reg.name.split(/\s+/).map(function(p){ return p[0]; }).join('').slice(0,2).toUpperCase();
    var eb = document.querySelector('#homeProspectHead .h-eyebrow'); if (eb) eb.textContent = 'Welcome, ' + first;
    var dn = document.getElementById('drawerName'); if (dn) dn.textContent = reg.name;
    var da = document.getElementById('drawerAvatar'); if (da) da.textContent = ini;
    if (typeof appState !== 'undefined') appState.donorName = reg.name;
  }
  /* deep links */
  if (typeof navigate !== 'function') return;
  var orig = navigate;
  function viewFromHash(){ var v = (location.hash || '').replace(/^#\/?/, ''); return (v && document.getElementById('view-' + v)) ? v : ''; }
  var pending = viewFromHash(), quiet = false;
  navigate = function(view, close){
    if (pending && view === 'home'){ view = pending; pending = ''; }   /* the intro hands off to home — send them where the link pointed */
    orig(view, close);
    /* first navigation (intro → home) replaces the empty hash instead of adding a Back step;
       in a frame, never add steps: they would land in the portal's own Back history */
    if (!quiet){ var h = '#/' + view; if (location.hash !== h){ try{ history[(location.hash && !EMBED) ? 'pushState' : 'replaceState'](null, '', h); }catch(e){} } }
  };
  window.addEventListener('popstate', function(){ var v = viewFromHash() || 'home'; quiet = true; orig(v, true); quiet = false; });
  /* in a frame the intro is hidden, so its "finished" event never comes: finish it now,
     which hands off to home, which the wrapper above turns into the linked view */
  if (EMBED && pending && typeof finishIntro === 'function') finishIntro();
  if (pending){
    if (typeof skipIntro === 'function') skipIntro();
    setTimeout(function(){ if (pending){ var v = pending; pending = ''; navigate(v, true); } }, 1600);   /* reduced-motion fallback */
  }
})();
