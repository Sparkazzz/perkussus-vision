const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_WORLD_LABEL_HIERARCHY_V1__){
 window.__PV_WORLD_LABEL_HIERARCHY_V1__=true;
 let map=null,timer=null,lastBand='';
 const eq=(a,b)=>{try{return JSON.stringify(a)===JSON.stringify(b)}catch{return a===b}};
 function setLayout(id,key,val){try{if(!map.getLayer(id))return;const cur=map.getLayoutProperty(id,key);if(!eq(cur,val))map.setLayoutProperty(id,key,val)}catch{}}
 function setFilter(id,val){try{if(map.getLayer(id))map.setFilter(id,val)}catch{}}
 function setZoom(id,min,max){try{if(map.getLayer(id))map.setLayerZoomRange(id,min,max)}catch{}}
 function geometry(kind){return ['match',['geometry-type'],kind==='point'?['MultiPoint','Point']:['LineString','MultiLineString'],true,false]}
 function waterFilter(kind,classes){return ['all',geometry(kind),['match',['get','class'],classes,true,false]]}
 function band(z){if(z<2.6)return'world';if(z<4.3)return'continental';if(z<5.8)return'regional';return'local'}
 function satelliteOn(){try{return !!map.getLayer('satellite-real')&&map.getLayoutProperty('satellite-real','visibility')!=='none'}catch{return false}}
 function buildingsEnabled(){const b=document.querySelector('#buildingsToggle');return b?b.classList.contains('on'):true}
 function syncBuildings(){
  const hide=satelliteOn(),enabled=buildingsEnabled();
  for(const l of map?.getStyle?.()?.layers||[]){
   const sl=String(l?.['source-layer']||'').toLowerCase(),id=String(l?.id||'').toLowerCase();
   if(l?.type!=='fill-extrusion')continue;
   if(sl!=='building'&&!/building/.test(id))continue;
   setLayout(l.id,'visibility',hide||!enabled?'none':'visible');
  }
 }
 function apply(){
  if(!map?.isStyleLoaded?.())return;
  const z=map.getZoom(),b=band(z);lastBand=b;
  // Countries and global labels: collision detection always wins over density.
  for(const l of map.getStyle()?.layers||[]){
   if(l.type!=='symbol')continue;
   const sl=String(l['source-layer']||'').toLowerCase(),id=String(l.id||'').toLowerCase();
   if(sl==='place'||sl==='water_name'||/label_country|label_state|label_city|water_name/i.test(id)){
    setLayout(l.id,'text-allow-overlap',false);
    setLayout(l.id,'text-ignore-placement',false);
    setLayout(l.id,'text-padding',z<4?8:z<7?6:4);
   }
  }
  // Greenland and other rank-3 countries may enter slightly earlier, while collision still controls clutter.
  setZoom('label_country_3',1.35,9);
  setZoom('label_country_2',0,9);
  setZoom('label_country_1',0,9);
  // Water hierarchy: do not show every bay/lake on a planet-scale view.
  let pointClasses,lineClasses;
  if(b==='world'){pointClasses=['ocean','sea'];lineClasses=['ocean','sea']}
  else if(b==='continental'){pointClasses=['ocean','sea','strait'];lineClasses=['ocean','sea','strait']}
  else if(b==='regional'){pointClasses=['ocean','sea','strait','bay'];lineClasses=['ocean','sea','strait','bay']}
  else{pointClasses=['ocean','sea','strait','bay','lake'];lineClasses=['ocean','sea','strait','bay','lake']}
  setFilter('water_name_point_label',waterFilter('point',pointClasses));
  setFilter('water_name_line_label',waterFilter('line',lineClasses));
  setLayout('water_name_point_label','symbol-sort-key',['match',['get','class'],'ocean',0,'sea',1,'strait',2,'bay',3,'lake',4,9]);
  setLayout('water_name_line_label','symbol-sort-key',['match',['get','class'],'ocean',0,'sea',1,'strait',2,'bay',3,'lake',4,9]);
  setLayout('water_name_point_label','text-padding',z<4?14:z<6?10:6);
  setLayout('water_name_line_label','text-padding',z<4?18:z<6?12:7);
  // Satellite imagery must remain photographic: vector building extrusions otherwise cover real roofs with grey blocks.
  syncBuildings();
 }
 function schedule(ms=25){clearTimeout(timer);timer=setTimeout(apply,ms)}
 async function init(){
  for(let i=0;i<180;i++){if(window.__PV_MAP__?.getStyle){map=window.__PV_MAP__;break}await sleep(50)}
  if(!map)return;schedule(10);
  map.on('zoom',()=>{const b=band(map.getZoom());if(b!==lastBand)schedule(0)});
  map.on('styledata',()=>schedule(90));
  map.on('idle',()=>schedule(50));
  document.addEventListener('click',e=>{if(e.target.closest?.('#mapModeBtn,[data-base],#buildingsToggle')){schedule(0);setTimeout(()=>schedule(0),60)}},true);
 }
 init();
}
