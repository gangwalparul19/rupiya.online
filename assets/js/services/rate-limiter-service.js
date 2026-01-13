// Rate Limiter Service - Prevents abuse of Firestore queries and API calls
import logger from '../utils/logger.js';

class RateLimiterService {
  constructor() {
    this.limits = new Map();
    this.globalLimit = {
      maxRequests: 100,
      windowMs: 60000 // 1 minute
    };
    this.collectionLimits = {
      expenses: { maxRequests: 50, windowMs: 60000 },
      income: { maxRequests: 50, windowMs: 60000 },
      budgets: { maxRequests: 30, windowMs: 60000 },
      investments: { maxRequests: 30, windowMs: 60000 },
      goals: { maxRequests: 20, windowMs: 60000 },
      loans: { maxRequests: 20, windowMs: 60000 },
      houses: { maxRequests: 20, windowMs: 60000 },
      vehicles: { maxRequests: 20, windowMs: 60000 },
      notes: { maxRequests: 30, windowMs: 60000 },
      documents: { maxRequests: 30, windowMs: 60000 },
      transfers: { maxRequests: 20, windowMs: 60000 },
      splits: { maxRequests: 20, windowMs: 60000 }
    };
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - Unique identifier (userId, collection, etc.)
   * @param {string} collection - Collection name for specific limits
   * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(key, collection = null) {
    const now = Date.now();
    const limit = collection && this.collectionLimits[collection] 
      ? this.collectionLimits[collection] 
      : this.globalLimit;

    if (!this.limits.has(key)) {
      this.limits.set(key, {
        requests: [],
        collection
      });
    }

    const record = this.limits.get(key);
    const windowStart = now - limit.windowMs;

    // Remove old requests outside the window
    record.requests = record.requests.filter(time => time > windowStart);

    const allowed = record.requests.length < limit.maxRequests;
    const remaining = Math.max(0, limit.maxRequests - record.requests.length);
    const resetTime = record.requests.length > 0 
      ? record.requests[0] + limit.windowMs 
      : now + limit.windowMs;

    if (allowed) {
      record.requests.push(now);
      logger.debug(`Rate limit check passed for ${key}. Remaining: ${remaining}`);
    } else {
      logger.warn(`Rate limit exceeded for ${key}. Reset in ${resetTime - now}ms`);
    }

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000)
    };
  }

  /**
   * Throw error if rate limit exceeded
   * @param {string} key - Unique identifier
   * @param {string} collection - Collection name
   * @throws {Error} - If rate limit exceeded
   */
  enforceLimit(key, collection = null) {
    const result = this.checkLimit(key, collection);
    
    if (!result.allowed) {
      const error = new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds`);
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.retryAfter = result.retryAfter;
      error.resetTime = result.resetTime;
      throw error;
    }

    return result;
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.limits.delete(key);
    logger.debug(`Rate limit reset for ${key}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    this.limits.clear();
    logger.debug('All rate limits reset');
  }

  /**
   * Get current status for a key
   * @param {string} key - Unique identifier
   * @returns {object} - Current rate limit status
   */
  getStatus(key) {
    if (!this.limits.has(key)) {
      return {
        key,
        requests: 0,
        limit: this.globalLimit.maxRequests,
        window: this.globalLimit.windowMs
      };
    }

    const record = this.limits.get(key);
    const limit = this.collectionLimits[record.collection] || this.globalLimit;
    const now = Date.now();
    const windowStart = now - limit.windowMs;
    const activeRequests = record.requests.filter(time => time > windowStart).length;

    return {
      key,
      requests: activeRequests,
      limit: limit.maxRequests,
      window: limit.windowMs,
      remaining: Math.max(0, limit.maxRequests - activeRequests)
    };
  }

  /**
   * Get all active rate limits
   * @returns {array} - Array of all active rate limit records
   */
  getAllStatus() {
    const statuses = [];
    for (const [key] of this.limits) {
      statuses.push(this.getStatus(key));
    }
    return statuses;
  }

  /**
   * Update rate limit configuration
   * @param {string} collection - Collection name
   * @param {number} maxRequests - Maximum requests
   * @param {number} windowMs - Time window in milliseconds
   */
  updateLimit(collection, maxRequests, windowMs) {
    if (this.collectionLimits[collection]) {
      this.collectionLimits[collection] = { maxRequests, windowMs };
      logger.info(`Rate limit updated for ${collection}: ${maxRequests} requests per ${windowMs}ms`);
    }
  }

  /**
   * Create a rate-limited function wrapper
   * @param {function} fn - Function to wrap
   * @param {string} key - Rate limit key
   * @param {string} collection - Collection name
   * @returns {function} - Wrapped function
   */
  createLimitedFunction(fn, key, collection = null) {
    return async (...args) => {
      this.enforceLimit(key, collection);
      return fn(...args);
    };
  }

  /**
   * Cleanup old records (call periodically)
   */
  cleanup() {
    const now = Date.now();
    const maxWindow = Math.max(
      this.globalLimit.windowMs,
      ...Object.values(this.collectionLimits).map(l => l.windowMs)
    );

    for (const [key, record] of this.limits) {
      const windowStart = now - maxWindow;
      record.requests = record.requests.filter(time => time > windowStart);
      
      if (record.requests.length === 0) {
        this.limits.delete(key);
      }
    }
  }
}

export default new RateLimiterService();
