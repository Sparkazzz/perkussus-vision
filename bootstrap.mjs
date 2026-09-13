await import('./map-bridge.mjs?v=2');
await import('./app.mjs?v=5');
await import('./ui-controller.mjs?v=2');
await import('./poi-tap-fix.mjs?v=2');
if(window.PV_POI_TAP_READY)await Promise.race([window.PV_POI_TAP_READY,new Promise(r=>setTimeout(r,2500))]);
await import('./earth-explorer.mjs?v=2');
await import('./category-controller-v4.mjs?v=1');