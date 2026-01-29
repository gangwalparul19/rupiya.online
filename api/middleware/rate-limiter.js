/**
 * Server-Side Rate Limiter Middleware
 * Protects API endpoints from abuse
 */

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
  // Default limits
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  
  // Endpoint-specific limits
  endpoints: {
    '/api/send-feedback': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5 // Max 5 feedback submissions per hour
    },
    '/api/send-invitation': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10 // Max 10 invitations per hour
    },
    '/api/send-trip-invitation': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10
    },
    '/api/send-weekly-report': {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: 2 // Max 2 reports per day
    },
    '/api/send-monthly-report': {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxRequests: 2
    }
  }
};

/**
 * Get client identifier (IP address or user ID)
 */
function getClientId(req) {
  // Try to get user ID from request (if authenticated)
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (userId) return `user:${userId}`;
  
  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  return `ip:${ip}`;
}

/**
 * Get rate limit config for endpoint
 */
function getConfig(endpoint) {
  return RATE_LIMIT_CONFIG.endpoints[endpoint] || RATE_LIMIT_CONFIG.default;
}

/**
 * Clean up expired entries
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000);

/**
 * Rate limiter middleware
 */
export function rateLimiter(req, res, next) {
  const clientId = getClientId(req);
  const endpoint = req.path || req.url;
  const config = getConfig(endpoint);
  
  const key = `${clientId}:${endpoint}`;
  const now = Date.now();
  
  // Get or create rate limit record
  let record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // Create new record
    record = {
      count: 0,
      resetTime: now + config.windowMs,
      firstRequest: now
    };
    rateLimitStore.set(key, record);
  }
  
  // Increment request count
  record.count++;
  
  // Calculate remaining requests
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetTime = Math.ceil((record.resetTime - now) / 1000); // seconds
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetTime);
  
  // Check if limit exceeded
  if (record.count > config.maxRequests) {
    res.setHeader('Retry-After', resetTime);
    
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again in ${resetTime} seconds.`,
      retryAfter: resetTime,
      limit: config.maxRequests,
      windowMs: config.windowMs
    });
  }
  
  // Continue to next middleware
  if (next) next();
}

/**
 * Create rate limiter with custom config
 */
export function createRateLimiter(options = {}) {
  const config = {
    windowMs: options.windowMs || RATE_LIMIT_CONFIG.default.windowMs,
    maxRequests: options.maxRequests || RATE_LIMIT_CONFIG.default.maxRequests
  };
  
  return (req, res, next) => {
    const clientId = getClientId(req);
    const key = `${clientId}:custom`;
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      rateLimitStore.set(key, record);
    }
    
    record.count++;
    
    const remaining = Math.max(0, config.maxRequests - record.count);
    const resetTime = Math.ceil((record.resetTime - now) / 1000);
    
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);
    
    if (record.count > config.maxRequests) {
      res.setHeader('Retry-After', resetTime);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again in ${resetTime} seconds.`,
        retryAfter: resetTime
      });
    }
    
    if (next) next();
  };
}

/**
 * Reset rate limit for a client
 */
export function resetRateLimit(clientId, endpoint) {
  const key = `${clientId}:${endpoint}`;
  rateLimitStore.delete(key);
}

/**
 * Get rate limit status for a client
 */
export function getRateLimitStatus(clientId, endpoint) {
  const key = `${clientId}:${endpoint}`;
  const record = rateLimitStore.get(key);
  const config = getConfig(endpoint);
  
  if (!record) {
    return {
      count: 0,
      remaining: config.maxRequests,
      resetTime: null
    };
  }
  
  const now = Date.now();
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetTime = Math.ceil((record.resetTime - now) / 1000);
  
  return {
    count: record.count,
    remaining,
    resetTime,
    exceeded: record.count > config.maxRequests
  };
}

// Export for use in serverless functions
export default rateLimiter;
