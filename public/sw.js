// Service Worker for Indies Menu PWA
const CACHE_NAME = 'indies-menu-v2';
const MENU_DATA_CACHE = 'indies-menu-data-v2';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/menu',
  '/offline.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/images/innopay-blue-192.png',
  '/images/innopay-blue-512.png',
  '/images/innopay-logo.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MENU_DATA_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // For menu API requests - cache for offline use
  if (event.request.url.includes('/api/menu')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the menu data
          const responseClone = response.clone();
          caches.open(MENU_DATA_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
            console.log('[Service Worker] Cached menu data');
          });
          return response;
        })
        .catch(() => {
          // Network failed, try to return cached menu data
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving cached menu data');
              return cachedResponse;
            }
            // No cached data available
            return new Response(
              JSON.stringify({ error: 'Network unavailable', offline: true }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503,
              }
            );
          });
        })
    );
    return;
  }

  // For other API requests - network only (don't cache dynamic data)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network unavailable' }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          }
        );
      })
    );
    return;
  }

  // For navigation requests - network first, cache fallback, offline page as last resort
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the response for future offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Network failed - check if this is a menu page request
          const url = new URL(event.request.url);

          // If requesting /menu (not /menu/offline), redirect to offline version
          if (url.pathname === '/menu' || url.pathname.startsWith('/menu?')) {
            console.log('[Service Worker] Redirecting /menu to /menu/offline');
            return caches.match(OFFLINE_URL);
          }

          // Try cache for other pages
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fall back to offline page
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For other requests (images, CSS, JS) - cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version and update cache in background
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          })
          .catch(() => {
            // Silently fail background update
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed and not in cache
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
    })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
