const sleep=ms=>new Promise(r=>setTimeout(r,ms));
if(!window.__PV_CATEGORY_DECLUTTER_V1__){
 window.__PV_CATEGORY_DECLUTTER_V1__=true;
 let map=null,timer=null;
 function apply(){if(!map?.isStyleLoaded?.())return;try{if(map.getLayer('pv-poi-points'))map.setLayerZoomRange('pv-poi-points',10,24)}catch{}try{if(map.getLayer('pv-poi-labels')){
  map.setLayerZoomRange('pv-poi-labels',13,24);
  map.setLayoutProperty('pv-poi-labels','text-allow-overlap',false);
  map.setLayoutProperty('pv-poi-labels','text-ignore-placement',false);
  map.setLayoutProperty('pv-poi-labels','text-padding',5);
  map.setLayoutProperty('pv-poi-labels','text-size',['interpolate',['linear'],['zoom'],13,11,15,12,17,13.5,20,15]);
  map.setPaintProperty('pv-poi-labels','text-halo-width',2);
 }}catch{}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(apply,30)}
 (async()=>{for(let i=0;i<180;i++){if(window.__PV_MAP__?.getStyle){map=window.__PV_MAP__;break}await sleep(50)}if(!map)return;map.on('styledata',schedule);map.on('idle',schedule);map.on('zoomend',schedule);schedule()})();
}
