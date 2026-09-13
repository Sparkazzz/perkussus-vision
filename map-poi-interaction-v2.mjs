const $=(s,r=document)=>r.querySelector(s);
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_UNIVERSAL_POI_V2__){
 window.__PV_UNIVERSAL_POI_V2__=true;
 let map=null,canvas=null,down=null,lastTap=0;
 const IT={
  restaurant:'Ristorante',fast_food:'Fast food',food_court:'Area ristorazione',cafe:'Caffè',bar:'Bar',pub:'Pub',ice_cream:'Gelateria',pizzeria:'Pizzeria',
  pharmacy:'Farmacia',hospital:'Ospedale',clinic:'Clinica',doctors:'Studio medico',doctor:'Studio medico',dentist:'Dentista',veterinary:'Veterinario',
  parking:'Parcheggio',parking_entrance:'Ingresso parcheggio',fuel:'Distributore',charging_station:'Ricarica elettrica',atm:'Bancomat',bank:'Banca',
  supermarket:'Supermercato',grocery:'Supermercato',convenience:'Alimentari',bakery:'Panificio',pastry:'Pasticceria',butcher:'Macelleria',greengrocer:'Frutta e verdura',
  clothes:'Negozio di abbigliamento',shoes:'Negozio di scarpe',jewelry:'Gioielleria',jewellery:'Gioielleria',hairdresser:'Parrucchiere',beauty:'Centro estetico',florist:'Fioraio',books:'Libreria',stationery:'Cartoleria',electronics:'Elettronica',mobile_phone:'Telefonia',computer:'Informatica',furniture:'Arredamento',hardware:'Ferramenta',sports:'Articoli sportivi',gift:'Negozio di regali',art:'Negozio d’arte',mall:'Centro commerciale',department_store:'Grande magazzino',
  hotel:'Hotel',guest_house:'Affittacamere',hostel:'Ostello',motel:'Motel',apartment:'Appartamenti',museum:'Museo',gallery:'Galleria',attraction:'Attrazione',viewpoint:'Punto panoramico',zoo:'Zoo',theme_park:'Parco divertimenti',aquarium:'Acquario',park:'Parco',garden:'Giardino',nature_reserve:'Riserva naturale',
  station:'Stazione',halt:'Stazione',bus_station:'Autostazione',platform:'Fermata',aerodrome:'Aeroporto',terminal:'Terminal',toilets:'Bagni',post_office:'Ufficio postale',post_box:'Cassetta postale',
  school:'Scuola',university:'Università',college:'Istituto scolastico',kindergarten:'Scuola dell’infanzia',library:'Biblioteca',police:'Polizia',fire_station:'Vigili del fuoco',townhall:'Municipio',place_of_worship:'Luogo di culto',church:'Chiesa',cathedral:'Cattedrale',chapel:'Cappella',mosque:'Moschea',synagogue:'Sinagoga',cinema:'Cinema',theatre:'Teatro',nightclub:'Discoteca',marketplace:'Mercato',
  office:'Ufficio',craft:'Attività artigianale',shop:'Negozio',poi:'Punto di interesse',place:'Punto di interesse'
 };
 function sourceLayer(f){return String(f?.sourceLayer||f?.layer?.['source-layer']||'').toLowerCase()}
 function layerId(f){return String(f?.layer?.id||'').toLowerCase()}
 function clean(v){return String(v||'').toLowerCase().trim().replaceAll(' ','_')}
 function rawKind(p={}){
  const amenity=clean(p.amenity),shop=clean(p.shop),tour=clean(p.tourism),leisure=clean(p.leisure),health=clean(p.healthcare),rail=clean(p.railway),pt=clean(p.public_transport),air=clean(p.aeroway),sub=clean(p.subclass),cls=clean(p.class),type=clean(p.type),building=clean(p.building),religion=clean(p.religion),cuisine=String(p.cuisine||'').toLowerCase();
  if(['restaurant','fast_food','food_court'].includes(amenity)&&/(^|[;,])\s*(pizza|italian_pizza)\s*($|[;,])/.test(cuisine))return'pizzeria';
  if(amenity==='place_of_worship'){
   if(building==='cathedral')return'cathedral';if(building==='chapel')return'chapel';if(religion==='christian'||building==='church')return'church';if(religion==='muslim'||building==='mosque')return'mosque';if(religion==='jewish'||building==='synagogue')return'synagogue';return'place_of_worship';
  }
  const direct=amenity||shop||tour||leisure||health||rail||pt||air;
  if(direct)return direct;
  if(sub&&sub!=='yes'&&sub!=='poi')return sub;
  if(cls&&cls!=='yes'&&cls!=='poi')return cls;
  if(type&&type!=='yes')return type;
  return'place';
 }
 function human(raw,p={}){
  const k=clean(raw);if(lang()!=='it')return k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  if(IT[k])return IT[k];
  const cls=clean(p.class),sub=clean(p.subclass);
  if(cls==='shop'&&sub&&sub!=='shop')return `Negozio · ${sub.replaceAll('_',' ')}`;
  if(cls==='food_and_drink'&&sub)return sub.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  if(k&&!['place','poi','yes'].includes(k))return k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
  return'Punto di interesse';
 }
 function nameOf(p={}){return p[`name:${lang()}`]||p[`name_${lang()}`]||p.name||p['name:en']||p.brand||p.operator||''}
 function score(f){
  const id=layerId(f),sl=sourceLayer(f),p=f?.properties||{};if(id==='quakes'||id==='quake-glow'||id.startsWith('pv-poi-'))return-9999;
  const raw=rawKind(p),named=!!nameOf(p),symbol=f?.layer?.type==='symbol';let s=0;
  if(sl==='poi')s+=220;if(symbol)s+=70;if(named)s+=100;if(p.amenity||p.shop||p.tourism||p.leisure||p.healthcare||p.public_transport||p.railway||p.aeroway||p.subclass||p.class)s+=120;
  if(/poi|amenity|shop|relig|church|parking|hospital|medical|hotel|museum|station|airport|attraction|park/i.test(id+' '+sl))s+=70;
  if(!['place','poi'].includes(raw))s+=55;if(/road|street|transportation_name|water_name|boundary/i.test(id+' '+sl)&&sl!=='poi')s-=170;
  return s
 }
 function bestFeature(point){let fs=[];try{fs=map.queryRenderedFeatures([[point.x-30,point.y-30],[point.x+30,point.y+30]])||[]}catch{return null}let best=null,bestScore=90;for(const f of fs){const s=score(f);if(s>bestScore){best=f;bestScore=s}}return best}
 function featureCoord(f,point){const g=f?.geometry;if(g?.type==='Point'&&Array.isArray(g.coordinates))return{lng:Number(g.coordinates[0]),lat:Number(g.coordinates[1])};const ll=map.unproject([point.x,point.y]);return{lng:ll.lng,lat:ll.lat}}
 function openInstant(f,point){
  const p=f?.properties||{},raw=rawKind(p),name=nameOf(p)||human(raw,p),ll=featureCoord(f,point);
  window.__PV_ACTIVE_PLACE__={type:'',id:'',lat:ll.lat,lon:ll.lng,name,kind:raw,tags:{kind:raw}};
  document.querySelectorAll('.sheet.open').forEach(s=>{s.classList.remove('open');s.setAttribute('aria-hidden','true')});
  const sheet=$('#infoSheet');if(!sheet)return;$('#infoKicker').textContent=lang()==='it'?'DETTAGLI DEL LUOGO':'PLACE DETAILS';$('#infoTitle').textContent=name;
  $('#infoBody').innerHTML=`<div class="pv-place-summary"><b style="display:none">${esc(raw)}</b><span>${esc(human(raw,p))}</span></div><div class="info-grid"><div class="info-metric"><small>${lang()==='it'?'Tipo':'Type'}</small><b>${esc(human(raw,p))}</b></div><div class="info-metric"><small>${lang()==='it'?'Coordinate':'Coordinates'}</small><b>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</b></div></div><div class="source-card"><b class="ok">${lang()==='it'?'Fonte':'Source'}</b><span>OpenStreetMap / OpenFreeMap</span></div><section id="pvInstantReviews" class="pv-review-section"></section>`;
  sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');$('#scrim')?.classList.add('open');
  document.dispatchEvent(new CustomEvent('pv-place-open',{detail:window.__PV_ACTIVE_PLACE__}));
 }
 function bind(){
  document.addEventListener('pointerdown',e=>{if(e.target===canvas)down={x:e.clientX,y:e.clientY,t:Date.now()}},true);
  document.addEventListener('pointerup',e=>{if(e.target!==canvas||!down)return;const d=down;down=null;const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y),elapsed=Date.now()-d.t;if(moved>13||elapsed>750)return;const rect=canvas.getBoundingClientRect(),point={x:e.clientX-rect.left,y:e.clientY-rect.top},f=bestFeature(point);if(!f)return;const id=layerId(f);if(id.startsWith('pv-poi-')||id==='quakes'||id==='quake-glow')return;if(Date.now()-lastTap<220)return;lastTap=Date.now();window.__PV_UNIVERSAL_POI_UNTIL=Date.now()+1100;e.preventDefault();e.stopImmediatePropagation();openInstant(f,point)},true);
  document.addEventListener('click',e=>{if(e.target===canvas&&Date.now()<(window.__PV_UNIVERSAL_POI_UNTIL||0)){e.preventDefault();e.stopImmediatePropagation()}},true)
 }
 async function init(){for(let i=0;i<180;i++){if(window.__PV_MAP__?.getCanvas){map=window.__PV_MAP__;canvas=map.getCanvas();break}await sleep(50)}if(!map||!canvas)return;bind()}
 init();
}
