const CATEGORY_FILTERS={
  restaurant:['["amenity"="restaurant"]'],
  cafe:['["amenity"~"^(cafe|bar|pub)$"]'],
  hotel:['["tourism"~"^(hotel|guest_house|hostel|motel)$"]'],
  parking:['["amenity"~"^(parking|parking_entrance)$"]'],
  pharmacy:['["amenity"="pharmacy"]'],
  supermarket:['["shop"="supermarket"]'],
  shops:['["shop"]'],
  hospital:['["amenity"~"^(hospital|clinic|doctors)$"]','["healthcare"~"^(hospital|clinic|doctor)$"]'],
  fuel:['["amenity"="fuel"]'],
  charging:['["amenity"="charging_station"]'],
  museum:['["tourism"="museum"]'],
  attraction:['["tourism"~"^(attraction|viewpoint|zoo|theme_park)$"]'],
  park:['["leisure"="park"]'],
  station:['["railway"="station"]','["public_transport"="station"]'],
  airport:['["aeroway"="aerodrome"]'],
  atm:['["amenity"="atm"]'],
  bank:['["amenity"="bank"]'],
  bakery:['["shop"="bakery"]'],
  toilets:['["amenity"="toilets"]'],
  police:['["amenity"="police"]'],
  post:['["amenity"~"^(post_office|post_box)$"]']
};

const OVERPASS_ENDPOINTS=[
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
function localizedName(tags={},lang='it'){
  return tags[`name:${lang}`]||tags.name||tags['name:en']||tags.brand||'';
}
function haversine(a,b){
  const R=6371000,d=Math.PI/180;
  const dLat=(b[1]-a[1])*d,dLon=(b[0]-a[0])*d,la1=a[1]*d,la2=b[1]*d;
  const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
async function overpass(query){
  let last;
  for(const endpoint of OVERPASS_ENDPOINTS){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try{
      const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json','user-agent':'Perkussus-Vision/1.0'},body:'data='+encodeURIComponent(query),signal:controller.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      return Array.isArray(j.elements)?j.elements:[];
    }catch(e){clearTimeout(timer);last=e}
  }
  throw last||new Error('Overpass unavailable');
}
function normalizeElement(e,lang,center){
  const point=pointOf(e);if(!point)return null;
  const tags=e.tags||{};
  return {id:e.id,type:e.type,lat:point[1],lon:point[0],name:localizedName(tags,lang),tags,distance:center?haversine(center,point):null};
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
  const q=req.query||{};const mode=String(q.mode||'category');const lang=String(q.lang||'it').slice(0,5);
  try{
    if(mode==='category'){
      const category=String(q.category||'');const filters=CATEGORY_FILTERS[category];
      if(!filters)return res.status(400).json({error:'unknown_category'});
      const south=n(q.south),west=n(q.west),north=n(q.north),east=n(q.east);
      if([south,west,north,east].some(v=>v===null)||north<=south||east<=west)return res.status(400).json({error:'invalid_bbox'});
      if(north-south>1.8||east-west>1.8)return res.status(400).json({error:'area_too_large'});
      const bbox=`${south},${west},${north},${east}`;
      const body=filters.map(f=>`nwr${f}(${bbox});`).join('');
      const query=`[out:json][timeout:12];(${body});out center tags 220;`;
      const center=[(west+east)/2,(south+north)/2];
      const rows=(await overpass(query)).map(e=>normalizeElement(e,lang,center)).filter(Boolean).sort((a,b)=>(a.distance??0)-(b.distance??0)).slice(0,220);
      return res.status(200).json({category,count:rows.length,rows});
    }
    if(mode==='nearest'){
      const lat=n(q.lat),lon=n(q.lon),radius=Math.max(20,Math.min(250,n(q.radius)||90));
      if(lat===null||lon===null)return res.status(400).json({error:'invalid_point'});
      const filters=['[amenity]','[shop]','[tourism]','[leisure]','[healthcare]','[office]','[craft]','[railway]','[public_transport]','[aeroway]'];
      const body=filters.map(f=>`nwr(around:${radius},${lat},${lon})${f};`).join('');
      const query=`[out:json][timeout:10];(${body});out center tags 90;`;
      const target=String(q.name||'').trim().toLocaleLowerCase();
      const rows=(await overpass(query)).map(e=>normalizeElement(e,lang,[lon,lat])).filter(Boolean);
      rows.sort((a,b)=>{
        const score=x=>{
          const name=String(x.name||'').toLocaleLowerCase();
          const match=target?(name===target?0:(name.includes(target)||target.includes(name)?12:70)):0;
          return (x.distance??999999)+match;
        };
        return score(a)-score(b);
      });
      return res.status(200).json({row:rows[0]||null});
    }
    return res.status(400).json({error:'unknown_mode'});
  }catch(error){
    console.error('nearby api',error);
    return res.status(503).json({error:'poi_service_unavailable'});
  }
};
