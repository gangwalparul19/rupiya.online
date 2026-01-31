// Service Worker for Rupiya PWA
// Provides offline support and caching

// CACHE_VERSION is injected by build.js during deployment
const CACHE_VERSION = '1.2.376';
const CACHE_NAME = `rupiya-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `rupiya-runtime-v${CACHE_VERSION}`;

// Assets to cache on install (CRITICAL ONLY)
const CRITICAL_ASSETS = [
  // Core HTML Pages (most frequently accessed)
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/dashboard.html',
  '/expenses.html',
  '/income.html',
  '/offline.html',
  
  // CSS Bundles (Optimized) - Core only
  '/assets/css/bundles/core.bundle.css',
  '/assets/css/bundles/dashboard.bundle.css',
  '/assets/css/bundles/auth.bundle.css',
  
  // Critical page-specific CSS
  '/assets/css/expenses.css',
  '/assets/css/expenses-kpi-override.css',
  '/assets/css/income.css',
  '/assets/css/income-kpi-override.css',
  '/assets/css/dashboard-kpi-override.css',
  
  // Config JS (required for app to function)
  '/assets/js/config/env.js',
  '/assets/js/config/firebase-config.js',
  '/assets/js/config/privacy-config.js',
  '/assets/js/config/version.js',
  
  // Core Services JS (required for basic functionality)
  '/assets/js/services/auth-service.js',
  '/assets/js/services/encryption-service.js',
  '/assets/js/services/firestore-service.js',
  '/assets/js/services/services-init.js',
  '/assets/js/services/user-service.js',
  '/assets/js/services/categories-service.js',
  '/assets/js/services/payment-methods-service.js',
  
  // Core Components JS
  '/assets/js/components/loading.js',
  '/assets/js/components/sidebar.js',
  '/assets/js/components/toast.js',
  '/assets/js/components/pagination.js',
  
  // Core Utils JS
  '/assets/js/utils/auth-guard.js',
  '/assets/js/utils/helpers.js',
  '/assets/js/utils/timezone.js',
  '/assets/js/utils/theme-manager.js',
  '/assets/js/utils/error-handler.js',
  
  // Core Pages JS
  '/assets/js/pages/login.js',
  '/assets/js/pages/signup.js',
  '/assets/js/pages/dashboard.js',
  '/assets/js/pages/expenses.js',
  '/assets/js/pages/income.js',
  '/assets/js/pages/landing.js',
  
  // PWA
  '/assets/js/pwa-setup.js',
  
  // Images (critical only)
  '/assets/images/logo.png',
  '/logo.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  
  // Manifest
  '/manifest.json'
];

// Assets to cache on first visit (LAZY CACHE)
// These will be cached when the user first visits the page
const LAZY_CACHE_PAGES = [
  // Secondary HTML Pages
  '/about-us.html',
  '/admin.html',
  '/ai-insights.html',
  '/budgets.html',
  '/contact-us.html',
  '/data-protection.html',
  '/demo.html',
  '/disclaimer.html',
  '/documents.html',
  '/feedback.html',
  '/goals.html',
  '/house-help.html',
  '/houses.html',
  '/investments.html',
  '/loans.html',
  '/notes.html',
  '/privacy-policy.html',
  '/profile.html',
  '/recurring.html',
  '/split-expense.html',
  '/terms-of-service.html',
  '/trip-group-detail.html',
  '/trip-groups.html',
  '/user-guide.html',
  '/vehicles.html',
  
  // Secondary CSS Bundles
  '/assets/css/bundles/landing.bundle.css',
  '/assets/css/bundles/legal.bundle.css',
  
  // Page-specific CSS (lazy loaded)
  '/assets/css/budgets.css',
  '/assets/css/investments.css',
  '/assets/css/investments-mobile.css',
  '/assets/css/symbol-search.css',
  '/assets/css/loans.css',
  '/assets/css/goals.css',
  '/assets/css/houses.css',
  '/assets/css/vehicles.css',
  '/assets/css/house-help.css',
  '/assets/css/documents.css',
  '/assets/css/notes.css',
  '/assets/css/recurring.css',
  '/assets/css/ai-insights.css',
  '/assets/css/analytics.css',
  '/assets/css/split-expense.css',
  '/assets/css/feedback.css',
  '/assets/css/trip-groups.css',
  '/assets/css/trip-group-detail.css',
  '/assets/css/trip-ux-enhancements.css',
  '/assets/css/admin.css',
  '/assets/css/transfers.css',
  '/assets/css/net-worth.css',
  '/assets/css/profile.css',
  '/assets/css/predictive-analytics.css',
  '/assets/css/feature-details.css',
  '/assets/css/user-guide.css',
  '/assets/css/onboarding.css',
  
  // Secondary Services JS
  '/assets/js/services/admin-service.js',
  '/assets/js/services/cross-feature-integration-service.js',
  '/assets/js/services/expense-templates-service.js',
  '/assets/js/services/fuel-service.js',
  '/assets/js/services/google-sheets-price-service.js',
  '/assets/js/services/investment-analytics-service.js',
  '/assets/js/services/investment-history-service.js',
  '/assets/js/services/live-price-service.js',
  '/assets/js/services/location-service.js',
  '/assets/js/services/notification-service.js',
  '/assets/js/services/onboarding-service.js',
  '/assets/js/services/recurring-processor.js',
  '/assets/js/services/smart-categorization-service.js',
  '/assets/js/services/smart-document-service.js',
  '/assets/js/services/split-service.js',
  '/assets/js/services/storage-service.js',
  '/assets/js/services/symbol-search-service.js',
  '/assets/js/services/trip-budget-service.js',
  '/assets/js/services/trip-groups-service.js',
  '/assets/js/services/trip-settlement-service.js',
  
  // Secondary Components JS
  '/assets/js/components/encryption-reauth-modal.js',
  '/assets/js/components/logout-modal.js',
  '/assets/js/components/onboarding-ui.js',
  '/assets/js/components/setup-wizard.js',
  
  // Secondary Utils JS
  '/assets/js/utils/ai-insights-engine.js',
  '/assets/js/utils/auth-encryption-helper.js',
  '/assets/js/utils/button-reset-fix.js',
  '/assets/js/utils/button-state-manager.js',
  '/assets/js/utils/button-state.js',
  '/assets/js/utils/daily-tips.js',
  '/assets/js/utils/encryption-check.js',
  '/assets/js/utils/logout-handler.js',
  '/assets/js/utils/performance.js',
  '/assets/js/utils/pwa-install.js',
  '/assets/js/utils/sample-data.js',
  '/assets/js/utils/scroll-animations.js',
  '/assets/js/utils/ux-enhancements.js',
  '/assets/js/utils/validation.js',
  
  // Secondary Pages JS
  '/assets/js/pages/admin.js',
  '/assets/js/pages/ai-insights.js',
  '/assets/js/pages/analytics.js',
  '/assets/js/pages/budgets.js',
  '/assets/js/pages/documents.js',
  '/assets/js/pages/feedback.js',
  '/assets/js/pages/goals.js',
  '/assets/js/pages/house-help.js',
  '/assets/js/pages/houses.js',
  '/assets/js/pages/investments.js',
  '/assets/js/pages/loans.js',
  '/assets/js/pages/notes.js',
  '/assets/js/pages/profile.js',
  '/assets/js/pages/recurring.js',
  '/assets/js/pages/split-expense.js',
  '/assets/js/pages/trip-group-detail.js',
  '/assets/js/pages/trip-groups.js',
  '/assets/js/pages/user-guide.js',
  '/assets/js/pages/vehicles.js'
];

// Install event - cache critical assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
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
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                return cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.warn('[Service Worker] Failed to cache JS file:', error.message);
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
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                return cache.put(request, responseToCache);
              })
              .catch((error) => {
                console.warn('[Service Worker] Failed to cache HTML file:', error.message);
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

            // Determine which cache to use
            const cacheName = isLazyCachePage(url.pathname) ? RUNTIME_CACHE : CACHE_NAME;

            // Cache the response
            caches.open(cacheName)
              .then((cache) => {
                return cache.put(request, responseToCache);
              })
              .then(() => {
                if (isLazyCachePage(url.pathname)) {
                }
              })
              .catch((error) => {
                console.warn('[Service Worker] Failed to cache asset:', error.message);
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

// Check if a path should be lazy cached
function isLazyCachePage(pathname) {
  return LAZY_CACHE_PAGES.some(page => pathname === page || pathname.endsWith(page));
}

// Update cache in background (with proper error handling)
async function updateCache(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response);
    }
  } catch (error) {
    // Silently fail - we're already serving from cache
    // Log error for debugging but don't throw
    console.warn('[Service Worker] Cache update failed:', error.message);
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  
  if (event.tag === 'rupiya-sync') {
    event.waitUntil(syncPendingOperations());
  }
});

// Sync pending operations when back online
async function syncPendingOperations() {
  try {
    console.log('[Service Worker] Starting sync...');
    
    // Get sync queue from IndexedDB or localStorage
    const syncQueue = await getSyncQueue();
    
    if (!syncQueue || syncQueue.length === 0) {
      console.log('[Service Worker] No pending operations to sync');
      return;
    }

    console.log(`[Service Worker] Syncing ${syncQueue.length} operations`);

    const results = {
      success: [],
      failed: []
    };

    // Process each operation
    for (const operation of syncQueue) {
      try {
        await processSyncOperation(operation);
        results.success.push(operation.id);
      } catch (error) {
        console.error('[Service Worker] Sync operation failed:', error);
        results.failed.push({
          id: operation.id,
          error: error.message
        });
      }
    }

    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        results,
        timestamp: Date.now()
      });
    });

    console.log(`[Service Worker] Sync complete: ${results.success.length} succeeded, ${results.failed.length} failed`);
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    
    // Notify clients about sync failure
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_FAILED',
        error: error.message,
        timestamp: Date.now()
      });
    });
  }
}

// Get sync queue from storage
async function getSyncQueue() {
  try {
    // Try to get from IndexedDB first (more reliable)
    const db = await openSyncDB();
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const queue = await store.getAll();
    return queue;
  } catch (error) {
    console.warn('[Service Worker] IndexedDB not available, falling back to message passing');
    return null;
  }
}

// Open IndexedDB for sync queue
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RupiyaSyncDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };
  });
}

// Process a single sync operation
async function processSyncOperation(operation) {
  const { type, collection, docId, data } = operation;
  
  // Make API request to sync data
  const response = await fetch(`/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type,
      collection,
      docId,
      data
    })
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }

  return response.json();
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
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
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with clients
self.addEventListener('message', (event) => {
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
    // Fetch latest data from Firebase
    // Update local cache
  } catch (error) {
    console.error('[Service Worker] Periodic sync failed:', error);
  }
}
