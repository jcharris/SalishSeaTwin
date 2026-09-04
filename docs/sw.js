// Change this version number whenever you deploy new code!
const CACHE_NAME = 'salish-twin-v1.0.1';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data-module.js',
  './js/map.js',
  './js/chart-module.js',
  './js/time-controller.js',
  './data/sensors.json',
  './data/telemetry.json'
];

// Install: Cache core shell
self.addEventListener('install', (event) => {
  // Force new service worker to activate immediately without waiting
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Delete old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
