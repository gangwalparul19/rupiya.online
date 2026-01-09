// Global Error Handler Initialization
// Sets up error handling for the entire application
// Must be loaded FIRST before any other scripts

import { setupGlobalErrorHandler } from './utils/safe-async.js';
import logger from './utils/logger.js';

const log = logger.create('ErrorInit');

/**
 * Initialize all global error handlers
 */
export function initializeErrorHandlers() {
  log.log('Initializing global error handlers...');
  
  // Setup unhandled rejection and error handlers
  setupGlobalErrorHandler((error) => {
    log.error('Unhandled error caught:', error);
    
    // Show user-friendly error message
    if (window.showToast) {
      window.showToast('An unexpected error occurred. Please refresh the page.', 'error');
    }
  });
  
  // Handle localStorage errors gracefully
  window.addEventListener('storage', (event) => {
    try {
      if (event.key === null) {
        log.log('Storage cleared');
      } else {
        log.log(`Storage updated: ${event.key}`);
      }
    } catch (error) {
      log.error('Error handling storage event:', error);
    }
  });
  
  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    try {
      if (document.hidden) {
        log.log('Page hidden');
      } else {
        log.log('Page visible');
      }
    } catch (error) {
      log.error('Error handling visibility change:', error);
    }
  });
  
  log.log('✅ Global error handlers initialized');
}

// Auto-initialize on module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeErrorHandlers);
} else {
  initializeErrorHandlers();
}

export default { initializeErrorHandlers };
