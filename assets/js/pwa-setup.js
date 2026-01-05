// PWA Setup - Service Worker Registration and Install Prompt
// This file should be included in all HTML pages

const APP_VERSION = '1.1.6'; // Update this on every deployment

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[PWA] New Service Worker found, installing...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, reloading...');

              // Show notification and auto-reload after 2 seconds
              if (typeof toast !== 'undefined') {
                toast.info('New version available! Updating...');
              }

              // Tell the new service worker to skip waiting
              newWorker.postMessage({ type: 'SKIP_WAITING' });

              // Reload after a short delay
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          });
        });

        // Listen for controller change (new service worker activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] New Service Worker activated, reloading...');
          window.location.reload();
        });
      })
      .catch(error => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}

// Clear old caches on app load
async function clearOldCaches() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    const currentVersion = APP_VERSION;

    for (const cacheName of cacheNames) {
      // Delete caches that don't match current version
      if (!cacheName.includes(currentVersion)) {
        console.log('[PWA] Deleting old cache:', cacheName);
        await caches.delete(cacheName);
      }
    }
  }
}

// Clear caches on load
clearOldCaches();

// Handle PWA install prompt
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Install prompt available');
  e.preventDefault();
  deferredPrompt = e;

  // Show install UI
  showInstallUI();
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  deferredPrompt = null;
  hideInstallUI();

  // Show success message
  if (typeof toast !== 'undefined') {
    toast.success('🎉 Rupiya installed! You can now use it like a native app.');
  }
});

// Check if running as PWA
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  console.log('[PWA] Running as installed app');
  hideInstallUI();
}

function showInstallUI() {
  // Show install banner on landing page
  const landingBanner = document.getElementById('pwaInstallBanner');
  if (landingBanner) {
    landingBanner.style.display = 'flex';
  }

  // Show install button on dashboard
  const dashboardBtn = document.getElementById('dashboardInstallBtn');
  if (dashboardBtn) {
    dashboardBtn.style.display = 'flex';
  }
}

function hideInstallUI() {
  // Hide install banner on landing page
  const landingBanner = document.getElementById('pwaInstallBanner');
  if (landingBanner) {
    landingBanner.style.display = 'none';
  }

  // Hide install button on dashboard
  const dashboardBtn = document.getElementById('dashboardInstallBtn');
  if (dashboardBtn) {
    dashboardBtn.style.display = 'none';
  }
}

// Install button click handlers
document.addEventListener('DOMContentLoaded', () => {
  // Landing page install button
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.log('[PWA] Install prompt not available');
        showManualInstructions();
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response: ${outcome}`);

      if (outcome === 'accepted') {
        hideInstallUI();
      }

      deferredPrompt = null;
    });
  }

  // Dashboard install button
  const dashboardInstallBtn = document.getElementById('dashboardInstallBtn');
  if (dashboardInstallBtn) {
    dashboardInstallBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.log('[PWA] Install prompt not available');
        showManualInstructions();
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response: ${outcome}`);

      if (outcome === 'accepted') {
        hideInstallUI();
        if (typeof toast !== 'undefined') {
          toast.success('🎉 App installed successfully!');
        }
      }

      deferredPrompt = null;
    });
  }

  // Close banner button
  const closeBanner = document.getElementById('closePwaBanner');
  if (closeBanner) {
    closeBanner.addEventListener('click', () => {
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) {
        banner.style.display = 'none';
      }
    });
  }
});

function showManualInstructions() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  let message = '';

  if (isIOS) {
    message = 'To install on iOS:\n1. Tap the Share button\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add"';
  } else if (isAndroid) {
    message = 'To install on Android:\n1. Tap the menu (⋮)\n2. Tap "Add to Home screen"\n3. Tap "Install"';
  } else {
    message = 'To install:\n1. Look for the install icon in your browser\n2. Click it and follow the prompts';
  }

  if (typeof toast !== 'undefined') {
    toast.info(message);
  } else {
    alert(message);
  }
}

console.log(`[PWA] Setup loaded - Version ${APP_VERSION}`);

