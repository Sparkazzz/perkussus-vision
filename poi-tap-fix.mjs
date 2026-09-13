const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const copy={
  it:{details:'DETTAGLI DEL LUOGO',type:'Tipo',coords:'Coordinate',address:'Indirizzo',hours:'Orari',phone:'Telefono',email:'Email',website:'Sito web',directions:'Indicazioni',source:'Fonte',loading:'Caricamento dettagli…',enrich:'Sto recuperando indirizzo, foto e dettagli…',reviews:'Recensioni',review:'Scrivi una recensione',rating:'Valutazione',publish:'PUBBLICA',update:'AGGIORNA',delete:'ELIMINA',signin:'Accedi per recensire',reviewPlaceholder:'Racconta la tua esperienza…',noReviews:'Ancora nessuna recensione. Puoi essere il primo.',photo:'Foto',cuisine:'Cucina',brand:'Marchio',operator:'Gestore',wheelchair:'Accessibilità',internet:'Internet',takeaway:'Asporto',delivery:'Consegna',outdoor:'Posti esterni',description:'Informazioni',saving:'Salvataggio…',saved:'Recensione salvata.',error:'Operazione non riuscita.',reviewCount:'recensioni'},
  en:{details:'PLACE DETAILS',type:'Type',coords:'Coordinates',address:'Address',hours:'Opening hours',phone:'Phone',email:'Email',website:'Website',directions:'Directions',source:'Source',loading:'Loading details…',enrich:'Loading address, photos and details…',reviews:'Reviews',review:'Write a review',rating:'Rating',publish:'PUBLISH',update:'UPDATE',delete:'DELETE',signin:'Sign in to review',reviewPlaceholder:'Share your experience…',noReviews:'No reviews yet. You can be the first.',photo:'Photo',cuisine:'Cuisine',brand:'Brand',operator:'Operator',wheelchair:'Accessibility',internet:'Internet',takeaway:'Takeaway',delivery:'Delivery',outdoor:'Outdoor seating',description:'About',saving:'Saving…',saved:'Review saved.',error:'Operation failed.',reviewCount:'reviews'}
};
const tr=()=>copy[lang()]||copy.en;
const yesNo=v=>{if(v==null||v==='')return'';const x=String(v).toLowerCase();if(x==='yes')return lang()==='it'?'Sì':'Yes';if(x==='no')return 'No';return String(v).replaceAll('_',' ')};
const safeUrl=v=>{if(!v)return'';try{const u=new URL(/^https?:\/\//i.test(v)?v:`https://${v}`);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};
const nativeFetch=window.fetch.bind(window);
const rowCache=new Map();
let map=null,lastTap=0,down=null,currentToken=0;

function cacheCategoryResponse(url,response){
  try{
    const u=new URL(typeof url==='string'?url:url?.url||'',location.origin);
    if(u.pathname!='/api/nearby'||u.searchParams.get('mode')!=='category')return;
    response.clone().json().then(data=>{
      (data?.rows||[]).forEach((r,n)=>{
        rowCache.set(`${r.type}_${r.id}_${n}`,r);
        if(r?.type&&r?.id)rowCache.set(`osm:${r.type}:${r.id}`,r);
      });
    }).catch(()=>{});
  }catch{}
}
window.fetch=async function(...args){
  const response=await nativeFetch(...args);
  cacheCategoryResponse(args[0],response);
  return response;
};

const style=document.createElement('style');
style.textContent=`
#infoSheet .sheet-body{padding-bottom:max(28px,env(safe-area-inset-bottom))}
.pv-place-media{position:relative;margin:-2px -2px 16px;border-radius:20px;overflow:hidden;background:linear-gradient(135deg,#111b29,#08101c);min-height:92px;border:1px solid rgba(255,255,255,.08)}
.pv-place-media.has-photo{height:210px}.pv-place-media img{width:100%;height:100%;object-fit:cover;display:block}.pv-photo-credit{position:absolute;left:10px;bottom:9px;padding:5px 8px;border-radius:9px;background:rgba(0,0,0,.64);color:#eaf7ff;font-size:10px;backdrop-filter:blur(6px);max-width:85%}
.pv-place-instant{display:flex;align-items:center;gap:10px;padding:16px;color:#91a0b8;font-size:12px}.pv-mini-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.15);border-top-color:#72e8ff;border-radius:50%;animation:pvSpin .7s linear infinite}@keyframes pvSpin{to{transform:rotate(360deg)}}
.pv-place-summary2{display:grid;gap:6px;margin:4px 0 13px}.pv-place-summary2 .kind{font-size:13px;color:#8f9bad;font-weight:750}.pv-place-summary2 .address{font-size:14px;color:#e7edf7;line-height:1.4}.pv-rating-line{display:flex;align-items:center;gap:8px;color:#dce5f2;font-size:13px}.pv-stars{letter-spacing:1px;color:#ffd166}.pv-muted{color:#7f8ba0}
.pv-place-description{margin:12px 0 16px;padding:14px 15px;border-radius:16px;background:#0a101b;border:1px solid rgba(255,255,255,.08);color:#c7d1df;font-size:13px;line-height:1.52}.pv-place-description b{display:block;color:#fff;margin-bottom:5px}
.pv-review-section{margin-top:20px;padding-top:18px;border-top:1px solid rgba(255,255,255,.09)}.pv-review-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:13px}.pv-review-head h3{margin:0;color:#fff;font-size:19px}.pv-review-score{font-size:13px;color:#a9b4c5;text-align:right}.pv-review-score strong{font-size:24px;color:#fff;margin-right:5px}
.pv-review-form{padding:14px;border-radius:17px;background:#0a101b;border:1px solid rgba(255,255,255,.09);margin-bottom:15px}.pv-review-form-title{font-size:12px;color:#98a5b8;font-weight:800;margin-bottom:9px}.pv-star-picker{display:flex;gap:3px;margin-bottom:10px}.pv-star-picker button{border:0;background:transparent;color:#445066;font-size:30px;line-height:1;padding:0 2px}.pv-star-picker button.on{color:#ffd166}.pv-review-form textarea{box-sizing:border-box;width:100%;min-height:92px;resize:vertical;background:#060b13;border:1px solid rgba(255,255,255,.1);border-radius:13px;color:#fff;padding:12px;font:inherit;font-size:14px;outline:none}.pv-review-form textarea:focus{border-color:#72e8ff}.pv-review-actions{display:flex;gap:8px;margin-top:10px}.pv-review-actions button{border-radius:12px;padding:11px 13px;font-weight:900;border:1px solid rgba(255,255,255,.1)}.pv-review-save{flex:1;background:#e9fbff;color:#071018}.pv-review-delete{background:#25141a;color:#ffb1bc}.pv-review-login{width:100%;border:1px solid rgba(114,232,255,.25);background:#0c1c29;color:#dffaff;border-radius:14px;padding:13px;font-weight:850;margin-bottom:15px}.pv-review-status{font-size:12px;color:#8e9aaf;margin-top:8px;min-height:16px}
.pv-review-list{display:grid;gap:10px}.pv-review-card{padding:14px 15px;border-radius:16px;background:#0a101b;border:1px solid rgba(255,255,255,.075)}.pv-review-user{display:flex;align-items:center;gap:9px;margin-bottom:8px}.pv-review-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#132130;display:grid;place-items:center;color:#dffaff;font-weight:900}.pv-review-user b{color:#fff;font-size:13px}.pv-review-user small{display:block;color:#69758a;font-size:10px;margin-top:2px}.pv-review-text{color:#cdd5e1;font-size:13px;line-height:1.5;white-space:pre-wrap}.pv-review-empty{padding:16px;border-radius:15px;background:#0a101b;color:#8290a5;font-size:13px}
@media(min-width:760px){.pv-place-media.has-photo{height:250px}}
`;
document.head.appendChild(style);

function closeOtherSheets(){document.querySelectorAll('.sheet.open').forEach(s=>{s.classList.remove('open');s.setAttribute('aria-hidden','true')})}
function openInfo(title,html){
  const sheet=$('#infoSheet');if(!sheet)return;
  closeOtherSheets();
  $('#infoKicker').textContent=tr().details;$('#infoTitle').textContent=title||tr().details;$('#infoBody').innerHTML=html;
  sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');$('#scrim')?.classList.add('open');
}
function address(t={}){
  const street=[t['addr:street']||t['addr:place'],t['addr:housenumber']].filter(Boolean).join(' ');
  return [street,t['addr:postcode'],t['addr:city']||t['addr:town']||t['addr:village']].filter(Boolean).join(', ')
}
function humanKind(t={}){
  const raw=String(t.amenity||t.shop||t.tourism||t.leisure||t.healthcare||t.railway||t.public_transport||t.aeroway||t.kind||'place').replaceAll('_',' ');
  return raw.replace(/^./,c=>c.toUpperCase())
}
function card(k,v){return v?`<div class="source-card"><b>${esc(k)}</b><span>${esc(v)}</span></div>`:''}
function placeKey(r){return r?.type&&r?.id?`osm:${r.type}:${r.id}`:`geo:${Number(r?.lat||0).toFixed(5)}:${Number(r?.lon||0).toFixed(5)}:${String(r?.name||'place').slice(0,60)}`}
function stars(v){const n=Math.max(0,Math.min(5,Math.round(Number(v)||0)));return '★'.repeat(n)+'☆'.repeat(5-n)}
function reviewDate(v){try{return new Intl.DateTimeFormat(lang()==='it'?'it-IT':'en-US',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v))}catch{return''}}

function detailsValues(r,enrich={}){
  const t=r?.tags||{},e=enrich?.tags||{};
  return {
    address:address(t)||enrich.address||'',hours:t.opening_hours||e.hours||'',phone:t.phone||t['contact:phone']||e.phone||'',email:t.email||t['contact:email']||e.email||'',
    website:safeUrl(t.website||t['contact:website']||t.url||e.website),cuisine:String(t.cuisine||e.cuisine||'').replaceAll(';',', '),brand:t.brand||e.brand||'',operator:t.operator||e.operator||'',wheelchair:yesNo(t.wheelchair||e.wheelchair),internet:yesNo(t.internet_access||e.internet),takeaway:yesNo(t.takeaway||e.takeaway),delivery:yesNo(t.delivery||e.delivery),outdoor:yesNo(t.outdoor_seating||e.outdoor)
  }
}
function actionHtml(r,enrich={}){
  const v=detailsValues(r,enrich),directions=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${r.lat},${r.lon}`)}`,osm=r?.type&&r?.id?`https://www.openstreetmap.org/${encodeURIComponent(r.type)}/${encodeURIComponent(r.id)}`:'';
  return [
    `<a class="link-btn primary-link" href="${esc(directions)}" target="_blank" rel="noopener">${esc(tr().directions)} ↗</a>`,
    v.website?`<a class="link-btn" href="${esc(v.website)}" target="_blank" rel="noopener">${esc(tr().website)} ↗</a>`:'',
    v.phone?`<a class="link-btn" href="tel:${esc(v.phone)}">${esc(tr().phone)}</a>`:'',
    enrich?.wikipedia?`<a class="link-btn" href="${esc(enrich.wikipedia)}" target="_blank" rel="noopener">Wikipedia ↗</a>`:'',
    osm?`<a class="link-btn" href="${esc(osm)}" target="_blank" rel="noopener">OpenStreetMap ↗</a>`:''
  ].filter(Boolean).join('')
}
function detailsHtml(r,enrich={}){
  const v=detailsValues(r,enrich);
  return `${card(tr().address,v.address)}${card(tr().hours,v.hours)}${card(tr().phone,v.phone)}${card(tr().email,v.email)}${card(tr().cuisine,v.cuisine)}${card(tr().brand,v.brand)}${card(tr().operator,v.operator)}${card(tr().wheelchair,v.wheelchair)}${card(tr().internet,v.internet)}${card(tr().takeaway,v.takeaway)}${card(tr().delivery,v.delivery)}${card(tr().outdoor,v.outdoor)}<div class="info-grid"><div class="info-metric"><small>${esc(tr().type)}</small><b>${esc(humanKind(r.tags||{}))}</b></div><div class="info-metric"><small>${esc(tr().coords)}</small><b>${Number(r.lat).toFixed(5)}, ${Number(r.lon).toFixed(5)}</b></div></div>`
}
function initialMarkup(r,instant=false){
  const addr=address(r?.tags||{});
  return `<div class="pv-place-media" id="pvPlaceMedia"><div class="pv-place-instant"><span class="pv-mini-spinner"></span><span>${esc(instant?tr().enrich:tr().loading)}</span></div></div>
  <div class="pv-place-summary2"><div class="kind">${esc(humanKind(r?.tags||{}))}</div><div class="address" id="pvPlaceAddress">${esc(addr||tr().enrich)}</div><div class="pv-rating-line" id="pvRatingLine"><span class="pv-muted">${esc(tr().reviews)}…</span></div></div>
  <div class="pv-place-actions" id="pvPlaceActions">${actionHtml(r)}</div>
  <div id="pvPlaceDescription"></div><div id="pvPlaceDetails">${detailsHtml(r)}</div>
  <div class="source-card"><b class="ok">${esc(tr().source)}</b><span>OpenStreetMap · Wikimedia/Wikipedia quando disponibili</span></div>
  <section class="pv-review-section" id="pvReviews"><div class="pv-review-empty">${esc(tr().loading)}</div></section>`
}
function renderPlace(r,instant=true){
  const name=r?.name||r?.tags?.[`name:${lang()}`]||r?.tags?.name||r?.tags?.brand||humanKind(r?.tags||{});
  openInfo(name,initialMarkup(r,instant));
}
function updateEnrichment(r,enrich,token){
  if(token!==currentToken)return;
  if(enrich?.name)$('#infoTitle').textContent=enrich.name;
  const media=$('#pvPlaceMedia');
  if(media){
    const photo=safeUrl(enrich?.photo?.url);
    if(photo){media.classList.add('has-photo');media.innerHTML=`<img src="${esc(photo)}" alt="${esc(enrich?.name||r.name||tr().photo)}" referrerpolicy="no-referrer"><div class="pv-photo-credit">${esc([enrich.photo.source,enrich.photo.attribution,enrich.photo.license].filter(Boolean).join(' · '))}</div>`}
    else media.remove();
  }
  const v=detailsValues(r,enrich),addr=$('#pvPlaceAddress');if(addr)addr.textContent=v.address||'';
  const actions=$('#pvPlaceActions');if(actions)actions.innerHTML=actionHtml(r,enrich);
  const details=$('#pvPlaceDetails');if(details)details.innerHTML=detailsHtml(r,enrich);
  const d=$('#pvPlaceDescription');if(d&&enrich?.description)d.innerHTML=`<div class="pv-place-description"><b>${esc(tr().description)}</b>${esc(enrich.description)}</div>`;
}
async function fetchDetails(r){
  const u=new URL('/api/place-details',location.origin);u.searchParams.set('lat',String(r.lat));u.searchParams.set('lon',String(r.lon));u.searchParams.set('lang',lang());if(r.name)u.searchParams.set('name',r.name);if(r.type)u.searchParams.set('osm_type',r.type);if(r.id)u.searchParams.set('osm_id',String(r.id));
  const res=await nativeFetch(u,{headers:{accept:'application/json'}});if(!res.ok)throw new Error(`details ${res.status}`);return res.json()
}
async function fetchNearest(ll,name=''){
  const u=new URL('/api/nearby',location.origin);u.searchParams.set('mode','nearest');u.searchParams.set('lat',String(ll.lat));u.searchParams.set('lon',String(ll.lng));u.searchParams.set('radius','130');u.searchParams.set('lang',lang());if(name)u.searchParams.set('name',name);
  const res=await nativeFetch(u,{headers:{accept:'application/json'},cache:'no-store'});if(!res.ok)throw new Error(`POI ${res.status}`);return res.json()
}

function reviewsMarkup(rows,session){
  const list=rows||[],avg=list.length?list.reduce((s,x)=>s+Number(x.rating||0),0)/list.length:0,own=session?.user?.id?list.find(x=>x.user_id===session.user.id):null;
  const form=session?`<div class="pv-review-form"><div class="pv-review-form-title">${esc(tr().review)}</div><div class="pv-star-picker" data-rating="${Number(own?.rating||0)}">${[1,2,3,4,5].map(n=>`<button type="button" data-star="${n}" class="${n<=Number(own?.rating||0)?'on':''}" aria-label="${n} stelle">★</button>`).join('')}</div><textarea id="pvReviewText" maxlength="2000" placeholder="${esc(tr().reviewPlaceholder)}">${esc(own?.body||'')}</textarea><div class="pv-review-actions"><button class="pv-review-save" id="pvReviewSave">${esc(own?tr().update:tr().publish)}</button>${own?`<button class="pv-review-delete" id="pvReviewDelete">${esc(tr().delete)}</button>`:''}</div><div class="pv-review-status" id="pvReviewStatus"></div></div>`:`<button class="pv-review-login" id="pvReviewLogin">${esc(tr().signin)}</button>`;
  const cards=list.length?list.map(x=>{const initial=(x.author_name?.trim()?.[0]||'P').toUpperCase(),avatar=safeUrl(x.author_avatar_url),body=String(x.body||'').trim();return `<article class="pv-review-card"><div class="pv-review-user">${avatar?`<img class="pv-review-avatar" src="${esc(avatar)}" alt="">`:`<span class="pv-review-avatar">${esc(initial)}</span>`}<div><b>${esc(x.author_name||'Explorer')}</b><small><span class="pv-stars">${stars(x.rating)}</span> · ${esc(reviewDate(x.created_at))}</small></div></div>${body?`<div class="pv-review-text">${esc(body)}</div>`:''}</article>`}).join(''):`<div class="pv-review-empty">${esc(tr().noReviews)}</div>`;
  return `<div class="pv-review-head"><h3>${esc(tr().reviews)}</h3><div class="pv-review-score">${list.length?`<strong>${avg.toFixed(1)}</strong><span class="pv-stars">${stars(avg)}</span><br>${list.length} ${esc(tr().reviewCount)}`:'—'}</div></div>${form}<div class="pv-review-list">${cards}</div>`
}
async function loadReviews(r,token){
  const host=$('#pvReviews'),sb=window.PV_SUPABASE;if(!host||token!==currentToken)return;
  if(!sb){host.innerHTML=`<div class="pv-review-empty">${esc(tr().error)}</div>`;return}
  try{
    const [{data:auth},{data:rows,error}]=await Promise.all([sb.auth.getSession(),sb.from('place_reviews').select('id,place_key,place_name,user_id,rating,body,author_name,author_avatar_url,created_at,updated_at').eq('place_key',placeKey(r)).order('created_at',{ascending:false}).limit(80)]);
    if(error)throw error;if(token!==currentToken)return;const session=auth?.session||null;host.innerHTML=reviewsMarkup(rows||[],session);bindReviewUi(r,session,token);
    const avg=(rows||[]).length?(rows||[]).reduce((s,x)=>s+Number(x.rating||0),0)/(rows||[]).length:0;const line=$('#pvRatingLine');if(line)line.innerHTML=(rows||[]).length?`<span class="pv-stars">${stars(avg)}</span><b>${avg.toFixed(1)}</b><span class="pv-muted">${(rows||[]).length} ${esc(tr().reviewCount)}</span>`:`<span class="pv-muted">${esc(tr().noReviews)}</span>`;
  }catch(e){console.warn('Perkussus reviews',e);if(host)host.innerHTML=`<div class="pv-review-empty">${esc(tr().error)}</div>`}
}
function bindReviewUi(r,session,token){
  $('#pvReviewLogin')?.addEventListener('click',()=>document.querySelector('.pv-account-row')?.click());
  const picker=$('.pv-star-picker');picker?.querySelectorAll('[data-star]').forEach(btn=>btn.addEventListener('click',()=>{const n=Number(btn.dataset.star);picker.dataset.rating=String(n);picker.querySelectorAll('[data-star]').forEach(x=>x.classList.toggle('on',Number(x.dataset.star)<=n))}));
  $('#pvReviewSave')?.addEventListener('click',async()=>{
    if(!session?.user?.id||!window.PV_SUPABASE)return;const rating=Number(picker?.dataset.rating||0),body=$('#pvReviewText')?.value?.trim()||'',status=$('#pvReviewStatus');if(rating<1||rating>5){if(status)status.textContent=lang()==='it'?'Scegli da 1 a 5 stelle.':'Choose 1 to 5 stars.';return}
    if(status)status.textContent=tr().saving;
    try{
      const sb=window.PV_SUPABASE;const {data:profile}=await sb.from('profiles').select('display_name,avatar_url').eq('id',session.user.id).maybeSingle();
      const author=profile?.display_name||session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Explorer';
      const payload={place_key:placeKey(r),place_name:r.name||r.tags?.name||'',osm_type:r.type||null,osm_id:r.id?Number(r.id):null,lat:Number(r.lat),lon:Number(r.lon),user_id:session.user.id,rating,body,author_name:String(author).slice(0,100),author_avatar_url:profile?.avatar_url||null,status:'published',updated_at:new Date().toISOString()};
      const {error}=await sb.from('place_reviews').upsert(payload,{onConflict:'place_key,user_id'});if(error)throw error;if(status)status.textContent=tr().saved;await loadReviews(r,token);
    }catch(e){console.warn('review save',e);if(status)status.textContent=e?.message||tr().error}
  });
  $('#pvReviewDelete')?.addEventListener('click',async()=>{
    if(!session?.user?.id||!window.PV_SUPABASE)return;const status=$('#pvReviewStatus');if(status)status.textContent=tr().saving;
    try{const {error}=await window.PV_SUPABASE.from('place_reviews').delete().eq('place_key',placeKey(r)).eq('user_id',session.user.id);if(error)throw error;await loadReviews(r,token)}catch(e){if(status)status.textContent=e?.message||tr().error}
  });
}

async function openRow(r,token){
  renderPlace(r,true);
  loadReviews(r,token);
  try{const d=await fetchDetails(r);updateEnrichment(r,d,token)}catch(e){console.warn('place enrichment',e);$('#pvPlaceMedia')?.remove()}
}
function hitResult(point){
  try{const layers=['pv-poi-points','pv-poi-labels'].filter(id=>map.getLayer(id));if(!layers.length)return null;return map.queryRenderedFeatures([[point.x-22,point.y-22],[point.x+22,point.y+22]],{layers})?.[0]||null}catch{return null}
}
function rowFromFeature(f,ll){
  const key=f?.properties?.key||'';const cached=rowCache.get(key);if(cached)return cached;
  const m=String(key).match(/^(node|way|relation)_(\d+)_\d+$/);return {type:m?.[1]||'',id:m?.[2]||'',lat:ll.lat,lon:ll.lng,name:f?.properties?.label||f?.properties?.name||'',tags:{}}
}
async function handleTap(ev){
  if(!map)return;const now=Date.now();if(now-lastTap<350)return;
  const rect=map.getCanvas().getBoundingClientRect(),point={x:ev.clientX-rect.left,y:ev.clientY-rect.top},feature=hitResult(point);if(!feature)return;
  lastTap=now;ev.preventDefault?.();ev.stopImmediatePropagation?.();const ll=map.unproject([point.x,point.y]),token=++currentToken;let row=rowFromFeature(feature,ll);
  openRow(row,token);
  if(!(row.tags&&Object.keys(row.tags).length)){
    try{const data=await fetchNearest(ll,row.name);if(token!==currentToken)return;if(data?.row){row=data.row;rowCache.set(`osm:${row.type}:${row.id}`,row);await openRow(row,token)}}catch(e){console.warn('nearest fallback',e)}
  }
}
async function bindMap(){
  for(let i=0;i<160;i++){if(window.__PV_MAP__?.getCanvas){map=window.__PV_MAP__;break}await new Promise(r=>setTimeout(r,50))}
  if(!map)return false;const canvas=map.getCanvas();
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:Date.now()}},{capture:true,passive:true});
  canvas.addEventListener('pointerup',e=>{if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y),elapsed=Date.now()-down.t;down=null;if(moved<=13&&elapsed<750)handleTap(e)},{capture:true,passive:false});
  canvas.addEventListener('click',e=>{if(Date.now()-lastTap<850){e.preventDefault();e.stopImmediatePropagation()}},{capture:true});
  return true
}
window.PV_POI_TAP_READY=bindMap();