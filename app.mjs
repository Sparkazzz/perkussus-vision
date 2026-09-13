const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={map:null,maplibre:null,mapReady:false,projection:'globe',activeSheet:null,quakes:null,imagery:true,labels:true,quakeLayer:true,imageryName:'Sentinel-2 Cloudless 2025'};
const places={rome:[12.4964,41.9028,12,'Roma'],everest:[86.9250,27.9881,10,'Monte Everest'],kilauea:[-155.292,19.421,10,'Kīlauea'],tokyo:[139.6917,35.6895,11,'Tokyo']};
const boot={title:$('#bootTitle'),text:$('#bootText'),bar:$('#bootBar'),box:$('#boot'),retry:$('#retryBtn')};
function bootStep(p,title,text){boot.bar.style.width=`${p}%`;boot.title.textContent=title;boot.text.textContent=text||''}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200)}
function openSheet(sel){closeSheets();const el=$(sel);if(!el)return;state.activeSheet=el;el.classList.add('open');el.setAttribute('aria-hidden','false');$('#scrim').classList.add('open')}
function closeSheets(){if(state.activeSheet){state.activeSheet.classList.remove('open');state.activeSheet.setAttribute('aria-hidden','true')}state.activeSheet=null;$('#scrim').classList.remove('open')}
$$('[data-close]').forEach(b=>b.addEventListener('click',closeSheets));$('#scrim').addEventListener('click',closeSheets);
function switchView(name){closeSheets();$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));if(name==='earth'&&state.map)setTimeout(()=>state.map.resize(),30)}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.nav)));
$('#moreOpen').addEventListener('click',()=>openSheet('#moreSheet'));$('#searchOpen').addEventListener('click',()=>openSheet('#searchSheet'));$('#layersOpen').addEventListener('click',()=>openSheet('#layersSheet'));$('#earthInfoOpen').addEventListener('click',showSources);
$$('[data-action="home"]').forEach(b=>b.addEventListener('click',()=>{switchView('earth');home()}));

async function importMapLibre(){
  const urls=['https://cdn.jsdelivr.net/npm/maplibre-gl@6.6.0/dist/maplibre-gl.mjs','https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs'];
  let last;
  for(const url of urls){try{return await import(url)}catch(e){last=e;console.warn('MapLibre import failed',url,e)}}
  throw last||new Error('MapLibre non disponibile');
}
function imageTest(url,timeout=6000){return new Promise(resolve=>{const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const t=setTimeout(()=>finish(false),timeout);img.onload=()=>{clearTimeout(t);finish(true)};img.onerror=()=>{clearTimeout(t);finish(false)};img.referrerPolicy='no-referrer';img.src=url})}
async function chooseImagery(){
  const eoxProbe='https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/0/0/0.jpg';
  if(await imageTest(eoxProbe)){return {name:'Sentinel-2 Cloudless 2025',sat:'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg',labels:'https://tiles.maps.eox.at/wmts/1.0.0/overlay_bright_3857/default/g/{z}/{y}/{x}.jpg',satAttr:'EOxCloudless · EOX · modified Copernicus Sentinel data 2025',labelAttr:'OpenStreetMap contributors · EOX'}}
  const esriProbe='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0';
  if(await imageTest(esriProbe)){return {name:'Esri World Imagery',sat:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',labels:'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',satAttr:'Esri World Imagery',labelAttr:'Esri reference labels'}}
  throw new Error('Nessun server di immagini satellitari raggiungibile');
}
async function initMap(){
  try{
    boot.retry.classList.add('hidden');bootStep(15,'Caricamento motore 3D…','MapLibre GL JS, versione bloccata e verificata.');
    const maplibre=await importMapLibre();state.maplibre=maplibre;
    bootStep(38,'Verifica immagini satellitari…','Controllo del provider prima di avviare il globo.');
    const imagery=await chooseImagery();state.imageryName=imagery.name;$('#imagerySourceLabel').textContent=imagery.name;
    bootStep(58,'Costruzione del globo…',`${imagery.name} · dati reali, mosaico non live.`);
    const style={version:8,projection:{type:'globe'},sources:{satellite:{type:'raster',tiles:[imagery.sat],tileSize:256,maxzoom:14,attribution:imagery.satAttr},labels:{type:'raster',tiles:[imagery.labels],tileSize:256,maxzoom:18,attribution:imagery.labelAttr}},layers:[{id:'satellite',type:'raster',source:'satellite',paint:{'raster-opacity':1}},{id:'labels',type:'raster',source:'labels',paint:{'raster-opacity':.9}}]};
    const map=new maplibre.Map({container:'map',style,center:[12.5,20],zoom:1.65,pitch:0,bearing:0,attributionControl:false,canvasContextAttributes:{antialias:true}});state.map=map;
    map.dragRotate.enable();map.touchZoomRotate.enable();
    let loaded=false;const watchdog=setTimeout(()=>{if(!loaded)failBoot(new Error('Il motore 3D non ha completato il caricamento entro 25 secondi.'))},25000);
    map.on('load',async()=>{loaded=true;clearTimeout(watchdog);state.mapReady=true;bootStep(82,'Collegamento dati live…','USGS Earthquake Hazards Program · ultime 24 ore.');await fetchQuakes();bootStep(100,'Terra pronta.','Immagini satellitari + dati USGS.');setTimeout(()=>boot.box.classList.add('hidden'),450);$('#dataChip').textContent=`${state.imageryName} · USGS 24H`;});
    map.on('error',e=>console.warn('MapLibre',e?.error||e));
    map.on('dragstart',()=>{$('#gestureHint').classList.add('hide');if(state.activeSheet)closeSheets()});map.on('zoomstart',()=>$('#gestureHint').classList.add('hide'));
  }catch(e){failBoot(e)}
}
function failBoot(err){console.error(err);bootStep(100,'La Terra non si è caricata.',String(err?.message||err));boot.bar.style.background='#ff7676';boot.retry.classList.remove('hidden')}
boot.retry.addEventListener('click',()=>location.reload());

async function fetchQuakes(){
  try{const r=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',{cache:'no-store'});if(!r.ok)throw new Error(`USGS HTTP ${r.status}`);const data=await r.json();state.quakes=data;renderQuakeStats(data);
    if(state.map&&state.map.isStyleLoaded()){
      if(state.map.getSource('quakes'))state.map.getSource('quakes').setData(data);else{state.map.addSource('quakes',{type:'geojson',data});state.map.addLayer({id:'quake-glow',type:'circle',source:'quakes',paint:{'circle-radius':['interpolate',['linear'],['get','mag'],0,6,7,14],'circle-color':'#ffcf70','circle-opacity':.16,'circle-blur':.6}});state.map.addLayer({id:'quakes',type:'circle',source:'quakes',paint:{'circle-radius':['interpolate',['linear'],['get','mag'],0,3,7,8],'circle-color':['interpolate',['linear'],['get','mag'],0,'#7be7ff',4,'#ffd36f',6,'#ff7676'],'circle-stroke-width':1.2,'circle-stroke-color':'#ffffff','circle-opacity':.94}});state.map.on('click','quakes',e=>showQuake(e.features?.[0]));state.map.on('mouseenter','quakes',()=>state.map.getCanvas().style.cursor='pointer');state.map.on('mouseleave','quakes',()=>state.map.getCanvas().style.cursor='');}
    }
    return true;
  }catch(e){console.warn('USGS failed',e);$('#dataChip').textContent=`${state.imageryName} · USGS non disponibile`;$('#quakeList').innerHTML='<div class="notice">Feed USGS temporaneamente non raggiungibile. La mappa resta utilizzabile.</div>';return false}
}
function renderQuakeStats(data){const features=[...(data.features||[])].filter(f=>Number.isFinite(f.properties?.mag));$('#liveQuakeCount').textContent=features.length.toLocaleString('it-IT');const max=[...features].sort((a,b)=>b.properties.mag-a.properties.mag)[0];if(max){$('#liveMaxMag').textContent=max.properties.mag.toFixed(1);$('#liveMaxPlace').textContent=max.properties.place||'—'}$('#quakeList').innerHTML=features.slice(0,30).map((f,i)=>`<button class="event" data-q="${i}"><span class="mag">${Number(f.properties.mag).toFixed(1)}</span><span class="event-copy"><b>${escapeHtml(f.properties.place||'Evento sismico')}</b><small>${new Date(f.properties.time).toLocaleString('it-IT')} · profondità ${Math.round(f.geometry.coordinates[2])} km</small></span></button>`).join('');$$('[data-q]').forEach(b=>b.addEventListener('click',()=>{const f=features[Number(b.dataset.q)];switchView('earth');state.map?.flyTo({center:[f.geometry.coordinates[0],f.geometry.coordinates[1]],zoom:5,duration:1200,essential:true});setTimeout(()=>showQuake(f),500)}))}
function showQuake(f){if(!f)return;const p=f.properties||{},c=f.geometry?.coordinates||[];$('#infoKicker').textContent='USGS · VERIFIED LIVE DATA';$('#infoTitle').textContent=p.place||'Terremoto';$('#infoBody').innerHTML=`<div class="source-card"><b>Magnitudo ${Number(p.mag).toFixed(1)}</b><span>Profondità: ${Math.round(c[2]||0)} km<br>${new Date(p.time).toLocaleString('it-IT')}<br>Coordinate: ${Number(c[1]).toFixed(3)}, ${Number(c[0]).toFixed(3)}</span></div><div class="source-card"><b class="ok">Fonte verificata</b><span>USGS Earthquake Hazards Program · feed GeoJSON all_day. Il dato viene richiesto direttamente al servizio USGS.</span></div>`;openSheet('#infoSheet')}
function showSources(){$('#infoKicker').textContent='SOURCE & CONFIDENCE';$('#infoTitle').textContent='Fonti Earth';$('#infoBody').innerHTML=`<div class="source-card"><b class="ok">${escapeHtml(state.imageryName)}</b><span>Immagini satellitari/aeree reali. Sono un mosaico, non una ripresa live. Provider selezionato automaticamente dopo un test di raggiungibilità.</span></div><div class="source-card"><b class="ok">USGS Earthquakes</b><span>Feed GeoJSON ufficiale delle ultime 24 ore. Aggiornamento automatico ogni 60 secondi mentre la pagina è aperta.</span></div><div class="source-card"><b>Ricerca luoghi</b><span>Geocodifica tramite Nominatim/OpenStreetMap nel prototipo. Verrà sostituita da un servizio production-grade prima del rilascio.</span></div>`;openSheet('#infoSheet')}

function home(){state.map?.flyTo({center:[12.5,20],zoom:1.65,pitch:0,bearing:0,duration:1200,essential:true})}$('#homeBtn').addEventListener('click',home);
$('#projectionBtn').addEventListener('click',()=>{if(!state.map)return;state.projection=state.projection==='globe'?'mercator':'globe';state.map.setProjection({type:state.projection});$('#projectionBtn').textContent=state.projection==='globe'?'3D':'2D';toast(state.projection==='globe'?'Globo 3D':'Mappa 2D')});
$('#locateBtn').addEventListener('click',()=>{if(!navigator.geolocation)return toast('Geolocalizzazione non disponibile');toast('Cerco la posizione…');navigator.geolocation.getCurrentPosition(p=>{state.map?.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:13,duration:1400,essential:true})},()=>toast('Posizione non autorizzata'),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})});
function setLayer(id,on){if(state.mapReady&&state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility',on?'visible':'none')}
$('#imageryToggle').addEventListener('click',e=>{state.imagery=!state.imagery;e.currentTarget.classList.toggle('on',state.imagery);setLayer('satellite',state.imagery)});$('#labelsToggle').addEventListener('click',e=>{state.labels=!state.labels;e.currentTarget.classList.toggle('on',state.labels);setLayer('labels',state.labels)});$('#quakeToggle').addEventListener('click',e=>{state.quakeLayer=!state.quakeLayer;e.currentTarget.classList.toggle('on',state.quakeLayer);setLayer('quakes',state.quakeLayer);setLayer('quake-glow',state.quakeLayer)});
$$('[data-place]').forEach(b=>b.addEventListener('click',()=>goPlace(b.dataset.place)));
function goPlace(key){const p=places[key];if(!p)return;closeSheets();switchView('earth');state.map?.flyTo({center:[p[0],p[1]],zoom:p[2],duration:1400,essential:true});toast(p[3])}
$('#searchForm').addEventListener('submit',async e=>{e.preventDefault();const q=$('#searchInput').value.trim();if(!q)return;const known=Object.entries(places).find(([,p])=>p[3].toLowerCase().includes(q.toLowerCase())||q.toLowerCase().includes(p[3].toLowerCase()));if(known)return goPlace(known[0]);const status=$('#searchStatus');status.textContent='Ricerca…';try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,{headers:{'Accept':'application/json'}});const a=await r.json();if(!a[0])throw new Error('Nessun risultato');const x=a[0];status.textContent=x.display_name;closeSheets();switchView('earth');state.map?.flyTo({center:[Number(x.lon),Number(x.lat)],zoom:11,duration:1400,essential:true});}catch(err){status.textContent=String(err.message||err)}});
$$('[data-action="sources"]').forEach(b=>b.addEventListener('click',showSources));$$('[data-action="missions"],[data-action="passport"]').forEach(b=>b.addEventListener('click',e=>toast(`${e.currentTarget.dataset.action} · in sviluppo`)));
function escapeHtml(v=''){return String(v).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
initMap();setInterval(()=>{if(document.visibilityState==='visible')fetchQuakes()},60000);