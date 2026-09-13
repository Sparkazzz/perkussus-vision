const ENDPOINTS=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function pointOf(e){
  if(Number.isFinite(e?.lat)&&Number.isFinite(e?.lon))return[e.lon,e.lat];
  if(Number.isFinite(e?.center?.lat)&&Number.isFinite(e?.center?.lon))return[e.center.lon,e.center.lat];
  return null;
}
function nameOf(t={},lang='it'){return t[`name:${lang}`]||t.name||t['name:en']||t.brand||''}
function kindOf(t={}){return String(t.amenity||t.shop||t.tourism||t.leisure||t.healthcare||'').toLowerCase()}
function categoryOf(t={}){
  if(t.amenity==='restaurant')return'restaurant';
  if(['cafe','bar','pub'].includes(t.amenity))return'cafe';
  if(['hotel','guest_house','hostel','motel'].includes(t.tourism))return'hotel';
  if(['parking','parking_entrance'].includes(t.amenity))return'parking';
  return'';
}
async function overpass(query){
  let last;
  for(const endpoint of ENDPOINTS){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),6500);
    try{
      const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json','user-agent':'Perkussus-Vision/1.0'},body:'data='+encodeURIComponent(query),signal:c.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      return Array.isArray(j.elements)?j.elements:[];
    }catch(e){clearTimeout(timer);last=e}
  }
  throw last||new Error('Overpass unavailable');
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  const q=req.query||{},south=n(q.south),west=n(q.west),north=n(q.north),east=n(q.east),lang=String(q.lang||'it').slice(0,5);
  if([south,west,north,east].some(v=>v===null)||north<=south||east<=west)return res.status(400).json({error:'invalid_bbox'});
  if(north-south>1.2||east-west>1.2)return res.status(400).json({error:'area_too_large'});
  const bbox=`${south},${west},${north},${east}`;
  const query=`[out:json][timeout:11];(
    nwr["amenity"="restaurant"](${bbox});
    nwr["amenity"~"^(cafe|bar|pub)$"](${bbox});
    nwr["tourism"~"^(hotel|guest_house|hostel|motel)$"](${bbox});
    nwr["amenity"~"^(parking|parking_entrance)$"](${bbox});
  );out center tags 650;`;
  try{
    const elements=await overpass(query),groups={restaurant:[],cafe:[],hotel:[],parking:[]};
    for(const e of elements){
      const point=pointOf(e),tags=e.tags||{},category=categoryOf(tags);if(!point||!category)continue;
      groups[category].push({id:e.id,type:e.type,lat:point[1],lon:point[0],name:nameOf(tags,lang),kind:kindOf(tags),tags});
    }
    for(const k of Object.keys(groups))groups[k]=groups[k].slice(0,220);
    return res.status(200).json({groups,counts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))});
  }catch(error){
    console.error('poi bundle',error);
    return res.status(503).json({error:'poi_bundle_unavailable'});
  }
};
