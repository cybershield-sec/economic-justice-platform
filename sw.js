const CACHE_NAME = 'tally-sovereignty-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/economic-justice-resources.html',
  '/story-platform.html',
  '/multi-agent-chat.html'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for tally data
self.addEventListener('sync', event => {
  if (event.tag === 'tally-sync') {
    event.waitUntil(syncTallies());
  }
});

async function syncTallies() {
  // This would sync tally data with the server
  console.log('Syncing tally data in background...');
  // Implement actual sync logic here
}