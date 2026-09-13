const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const safeUrl=v=>{if(!v)return'';try{const u=new URL(/^https?:\/\//i.test(v)?v:`https://${v}`);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}};

if(!window.__PV_REVIEW_SPEED_V1__){
 window.__PV_REVIEW_SPEED_V1__=true;
 const copy={
  it:{reviews:'Recensioni',write:'Scrivi una recensione',signin:'Accedi per recensire',none:'Ancora nessuna recensione. Puoi essere il primo.',publish:'PUBBLICA',update:'AGGIORNA',delete:'ELIMINA',placeholder:'Racconta la tua esperienza…',saving:'Salvataggio…',saved:'Recensione salvata.',deleted:'Recensione eliminata.',error:'Operazione non riuscita.',count:'recensioni'},
  en:{reviews:'Reviews',write:'Write a review',signin:'Sign in to review',none:'No reviews yet. You can be the first.',publish:'PUBLISH',update:'UPDATE',delete:'DELETE',placeholder:'Share your experience…',saving:'Saving…',saved:'Review saved.',deleted:'Review deleted.',error:'Operation failed.',count:'reviews'}
 };
 const tr=()=>copy[lang()]||copy.en;
 const CACHE_TTL=30000;
 const cache=new Map();
 const pending=new Map();
 let authPromise=null,currentSig='',observerBusy=false;

 const style=document.createElement('style');
 style.textContent=`
 #pv7Reviews{display:none!important}.pv-fast-review-section{margin-top:20px;padding-top:18px;border-top:1px solid rgba(255,255,255,.09)}
 .pv-fast-review-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:13px}.pv-fast-review-head h3{margin:0;color:#fff;font-size:19px}.pv-fast-review-score{font-size:13px;color:#a9b4c5;text-align:right}.pv-fast-review-score strong{font-size:24px;color:#fff;margin-right:5px}.pv-fast-review-list{display:grid;gap:10px}.pv-fast-review-empty{padding:14px 15px;border-radius:15px;background:#0a101b;color:#8c98ab;font-size:13px}.pv-fast-review-form{padding:14px;border-radius:17px;background:#0a101b;border:1px solid rgba(255,255,255,.09);margin-bottom:15px}.pv-fast-review-title{font-size:12px;color:#98a5b8;font-weight:800;margin-bottom:9px}.pv-fast-stars{display:flex;gap:3px;margin-bottom:10px}.pv-fast-stars button{border:0;background:transparent;color:#445066;font-size:30px;line-height:1;padding:0 2px}.pv-fast-stars button.on{color:#ffd166}.pv-fast-review-form textarea{box-sizing:border-box;width:100%;min-height:88px;resize:vertical;background:#060b13;border:1px solid rgba(255,255,255,.1);border-radius:13px;color:#fff;padding:12px;font:inherit;font-size:14px;outline:none}.pv-fast-review-form textarea:focus{border-color:#72e8ff}.pv-fast-review-actions{display:flex;gap:8px;margin-top:10px}.pv-fast-review-actions button{border-radius:12px;padding:11px 13px;font-weight:900;border:1px solid rgba(255,255,255,.1)}.pv-fast-save{flex:1;background:#e9fbff;color:#071018}.pv-fast-delete{background:#25141a;color:#ffb1bc}.pv-fast-login{width:100%;border:1px solid rgba(114,232,255,.25);background:#0c1c29;color:#dffaff;border-radius:14px;padding:13px;font-weight:850;margin-bottom:15px}.pv-fast-status{font-size:12px;color:#8e9aaf;margin-top:8px;min-height:16px}.pv-fast-card{padding:14px 15px;border-radius:16px;background:#0a101b;border:1px solid rgba(255,255,255,.075)}.pv-fast-user{display:flex;align-items:center;gap:9px;margin-bottom:8px}.pv-fast-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#132130;display:grid;place-items:center;color:#dffaff;font-weight:900}.pv-fast-user b{color:#fff;font-size:13px}.pv-fast-user small{display:block;color:#69758a;font-size:10px;margin-top:2px}.pv-fast-text{color:#cdd5e1;font-size:13px;line-height:1.5;white-space:pre-wrap}.pv-fast-stars-inline{color:#ffd166;letter-spacing:1px}
 `;
 document.head.appendChild(style);

 function stars(v){const n=Math.max(0,Math.min(5,Math.round(Number(v)||0)));return'★'.repeat(n)+'☆'.repeat(5-n)}
 function reviewDate(v){try{return new Intl.DateTimeFormat(lang()==='it'?'it-IT':'en-US',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v))}catch{return''}}
 function coords(){for(const b of $$('#infoBody .info-metric b')){const m=String(b.textContent||'').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);if(m)return{lat:Number(m[1]),lon:Number(m[2])}}return null}
 function osmRef(){const a=[...$$('#infoBody a[href*="openstreetmap.org/"]')].find(x=>/openstreetmap\.org\/(node|way|relation)\/\d+/.test(x.href));if(!a)return null;const m=a.href.match(/openstreetmap\.org\/(node|way|relation)\/(\d+)/);return m?{type:m[1],id:m[2]}:null}
 function context(){const c=coords(),name=$('#infoTitle')?.textContent?.trim()||'';if(!c||!name)return null;const o=osmRef();const key=o?`osm:${o.type}:${o.id}`:`geo:${c.lat.toFixed(5)}:${c.lon.toFixed(5)}:${name.slice(0,60)}`;return{key,name,lat:c.lat,lon:c.lon,type:o?.type||'',id:o?.id||''}}
 function sigOf(c){return c?`${c.key}|${c.name}`:''}
 function avatar(r){const u=safeUrl(r.author_avatar_url);return u?`<img class="pv-fast-avatar" src="${esc(u)}" alt="">`:`<div class="pv-fast-avatar">${esc((r.author_name||'P').slice(0,1).toUpperCase())}</div>`}
 function sessionStorageLoad(){try{const raw=sessionStorage.getItem('pv_review_cache_v1');if(!raw)return;const obj=JSON.parse(raw);for(const [k,v] of Object.entries(obj||{})){if(v&&Date.now()-Number(v.ts||0)<CACHE_TTL*4)cache.set(k,v)}}catch{}}
 function sessionStorageSave(){try{const obj={};[...cache.entries()].slice(-50).forEach(([k,v])=>obj[k]=v);sessionStorage.setItem('pv_review_cache_v1',JSON.stringify(obj))}catch{}}
 sessionStorageLoad();

 async function authState(){
  if(window.PV_AUTH_STATE)return window.PV_AUTH_STATE;
  if(authPromise)return authPromise;
  authPromise=(async()=>{for(let i=0;i<80&&!window.PV_SUPABASE;i++)await new Promise(r=>setTimeout(r,25));const sb=window.PV_SUPABASE;if(!sb)return{session:null};try{return{session:(await sb.auth.getSession()).data.session||null}}catch{return{session:null}}})();
  return authPromise;
 }
 function ensurePanel(c){
  const body=$('#infoBody');if(!body||!c)return null;
  $('#pv7Reviews')?.remove();
  let panel=$('#pvFastReviews');
  if(!panel){panel=document.createElement('section');panel.id='pvFastReviews';panel.className='pv-fast-review-section';body.appendChild(panel)}
  panel.dataset.placeKey=c.key;panel.dataset.sig=sigOf(c);return panel;
 }
 function updateTopRating(rows){const rating=$('#pv7Rating')||$('#pvRatingLine')||$('#pv3Rating');if(!rating)return;const q=tr(),avg=rows.length?rows.reduce((s,x)=>s+Number(x.rating||0),0)/rows.length:0;rating.innerHTML=rows.length?`<span class="pv-fast-stars-inline">${stars(avg)}</span><b>${avg.toFixed(1)}</b><span>${rows.length} ${esc(q.count)}</span>`:`<span class="pv-muted">${esc(q.none)}</span>`}
 async function render(c,rows,session,status=''){
  const panel=ensurePanel(c);if(!panel||panel.dataset.sig!==sigOf(c))return;const q=tr(),list=rows||[],avg=list.length?list.reduce((s,x)=>s+Number(x.rating||0),0)/list.length:0,own=session?.user?list.find(x=>x.user_id===session.user.id):null;
  const cards=list.length?list.map(r=>`<article class="pv-fast-card"> <div class="pv-fast-user">${avatar(r)}<div><b>${esc(r.author_name||'Explorer')}</b><small>${esc(reviewDate(r.created_at))} · <span class="pv-fast-stars-inline">${stars(r.rating)}</span></small></div></div><div class="pv-fast-text">${esc(r.body||'')}</div></article>`).join(''):`<div class="pv-fast-review-empty">${esc(q.none)}</div>`;
  let form='';
  if(session?.user){const initial=Number(own?.rating||5);form=`<div class="pv-fast-review-form"><div class="pv-fast-review-title">${esc(q.write)}</div><div class="pv-fast-stars" data-fast-stars data-rating="${initial}">${[1,2,3,4,5].map(n=>`<button type="button" data-fast-star="${n}" class="${n<=initial?'on':''}">★</button>`).join('')}</div><textarea data-fast-text maxlength="2000" placeholder="${esc(q.placeholder)}">${esc(own?.body||'')}</textarea><div class="pv-fast-review-actions"><button type="button" class="pv-fast-save" data-fast-save>${esc(own?q.update:q.publish)}</button>${own?`<button type="button" class="pv-fast-delete" data-fast-delete>${esc(q.delete)}</button>`:''}</div><div class="pv-fast-status" data-fast-status>${esc(status)}</div></div>`}else form=`<button type="button" class="pv-fast-login" data-fast-login>${esc(q.signin)}</button>`;
  panel.innerHTML=`<div class="pv-fast-review-head"><h3>${esc(q.reviews)}</h3><div class="pv-fast-review-score">${list.length?`<strong>${avg.toFixed(1)}</strong>${list.length} ${esc(q.count)}`:''}</div></div>${form}<div class="pv-fast-review-list">${cards}</div>`;
  updateTopRating(list);
 }
 async function renderInstant(c){const a=await authState();const hit=cache.get(c.key);if(hit){render(c,hit.rows||[],a.session);return}render(c,[],a.session)}
 async function refresh(c,force=false){
  const sb=window.PV_SUPABASE;if(!sb)return;const hit=cache.get(c.key);if(!force&&hit&&Date.now()-hit.ts<CACHE_TTL)return;
  if(pending.has(c.key))return pending.get(c.key);
  const p=(async()=>{try{const [a,res]=await Promise.all([authState(),sb.from('place_reviews').select('user_id,rating,body,author_name,author_avatar_url,created_at,updated_at').eq('place_key',c.key).eq('status','published').order('created_at',{ascending:false}).limit(50)]);if(res.error)throw res.error;const rows=res.data||[];cache.set(c.key,{ts:Date.now(),rows});sessionStorageSave();if(currentSig===sigOf(c))render(c,rows,a.session)}catch(e){console.warn('Perkussus reviews',e)}finally{pending.delete(c.key)}})();pending.set(c.key,p);return p;
 }
 async function activate(){
  const sheet=$('#infoSheet');if(!sheet?.classList.contains('open')){currentSig='';return}
  const c=context();if(!c)return;const sig=sigOf(c);if(sig!==currentSig){currentSig=sig;await renderInstant(c);refresh(c)}else{ensurePanel(c);const hit=cache.get(c.key);if(hit)updateTopRating(hit.rows||[])}
 }
 async function saveReview(panel){
  const c=context(),sb=window.PV_SUPABASE,a=await authState();if(!c||!sb||!a.session?.user)return;const q=tr(),status=$('[data-fast-status]',panel);if(status)status.textContent=q.saving;
  const picker=$('[data-fast-stars]',panel),body=$('[data-fast-text]',panel)?.value?.trim()||'',rating=Number(picker?.dataset.rating||5),u=a.session.user,name=u.user_metadata?.full_name||u.user_metadata?.name||u.email?.split('@')[0]||'Explorer',avatarUrl=safeUrl(u.user_metadata?.avatar_url)||null;
  const before=cache.get(c.key)?.rows||[],now=new Date().toISOString(),optimistic={user_id:u.id,rating,body,author_name:String(name).slice(0,100),author_avatar_url:avatarUrl,created_at:before.find(x=>x.user_id===u.id)?.created_at||now,updated_at:now},rows=[optimistic,...before.filter(x=>x.user_id!==u.id)];cache.set(c.key,{ts:Date.now(),rows});render(c,rows,a.session,q.saving);
  try{const payload={place_key:c.key,place_name:String(c.name).slice(0,240),osm_type:c.type||null,osm_id:c.id?Number(c.id):null,lat:c.lat,lon:c.lon,user_id:u.id,rating,body,author_name:String(name).slice(0,100),author_avatar_url:avatarUrl,status:'published',updated_at:now};const r=await sb.from('place_reviews').upsert(payload,{onConflict:'place_key,user_id'});if(r.error)throw r.error;cache.set(c.key,{ts:0,rows});render(c,rows,a.session,q.saved);refresh(c,true)}catch(e){cache.set(c.key,{ts:0,rows:before});render(c,before,a.session,e?.message||q.error);refresh(c,true)}
 }
 async function deleteReview(panel){const c=context(),sb=window.PV_SUPABASE,a=await authState();if(!c||!sb||!a.session?.user)return;const q=tr(),before=cache.get(c.key)?.rows||[],rows=before.filter(x=>x.user_id!==a.session.user.id);cache.set(c.key,{ts:Date.now(),rows});render(c,rows,a.session,q.saving);try{const r=await sb.from('place_reviews').delete().eq('place_key',c.key).eq('user_id',a.session.user.id);if(r.error)throw r.error;render(c,rows,a.session,q.deleted);cache.set(c.key,{ts:0,rows});refresh(c,true)}catch(e){cache.set(c.key,{ts:0,rows:before});render(c,before,a.session,e?.message||q.error)}}

 document.addEventListener('click',e=>{
  const panel=e.target.closest?.('#pvFastReviews');if(!panel)return;
  const star=e.target.closest?.('[data-fast-star]');if(star){const p=$('[data-fast-stars]',panel),n=Number(star.dataset.fastStar);p.dataset.rating=String(n);$$('[data-fast-star]',p).forEach(x=>x.classList.toggle('on',Number(x.dataset.fastStar)<=n));return}
  if(e.target.closest?.('[data-fast-login]')){document.querySelector('.pv-account-row')?.click();return}
  if(e.target.closest?.('[data-fast-save]')){saveReview(panel);return}
  if(e.target.closest?.('[data-fast-delete]')){deleteReview(panel);return}
 },true);

 const target=$('#infoSheet')||document.body;
 new MutationObserver(()=>{if(observerBusy)return;observerBusy=true;queueMicrotask(()=>{observerBusy=false;activate()})}).observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});
 document.addEventListener('pv:auth-state',()=>{authPromise=null;activate()},true);
 setInterval(()=>{if($('#infoSheet')?.classList.contains('open'))activate()},900);
 activate();
}
