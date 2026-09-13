const ENDPOINTS=[
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

const CATEGORIES=['restaurant','cafe','hotel','parking','pharmacy','supermarket','shops','hospital','fuel','charging','museum','attraction','park','station','airport','atm','bank','bakery','toilets','post'];

function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function pointOf(e){
  if(Number.isFinite(e?.lat)&&Number.isFinite(e?.lon))return[e.lon,e.lat];
  if(Number.isFinite(e?.center?.lat)&&Number.isFinite(e?.center?.lon))return[e.center.lon,e.center.lat];
  return null;
}
function nameOf(t={},lang='it'){return t[`name:${lang}`]||t.name||t['name:en']||t.brand||t.operator||''}
function kindOf(t={}){
  const a=String(t.amenity||'').toLowerCase(),shop=String(t.shop||'').toLowerCase(),tour=String(t.tourism||'').toLowerCase(),leisure=String(t.leisure||'').toLowerCase(),health=String(t.healthcare||'').toLowerCase(),cuisine=String(t.cuisine||'').toLowerCase().split(/[;,]/).map(x=>x.trim()),building=String(t.building||'').toLowerCase(),religion=String(t.religion||'').toLowerCase();
  if(['restaurant','fast_food','food_court'].includes(a)&&cuisine.some(x=>x==='pizza'||x==='italian_pizza'))return'pizzeria';
  if(a==='place_of_worship'){
    if(building==='cathedral')return'cathedral';if(building==='chapel')return'chapel';if(religion==='christian'||building==='church')return'church';if(religion==='muslim'||building==='mosque')return'mosque';if(religion==='jewish'||building==='synagogue')return'synagogue';return'place_of_worship';
  }
  return String(a||shop||tour||leisure||health||t.railway||t.public_transport||t.aeroway||t.office||t.craft||((building&&building!=='yes')?building:'place')).toLowerCase();
}
function categoriesOf(t={}){
  const out=[];const a=t.amenity||'',shop=t.shop||'',tour=t.tourism||'',leisure=t.leisure||'',health=t.healthcare||'',rail=t.railway||'',pt=t.public_transport||'',air=t.aeroway||'';
  if(['restaurant','fast_food','food_court'].includes(a))out.push('restaurant');
  if(['cafe','bar','pub','ice_cream'].includes(a))out.push('cafe');
  if(['hotel','guest_house','hostel','motel','apartment','chalet'].includes(tour))out.push('hotel');
  if(['parking','parking_entrance'].includes(a))out.push('parking');
  if(a==='pharmacy'||health==='pharmacy')out.push('pharmacy');
  if(['supermarket','grocery'].includes(shop))out.push('supermarket');
  if(shop)out.push('shops');
  if(['hospital','clinic','doctors'].includes(a)||['hospital','clinic','doctor','centre','medical_centre'].includes(health))out.push('hospital');
  if(a==='fuel')out.push('fuel');
  if(a==='charging_station')out.push('charging');
  if(['museum','gallery'].includes(tour))out.push('museum');
  if(['attraction','viewpoint','zoo','theme_park','aquarium'].includes(tour))out.push('attraction');
  if(['park','garden','nature_reserve'].includes(leisure))out.push('park');
  if(['station','halt'].includes(rail)||['station','stop_position','platform'].includes(pt)||a==='bus_station')out.push('station');
  if(['aerodrome','terminal'].includes(air))out.push('airport');
  if(a==='atm')out.push('atm');
  if(a==='bank')out.push('bank');
  if(['bakery','pastry'].includes(shop))out.push('bakery');
  if(a==='toilets')out.push('toilets');
  if(['post_office','post_box'].includes(a))out.push('post');
  return [...new Set(out)];
}
async function overpass(query){
  let last;
  for(const endpoint of ENDPOINTS){
    const c=new AbortController(),timer=setTimeout(()=>c.abort(),7000);
    try{
      const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json','user-agent':'Perkussus-Vision/1.0'},body:'data='+encodeURIComponent(query),signal:c.signal});
      clearTimeout(timer);
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();return Array.isArray(j.elements)?j.elements:[];
    }catch(e){clearTimeout(timer);last=e}
  }
  throw last||new Error('Overpass unavailable');
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  const q=req.query||{},south=n(q.south),west=n(q.west),north=n(q.north),east=n(q.east),lang=String(q.lang||'it').slice(0,5);
  if([south,west,north,east].some(v=>v===null)||north<=south||east<=west)return res.status(400).json({error:'invalid_bbox'});
  if(north-south>1.0||east-west>1.0)return res.status(400).json({error:'area_too_large'});
  const bbox=`${south},${west},${north},${east}`;
  const query=`[out:json][timeout:13];(
    nwr["amenity"~"^(hospital|clinic|doctors|pharmacy|fuel|charging_station|atm|bank|toilets|post_office|post_box|bus_station|parking|parking_entrance|restaurant|fast_food|food_court|cafe|bar|pub|ice_cream)$"](${bbox});
    nwr["healthcare"~"^(hospital|clinic|doctor|centre|medical_centre|pharmacy)$"](${bbox});
    nwr["tourism"~"^(hotel|guest_house|hostel|motel|apartment|chalet|museum|gallery|attraction|viewpoint|zoo|theme_park|aquarium)$"](${bbox});
    nwr["leisure"~"^(park|garden|nature_reserve)$"](${bbox});
    nwr["railway"~"^(station|halt)$"](${bbox});
    nwr["public_transport"~"^(station|stop_position|platform)$"](${bbox});
    nwr["aeroway"~"^(aerodrome|terminal)$"](${bbox});
    nwr["shop"~"^(supermarket|grocery|bakery|pastry)$"](${bbox});
  );out center tags 8000;`;
  try{
    const elements=await overpass(query),groups=Object.fromEntries(CATEGORIES.map(k=>[k,[]])),seen=Object.fromEntries(CATEGORIES.map(k=>[k,new Set()]));
    for(const e of elements){
      const point=pointOf(e),tags=e.tags||{};if(!point)continue;
      const row={id:e.id,type:e.type,lat:point[1],lon:point[0],name:nameOf(tags,lang),kind:kindOf(tags),tags};
      for(const category of categoriesOf(tags)){
        const key=`${e.type}:${e.id}`;if(!groups[category]||seen[category].has(key))continue;seen[category].add(key);groups[category].push(row);
      }
    }
    return res.status(200).json({groups,counts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))});
  }catch(error){
    console.error('poi bundle',error);
    return res.status(503).json({error:'poi_bundle_unavailable'});
  }
};
