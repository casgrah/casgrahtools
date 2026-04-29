const CACHE = 'casgrahtools-v1';
const ASSETS = [
  '/casgrahtools/',
  '/casgrahtools/index.html',
  '/casgrahtools/books.html',
  '/casgrahtools/plants.html',
  '/casgrahtools/bills.html',
  '/casgrahtools/cxc.html',
  '/casgrahtools/manifest.json',
  '/casgrahtools/icon.svg',
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'casgrahtools', {
      body: data.body || '',
      icon: '/casgrahtools/icon.svg',
      badge: '/casgrahtools/icon.svg',
      tag: data.tag || 'default',
      data: { url: data.url || '/casgrahtools/' }
    })
  );
});

// Notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(wins => {
      const url = e.notification.data.url;
      const match = wins.find(w => w.url.includes('casgrahtools'));
      if (match) { match.focus(); match.navigate(url); }
      else clients.openWindow(url);
    })
  );
});

// Schedule-based notifications (plant watering)
// The app stores schedules in IDB; the SW checks them on a sync event
self.addEventListener('periodicsync', e => {
  if (e.tag === 'plant-check') {
    e.waitUntil(checkPlantReminders());
  }
});

async function checkPlantReminders() {
  // Read schedules from IndexedDB
  const db = await openDB();
  const plants = await getAllPlants(db);
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  for (const plant of plants) {
    if (!plant.nextWater) continue;
    if (plant.nextWater <= today && !plant.notifiedToday) {
      await self.registration.showNotification(`🌱 Water ${plant.name}!`, {
        body: plant.waterNote || 'Time to water this one',
        icon: '/casgrahtools/icon.svg',
        tag: `plant-${plant.id}`,
        data: { url: '/casgrahtools/plants.html' }
      });
    }
  }
}

// Minimal IndexedDB helpers
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('casgrahtools', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('plants')) db.createObjectStore('plants', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e);
  });
}
function getAllPlants(db) {
  return new Promise((res, rej) => {
    const tx = db.transaction('plants', 'readonly');
    const req = tx.objectStore('plants').getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror = e => rej(e);
  });
}
