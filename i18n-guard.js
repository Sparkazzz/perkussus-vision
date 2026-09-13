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
  window.__PV_MAP_ZOOM__=Number.isFinite(window.__PV_MAP_ZOOM__)?window.__PV_MAP_ZOOM__:1.7;

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

  function observeMapZoom(u){
    if(!u)return;
    const host=u.hostname||'';
    if(!/(openfreemap|openstreetmap|arcgisonline|maps\.eox|mapterhorn)/i.test(host))return;
    const match=u.pathname.match(/\/(\d{1,2})\/\d+\/\d+(?:\.(?:pbf|mvt|png|jpe?g|webp))?(?:$|\/)/i);
    if(!match)return;
    const z=Number(match[1]);
    if(Number.isFinite(z)&&z>=0&&z<=22)window.__PV_MAP_ZOOM__=z;
  }

  // Keep 3D elevation/terrain rendering, but skip the former sparse Overpass land-use classification.
  window.fetch=async function(input,init){
    const url=requestUrl(input);
    let u;try{u=new URL(url,location.href)}catch{}
    observeMapZoom(u);
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

  const searchCopy={
    it:{hint:'Suggerimenti globali',none:'Nessun suggerimento',loading:'Cerco luoghi…'},
    en:{hint:'Global suggestions',none:'No suggestions',loading:'Searching places…'},
    fr:{hint:'Suggestions mondiales',none:'Aucune suggestion',loading:'Recherche de lieux…'},
    es:{hint:'Sugerencias globales',none:'Sin sugerencias',loading:'Buscando lugares…'},
    de:{hint:'Globale Vorschläge',none:'Keine Vorschläge',loading:'Orte werden gesucht…'},
    ru:{hint:'Глобальные подсказки',none:'Нет подсказок',loading:'Поиск мест…'},
    hi:{hint:'वैश्विक सुझाव',none:'कोई सुझाव नहीं',loading:'स्थान खोजे जा रहे हैं…'},
    pt:{hint:'Sugestões globais',none:'Sem sugestões',loading:'A procurar lugares…'},
    zh:{hint:'全球搜索建议',none:'没有建议',loading:'正在搜索地点…'},
    ja:{hint:'世界中の候補',none:'候補がありません',loading:'場所を検索中…'}
  };

  function placeTypeLabel(p){
    const raw=String(p?.type||p?.osm_value||p?.osm_key||'place').replaceAll('_',' ');
    return raw.charAt(0).toUpperCase()+raw.slice(1);
  }
  function suggestionSubtitle(p){
    const parts=[p.street,p.city,p.district,p.county,p.state,p.country].filter(Boolean);
    return [...new Set(parts)].join(' · ');
  }
  function addSearchEnhancements(){
    const input=document.querySelector('#searchInput');
    const form=document.querySelector('#searchForm');
    const status=document.querySelector('#searchStatus');
    if(!input||!form||!status||document.querySelector('#searchSuggestions'))return;

    const style=document.createElement('style');
    style.textContent=`
      .search-row{position:relative;z-index:3}.search-suggestions{display:none;margin:-2px 0 10px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:#0d1626;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,.28)}
      .search-suggestions.open{display:block}.suggest-head{padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.07);font-size:9px;color:#96a3b8;letter-spacing:.08em;text-transform:uppercase}
      .suggest-item{width:100%;display:flex;gap:10px;align-items:center;padding:11px 12px;border:0;border-bottom:1px solid rgba(255,255,255,.06);background:transparent;color:#fff;text-align:left}.suggest-item:last-child{border-bottom:0}.suggest-item.active,.suggest-item:active{background:rgba(114,232,255,.09)}
      .suggest-icon{width:36px;height:36px;flex:0 0 auto;border-radius:11px;background:rgba(114,232,255,.08);display:grid;place-items:center;color:#72e8ff;font-size:15px}.suggest-copy{min-width:0;flex:1}.suggest-copy b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.suggest-copy small{display:block;margin-top:3px;color:#96a3b8;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.suggest-type{font-size:8px;color:#96a3b8;text-transform:uppercase;letter-spacing:.06em;max-width:72px;text-align:right}
    `;
    document.head.appendChild(style);
    const box=document.createElement('div');box.id='searchSuggestions';box.className='search-suggestions';box.setAttribute('role','listbox');status.after(box);

    let timer=0,controller=null,items=[],active=-1,cache=new Map();
    const close=()=>{box.classList.remove('open');box.innerHTML='';items=[];active=-1};
    const render=(features,q)=>{
      const lang=selectedLanguage(),copy=searchCopy[lang]||searchCopy.en;
      items=features||[];active=-1;
      if(!q||q.length<2){close();return}
      box.innerHTML=`<div class="suggest-head">${copy.hint}</div>`+(items.length?items.map((f,i)=>{const p=f.properties||{},name=p.name||p.street||p.city||p.country||q,sub=suggestionSubtitle(p),type=placeTypeLabel(p);return `<button type="button" class="suggest-item" role="option" data-sidx="${i}"><span class="suggest-icon">⌖</span><span class="suggest-copy"><b>${escapeHtmlSafe(name)}</b><small>${escapeHtmlSafe(sub||p.country||'')}</small></span><span class="suggest-type">${escapeHtmlSafe(type)}</span></button>`}).join(''):`<div class="suggest-head">${copy.none}</div>`);
      box.classList.add('open');
      box.querySelectorAll('[data-sidx]').forEach(btn=>btn.addEventListener('click',()=>choose(Number(btn.dataset.sidx))));
    };
    const escapeHtmlSafe=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    const choose=i=>{const f=items[i];if(!f)return;const p=f.properties||{},name=p.name||p.street||p.city||p.country||input.value;input.value=name;close();form.requestSubmit()};
    const refreshActive=()=>box.querySelectorAll('.suggest-item').forEach((el,i)=>{el.classList.toggle('active',i===active);el.setAttribute('aria-selected',i===active?'true':'false')});

    input.addEventListener('input',()=>{
      clearTimeout(timer);const q=input.value.trim();if(q.length<2){close();return}
      timer=setTimeout(async()=>{
        const key=`${selectedLanguage()}|${q.toLowerCase()}`;
        if(cache.has(key)){render(cache.get(key),q);return}
        controller?.abort();controller=new AbortController();
        const copy=searchCopy[selectedLanguage()]||searchCopy.en;box.innerHTML=`<div class="suggest-head">${copy.loading}</div>`;box.classList.add('open');
        try{
          const r=await nativeFetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`,{signal:controller.signal,headers:{Accept:'application/json'}});
          if(!r.ok)throw new Error(`Photon ${r.status}`);const j=await r.json();const results=(j.features||[]).filter(f=>Array.isArray(f.geometry?.coordinates));cache.set(key,results);if(cache.size>60)cache.delete(cache.keys().next().value);if(input.value.trim()===q)render(results,q);
        }catch(e){if(e?.name!=='AbortError')close()}
      },280);
    });
    input.addEventListener('keydown',e=>{
      if(!box.classList.contains('open')||!items.length){if(e.key==='Escape')close();return}
      if(e.key==='ArrowDown'){e.preventDefault();active=(active+1)%items.length;refreshActive()}
      else if(e.key==='ArrowUp'){e.preventDefault();active=(active-1+items.length)%items.length;refreshActive()}
      else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(active)}
      else if(e.key==='Escape'){e.preventDefault();close()}
    });
    document.addEventListener('pointerdown',e=>{if(!box.contains(e.target)&&e.target!==input)close()});
  }

  function addFarZoomInspectionGuard(){
    const map=document.querySelector('#map');if(!map||map.dataset.pvClickGuard)return;map.dataset.pvClickGuard='1';
    const MIN_DETAIL_ZOOM=8;
    map.addEventListener('click',e=>{
      const z=Number(window.__PV_MAP_ZOOM__??1.7);
      if(Number.isFinite(z)&&z<MIN_DETAIL_ZOOM){
        e.preventDefault();e.stopImmediatePropagation();
      }
    },true);
  }

  function startInspectorCleanup(){
    const root=document.querySelector('#infoBody');if(root&&Native){cleanInspector();new Native(()=>cleanInspector()).observe(root,{childList:true,subtree:true})}
    addSearchEnhancements();
    addFarZoomInspectionGuard();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startInspectorCleanup,{once:true});else startInspectorCleanup();
})();
