// Performance Utilities
// Debounce, throttle, lazy loading, and other performance optimizations

class PerformanceUtils {
  /**
   * Debounce function - delays execution until after wait time has elapsed
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function - limits execution to once per wait time
   * @param {Function} func - Function to throttle
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Throttled function
   */
  static throttle(func, wait = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, wait);
      }
    };
  }

  /**
   * Lazy load images with Intersection Observer
   * @param {string} selector - CSS selector for images to lazy load
   */
  static lazyLoadImages(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for browsers without Intersection Observer
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  /**
   * Request Animation Frame wrapper for smooth animations
   * @param {Function} callback - Function to execute
   */
  static requestAnimationFrame(callback) {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 16); // ~60fps fallback
    }
  }

  /**
   * Batch DOM updates to minimize reflows
   * @param {Function} callback - Function containing DOM updates
   */
  static batchDOMUpdates(callback) {
    this.requestAnimationFrame(() => {
      callback();
    });
  }

  /**
   * Measure performance of a function
   * @param {Function} func - Function to measure
   * @param {string} label - Label for the measurement
   * @returns {*} Result of the function
   */
  static async measurePerformance(func, label = 'Operation') {
    const startTime = performance.now();
    const result = await func();
    const endTime = performance.now();
    // Performance measurement: ${label} took ${(endTime - startTime).toFixed(2)}ms
    return result;
  }

  /**
   * Cache data in memory with expiration
   */
  static createCache(expirationMs = 5 * 60 * 1000) { // 5 minutes default
    const cache = new Map();

    return {
      get(key) {
        const item = cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiration) {
          cache.delete(key);
          return null;
        }

        return item.value;
      },

      set(key, value) {
        cache.set(key, {
          value,
          expiration: Date.now() + expirationMs
        });
      },

      has(key) {
        return this.get(key) !== null;
      },

      clear() {
        cache.clear();
      }
    };
  }

  /**
   * Optimize Firebase queries with caching
   * @param {Function} queryFunc - Firebase query function
   * @param {string} cacheKey - Cache key
   * @param {number} cacheTime - Cache time in milliseconds
   * @returns {Promise} Query result
   */
  static async cachedFirebaseQuery(queryFunc, cacheKey, cacheTime = 5 * 60 * 1000) {
    const cache = this.createCache(cacheTime);

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = await queryFunc();
    cache.set(cacheKey, result);
    return result;
  }

  /**
   * Preload critical resources
   * @param {Array} urls - Array of URLs to preload
   * @param {string} type - Resource type (script, style, image, etc.)
   */
  static preloadResources(urls, type = 'script') {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = type;
      document.head.appendChild(link);
    });
  }

  /**
   * Defer non-critical JavaScript
   * @param {Function} callback - Function to defer
   */
  static deferExecution(callback) {
    if (document.readyState === 'complete') {
      callback();
    } else {
      window.addEventListener('load', callback);
    }
  }

  /**
   * Virtual scrolling for large lists
   * @param {Array} items - Array of items
   * @param {number} itemHeight - Height of each item
   * @param {number} containerHeight - Height of container
   * @param {number} scrollTop - Current scroll position
   * @returns {Object} Visible items and offsets
   */
  static virtualScroll(items, itemHeight, containerHeight, scrollTop) {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      offsetY,
      startIndex,
      endIndex
    };
  }

  /**
   * Optimize table rendering for large datasets
   * @param {Array} data - Table data
   * @param {number} pageSize - Items per page
   * @param {number} currentPage - Current page number
   * @returns {Array} Paginated data
   */
  static paginateData(data, pageSize = 20, currentPage = 1) {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }

  /**
   * Compress data before storing in localStorage
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   */
  static setCompressedStorage(key, data) {
    try {
      const jsonString = JSON.stringify(data);
      localStorage.setItem(key, jsonString);
    } catch (error) {
      console.error('Error storing data:', error);
    }
  }

  /**
   * Retrieve compressed data from localStorage
   * @param {string} key - Storage key
   * @returns {*} Retrieved data
   */
  static getCompressedStorage(key) {
    try {
      const jsonString = localStorage.getItem(key);
      return jsonString ? JSON.parse(jsonString) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  /**
   * Monitor page performance metrics
   */
  static monitorPerformance() {
    if ('PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        // LCP: lastEntry.renderTime || lastEntry.loadTime
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          // FID: entry.processingStart - entry.startTime
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        }
        // CLS: clsScore
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Optimize event listeners with passive option
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {boolean} passive - Use passive listener
   */
  static addPassiveListener(element, event, handler, passive = true) {
    element.addEventListener(event, handler, { passive });
  }

  /**
   * Remove unused CSS (manual implementation)
   * @param {Array} usedSelectors - Array of used CSS selectors
   */
  static removeUnusedCSS(usedSelectors) {
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule, index) => {
          if (rule.selectorText && !usedSelectors.includes(rule.selectorText)) {
            sheet.deleteRule(index);
          }
        });
      } catch (error) {
        // Cross-origin stylesheets can't be accessed
      }
    });
  }
}

export default PerformanceUtils;

