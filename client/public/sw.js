// Service Worker for Based Guardians PWA
const CACHE_NAME = 'based-guardians-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching all: app shell and content');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. PRICE FEED & API CALLS - NETWORK ONLY
  // Do NOT cache price feed or RPC calls to ensure real-time data
  if (url.pathname.includes('price') || url.hostname.includes('coingecko') || url.hostname.includes('rpc') || url.hostname.includes('basedaibridge')) {
      return; // Fallback to browser default (Network)
  }

  // 2. ASSETS (Images, Fonts, IPFS) - CACHE FIRST
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2)$/) || url.hostname.includes('ipfs') || url.hostname.includes('pinata')) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response; // Return from cache
          }
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
        })
    );
    return;
  }

  // 3. APP SHELL - STALE WHILE REVALIDATE
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
           if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
              });
           }
           return networkResponse;
        });
        return response || fetchPromise;
      })
  );
});