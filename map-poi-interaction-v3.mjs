const $=(s,r=document)=>r.querySelector(s);
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_UNIVERSAL_POI_V3__){
 window.__PV_UNIVERSAL_POI_V3__=true;
 let map=null,canvas=null,down=null,lastTap=0;
 const tax=()=>window.PV_POI_TAXONOMY;
 function sourceLayer(f){return String(f?.sourceLayer||f?.layer?.['source-layer']||'').toLowerCase()}
 function layerId(f){return String(f?.layer?.id||'').toLowerCase()}
 function score(f){
  const id=layerId(f),sl=sourceLayer(f),p=f?.properties||{};if(id==='quakes'||id==='quake-glow'||id.startsWith('pv-poi-'))return-9999;
  const t=tax(),kind=t?.classify(p)||'place',named=!!t?.name(p),symbol=f?.layer?.type==='symbol';let s=0;
  if(sl==='poi')s+=240;if(symbol)s+=70;if(named)s+=100;if(p.amenity||p.shop||p.tourism||p.leisure||p.healthcare||p.public_transport||p.railway||p.aeroway||p.subclass||p.class||p.sport)s+=130;
  if(/poi|amenity|shop|relig|church|parking|hospital|medical|hotel|museum|station|airport|attraction|park|sport|pitch/i.test(id+' '+sl))s+=70;
  if(!t?.isGeneric(kind))s+=60;if(/road|street|transportation_name|water_name|boundary/i.test(id+' '+sl)&&sl!=='poi')s-=190;
  return s
 }
 function bestFeature(point){let fs=[];try{fs=map.queryRenderedFeatures([[point.x-30,point.y-30],[point.x+30,point.y+30]])||[]}catch{return null}let best=null,bestScore=95;for(const f of fs){const s=score(f);if(s>bestScore){best=f;bestScore=s}}return best}
 function featureCoord(f,point){const g=f?.geometry;if(g?.type==='Point'&&Array.isArray(g.coordinates))return{lng:Number(g.coordinates[0]),lat:Number(g.coordinates[1])};const ll=map.unproject([point.x,point.y]);return{lng:ll.lng,lat:ll.lat}}
 function openInstant(f,point){
  const p={...(f?.properties||{})},t=tax(),kind=t?.classify(p)||'place',typeLabel=t?.label(kind,p)||(lang()==='it'?'Punto di interesse':'Point of interest'),name=t?.title(p)||typeLabel,ll=featureCoord(f,point);
  window.__PV_ACTIVE_PLACE__={type:'',id:'',lat:ll.lat,lon:ll.lng,name,kind,tags:p,sourceLayer:sourceLayer(f),layerId:layerId(f)};
  document.querySelectorAll('.sheet.open').forEach(s=>{s.classList.remove('open');s.setAttribute('aria-hidden','true')});
  const sheet=$('#infoSheet');if(!sheet)return;$('#infoKicker').textContent=lang()==='it'?'DETTAGLI DEL LUOGO':'PLACE DETAILS';$('#infoTitle').textContent=name;
  const typeCard=t?.isGeneric(kind)?'':`<div class="info-metric pv-type-metric"><small>${lang()==='it'?'Tipo':'Type'}</small><b>${esc(typeLabel)}</b></div>`;
  $('#infoBody').innerHTML=`<div class="pv-place-summary"><b style="display:none">${esc(kind)}</b><span>${esc(typeLabel)}</span></div><div class="info-grid">${typeCard}<div class="info-metric"><small>${lang()==='it'?'Coordinate':'Coordinates'}</small><b>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</b></div></div><div class="source-card"><b class="ok">${lang()==='it'?'Fonte':'Source'}</b><span>OpenStreetMap / OpenFreeMap</span></div><section id="pvInstantReviews" class="pv-review-section"></section>`;
  sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');$('#scrim')?.classList.add('open');
  document.dispatchEvent(new CustomEvent('pv-place-open',{detail:window.__PV_ACTIVE_PLACE__}));
 }
 function bind(){
  document.addEventListener('pointerdown',e=>{if(e.target===canvas)down={x:e.clientX,y:e.clientY,t:Date.now()}},true);
  document.addEventListener('pointerup',e=>{if(e.target!==canvas||!down)return;const d=down;down=null;const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y),elapsed=Date.now()-d.t;if(moved>13||elapsed>750)return;const rect=canvas.getBoundingClientRect(),point={x:e.clientX-rect.left,y:e.clientY-rect.top},f=bestFeature(point);if(!f)return;const id=layerId(f);if(id.startsWith('pv-poi-')||id==='quakes'||id==='quake-glow')return;if(Date.now()-lastTap<220)return;lastTap=Date.now();window.__PV_UNIVERSAL_POI_UNTIL=Date.now()+1100;e.preventDefault();e.stopImmediatePropagation();openInstant(f,point)},true);
  document.addEventListener('click',e=>{if(e.target===canvas&&Date.now()<(window.__PV_UNIVERSAL_POI_UNTIL||0)){e.preventDefault();e.stopImmediatePropagation()}},true)
 }
 async function init(){for(let i=0;i<180;i++){if(window.__PV_MAP__?.getCanvas&&tax()){map=window.__PV_MAP__;canvas=map.getCanvas();break}await sleep(50)}if(!map||!canvas)return;bind()}
 init();
}
