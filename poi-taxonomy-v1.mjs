const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return'it'}};
const clean=v=>String(v??'').trim().toLowerCase().replace(/[\s-]+/g,'_');

const IT={
 restaurant:'Ristorante',pizzeria:'Pizzeria',fast_food:'Fast food',food_court:'Area ristorazione',cafe:'Caffè',bar:'Bar',pub:'Pub',ice_cream:'Gelateria',
 drinking_water:'Acqua potabile',water_point:'Punto acqua',fountain:'Fontana',toilets:'Bagni',bench:'Panchina',waste_basket:'Cestino',vending_machine:'Distributore automatico',
 hospital:'Ospedale',clinic:'Clinica',doctors:'Studio medico',doctor:'Studio medico',medical_centre:'Centro medico',pharmacy:'Farmacia',dentist:'Dentista',veterinary:'Veterinario',
 parking:'Parcheggio',parking_entrance:'Ingresso parcheggio',fuel:'Distributore',charging_station:'Ricarica elettrica',atm:'Bancomat',bank:'Banca',
 supermarket:'Supermercato',grocery:'Supermercato',convenience:'Alimentari',bakery:'Panificio',pastry:'Pasticceria',butcher:'Macelleria',greengrocer:'Frutta e verdura',
 bag:'Negozio di borse',leather:'Pelletteria',clothes:'Negozio di abbigliamento',shoes:'Negozio di scarpe',jewelry:'Gioielleria',jewellery:'Gioielleria',hairdresser:'Parrucchiere',beauty:'Centro estetico',florist:'Fioraio',books:'Libreria',stationery:'Cartoleria',electronics:'Elettronica',mobile_phone:'Telefonia',computer:'Informatica',furniture:'Arredamento',hardware:'Ferramenta',sports:'Articoli sportivi',gift:'Negozio di regali',art:'Negozio d’arte',mall:'Centro commerciale',department_store:'Grande magazzino',laundry:'Lavanderia',pet:'Negozio per animali',
 hotel:'Hotel',guest_house:'Affittacamere',hostel:'Ostello',motel:'Motel',apartment:'Appartamenti',museum:'Museo',gallery:'Galleria',attraction:'Attrazione',viewpoint:'Punto panoramico',zoo:'Zoo',theme_park:'Parco divertimenti',aquarium:'Acquario',
 park:'Parco',garden:'Giardino',nature_reserve:'Riserva naturale',playground:'Area giochi',sports_centre:'Centro sportivo',fitness_centre:'Palestra',swimming_pool:'Piscina',pitch:'Campo sportivo',basketball:'Campo da basket',basketball_pitch:'Campo da basket',soccer:'Campo da calcio',football:'Campo da calcio',tennis:'Campo da tennis',volleyball:'Campo da pallavolo',
 station:'Stazione',halt:'Stazione',bus_station:'Autostazione',platform:'Fermata',aerodrome:'Aeroporto',terminal:'Terminal',
 school:'Scuola',university:'Università',college:'Istituto scolastico',kindergarten:'Scuola dell’infanzia',library:'Biblioteca',police:'Polizia',fire_station:'Vigili del fuoco',townhall:'Municipio',
 place_of_worship:'Luogo di culto',church:'Chiesa',cathedral:'Cattedrale',chapel:'Cappella',mosque:'Moschea',synagogue:'Sinagoga',cinema:'Cinema',theatre:'Teatro',nightclub:'Discoteca',marketplace:'Mercato',
 office:'Ufficio',craft:'Attività artigianale',shop:'Negozio',poi:'Punto di interesse',place:'Punto di interesse'
};

function classify(p={}){
 const amenity=clean(p.amenity),shop=clean(p.shop),tour=clean(p.tourism),leisure=clean(p.leisure),health=clean(p.healthcare),rail=clean(p.railway),pt=clean(p.public_transport),air=clean(p.aeroway),sub=clean(p.subclass),cls=clean(p.class),type=clean(p.type),building=clean(p.building),religion=clean(p.religion),sport=clean(p.sport),cuisine=String(p.cuisine||'').toLowerCase();
 if(['restaurant','fast_food','food_court'].includes(amenity)&&/(^|[;,])\s*(pizza|italian_pizza)\s*($|[;,])/.test(cuisine))return'pizzeria';
 if(leisure==='pitch'&&sport)return sport==='basketball'?'basketball_pitch':sport;
 if(sport&&['basketball','soccer','football','tennis','volleyball'].includes(sport))return sport==='basketball'?'basketball_pitch':sport;
 if(amenity==='place_of_worship'){
  if(building==='cathedral')return'cathedral';if(building==='chapel')return'chapel';if(religion==='christian'||building==='church')return'church';if(religion==='muslim'||building==='mosque')return'mosque';if(religion==='jewish'||building==='synagogue')return'synagogue';return'place_of_worship';
 }
 const direct=amenity||shop||tour||leisure||health||rail||pt||air;
 if(direct&&direct!=='yes')return direct;
 if(sub&& !['yes','poi','place'].includes(sub))return sub;
 if(cls&& !['yes','poi','place','amenity','shop','leisure','tourism'].includes(cls))return cls;
 if(type&&type!=='yes')return type;
 if(building&&!['yes','building'].includes(building))return building;
 return'place';
}

function label(kind,p={}){
 const k=clean(kind)||classify(p);
 if(lang()==='it'){
  if(IT[k])return IT[k];
  if(k&&!['place','poi','yes'].includes(k))return k.split('_').map(x=>x?x[0].toUpperCase()+x.slice(1):'').join(' ');
  return'Punto di interesse';
 }
 if(k&&!['place','poi','yes'].includes(k))return k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
 return'Point of interest';
}
function name(p={}){return p[`name:${lang()}`]||p[`name_${lang()}`]||p.name||p['name:it']||p['name:en']||p.brand||p.operator||''}
function title(p={}){const n=name(p);return n||label(classify(p),p)}
function isGeneric(kind){return ['','place','poi','yes','luogo','punto_di_interesse','point_of_interest'].includes(clean(kind))}
window.PV_POI_TAXONOMY={clean,classify,label,name,title,isGeneric,IT};
export {clean,classify,label,name,title,isGeneric};