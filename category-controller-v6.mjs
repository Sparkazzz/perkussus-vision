const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_CATEGORY_V6__){
 window.__PV_CATEGORY_V6__=true;
 const text={it:{loading:'Aggiorno…',results:'risultati',none:'Nessun risultato in questa zona',zoom:'Avvicinati ancora alla città',off:'Filtro disattivato'},en:{loading:'Updating…',results:'results',none:'No results in this area',zoom:'Zoom further into the city',off:'Filter off'}};
 const tr=()=>text[lang()]||text.en;
 const BUNDLED=new Set(['restaurant','cafe','hotel','parking','pharmacy','supermarket','hospital','fuel','charging','museum','attraction','park','station','airport','atm','bank','bakery','toilets','post']);
 let map=null,active='',rows=[],seq=0,aborter=null,moveTimer=null,styleTimer=null,bundle=null,bundleBox=null,bundleAt=0,bundlePromise=null,bundleAborter=null,bundlePendingBox=null,bundleSeq=0;
 const cache=new Map();
 const style=document.createElement('style');
 style.textContent='.pv-category-chip{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.pv-category-chip.pv-busy{position:relative}.pv-category-chip.pv-busy:after{content:"";width:9px;height:9px;border:2px solid rgba(255,255,255,.22);border-top-color:#72e8ff;border-radius:50%;margin-left:3px;animation:pvCatSpin .55s linear infinite}.pv-category-chip.active:not(.pv-busy):after{content:"×";font-size:16px;line-height:1;margin-left:3px;opacity:.86}@keyframes pvCatSpin{to{transform:rotate(360deg)}}';
 document.head.appendChild(style);
 function status(msg,error=false){const e=$('#pvMapSearchStatus');if(!e)return;e.textContent=msg;e.classList.toggle('error',error);e.classList.add('show');clearTimeout(status.t);status.t=setTimeout(()=>e.classList.remove('show'),1700)}
 function label(id){return document.querySelector(`[data-pv-cat="${CSS.escape(id)}"]`)?.textContent?.replace('×','').trim()||id}
 function sync(){$$('[data-pv-cat]').forEach(b=>{const on=b.dataset.pvCat===active;b.classList.toggle('active',on);b.classList.toggle('pv-busy',on&&!!aborter);b.setAttribute('aria-pressed',on?'true':'false')})}
 function remove(){if(!map)return;for(const id of ['pv-poi-labels','pv-poi-points'])try{if(map.getLayer(id))map.removeLayer(id)}catch{}try{if(map.getSource('pv-poi-results'))map.removeSource('pv-poi-results')}catch{}}
 function clear(show=true){active='';seq++;aborter?.abort();aborter=null;rows=[];remove();sync();if(show)status(tr().off)}
 function bbox(){const b=map.getBounds();return{south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()}}
 function round(v){return Math.round(Number(v)*10000)/10000}
 function pad(b,p=.1){const dy=(b.north-b.south)*p,dx=(b.east-b.west)*p;return{south:round(b.south-dy),west:round(b.west-dx),north:round(b.north+dy),east:round(b.east+dx)}}
 function contains(a,b){return!!a&&a.south<=b.south&&a.west<=b.west&&a.north>=b.north&&a.east>=b.east}
 function render(list,id){
  remove();rows=list||[];if(!rows.length)return;const features=rows.map((r,n)=>({type:'Feature',geometry:{type:'Point',coordinates:[r.lon,r.lat]},properties:{key:`${r.type}_${r.id}_${n}`,label:r.name||label(id),kind:r.kind||''}}));
  try{map.addSource('pv-poi-results',{type:'geojson',data:{type:'FeatureCollection',features}});map.addLayer({id:'pv-poi-points',type:'circle',source:'pv-poi-results',minzoom:10,maxzoom:24,paint:{'circle-radius':['interpolate',['linear'],['zoom'],10,6,14,8,17,10,20,11],'circle-color':'#72e8ff','circle-stroke-width':2.2,'circle-stroke-color':'#07101b','circle-opacity':1}});map.addLayer({id:'pv-poi-labels',type:'symbol',source:'pv-poi-results',minzoom:10,maxzoom:24,layout:{'text-field':['get','label'],'text-size':['interpolate',['linear'],['zoom'],10,11,14,12.5,18,15,20,16],'text-offset':[0,1.35],'text-anchor':'top','text-max-width':13,'text-allow-overlap':true,'text-ignore-placement':true,'text-padding':1},paint:{'text-color':'#fff','text-halo-color':'#07101b','text-halo-width':2.4,'text-halo-blur':.2,'text-opacity':1}})}catch(e){console.warn('category render',e)}
 }
 async function fetchCategory(id,box,signal){const u=new URL('/api/nearby',location.origin);Object.entries({mode:'category',category:id,south:round(box.south),west:round(box.west),north:round(box.north),east:round(box.east),lang:lang()}).forEach(([k,v])=>u.searchParams.set(k,String(v)));const r=await fetch(u,{headers:{accept:'application/json'},cache:'default',signal});if(!r.ok)throw new Error(`POI ${r.status}`);return r.json()}
 async function prefetch(force=false){
  if(!map||(map.getZoom?.()||0)<11.5)return null;const now=bbox();if(!force&&bundle&&Date.now()-bundleAt<300000&&contains(bundleBox,now))return bundle;if(bundlePromise&&contains(bundlePendingBox,now))return bundlePromise;if(bundlePromise&&!contains(bundlePendingBox,now)){bundleSeq++;bundleAborter?.abort();bundlePromise=null;bundlePendingBox=null}
  const box=pad(now,.1);if(box.north-box.south>1||box.east-box.west>1)return null;const mine=++bundleSeq;bundlePendingBox=box;bundleAborter=new AbortController();
  bundlePromise=(async()=>{try{const u=new URL('/api/poi-bundle',location.origin);Object.entries({...box,lang:lang()}).forEach(([k,v])=>u.searchParams.set(k,String(v)));const r=await fetch(u,{headers:{accept:'application/json'},cache:'default',signal:bundleAborter.signal});if(!r.ok)throw new Error(`bundle ${r.status}`);const data=await r.json();if(mine!==bundleSeq)return null;bundle=data;bundleBox=box;bundleAt=Date.now();for(const id of BUNDLED){const list=data.groups?.[id]||[];cache.set(id,{box,time:bundleAt,rows:list,count:data.counts?.[id]??list.length,complete:true})}if(active&&contains(box,bbox())){const c=cache.get(active);if(c){render(c.rows,active);status(`${c.count} ${tr().results} · ${label(active)}`,!c.rows.length)}}return data}catch(e){if(e.name!=='AbortError')console.warn('category prefetch',e);return null}finally{if(mine===bundleSeq){bundlePromise=null;bundleAborter=null;bundlePendingBox=null}}})();return bundlePromise
 }
 function cached(id,b){const c=cache.get(id);return c&&Date.now()-c.time<300000&&contains(c.box,b)?c:null}
 async function select(id,user=true){
  if(!map)return;if(user&&active===id)return clear(true);active=id;const mine=++seq;aborter?.abort();aborter=null;sync();const z=map.getZoom?.()||0;if(z<10)return status(tr().zoom,true);const b=bbox();if(b.north-b.south>1.8||b.east-b.west>1.8)return status(tr().zoom,true);
  let c=cached(id,b);if(c){render(c.rows,id);status(`${c.count} ${tr().results} · ${label(id)}`,!c.rows.length);if(c.complete&&Date.now()-c.time<60000)return}
  if(BUNDLED.has(id)&&z>=11.5&&!c){prefetch(false);if(bundlePromise){await Promise.race([bundlePromise,new Promise(r=>setTimeout(r,70))]);if(mine!==seq||active!==id)return;c=cached(id,b);if(c){render(c.rows,id);status(`${c.count} ${tr().results} · ${label(id)}`,!c.rows.length);if(c.complete)return}}}
  aborter=new AbortController();sync();if(user&&!c)status(`${tr().loading} ${label(id)}`);
  try{const data=await fetchCategory(id,b,aborter.signal);if(mine!==seq||active!==id)return;const item={box:pad(b,.04),time:Date.now(),rows:data.rows||[],count:data.count??(data.rows||[]).length,complete:true};cache.set(id,item);render(item.rows,id);status(`${item.count} ${tr().results} · ${label(id)}`,!item.rows.length)}catch(e){if(e.name!=='AbortError'&&mine===seq&&!c)status(tr().none,true)}finally{if(mine===seq){aborter=null;sync()}}
 }
 function bind(){let down=null,suppressUntil=0,lastHandled=0;document.addEventListener('pointerdown',e=>{const b=e.target.closest?.('[data-pv-cat]');if(b)down={id:b.dataset.pvCat,x:e.clientX,y:e.clientY,t:Date.now()}},true);document.addEventListener('pointerup',e=>{const b=e.target.closest?.('[data-pv-cat]');if(!b||!down)return;const d=down;down=null;const moved=Math.hypot(e.clientX-d.x,e.clientY-d.y),elapsed=Date.now()-d.t;if(moved>12||elapsed>750){suppressUntil=Date.now()+450;return}e.preventDefault();e.stopImmediatePropagation();lastHandled=Date.now();suppressUntil=Date.now()+800;select(b.dataset.pvCat,true)},true);document.addEventListener('click',e=>{const b=e.target.closest?.('[data-pv-cat]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(Date.now()<suppressUntil||Date.now()-lastHandled<800)return;select(b.dataset.pvCat,true)},true);const strip=$('#pvCategoryStrip');if(strip)new MutationObserver(sync).observe(strip,{childList:true,subtree:true});sync()}
 async function init(){for(let i=0;i<160;i++){if(window.__PV_MAP__?.getZoom&&$('#pvCategoryStrip')){map=window.__PV_MAP__;break}await sleep(50)}if(!map)return;bind();setTimeout(()=>prefetch(false),30);map.on('moveend',()=>{clearTimeout(moveTimer);moveTimer=setTimeout(()=>{prefetch(false);if(active)select(active,false)},130)});map.on('zoomend',()=>setTimeout(()=>prefetch(false),25));map.on('styledata',()=>{clearTimeout(styleTimer);styleTimer=setTimeout(()=>{if(active&&rows.length&&!map.getSource('pv-poi-results'))render(rows,active)},80)})}
 init();
}
