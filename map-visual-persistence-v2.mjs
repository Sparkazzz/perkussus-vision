const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_VISUAL_PERSISTENCE_V2__){
 window.__PV_VISUAL_PERSISTENCE_V2__=true;
 let map=null,timer=null,applying=false;
 function isPoiLayer(l){const sl=String(l?.['source-layer']||'').toLowerCase(),id=String(l?.id||'').toLowerCase();return l?.type==='symbol'&&(sl==='poi'||/poi|amenity|shop|parking|relig|church|hospital|medical|school|university|station|transit|park|museum|attraction|aerodrome/i.test(`${id} ${sl}`))}
 function same(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch{return a===b}}
 function setLayout(id,k,v){try{const cur=map.getLayoutProperty(id,k);if(!same(cur,v))map.setLayoutProperty(id,k,v)}catch{}}
 function setPaint(id,k,v){try{const cur=map.getPaintProperty(id,k);if(!same(cur,v))map.setPaintProperty(id,k,v)}catch{}}
 function satellite(){try{return map.getLayer('satellite-real')&&map.getLayoutProperty('satellite-real','visibility')!=='none'}catch{return false}}
 function apply(){
  if(applying||!map?.isStyleLoaded?.())return;applying=true;
  try{
   const dark=satellite();
   for(const l of map.getStyle()?.layers||[]){
    if(!isPoiLayer(l)&&!String(l.id||'').startsWith('pv-poi-'))continue;
    const id=l.id;
    try{const min=Number(l.minzoom??14),max=Number(l.maxzoom??24);if(min>14||max<24)map.setLayerZoomRange(id,Math.min(min,14),24)}catch{}
    if(l.type==='symbol'){
     setLayout(id,'visibility','visible');
     setLayout(id,'text-allow-overlap',true);setLayout(id,'text-ignore-placement',true);setLayout(id,'icon-allow-overlap',true);setLayout(id,'icon-ignore-placement',true);
     setLayout(id,'text-padding',1);setLayout(id,'icon-padding',0);
     const tf=map.getLayoutProperty(id,'text-field');if(tf!=null)setLayout(id,'text-size',['interpolate',['linear'],['zoom'],14,12,16,13.5,18,15,20,16]);
     setPaint(id,'text-opacity',1);setPaint(id,'icon-opacity',1);setPaint(id,'text-color',dark?'#ffffff':'#273141');setPaint(id,'text-halo-color',dark?'rgba(0,0,0,.96)':'rgba(255,255,255,.98)');setPaint(id,'text-halo-width',dark?2.4:2.2);setPaint(id,'text-halo-blur',.15);
    }
   }
  }finally{applying=false}
 }
 function schedule(ms=50){clearTimeout(timer);timer=setTimeout(apply,ms)}
 async function init(){for(let i=0;i<180;i++){if(window.__PV_MAP__?.getStyle){map=window.__PV_MAP__;break}await sleep(50)}if(!map)return;schedule(20);map.on('styledata',()=>schedule(80));map.on('zoomend',()=>schedule(20));map.on('idle',()=>schedule(35));map.on('moveend',()=>schedule(35))}
 init();
}
