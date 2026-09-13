const $=(s,r=document)=>r.querySelector(s);
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_UNIVERSAL_POI_V1__){
 window.__PV_UNIVERSAL_POI_V1__=true;
 let map=null,canvas=null,down=null,lastTap=0,styleTimer=null,lastStyleApply=0;
 const IT={restaurant:'Ristorante',cafe:'Caffè',bar:'Bar',pub:'Pub',fast_food:'Fast food',pharmacy:'Farmacia',hospital:'Ospedale',clinic:'Clinica',doctors:'Studio medico',dentist:'Dentista',parking:'Parcheggio',parking_entrance:'Parcheggio',fuel:'Distributore',charging_station:'Ricarica elettrica',atm:'Bancomat',bank:'Banca',supermarket:'Supermercato',bakery:'Panificio',jewelry:'Gioielleria',jewellery:'Gioielleria',hotel:'Hotel',guest_house:'Affittacamere',hostel:'Ostello',motel:'Motel',museum:'Museo',attraction:'Attrazione',viewpoint:'Punto panoramico',park:'Parco',station:'Stazione',bus_station:'Autostazione',aerodrome:'Aeroporto',toilets:'Bagni',post_office:'Ufficio postale',school:'Scuola',university:'Università',library:'Biblioteca',police:'Polizia',fire_station:'Vigili del fuoco',townhall:'Municipio',place_of_worship:'Luogo di culto',church:'Chiesa',mosque:'Moschea',synagogue:'Sinagoga',cinema:'Cinema',theatre:'Teatro',nightclub:'Discoteca',marketplace:'Mercato',shop:'Negozio',religion:'Luogo di culto',place:'Luogo'};
 function sourceLayer(f){return String(f?.sourceLayer||f?.layer?.['source-layer']||'').toLowerCase()}
 function layerId(f){return String(f?.layer?.id||'').toLowerCase()}
 function rawKind(p={}){return String(p.amenity||p.shop||p.tourism||p.leisure||p.healthcare||p.public_transport||p.railway||p.aeroway||p.subclass||p.class||p.type||'place').toLowerCase()}
 function human(raw){const k=String(raw||'place').toLowerCase().replaceAll(' ','_');if(lang()==='it')return IT[k]||IT[k.replaceAll('_',' ')]||'Luogo';return k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())}
 function nameOf(p={}){return p[`name:${lang()}`]||p[`name_${lang()}`]||p.name||p['name:en']||p.brand||''}
 function score(f){
   const id=layerId(f),sl=sourceLayer(f),p=f?.properties||{};
   if(id==='quakes'||id==='quake-glow'||id.startsWith('pv-poi-'))return-9999;
   const raw=rawKind(p),named=!!nameOf(p),symbol=f?.layer?.type==='symbol';
   let s=0;
   if(sl==='poi')s+=180;
   if(symbol)s+=75;
   if(named)s+=90;
   if(p.amenity||p.shop||p.tourism||p.leisure||p.healthcare||p.public_transport||p.railway||p.aeroway)s+=150;
   if(/poi|amenity|shop|relig|church|parking|hospital|hotel|museum|station|airport|attraction|place/i.test(id+' '+sl))s+=60;
   if(['parking','place_of_worship','religion','church','school','hospital','restaurant','cafe','hotel','museum','shop'].includes(raw))s+=80;
   if(/road|street|transportation_name|water_name|boundary/i.test(id+' '+sl)&&!(p.amenity||p.shop||p.tourism))s-=140;
   if(!symbol&&sl!=='poi'&&!(p.amenity||p.shop||p.tourism||p.leisure||p.healthcare))s-=120;
   return s;
 }
 function bestFeature(point){let fs=[];try{fs=map.queryRenderedFeatures([[point.x-28,point.y-28],[point.x+28,point.y+28]])||[]}catch{return null}let best=null,bestScore=95;for(const f of fs){const s=score(f);if(s>bestScore){best=f;bestScore=s}}return best}
 function featureCoord(f,point){const g=f?.geometry;if(g?.type==='Point'&&Array.isArray(g.coordinates))return{lng:Number(g.coordinates[0]),lat:Number(g.coordinates[1])};const ll=map.unproject([point.x,point.y]);return{lng:ll.lng,lat:ll.lat}}
 function openInstant(f,point){
   const p=f?.properties||{},raw=rawKind(p),name=nameOf(p)||human(raw),ll=featureCoord(f,point);
   document.querySelectorAll('.sheet.open').forEach(s=>{s.classList.remove('open');s.setAttribute('aria-hidden','true')});const sheet=$('#infoSheet');if(!sheet)return;
   $('#infoKicker').textContent=lang()==='it'?'DETTAGLI DEL LUOGO':'PLACE DETAILS';$('#infoTitle').textContent=name;
   $('#infoBody').innerHTML=`<div class="pv-place-summary"><b style="display:none">${esc(raw)}</b><span>${esc(human(raw))}</span></div><div class="info-grid"><div class="info-metric"><small>${lang()==='it'?'Tipo':'Type'}</small><b>${esc(human(raw))}</b></div><div class="info-metric"><small>${lang()==='it'?'Coordinate':'Coordinates'}</small><b>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</b></div></div><div class="source-card"><b class="ok">${lang()==='it'?'Fonte':'Source'}</b><span>OpenStreetMap / OpenFreeMap</span></div>`;
   sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');$('#scrim')?.classList.add('open');
 }
 function satelliteOn(){try{return map.getLayer('satellite-real')&&map.getLayoutProperty('satellite-real','visibility')!=='none'}catch{return false}}
 function improveLabels(){
   if(!map?.isStyleLoaded?.()||Date.now()-lastStyleApply<900)return;lastStyleApply=Date.now();const dark=satelliteOn();
   for(const l of map.getStyle()?.layers||[]){
     if(l.type!=='symbol'||l.id.startsWith('pv-poi-'))continue;const sl=String(l['source-layer']||'').toLowerCase(),id=String(l.id||'').toLowerCase();if(!(sl==='poi'||/poi|amenity|shop|aerodrome|place.*label|transit|station/i.test(id+' '+sl)))continue;
     try{map.setPaintProperty(l.id,'text-opacity',1)}catch{}try{map.setPaintProperty(l.id,'icon-opacity',1)}catch{}try{map.setPaintProperty(l.id,'text-color',dark?'#ffffff':'#3f4858')}catch{}try{map.setPaintProperty(l.id,'text-halo-color',dark?'rgba(0,0,0,.88)':'rgba(255,255,255,.96)')}catch{}try{map.setPaintProperty(l.id,'text-halo-width',dark?1.8:1.5)}catch{}try{map.setPaintProperty(l.id,'text-halo-blur',.2)}catch{}
   }
 }
 function bind(){
   document.addEventListener('pointerdown',e=>{if(e.target===canvas)down={x:e.clientX,y:e.clientY,t:Date.now()}},true);
   document.addEventListener('pointerup',e=>{if(e.target!==canvas||!down)return;const d=down;down=null;const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y),elapsed=Date.now()-d.t;if(moved>12||elapsed>700)return;const rect=canvas.getBoundingClientRect(),point={x:e.clientX-rect.left,y:e.clientY-rect.top},f=bestFeature(point);if(!f)return;const id=layerId(f);if(id.startsWith('pv-poi-')||id==='quakes'||id==='quake-glow')return;if(Date.now()-lastTap<250)return;lastTap=Date.now();window.__PV_UNIVERSAL_POI_UNTIL=Date.now()+1100;e.preventDefault();e.stopImmediatePropagation();openInstant(f,point)},true);
   document.addEventListener('click',e=>{if(e.target===canvas&&Date.now()<(window.__PV_UNIVERSAL_POI_UNTIL||0)){e.preventDefault();e.stopImmediatePropagation()}},true);
 }
 async function init(){for(let i=0;i<180;i++){if(window.__PV_MAP__?.getCanvas){map=window.__PV_MAP__;canvas=map.getCanvas();break}await sleep(50)}if(!map||!canvas)return;bind();setTimeout(improveLabels,120);map.on('styledata',()=>{clearTimeout(styleTimer);styleTimer=setTimeout(improveLabels,140)})}
 init();
}
