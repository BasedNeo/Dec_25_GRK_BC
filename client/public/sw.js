// Service Worker for Based Guardians PWA
const CACHE_NAME = 'based-guardians-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install v3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache JS/module files - Let Vite/Browser handle them
  if (url.pathname.match(/\.(js|jsx|ts|tsx|mjs|cjs)$/) || 
      url.pathname.includes('/src/') || 
      url.pathname.includes('/@') || 
      url.pathname.includes('vite') ||
      url.pathname.includes('node_modules')) {
    return;
  }

  // NETWORK ONLY - API calls, RPC, price feeds, metadata
  // Contract data MUST be fresh, never cached
  if (url.hostname.includes('coingecko') || 
      url.hostname.includes('basedaibridge') ||
      url.hostname.includes('blastapi') ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('price') ||
      url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // CACHE FIRST - Images from IPFS/Pinata (immutable content)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/) && 
      (url.hostname.includes('ipfs') || url.hostname.includes('pinata'))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // CACHE FIRST - Local static assets (fonts, local images)
  if (url.pathname.match(/\.(woff|woff2|ttf|eot|png|jpg|jpeg|svg|gif|webp|css)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // STALE WHILE REVALIDATE - HTML pages
  if (event.request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          return cached || new Response('Offline', { 
            status: 503, 
            headers: { 'Content-Type': 'text/html' } 
          });
        });
        
        return cached || fetchPromise;
      })
    );
    return;
  }
});
