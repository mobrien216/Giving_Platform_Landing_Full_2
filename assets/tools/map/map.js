
/* Data lives in assets/data/grants-2025.js (loaded first by the page). */
const GRANTS = window.TCF_GRANTS, PILLARS = window.TCF_PILLARS, ZIP_COORDS = window.TCF_ZIP_COORDS,
      NEIGH_CENTROIDS = window.TCF_NEIGH_CENTROIDS, DOWNTOWN = window.TCF_DOWNTOWN;

const core = GRANTS.filter(g=>!g.isRegional);
const regional = GRANTS.filter(g=>g.isRegional);
const state = { pillars: new Set(), neighborhood:null };
const markerById = {};
let clusterGroup;
let map;

/* ---------------- storage helpers ----------------
   The map was first built for a host that provides window.storage, where
   shared=true means "visible to every visitor". A static host (GitHub Pages)
   has no such API, so we fall back to this browser's localStorage: the
   "community interest" tally is then per-browser, not site-wide. A real
   cross-visitor tally needs a server or analytics tool. */
async function storeGet(key, shared){
  try{
    if(window.storage){ const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
    const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
async function storeSet(key, value, shared){
  try{
    if(window.storage){ await window.storage.set(key, JSON.stringify(value), shared); return; }
    localStorage.setItem(key, JSON.stringify(value));
  }catch(e){ /* storage blocked or full: keep going without it */ }
}

let myInterests = { counts:{} };
let aggInterests = { counts:{}, totalEvents:0 };
async function loadInterests(){
  const mine = await storeGet('impact-map-my-interests', false);
  if(mine) myInterests = mine;
  const agg = await storeGet('impact-map-aggregate-v1', true);
  if(agg) aggInterests = agg;
}
async function trackInterest(pillarName, weight){
  myInterests.counts[pillarName] = (myInterests.counts[pillarName]||0) + weight;
  storeSet('impact-map-my-interests', myInterests, false);
  const agg = await storeGet('impact-map-aggregate-v1', true) || { counts:{}, totalEvents:0 };
  agg.counts[pillarName] = (agg.counts[pillarName]||0) + weight;
  agg.totalEvents = (agg.totalEvents||0) + 1;
  aggInterests = agg;
  storeSet('impact-map-aggregate-v1', agg, true);
  maybeShowPrefBar();
}
function topPillarFromCounts(counts){
  let best=null, bestScore=-1;
  for(const k in counts){ if(counts[k]>bestScore){ best=k; bestScore=counts[k]; } }
  return best;
}
let prefBarShownOnce=false;
function maybeShowPrefBar(){
  const total = Object.values(myInterests.counts).reduce((a,b)=>a+b,0);
  if(total < 3 || prefBarShownOnce) return;
  const top = topPillarFromCounts(myInterests.counts);
  if(!top) return;
  const p = PILLARS.find(x=>x.name===top);
  if(!p) return;
  prefBarShownOnce = true;
  document.getElementById('prefText').innerHTML = `Looks like <b>${escHtml(p.name)}</b> keeps catching your eye. Want to help fund more of it?`;
  const bar = document.getElementById('prefbar');
  bar.style.background = p.color;
  document.getElementById('prefGive').onclick = ()=>{ window.open(p.give,'_blank','noopener'); };
  setTimeout(()=> bar.classList.add('show'), 400);
}
document.getElementById('prefClose').onclick = ()=> document.getElementById('prefbar').classList.remove('show');

/* ---------------- helpers ---------------- */
function escHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }
function regionalCity(g){ const parts = g.address.split(', '); return parts[parts.length-3] || ''; }
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; } return h; }

function hasCoords(g){ return typeof g.lat==='number' && typeof g.lng==='number'; }
/* Every record in grants-2025.js carries lat/lng. Only a record without them
   falls back to its ZIP centroid (or downtown) plus a stable per-id jitter,
   until refineGeocoding() can look it up. */
function grantLatLng(g){
  if(hasCoords(g)) return [g.lat, g.lng];
  const parts = g.address.split(', ');
  const zip = (parts[parts.length-1]||'').trim();
  const base = ZIP_COORDS[zip] || DOWNTOWN;
  const h = hashStr(g.id);
  const jlat = ((h % 1000)/1000 - 0.5) * 0.012;
  const jlng = (((Math.floor(h/1000)) % 1000)/1000 - 0.5) * 0.012;
  return [base[0]+jlat, base[1]+jlng];
}

/* ---------------- map init ---------------- */
function initMap(){
  map = L.map('leafletMap', { scrollWheelZoom:true, minZoom:6 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius:42,
    iconCreateFunction: function(cluster){
      const count = cluster.getChildCount();
      const size = count>50?46:count>15?40:34;
      return L.divIcon({
        html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:#164430;color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:700;font-size:${count>99?12:13}px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${count}</div>`,
        className:'', iconSize:[size,size]
      });
    }
  });
  map.addLayer(clusterGroup);

  GRANTS.forEach(g=>{
    const [lat,lng] = grantLatLng(g);
    g._lat = lat; g._lng = lng;
    const marker = L.marker([lat,lng], { icon: dotIcon(g.color) });
    marker.on('click', ()=> openDrawer(g));
    marker.grantId = g.id;
    markerById[g.id] = marker;
  });

  const bounds = L.latLngBounds(GRANTS.filter(g=>!g.isRegional).map(g=>[g._lat,g._lng]));
  map.fitBounds(bounds, { padding:[24,24] });

  refreshMapMarkers();
}
function dotIcon(color){
  return L.divIcon({
    html:`<div class="cluster-dot" style="width:16px;height:16px;background:${color};"></div>`,
    className:'', iconSize:[16,16], iconAnchor:[8,8]
  });
}

function refreshMapMarkers(){
  clusterGroup.clearLayers();
  const list = filteredCore();
  const showSet = new Set(list.map(g=>g.id));
  GRANTS.forEach(g=>{
    if(g.isRegional) return; // regional shown only in scroll strip, not clustered on main map
    if(showSet.has(g.id)) clusterGroup.addLayer(markerById[g.id]);
  });
}

/* ---------------- background geocoding refinement ---------------- */
/* Only records WITHOUT stored coordinates are sent to Nominatim (max 1 req/s,
   per its usage policy). With today's data that is none, so no requests go out. */
async function refineGeocoding(){
  const missing = GRANTS.filter(g=>!hasCoords(g));
  if(missing.length===0) return;
  const cache = await storeGet('impact-map-geocode-cache-v1', true) || {};
  let updatedAny = false;
  let newlyResolved = 0;
  const toResolve = [];
  missing.forEach(g=>{
    if(cache[g.address]){
      const [lat,lng] = cache[g.address];
      g._lat = lat; g._lng = lng;
      const m = markerById[g.id];
      if(m) m.setLatLng([lat,lng]);
      updatedAny = true;
    } else {
      toResolve.push(g);
    }
  });
  if(updatedAny) refreshMapMarkers();
  if(toResolve.length===0) return;

  const statusEl = document.getElementById('geoStatus');
  const statusText = document.getElementById('geoStatusText');
  statusEl.classList.add('show');

  let i=0;
  for(const g of toResolve){
    i++;
    statusText.textContent = `Fine-tuning pin locations… (${i}/${toResolve.length})`;
    try{
      const q = encodeURIComponent(g.address);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${q}`);
      if(resp.ok){
        const data = await resp.json();
        if(data && data[0]){
          const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
          g._lat=lat; g._lng=lng;
          cache[g.address] = [lat,lng];
          const m = markerById[g.id];
          if(m) m.setLatLng([lat,lng]);
          newlyResolved++;
        }
      }
    }catch(e){ /* keep fallback position, move on */ }
    if(newlyResolved>0 && newlyResolved % 12===0){ storeSet('impact-map-geocode-cache-v1', cache, true); }
    await new Promise(r=>setTimeout(r, 1100));
  }
  storeSet('impact-map-geocode-cache-v1', cache, true);
  statusEl.classList.remove('show');
  refreshMapMarkers();
}

/* ---------------- filters (sidebar) ---------------- */
function pillarCounts(){
  const c={}; PILLARS.forEach(p=>c[p.name]=0);
  core.forEach(g=>{ c[g.pillar]=(c[g.pillar]||0)+1; });
  return c;
}
function buildPillarList(){
  const counts = pillarCounts();
  const wrap = document.getElementById('pillarList');
  wrap.innerHTML='';
  const all = document.createElement('div');
  all.className='pillar-opt all active';
  all.innerHTML = `<span class="dot" style="background:#164430"></span>All areas<span class="cnt">${core.length}</span>`;
  all.onclick = ()=>{ state.pillars.clear(); render(); };
  wrap.appendChild(all);
  PILLARS.forEach(p=>{
    const opt = document.createElement('div');
    opt.className='pillar-opt';
    opt.setAttribute('role','checkbox');
    opt.setAttribute('aria-checked','false');
    opt.style.setProperty('--pillar-color', p.color);
    opt.innerHTML = `<span class="dot" style="background:${p.color}"></span>${escHtml(p.name)}<span class="cnt">${counts[p.name]||0}</span>`;
    opt.onclick = ()=>{
      if(state.pillars.has(p.name)) state.pillars.delete(p.name);
      else state.pillars.add(p.name);
      trackInterest(p.name, 1);
      render();
    };
    wrap.appendChild(opt);
  });
}
function buildNeighSelect(){
  const counts={};
  core.forEach(g=>{ counts[g.neighborhood]=(counts[g.neighborhood]||0)+1; });
  const names = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  const sel = document.getElementById('neighSelect');
  sel.innerHTML = `<option value="">All neighborhoods</option>` + names.map(n=>`<option value="${escAttr(n)}">${escHtml(n)} (${counts[n]})</option>`).join('');
  sel.onchange = ()=>{ state.neighborhood = sel.value || null; render(); };
}
document.getElementById('locBtn').onclick = ()=>{
  if(!navigator.geolocation){ alert("Location isn't available in this browser."); return; }
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude, longitude} = pos.coords;
    if(map) map.flyTo([latitude, longitude], 13, { duration:1.2 });
    let best=null, bestD=Infinity;
    NEIGH_CENTROIDS.forEach(c=>{ const d=Math.hypot(c.lat-latitude, c.lng-longitude); if(d<bestD){bestD=d; best=c;} });
    const sel = document.getElementById('neighSelect');
    if(best && [...sel.options].some(o=>o.value===best.name)){
      sel.value = best.name; state.neighborhood = best.name; render();
    }
  }, ()=>{ alert("Couldn't get your location — you can pick a neighborhood from the list instead."); });
};
document.getElementById('clearBtn').onclick = ()=>{
  state.pillars.clear(); state.neighborhood=null;
  document.getElementById('neighSelect').value='';
  render();
};

/* ---------------- sidebar open/close (mobile) ---------------- */
function openSidebar(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarBackdrop').classList.add('show'); }
function closeSidebar(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarBackdrop').classList.remove('show'); }
document.getElementById('sidebarToggle').onclick = openSidebar;
document.getElementById('sidebarClose').onclick = closeSidebar;
document.getElementById('sidebarBackdrop').onclick = closeSidebar;

/* ---------------- filtering + rendering ---------------- */
function filteredCore(){
  return core.filter(g=>{
    if(state.pillars.size>0 && !state.pillars.has(g.pillar)) return false;
    if(state.neighborhood && g.neighborhood!==state.neighborhood) return false;
    return true;
  });
}
function highlightCard(id, on){
  const el = document.querySelector(`.card[data-id="${id}"]`);
  if(el) el.classList.toggle('hovered', on);
}
function renderList(list){
  const wrap = document.getElementById('cardlist');
  if(list.length===0){
    wrap.innerHTML = `<div class="noresults">No grants match this combination. Try clearing a filter.</div>`;
    return;
  }
  wrap.innerHTML = list.map(g=>`
    <div class="card" data-id="${escAttr(g.id)}" tabindex="0">
      <span class="swatch" style="background:${g.color}"></span>
      <div class="body">
        <div class="org">${escHtml(g.org)}</div>
        <div class="grant">${escHtml(g.grantName)}</div>
        <div class="meta">${escHtml(g.pillar)} · ${escHtml(g.neighborhood)}</div>
      </div>
      <div class="chev">›</div>
    </div>
  `).join('');
  wrap.querySelectorAll('.card').forEach(el=>{
    const g = list.find(x=>String(x.id)===el.dataset.id);
    el.addEventListener('click', ()=>openDrawer(g));
    el.addEventListener('keydown', e=>{ if(e.key==='Enter') openDrawer(g); });
    el.addEventListener('mouseenter', ()=> highlightCard(g.id,true));
    el.addEventListener('mouseleave', ()=> highlightCard(g.id,false));
  });
}
function renderLegend(){
  document.getElementById('legendMini').innerHTML = PILLARS.map(p=>`<div class="legend-item"><span class="dot" style="background:${p.color}"></span>${escHtml(p.name)}</div>`).join('');
}
function renderRegional(){
  const el = document.getElementById('regionalScroll');
  el.innerHTML = regional.map(g=>`
    <div class="rcard" data-id="${escAttr(g.id)}" style="border-left-color:${escAttr(g.color)}">
      <div class="org">${escHtml(g.org)}</div>
      <div class="grant">${escHtml(g.grantName)}</div>
      <div class="city">${escHtml(regionalCity(g))}, OH</div>
    </div>
  `).join('');
  el.querySelectorAll('.rcard').forEach(card=>{
    const g = regional.find(x=>String(x.id)===card.dataset.id);
    card.addEventListener('click', ()=>openDrawer(g));
  });
}
function render(){
  const list = filteredCore();
  renderList(list);
  refreshMapMarkers();
  document.getElementById('resultCount').textContent = `${list.length} of ${core.length} grants`;
  document.querySelectorAll('#pillarList .pillar-opt').forEach((opt,i)=>{
    if(i===0){ opt.classList.toggle('active', state.pillars.size===0); return; }
    const p = PILLARS[i-1];
    const isActive = state.pillars.has(p.name);
    opt.classList.toggle('active', isActive);
    opt.setAttribute('aria-checked', String(isActive));
  });
  document.getElementById('clearBtn').classList.toggle('show', !!(state.pillars.size>0 || state.neighborhood));
}

/* ---------------- drawer (right side) ---------------- */
function pillarInfo(name){ return PILLARS.find(p=>p.name===name) || PILLARS[0]; }
function openDrawer(g){
  trackInterest(g.pillar, 2);
  const p = pillarInfo(g.pillar);
  const drawer = document.getElementById('drawer');
  drawer.style.setProperty('--drawer-color', p.color);
  drawer.innerHTML = `
    <div class="drawer-top" style="background:${p.color}">
      <button class="drawer-close" id="drawerCloseBtn" aria-label="Close">×</button>
      <div class="drawer-tag">${escHtml(g.pillar)}</div>
      <div class="drawer-org">${escHtml(g.org)}</div>
      <div class="drawer-grant">${escHtml(g.grantName)}</div>
    </div>
    <div class="drawer-body">
      <div class="drawer-row"><span class="k">Neighborhood</span><span>${escHtml(g.neighborhood)}</span></div>
      <div class="drawer-row"><span class="k">Focus area</span><span>${escHtml(g.category)}</span></div>
      <div class="drawer-row"><span class="k">Time horizon</span><span>${escHtml(g.focus)}</span></div>
      ${g.orgUrl ? `<a class="orglink" href="${escAttr(g.orgUrl)}" target="_blank" rel="noopener">Visit ${escHtml(g.org)} ↗</a>` : ''}
      <div class="give-block">
        <div class="give-note"><b>${escHtml(p.name)}:</b> ${escHtml(p.blurb)}</div>
        <div class="give-note">This grant is one example of that work. A gift here goes to <b>The Cleveland Foundation</b> to fund more organizations doing similar work across Cleveland — it is not a donation to ${escHtml(g.org)} directly.</div>
        <a class="cta primary" style="background:${p.color}" href="${escAttr(p.give)}" target="_blank" rel="noopener">Give to ${escHtml(p.name)}</a>
        <a class="cta secondary" href="https://www.clevelandfoundation.org/newsletter-sign-up" target="_blank" rel="noopener">Stay connected on ${escHtml(p.name)}</a>
      </div>
    </div>
  `;
  document.getElementById('drawerCloseBtn').onclick = closeDrawer;
  drawer.classList.add('open');
  document.getElementById('backdrop').classList.add('show');
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('backdrop').classList.remove('show');
}
document.getElementById('backdrop').onclick = closeDrawer;

/* ---------------- staff modal ---------------- */
document.getElementById('staffLink').onclick = async ()=>{
  const agg = await storeGet('impact-map-aggregate-v1', true) || {counts:{}, totalEvents:0};
  const bars = document.getElementById('staffBars');
  const entries = PILLARS.map(p=>({name:p.name, color:p.color, val:agg.counts[p.name]||0}));
  const max = Math.max(1, ...entries.map(e=>e.val));
  const total = entries.reduce((a,b)=>a+b.val,0);
  if(total===0){
    bars.innerHTML = `<div class="noresults" style="padding:20px 0;">No visitor activity yet — check back after the map has had some traffic.</div>`;
  } else {
    entries.sort((a,b)=>b.val-a.val);
    bars.innerHTML = entries.map(e=>`
      <div class="barrow">
        <div class="lab"><span>${escHtml(e.name)}</span><span>${e.val}</span></div>
        <div class="bartrack"><div class="barfill" style="width:${(e.val/max*100)}%; background:${e.color}"></div></div>
      </div>
    `).join('');
  }
  document.getElementById('staffModal').classList.add('show');
};
document.getElementById('staffClose').onclick = ()=> document.getElementById('staffModal').classList.remove('show');

/* ---------------- hero decoration ---------------- */
(function decorateHero(){
  const colors=['#EE7331','#19B9A9','#CC1E4B','#C0629A','#1A8DA9','#086C43'];
  const field = document.getElementById('dotfield');
  let html='';
  for(let i=0;i<26;i++){
    const size = 6+Math.random()*14;
    const isSquare = Math.random()>0.6;
    const top = Math.random()*100;
    const left = 55 + Math.random()*45;
    const col = colors[i%colors.length];
    html += `<span style="width:${size}px;height:${size}px;top:${top}%;left:${left}%;background:${col};border-radius:${isSquare?'3px':'50%'};animation-delay:${(i*0.3)%5}s;"></span>`;
  }
  field.innerHTML = html;
})();

/* ---------------- init ---------------- */
async function init(){
  buildPillarList();
  buildNeighSelect();
  renderLegend();
  renderRegional();
  await loadInterests();
  initMap();
  render();
  refineGeocoding();
}
init();
