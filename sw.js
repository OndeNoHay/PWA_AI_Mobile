// Service Worker for AI Technical Assistant PWA
// Version 1.0.1

const CACHE_VERSION = 'v1.0.1';
const CACHE_NAMES = {
  static: `ai-pwa-static-${CACHE_VERSION}`,
  models: `ai-pwa-models-${CACHE_VERSION}`,
  runtime: `ai-pwa-runtime-${CACHE_VERSION}`
};

// Static assets to cache on install
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/components.css',
  './manifest.json',
  './icons/icon.svg'
];

// ========================================
// INSTALL EVENT
// ========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// ========================================
// ACTIVATE EVENT
// ========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName.startsWith('ai-pwa-') &&
                !Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// ========================================
// FETCH EVENT
// ========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Strategy 1: Cache First for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
  // Strategy 2: Network First with cache fallback for CDN resources (Transformers.js, models)
  else if (isCDNResource(url)) {
    event.respondWith(networkFirstWithCache(request));
  }
  // Strategy 3: Network only for other requests
  else {
    event.respondWith(
      fetch(request).catch(() => {
        // Return offline page if available
        return caches.match('./index.html');
      })
    );
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if URL is a static asset
 * Works with both absolute paths (localhost) and subpaths (GitHub Pages)
 */
function isStaticAsset(url) {
  const path = url.pathname;
  return path.includes('/css/') ||
         path.includes('/js/') ||
         path.includes('/icons/') ||
         path.endsWith('/') ||
         path.endsWith('/index.html') ||
         path.endsWith('/manifest.json');
}

/**
 * Check if URL is a CDN resource
 */
function isCDNResource(url) {
  return url.hostname.includes('cdn.jsdelivr.net') ||
         url.hostname.includes('huggingface.co') ||
         url.hostname.includes('unpkg.com');
}

/**
 * Cache First strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAMES.static);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    // Try to return cached version even if stale
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Network First with Cache Fallback strategy
 * Try network first, fallback to cache if offline
 * Cache successful responses for future offline use
 */
async function networkFirstWithCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAMES.models);
      // Clone the response before caching
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Returning cached response for:', request.url);
      return cachedResponse;
    }

    console.error('[SW] No cached response available for:', request.url);
    throw error;
  }
}

// ========================================
// MESSAGE EVENT
// For communication with the app
// ========================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(
          names.map((name) => caches.delete(name))
        );
      }).then(() => {
        // Notify client that cache is cleared
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

/**
 * Calculate total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

console.log('[SW] Service Worker script loaded');
