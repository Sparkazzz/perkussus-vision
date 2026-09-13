const currentLanguage=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s||'').trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

const uiText={
  it:{category:'Cerca per categoria',area:'nell’area visibile',zoom:'Avvicinati prima a una città o a una zona abitata.',loading:'Cerco nei dati OpenStreetMap…',none:'Nessun risultato trovato.',results:'Risultati',type:'Scrivi almeno 2 caratteri.'},
  en:{category:'Search by category',area:'in the visible area',zoom:'Zoom into a city or populated area first.',loading:'Searching OpenStreetMap data…',none:'No results found.',results:'Results',type:'Type at least 2 characters.'},
  fr:{category:'Rechercher par catégorie',area:'dans la zone visible',zoom:'Zoomez d’abord sur une ville ou une zone habitée.',loading:'Recherche dans OpenStreetMap…',none:'Aucun résultat.',results:'Résultats',type:'Saisissez au moins 2 caractères.'},
  es:{category:'Buscar por categoría',area:'en el área visible',zoom:'Acércate primero a una ciudad o zona habitada.',loading:'Buscando en OpenStreetMap…',none:'No se encontraron resultados.',results:'Resultados',type:'Escribe al menos 2 caracteres.'},
  de:{category:'Nach Kategorie suchen',area:'im sichtbaren Bereich',zoom:'Zoome zuerst in eine Stadt oder ein bewohntes Gebiet.',loading:'OpenStreetMap wird durchsucht…',none:'Keine Ergebnisse.',results:'Ergebnisse',type:'Mindestens 2 Zeichen eingeben.'},
  ru:{category:'Поиск по категории',area:'в видимой области',zoom:'Сначала приблизьте город или населённую местность.',loading:'Поиск в OpenStreetMap…',none:'Ничего не найдено.',results:'Результаты',type:'Введите минимум 2 символа.'},
  hi:{category:'श्रेणी के अनुसार खोजें',area:'दिखाई दे रहे क्षेत्र में',zoom:'पहले किसी शहर या आबादी वाले क्षेत्र पर ज़ूम करें।',loading:'OpenStreetMap में खोजा जा रहा है…',none:'कोई परिणाम नहीं मिला।',results:'परिणाम',type:'कम से कम 2 अक्षर लिखें।'},
  pt:{category:'Pesquisar por categoria',area:'na área visível',zoom:'Aproxime primeiro uma cidade ou zona habitada.',loading:'A pesquisar no OpenStreetMap…',none:'Nenhum resultado.',results:'Resultados',type:'Escreva pelo menos 2 caracteres.'},
  zh:{category:'按类别搜索',area:'在当前可见区域',zoom:'请先放大到城市或有人居住的区域。',loading:'正在搜索 OpenStreetMap…',none:'未找到结果。',results:'结果',type:'至少输入 2 个字符。'},
  ja:{category:'カテゴリから検索',area:'表示中のエリア',zoom:'まず都市または居住地域まで拡大してください。',loading:'OpenStreetMap を検索中…',none:'結果が見つかりません。',results:'結果',type:'2文字以上入力してください。'}
};
const t=()=>uiText[currentLanguage()]||uiText.en;

const categories=[
  {id:'restaurant',icon:'🍴',labels:{it:'Ristoranti',en:'Restaurants',fr:'Restaurants',es:'Restaurantes',de:'Restaurants',ru:'Рестораны',hi:'रेस्तराँ',pt:'Restaurantes',zh:'餐厅',ja:'レストラン'},selectors:['nwr["amenity"="restaurant"]'],aliases:['restaurant','restaurants','ristorante','ristoranti','restaurante','restaurantes','ресторан','рестораны','रेस्तराँ','餐厅','レストラン']},
  {id:'hotel',icon:'▣',labels:{it:'Hotel',en:'Hotels',fr:'Hôtels',es:'Hoteles',de:'Hotels',ru:'Отели',hi:'होटल',pt:'Hotéis',zh:'酒店',ja:'ホテル'},selectors:['nwr["tourism"~"hotel|guest_house|hostel|motel"]'],aliases:['hotel','hotels','hôtel','hôtels','hoteles','отель','отели','होटल','酒店','ホテル']},
  {id:'parking',icon:'P',labels:{it:'Parcheggi',en:'Parking',fr:'Parkings',es:'Aparcamientos',de:'Parkplätze',ru:'Парковки',hi:'पार्किंग',pt:'Estacionamentos',zh:'停车场',ja:'駐車場'},selectors:['nwr["amenity"="parking"]'],aliases:['parking','parcheggio','parcheggi','parkplatz','parkplätze','aparcamiento','aparcamientos','парковка','парковки','पार्किंग','停车场','駐車場']},
  {id:'cafe',icon:'☕',labels:{it:'Bar e caffè',en:'Cafés & bars',fr:'Cafés et bars',es:'Cafés y bares',de:'Cafés & Bars',ru:'Кафе и бары',hi:'कैफ़े और बार',pt:'Cafés e bares',zh:'咖啡馆和酒吧',ja:'カフェ・バー'},selectors:['nwr["amenity"~"cafe|bar|pub"]'],aliases:['cafe','caffè','bar','bars','pub','pubs','café','кафе','бар','कैफ़े','咖啡馆','酒吧','カフェ','バー']},
  {id:'supermarket',icon:'□',labels:{it:'Supermercati',en:'Supermarkets',fr:'Supermarchés',es:'Supermercados',de:'Supermärkte',ru:'Супермаркеты',hi:'सुपरमार्केट',pt:'Supermercados',zh:'超市',ja:'スーパー'},selectors:['nwr["shop"="supermarket"]'],aliases:['supermarket','supermarkets','supermercato','supermercati','supermarché','supermercado','supermarkt','супермаркет','सुपरमार्केट','超市','スーパー']},
  {id:'pharmacy',icon:'✚',labels:{it:'Farmacie',en:'Pharmacies',fr:'Pharmacies',es:'Farmacias',de:'Apotheken',ru:'Аптеки',hi:'फ़ार्मेसी',pt:'Farmácias',zh:'药店',ja:'薬局'},selectors:['nwr["amenity"="pharmacy"]'],aliases:['pharmacy','pharmacies','farmacia','farmacie','pharmacie','apotheke','apotheken','аптека','аптеки','फ़ार्मेसी','药店','薬局']},
  {id:'hospital',icon:'H',labels:{it:'Ospedali',en:'Hospitals',fr:'Hôpitaux',es:'Hospitales',de:'Krankenhäuser',ru:'Больницы',hi:'अस्पताल',pt:'Hospitais',zh:'医院',ja:'病院'},selectors:['nwr["amenity"~"hospital|clinic"]'],aliases:['hospital','hospitals','ospedale','ospedali','clinica','cliniche','hôpital','hospitales','krankenhaus','больница','अस्पताल','医院','病院']},
  {id:'fuel',icon:'⛽',labels:{it:'Carburante',en:'Fuel',fr:'Stations-service',es:'Gasolineras',de:'Tankstellen',ru:'Заправки',hi:'ईंधन',pt:'Postos',zh:'加油站',ja:'ガソリンスタンド'},selectors:['nwr["amenity"="fuel"]'],aliases:['fuel','gas station','benzina','distributore','carburante','station-service','gasolinera','tankstelle','заправка','ईंधन','加油站','ガソリンスタンド']},
  {id:'charging',icon:'⚡',labels:{it:'Ricarica EV',en:'EV charging',fr:'Recharge VE',es:'Carga EV',de:'E-Ladestationen',ru:'Зарядки ЭМ',hi:'ईवी चार्जिंग',pt:'Carregamento EV',zh:'电动车充电',ja:'EV充電'},selectors:['nwr["amenity"="charging_station"]'],aliases:['charging station','ev charging','ricarica','colonnina','ladestation','зарядка','ईवी चार्जिंग','充电站','ev充電']},
  {id:'museum',icon:'◇',labels:{it:'Musei',en:'Museums',fr:'Musées',es:'Museos',de:'Museen',ru:'Музеи',hi:'संग्रहालय',pt:'Museus',zh:'博物馆',ja:'博物館'},selectors:['nwr["tourism"="museum"]'],aliases:['museum','museums','museo','musei','musée','musées','museos','museen','музей','музеи','संग्रहालय','博物馆','博物館']},
  {id:'attraction',icon:'◎',labels:{it:'Attrazioni',en:'Attractions',fr:'Attractions',es:'Atracciones',de:'Sehenswürdigkeiten',ru:'Достопримечательности',hi:'आकर्षण',pt:'Atrações',zh:'景点',ja:'観光スポット'},selectors:['nwr["tourism"~"attraction|viewpoint|zoo|theme_park"]'],aliases:['attraction','attractions','attrazione','attrazioni','sehenswürdigkeit','достопримечательность','आकर्षण','景点','観光スポット']},
  {id:'station',icon:'⇆',labels:{it:'Stazioni',en:'Stations',fr:'Gares',es:'Estaciones',de:'Bahnhöfe',ru:'Станции',hi:'स्टेशन',pt:'Estações',zh:'车站',ja:'駅'},selectors:['nwr["railway"="station"]','nwr["public_transport"="station"]'],aliases:['station','stations','stazione','stazioni','gare','gares','estacion','estaciones','bahnhof','станция','स्टेशन','车站','駅']},
  {id:'airport',icon:'✈',labels:{it:'Aeroporti',en:'Airports',fr:'Aéroports',es:'Aeropuertos',de:'Flughäfen',ru:'Аэропорты',hi:'हवाई अड्डे',pt:'Aeroportos',zh:'机场',ja:'空港'},selectors:['nwr["aeroway"="aerodrome"]'],aliases:['airport','airports','aeroporto','aeroporti','aéroport','aeropuerto','flughafen','аэропорт','हवाई अड्डा','机场','空港']},
  {id:'atm',icon:'€',labels:{it:'Bancomat',en:'ATMs',fr:'Distributeurs',es:'Cajeros',de:'Geldautomaten',ru:'Банкоматы',hi:'एटीएम',pt:'Caixas eletrônicos',zh:'ATM',ja:'ATM'},selectors:['nwr["amenity"="atm"]'],aliases:['atm','bancomat','cajero','geldautomat','банкомат','एटीएम']},
  {id:'city',icon:'◆',labels:{it:'Città e paesi',en:'Cities & towns',fr:'Villes',es:'Ciudades',de:'Städte',ru:'Города',hi:'शहर',pt:'Cidades',zh:'城市',ja:'都市'},selectors:['nwr["place"~"city|town|village"]'],aliases:['città','citta','cittadine','paesi','city','cities','town','towns','ville','villes','ciudad','ciudades','stadt','städte','город','города','शहर','城市','都市']},
  {id:'street',icon:'═',labels:{it:'Vie e strade',en:'Streets & roads',fr:'Rues et routes',es:'Calles y carreteras',de:'Straßen',ru:'Улицы и дороги',hi:'सड़कें',pt:'Ruas e estradas',zh:'街道和道路',ja:'道路'},selectors:['way["highway"]["name"]'],aliases:['via','vie','strada','strade','street','streets','road','roads','rue','rues','calle','calles','straße','strassen','улица','дорога','सड़क','街道','道路']}
];
const categoryLabel=category=>category.labels[currentLanguage()]||category.labels.en;

let input=null,status=null,results=null,categoryRow=null;
let searchAbort=null,searchTimer=null,searchSeq=0;
const searchCache=new Map();

async function photonSearch(query,limit=10,layers=[]){
  const map=window.__PV_MAP__,center=map?.getCenter?.(),zoom=map?.getZoom?.();
  const key=JSON.stringify([query,limit,currentLanguage(),layers,center&&[center.lng.toFixed(2),center.lat.toFixed(2)]]);
  if(searchCache.has(key))return searchCache.get(key);
  searchAbort?.abort();searchAbort=new AbortController();
  const url=new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q',query);url.searchParams.set('limit',String(limit));url.searchParams.set('lang',currentLanguage());
  if(center){url.searchParams.set('lat',String(center.lat));url.searchParams.set('lon',String(center.lng));if(Number.isFinite(zoom))url.searchParams.set('zoom',String(Math.max(1,Math.min(18,zoom))))}
  layers.forEach(layer=>url.searchParams.append('layer',layer));
  try{
    let response=await fetch(url,{signal:searchAbort.signal});
    if(!response.ok&&url.searchParams.has('lang')){url.searchParams.delete('lang');response=await fetch(url,{signal:searchAbort.signal})}
    if(!response.ok)throw new Error(`Photon HTTP ${response.status}`);
    const json=await response.json(),rows=json.features||[];searchCache.set(key,rows);if(searchCache.size>60)searchCache.delete(searchCache.keys().next().value);return rows;
  }catch(error){if(error?.name!=='AbortError')console.warn('Perkussus Photon search',error);return[]}
}

const overpassServers=['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
async function overpassSearch(query){
  let lastError=null;
  for(const endpoint of overpassServers){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query),signal:controller.signal});
      clearTimeout(timeout);if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();
    }catch(error){clearTimeout(timeout);lastError=error;console.warn('Perkussus Overpass',endpoint,error)}
  }
  throw lastError||new Error('Overpass unavailable');
}

function distanceMeters(lat1,lon1,lat2,lon2){
  const earth=6371e3,toRad=x=>x*Math.PI/180,p1=toRad(lat1),p2=toRad(lat2),dp=toRad(lat2-lat1),dl=toRad(lon2-lon1),a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*earth*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function searchRadius(zoom,category){
  if(category.id==='city')return zoom>=10?40000:90000;
  if(category.id==='street')return zoom>=15?2500:6500;
  if(zoom>=15)return 2500;
  if(zoom>=13)return 5000;
  if(zoom>=11)return 10000;
  return 20000;
}
function selectorWithRadius(selector,radius,lat,lon){
  const match=String(selector).match(/^(nwr|node|way|relation)(.*)$/);if(!match)return'';
  return `${match[1]}(around:${Math.round(radius)},${lat},${lon})${match[2]};`;
}

function photonName(feature){
  const p=feature.properties||{};return p.name||[p.street,p.housenumber].filter(Boolean).join(' ')||p.city||p.locality||p.country||'Luogo';
}
function photonSubtitle(feature){
  const p=feature.properties||{};return[p.street,p.district,p.city||p.locality,p.state,p.country].filter(Boolean).filter((value,index,array)=>array.indexOf(value)===index).join(' · ');
}
function photonZoom(feature){
  const p=feature.properties||{},value=String(p.osm_value||p.type||'').toLowerCase(),layer=String(p.type||'').toLowerCase();
  if(value==='country'||layer==='country')return 5;
  if(['state','region'].includes(value)||layer==='state')return 7;
  if(['city','town','village','locality'].includes(value)||['city','locality'].includes(layer))return 12;
  if(value==='street'||layer==='street'||p.osm_key==='highway')return 16;
  return 17;
}
function closeSearchSheet(){document.querySelector('#searchSheet [data-close]')?.click()}
function fireClickAt(map,lon,lat){
  try{const point=map.project([lon,lat]);map.fire('click',{lngLat:{lng:lon,lat},point,originalEvent:null})}catch(error){console.warn('Perkussus map result click',error)}
}
function goToPhoton(feature){
  const coordinates=feature.geometry?.coordinates,map=window.__PV_MAP__;if(!map||!Array.isArray(coordinates))return;
  const lon=Number(coordinates[0]),lat=Number(coordinates[1]);closeSearchSheet();map.flyTo({center:[lon,lat],zoom:photonZoom(feature),duration:1200,essential:true});map.once('moveend',()=>setTimeout(()=>fireClickAt(map,lon,lat),250));
}

function renderPhoton(rows){
  results.innerHTML='';
  if(!rows.length){results.innerHTML=`<div class="pv-empty">${escapeHtml(t().none)}</div>`;return}
  results.innerHTML=`<div class="pv-results-head">${escapeHtml(t().results)}</div>`;
  rows.slice(0,20).forEach(feature=>{
    const button=document.createElement('button');button.type='button';button.className='pv-result';
    button.innerHTML=`<span class="pv-result-icon">⌖</span><span class="pv-result-copy"><b>${escapeHtml(photonName(feature))}</b><small>${escapeHtml(photonSubtitle(feature)||[feature.properties?.osm_value,feature.properties?.osm_key].filter(Boolean).join(' · '))}</small></span>`;
    button.addEventListener('click',()=>goToPhoton(feature));results.append(button);
  });
}

function goToOsm(row){
  const map=window.__PV_MAP__;if(!map)return;closeSearchSheet();const zoom=row.category.id==='city'?12:row.category.id==='street'?16:17;
  map.flyTo({center:[row.lon,row.lat],zoom,duration:1200,essential:true});map.once('moveend',()=>setTimeout(()=>fireClickAt(map,row.lon,row.lat),250));
}
function renderOsm(rows){
  results.innerHTML='';
  if(!rows.length){results.innerHTML=`<div class="pv-empty">${escapeHtml(t().none)}</div>`;return}
  results.innerHTML=`<div class="pv-results-head">${escapeHtml(t().results)}</div>`;
  rows.slice(0,30).forEach(row=>{
    const button=document.createElement('button');button.type='button';button.className='pv-result';const name=row.name||categoryLabel(row.category),sub=[categoryLabel(row.category),row.tags['addr:street'],row.tags['addr:city'],`${Math.round(row.distance)} m`].filter(Boolean).join(' · ');
    button.innerHTML=`<span class="pv-result-icon">${escapeHtml(row.category.icon)}</span><span class="pv-result-copy"><b>${escapeHtml(name)}</b><small>${escapeHtml(sub)}</small></span>`;
    button.addEventListener('click',()=>goToOsm(row));results.append(button);
  });
}

async function searchCategory(category,centerOverride=null){
  const map=window.__PV_MAP__;if(!map)return;const zoom=map.getZoom(),center=centerOverride||map.getCenter();
  if(!centerOverride&&zoom<8){status.textContent=t().zoom;return}
  status.textContent=`${t().loading} ${categoryLabel(category)} ${t().area}`;
  const radius=centerOverride?9000:searchRadius(zoom,category),selectors=category.selectors.map(selector=>selectorWithRadius(selector,radius,center.lat,center.lng)).join('');
  const query=`[out:json][timeout:14];(${selectors});out center tags 60;`;
  try{
    const json=await overpassSearch(query),seen=new Set(),rows=[];
    for(const element of json.elements||[]){
      const lat=Number(element.lat??element.center?.lat),lon=Number(element.lon??element.center?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      const tags=element.tags||{},name=tags[`name:${currentLanguage()}`]||tags.name||'',key=category.id==='street'&&name?`street:${normalize(name)}`:`${element.type}:${element.id}`;if(seen.has(key))continue;seen.add(key);
      rows.push({lat,lon,name,tags,category,type:element.type,id:element.id,distance:distanceMeters(center.lat,center.lng,lat,lon)});
    }
    rows.sort((a,b)=>a.distance-b.distance);status.textContent=rows.length?`${rows.length} · ${categoryLabel(category)} ${t().area}`:t().none;renderOsm(rows);
  }catch(error){console.warn('Perkussus category search',error);status.textContent=t().none;renderOsm([])}
}

function parseCategoryQuery(query){
  const normalized=normalize(query);
  for(const category of categories){
    const aliases=[categoryLabel(category),...category.aliases].map(normalize).sort((a,b)=>b.length-a.length);
    for(const alias of aliases){
      if(normalized===alias)return{category,place:''};
      if(normalized.startsWith(alias+' '))return{category,place:query.trim().slice(alias.length).trim()};
      if(normalized.endsWith(' '+alias))return{category,place:query.trim().slice(0,query.trim().length-alias.length).trim()};
    }
  }
  return null;
}
async function submitSearch(query){
  const parsed=parseCategoryQuery(query);
  if(parsed){
    if(parsed.place){
      status.textContent=t().loading;const places=await photonSearch(parsed.place,5,['city','locality','district','county','state','country']);
      if(!places.length){status.textContent=t().none;return}
      const coordinates=places[0].geometry.coordinates;return searchCategory(parsed.category,{lng:Number(coordinates[0]),lat:Number(coordinates[1])});
    }
    return searchCategory(parsed.category);
  }
  status.textContent=t().loading;const rows=await photonSearch(query,14);status.textContent=rows.length?`${rows.length} ${t().results.toLocaleLowerCase()}`:t().none;renderPhoton(rows);
}

function autocomplete(){
  clearTimeout(searchTimer);const query=input.value.trim(),localSeq=++searchSeq;
  if(query.length<2){results.innerHTML='';status.textContent=query?t().type:'';return}
  searchTimer=setTimeout(async()=>{const rows=await photonSearch(query,9);if(localSeq!==searchSeq)return;status.textContent='';renderPhoton(rows)},360);
}

function refreshLanguage(){
  const head=document.querySelector('.pv-category-head');if(head)head.innerHTML=`<b>${escapeHtml(t().category)}</b><small>${escapeHtml(t().area)}</small>`;
  categoryRow?.querySelectorAll('[data-pv-category]').forEach(button=>{const category=categories.find(item=>item.id===button.dataset.pvCategory);if(category)button.innerHTML=`<span>${escapeHtml(category.icon)}</span>${escapeHtml(categoryLabel(category))}`});
}

function init(){
  document.querySelectorAll('.pv-category-wrap,.pv-search-results').forEach(node=>node.remove());
  const oldForm=document.querySelector('#searchForm');if(!oldForm)return;const cleanForm=oldForm.cloneNode(true);oldForm.replaceWith(cleanForm);
  input=cleanForm.querySelector('#searchInput');status=document.querySelector('#searchStatus');
  const wrap=document.createElement('div');wrap.className='pv-category-wrap';wrap.innerHTML=`<div class="pv-category-head"><b>${escapeHtml(t().category)}</b><small>${escapeHtml(t().area)}</small></div><div class="pv-categories"></div>`;categoryRow=wrap.querySelector('.pv-categories');
  categories.forEach(category=>{const button=document.createElement('button');button.type='button';button.className='pv-cat';button.dataset.pvCategory=category.id;button.innerHTML=`<span>${escapeHtml(category.icon)}</span>${escapeHtml(categoryLabel(category))}`;button.addEventListener('click',()=>searchCategory(category));categoryRow.append(button)});
  results=document.createElement('div');results.className='pv-search-results';status.after(wrap);wrap.after(results);
  input.addEventListener('input',autocomplete);input.addEventListener('keydown',event=>{if(event.key==='Escape'){results.innerHTML='';status.textContent=''}});
  document.addEventListener('submit',event=>{if(event.target?.id!=='searchForm')return;event.preventDefault();event.stopImmediatePropagation();const query=document.querySelector('#searchInput')?.value.trim();if(query)submitSearch(query)},{capture:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-language]'))setTimeout(refreshLanguage,40)},{capture:true});
}

init();
