// Safe async utilities - prevents unhandled promise rejections and crashes
// Provides error handling wrappers for async operations

import logger from './logger.js';

const log = logger.create('SafeAsync');

/**
 * Safely execute async function with error handling
 * @param {Function} asyncFn - Async function to execute
 * @param {*} defaultValue - Value to return on error
 * @param {string} context - Context for error logging
 * @returns {Promise} Promise that resolves to result or defaultValue
 */
export async function safeAsync(asyncFn, defaultValue = null, context = '') {
  try {
    if (typeof asyncFn !== 'function') {
      throw new Error('First argument must be a function');
    }
    return await asyncFn();
  } catch (error) {
    log.error(`Async operation failed${context ? ` in ${context}` : ''}:`, error.message);
    return defaultValue;
  }
}

/**
 * Safely execute async function with retry logic
 * @param {Function} asyncFn - Async function to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Delay between retries in milliseconds
 * @param {*} defaultValue - Value to return after all retries fail
 * @param {string} context - Context for error logging
 * @returns {Promise} Promise that resolves to result or defaultValue
 */
export async function safeAsyncWithRetry(asyncFn, maxRetries = 3, delayMs = 1000, defaultValue = null, context = '') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (typeof asyncFn !== 'function') {
        throw new Error('First argument must be a function');
      }
      return await asyncFn();
    } catch (error) {
      lastError = error;
      log.warn(`Attempt ${attempt}/${maxRetries} failed${context ? ` in ${context}` : ''}:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  log.error(`All ${maxRetries} attempts failed${context ? ` in ${context}` : ''}:`, lastError.message);
  return defaultValue;
}

/**
 * Safely execute multiple async operations in parallel
 * @param {Function[]} asyncFns - Array of async functions
 * @param {*} defaultValue - Value to return for failed operations
 * @param {string} context - Context for error logging
 * @returns {Promise<Array>} Promise that resolves to array of results
 */
export async function safeAsyncAll(asyncFns, defaultValue = null, context = '') {
  try {
    if (!Array.isArray(asyncFns)) {
      throw new Error('First argument must be an array of functions');
    }
    
    const promises = asyncFns.map(fn => 
      safeAsync(fn, defaultValue, context)
    );
    
    return await Promise.all(promises);
  } catch (error) {
    log.error(`Failed to execute async operations${context ? ` in ${context}` : ''}:`, error.message);
    return asyncFns.map(() => defaultValue);
  }
}

/**
 * Safely execute multiple async operations with fallback
 * @param {Function[]} asyncFns - Array of async functions
 * @param {*} defaultValue - Value to return for failed operations
 * @param {string} context - Context for error logging
 * @returns {Promise<Array>} Promise that resolves to array of results (never rejects)
 */
export async function safeAsyncAllSettled(asyncFns, defaultValue = null, context = '') {
  try {
    if (!Array.isArray(asyncFns)) {
      throw new Error('First argument must be an array of functions');
    }
    
    const promises = asyncFns.map(fn => 
      safeAsync(fn, defaultValue, context)
    );
    
    const results = await Promise.allSettled(promises);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : defaultValue
    );
  } catch (error) {
    log.error(`Failed to execute async operations${context ? ` in ${context}` : ''}:`, error.message);
    return asyncFns.map(() => defaultValue);
  }
}

/**
 * Safely execute async function with timeout
 * @param {Function} asyncFn - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {*} defaultValue - Value to return on timeout
 * @param {string} context - Context for error logging
 * @returns {Promise} Promise that resolves to result or defaultValue
 */
export async function safeAsyncWithTimeout(asyncFn, timeoutMs = 5000, defaultValue = null, context = '') {
  try {
    if (typeof asyncFn !== 'function') {
      throw new Error('First argument must be a function');
    }
    
    return await Promise.race([
      asyncFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  } catch (error) {
    log.error(`Async operation failed${context ? ` in ${context}` : ''}:`, error.message);
    return defaultValue;
  }
}

/**
 * Wrap async function to prevent unhandled rejections
 * @param {Function} asyncFn - Async function to wrap
 * @param {*} defaultValue - Value to return on error
 * @param {string} context - Context for error logging
 * @returns {Function} Wrapped function
 */
export function wrapAsync(asyncFn, defaultValue = null, context = '') {
  return async function(...args) {
    return safeAsync(() => asyncFn(...args), defaultValue, context);
  };
}

/**
 * Setup global unhandled rejection handler
 * @param {Function} handler - Custom handler for unhandled rejections
 */
export function setupGlobalErrorHandler(handler = null) {
  window.addEventListener('unhandledrejection', (event) => {
    log.error('Unhandled promise rejection:', event.reason);
    
    if (typeof handler === 'function') {
      try {
        handler(event.reason);
      } catch (error) {
        log.error('Error in unhandled rejection handler:', error.message);
      }
    }
    
    // Prevent default browser behavior
    event.preventDefault();
  });
  
  window.addEventListener('error', (event) => {
    log.error('Global error:', event.error);
    
    if (typeof handler === 'function') {
      try {
        handler(event.error);
      } catch (error) {
        log.error('Error in global error handler:', error.message);
      }
    }
  });
}

export default {
  safeAsync,
  safeAsyncWithRetry,
  safeAsyncAll,
  safeAsyncAllSettled,
  safeAsyncWithTimeout,
  wrapAsync,
  setupGlobalErrorHandler
};
