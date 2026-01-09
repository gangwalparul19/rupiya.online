/**
 * Cache Manager Utility
 * Provides in-memory caching with TTL (Time-To-Live) support
 * Automatically invalidates expired entries
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttlMs - Time-to-live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttlMs = 5 * 60 * 1000) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store value with timestamp
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    // Track statistics
    this.stats.sets++;

    // Set expiration timer
    const timer = setTimeout(() => {
      this.invalidate(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found or expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return null;
    }

    const entry = this.cache.get(key);
    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if entry has expired
    if (age > entry.ttl) {
      this.invalidate(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Invalidate a specific cache entry
   * @param {string} key - Cache key
   */
  invalidate(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.stats.invalidations++;
    }
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  /**
   * Invalidate multiple cache entries by pattern
   * @param {string|RegExp} pattern - Key pattern to match
   */
  invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;

    const keysToInvalidate = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach(key => this.invalidate(key));
  }

  /**
   * Clear all cache entries
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats including size, hit rate, and entries
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        expired: (Date.now() - entry.timestamp) > entry.ttl
      })),
      stats: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        invalidations: this.stats.invalidations,
        hitRate: Math.round(hitRate * 100) / 100,
        totalRequests
      }
    };
  }
}

// Export singleton instance
const cacheManager = new CacheManager();
export default cacheManager;
