// Service Worker for Rupiya PWA
// Provides offline support and caching

// CACHE_VERSION is injected by build.js during deployment
const CACHE_VERSION = '1.2.0';
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
  '/feedback.html',
  '/recurring.html',
  '/ai-insights.html',
  '/split-expense.html',
  '/trip-groups.html',
  '/trip-group-detail.html',
  '/admin.html',
  '/user-guide.html',
  
  // CSS Files
  '/assets/css/common.css',
  '/assets/css/components.css',
  '/assets/css/dark-mode.css',
  '/assets/css/responsive.css',
  '/assets/css/loading.css',
  '/assets/css/accessibility.css',
  '/assets/css/animations.css',
  '/assets/css/dashboard.css',
  '/assets/css/expenses.css',
  '/assets/css/income.css',
  '/assets/css/budgets.css',
  '/assets/css/goals.css',
  '/assets/css/investments.css',
  '/assets/css/investments-mobile.css',
  '/assets/css/loans.css',
  '/assets/css/analytics.css',
  '/assets/css/family.css',
  '/assets/css/houses.css',
  '/assets/css/vehicles.css',
  '/assets/css/house-help.css',
  '/assets/css/notes.css',
  '/assets/css/documents.css',
  '/assets/css/profile.css',
  '/assets/css/auth.css',
  '/assets/css/landing.css',
  '/assets/css/gamification.css',
  '/assets/css/onboarding.css',
  '/assets/css/trip-groups.css',
  '/assets/css/trip-group-detail.css',
  '/assets/css/admin.css',
  '/assets/css/feedback.css',
  '/assets/css/recurring.css',
  '/assets/css/ai-insights.css',
  '/assets/css/split-expense.css',
  '/assets/css/ux-enhancements.css',
  '/assets/css/sidebar.css',
  '/assets/css/setup-wizard.css',
  '/assets/css/mobile-enhancements.css',
  '/assets/css/enhancements.css',
  '/assets/css/symbol-search.css',
  '/assets/css/legal-pages.css',
  '/assets/css/native-app.css',
  
  // Config
  '/assets/js/config/firebase-config.js',
  '/assets/js/config/version.js',
  
  // Services
  '/assets/js/services/auth-service.js',
  '/assets/js/services/firestore-service.js',
  '/assets/js/services/storage-service.js',
  '/assets/js/services/user-service.js',
  '/assets/js/services/family-service.js',
  '/assets/js/services/onboarding-service.js',
  '/assets/js/services/trip-groups-service.js',
  '/assets/js/services/trip-budget-service.js',
  '/assets/js/services/trip-settlement-service.js',
  '/assets/js/services/admin-service.js',
  '/assets/js/services/categories-service.js',
  '/assets/js/services/payment-methods-service.js',
  '/assets/js/services/notification-service.js',
  '/assets/js/services/recurring-processor.js',
  '/assets/js/services/split-service.js',
  '/assets/js/services/fuel-service.js',
  '/assets/js/services/location-service.js',
  '/assets/js/services/live-price-service.js',
  '/assets/js/services/google-sheets-price-service.js',
  '/assets/js/services/symbol-search-service.js',
  '/assets/js/services/investment-analytics-service.js',
  '/assets/js/services/investment-history-service.js',
  '/assets/js/services/cross-feature-integration-service.js',
  '/assets/js/services/smart-categorization-service.js',
  '/assets/js/services/smart-document-service.js',
  '/assets/js/services/services-init.js',
  
  // Components
  '/assets/js/components/loading.js',
  '/assets/js/components/toast.js',
  '/assets/js/components/sidebar.js',
  '/assets/js/components/family-switcher.js',
  '/assets/js/components/gamification-ui.js',
  '/assets/js/components/onboarding-ui.js',
  '/assets/js/components/setup-wizard.js',
  '/assets/js/components/pagination.js',
  
  // Utils
  '/assets/js/utils/helpers.js',
  '/assets/js/utils/timezone.js',
  '/assets/js/utils/theme-manager.js',
  '/assets/js/utils/performance.js',
  '/assets/js/utils/error-handler.js',
  '/assets/js/utils/daily-tips.js',
  '/assets/js/utils/auth-guard.js',
  '/assets/js/utils/ux-enhancements.js',
  '/assets/js/utils/validation.js',
  '/assets/js/utils/button-state.js',
  '/assets/js/utils/scroll-animations.js',
  '/assets/js/utils/pwa-install.js',
  '/assets/js/utils/sample-data.js',
  '/assets/js/utils/ai-insights-engine.js',
  
  // Pages
  '/assets/js/pages/landing.js',
  '/assets/js/pages/login.js',
  '/assets/js/pages/signup.js',
  '/assets/js/pages/dashboard.js',
  '/assets/js/pages/expenses.js',
  '/assets/js/pages/income.js',
  '/assets/js/pages/budgets.js',
  '/assets/js/pages/goals.js',
  '/assets/js/pages/investments.js',
  '/assets/js/pages/loans.js',
  '/assets/js/pages/analytics.js',
  '/assets/js/pages/family.js',
  '/assets/js/pages/family-modals.js',
  '/assets/js/pages/houses.js',
  '/assets/js/pages/vehicles.js',
  '/assets/js/pages/house-help.js',
  '/assets/js/pages/notes.js',
  '/assets/js/pages/documents.js',
  '/assets/js/pages/profile.js',
  '/assets/js/pages/feedback.js',
  '/assets/js/pages/recurring.js',
  '/assets/js/pages/ai-insights.js',
  '/assets/js/pages/split-expense.js',
  '/assets/js/pages/trip-groups.js',
  '/assets/js/pages/trip-group-detail.js',
  '/assets/js/pages/admin.js',
  '/assets/js/pages/user-guide.js',
  
  // PWA
  '/assets/js/pwa-setup.js',
  
  // Images
  '/logo.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png'
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

