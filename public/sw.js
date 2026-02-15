// Taskflow Service Worker
// Version updated on each deploy - forces cache refresh
const CACHE_VERSION = Date.now();
const CACHE_NAME = `taskflow-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Only cache truly static assets - NOT pages
const PRECACHE_ASSETS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Force activate immediately
  self.skipWaiting();
});

// Activate event - delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('taskflow-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - NETWORK FIRST for everything except static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls - always network
  if (event.request.url.includes('/api/')) return;

  // For HTML pages - ALWAYS go to network, no caching
  if (event.request.mode === 'navigate' || 
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For static assets (icons, etc) - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle background sync for offline recordings
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-recordings') {
    event.waitUntil(syncRecordings());
  }
});

async function syncRecordings() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_START' });
    client.postMessage({ type: 'SYNC_NEEDED' });
  });
}

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ========================================
// PUSH NOTIFICATIONS
// ========================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Hansei', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'hansei-notification',
    renotify: !!data.tag,
    data: {
      url: data.url || '/app',
      pushId: data.pushId || null,
    },
    actions: data.actions || [],
    silent: data.silent || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hansei', options)
  );
});

// Handle notification click — open the app at the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
