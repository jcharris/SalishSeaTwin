// docs/sw.js

const CACHE_NAME = 'salish-twin-v1.0.3';

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

// Install: Cache essential shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force waiting Service Worker to become active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) => 
          cache.add(url).catch((err) => console.warn(`[SW] Failed to cache asset: ${url}`, err))
        )
      );
    })
  );
});

// Activate: Delete old cache versions and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take immediate control of open browser tabs
  );
});

// Fetch: Network-First strategy (fallback to Cache when offline)
self.addEventListener('fetch', (event) => {
  // Only handle standard HTTP GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the network fetch succeeds, cache a copy and return the response
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (offline mode) - serve from cache
        console.warn(`[SW] Network request failed. Serving from cache: ${event.request.url}`);
        return caches.match(event.request);
      })
  );
});
