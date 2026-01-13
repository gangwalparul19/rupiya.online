/**
 * Lazy Loader Utility
 * Provides dynamic import helpers for lazy loading services and components
 * 
 * Usage:
 * const service = await lazyLoad.service('investment-analytics-service');
 * const component = await lazyLoad.component('confirmation-modal');
 */

class LazyLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Lazy load a service
   * @param {string} serviceName - Name of the service file (without .js)
   * @returns {Promise<any>} - The default export of the service
   */
  async service(serviceName) {
    const cacheKey = `service:${serviceName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const module = await import(`../services/${serviceName}.js`);
      const service = module.default;
      this.cache.set(cacheKey, service);
      return service;
    } catch (error) {
      console.error(`[LazyLoader] Failed to load service: ${serviceName}`, error);
      throw error;
    }
  }

  /**
   * Lazy load a component
   * @param {string} componentName - Name of the component file (without .js)
   * @returns {Promise<any>} - The default export of the component
   */
  async component(componentName) {
    const cacheKey = `component:${componentName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const module = await import(`../components/${componentName}.js`);
      const component = module.default;
      this.cache.set(cacheKey, component);
      return component;
    } catch (error) {
      console.error(`[LazyLoader] Failed to load component: ${componentName}`, error);
      throw error;
    }
  }

  /**
   * Lazy load a utility
   * @param {string} utilName - Name of the utility file (without .js)
   * @returns {Promise<any>} - The default export of the utility
   */
  async util(utilName) {
    const cacheKey = `util:${utilName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const module = await import(`../utils/${utilName}.js`);
      const util = module.default;
      this.cache.set(cacheKey, util);
      return util;
    } catch (error) {
      console.error(`[LazyLoader] Failed to load util: ${utilName}`, error);
      throw error;
    }
  }

  /**
   * Preload multiple modules in parallel
   * @param {Array<{type: string, name: string}>} modules - Array of modules to preload
   * @returns {Promise<void>}
   */
  async preload(modules) {
    const promises = modules.map(({ type, name }) => {
      switch (type) {
        case 'service':
          return this.service(name);
        case 'component':
          return this.component(name);
        case 'util':
          return this.util(name);
        default:
          console.warn(`[LazyLoader] Unknown module type: ${type}`);
          return Promise.resolve();
      }
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('[LazyLoader] Preload failed:', error);
    }
  }

  /**
   * Clear cache for a specific module or all modules
   * @param {string} [key] - Optional cache key to clear
   */
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const lazyLoader = new LazyLoader();

export default lazyLoader;

/**
 * USAGE EXAMPLES:
 * 
 * 1. Lazy load a service when needed:
 * 
 *    async function exportData() {
 *      const exportService = await lazyLoader.service('export-service');
 *      return exportService.export();
 *    }
 * 
 * 2. Lazy load a component on user action:
 * 
 *    async function showConfirmation() {
 *      const confirmationModal = await lazyLoader.component('confirmation-modal');
 *      return confirmationModal.show('Are you sure?');
 *    }
 * 
 * 3. Preload modules that will be needed soon:
 * 
 *    // On dashboard load, preload likely-needed modules
 *    lazyLoader.preload([
 *      { type: 'service', name: 'investment-analytics-service' },
 *      { type: 'service', name: 'prediction-service' },
 *      { type: 'component', name: 'confirmation-modal' }
 *    ]);
 * 
 * 4. Lazy load on route/tab change:
 * 
 *    async function switchToAnalyticsTab() {
 *      const analyticsService = await lazyLoader.service('investment-analytics-service');
 *      const data = await analyticsService.getAnalytics();
 *      renderAnalytics(data);
 *    }
 * 
 * BENEFITS:
 * - Reduces initial bundle size
 * - Faster page load times
 * - Loads code only when needed
 * - Caches loaded modules for reuse
 * - Simple API for lazy loading
 * 
 * BEST PRACTICES:
 * - Lazy load advanced features (analytics, AI insights, exports)
 * - Lazy load rarely used services (admin, trip groups)
 * - Keep core services loaded upfront (auth, firestore, encryption)
 * - Preload modules user is likely to need soon
 * - Use for modal dialogs and confirmation prompts
 */
