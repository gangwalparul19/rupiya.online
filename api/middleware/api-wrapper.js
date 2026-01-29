/**
 * API Wrapper with Security Middleware
 * Provides rate limiting, CORS, and error handling for all API endpoints
 */

import { rateLimiter } from './rate-limiter.js';

/**
 * CORS configuration
 */
const CORS_CONFIG = {
  allowedOrigins: [
    'https://rupiya.online',
    'https://www.rupiya.online',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  maxAge: 86400 // 24 hours
};

/**
 * Set CORS headers
 */
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (CORS_CONFIG.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow all origins in development
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', CORS_CONFIG.allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', CORS_CONFIG.allowedHeaders.join(', '));
  res.setHeader('Access-Control-Max-Age', CORS_CONFIG.maxAge);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Set security headers
 */
function setSecurityHeaders(res) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}

/**
 * Validate request method
 */
function validateMethod(req, res, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    res.status(405).json({
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed for this endpoint`,
      allowedMethods
    });
    return false;
  }
  return true;
}

/**
 * Error handler
 */
function handleError(res, error, statusCode = 500) {
  console.error('API Error:', error);
  
  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    error: error.name || 'Internal Server Error',
    message: isDev ? error.message : 'An error occurred processing your request',
    ...(isDev && { stack: error.stack })
  });
}

/**
 * API wrapper with middleware
 * @param {Function} handler - API handler function
 * @param {Object} options - Configuration options
 */
export function withMiddleware(handler, options = {}) {
  const {
    methods = ['GET', 'POST'],
    rateLimit = true,
    cors = true,
    requireAuth = false
  } = options;
  
  return async (req, res) => {
    try {
      // Set security headers
      setSecurityHeaders(res);
      
      // Handle CORS
      if (cors) {
        setCorsHeaders(req, res);
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.status(200).end();
          return;
        }
      }
      
      // Validate method
      if (!validateMethod(req, res, methods)) {
        return;
      }
      
      // Apply rate limiting
      if (rateLimit) {
        const rateLimitResult = await new Promise((resolve) => {
          rateLimiter(req, res, () => resolve(true));
        });
        
        // If rate limit exceeded, response is already sent
        if (res.headersSent) {
          return;
        }
      }
      
      // Check authentication if required
      if (requireAuth) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
          });
          return;
        }
        
        // Verify token (implement your auth logic)
        // const token = authHeader.substring(7);
        // const user = await verifyToken(token);
        // req.user = user;
      }
      
      // Call the actual handler
      await handler(req, res);
      
    } catch (error) {
      handleError(res, error);
    }
  };
}

/**
 * Success response helper
 */
export function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data
  });
}

/**
 * Error response helper
 */
export function sendError(res, message, statusCode = 400, errorCode = null) {
  res.status(statusCode).json({
    success: false,
    error: errorCode || 'Error',
    message
  });
}

/**
 * Validate required fields
 */
export function validateRequired(data, fields) {
  const missing = [];
  
  for (const field of fields) {
    if (!data[field]) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse request body (for serverless functions)
 */
export async function parseBody(req) {
  if (req.body) return req.body;
  
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export default withMiddleware;
