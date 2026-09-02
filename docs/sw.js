// Increment this version string whenever you push updates!
const CACHE_NAME = 'salish-sea-v2';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/map.js',
  './js/time-controller.js',
  './js/chart.js',
  './data/sensors.json',
  './data/telemetry.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Clean up old caches when a new version activates
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Listen for skipWaiting message from the frontend update banner
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
