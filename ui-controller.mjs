const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
let blockMapUntil=0;

function consume(event){event?.preventDefault?.();event?.stopPropagation?.();event?.stopImmediatePropagation?.()}
function closeSheets(event){
  consume(event);blockMapUntil=Date.now()+500;window.__PV_BLOCK_MAP_UNTIL__=blockMapUntil;
  $$('.sheet.open').forEach(sheet=>{sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true')});
  const scrim=$('#scrim');if(scrim)scrim.classList.remove('open');
  document.documentElement.classList.remove('pv-sheet-open');
  window.dispatchEvent(new CustomEvent('pv:sheets-closed'));
}
function openSheet(selector){
  closeSheets();
  const sheet=typeof selector==='string'?$(selector):selector;
  if(!sheet)return false;
  sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');
  const scrim=$('#scrim');if(scrim)scrim.classList.add('open');
  document.documentElement.classList.add('pv-sheet-open');
  window.dispatchEvent(new CustomEvent('pv:sheet-opened',{detail:{id:sheet.id}}));
  return true;
}
window.PV_UI={openSheet,closeSheets};

const isCloseTarget=target=>!!target?.closest?.('.sheet [data-close], .sheet .close-btn');

document.addEventListener('pointerdown',event=>{
  if(isCloseTarget(event.target)||event.target?.id==='scrim'){
    event.stopPropagation();event.stopImmediatePropagation();
  }
},true);
document.addEventListener('pointerup',event=>{
  if(isCloseTarget(event.target)){closeSheets(event);return}
  if(event.target?.id==='scrim'&&$('.sheet.open'))closeSheets(event);
},true);
document.addEventListener('click',event=>{
  if(isCloseTarget(event.target)){closeSheets(event);return}
  if(event.target?.id==='scrim'&&$('.sheet.open'))closeSheets(event);
  if(Date.now()<blockMapUntil&&event.target?.closest?.('#map,.maplibregl-canvas'))consume(event);
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('.sheet.open'))closeSheets(event)},true);
