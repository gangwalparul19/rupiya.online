// Cache Buster Utility
// Forces browser and service worker cache refresh

import logger from './logger.js';

const log = logger.create('CacheBuster');

/**
 * Clear all caches and force refresh
 * @param {boolean} hardRefresh - Also perform hard refresh
 */
export async function clearAllCaches(hardRefresh = true) {
  try {
    log.log('Starting cache clear...');
    
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      log.log(`Found ${cacheNames.length} caches to clear`);
      
      await Promise.all(
        cacheNames.map(cacheName => {
          log.log(`Clearing cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
      
      log.log('✅ All service worker caches cleared');
    }
    
    // Clear localStorage
    try {
      localStorage.clear();
      log.log('✅ localStorage cleared');
    } catch (error) {
      log.warn('Could not clear localStorage:', error.message);
    }
    
    // Clear sessionStorage
    try {
      sessionStorage.clear();
      log.log('✅ sessionStorage cleared');
    } catch (error) {
      log.warn('Could not clear sessionStorage:', error.message);
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      log.log(`Found ${registrations.length} service workers to unregister`);
      
      await Promise.all(
        registrations.map(registration => {
          log.log('Unregistering service worker');
          return registration.unregister();
        })
      );
      
      log.log('✅ All service workers unregistered');
    }
    
    log.log('✅ Cache clear complete');
    
    // Hard refresh if requested
    if (hardRefresh) {
      log.log('Performing hard refresh...');
      // Ctrl+Shift+R equivalent
      window.location.reload(true);
    }
    
    return true;
  } catch (error) {
    log.error('Error clearing caches:', error);
    return false;
  }
}

/**
 * Clear specific cache
 * @param {string} cacheName - Name of cache to clear
 */
export async function clearSpecificCache(cacheName) {
  try {
    if ('caches' in window) {
      const deleted = await caches.delete(cacheName);
      if (deleted) {
        log.log(`✅ Cache cleared: ${cacheName}`);
        return true;
      } else {
        log.warn(`Cache not found: ${cacheName}`);
        return false;
      }
    }
    return false;
  } catch (error) {
    log.error('Error clearing specific cache:', error);
    return false;
  }
}

/**
 * List all caches
 */
export async function listCaches() {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      log.log('Available caches:', cacheNames);
      return cacheNames;
    }
    return [];
  } catch (error) {
    log.error('Error listing caches:', error);
    return [];
  }
}

/**
 * Get cache size
 */
export async function getCacheSize() {
  try {
    if ('caches' in window && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage;
      const quota = estimate.quota;
      const percent = Math.round((usage / quota) * 100);
      
      log.log(`Cache usage: ${(usage / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB (${percent}%)`);
      
      return {
        usage,
        quota,
        percent
      };
    }
    return null;
  } catch (error) {
    log.error('Error getting cache size:', error);
    return null;
  }
}

/**
 * Add cache buster button to page
 * Shows cache status and allows manual clearing
 */
export function addCacheBusterButton() {
  try {
    // Create button
    const button = document.createElement('button');
    button.id = 'cache-buster-btn';
    button.textContent = '🔄 Clear Cache';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      background: #4A90E2;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;
    
    button.onmouseover = () => {
      button.style.background = '#357ABD';
      button.style.transform = 'scale(1.05)';
    };
    
    button.onmouseout = () => {
      button.style.background = '#4A90E2';
      button.style.transform = 'scale(1)';
    };
    
    button.onclick = async () => {
      button.textContent = '⏳ Clearing...';
      button.disabled = true;
      
      const success = await clearAllCaches(true);
      
      if (!success) {
        button.textContent = '❌ Failed';
        setTimeout(() => {
          button.textContent = '🔄 Clear Cache';
          button.disabled = false;
        }, 2000);
      }
    };
    
    // Add to page
    document.body.appendChild(button);
    log.log('✅ Cache buster button added');
    
    return button;
  } catch (error) {
    log.error('Error adding cache buster button:', error);
    return null;
  }
}

/**
 * Setup automatic cache clearing on version change
 */
export function setupAutoCacheClear() {
  try {
    const currentVersion = localStorage.getItem('app-version');
    const newVersion = document.querySelector('meta[name="app-version"]')?.content || '1.0.0';
    
    if (currentVersion && currentVersion !== newVersion) {
      log.log(`Version changed from ${currentVersion} to ${newVersion}, clearing cache...`);
      clearAllCaches(false);
      localStorage.setItem('app-version', newVersion);
    } else if (!currentVersion) {
      localStorage.setItem('app-version', newVersion);
    }
  } catch (error) {
    log.error('Error in auto cache clear:', error);
  }
}

export default {
  clearAllCaches,
  clearSpecificCache,
  listCaches,
  getCacheSize,
  addCacheBusterButton,
  setupAutoCacheClear
};
