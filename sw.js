const CACHE='cgt-v2';
const ASSETS=['/casgrahtools/','/casgrahtools/index.html','/casgrahtools/bills.html',
  '/casgrahtools/cxc.html','/casgrahtools/books.html','/casgrahtools/plants.html',
  '/casgrahtools/manifest.json','/casgrahtools/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return r;}).catch(()=>caches.match(e.request)));});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(ws=>{const u=e.notification.data?.url||'/casgrahtools/';const m=ws.find(w=>w.url.includes('casgrahtools'));if(m){m.focus();m.navigate(u);}else clients.openWindow(u);}));});
