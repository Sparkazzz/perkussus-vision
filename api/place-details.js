const UA='Perkussus-Vision/1.0 (place details; OpenStreetMap and Wikimedia enrichment)';

function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function safeType(v){return ['node','way','relation'].includes(String(v||''))?String(v):''}
function safeHttp(v){
  if(!v)return'';
  try{const u=new URL(/^https?:\/\//i.test(v)?v:`https://${v}`);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}
}
function clean(v,max=500){return String(v||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max)}
async function fetchJson(url,timeout=4500){
  const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':UA},signal:c.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(timer)}
}
function osmAddress(tags={}){
  const line=[tags['addr:street']||tags['addr:place'],tags['addr:housenumber']].filter(Boolean).join(' ');
  const city=tags['addr:city']||tags['addr:town']||tags['addr:village']||tags['addr:municipality'];
  return [line,tags['addr:postcode'],city,tags['addr:country']].filter(Boolean).join(', ')
}
function reverseAddress(a={}){
  const line=[a.road||a.pedestrian||a.footway||a.neighbourhood||a.suburb,a.house_number].filter(Boolean).join(' ');
  const city=a.city||a.town||a.village||a.municipality||a.county;
  return [line,a.postcode,city,a.country].filter(Boolean).join(', ')
}
async function osmElement(type,id){
  if(!type||!id)return null;
  try{
    const j=await fetchJson(`https://api.openstreetmap.org/api/0.6/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`,4000);
    return Array.isArray(j?.elements)?j.elements[0]||null:null;
  }catch{return null}
}
async function reverse(lat,lon,lang){
  try{
    const u=new URL('https://nominatim.openstreetmap.org/reverse');
    u.searchParams.set('format','jsonv2');u.searchParams.set('lat',String(lat));u.searchParams.set('lon',String(lon));
    u.searchParams.set('zoom','18');u.searchParams.set('addressdetails','1');u.searchParams.set('namedetails','1');u.searchParams.set('extratags','1');
    u.searchParams.set('accept-language',lang||'it');
    return await fetchJson(u.href,4500);
  }catch{return null}
}
async function commonsFile(file){
  if(!file)return null;
  const title=String(file).replace(/^File:/i,'').trim();
  if(!title)return null;
  try{
    const u=new URL('https://commons.wikimedia.org/w/api.php');
    u.searchParams.set('action','query');u.searchParams.set('format','json');u.searchParams.set('origin','*');
    u.searchParams.set('prop','imageinfo');u.searchParams.set('iiprop','url|extmetadata');u.searchParams.set('iiurlwidth','1200');u.searchParams.set('titles',`File:${title}`);
    const j=await fetchJson(u.href,4500);const p=Object.values(j?.query?.pages||{})[0];const info=p?.imageinfo?.[0];
    const url=info?.thumburl||info?.url;if(!url)return null;
    const meta=info?.extmetadata||{};
    return {url,source:'Wikimedia Commons',attribution:clean(meta.Artist?.value||meta.Credit?.value||'',160),license:clean(meta.LicenseShortName?.value||'',80)};
  }catch{return null}
}
async function wikidataPhoto(qid){
  if(!/^Q\d+$/i.test(String(qid||'')))return null;
  try{
    const j=await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`,4000);
    const e=j?.entities?.[qid];const file=e?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    return file?await commonsFile(file):null;
  }catch{return null}
}
async function wikipediaInfo(value){
  if(!value||!String(value).includes(':'))return null;
  const [wikiLang,...rest]=String(value).split(':');const title=rest.join(':');
  if(!/^[a-z-]{2,12}$/i.test(wikiLang)||!title)return null;
  try{
    const u=new URL(`https://${wikiLang}.wikipedia.org/w/api.php`);
    u.searchParams.set('action','query');u.searchParams.set('format','json');u.searchParams.set('origin','*');
    u.searchParams.set('prop','pageimages|extracts|info');u.searchParams.set('inprop','url');u.searchParams.set('exintro','1');u.searchParams.set('explaintext','1');u.searchParams.set('pithumbsize','1200');u.searchParams.set('titles',title);
    const j=await fetchJson(u.href,4500);const p=Object.values(j?.query?.pages||{})[0];if(!p)return null;
    return {photo:p.thumbnail?.source?{url:p.thumbnail.source,source:'Wikipedia',attribution:'Wikipedia',license:''}:null,description:clean(p.extract||'',520),url:p.fullurl||''};
  }catch{return null}
}
function mergedDetails(tags={}){
  return {
    website:safeHttp(tags.website||tags['contact:website']||tags.url||tags['contact:url']),
    phone:clean(tags.phone||tags['contact:phone']||'',120),
    email:clean(tags.email||tags['contact:email']||'',180),
    hours:clean(tags.opening_hours||'',280),
    cuisine:clean(String(tags.cuisine||'').replaceAll(';',', '),220),
    brand:clean(tags.brand||'',180),operator:clean(tags.operator||'',180),
    wheelchair:clean(tags.wheelchair||'',60),internet:clean(tags.internet_access||'',80),
    takeaway:clean(tags.takeaway||'',60),delivery:clean(tags.delivery||'',60),outdoor:clean(tags.outdoor_seating||'',60)
  }
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
  const q=req.query||{};const lat=num(q.lat),lon=num(q.lon),type=safeType(q.osm_type),id=String(q.osm_id||'').replace(/\D/g,'').slice(0,24);const lang=String(q.lang||'it').slice(0,5);
  if(lat===null||lon===null||lat<-90||lat>90||lon<-180||lon>180)return res.status(400).json({error:'invalid_point'});
  try{
    const [element,rev]=await Promise.all([osmElement(type,id),reverse(lat,lon,lang)]);
    const tags={...(rev?.extratags||{}),...(element?.tags||{})};
    const name=clean(tags[`name:${lang}`]||tags.name||rev?.namedetails?.[`name:${lang}`]||rev?.name||q.name||'',240);
    const address=osmAddress(tags)||reverseAddress(rev?.address||{})||clean(rev?.display_name||'',360);
    let photo=null,description='',wikiUrl='';
    const direct=safeHttp(tags.image);
    if(direct)photo={url:direct,source:'OpenStreetMap image tag',attribution:'',license:''};
    const commons=String(tags.wikimedia_commons||'');
    if(!photo&&/^File:/i.test(commons))photo=await commonsFile(commons);
    if(!photo&&tags.wikidata)photo=await wikidataPhoto(tags.wikidata);
    const wiki=await wikipediaInfo(tags.wikipedia);
    if(!photo&&wiki?.photo)photo=wiki.photo;
    description=wiki?.description||'';wikiUrl=wiki?.url||'';
    return res.status(200).json({name,address,photo,description,wikipedia:wikiUrl,wikidata:tags.wikidata||'',tags:mergedDetails(tags),source:{osm:type&&id?`https://www.openstreetmap.org/${type}/${id}`:'',reverse:'https://nominatim.openstreetmap.org/',media:photo?.source||''}});
  }catch(error){
    console.error('place details',error);
    return res.status(200).json({name:clean(q.name||'',240),address:'',photo:null,description:'',tags:{},source:{}});
  }
};