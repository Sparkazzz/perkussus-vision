const MAPLIBRE_URLS=[
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs',
  'https://unpkg.com/maplibre-gl@6.9.0/dist/maplibre-gl.mjs'
];

let maplibre=null;
for(const url of MAPLIBRE_URLS){
  try{maplibre=await import(url);break}catch(err){console.warn('Perkussus smart-map: MapLibre import failed',url,err)}
}

if(!maplibre?.Map)throw new Error('Perkussus smart-map: MapLibre non disponibile');

// Neutralizza il vecchio blocco a soglia fissa: ora decide il feature picker in base a ciò che è realmente visibile.
try{
  Object.defineProperty(window,'__PV_MAP_ZOOM__',{configurable:true,get:()=>99,set:()=>{}});
}catch{}

const lang=()=>{
  try{return localStorage.getItem('pv_language')||'it'}catch{return 'it'}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const copy={
  it:{picked:'Elemento selezionato sulla mappa',category:'Cerca per categoria',nearby:'nelle vicinanze',zoom:'Avvicinati prima a una città o a una zona abitata.',loading:'Cerco nei dati OpenStreetMap…',none:'Nessun risultato trovato in questa zona.',source:'OpenStreetMap · ricerca nelle vicinanze',distance:'distanza'},
  en:{picked:'Selected map feature',category:'Search by category',nearby:'nearby',zoom:'Zoom into a city or populated area first.',loading:'Searching OpenStreetMap data…',none:'No results found in this area.',source:'OpenStreetMap · nearby search',distance:'distance'},
  fr:{picked:'Élément sélectionné sur la carte',category:'Rechercher par catégorie',nearby:'à proximité',zoom:'Zoomez d’abord sur une ville ou une zone habitée.',loading:'Recherche dans OpenStreetMap…',none:'Aucun résultat dans cette zone.',source:'OpenStreetMap · recherche à proximité',distance:'distance'},
  es:{picked:'Elemento seleccionado en el mapa',category:'Buscar por categoría',nearby:'cerca',zoom:'Acércate primero a una ciudad o zona habitada.',loading:'Buscando en OpenStreetMap…',none:'No hay resultados en esta zona.',source:'OpenStreetMap · búsqueda cercana',distance:'distancia'},
  de:{picked:'Ausgewähltes Kartenobjekt',category:'Nach Kategorie suchen',nearby:'in der Nähe',zoom:'Zoome zuerst in eine Stadt oder ein bewohntes Gebiet.',loading:'OpenStreetMap wird durchsucht…',none:'Keine Ergebnisse in diesem Gebiet.',source:'OpenStreetMap · Umgebungssuche',distance:'Entfernung'},
  ru:{picked:'Выбранный объект на карте',category:'Поиск по категории',nearby:'рядом',zoom:'Сначала приблизьте город или населённую местность.',loading:'Поиск в OpenStreetMap…',none:'В этой зоне ничего не найдено.',source:'OpenStreetMap · поиск рядом',distance:'расстояние'},
  hi:{picked:'मानचित्र पर चुना गया स्थान',category:'श्रेणी के अनुसार खोजें',nearby:'आस-पास',zoom:'पहले किसी शहर या आबादी वाले क्षेत्र पर ज़ूम करें।',loading:'OpenStreetMap डेटा खोजा जा रहा है…',none:'इस क्षेत्र में कोई परिणाम नहीं मिला।',source:'OpenStreetMap · आस-पास खोज',distance:'दूरी'},
  pt:{picked:'Elemento selecionado no mapa',category:'Pesquisar por categoria',nearby:'nas proximidades',zoom:'Aproxime primeiro uma cidade ou zona habitada.',loading:'A pesquisar no OpenStreetMap…',none:'Nenhum resultado nesta zona.',source:'OpenStreetMap · pesquisa próxima',distance:'distância'},
  zh:{picked:'地图上选中的对象',category:'按类别搜索',nearby:'附近',zoom:'请先放大到城市或有人居住的区域。',loading:'正在搜索 OpenStreetMap 数据…',none:'该区域没有找到结果。',source:'OpenStreetMap · 附近搜索',distance:'距离'},
  ja:{picked:'地図で選択した対象',category:'カテゴリから検索',nearby:'周辺',zoom:'まず都市または居住地域まで拡大してください。',loading:'OpenStreetMap データを検索中…',none:'この地域では見つかりませんでした。',source:'OpenStreetMap · 周辺検索',distance:'距離'}
};
const tr=()=>copy[lang()]||copy.en;

const categories=[
  {id:'restaurant',icon:'🍴',labels:{it:'Ristoranti',en:'Restaurants',fr:'Restaurants',es:'Restaurantes',de:'Restaurants',ru:'Рестораны',hi:'रेस्तराँ',pt:'Restaurantes',zh:'餐厅',ja:'レストラン'},tag:'amenity',regex:'restaurant',keywords:['restaurant','restaurants','ristorante','ristoranti','restaurante','restaurantes','restaurant','restaurants','ресторан','рестораны','रेस्तराँ','餐厅','餐館','レストラン']},
  {id:'hotel',icon:'▣',labels:{it:'Hotel',en:'Hotels',fr:'Hôtels',es:'Hoteles',de:'Hotels',ru:'Отели',hi:'होटल',pt:'Hotéis',zh:'酒店',ja:'ホテル'},tag:'tourism',regex:'hotel|guest_house|hostel|motel',keywords:['hotel','hotels','hôtel','hôtels','hoteles','отель','отели','होटल','酒店','ホテル']},
  {id:'parking',icon:'P',labels:{it:'Parcheggi',en:'Parking',fr:'Parkings',es:'Aparcamientos',de:'Parkplätze',ru:'Парковки',hi:'पार्किंग',pt:'Estacionamentos',zh:'停车场',ja:'駐車場'},tag:'amenity',regex:'parking',keywords:['parking','parcheggio','parcheggi','parkplatz','parkplätze','aparcamiento','aparcamientos','парковка','парковки','पार्किंग','停车场','駐車場']},
  {id:'cafe',icon:'☕',labels:{it:'Bar e caffè',en:'Cafés & bars',fr:'Cafés et bars',es:'Cafés y bares',de:'Cafés & Bars',ru:'Кафе и бары',hi:'कैफ़े और बार',pt:'Cafés e bares',zh:'咖啡馆和酒吧',ja:'カフェ・バー'},tag:'amenity',regex:'cafe|bar|pub',keywords:['cafe','cafè','caffè','bar','bars','pub','pubs','café','cafés','кафе','бар','कैफ़े','咖啡馆','酒吧','カフェ','バー']},
  {id:'pharmacy',icon:'✚',labels:{it:'Farmacie',en:'Pharmacies',fr:'Pharmacies',es:'Farmacias',de:'Apotheken',ru:'Аптеки',hi:'फ़ार्मेसी',pt:'Farmácias',zh:'药店',ja:'薬局'},tag:'amenity',regex:'pharmacy',keywords:['pharmacy','pharmacies','farmacia','farmacie','pharmacie','pharmacies','apotheke','apotheken','аптека','аптеки','फ़ार्मेसी','药店','薬局']},
  {id:'supermarket',icon:'□',labels:{it:'Supermercati',en:'Supermarkets',fr:'Supermarchés',es:'Supermercados',de:'Supermärkte',ru:'Супермаркеты',hi:'सुपरमार्केट',pt:'Supermercados',zh:'超市',ja:'スーパー'},tag:'shop',regex:'supermarket',keywords:['supermarket','supermarkets','supermercato','supermercati','supermarché','supermarchés','supermercado','supermercados','supermarkt','supermärkte','супермаркет','супермаркеты','सुपरमार्केट','超市','スーパー']},
  {id:'hospital',icon:'H',labels:{it:'Ospedali',en:'Hospitals',fr:'Hôpitaux',es:'Hospitales',de:'Krankenhäuser',ru:'Больницы',hi:'अस्पताल',pt:'Hospitais',zh:'医院',ja:'病院'},tag:'amenity',regex:'hospital|clinic',keywords:['hospital','hospitals','ospedale','ospedali','clinica','cliniche','hôpital','hôpitaux','hospitales','krankenhaus','krankenhäuser','больница','больницы','अस्पताल','医院','病院']},
  {id:'fuel',icon:'⛽',labels:{it:'Carburante',en:'Fuel',fr:'Stations-service',es:'Gasolineras',de:'Tankstellen',ru:'Заправки',hi:'ईंधन',pt:'Postos',zh:'加油站',ja:'ガソリンスタンド'},tag:'amenity',regex:'fuel',keywords:['fuel','gas station','benzina','distributore','carburante','station-service','gasolinera','tankstelle','заправка','ईंधन','加油站','ガソリンスタンド']},
  {id:'museum',icon:'◇',labels:{it:'Musei',en:'Museums',fr:'Musées',es:'Museos',de:'Museen',ru:'Музеи',hi:'संग्रहालय',pt:'Museus',zh:'博物馆',ja:'博物館'},tag:'tourism',regex:'museum',keywords:['museum','museums','museo','musei','musée','musées','museo','museos','museum','museen','музей','музеи','संग्रहालय','博物馆','博物館']},
  {id:'attraction',icon:'◎',labels:{it:'Attrazioni',en:'Attractions',fr:'Attractions',es:'Atracciones',de:'Sehenswürdigkeiten',ru:'Достопримечательности',hi:'आकर्षण',pt:'Atrações',zh:'景点',ja:'観光スポット'},tag:'tourism',regex:'attraction|viewpoint|zoo|theme_park',keywords:['attraction','attractions','attrazione','attrazioni','sehenswürdigkeit','достопримечательность','आकर्षण','景点','観光スポット']},
  {id:'atm',icon:'€',labels:{it:'Bancomat',en:'ATMs',fr:'Distributeurs',es:'Cajeros',de:'Geldautomaten',ru:'Банкоматы',hi:'एटीएम',pt:'Caixas eletrônicos',zh:'ATM',ja:'ATM'},tag:'amenity',regex:'atm',keywords:['atm','bancomat','cajero','geldautomat','банкомат','एटीएम']},
  {id:'charging',icon:'⚡',labels:{it:'Ricarica EV',en:'EV charging',fr:'Recharge VE',es:'Carga EV',de:'E-Ladestationen',ru:'Зарядки для ЭМ',hi:'ईवी चार्जिंग',pt:'Carregamento EV',zh:'电动车充电',ja:'EV充電'},tag:'amenity',regex:'charging_station',keywords:['charging station','ev charging','ricarica','colonnina','ladestation','зарядка','ईवी चार्जिंग','充电站','EV充電']}
];

const categoryLabel=cat=>cat.labels[lang()]||cat.labels.en;

function localizedName(p={}){
  const l=lang();
  return p[`name:${l}`]||p[`name_${l}`]||p.name||p['name:latin']||p.name_en||'';
}

function classifyFeature(feature){
  const p=feature?.properties||{};
  const sl=String(feature?.sourceLayer||feature?.layer?.['source-layer']||'').toLowerCase();
  const raw=String(p.subclass||p.class||p.amenity||p.tourism||p.shop||p.place||'').toLowerCase();
  const map={
    restaurant:{it:'Ristorante',en:'Restaurant',fr:'Restaurant',es:'Restaurante',de:'Restaurant',ru:'Ресторан',hi:'रेस्तराँ',pt:'Restaurante',zh:'餐厅',ja:'レストラン'},
    hotel:{it:'Hotel',en:'Hotel',fr:'Hôtel',es:'Hotel',de:'Hotel',ru:'Отель',hi:'होटल',pt:'Hotel',zh:'酒店',ja:'ホテル'},
    cafe:{it:'Caffè',en:'Café',fr:'Café',es:'Café',de:'Café',ru:'Кафе',hi:'कैफ़े',pt:'Café',zh:'咖啡馆',ja:'カフェ'},
    bar:{it:'Bar',en:'Bar',fr:'Bar',es:'Bar',de:'Bar',ru:'Бар',hi:'बार',pt:'Bar',zh:'酒吧',ja:'バー'},
    pharmacy:{it:'Farmacia',en:'Pharmacy',fr:'Pharmacie',es:'Farmacia',de:'Apotheke',ru:'Аптека',hi:'फ़ार्मेसी',pt:'Farmácia',zh:'药店',ja:'薬局'},
    parking:{it:'Parcheggio',en:'Parking',fr:'Parking',es:'Aparcamiento',de:'Parkplatz',ru:'Парковка',hi:'पार्किंग',pt:'Estacionamento',zh:'停车场',ja:'駐車場'},
    museum:{it:'Museo',en:'Museum',fr:'Musée',es:'Museo',de:'Museum',ru:'Музей',hi:'संग्रहालय',pt:'Museu',zh:'博物馆',ja:'博物館'},
    hospital:{it:'Ospedale',en:'Hospital',fr:'Hôpital',es:'Hospital',de:'Krankenhaus',ru:'Больница',hi:'अस्पताल',pt:'Hospital',zh:'医院',ja:'病院'}
  };
  if(map[raw])return map[raw][lang()]||map[raw].en;
  if(sl==='place'){
    const place=String(p.class||p.place||'').toLowerCase();
    if(place==='city')return lang()==='it'?'Città':'City';
    if(place==='town')return lang()==='it'?'Cittadina':'Town';
    if(place==='village')return lang()==='it'?'Paese / villaggio':'Village';
    if(place==='country')return lang()==='it'?'Paese':'Country';
    return lang()==='it'?'Località':'Place';
  }
  if(sl.includes('transportation'))return lang()==='it'?'Via / strada':'Road / street';
  if(sl.includes('building'))return lang()==='it'?'Edificio':'Building';
  if(sl.includes('water'))return lang()==='it'?'Elemento geografico':'Geographic feature';
  if(sl==='poi')return lang()==='it'?'Punto di interesse':'Point of interest';
  return lang()==='it'?'Luogo':'Place';
}

function featureScore(f,zoom){
  const p=f?.properties||{};
  const sl=String(f?.sourceLayer||f?.layer?.['source-layer']||'').toLowerCase();
  const id=String(f?.layer?.id||'').toLowerCase();
  if(id.includes('quake')||sl==='quakes')return -1;
  const name=localizedName(p);
  if(sl==='place'&&name)return 120;
  if(sl==='poi'&&name)return 115;
  if(sl==='transportation_name'&&name)return 110;
  if((sl==='water_name'||sl==='waterway'||sl==='mountain_peak'||sl==='park'||sl==='aerodrome_label')&&name)return 105;
  if(f?.layer?.type==='symbol'&&name)return 100;
  if(sl==='transportation'&&zoom>=14)return name?92:72;
  if(sl==='building'&&zoom>=16)return name?90:68;
  if(name&&zoom>=12&&!/(landcover|landuse|boundary)/.test(sl))return 75;
  return -1;
}

function pickFeature(map,e){
  if(!map||!e?.point)return null;
  let features=[];
  try{
    const r=11,p=e.point;
    features=map.queryRenderedFeatures([[p.x-r,p.y-r],[p.x+r,p.y+r]])||[];
  }catch{return null}
  const zoom=map.getZoom?.()??0;
  let best=null,bestScore=-1;
  for(const f of features){
    const s=featureScore(f,zoom);
    if(s>bestScore){best=f;bestScore=s}
  }
  return bestScore>=0?best:null;
}

function featureLngLat(feature,fallback){
  const g=feature?.geometry;
  if(g?.type==='Point'&&Array.isArray(g.coordinates)){
    try{return maplibre.LngLat.convert(g.coordinates)}catch{}
  }
  return fallback;
}

function rememberFeature(feature,lngLat,override={}){
  const p=feature?.properties||{};
  window.__PV_LAST_FEATURE__={
    name:override.name||localizedName(p)||'',
    kind:override.kind||classifyFeature(feature),
    sourceLayer:String(feature?.sourceLayer||feature?.layer?.['source-layer']||''),
    lng:Number(lngLat?.lng),lat:Number(lngLat?.lat),
    at:Date.now()
  };
}

const MapClass=maplibre.Map;
const nativeOn=MapClass.prototype.on;
MapClass.prototype.on=function(type,targetOrListener,listener){
  window.__PV_MAP__=this;
  if(type==='click'&&typeof targetOrListener==='function'&&listener===undefined){
    const appListener=targetOrListener;
    const wrapped=e=>{
      if(e?.perkussusForce===true)return appListener.call(this,e);
      const picked=pickFeature(this,e);
      if(!picked)return;
      const ll=featureLngLat(picked,e.lngLat);
      rememberFeature(picked,ll);
      const next=Object.assign(Object.create(Object.getPrototypeOf(e)||Object.prototype),e,{lngLat:ll});
      return appListener.call(this,next);
    };
    return nativeOn.call(this,type,wrapped);
  }
  return nativeOn.apply(this,arguments);
};

function distanceMeters(a,b){
  const R=6371000,toRad=x=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),lat1=toRad(a.lat),lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function distanceText(m){return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(m<10000?1:0)} km`}
function radiusForZoom(z){if(z>=16)return 1500;if(z>=14)return 3000;if(z>=12)return 6000;if(z>=10)return 12000;return 20000}

async function overpassCategory(cat,map){
  const z=map.getZoom();
  if(z<7.5)throw new Error('ZOOM_REQUIRED');
  const c=map.getCenter(),radius=radiusForZoom(z);
  const regex=cat.regex.replace(/"/g,'');
  const q=`[out:json][timeout:14];nwr(around:${radius},${c.lat},${c.lng})["${cat.tag}"~"^(${regex})$"];out center tags 45;`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),16000);
  try{
    const r=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'},body:'data='+encodeURIComponent(q),signal:controller.signal});
    if(!r.ok)throw new Error(`Overpass ${r.status}`);
    const j=await r.json();
    return (j.elements||[]).map(el=>{
      const lat=Number(el.lat??el.center?.lat),lon=Number(el.lon??el.center?.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
      const tags=el.tags||{};
      return{id:`${el.type}/${el.id}`,lat,lon,name:tags[`name:${lang()}`]||tags.name||categoryLabel(cat),tags,dist:distanceMeters({lat:c.lat,lon:c.lng},{lat,lon})};
    }).filter(Boolean).sort((a,b)=>a.dist-b.dist).slice(0,30);
  }finally{clearTimeout(timeout)}
}

function injectSearchUI(){
  const form=document.querySelector('#searchForm'),status=document.querySelector('#searchStatus');
  if(!form||!status||document.querySelector('#pvCategoryBar'))return;
  const style=document.createElement('style');
  style.textContent=`
    .pv-category-block{margin:4px 0 10px}.pv-category-title{font-size:9px;color:#96a3b8;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px}.pv-category-bar{display:flex;gap:7px;overflow-x:auto;padding:0 0 6px;scrollbar-width:none}.pv-category-bar::-webkit-scrollbar{display:none}.pv-category-chip{flex:0 0 auto;min-height:38px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:rgba(255,255,255,.045);color:#fff;padding:0 11px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:800}.pv-category-chip:active,.pv-category-chip.active{border-color:rgba(114,232,255,.5);background:rgba(114,232,255,.1);color:#72e8ff}.pv-category-results{display:none;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:#0d1626;overflow:hidden;margin:0 0 10px}.pv-category-results.open{display:block}.pv-cat-head{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.07);font-size:9px;color:#96a3b8;display:flex;justify-content:space-between;gap:10px}.pv-cat-result{width:100%;display:flex;gap:10px;align-items:center;padding:11px 12px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#fff;text-align:left}.pv-cat-result:last-child{border-bottom:0}.pv-cat-icon{width:36px;height:36px;flex:0 0 auto;border-radius:11px;background:rgba(114,232,255,.08);display:grid;place-items:center;color:#72e8ff;font-weight:900}.pv-cat-copy{min-width:0;flex:1}.pv-cat-copy b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pv-cat-copy small{display:block;margin-top:3px;color:#96a3b8;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pv-cat-dist{font-size:9px;color:#96a3b8;flex:0 0 auto}
    .pv-picked-card{border-color:rgba(114,232,255,.22)!important;background:rgba(114,232,255,.055)!important}.pv-picked-card b{color:#72e8ff!important}
  `;
  document.head.appendChild(style);
  const block=document.createElement('div');block.className='pv-category-block';
  block.innerHTML=`<div class="pv-category-title">${esc(tr().category)}</div><div class="pv-category-bar" id="pvCategoryBar">${categories.map(c=>`<button type="button" class="pv-category-chip" data-pv-cat="${c.id}"><span>${c.icon}</span><b>${esc(categoryLabel(c))}</b></button>`).join('')}</div>`;
  form.after(block);
  const results=document.createElement('div');results.id='pvCategoryResults';results.className='pv-category-results';status.after(results);

  async function run(cat){
    const map=window.__PV_MAP__;
    if(!map){status.textContent=tr().loading;return}
    document.querySelector('#searchSuggestions')?.classList.remove('open');
    block.querySelectorAll('.pv-category-chip').forEach(b=>b.classList.toggle('active',b.dataset.pvCat===cat.id));
    results.classList.add('open');results.innerHTML=`<div class="pv-cat-head"><span>${esc(categoryLabel(cat))}</span><span>${esc(tr().source)}</span></div><div class="pv-cat-head">${esc(tr().loading)}</div>`;
    try{
      const rows=await overpassCategory(cat,map);
      if(!rows.length){results.innerHTML=`<div class="pv-cat-head">${esc(tr().none)}</div>`;return}
      results.innerHTML=`<div class="pv-cat-head"><span>${esc(categoryLabel(cat))} · ${esc(tr().nearby)}</span><span>${rows.length}</span></div>`+rows.map((r,i)=>`<button type="button" class="pv-cat-result" data-pv-result="${i}"><span class="pv-cat-icon">${cat.icon}</span><span class="pv-cat-copy"><b>${esc(r.name)}</b><small>${esc([r.tags['addr:street'],r.tags['addr:city']||r.tags['addr:place']].filter(Boolean).join(' · ')||categoryLabel(cat))}</small></span><span class="pv-cat-dist">${distanceText(r.dist)}</span></button>`).join('');
      results.querySelectorAll('[data-pv-result]').forEach(btn=>btn.addEventListener('click',()=>openResult(rows[Number(btn.dataset.pvResult)],cat)));
    }catch(err){
      results.innerHTML=`<div class="pv-cat-head">${esc(err?.message==='ZOOM_REQUIRED'?tr().zoom:(err?.name==='AbortError'?tr().none:String(err?.message||err)))}</div>`;
    }
  }

  function openResult(r,cat){
    const map=window.__PV_MAP__;if(!map)return;
    const close=document.querySelector('#searchSheet [data-close]');close?.click();
    window.__PV_LAST_FEATURE__={name:r.name,kind:categoryLabel(cat),sourceLayer:'osm-overpass',lng:r.lon,lat:r.lat,at:Date.now()};
    map.flyTo({center:[r.lon,r.lat],zoom:17,duration:1200,essential:true});
    const inspect=()=>{
      try{
        const ll=new maplibre.LngLat(r.lon,r.lat),point=map.project(ll);
        map.fire('click',{lngLat:ll,point,perkussusForce:true});
      }catch{}
    };
    map.once('idle',inspect);
    setTimeout(inspect,1800);
  }

  block.querySelectorAll('[data-pv-cat]').forEach(btn=>btn.addEventListener('click',()=>{
    const cat=categories.find(c=>c.id===btn.dataset.pvCat);if(cat)run(cat);
  }));

  const matchCategory=q=>{
    const s=q.trim().toLowerCase();
    for(const cat of categories){
      const candidates=[categoryLabel(cat),...cat.keywords].map(x=>String(x).toLowerCase());
      for(const k of candidates){
        if(s===k)return{cat,where:''};
        if(s.startsWith(k+' '))return{cat,where:q.trim().slice(k.length).trim()};
      }
    }
    return null;
  };

  form.addEventListener('submit',async e=>{
    const q=document.querySelector('#searchInput')?.value||'',m=matchCategory(q);
    if(!m)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(m.where){
      status.textContent=tr().loading;
      try{
        const r=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(m.where)}&limit=1`,{headers:{Accept:'application/json'}});const j=await r.json();const f=j.features?.[0];
        if(f?.geometry?.coordinates){const [lon,lat]=f.geometry.coordinates;const map=window.__PV_MAP__;map?.flyTo({center:[lon,lat],zoom:13,duration:900,essential:true});setTimeout(()=>run(m.cat),1050);return}
      }catch{}
    }
    run(m.cat);
  },true);
}

function decorateInspector(){
  const last=window.__PV_LAST_FEATURE__;if(!last||Date.now()-last.at>9000)return;
  const body=document.querySelector('#infoBody');if(!body||body.querySelector('.pv-picked-card'))return;
  const title=document.querySelector('#infoTitle');if(last.name&&title)title.textContent=last.name;
  const card=document.createElement('div');card.className='source-card pv-picked-card';
  card.innerHTML=`<b>${esc(last.kind||tr().picked)}</b><span>${esc(last.name||tr().picked)}</span>`;
  body.prepend(card);
}

function setupDom(){
  injectSearchUI();
  const body=document.querySelector('#infoBody');
  if(body){new MutationObserver(()=>decorateInspector()).observe(body,{childList:true,subtree:true});decorateInspector()}
  window.addEventListener('pv:languagechange',()=>{document.querySelector('#pvCategoryBar')?.closest('.pv-category-block')?.remove();document.querySelector('#pvCategoryResults')?.remove();injectSearchUI()});
}

if(document.readyState==='loading'||document.readyState==='interactive')document.addEventListener('DOMContentLoaded',setupDom,{once:true});else setupDom();
