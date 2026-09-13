const MAPLIBRE_URLS=[
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs',
  'https://unpkg.com/maplibre-gl@6.9.0/dist/maplibre-gl.mjs'
];
let maplibre=null;
for(const url of MAPLIBRE_URLS){try{maplibre=await import(url);break}catch(e){console.warn('Perkussus bridge: MapLibre import failed',url,e)}}
if(!maplibre?.Map)throw new Error('Perkussus bridge: MapLibre unavailable');

const MapClass=maplibre.Map;
const nativeOn=MapClass.prototype.on;
const attached=new WeakSet();
const originals=new WeakMap();
const language=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const osmLang=()=>language()==='zh'?'zh':language();

function sourceLayer(f){return String(f?.sourceLayer||f?.layer?.['source-layer']||'').toLowerCase()}
function layerId(f){return String(f?.layer?.id||'').toLowerCase()}
function isPoi(f){const sl=sourceLayer(f),id=layerId(f),p=f?.properties||{};return sl==='poi'||/poi|amenity|shop|restaurant|pharmacy|hospital|hotel|cafe|museum|attraction|station|airport|fuel|parking/i.test(id)||!!(p.amenity||p.shop||p.tourism||p.healthcare)}
function semantic(f){const sl=sourceLayer(f),id=layerId(f),p=f?.properties||{},type=f?.layer?.type;const named=!!(p.name||p[`name:${osmLang()}`]||p['name:en']||p.ref);if(!named)return false;if(isPoi(f))return true;if(type==='symbol'&&(/place|transportation_name|road|street|water_name|mountain|aerodrome/i.test(sl+' '+id)))return true;if(type==='line'&&/road|street|transportation/i.test(sl+' '+id))return true;return false}
function localizeMap(map){
  if(!map?.isStyleLoaded?.())return;
  let saved=originals.get(map);if(!saved){saved=new Map();originals.set(map,saved)}
  const lang=osmLang(),supported=/^(place|poi|water_name|waterway|mountain_peak|aerodrome_label|transportation_name)$/;
  for(const layer of map.getStyle()?.layers||[]){
    if(layer.type!=='symbol'||!supported.test(String(layer['source-layer']||'')))continue;
    try{
      if(!saved.has(layer.id))saved.set(layer.id,map.getLayoutProperty(layer.id,'text-field'));
      const base=saved.get(layer.id);if(base==null)continue;
      map.setLayoutProperty(layer.id,'text-field',['coalesce',['get',`name:${lang}`],['get',`name_${lang}`],base]);
    }catch{}
  }
}
function attach(map){
  window.__PV_MAP__=map;
  if(attached.has(map))return;attached.add(map);
  try{nativeOn.call(map,'load',()=>setTimeout(()=>localizeMap(map),120));nativeOn.call(map,'styledata',()=>setTimeout(()=>localizeMap(map),80))}catch{}
}
MapClass.prototype.on=function(type,targetOrListener,listener){
  attach(this);
  if(type==='click'&&typeof targetOrListener==='function'&&listener===undefined){
    const fn=targetOrListener;
    const wrapped=e=>{
      let hits=[];
      try{hits=this.queryRenderedFeatures([[e.point.x-7,e.point.y-7],[e.point.x+7,e.point.y+7]])||[]}catch{}
      try{if(this.getLayer?.('quakes')){const q=this.queryRenderedFeatures(e.point,{layers:['quakes']});if(q?.length)return fn.call(this,e)}}catch{}
      if(hits.some(isPoi))return;
      if(!hits.some(semantic))return;
      return fn.call(this,e);
    };
    return nativeOn.call(this,type,wrapped);
  }
  return nativeOn.apply(this,arguments);
};

window.__PV_MAPLIBRE__=maplibre;
