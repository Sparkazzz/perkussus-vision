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

  // Localize the OpenFreeMap/OpenMapTiles labels before MapLibre receives the style.
  // This makes country, city, sea, mountain, POI and road names follow the language selected in Perkussus.
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
    // Prefer the requested language. If it is not available, retain the locally accepted name.
    fields.push('name','name:latin','name_en');
    return [...new Set(fields)];
  }

  function preferredNameExpression(code){
    return ['coalesce',...languageFields(code).map(field=>['get',field])];
  }

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
    // Some upstream style layers use slightly different source-layer names; cover label layers without touching house numbers or shields.
    const id=String(layer.id||'').toLowerCase();
    return /(place|city|country|state|village|poi|water|ocean|sea|river|mountain|peak|park|aerodrome|road.*name|street.*name)/.test(id)
      && !/(house|number|shield|ref)/.test(id);
  }

  function localizeStyle(style,code){
    if(!style||!Array.isArray(style.layers))return style;
    const expression=preferredNameExpression(code);
    for(const layer of style.layers){
      if(!shouldLocalizeLayer(layer))continue;
      layer.layout={...layer.layout,'text-field':expression};
    }
    return style;
  }

  function styleRequestUrl(input){
    try{return typeof input==='string'?input:input?.url||''}catch{return ''}
  }

  window.fetch=async function(input,init){
    const url=styleRequestUrl(input);
    let u;
    try{u=new URL(url,location.href)}catch{}
    const isLibertyStyle=u&&u.hostname==='tiles.openfreemap.org'&&u.pathname.startsWith('/styles/liberty');
    if(!isLibertyStyle)return nativeFetch(input,init);

    const response=await nativeFetch(input,init);
    if(!response.ok)return response;
    try{
      const style=await response.clone().json();
      localizeStyle(style,selectedLanguage());
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(JSON.stringify(style),{status:response.status,statusText:response.statusText,headers});
    }catch(err){
      console.warn('Perkussus map label localization failed',err);
      return response;
    }
  };
})();
