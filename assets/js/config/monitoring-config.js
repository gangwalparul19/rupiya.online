/**
 * Monitoring and Error Tracking Configuration
 * Integrates with Sentry for error tracking and performance monitoring
 */

// Environment detection
const isDev = window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1';
const isProd = window.location.hostname === 'rupiya.online' || 
               window.location.hostname === 'www.rupiya.online';

/**
 * Initialize Sentry for error tracking
 * Add this script to your HTML before other scripts:
 * <script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js" crossorigin="anonymous"></script>
 */
export function initSentry() {
  if (!window.Sentry) {
    console.warn('Sentry SDK not loaded');
    return;
  }

  // Only initialize in production
  if (!isProd) {
    console.log('Sentry disabled in development');
    return;
  }

  try {
    window.Sentry.init({
      // Replace with your actual Sentry DSN
      dsn: 'YOUR_SENTRY_DSN_HERE',
      
      // Environment
      environment: isProd ? 'production' : 'development',
      
      // Release version (from version.js)
      release: window.APP_VERSION || 'unknown',
      
      // Sample rate for error tracking (100% = all errors)
      sampleRate: 1.0,
      
      // Sample rate for performance monitoring (10% = 1 in 10 transactions)
      tracesSampleRate: isProd ? 0.1 : 0,
      
      // Performance monitoring
      integrations: [
        new window.Sentry.BrowserTracing({
          // Track navigation and page loads
          tracingOrigins: ['rupiya.online', 'www.rupiya.online'],
          
          // Track fetch/XHR requests
          traceFetch: true,
          traceXHR: true
        }),
        
        // Replay sessions for debugging
        new window.Sentry.Replay({
          // Sample rate for session replay (5% = 1 in 20 sessions)
          sessionSampleRate: 0.05,
          
          // Sample rate for error replay (100% = all errors)
          errorSampleRate: 1.0,
          
          // Mask sensitive data
          maskAllText: false,
          maskAllInputs: true,
          blockAllMedia: false
        })
      ],
      
      // Filter out known benign errors
      beforeSend(event, hint) {
        const error = hint.originalException;
        
        // Filter out Firestore idle timeout errors (benign)
        if (error && error.message && 
            error.message.includes('idle timeout')) {
          return null;
        }
        
        // Filter out extension errors
        if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
          frame => frame.filename?.includes('extension://')
        )) {
          return null;
        }
        
        return event;
      },
      
      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        
        // Network errors (handled separately)
        'NetworkError',
        'Failed to fetch',
        
        // ResizeObserver (benign)
        'ResizeObserver loop limit exceeded'
      ],
      
      // Deny URLs (don't track errors from these sources)
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i
      ]
    });

    console.log('Sentry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Initialize LogRocket for session replay
 * Add this script to your HTML:
 * <script src="https://cdn.logrocket.io/LogRocket.min.js" crossorigin="anonymous"></script>
 */
export function initLogRocket() {
  if (!window.LogRocket) {
    console.warn('LogRocket SDK not loaded');
    return;
  }

  // Only initialize in production
  if (!isProd) {
    console.log('LogRocket disabled in development');
    return;
  }

  try {
    // Replace with your actual LogRocket app ID
    window.LogRocket.init('YOUR_LOGROCKET_APP_ID');
    
    // Identify user (call this after authentication)
    // LogRocket.identify(userId, { name, email });
    
    // Integrate with Sentry
    if (window.Sentry) {
      window.LogRocket.getSessionURL(sessionURL => {
        window.Sentry.configureScope(scope => {
          scope.setExtra('sessionURL', sessionURL);
        });
      });
    }

    console.log('LogRocket initialized successfully');
  } catch (error) {
    console.error('Failed to initialize LogRocket:', error);
  }
}

/**
 * Set user context for monitoring
 * Call this after user authentication
 */
export function setUserContext(user) {
  if (!user) return;

  // Sentry user context
  if (window.Sentry) {
    window.Sentry.setUser({
      id: user.uid,
      email: user.email,
      username: user.displayName
    });
  }

  // LogRocket user identification
  if (window.LogRocket) {
    window.LogRocket.identify(user.uid, {
      name: user.displayName,
      email: user.email
    });
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (window.Sentry) {
    window.Sentry.setUser(null);
  }
}

/**
 * Track custom event
 */
export function trackEvent(eventName, data = {}) {
  if (window.Sentry) {
    window.Sentry.addBreadcrumb({
      category: 'user-action',
      message: eventName,
      level: 'info',
      data
    });
  }
}

/**
 * Track performance metric
 */
export function trackPerformance(metricName, value, unit = 'ms') {
  if (window.Sentry) {
    window.Sentry.metrics.distribution(metricName, value, {
      unit,
      tags: { environment: isProd ? 'production' : 'development' }
    });
  }
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSentry();
    initLogRocket();
  });
} else {
  initSentry();
  initLogRocket();
}
