// PWA Setup - Service Worker Registration and Install Prompt
// This file should be included in all HTML pages

import { APP_VERSION } from './config/version.js';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Show update notification and let user decide when to reload
              showUpdateNotification(() => {
                // Tell the new service worker to skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              });
            }
          });
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
  e.preventDefault();
  deferredPrompt = e;

  // Show install UI
  showInstallUI();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  hideInstallUI();

  // Show success message
  if (typeof toast !== 'undefined') {
    toast.success('🎉 Rupiya installed! You can now use it like a native app.');
  }
});

// Check if running as PWA
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
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
        showManualInstructions();
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

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
        showManualInstructions();
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

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

// Show update notification with user control
function showUpdateNotification(onUpdate) {
  const updateBanner = document.createElement('div');
  updateBanner.id = 'pwaUpdateBanner';
  updateBanner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    z-index: 100000;
    pointer-events: auto;
  `;
  
  updateBanner.innerHTML = `
    <span>✨ A new version is available</span>
    <div style="display: flex; gap: 8px;">
      <button id="updateNow" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        pointer-events: auto;
      ">Update Now</button>
      <button id="updateLater" style="
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        pointer-events: auto;
      ">Later</button>
    </div>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Add click handlers with proper event handling
  const updateNowBtn = document.getElementById('updateNow');
  const updateLaterBtn = document.getElementById('updateLater');
  
  if (updateNowBtn) {
    updateNowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onUpdate();
      updateBanner.remove();
      // Reload after user clicks update
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });
  }
  
  if (updateLaterBtn) {
    updateLaterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateBanner.remove();
    });
  }
}

