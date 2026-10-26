/* ============================================================
   Shared bridge for the community + advisor apps
   · personalizes the app with what the person entered at registration
   · gives every module its own link (#/history, #/garden …) and makes
     Back/Forward work, without reloading the page
   ============================================================ */
(function(){
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
    /* first navigation (intro → home) replaces the empty hash instead of adding a Back step */
    if (!quiet){ var h = '#/' + view; if (location.hash !== h){ try{ history[location.hash ? 'pushState' : 'replaceState'](null, '', h); }catch(e){} } }
  };
  window.addEventListener('popstate', function(){ var v = viewFromHash() || 'home'; quiet = true; orig(v, true); quiet = false; });
  if (pending){
    if (typeof skipIntro === 'function') skipIntro();
    setTimeout(function(){ if (pending){ var v = pending; pending = ''; navigate(v, true); } }, 1600);   /* reduced-motion fallback */
  }
})();
