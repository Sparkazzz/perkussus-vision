const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const labels={
  it:{details:'DETTAGLI DEL LUOGO',type:'Tipo',coords:'Coordinate',address:'Indirizzo',hours:'Orari',phone:'Telefono',website:'Sito web',directions:'Indicazioni',source:'Fonte',loading:'Caricamento dettagli…'},
  en:{details:'PLACE DETAILS',type:'Type',coords:'Coordinates',address:'Address',hours:'Opening hours',phone:'Phone',website:'Website',directions:'Directions',source:'Source',loading:'Loading details…'}
};
const tr=()=>labels[lang()]||labels.en;
let map=null,lastTap=0,down=null;

function closeOtherSheets(){
  document.querySelectorAll('.sheet.open').forEach(s=>{s.classList.remove('open');s.setAttribute('aria-hidden','true')});
}
function openInfo(title,html){
  const sheet=$('#infoSheet');
  if(!sheet)return;
  closeOtherSheets();
  const kicker=$('#infoKicker'),head=$('#infoTitle'),body=$('#infoBody');
  if(kicker)kicker.textContent=tr().details;
  if(head)head.textContent=title||tr().details;
  if(body)body.innerHTML=html;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden','false');
  $('#scrim')?.classList.add('open');
}
function loading(title){
  openInfo(title||tr().details,`<div class="pv-poi-loading"><span class="pv-poi-spinner"></span>${esc(tr().loading)}</div>`);
}
function safeUrl(v){
  if(!v)return'';
  try{const u=new URL(/^https?:\/\//i.test(v)?v:`https://${v}`);return['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}
}
function address(t={}){
  const street=[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ');
  return [street,t['addr:postcode'],t['addr:city']||t['addr:town']||t['addr:village']].filter(Boolean).join(', ');
}
function humanKind(t={}){
  const raw=String(t.amenity||t.shop||t.tourism||t.leisure||t.healthcare||t.railway||t.public_transport||t.aeroway||'place').replaceAll('_',' ');
  return raw.replace(/^./,c=>c.toUpperCase());
}
function card(k,v){return v?`<div class="source-card"><b>${esc(k)}</b><span>${esc(v)}</span></div>`:''}
function showRow(r){
  const t=r?.tags||{},kind=humanKind(t),name=r?.name||t[`name:${lang()}`]||t.name||t.brand||kind;
  const web=safeUrl(t.website||t['contact:website']||t.url),phone=t.phone||t['contact:phone']||'';
  const directions=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${r.lat},${r.lon}`)}`;
  const osm=r?.type&&r?.id?`https://www.openstreetmap.org/${encodeURIComponent(r.type)}/${encodeURIComponent(r.id)}`:'';
  const actions=[
    `<a class="link-btn primary-link" href="${esc(directions)}" target="_blank" rel="noopener">${esc(tr().directions)} ↗</a>`,
    web?`<a class="link-btn" href="${esc(web)}" target="_blank" rel="noopener">${esc(tr().website)} ↗</a>`:'',
    phone?`<a class="link-btn" href="tel:${esc(phone)}">${esc(tr().phone)}</a>`:'',
    osm?`<a class="link-btn" href="${esc(osm)}" target="_blank" rel="noopener">OpenStreetMap ↗</a>`:''
  ].filter(Boolean).join('');
  openInfo(name,`<div class="pv-place-summary"><b>${esc(kind)}</b>${address(t)?`<span>${esc(address(t))}</span>`:''}</div><div class="pv-place-actions">${actions}</div><div class="info-grid"><div class="info-metric"><small>${esc(tr().type)}</small><b>${esc(kind)}</b></div><div class="info-metric"><small>${esc(tr().coords)}</small><b>${Number(r.lat).toFixed(5)}, ${Number(r.lon).toFixed(5)}</b></div></div>${card(tr().address,address(t))}${card(tr().hours,t.opening_hours)}${card(tr().phone,phone)}<div class="source-card"><b class="ok">${esc(tr().source)}</b><span>OpenStreetMap · elemento reale selezionato</span></div>`);
}
async function fetchNearest(ll,name=''){
  const u=new URL('/api/nearby',location.origin);
  u.searchParams.set('mode','nearest');
  u.searchParams.set('lat',String(ll.lat));
  u.searchParams.set('lon',String(ll.lng));
  u.searchParams.set('radius','110');
  u.searchParams.set('lang',lang());
  if(name)u.searchParams.set('name',name);
  const r=await fetch(u,{headers:{accept:'application/json'},cache:'no-store'});
  if(!r.ok)throw new Error(`POI ${r.status}`);
  return r.json();
}
function hitResult(point){
  try{
    const layers=['pv-poi-points','pv-poi-labels'].filter(id=>map.getLayer(id));
    if(!layers.length)return null;
    return map.queryRenderedFeatures([[point.x-20,point.y-20],[point.x+20,point.y+20]],{layers})?.[0]||null;
  }catch{return null}
}
async function handleTap(ev){
  if(!map)return;
  const now=Date.now();
  if(now-lastTap<450)return;
  const rect=map.getCanvas().getBoundingClientRect();
  const point={x:ev.clientX-rect.left,y:ev.clientY-rect.top};
  const feature=hitResult(point);
  if(!feature)return;
  lastTap=now;
  ev.preventDefault?.();
  ev.stopImmediatePropagation?.();
  const ll=map.unproject([point.x,point.y]);
  const name=feature.properties?.label||feature.properties?.name||'';
  loading(name);
  try{
    const data=await fetchNearest(ll,name);
    if(data?.row)return showRow(data.row);
    openInfo(name||tr().details,`<div class="info-grid"><div class="info-metric"><small>${esc(tr().coords)}</small><b>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</b></div></div><div class="source-card"><b class="ok">${esc(tr().source)}</b><span>OpenStreetMap / OpenFreeMap</span></div>`);
  }catch{
    openInfo(name||tr().details,`<div class="info-grid"><div class="info-metric"><small>${esc(tr().coords)}</small><b>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</b></div></div><div class="source-card"><b class="ok">${esc(tr().source)}</b><span>OpenStreetMap / OpenFreeMap</span></div>`);
  }
}
async function init(){
  for(let i=0;i<200;i++){
    if(window.__PV_MAP__?.getCanvas){map=window.__PV_MAP__;break}
    await new Promise(r=>setTimeout(r,100));
  }
  if(!map)return;
  const canvas=map.getCanvas();
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:Date.now()}},{capture:true,passive:true});
  canvas.addEventListener('pointerup',e=>{
    if(!down)return;
    const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y),elapsed=Date.now()-down.t;
    down=null;
    if(moved<=12&&elapsed<700)handleTap(e);
  },{capture:true,passive:false});
}
init();
