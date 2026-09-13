const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={map:null,maplibre:null,mapReady:false,projection:'globe',activeSheet:null,quakes:null,baseMode:'map',labels:true,terrain:false,buildings:true,quakeLayer:true,imageryName:'Esri World Imagery',imagery:null,labelLayers:[],buildingLayer:null,inspectSeq:0,lastNominatim:0,fallback:false};
const places={rome:[12.4964,41.9028,12,'Roma'],everest:[86.9250,27.9881,10,'Monte Everest'],kilauea:[-155.292,19.421,10,'Kīlauea'],tokyo:[139.6917,35.6895,11,'Tokyo']};
const boot={title:$('#bootTitle'),text:$('#bootText'),bar:$('#bootBar'),box:$('#boot'),retry:$('#retryBtn')};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function bootStep(p,title,text){boot.bar.style.width=`${p}%`;boot.title.textContent=title;boot.text.textContent=text||''}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2400)}
function openSheet(sel){closeSheets();const el=$(sel);if(!el)return;state.activeSheet=el;el.classList.add('open');el.setAttribute('aria-hidden','false');$('#scrim').classList.add('open')}
function closeSheets(){if(state.activeSheet){state.activeSheet.classList.remove('open');state.activeSheet.setAttribute('aria-hidden','true')}state.activeSheet=null;$('#scrim').classList.remove('open')}
$$('[data-close]').forEach(b=>b.addEventListener('click',closeSheets));$('#scrim').addEventListener('click',closeSheets);
function switchView(name){closeSheets();$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));if(name==='earth'&&state.map)setTimeout(()=>state.map.resize(),40)}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.nav)));
$('#moreOpen').addEventListener('click',()=>openSheet('#moreSheet'));$('#searchOpen').addEventListener('click',()=>openSheet('#searchSheet'));$('#layersOpen').addEventListener('click',()=>openSheet('#layersSheet'));$('#earthInfoOpen').addEventListener('click',showSources);
$$('[data-action="home"]').forEach(b=>b.addEventListener('click',()=>{switchView('earth');home()}));

async function importMapLibre(){
  const urls=['https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs','https://unpkg.com/maplibre-gl@6.9.0/dist/maplibre-gl.mjs'];let last;
  for(const url of urls){try{return await import(url)}catch(e){last=e;console.warn('MapLibre import failed',url,e)}}throw last||new Error('MapLibre non disponibile');
}
function imageTest(url,timeout=5000){return new Promise(resolve=>{const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const t=setTimeout(()=>finish(false),timeout);img.onload=()=>{clearTimeout(t);finish(true)};img.onerror=()=>{clearTimeout(t);finish(false)};img.referrerPolicy='no-referrer';img.src=url})}
async function chooseImagery(){
  const esriProbe='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0';
  if(await imageTest(esriProbe))return{name:'Esri World Imagery',tiles:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maxzoom:19,attribution:'Esri World Imagery'};
  const eoxProbe='https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/0/0/0.jpg';
  if(await imageTest(eoxProbe))return{name:'Sentinel-2 Cloudless 2025',tiles:'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg',maxzoom:14,attribution:'EOxCloudless · modified Copernicus Sentinel data 2025'};
  return{name:'Satellite non disponibile',tiles:null,maxzoom:0,attribution:''};
}
async function initMap(){
  try{
    boot.retry.classList.add('hidden');bootStep(12,'Caricamento motore cartografico…','MapLibre GL JS 6.9.0.');
    const [maplibre,imagery]=await Promise.all([importMapLibre(),chooseImagery()]);state.maplibre=maplibre;state.imagery=imagery;state.imageryName=imagery.name;
    bootStep(34,'Caricamento mappa vettoriale…','Strade, città, confini e punti d’interesse da OpenStreetMap/OpenFreeMap.');
    createVectorMap(maplibre,imagery);
  }catch(e){failBoot(e)}
}
function createVectorMap(maplibre,imagery){
  let loaded=false;
  const map=new maplibre.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[12.5,20],zoom:1.7,pitch:0,bearing:0,attributionControl:false,maxZoom:19,maxPitch:85,canvasContextAttributes:{antialias:true}});state.map=map;
  map.dragRotate.enable();map.touchZoomRotate.enable();
  const watchdog=setTimeout(()=>{if(!loaded){console.warn('Vector basemap timeout; fallback raster');try{map.remove()}catch{}createRasterFallback(maplibre,imagery)}},20000);
  map.on('load',async()=>{loaded=true;clearTimeout(watchdog);await finishMapSetup(false)});
  map.on('error',e=>console.warn('MapLibre vector',e?.error||e));
}
function createRasterFallback(maplibre,imagery){
  state.fallback=true;bootStep(48,'Attivo la mappa di riserva…','Il basemap vettoriale non ha risposto: uso OpenStreetMap raster.');
  const sources={osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}};
  const layers=[{id:'osm-raster',type:'raster',source:'osm'}];
  if(imagery.tiles){sources.satellite={type:'raster',tiles:[imagery.tiles],tileSize:256,maxzoom:imagery.maxzoom,attribution:imagery.attribution};layers.push({id:'satellite-real',type:'raster',source:'satellite',layout:{visibility:'none'}})}
  const style={version:8,sources,layers};
  const map=new maplibre.Map({container:'map',style,center:[12.5,20],zoom:1.7,pitch:0,bearing:0,attributionControl:false,maxZoom:19,maxPitch:85,canvasContextAttributes:{antialias:true}});state.map=map;map.dragRotate.enable();map.touchZoomRotate.enable();
  let loaded=false;const timer=setTimeout(()=>{if(!loaded)failBoot(new Error('I servizi cartografici non hanno risposto.'))},20000);
  map.on('load',async()=>{loaded=true;clearTimeout(timer);await finishMapSetup(true)});map.on('error',e=>console.warn('MapLibre fallback',e?.error||e));
}
async function finishMapSetup(fallback){
  const map=state.map;state.mapReady=true;
  try{map.setProjection({type:'globe'})}catch(e){console.warn('Globe projection',e)}
  bootStep(55,'Aggiungo il modello della Terra…','Globo 3D, satellite e modello di elevazione.');
  if(!fallback)installVectorExtras();
  installTerrain();
  installSatellite();
  captureLabelLayers();
  install3DBuildings();
  bindMapInteractions();
  bootStep(76,'Collegamento dati live…','USGS Earthquake Hazards Program · ultime 24 ore.');
  await fetchQuakes();
  bootStep(100,'Terra pronta.','Mappa dettagliata, satellite, dati live e schede informative.');
  $('#dataChip').textContent=`OSM · ${state.imageryName} · USGS`;
  setTimeout(()=>boot.box.classList.add('hidden'),420);
}
function installVectorExtras(){/* reserved for future style overlays */}
function installSatellite(){
  const map=state.map,im=state.imagery;if(!im?.tiles||map.getSource('satellite'))return;
  try{map.addSource('satellite',{type:'raster',tiles:[im.tiles],tileSize:256,maxzoom:im.maxzoom,attribution:im.attribution});const layers=map.getStyle().layers||[];const before=(layers.find(l=>l.type==='line')||layers.find(l=>l.type==='symbol'))?.id;map.addLayer({id:'satellite-real',type:'raster',source:'satellite',layout:{visibility:'none'},paint:{'raster-opacity':1}},before)}catch(e){console.warn('Satellite layer',e)}
}
function installTerrain(){
  const map=state.map;if(map.getSource('terrain-dem'))return;
  try{map.addSource('terrain-dem',{type:'raster-dem',url:'https://tiles.mapterhorn.com/tilejson.json'});const layers=map.getStyle().layers||[];const before=(layers.find(l=>l.type==='line')||layers.find(l=>l.type==='symbol'))?.id;map.addLayer({id:'terrain-hillshade',type:'hillshade',source:'terrain-dem',layout:{visibility:'none'},paint:{'hillshade-exaggeration':.28,'hillshade-shadow-color':'#111827','hillshade-highlight-color':'#d8e8ef'}},before)}catch(e){console.warn('Terrain source',e)}
}
function captureLabelLayers(){state.labelLayers=(state.map.getStyle().layers||[]).filter(l=>l.type==='symbol').map(l=>l.id)}
function install3DBuildings(){
  if(state.fallback)return;const map=state.map,layers=map.getStyle().layers||[];const candidate=layers.find(l=>l['source-layer']==='building'&&l.source);if(!candidate)return;
  try{map.addLayer({id:'perkussus-buildings-3d',type:'fill-extrusion',source:candidate.source,'source-layer':'building',minzoom:15,paint:{'fill-extrusion-color':'#c7d2df','fill-extrusion-height':['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],6],'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0],'fill-extrusion-opacity':.72}});state.buildingLayer='perkussus-buildings-3d'}catch(e){console.warn('3D buildings',e)}
}
function bindMapInteractions(){
  const map=state.map;map.on('dragstart',()=>{$('#gestureHint').classList.add('hide');if(state.activeSheet)closeSheets()});map.on('zoomstart',()=>$('#gestureHint').classList.add('hide'));
  map.on('click',e=>{if(map.getLayer('quakes')){const hits=map.queryRenderedFeatures(e.point,{layers:['quakes']});if(hits.length)return}inspectLocation(e.lngLat)});
}
function failBoot(err){console.error(err);bootStep(100,'La Terra non si è caricata.',String(err?.message||err));boot.bar.style.background='#ff7676';boot.retry.classList.remove('hidden')}
boot.retry.addEventListener('click',()=>location.reload());

async function fetchQuakes(){
  try{const r=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',{cache:'no-store'});if(!r.ok)throw new Error(`USGS HTTP ${r.status}`);const data=await r.json();state.quakes=data;renderQuakeStats(data);installQuakeLayer(data);return true}
  catch(e){console.warn('USGS failed',e);$('#quakeList').innerHTML='<div class="notice">Feed USGS temporaneamente non raggiungibile. La mappa resta utilizzabile.</div>';return false}
}
function installQuakeLayer(data){const map=state.map;if(!map||!map.isStyleLoaded())return;if(map.getSource('quakes')){map.getSource('quakes').setData(data);return}try{map.addSource('quakes',{type:'geojson',data});map.addLayer({id:'quake-glow',type:'circle',source:'quakes',paint:{'circle-radius':['interpolate',['linear'],['get','mag'],0,6,7,14],'circle-color':'#ffcf70','circle-opacity':.16,'circle-blur':.6}});map.addLayer({id:'quakes',type:'circle',source:'quakes',paint:{'circle-radius':['interpolate',['linear'],['get','mag'],0,3,7,8],'circle-color':['interpolate',['linear'],['get','mag'],0,'#7be7ff',4,'#ffd36f',6,'#ff7676'],'circle-stroke-width':1.2,'circle-stroke-color':'#fff','circle-opacity':.94}});map.on('click','quakes',e=>showQuake(e.features?.[0]));map.on('mouseenter','quakes',()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave','quakes',()=>map.getCanvas().style.cursor='')}catch(e){console.warn('Quake layers',e)}}
function renderQuakeStats(data){const features=[...(data.features||[])].filter(f=>Number.isFinite(f.properties?.mag));$('#liveQuakeCount').textContent=features.length.toLocaleString('it-IT');const max=[...features].sort((a,b)=>b.properties.mag-a.properties.mag)[0];if(max){$('#liveMaxMag').textContent=max.properties.mag.toFixed(1);$('#liveMaxPlace').textContent=max.properties.place||'—'}$('#quakeList').innerHTML=features.slice(0,30).map((f,i)=>`<button class="event" data-q="${i}"><span class="mag">${Number(f.properties.mag).toFixed(1)}</span><span class="event-copy"><b>${escapeHtml(f.properties.place||'Evento sismico')}</b><small>${new Date(f.properties.time).toLocaleString('it-IT')} · profondità ${Math.round(f.geometry.coordinates[2])} km</small></span></button>`).join('');$$('[data-q]').forEach(b=>b.addEventListener('click',()=>{const f=features[Number(b.dataset.q)];switchView('earth');state.map?.flyTo({center:[f.geometry.coordinates[0],f.geometry.coordinates[1]],zoom:6,duration:1200,essential:true});setTimeout(()=>showQuake(f),450)}))}
function showQuake(f){if(!f)return;const p=f.properties||{},c=f.geometry?.coordinates||[];$('#infoKicker').textContent='USGS · VERIFIED LIVE DATA';$('#infoTitle').textContent=p.place||'Terremoto';$('#infoBody').innerHTML=`<div class="info-grid"><div class="info-metric"><small>Magnitudo</small><b>${Number(p.mag).toFixed(1)}</b></div><div class="info-metric"><small>Profondità</small><b>${Math.round(c[2]||0)} km</b></div></div><div class="source-card"><b>${new Date(p.time).toLocaleString('it-IT')}</b><span>Coordinate: ${Number(c[1]).toFixed(4)}, ${Number(c[0]).toFixed(4)}</span></div><div class="source-card"><b class="ok">Fonte verificata</b><span>USGS Earthquake Hazards Program · feed GeoJSON ufficiale delle ultime 24 ore.</span></div>${p.url?`<div class="info-actions"><a class="link-btn primary-link" target="_blank" rel="noopener" href="${safeUrl(p.url)}">USGS ↗</a></div>`:''}`;openSheet('#infoSheet')}

let nominatimQueue=Promise.resolve();
function nominatimJson(url){nominatimQueue=nominatimQueue.then(async()=>{const wait=Math.max(0,1100-(Date.now()-state.lastNominatim));if(wait)await sleep(wait);state.lastNominatim=Date.now();const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Nominatim HTTP ${r.status}`);return r.json()});return nominatimQueue}
async function reverseGeocode(lat,lon){return nominatimJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1&namedetails=1&accept-language=it`)}
async function fetchElevation(lat,lon){try{const r=await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`);if(!r.ok)return null;const j=await r.json();return Number.isFinite(j?.elevation?.[0])?j.elevation[0]:null}catch{return null}}
async function fetchTerrainTags(lat,lon){
  const q=`[out:json][timeout:8];(nwr(around:45,${lat},${lon})[natural];nwr(around:45,${lat},${lon})[landuse];nwr(around:30,${lat},${lon})[surface];nwr(around:45,${lat},${lon})[wetland];nwr(around:45,${lat},${lon})[geological];);out tags center 15;`;
  try{const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});if(!r.ok)return[];const j=await r.json();return (j.elements||[]).map(x=>x.tags||{}).filter(t=>Object.keys(t).length)}catch{return[]}
}
async function fetchWikipedia(reverse,lat,lon){
  const wikiTag=reverse?.extratags?.wikipedia;let lang='it',title='';if(wikiTag&&wikiTag.includes(':')){const p=wikiTag.split(':');lang=p.shift()||'it';title=p.join(':')}
  const candidate=title||reverse?.address?.city||reverse?.address?.town||reverse?.address?.village||reverse?.address?.municipality||reverse?.name||reverse?.address?.country||'';
  const getPage=async(baseTitle,language='it')=>{if(!baseTitle)return null;const u=`https://${language}.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|pageprops&exintro=1&explaintext=1&pithumbsize=480&titles=${encodeURIComponent(baseTitle)}&format=json&origin=*`;const r=await fetch(u);if(!r.ok)return null;const j=await r.json();const page=Object.values(j?.query?.pages||{})[0];if(!page||page.missing!==undefined)return null;return{title:page.title,extract:page.extract||'',thumb:page.thumbnail?.source||'',qid:page.pageprops?.wikibase_item||'',url:`https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`}};
  let page=await getPage(candidate,lang);if(page)return page;
  try{const u=`https://it.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${lat}%7C${lon}&ggsradius=2500&ggslimit=1&ggsnamespace=0&prop=extracts|pageimages|pageprops&exintro=1&explaintext=1&pithumbsize=480&format=json&origin=*`;const r=await fetch(u);const j=await r.json();const p=Object.values(j?.query?.pages||{})[0];if(!p)return null;return{title:p.title,extract:p.extract||'',thumb:p.thumbnail?.source||'',qid:p.pageprops?.wikibase_item||'',url:`https://it.wikipedia.org/wiki/${encodeURIComponent(p.title.replaceAll(' ','_'))}`}}catch{return null}
}
async function fetchWikidata(qid){if(!qid)return null;try{const r=await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`);if(!r.ok)return null;const j=await r.json();const e=j?.entities?.[qid];if(!e)return null;const claim=e.claims?.P856?.find(c=>c.rank==='preferred')||e.claims?.P856?.[0];const official=claim?.mainsnak?.datavalue?.value||'';return{qid,label:e.labels?.it?.value||e.labels?.en?.value||'',description:e.descriptions?.it?.value||e.descriptions?.en?.value||'',official:safeUrl(official)}}catch{return null}}
function classifyTerrain(tagSets,reverse){
  const all=tagSets||[];const find=(k,v)=>all.find(t=>t[k]&&(v===undefined||t[k]===v));const natural=find('natural');const land=find('landuse');const surface=find('surface');const wet=find('wetland');const geo=find('geological');let label='Non classificato nei dati OSM',raw=[];
  const n=natural?.natural,l=land?.landuse,s=surface?.surface,w=wet?.wetland,g=geo?.geological;
  const mapN={water:'Acqua',wood:'Bosco',grassland:'Prateria',bare_rock:'Roccia affiorante',scree:'Ghiaione',shingle:'Ghiaia',sand:'Sabbia',beach:'Spiaggia',wetland:'Zona umida',scrub:'Macchia/arbusti',heath:'Brughiera',glacier:'Ghiacciaio',peak:'Vetta/montagna',volcano:'Area vulcanica',cliff:'Falesia'};
  const mapL={forest:'Foresta',farmland:'Terreno agricolo',farmyard:'Area agricola',meadow:'Prato',orchard:'Frutteto',vineyard:'Vigneto',residential:'Area urbana residenziale',commercial:'Area commerciale',industrial:'Area industriale',quarry:'Cava',recreation_ground:'Area ricreativa',grass:'Prato/erba'};
  const mapS={asphalt:'Asfalto',paved:'Superficie pavimentata',concrete:'Calcestruzzo',gravel:'Ghiaia',ground:'Terreno naturale',dirt:'Terra',sand:'Sabbia',grass:'Erba',rock:'Roccia',unpaved:'Superficie non pavimentata'};
  if(n&&mapN[n])label=mapN[n];else if(l&&mapL[l])label=mapL[l];else if(w)label='Zona umida';else if(g)label=`Geologia: ${g}`;else if(s&&mapS[s])label=mapS[s];else if(reverse?.category==='natural')label=reverse.type||'Elemento naturale';else if(reverse?.category==='landuse')label=reverse.type||'Uso del suolo';
  if(n)raw.push(`natural=${n}`);if(l)raw.push(`landuse=${l}`);if(s)raw.push(`surface=${s}`);if(w)raw.push(`wetland=${w}`);if(g)raw.push(`geological=${g}`);return{label,raw};
}
async function inspectLocation(lngLat){
  const seq=++state.inspectSeq,lat=Number(lngLat.lat),lon=Number(lngLat.lng);$('#infoKicker').textContent='REALITY INSPECTOR';$('#infoTitle').textContent='Analisi del punto…';$('#infoBody').innerHTML=`<div class="loading-row">Interrogo OpenStreetMap, Wikipedia/Wikidata e dati di elevazione…</div>`;openSheet('#infoSheet');
  const reverseP=reverseGeocode(lat,lon);const elevP=fetchElevation(lat,lon);const terrainP=fetchTerrainTags(lat,lon);const reverse=await reverseP.catch(()=>null);const wikiP=fetchWikipedia(reverse,lat,lon);const [elevation,tags,wiki]=await Promise.all([elevP,terrainP,wikiP]);if(seq!==state.inspectSeq)return;const qid=reverse?.extratags?.wikidata||wiki?.qid||'';const wd=await fetchWikidata(qid);if(seq!==state.inspectSeq)return;renderPlaceInfo({lat,lon,reverse,elevation,tags,wiki,wd});
}
function renderPlaceInfo({lat,lon,reverse,elevation,tags,wiki,wd}){
  const addr=reverse?.address||{};const title=reverse?.name||addr.city||addr.town||addr.village||addr.municipality||wiki?.title||addr.country||'Punto sulla Terra';const subtitle=[addr.road,addr.city||addr.town||addr.village,addr.state,addr.country].filter(Boolean).join(' · ');const terrain=classifyTerrain(tags,reverse);const osmType={node:'node',way:'way',relation:'relation'}[reverse?.osm_type];const osmUrl=osmType&&reverse?.osm_id?`https://www.openstreetmap.org/${osmType}/${reverse.osm_id}`:`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;const street=`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;const wikiUrl=wiki?.url||'';const official=wd?.official||'';const wikidata=wd?.qid?`https://www.wikidata.org/wiki/${wd.qid}`:'';const thumb=wiki?.thumb?`<img class="info-thumb" src="${safeUrl(wiki.thumb)}" alt="">`:'';const extract=wiki?.extract?escapeHtml(wiki.extract.slice(0,900)):'Nessuna sintesi enciclopedica trovata automaticamente per questo punto.';
  $('#infoKicker').textContent='VERIFIED PLACE DATA';$('#infoTitle').textContent=title;$('#infoBody').innerHTML=`
    <div class="info-hero">${thumb}<div class="info-copy"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle||reverse?.display_name||'Posizione geografica')}</p></div></div>
    <div class="info-grid"><div class="info-metric"><small>Coordinate</small><b>${lat.toFixed(5)}, ${lon.toFixed(5)}</b></div><div class="info-metric"><small>Elevazione</small><b>${elevation==null?'—':`${Math.round(elevation)} m`}</b></div><div class="info-metric"><small>Terreno / uso suolo</small><b>${escapeHtml(terrain.label)}</b></div><div class="info-metric"><small>Categoria OSM</small><b>${escapeHtml(reverse?.type||reverse?.category||'—')}</b></div></div>
    ${terrain.raw.length?`<div class="tag-row">${terrain.raw.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`:''}
    <div class="source-card"><b>${escapeHtml(wiki?.title||wd?.label||'Informazioni rapide')}</b><span class="wiki-text">${extract}</span></div>
    <div class="info-actions">${wikiUrl?linkBtn('Wikipedia ↗',wikiUrl,true):''}${official?linkBtn('Sito ufficiale ↗',official,false):''}${linkBtn('OpenStreetMap ↗',osmUrl,false)}${wikidata?linkBtn('Wikidata ↗',wikidata,false):''}${linkBtn('Street View ↗',street,false)}</div>
    <div class="source-card"><b class="ok">Fonti</b><span>Posizione: OpenStreetMap/Nominatim. Terreno e superficie: OpenStreetMap/Overpass. Elevazione: Open-Meteo su Copernicus DEM. Sintesi: Wikipedia. Sito ufficiale: Wikidata P856 quando disponibile.</span></div>
    <div class="street-note">Street View si apre per ora nel servizio esterno. L'integrazione immersiva dentro Perkussus richiede una chiave Google Maps Platform o un token Mapillary con le relative condizioni d'uso.</div>`;openSheet('#infoSheet')
}
function linkBtn(label,url,primary=false){const safe=safeUrl(url);if(!safe)return'';return`<a class="link-btn${primary?' primary-link':''}" target="_blank" rel="noopener" href="${safe}">${escapeHtml(label)}</a>`}
function safeUrl(v=''){try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function showSources(){$('#infoKicker').textContent='SOURCE & CONFIDENCE';$('#infoTitle').textContent='Fonti Earth';$('#infoBody').innerHTML=`<div class="source-card"><b class="ok">OpenStreetMap + OpenFreeMap</b><span>Mappa vettoriale dettagliata: strade, città, paesi, confini e punti d'interesse. © OpenStreetMap contributors.</span></div><div class="source-card"><b class="ok">${escapeHtml(state.imageryName)}</b><span>Immagini satellitari/aeree reali. Sono un mosaico e non una ripresa live.</span></div><div class="source-card"><b class="ok">Mapterhorn</b><span>Modello digitale di elevazione usato per il terreno 3D.</span></div><div class="source-card"><b class="ok">USGS</b><span>Feed terremoti ufficiale delle ultime 24 ore.</span></div><div class="source-card"><b>Place intelligence</b><span>Nominatim/OSM per reverse geocoding, Overpass per caratteristiche del terreno, Wikipedia/Wikidata per sintesi e sito ufficiale, Open-Meteo/Copernicus DEM per elevazione.</span></div>`;openSheet('#infoSheet')}

function home(){state.map?.flyTo({center:[12.5,20],zoom:1.7,pitch:0,bearing:0,duration:1200,essential:true})}$('#homeBtn').addEventListener('click',home);
$('#projectionBtn').addEventListener('click',()=>{if(!state.map)return;state.projection=state.projection==='globe'?'mercator':'globe';try{state.map.setProjection({type:state.projection})}catch{}$('#projectionBtn').textContent=state.projection==='globe'?'3D':'2D';toast(state.projection==='globe'?'Globo 3D':'Mappa 2D')});
function setBaseMode(mode){state.baseMode=mode;const sat=state.map?.getLayer('satellite-real');if(sat)state.map.setLayoutProperty('satellite-real','visibility',mode==='satellite'?'visible':'none');$('#mapModeBtn').textContent=mode==='satellite'?'SAT':'MAP';$$('[data-base]').forEach(b=>b.classList.toggle('active',b.dataset.base===mode));toast(mode==='satellite'?'Immagini satellitari reali':'Mappa dettagliata')}
$('#mapModeBtn').addEventListener('click',()=>setBaseMode(state.baseMode==='map'?'satellite':'map'));$$('[data-base]').forEach(b=>b.addEventListener('click',()=>setBaseMode(b.dataset.base)));
function toggleTerrain(on){state.terrain=on;$('#terrainToggle').classList.toggle('on',on);$('#terrainBtn').classList.toggle('active',on);try{state.map?.setTerrain(on?{source:'terrain-dem',exaggeration:1.15}:null);if(state.map?.getLayer('terrain-hillshade'))state.map.setLayoutProperty('terrain-hillshade','visibility',on?'visible':'none');if(on&&state.map.getZoom()>7)state.map.easeTo({pitch:55,duration:500})}catch(e){console.warn(e);toast('Terreno 3D non disponibile qui')}}
$('#terrainBtn').addEventListener('click',()=>toggleTerrain(!state.terrain));$('#terrainToggle').addEventListener('click',()=>toggleTerrain(!state.terrain));
$('#labelsToggle').addEventListener('click',e=>{state.labels=!state.labels;e.currentTarget.classList.toggle('on',state.labels);state.labelLayers.forEach(id=>{if(state.map?.getLayer(id))state.map.setLayoutProperty(id,'visibility',state.labels?'visible':'none')});if(state.fallback)toast('Nel basemap di riserva i nomi sono integrati nella mappa')});
$('#buildingsToggle').addEventListener('click',e=>{state.buildings=!state.buildings;e.currentTarget.classList.toggle('on',state.buildings);if(state.buildingLayer&&state.map?.getLayer(state.buildingLayer))state.map.setLayoutProperty(state.buildingLayer,'visibility',state.buildings?'visible':'none')});
$('#quakeToggle').addEventListener('click',e=>{state.quakeLayer=!state.quakeLayer;e.currentTarget.classList.toggle('on',state.quakeLayer);['quakes','quake-glow'].forEach(id=>{if(state.map?.getLayer(id))state.map.setLayoutProperty(id,'visibility',state.quakeLayer?'visible':'none')})});
$('#locateBtn').addEventListener('click',()=>{if(!navigator.geolocation)return toast('Geolocalizzazione non disponibile');toast('Cerco la posizione…');navigator.geolocation.getCurrentPosition(p=>{const ll={lng:p.coords.longitude,lat:p.coords.latitude};state.map?.flyTo({center:[ll.lng,ll.lat],zoom:15,duration:1400,essential:true});setTimeout(()=>inspectLocation(ll),500)},()=>toast('Posizione non autorizzata'),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})});

$$('[data-place]').forEach(b=>b.addEventListener('click',()=>goPlace(b.dataset.place)));
function goPlace(key){const p=places[key];if(!p)return;closeSheets();switchView('earth');state.map?.flyTo({center:[p[0],p[1]],zoom:p[2],duration:1400,essential:true});setTimeout(()=>inspectLocation({lng:p[0],lat:p[1]}),650)}
$('#searchForm').addEventListener('submit',async e=>{e.preventDefault();const q=$('#searchInput').value.trim();if(!q)return;const known=Object.entries(places).find(([,p])=>p[3].toLowerCase().includes(q.toLowerCase())||q.toLowerCase().includes(p[3].toLowerCase()));if(known)return goPlace(known[0]);const status=$('#searchStatus');status.textContent='Ricerca…';try{const a=await nominatimJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&extratags=1&accept-language=it&q=${encodeURIComponent(q)}`);if(!a[0])throw new Error('Nessun risultato');const x=a[0],lon=Number(x.lon),lat=Number(x.lat);status.textContent=x.display_name;closeSheets();switchView('earth');state.map?.flyTo({center:[lon,lat],zoom:Number(x.type==='country'?5:12),duration:1400,essential:true});setTimeout(()=>inspectLocation({lng:lon,lat}),650)}catch(err){status.textContent=String(err.message||err)}});
$$('[data-action="sources"]').forEach(b=>b.addEventListener('click',showSources));$$('[data-action="missions"],[data-action="passport"]').forEach(b=>b.addEventListener('click',e=>toast(`${e.currentTarget.dataset.action} · in sviluppo`)));

initMap();setInterval(()=>{if(document.visibilityState==='visible'&&state.mapReady)fetchQuakes()},60000);