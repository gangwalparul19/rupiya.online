/**
 * Safe Storage Utilities
 * Provides error-safe wrappers for localStorage and sessionStorage
 * Handles quota exceeded, private browsing, and other storage errors
 */

const logger = {
  warn: (...args) => console.warn('[SafeStorage]', ...args),
  error: (...args) => console.error('[SafeStorage]', ...args)
};

/**
 * Check if storage is available
 * @param {Storage} storage - localStorage or sessionStorage
 * @returns {boolean} True if storage is available
 */
function isStorageAvailable(storage) {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe localStorage wrapper
 */
export const safeLocalStorage = {
  /**
   * Get item from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if retrieval fails
   * @returns {string|null} Stored value or default
   */
  getItem(key, defaultValue = null) {
    try {
      if (!isStorageAvailable(localStorage)) {
        logger.warn('localStorage not available');
        return defaultValue;
      }
      return localStorage.getItem(key);
    } catch (error) {
      logger.error('Failed to get item from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @returns {boolean} True if successful
   */
  setItem(key, value) {
    try {
      if (!isStorageAvailable(localStorage)) {
        logger.warn('localStorage not available');
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        logger.error('localStorage quota exceeded');
      } else {
        logger.error('Failed to set item in localStorage:', error);
      }
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} True if successful
   */
  removeItem(key) {
    try {
      if (!isStorageAvailable(localStorage)) {
        logger.warn('localStorage not available');
        return false;
      }
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error('Failed to remove item from localStorage:', error);
      return false;
    }
  },

  /**
   * Clear all localStorage
   * @returns {boolean} True if successful
   */
  clear() {
    try {
      if (!isStorageAvailable(localStorage)) {
        logger.warn('localStorage not available');
        return false;
      }
      localStorage.clear();
      return true;
    } catch (error) {
      logger.error('Failed to clear localStorage:', error);
      return false;
    }
  },

  /**
   * Get and parse JSON from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if retrieval/parsing fails
   * @returns {*} Parsed value or default
   */
  getJSON(key, defaultValue = null) {
    try {
      const item = this.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      logger.error('Failed to parse JSON from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Stringify and set JSON in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} True if successful
   */
  setJSON(key, value) {
    try {
      const jsonString = JSON.stringify(value);
      return this.setItem(key, jsonString);
    } catch (error) {
      logger.error('Failed to stringify JSON for localStorage:', error);
      return false;
    }
  }
};

/**
 * Safe sessionStorage wrapper
 */
export const safeSessionStorage = {
  getItem(key, defaultValue = null) {
    try {
      if (!isStorageAvailable(sessionStorage)) {
        logger.warn('sessionStorage not available');
        return defaultValue;
      }
      return sessionStorage.getItem(key);
    } catch (error) {
      logger.error('Failed to get item from sessionStorage:', error);
      return defaultValue;
    }
  },

  setItem(key, value) {
    try {
      if (!isStorageAvailable(sessionStorage)) {
        logger.warn('sessionStorage not available');
        return false;
      }
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      logger.error('Failed to set item in sessionStorage:', error);
      return false;
    }
  },

  removeItem(key) {
    try {
      if (!isStorageAvailable(sessionStorage)) {
        logger.warn('sessionStorage not available');
        return false;
      }
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error('Failed to remove item from sessionStorage:', error);
      return false;
    }
  },

  clear() {
    try {
      if (!isStorageAvailable(sessionStorage)) {
        logger.warn('sessionStorage not available');
        return false;
      }
      sessionStorage.clear();
      return true;
    } catch (error) {
      logger.error('Failed to clear sessionStorage:', error);
      return false;
    }
  },

  getJSON(key, defaultValue = null) {
    try {
      const item = this.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      logger.error('Failed to parse JSON from sessionStorage:', error);
      return defaultValue;
    }
  },

  setJSON(key, value) {
    try {
      const jsonString = JSON.stringify(value);
      return this.setItem(key, jsonString);
    } catch (error) {
      logger.error('Failed to stringify JSON for sessionStorage:', error);
      return false;
    }
  }
};

export default {
  local: safeLocalStorage,
  session: safeSessionStorage
};
