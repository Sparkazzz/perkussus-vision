(()=>{
  'use strict';

  // Preserve the multilingual observer guard used by the UI translation engine.
  const Native=window.MutationObserver;
  if(Native){
    window.MutationObserver=class extends Native{
      constructor(cb){super((records,observer)=>cb(records.filter(r=>r.type!=='characterData'||r.oldValue!==r.target.nodeValue),observer))}
      observe(target,options={}){const next={...options};if(next.characterData)next.characterDataOldValue=true;return super.observe(target,next)}
    };
  }

  const nativeFetch=window.fetch.bind(window);
  const supported=new Set(['it','en','fr','es','de','ru','hi','pt','zh','ja']);
  const nameLayers=new Set(['place','poi','transportation_name','water_name','waterway','mountain_peak','park','aerodrome_label']);

  function selectedLanguage(){
    let code='it';
    try{code=localStorage.getItem('pv_language')||'it'}catch{}
    return supported.has(code)?code:'it';
  }

  function languageFields(code){
    const fields=[];
    if(code==='zh')fields.push('name:zh-Hans','name:zh','name_zh');
    else fields.push(`name:${code}`,`name_${code}`);
    if(code==='en')fields.push('name_en');
    if(code==='de')fields.push('name_de');
    fields.push('name','name:latin','name_en');
    return [...new Set(fields)];
  }

  function preferredNameExpression(code){return ['coalesce',...languageFields(code).map(field=>['get',field])]}
  function hasNameReference(value){
    if(typeof value==='string')return /name(?::|_|\}|$)/.test(value);
    if(Array.isArray(value))return value.some(hasNameReference);
    if(value&&typeof value==='object')return Object.values(value).some(hasNameReference);
    return false;
  }
  function shouldLocalizeLayer(layer){
    if(!layer||layer.type!=='symbol'||!layer.layout||layer.layout['text-field']==null)return false;
    if(!hasNameReference(layer.layout['text-field']))return false;
    const sourceLayer=layer['source-layer'];
    if(nameLayers.has(sourceLayer))return true;
    const id=String(layer.id||'').toLowerCase();
    return /(place|city|country|state|village|poi|water|ocean|sea|river|mountain|peak|park|aerodrome|road.*name|street.*name)/.test(id)
      && !/(house|number|shield|ref)/.test(id);
  }
  function localizeStyle(style,code){
    if(!style||!Array.isArray(style.layers))return style;
    const expression=preferredNameExpression(code);
    for(const layer of style.layers){if(shouldLocalizeLayer(layer))layer.layout={...layer.layout,'text-field':expression}}
    return style;
  }
  function requestUrl(input){try{return typeof input==='string'?input:input?.url||''}catch{return ''}}

  // The prototype's point-by-point terrain classification was too sparse to be reliable.
  // Keep 3D elevation/terrain rendering, but skip the Overpass classification request.
  window.fetch=async function(input,init){
    const url=requestUrl(input);
    let u;try{u=new URL(url,location.href)}catch{}
    if(u&&u.hostname==='overpass-api.de'&&u.pathname.includes('/api/interpreter')){
      return new Response(JSON.stringify({elements:[]}),{status:200,headers:{'content-type':'application/json'}});
    }
    const isLibertyStyle=u&&u.hostname==='tiles.openfreemap.org'&&u.pathname.startsWith('/styles/liberty');
    if(!isLibertyStyle)return nativeFetch(input,init);
    const response=await nativeFetch(input,init);
    if(!response.ok)return response;
    try{
      const style=await response.clone().json();
      localizeStyle(style,selectedLanguage());
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(JSON.stringify(style),{status:response.status,statusText:response.statusText,headers});
    }catch(err){console.warn('Perkussus map label localization failed',err);return response}
  };

  const sourceText={
    it:'Posizione: OpenStreetMap/Nominatim. Elevazione: Open-Meteo su Copernicus DEM. Sintesi: Wikipedia. Sito ufficiale: Wikidata P856 quando disponibile.',
    en:'Position: OpenStreetMap/Nominatim. Elevation: Open-Meteo using Copernicus DEM. Summary: Wikipedia. Official website: Wikidata P856 when available.',
    fr:'Position : OpenStreetMap/Nominatim. Altitude : Open-Meteo avec Copernicus DEM. Synthèse : Wikipédia. Site officiel : Wikidata P856 lorsqu’il est disponible.',
    es:'Posición: OpenStreetMap/Nominatim. Elevación: Open-Meteo con Copernicus DEM. Resumen: Wikipedia. Sitio oficial: Wikidata P856 cuando está disponible.',
    de:'Position: OpenStreetMap/Nominatim. Höhe: Open-Meteo mit Copernicus DEM. Zusammenfassung: Wikipedia. Offizielle Website: Wikidata P856, sofern verfügbar.',
    ru:'Местоположение: OpenStreetMap/Nominatim. Высота: Open-Meteo по Copernicus DEM. Сводка: Wikipedia. Официальный сайт: Wikidata P856, если доступен.',
    hi:'स्थान: OpenStreetMap/Nominatim। ऊँचाई: Copernicus DEM पर आधारित Open-Meteo। सारांश: Wikipedia। आधिकारिक वेबसाइट: उपलब्ध होने पर Wikidata P856।',
    pt:'Posição: OpenStreetMap/Nominatim. Elevação: Open-Meteo com Copernicus DEM. Resumo: Wikipedia. Site oficial: Wikidata P856 quando disponível.',
    zh:'位置：OpenStreetMap/Nominatim。海拔：基于 Copernicus DEM 的 Open-Meteo。摘要：Wikipedia。官方网站：可用时来自 Wikidata P856。',
    ja:'位置: OpenStreetMap/Nominatim。標高: Copernicus DEM を利用する Open-Meteo。概要: Wikipedia。公式サイト: 利用可能な場合は Wikidata P856。'
  };

  function cleanInspector(){
    const body=document.querySelector('#infoBody');if(!body)return;
    const metrics=[...body.querySelectorAll('.info-grid .info-metric')];
    if(metrics.length===4)metrics[2]?.remove();
    body.querySelectorAll('.tag-row').forEach(el=>el.remove());
    for(const span of body.querySelectorAll('.source-card span')){
      if(/Overpass|Terreno e superficie|Terrain and surface|Terrain et surface|Terreno y superficie|Gelände und Oberfläche|рельеф|भूमि|Terreno e superfície|地表|地形/.test(span.textContent||'')){
        span.textContent=sourceText[selectedLanguage()]||sourceText.en;
      }
    }
  }
  function startInspectorCleanup(){
    const root=document.querySelector('#infoBody');if(!root||!Native)return;
    cleanInspector();
    new Native(()=>cleanInspector()).observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startInspectorCleanup,{once:true});else startInspectorCleanup();
})();
