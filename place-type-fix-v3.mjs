const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!window.__PV_PLACE_TYPE_FIX_V3__){
 window.__PV_PLACE_TYPE_FIX_V3__=true;
 let timer=null,seq=0,lastFetch='';const cache=new Map();
 const tax=()=>window.PV_POI_TAXONOMY;
 const setText=(el,v)=>{if(el&&el.textContent!==v)el.textContent=v};
 function coords(){for(const b of $$('#infoBody .info-metric b')){const m=String(b.textContent||'').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);if(m)return{lat:Number(m[1]),lon:Number(m[2])}}const a=window.__PV_ACTIVE_PLACE__;return a&&Number.isFinite(Number(a.lat))&&Number.isFinite(Number(a.lon))?{lat:Number(a.lat),lon:Number(a.lon)}:null}
 function currentRaw(){return $('#infoBody .pv-place-summary b')?.textContent?.trim()||$('#infoBody .pv-place-summary2 .kind')?.textContent?.trim()||$('#infoBody .pv-place-summary span')?.textContent?.trim()||[...$$('#infoBody .info-metric')].find(x=>/^(tipo|type)$/i.test(x.querySelector('small')?.textContent?.trim()||''))?.querySelector('b')?.textContent?.trim()||''}
 function typeMetric(){return [...$$('#infoBody .info-metric')].find(x=>/^(tipo|type)$/i.test(x.querySelector('small')?.textContent?.trim()||''))||null}
 function ensureMetric(label){let m=typeMetric();if(m){if(m.style.display==='none')m.style.display='';setText(m.querySelector('b'),label);return}const grid=$('#infoBody .info-grid');if(!grid)return;m=document.createElement('div');m.className='info-metric pv-type-metric';m.innerHTML=`<small>${lang()==='it'?'Tipo':'Type'}</small><b></b>`;setText(m.querySelector('b'),label);grid.prepend(m)}
 function apply(kind,tags={},allowGeneric=false){const t=tax();if(!t)return;const real=t.clean(kind||t.classify(tags)),generic=t.isGeneric(real);if(generic&&!allowGeneric){const m=typeMetric();if(m)m.remove();const s=$('#infoBody .pv-place-summary span');if(s&&/^(luogo|place|punto di interesse|point of interest)$/i.test(s.textContent.trim()))setText(s,'');return}const label=t.label(real,tags);ensureMetric(label);setText($('#infoBody .pv-place-summary span'),label);setText($('#infoBody .pv-place-summary2 .kind'),label);setText($('#infoBody .pv-place-summary b'),real);
  const active=window.__PV_ACTIVE_PLACE__,title=$('#infoTitle');if(title&&active&&(!active.tags?.name)&&[active.name,currentRaw(),kind].some(v=>String(v||'').toLowerCase()===String(title.textContent||'').toLowerCase()))setText(title,label)
 }
 async function resolve(){
  const sheet=$('#infoSheet');if(!sheet?.classList.contains('open'))return;const t=tax();if(!t)return;const active=window.__PV_ACTIVE_PLACE__||{},tags=active.tags||{},activeKind=t.classify(tags)||active.kind||'',raw=currentRaw();
  if(activeKind&&!t.isGeneric(activeKind))apply(activeKind,tags);else if(raw&&!t.isGeneric(raw))apply(raw,tags);
  const c=coords(),name=$('#infoTitle')?.textContent?.trim()||'';if(!c||!name)return;const key=`${c.lat.toFixed(5)},${c.lon.toFixed(5)}|${name}`;
  if(cache.has(key)){const row=cache.get(key),k=t.classify(row.tags||{})||row.kind;apply(k,row.tags||{});return}
  const visibleKind=t.classify(tags)||raw;if(!t.isGeneric(visibleKind)&&Object.keys(tags).length>2)return;
  if(lastFetch===key)return;lastFetch=key;const mine=++seq;
  try{const u=new URL('/api/nearby',location.origin);u.searchParams.set('mode','nearest');u.searchParams.set('lat',String(c.lat));u.searchParams.set('lon',String(c.lon));u.searchParams.set('radius','180');u.searchParams.set('lang',lang());u.searchParams.set('name',name);if(!t.isGeneric(visibleKind))u.searchParams.set('hint',visibleKind);const r=await fetch(u,{headers:{accept:'application/json'},cache:'default'});if(!r.ok)return;const data=await r.json();if(mine!==seq||!data?.row)return;cache.set(key,data.row);const kind=t.classify(data.row.tags||{})||data.row.kind;if(!t.isGeneric(kind)){window.__PV_ACTIVE_PLACE__={...active,...data.row,kind,tags:data.row.tags||{}};apply(kind,data.row.tags||{});document.dispatchEvent(new CustomEvent('pv-place-open',{detail:window.__PV_ACTIVE_PLACE__}))}else apply('',{},false)}catch{}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(resolve,12)}
 async function init(){for(let i=0;i<100&&!tax();i++)await sleep(20);const target=$('#infoSheet')||document.body;new MutationObserver(schedule).observe(target,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-hidden']});document.addEventListener('pv-place-open',schedule);document.addEventListener('click',e=>{if(e.target.closest?.('[data-language]'))setTimeout(schedule,60)},true);schedule()}
 init();
}
