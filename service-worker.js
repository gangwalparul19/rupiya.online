// Service Worker for Rupiya PWA
// Provides offline support and caching

const CACHE_VERSION = '1.1.2'; // Increment this on every deployment
const CACHE_NAME = `rupiya-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `rupiya-runtime-v${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/expenses.html',
  '/income.html',
  '/budgets.html',
  '/goals.html',
  '/investments.html',
  '/loans.html',
  '/analytics.html',
  '/family.html',
  '/houses.html',
  '/vehicles.html',
  '/house-help.html',
  '/notes.html',
  '/documents.html',
  '/profile.html',
  '/login.html',
  '/signup.html',
  '/offline.html',
  '/achievements.html',
  '/feedback.html',
  '/recurring.html',
  '/ai-insights.html',
  '/split-expense.html',
  '/trip-groups.html',
  '/trip-group-detail.html',
  '/admin.html',
  '/assets/css/common.css',
  '/assets/css/components.css',
  '/assets/css/responsive.css',
  '/assets/css/loading.css',
  '/assets/css/accessibility.css',
  '/assets/css/dashboard.css',
  '/assets/css/family.css',
  '/assets/css/landing.css',
  '/assets/css/gamification.css',
  '/assets/css/onboarding.css',
  '/assets/css/trip-groups.css',
  '/assets/css/trip-group-detail.css',
  '/assets/css/admin.css',
  '/assets/js/config/firebase-config.js',
  '/assets/js/services/auth-service.js',
  '/assets/js/services/firestore-service.js',
  '/assets/js/services/storage-service.js',
  '/assets/js/services/family-service.js',
  '/assets/js/services/gamification-service.js',
  '/assets/js/services/onboarding-service.js',
  '/assets/js/services/trip-groups-service.js',
  '/assets/js/services/admin-service.js',
  '/assets/js/utils/helpers.js',
  '/assets/js/utils/performance.js',
  '/assets/js/utils/error-handler.js',
  '/assets/js/utils/daily-tips.js',
  '/assets/js/components/loading.js',
  '/assets/js/components/toast.js',
  '/assets/js/components/gamification-ui.js',
  '/assets/js/components/onboarding-ui.js',
  '/assets/js/components/pagination.js',
  '/assets/js/utils/ux-enhancements.js',
  '/assets/css/ux-enhancements.css',
  '/assets/css/loans.css',
  '/assets/js/pages/loans.js',
  '/assets/js/pages/family.js',
  '/assets/js/pages/family-modals.js',
  '/assets/js/pages/achievements.js',
  '/assets/js/pages/feedback.js',
  '/assets/js/pages/trip-groups.js',
  '/assets/js/pages/trip-group-detail.js',
  '/assets/js/pages/admin.js',
  '/assets/js/services/services-init.js',
  '/assets/css/feedback.css',
  '/logo.png',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/android-chrome-192x192.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip Firebase requests (always fetch from network)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return;
  }

  // Handle API requests differently
  if (request.method !== 'GET') {
    return;
  }

  // Network-first strategy for JavaScript files (cache busting)
  if (url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Network-first strategy for HTML files (cache busting)
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Cache-first strategy for other assets (CSS, images, etc.)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached response and update cache in background
          updateCache(request);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response (can only be consumed once)
            const responseToCache = response.clone();

            // Cache the response
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }

            // Return a generic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Update cache in background
function updateCache(request) {
  fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(request, response);
          });
      }
    })
    .catch(() => {
      // Silently fail - we're already serving from cache
    });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Sync data when back online
async function syncData() {
  try {
    // Get pending actions from IndexedDB or localStorage
    // Sync with Firebase
    console.log('[Service Worker] Syncing data...');
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Rupiya',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/favicon-32x32.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon-32x32.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Rupiya', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Periodic background sync (future feature)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-data') {
    event.waitUntil(updateData());
  }
});

async function updateData() {
  try {
    console.log('[Service Worker] Periodic sync: updating data');
    // Fetch latest data from Firebase
    // Update local cache
  } catch (error) {
    console.error('[Service Worker] Periodic sync failed:', error);
  }
}

console.log('[Service Worker] Loaded');

