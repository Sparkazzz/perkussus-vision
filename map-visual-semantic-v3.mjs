const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_VISUAL_SEMANTIC_V3__){
 window.__PV_VISUAL_SEMANTIC_V3__=true;
 let map=null,timer=null,applying=false;
 function isPoiLayer(l){const sl=String(l?.['source-layer']||'').toLowerCase(),id=String(l?.id||'').toLowerCase();return l?.type==='symbol'&&(sl==='poi'||/poi|amenity|shop|parking|relig|church|hospital|medical|school|university|station|transit|park|museum|attraction|aerodrome|sport/i.test(`${id} ${sl}`))}
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
    // Preserve the style's original minzoom: this is what provides progressive disclosure.
    // Only extend the high end so a POI that has appeared does not disappear again when zooming further in.
    try{const min=Number(l.minzoom??0),max=Number(l.maxzoom??24);if(max<24)map.setLayerZoomRange(id,min,24)}catch{}
    if(l.type==='symbol'){
     setLayout(id,'visibility','visible');
     // Icons have priority and may remain visible; text still participates in collision detection.
     setLayout(id,'icon-allow-overlap',true);
     setLayout(id,'icon-ignore-placement',false);
     setLayout(id,'text-allow-overlap',false);
     setLayout(id,'text-ignore-placement',false);
     setLayout(id,'text-optional',true);
     setLayout(id,'text-padding',4);
     setLayout(id,'icon-padding',2);
     setPaint(id,'text-opacity',1);
     setPaint(id,'icon-opacity',1);
     setPaint(id,'text-color',dark?'#ffffff':'#273141');
     setPaint(id,'text-halo-color',dark?'rgba(0,0,0,.92)':'rgba(255,255,255,.98)');
     setPaint(id,'text-halo-width',dark?1.8:1.6);
     setPaint(id,'text-halo-blur',.15);
    }
   }
  }finally{applying=false}
 }
 function schedule(ms=45){clearTimeout(timer);timer=setTimeout(apply,ms)}
 async function init(){for(let i=0;i<180;i++){if(window.__PV_MAP__?.getStyle){map=window.__PV_MAP__;break}await sleep(50)}if(!map)return;schedule(20);map.on('styledata',()=>schedule(90));map.on('zoomend',()=>schedule(30));map.on('idle',()=>schedule(60));map.on('moveend',()=>schedule(60))}
 init();
}
