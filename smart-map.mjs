const MAPLIBRE_URLS=[
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs',
  'https://unpkg.com/maplibre-gl@6.9.0/dist/maplibre-gl.mjs'
];

let maplibre=null;
for(const url of MAPLIBRE_URLS){
  try{maplibre=await import(url);break}catch(err){console.warn('Perkussus smart-map: MapLibre import failed',url,err)}
}
if(!maplibre?.Map)throw new Error('Perkussus smart-map: MapLibre non disponibile');

try{Object.defineProperty(window,'__PV_MAP_ZOOM__',{configurable:true,get:()=>99,set:()=>{}})}catch{}

const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=value=>{try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const text={
  it:{categories:'Cerca per categoria',area:'nell’area visibile',zoom:'Avvicinati prima a una città o a una zona abitata.',loading:'Cerco nei dati OpenStreetMap…',none:'Nessun risultato trovato.',results:'Risultati',picked:'ELEMENTO REALE SELEZIONATO',coords:'Coordinate',category:'Categoria',address:'Indirizzo',source:'Fonte verificata',sourceText:'Dati geografici: OpenStreetMap. Identificazione: dati vettoriali della mappa + reverse geocoding.',website:'Sito ufficiale ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'Telefono',hours:'Orari',cuisine:'Cucina',searching:'Ricerca…',typeMore:'Scrivi almeno 2 caratteri.',noRandom:'Tocca un nome, una strada o un punto d’interesse visibile sulla mappa.'},
  en:{categories:'Search by category',area:'in the visible area',zoom:'Zoom into a city or populated area first.',loading:'Searching OpenStreetMap data…',none:'No results found.',results:'Results',picked:'SELECTED REAL-WORLD FEATURE',coords:'Coordinates',category:'Category',address:'Address',source:'Verified source',sourceText:'Geographic data: OpenStreetMap. Identification: rendered vector-map data + reverse geocoding.',website:'Official website ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'Phone',hours:'Opening hours',cuisine:'Cuisine',searching:'Searching…',typeMore:'Type at least 2 characters.',noRandom:'Tap a visible name, road or point of interest on the map.'},
  fr:{categories:'Rechercher par catégorie',area:'dans la zone visible',zoom:'Zoomez d’abord sur une ville ou une zone habitée.',loading:'Recherche dans OpenStreetMap…',none:'Aucun résultat trouvé.',results:'Résultats',picked:'ÉLÉMENT RÉEL SÉLECTIONNÉ',coords:'Coordonnées',category:'Catégorie',address:'Adresse',source:'Source vérifiée',sourceText:'Données géographiques : OpenStreetMap. Identification : données vectorielles visibles + géocodage inverse.',website:'Site officiel ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipédia ↗',phone:'Téléphone',hours:'Horaires',cuisine:'Cuisine',searching:'Recherche…',typeMore:'Saisissez au moins 2 caractères.',noRandom:'Touchez un nom, une route ou un point d’intérêt visible.'},
  es:{categories:'Buscar por categoría',area:'en el área visible',zoom:'Acércate primero a una ciudad o zona habitada.',loading:'Buscando en OpenStreetMap…',none:'No se encontraron resultados.',results:'Resultados',picked:'ELEMENTO REAL SELECCIONADO',coords:'Coordenadas',category:'Categoría',address:'Dirección',source:'Fuente verificada',sourceText:'Datos geográficos: OpenStreetMap. Identificación: datos vectoriales visibles + geocodificación inversa.',website:'Sitio oficial ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'Teléfono',hours:'Horario',cuisine:'Cocina',searching:'Buscando…',typeMore:'Escribe al menos 2 caracteres.',noRandom:'Toca un nombre, una carretera o un punto de interés visible.'},
  de:{categories:'Nach Kategorie suchen',area:'im sichtbaren Bereich',zoom:'Zoome zuerst in eine Stadt oder ein bewohntes Gebiet.',loading:'OpenStreetMap wird durchsucht…',none:'Keine Ergebnisse gefunden.',results:'Ergebnisse',picked:'AUSGEWÄHLTES REALES OBJEKT',coords:'Koordinaten',category:'Kategorie',address:'Adresse',source:'Verifizierte Quelle',sourceText:'Geodaten: OpenStreetMap. Identifikation: sichtbare Vektordaten + Reverse-Geocoding.',website:'Offizielle Website ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'Telefon',hours:'Öffnungszeiten',cuisine:'Küche',searching:'Suche…',typeMore:'Mindestens 2 Zeichen eingeben.',noRandom:'Tippe auf einen sichtbaren Namen, eine Straße oder einen POI.'},
  ru:{categories:'Поиск по категории',area:'в видимой области',zoom:'Сначала приблизьте город или населённую местность.',loading:'Поиск в OpenStreetMap…',none:'Ничего не найдено.',results:'Результаты',picked:'ВЫБРАННЫЙ РЕАЛЬНЫЙ ОБЪЕКТ',coords:'Координаты',category:'Категория',address:'Адрес',source:'Проверенный источник',sourceText:'Геоданные: OpenStreetMap. Идентификация: видимые векторные данные + обратное геокодирование.',website:'Официальный сайт ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'Телефон',hours:'Часы работы',cuisine:'Кухня',searching:'Поиск…',typeMore:'Введите минимум 2 символа.',noRandom:'Нажмите на видимое название, дорогу или объект.'},
  hi:{categories:'श्रेणी के अनुसार खोजें',area:'दिखाई दे रहे क्षेत्र में',zoom:'पहले किसी शहर या आबादी वाले क्षेत्र पर ज़ूम करें।',loading:'OpenStreetMap में खोजा जा रहा है…',none:'कोई परिणाम नहीं मिला।',results:'परिणाम',picked:'चुना गया वास्तविक स्थान',coords:'निर्देशांक',category:'श्रेणी',address:'पता',source:'सत्यापित स्रोत',sourceText:'भौगोलिक डेटा: OpenStreetMap। पहचान: दिखाई देने वाला वेक्टर डेटा + रिवर्स जियोकोडिंग।',website:'आधिकारिक वेबसाइट ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'फ़ोन',hours:'समय',cuisine:'खान-पान',searching:'खोज…',typeMore:'कम से कम 2 अक्षर लिखें।',noRandom:'मानचित्र पर दिखाई देने वाला नाम, सड़क या स्थान टैप करें।'},
  pt:{categories:'Pesquisar por categoria',area:'na área visível',zoom:'Aproxime primeiro uma cidade ou zona habitada.',loading:'A pesquisar no OpenStreetMap…',none:'Nenhum resultado encontrado.',results:'Resultados',picked:'ELEMENTO REAL SELECIONADO',coords:'Coordenadas',category:'Categoria',address:'Endereço',source:'Fonte verificada',sourceText:'Dados geográficos: OpenStreetMap. Identificação: dados vetoriais visíveis + geocodificação inversa.',website:'Site oficial ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'Telefone',hours:'Horário',cuisine:'Cozinha',searching:'A pesquisar…',typeMore:'Escreva pelo menos 2 caracteres.',noRandom:'Toque num nome, estrada ou ponto de interesse visível.'},
  zh:{categories:'按类别搜索',area:'在当前可见区域',zoom:'请先放大到城市或有人居住的区域。',loading:'正在搜索 OpenStreetMap…',none:'未找到结果。',results:'结果',picked:'已选择的真实地点',coords:'坐标',category:'类别',address:'地址',source:'已验证来源',sourceText:'地理数据：OpenStreetMap。识别方式：可见矢量地图数据 + 反向地理编码。',website:'官方网站 ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'电话',hours:'营业时间',cuisine:'菜系',searching:'搜索中…',typeMore:'至少输入 2 个字符。',noRandom:'点击地图上可见的名称、道路或兴趣点。'},
  ja:{categories:'カテゴリから検索',area:'表示中のエリア',zoom:'まず都市または居住地域まで拡大してください。',loading:'OpenStreetMap を検索中…',none:'結果が見つかりません。',results:'結果',picked:'選択した実在の場所',coords:'座標',category:'カテゴリ',address:'住所',source:'検証済みソース',sourceText:'地理データ: OpenStreetMap。識別: 表示中のベクターデータ + リバースジオコーディング。',website:'公式サイト ↗',osm:'OpenStreetMap ↗',street:'Street View ↗',wiki:'Wikipedia ↗',phone:'電話',hours:'営業時間',cuisine:'料理',searching:'検索中…',typeMore:'2文字以上入力してください。',noRandom:'地図上に見えている名称、道路、POIをタップしてください。'}
};
const tr=()=>text[lang()]||text.en;

const categories=[
  {id:'restaurant',icon:'🍴',labels:{it:'Ristoranti',en:'Restaurants',fr:'Restaurants',es:'Restaurantes',de:'Restaurants',ru:'Рестораны',hi:'रेस्तराँ',pt:'Restaurantes',zh:'餐厅',ja:'レストラン'},selectors:['nwr["amenity"="restaurant"]'],keywords:['restaurant','restaurants','ristorante','ristoranti','restaurante','restaurantes','ресторан','рестораны','रेस्तराँ','餐厅','レストラン']},
  {id:'hotel',icon:'▣',labels:{it:'Hotel',en:'Hotels',fr:'Hôtels',es:'Hoteles',de:'Hotels',ru:'Отели',hi:'होटल',pt:'Hotéis',zh:'酒店',ja:'ホテル'},selectors:['nwr["tourism"~"hotel|guest_house|hostel|motel"]'],keywords:['hotel','hotels','hôtel','hôtels','hoteles','отель','отели','होटल','酒店','ホテル']},
  {id:'parking',icon:'P',labels:{it:'Parcheggi',en:'Parking',fr:'Parkings',es:'Aparcamientos',de:'Parkplätze',ru:'Парковки',hi:'पार्किंग',pt:'Estacionamentos',zh:'停车场',ja:'駐車場'},selectors:['nwr["amenity"="parking"]'],keywords:['parking','parcheggio','parcheggi','parkplatz','parkplätze','aparcamiento','aparcamientos','парковка','парковки','पार्किंग','停车场','駐車場']},
  {id:'cafe',icon:'☕',labels:{it:'Bar e caffè',en:'Cafés & bars',fr:'Cafés et bars',es:'Cafés y bares',de:'Cafés & Bars',ru:'Кафе и бары',hi:'कैफ़े और बार',pt:'Cafés e bares',zh:'咖啡馆和酒吧',ja:'カフェ・バー'},selectors:['nwr["amenity"~"cafe|bar|pub"]'],keywords:['cafe','caffè','bar','bars','pub','pubs','café','кафе','бар','कैफ़े','咖啡馆','酒吧','カフェ','バー']},
  {id:'supermarket',icon:'□',labels:{it:'Supermercati',en:'Supermarkets',fr:'Supermarchés',es:'Supermercados',de:'Supermärkte',ru:'Супермаркеты',hi:'सुपरमार्केट',pt:'Supermercados',zh:'超市',ja:'スーパー'},selectors:['nwr["shop"="supermarket"]'],keywords:['supermarket','supermarkets','supermercato','supermercati','supermarché','supermarchés','supermercado','supermercados','supermarkt','supermärkte','супермаркет','सुपरमार्केट','超市','スーパー']},
  {id:'pharmacy',icon:'✚',labels:{it:'Farmacie',en:'Pharmacies',fr:'Pharmacies',es:'Farmacias',de:'Apotheken',ru:'Аптеки',hi:'फ़ार्मेसी',pt:'Farmácias',zh:'药店',ja:'薬局'},selectors:['nwr["amenity"="pharmacy"]'],keywords:['pharmacy','pharmacies','farmacia','farmacie','pharmacie','apotheke','apotheken','аптека','аптеки','फ़ार्मेसी','药店','薬局']},
  {id:'hospital',icon:'H',labels:{it:'Ospedali',en:'Hospitals',fr:'Hôpitaux',es:'Hospitales',de:'Krankenhäuser',ru:'Больницы',hi:'अस्पताल',pt:'Hospitais',zh:'医院',ja:'病院'},selectors:['nwr["amenity"~"hospital|clinic"]'],keywords:['hospital','hospitals','ospedale','ospedali','clinica','cliniche','hôpital','hospitales','krankenhaus','krankenhäuser','больница','अस्पताल','医院','病院']},
  {id:'fuel',icon:'⛽',labels:{it:'Carburante',en:'Fuel',fr:'Stations-service',es:'Gasolineras',de:'Tankstellen',ru:'Заправки',hi:'ईंधन',pt:'Postos',zh:'加油站',ja:'ガソリンスタンド'},selectors:['nwr["amenity"="fuel"]'],keywords:['fuel','gas station','benzina','distributore','carburante','station-service','gasolinera','tankstelle','заправка','ईंधन','加油站','ガソリンスタンド']},
  {id:'charging',icon:'⚡',labels:{it:'Ricarica EV',en:'EV charging',fr:'Recharge VE',es:'Carga EV',de:'E-Ladestationen',ru:'Зарядки ЭМ',hi:'ईवी चार्जिंग',pt:'Carregamento EV',zh:'电动车充电',ja:'EV充電'},selectors:['nwr["amenity"="charging_station"]'],keywords:['charging station','ev charging','ricarica','colonnina','ladestation','зарядка','ईवी चार्जिंग','充电站','ev充電']},
  {id:'museum',icon:'◇',labels:{it:'Musei',en:'Museums',fr:'Musées',es:'Museos',de:'Museen',ru:'Музеи',hi:'संग्रहालय',pt:'Museus',zh:'博物馆',ja:'博物館'},selectors:['nwr["tourism"="museum"]'],keywords:['museum','museums','museo','musei','musée','musées','museos','museen','музей','музеи','संग्रहालय','博物馆','博物館']},
  {id:'attraction',icon:'◎',labels:{it:'Attrazioni',en:'Attractions',fr:'Attractions',es:'Atracciones',de:'Sehenswürdigkeiten',ru:'Достопримечательности',hi:'आकर्षण',pt:'Atrações',zh:'景点',ja:'観光スポット'},selectors:['nwr["tourism"~"attraction|viewpoint|zoo|theme_park"]'],keywords:['attraction','attractions','attrazione','attrazioni','sehenswürdigkeit','достопримечательность','आकर्षण','景点','観光スポット']},
  {id:'station',icon:'⇆',labels:{it:'Stazioni',en:'Stations',fr:'Gares',es:'Estaciones',de:'Bahnhöfe',ru:'Станции',hi:'स्टेशन',pt:'Estações',zh:'车站',ja:'駅'},selectors:['nwr["railway"="station"]','nwr["public_transport"="station"]'],keywords:['station','stations','stazione','stazioni','gare','gares','estacion','estaciones','bahnhof','bahnhöfe','станция','स्टेशन','车站','駅']},
  {id:'airport',icon:'✈',labels:{it:'Aeroporti',en:'Airports',fr:'Aéroports',es:'Aeropuertos',de:'Flughäfen',ru:'Аэропорты',hi:'हवाई अड्डे',pt:'Aeroportos',zh:'机场',ja:'空港'},selectors:['nwr["aeroway"="aerodrome"]'],keywords:['airport','airports','aeroporto','aeroporti','aéroport','aeropuerto','flughafen','flughäfen','аэропорт','हवाई अड्डा','机场','空港']},
  {id:'atm',icon:'€',labels:{it:'Bancomat',en:'ATMs',fr:'Distributeurs',es:'Cajeros',de:'Geldautomaten',ru:'Банкоматы',hi:'एटीएम',pt:'Caixas eletrônicos',zh:'ATM',ja:'ATM'},selectors:['nwr["amenity"="atm"]'],keywords:['atm','bancomat','cajero','geldautomat','банкомат','एटीएम']},
  {id:'city',icon:'◆',labels:{it:'Città e paesi',en:'Cities & towns',fr:'Villes',es:'Ciudades',de:'Städte',ru:'Города',hi:'शहर',pt:'Cidades',zh:'城市',ja:'都市'},selectors:['nwr["place"~"city|town|village"]'],keywords:['città','citta','cittadine','paesi','city','cities','town','towns','ville','villes','ciudad','ciudades','stadt','städte','город','города','शहर','城市','都市']},
  {id:'street',icon:'═',labels:{it:'Vie e strade',en:'Streets & roads',fr:'Rues et routes',es:'Calles y carreteras',de:'Straßen',ru:'Улицы и дороги',hi:'सड़कें',pt:'Ruas e estradas',zh:'街道和道路',ja:'道路'},selectors:['way["highway"]["name"]'],keywords:['via','vie','strada','strade','street','streets','road','roads','rue','rues','calle','calles','straße','strassen','улица','дорога','सड़क','街道','道路']}
];
const categoryLabel=cat=>cat.labels[lang()]||cat.labels.en;

function localizedName(p={}){
  const l=lang();
  return p[`name:${l}`]||p[`name_${l}`]||p.name||p['name:latin']||p.name_en||'';
}

function featureSourceLayer(f){return String(f?.sourceLayer||f?.layer?.['source-layer']||'').toLowerCase()}
function featureLayerId(f){return String(f?.layer?.id||'').toLowerCase()}
function featureRawType(f){
  const p=f?.properties||{};
  return String(p.subclass||p.class||p.amenity||p.tourism||p.shop||p.place||p.railway||p.aeroway||'').toLowerCase();
}
function classifyFeature(f){
  const p=f?.properties||{},sl=featureSourceLayer(f),id=featureLayerId(f),raw=featureRawType(f),l=lang();
  const names={
    restaurant:{it:'Ristorante',en:'Restaurant'},hotel:{it:'Hotel',en:'Hotel'},guest_house:{it:'Affittacamere',en:'Guest house'},hostel:{it:'Ostello',en:'Hostel'},motel:{it:'Motel',en:'Motel'},
    cafe:{it:'Caffè',en:'Café'},bar:{it:'Bar',en:'Bar'},pub:{it:'Pub',en:'Pub'},pharmacy:{it:'Farmacia',en:'Pharmacy'},parking:{it:'Parcheggio',en:'Parking'},museum:{it:'Museo',en:'Museum'},hospital:{it:'Ospedale',en:'Hospital'},clinic:{it:'Clinica',en:'Clinic'},fuel:{it:'Distributore di carburante',en:'Fuel station'},supermarket:{it:'Supermercato',en:'Supermarket'},atm:{it:'Bancomat',en:'ATM'},charging_station:{it:'Stazione di ricarica EV',en:'EV charging station'},attraction:{it:'Attrazione',en:'Attraction'},viewpoint:{it:'Punto panoramico',en:'Viewpoint'},station:{it:'Stazione',en:'Station'},aerodrome:{it:'Aeroporto',en:'Airport'}
  };
  if(names[raw])return names[raw][l]||names[raw].en;
  if(sl==='transportation_name'||sl==='transportation'||/(road|street|highway)/.test(id))return l==='it'?'Via / strada':'Street / road';
  if(sl==='place'){
    const place=String(p.class||p.place||raw).toLowerCase();
    if(place==='country')return l==='it'?'Paese':'Country';
    if(place==='city')return l==='it'?'Città':'City';
    if(place==='town')return l==='it'?'Cittadina':'Town';
    if(place==='village')return l==='it'?'Paese / villaggio':'Village';
    return l==='it'?'Località':'Place';
  }
  if(sl==='building')return l==='it'?'Edificio':'Building';
  if(sl==='poi')return l==='it'?'Punto di interesse':'Point of interest';
  if(sl.includes('park'))return l==='it'?'Parco / area verde':'Park / green area';
  if(sl.includes('water'))return l==='it'?'Elemento idrografico':'Water feature';
  if(sl.includes('mountain'))return l==='it'?'Rilievo / montagna':'Mountain / peak';
  return l==='it'?'Luogo':'Place';
}

function featureScore(f,zoom){
  const p=f?.properties||{},sl=featureSourceLayer(f),id=featureLayerId(f),name=localizedName(p),type=f?.layer?.type||'';
  if(id.includes('quake')||sl==='quakes'||type==='raster'||type==='hillshade')return-1;
  if(/landcover|landuse|boundary/.test(sl))return-1;
  if(sl==='place'&&name)return180;
  if(sl==='poi'&&name)return175;
  if(sl==='transportation_name'&&name)return170;
  if((sl==='water_name'||sl==='waterway'||sl==='mountain_peak'||sl==='park'||sl==='aerodrome_label')&&name)return165;
  if(type==='symbol'&&name)return160;
  if(sl==='transportation'&&zoom>=14)return name?150:115;
  if(sl==='building'&&zoom>=16)return name?145:105;
  if(name&&zoom>=11)return135;
  return-1;
}

function pickFeature(map,e){
  if(!map||!e?.point)return null;
  let features=[];
  try{
    const radius=matchMedia('(pointer:coarse)').matches?22:14,p=e.point;
    features=map.queryRenderedFeatures([[p.x-radius,p.y-radius],[p.x+radius,p.y+radius]])||[];
  }catch{return null}
  const zoom=map.getZoom?.()??0;
  let best=null,bestScore=-1;
  for(const f of features){const score=featureScore(f,zoom);if(score>bestScore){best=f;bestScore=score}}
  return bestScore>=0?best:null;
}

function featureLngLat(feature,fallback){
  const g=feature?.geometry;
  if(g?.type==='Point'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2)return{lng:Number(g.coordinates[0]),lat:Number(g.coordinates[1])};
  return{lng:Number(fallback.lng),lat:Number(fallback.lat)};
}

let reverseQueue=Promise.resolve(),lastReverse=0,infoSeq=0;
function reverseJson(url){
  reverseQueue=reverseQueue.then(async()=>{
    const wait=Math.max(0,1050-(Date.now()-lastReverse));if(wait)await sleep(wait);lastReverse=Date.now();
    const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Reverse geocoder HTTP ${r.status}`);return r.json();
  });
  return reverseQueue;
}
async function reverseAt(lat,lon,zoom=18){
  try{return await reverseJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=${zoom}&addressdetails=1&extratags=1&namedetails=1&accept-language=${encodeURIComponent(lang())}`)}catch(err){console.warn('Perkussus reverse geocoder',err);return null}
}

async function wikiSummary(title){
  if(!title)return null;
  const l=lang();
  try{
    const u=`https://${l}.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|pageprops&exintro=1&explaintext=1&pithumbsize=400&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const r=await fetch(u);if(!r.ok)return null;const j=await r.json();const p=Object.values(j?.query?.pages||{})[0];if(!p||p.missing!==undefined)return null;
    return{title:p.title,extract:p.extract||'',thumb:p.thumbnail?.source||'',qid:p.pageprops?.wikibase_item||'',url:`https://${l}.wikipedia.org/wiki/${encodeURIComponent(p.title.replaceAll(' ','_'))}`};
  }catch{return null}
}
async function wikidataOfficial(qid){
  if(!qid)return'';
  try{const r=await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`);if(!r.ok)return'';const j=await r.json(),e=j?.entities?.[qid];const c=e?.claims?.P856?.find(x=>x.rank==='preferred')||e?.claims?.P856?.[0];return safeUrl(c?.mainsnak?.datavalue?.value||'')}catch{return''}
}

let smartInfoOpen=false;
function closeSmartInfo(){
  if(!smartInfoOpen)return;
  const sheet=document.querySelector('#infoSheet'),scrim=document.querySelector('#scrim');
  sheet?.classList.remove('open');sheet?.setAttribute('aria-hidden','true');scrim?.classList.remove('open');smartInfoOpen=false;
}
function openSmartInfo(){
  const info=document.querySelector('#infoSheet'),scrim=document.querySelector('#scrim');if(!info)return;
  document.querySelectorAll('.sheet.open').forEach(s=>{if(s!==info){s.classList.remove('open');s.setAttribute('aria-hidden','true')}});
  info.classList.add('open');info.setAttribute('aria-hidden','false');scrim?.classList.add('open');smartInfoOpen=true;
}
function action(label,url,primary=false){const u=safeUrl(url);return u?`<a class="link-btn${primary?' primary-link':''}" target="_blank" rel="noopener" href="${esc(u)}">${esc(label)}</a>`:''}

function osmObjectUrl(obj,lat,lon){
  if(obj?.type&&obj?.id){const t={node:'node',way:'way',relation:'relation',N:'node',W:'way',R:'relation'}[obj.type];if(t)return`https://www.openstreetmap.org/${t}/${obj.id}`}
  return`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
}
function wikipediaFromTag(tag){
  if(!tag)return'';const s=String(tag),i=s.indexOf(':');if(i<1)return'';const l=s.slice(0,i),title=s.slice(i+1);return`https://${l}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ','_'))}`;
}

async function showFeatureInfo(map,feature,lngLat,seed={}){
  const seq=++infoSeq,ll=featureLngLat(feature,lngLat),lat=Number(ll.lat),lon=Number(ll.lng),p={...(feature?.properties||{}),...(seed.tags||{})};
  const initialName=seed.name||localizedName(p)||classifyFeature(feature);
  const kicker=document.querySelector('#infoKicker'),titleEl=document.querySelector('#infoTitle'),body=document.querySelector('#infoBody');if(!body)return;
  kicker.textContent=tr().picked;titleEl.textContent=initialName;body.innerHTML=`<div class="loading-row">${esc(tr().loading)}</div>`;openSmartInfo();

  const sl=featureSourceLayer(feature),raw=featureRawType(feature),placeLike=sl==='place'||['city','town','village','country'].includes(raw),zoom=placeLike?10:18;
  const reverse=await reverseAt(lat,lon,zoom);if(seq!==infoSeq)return;
  const addr=reverse?.address||{},extra={...(reverse?.extratags||{}),...p,...(seed.tags||{})};
  const address=[addr.house_number&&addr.road?`${addr.road} ${addr.house_number}`:addr.road,addr.neighbourhood||addr.suburb,addr.city||addr.town||addr.village||addr.municipality,addr.state,addr.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
  const title=seed.name||localizedName(p)||reverse?.name||addr.road||addr.city||addr.town||addr.village||initialName;
  const category=seed.category||classifyFeature({...(feature||{}),properties:extra});
  const qid=extra.wikidata||'';
  let wikiUrl=wikipediaFromTag(extra.wikipedia),wiki=null;
  const canWiki=placeLike||/museum|attraction|viewpoint|park|mountain|peak|monument/i.test(`${sl} ${raw} ${category}`);
  if(canWiki){wiki=await wikiSummary(title);if(seq!==infoSeq)return;if(wiki?.url)wikiUrl=wiki.url}
  let official=safeUrl(extra.website||extra['contact:website']||extra.url||'');
  if(!official&&qid)official=await wikidataOfficial(qid);if(seq!==infoSeq)return;
  const phone=extra.phone||extra['contact:phone']||'',hours=extra.opening_hours||'',cuisine=extra.cuisine||'',streetView=`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
  const osm=osmObjectUrl(seed.osm||((reverse?.osm_type&&reverse?.osm_id)?{type:reverse.osm_type,id:reverse.osm_id}:null),lat,lon),wikidata=qid?`https://www.wikidata.org/wiki/${qid}`:'';
  const thumb=wiki?.thumb?`<img class="info-thumb" src="${esc(safeUrl(wiki.thumb))}" alt="">`:'';
  const details=[phone&&`<div class="source-card"><b>${esc(tr().phone)}</b><span>${esc(phone)}</span></div>`,hours&&`<div class="source-card"><b>${esc(tr().hours)}</b><span>${esc(hours)}</span></div>`,cuisine&&`<div class="source-card"><b>${esc(tr().cuisine)}</b><span>${esc(cuisine.replaceAll(';',', '))}</span></div>`].filter(Boolean).join('');
  const extract=wiki?.extract?`<div class="source-card"><b>${esc(wiki.title)}</b><span class="wiki-text">${esc(wiki.extract.slice(0,900))}</span></div>`:'';
  titleEl.textContent=title;
  body.innerHTML=`
    <div class="info-hero">${thumb}<div class="info-copy"><h3>${esc(title)}</h3><p>${esc(category)}${address?` · ${esc(address)}`:''}</p></div></div>
    <div class="info-grid"><div class="info-metric"><small>${esc(tr().category)}</small><b>${esc(category)}</b></div><div class="info-metric"><small>${esc(tr().coords)}</small><b>${lat.toFixed(5)}, ${lon.toFixed(5)}</b></div></div>
    ${address?`<div class="source-card"><b>${esc(tr().address)}</b><span>${esc(address)}</span></div>`:''}
    ${details}${extract}
    <div class="info-actions">${action(tr().website,official,true)}${action(tr().wiki,wikiUrl,false)}${action(tr().osm,osm,false)}${action(tr().street,streetView,false)}${action('Wikidata ↗',wikidata,false)}</div>
    <div class="source-card"><b class="ok">${esc(tr().source)}</b><span>${esc(tr().sourceText)}</span></div>`;
}

let mapListeners=new WeakSet();
function ensureMapListeners(map){
  if(mapListeners.has(map))return;mapListeners.add(map);window.__PV_MAP__=map;
  try{nativeOn.call(map,'dragstart',()=>closeSmartInfo());nativeOn.call(map,'zoomstart',()=>closeSmartInfo())}catch{}
}

const MapClass=maplibre.Map;
const nativeOn=MapClass.prototype.on;
MapClass.prototype.on=function(type,targetOrListener,listener){
  window.__PV_MAP__=this;ensureMapListeners(this);
  if(type==='click'&&typeof targetOrListener==='function'&&listener===undefined){
    const appListener=targetOrListener;
    const wrapped=e=>{
      try{
        if(this.getLayer?.('quakes')){const q=this.queryRenderedFeatures(e.point,{layers:['quakes']});if(q?.length)return appListener.call(this,e)}
      }catch{}
      const picked=pickFeature(this,e);if(!picked)return;
      showFeatureInfo(this,picked,e.lngLat).catch(err=>console.warn('Perkussus feature info',err));
    };
    return nativeOn.call(this,type,wrapped);
  }
  return nativeOn.apply(this,arguments);
};

const photonCache=new Map();
let photonController=null;
async function photonSearch(query,limit=10,opts={}){
  const q=String(query||'').trim();if(!q)return[];
  const map=window.__PV_MAP__,center=opts.center||map?.getCenter?.(),zoom=opts.zoom??map?.getZoom?.();
  const key=JSON.stringify([q,limit,lang(),opts.layers||[],center&&[center.lng?.toFixed?.(3),center.lat?.toFixed?.(3)]]);if(photonCache.has(key))return photonCache.get(key);
  photonController?.abort();photonController=new AbortController();
  const u=new URL('https://photon.komoot.io/api/');u.searchParams.set('q',q);u.searchParams.set('limit',String(limit));u.searchParams.set('lang',lang());
  if(center&&Number.isFinite(Number(center.lat))&&Number.isFinite(Number(center.lng))){u.searchParams.set('lat',String(center.lat));u.searchParams.set('lon',String(center.lng));if(Number.isFinite(Number(zoom)))u.searchParams.set('zoom',String(Math.max(1,Math.min(18,zoom))))}
  for(const layer of opts.layers||[])u.searchParams.append('layer',layer);
  try{const r=await fetch(u,{signal:photonController.signal});if(!r.ok)throw new Error(`Photon HTTP ${r.status}`);const j=await r.json();const out=j?.features||[];photonCache.set(key,out);if(photonCache.size>60)photonCache.delete(photonCache.keys().next().value);return out}catch(err){if(err?.name==='AbortError')return[];console.warn('Photon search',err);return[]}
}

const overpassEndpoints=['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
async function overpass(query){
  let last=null;
  for(const endpoint of overpassEndpoints){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
    try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query),signal:controller.signal});clearTimeout(timer);if(!r.ok)throw new Error(`${r.status}`);return await r.json()}catch(err){clearTimeout(timer);last=err;console.warn('Overpass endpoint failed',endpoint,err)}
  }
  throw last||new Error('Overpass unavailable');
}
function haversine(a,b,c,d){const R=6371e3,rad=x=>x*Math.PI/180,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b),x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function radiusForZoom(z,cat){if(cat?.id==='city')return z>=10?40000:90000;if(cat?.id==='street')return z>=15?2500:6000;if(z>=15)return2500;if(z>=13)return5000;if(z>=11)return10000;return20000}

let ui={input:null,status:null,results:null,cats:null,quick:null};
function closeSearchSheet(){document.querySelector('#searchSheet [data-close]')?.click()}
function zoomForResult(p={}){const type=String(p.osm_value||p.type||'').toLowerCase(),layer=String(p.type||'').toLowerCase();if(type==='country'||layer==='country')return5;if(['state','region'].includes(type)||layer==='state')return7;if(['city','town','village','locality'].includes(type)||['city','locality'].includes(layer))return12;if(type==='street'||layer==='street'||p.osm_key==='highway')return16;return17}
function resultSubtitle(p={}){return[p.street,p.district,p.city||p.locality,p.state,p.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')}
function photonName(f){const p=f?.properties||{};return p.name||[p.street,p.housenumber].filter(Boolean).join(' ')||p.city||p.locality||p.country||'Luogo'}
function photonSynthetic(f){
  const p=f?.properties||{},raw=String(p.osm_value||''),key=String(p.osm_key||'');let sl='poi';
  if(key==='place'||['city','town','village','country'].includes(raw))sl='place';else if(key==='highway'||p.type==='street')sl='transportation_name';else if(key==='building')sl='building';
  return{properties:{name:photonName(f),class:raw,[key||'class']:raw},sourceLayer:sl,layer:{id:`photon-${sl}`,type:sl==='transportation_name'?'symbol':'symbol'}};
}
function flyToResult(f,showInfo=true){
  const coords=f?.geometry?.coordinates;if(!Array.isArray(coords)||coords.length<2)return;const map=window.__PV_MAP__,lon=Number(coords[0]),lat=Number(coords[1]),p=f.properties||{};if(!map)return;
  closeSearchSheet();map.flyTo({center:[lon,lat],zoom:zoomForResult(p),duration:1200,essential:true});
  if(showInfo)setTimeout(()=>showFeatureInfo(map,photonSynthetic(f),{lng:lon,lat},{name:photonName(f),osm:p.osm_id?{type:p.osm_type,id:p.osm_id}:null,tags:p.extra||{}}),650);
}
function renderResults(items,kind='photon'){
  if(!ui.results)return;ui.results.innerHTML='';
  if(!items.length){ui.results.innerHTML=`<div class="pv-empty">${esc(tr().none)}</div>`;return}
  const head=document.createElement('div');head.className='pv-results-head';head.textContent=tr().results;ui.results.append(head);
  items.slice(0,30).forEach(item=>{
    const b=document.createElement('button');b.type='button';b.className='pv-result';
    if(kind==='photon'){
      const p=item.properties||{};b.innerHTML=`<span class="pv-result-icon">⌖</span><span class="pv-result-copy"><b>${esc(photonName(item))}</b><small>${esc(resultSubtitle(p)||[p.osm_value,p.osm_key].filter(Boolean).join(' · '))}</small></span>`;b.addEventListener('click',()=>flyToResult(item,true));
    }else{
      const r=item,bName=r.name||categoryLabel(r.category),subtitle=[r.category&&categoryLabel(r.category),r.tags?.['addr:street'],r.tags?.['addr:city'],r.distance!=null?`${Math.round(r.distance)} m`:null].filter(Boolean).join(' · ');
      b.innerHTML=`<span class="pv-result-icon">${esc(r.category?.icon||'⌖')}</span><span class="pv-result-copy"><b>${esc(bName)}</b><small>${esc(subtitle)}</small></span>`;
      b.addEventListener('click',()=>{const map=window.__PV_MAP__;if(!map)return;closeSearchSheet();map.flyTo({center:[r.lon,r.lat],zoom:r.category?.id==='city'?12:r.category?.id==='street'?16:17,duration:1200,essential:true});const sl=r.category?.id==='street'?'transportation_name':r.category?.id==='city'?'place':'poi';const synthetic={properties:{...r.tags,name:bName,class:r.tags?.amenity||r.tags?.tourism||r.tags?.shop||r.tags?.place||r.tags?.highway||r.category?.id},sourceLayer:sl,layer:{id:`overpass-${sl}`,type:'symbol'}};setTimeout(()=>showFeatureInfo(map,synthetic,{lng:r.lon,lat:r.lat},{name:bName,category:categoryLabel(r.category),tags:r.tags,osm:{type:r.type,id:r.id}}),650)});
    }
    ui.results.append(b);
  });
}

async function categorySearch(cat,centerOverride=null){
  const map=window.__PV_MAP__;if(!map)return;
  const z=map.getZoom(),center=centerOverride||map.getCenter();
  if(!centerOverride&&z<8){ui.status.textContent=tr().zoom;return}
  ui.status.textContent=`${tr().loading} ${categoryLabel(cat)} ${tr().area}`;
  const radius=centerOverride?9000:radiusForZoom(z,cat),selectors=cat.selectors.map(s=>`${s.replace('nwr',s.startsWith('way')?'way':'nwr')}(around:${Math.round(radius)},${center.lat},${center.lng});`).join('');
  const q=`[out:json][timeout:14];(${selectors});out center tags 40;`;
  try{
    const j=await overpass(q),seen=new Set(),rows=[];
    for(const e of j.elements||[]){const lat=Number(e.lat??e.center?.lat),lon=Number(e.lon??e.center?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const tags=e.tags||{},name=tags[`name:${lang()}`]||tags.name||'';const key=`${e.type}:${e.id}`;if(seen.has(key))continue;seen.add(key);rows.push({type:e.type,id:e.id,lat,lon,name,tags,category:cat,distance:haversine(center.lat,center.lng,lat,lon)})}
    rows.sort((a,b)=>a.distance-b.distance);ui.status.textContent=rows.length?`${rows.length} · ${categoryLabel(cat)} ${tr().area}`:tr().none;renderResults(rows,'overpass');
  }catch(err){console.warn('Category search',err);ui.status.textContent=tr().none;renderResults([],'overpass')}
}

function normalize(s){return String(s||'').trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function parseCategoryQuery(q){
  const n=normalize(q);
  for(const cat of categories){
    const words=[categoryLabel(cat),...cat.keywords].map(normalize).sort((a,b)=>b.length-a.length);
    for(const w of words){if(n===w)return{cat,location:''};if(n.startsWith(w+' '))return{cat,location:q.trim().slice(w.length).trim()};if(n.endsWith(' '+w))return{cat,location:q.trim().slice(0,q.trim().length-w.length).trim()}}
  }
  return null;
}
async function runTextSearch(q){
  const parsed=parseCategoryQuery(q);
  if(parsed){
    if(parsed.location){ui.status.textContent=tr().searching;const places=await photonSearch(parsed.location,5,{layers:['city','locality','district']});if(!places.length){ui.status.textContent=tr().none;return}const c=places[0].geometry.coordinates;return categorySearch(parsed.cat,{lng:Number(c[0]),lat:Number(c[1])})}
    return categorySearch(parsed.cat);
  }
  ui.status.textContent=tr().searching;const rows=await photonSearch(q,12);ui.status.textContent=rows.length?`${rows.length} ${tr().results.toLocaleLowerCase()}`:tr().none;renderResults(rows,'photon');
}

let suggestTimer=null,suggestSeq=0;
async function autocomplete(){
  const q=ui.input?.value.trim()||'';const seq=++suggestSeq;clearTimeout(suggestTimer);
  if(q.length<2){if(ui.results)ui.results.innerHTML='';if(ui.status)ui.status.textContent=q?tr().typeMore:'';return}
  suggestTimer=setTimeout(async()=>{const parsed=parseCategoryQuery(q);if(parsed&&normalize(q)===normalize(categoryLabel(parsed.cat))){ui.status.textContent=`${categoryLabel(parsed.cat)} · ${tr().area}`;return}const rows=await photonSearch(q,8);if(seq!==suggestSeq)return;ui.status.textContent='';renderResults(rows,'photon')},360);
}

function injectStyles(){
  if(document.querySelector('#pv-smart-map-style'))return;const s=document.createElement('style');s.id='pv-smart-map-style';s.textContent=`
    .pv-category-wrap{margin:2px 0 12px}.pv-category-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:2px 1px 8px}.pv-category-head b{font-size:10px;color:#d9e2ef}.pv-category-head small{font-size:8px;color:#7f8ba0}.pv-categories{display:flex;gap:7px;overflow-x:auto;padding:0 1px 4px;scrollbar-width:none}.pv-categories::-webkit-scrollbar{display:none}.pv-cat{flex:0 0 auto;min-height:38px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.045);color:#fff;padding:0 10px;display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800}.pv-cat span{color:#72e8ff}.pv-search-results{display:grid;gap:6px;margin:5px 0 12px}.pv-results-head{font-size:9px;font-weight:900;letter-spacing:.1em;color:#72e8ff;padding:3px 2px}.pv-result{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035);color:#fff;padding:9px 10px}.pv-result-icon{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:10px;background:rgba(114,232,255,.08);color:#72e8ff;font-weight:900}.pv-result-copy{min-width:0;flex:1}.pv-result-copy b,.pv-result-copy small{display:block}.pv-result-copy b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pv-result-copy small{font-size:8.5px;color:#96a3b8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pv-empty{padding:11px;border:1px dashed rgba(255,255,255,.1);border-radius:12px;color:#96a3b8;font-size:9px}.search-row input:focus{border-color:rgba(114,232,255,.48);box-shadow:0 0 0 2px rgba(114,232,255,.06)}
  `;document.head.append(s);
}

function initSearchUi(){
  ui.input=document.querySelector('#searchInput');ui.status=document.querySelector('#searchStatus');const sheet=document.querySelector('#searchSheet .sheet-body'),quick=document.querySelector('#searchSheet .quick-grid');if(!ui.input||!sheet)return;
  injectStyles();
  const wrap=document.createElement('div');wrap.className='pv-category-wrap';wrap.innerHTML=`<div class="pv-category-head"><b>${esc(tr().categories)}</b><small>${esc(tr().area)}</small></div><div class="pv-categories"></div>`;ui.cats=wrap.querySelector('.pv-categories');
  categories.forEach(cat=>{const b=document.createElement('button');b.type='button';b.className='pv-cat';b.innerHTML=`<span>${esc(cat.icon)}</span>${esc(categoryLabel(cat))}`;b.addEventListener('click',()=>categorySearch(cat));ui.cats.append(b)});
  ui.results=document.createElement('div');ui.results.className='pv-search-results';
  ui.status.after(wrap);wrap.after(ui.results);ui.quick=quick;
  ui.input.addEventListener('input',autocomplete);
  ui.input.addEventListener('keydown',e=>{if(e.key==='Escape'){ui.results.innerHTML='';ui.status.textContent=''}});
  const form=document.querySelector('#searchForm');
  form?.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();const q=ui.input.value.trim();if(!q)return;runTextSearch(q)},{capture:true});
}

function initCloseHooks(){
  document.querySelector('#infoSheet [data-close]')?.addEventListener('click',closeSmartInfo);
  document.querySelector('#scrim')?.addEventListener('click',closeSmartInfo);
  ['#searchOpen','#layersOpen','#moreOpen','#languageOpen'].forEach(sel=>document.querySelector(sel)?.addEventListener('click',closeSmartInfo,{capture:true}));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initSearchUi();initCloseHooks()},{once:true});else{initSearchUi();initCloseHooks()}
