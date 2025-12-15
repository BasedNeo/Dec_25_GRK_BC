// Service Worker for Based Guardians PWA
const CACHE_NAME = 'based-guardians-v4';

// Push Notification Handler
self.addEventListener('push', function(event) {
  const options = event.data ? event.data.json() : {};
  
  const notificationOptions = {
    body: options.body || 'New marketplace activity!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      url: options.url || '/',
      type: options.type || 'general'
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: options.tag || 'marketplace-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(
      options.title || 'Based Guardians',
      notificationOptions
    )
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
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
