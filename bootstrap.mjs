await import('./smart-map.mjs?v=2');
await import('./search-v3.mjs?v=1');
await import('./app.mjs?v=5');
const pvRadiusGlobals=document.createElement('script');
pvRadiusGlobals.textContent='var return700=700,return1100=1100,return1800=1800,return2600=2600,return4000=4000,return6500=6500;';
document.head.appendChild(pvRadiusGlobals);
await import('./map-explore.mjs?v=2');
