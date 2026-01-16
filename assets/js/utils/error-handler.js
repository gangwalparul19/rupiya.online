// Centralized Error Handler
// Handles errors gracefully with user-friendly messages

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * Handle error with user-friendly message
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @param {boolean} showToast - Show toast notification
   */
  handle(error, context = '', showToast = true) {
    // Create comprehensive error entry
    const errorEntry = this.createErrorEntry(error, context);

    // Log error to console with full context
    console.error('[Error]', errorEntry);

    // Add to error log
    this.logError(errorEntry);

    // Get user-friendly message
    const message = this.getUserFriendlyMessage(error);

    // Show toast notification
    if (showToast && window.showToast) {
      window.showToast(message, 'error');
    }

    return message;
  }

  /**
   * Create comprehensive error entry with full context
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @returns {Object} Error entry with full context
   */
  createErrorEntry(error, context) {
    // Get current user ID if available
    let userId = null;
    try {
      // Try to get from auth service if available
      if (window.authService && typeof window.authService.getCurrentUser === 'function') {
        const user = window.authService.getCurrentUser();
        userId = user?.uid || null;
      }
    } catch (e) {
      // Silently fail if auth service not available
    }

    return {
      timestamp: new Date().toISOString(),
      context,
      message: error.message || 'Unknown error',
      code: error.code || null,
      stack: error.stack || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId,
      // Additional browser context
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      online: navigator.onLine,
      // Error type classification
      errorType: this.classifyError(error)
    };
  }

  /**
   * Classify error type for better categorization
   * @param {Error} error - Error object
   * @returns {string} Error type
   */
  classifyError(error) {
    if (error.code && error.code.startsWith('auth/')) return 'authentication';
    if (error.code && error.code.startsWith('firestore/')) return 'database';
    if (error.code && error.code.startsWith('storage/')) return 'storage';
    if (error.message && error.message.includes('network')) return 'network';
    if (error.code === 'permission-denied') return 'permission';
    if (error.name === 'TypeError') return 'type';
    if (error.name === 'ReferenceError') return 'reference';
    return 'unknown';
  }

  /**
   * Log error for debugging
   * @param {Object} errorEntry - Error entry with full context
   */
  logError(errorEntry) {
    this.errorLog.push(errorEntry);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Send to analytics/monitoring service (if configured)
    this.sendToMonitoring(errorEntry);
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} User-friendly message
   */
  getUserFriendlyMessage(error) {
    // Firebase Auth errors
    if (error.code && error.code.startsWith('auth/')) {
      return this.getAuthErrorMessage(error.code);
    }

    // Firebase Firestore errors
    if (error.code && error.code.startsWith('firestore/')) {
      return this.getFirestoreErrorMessage(error.code);
    }

    // Firebase Storage errors
    if (error.code && error.code.startsWith('storage/')) {
      return this.getStorageErrorMessage(error.code);
    }

    // Network errors
    if (error.message && error.message.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }

    // Permission errors
    if (error.code === 'permission-denied') {
      return 'You do not have permission to perform this action.';
    }

    // Generic error
    return error.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get Firebase Auth error message
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly message
   */
  getAuthErrorMessage(errorCode) {
    const messages = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Please sign up.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
      'auth/requires-recent-login': 'This action requires recent authentication. Please sign in again.'
    };

    return messages[errorCode] || 'Authentication error. Please try again.';
  }

  /**
   * Get Firebase Firestore error message
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly message
   */
  getFirestoreErrorMessage(errorCode) {
    const messages = {
      'firestore/permission-denied': 'You do not have permission to access this data.',
      'firestore/unavailable': 'Service temporarily unavailable. Please try again.',
      'firestore/not-found': 'The requested data was not found.',
      'firestore/already-exists': 'This data already exists.',
      'firestore/resource-exhausted': 'Too many requests. Please try again later.',
      'firestore/failed-precondition': 'Operation failed. Please refresh and try again.',
      'firestore/aborted': 'Operation was aborted. Please try again.',
      'firestore/out-of-range': 'Invalid data range.',
      'firestore/unimplemented': 'This feature is not yet implemented.',
      'firestore/internal': 'Internal error. Please try again.',
      'firestore/data-loss': 'Data loss detected. Please contact support.',
      'firestore/unauthenticated': 'Please sign in to continue.'
    };

    return messages[errorCode] || 'Database error. Please try again.';
  }

  /**
   * Get Firebase Storage error message
   * @param {string} errorCode - Firebase error code
   * @returns {string} User-friendly message
   */
  getStorageErrorMessage(errorCode) {
    const messages = {
      'storage/unknown': 'An unknown error occurred. Please try again.',
      'storage/object-not-found': 'File not found.',
      'storage/bucket-not-found': 'Storage bucket not found.',
      'storage/project-not-found': 'Project not found.',
      'storage/quota-exceeded': 'Storage quota exceeded.',
      'storage/unauthenticated': 'Please sign in to upload files.',
      'storage/unauthorized': 'You do not have permission to upload files.',
      'storage/retry-limit-exceeded': 'Upload failed after multiple retries.',
      'storage/invalid-checksum': 'File upload failed. Please try again.',
      'storage/canceled': 'Upload was cancelled.',
      'storage/invalid-event-name': 'Invalid event name.',
      'storage/invalid-url': 'Invalid file URL.',
      'storage/invalid-argument': 'Invalid file or argument.',
      'storage/no-default-bucket': 'No storage bucket configured.',
      'storage/cannot-slice-blob': 'File upload failed. Please try again.',
      'storage/server-file-wrong-size': 'File size mismatch. Please try again.'
    };

    return messages[errorCode] || 'File upload error. Please try again.';
  }

  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} initialDelay - Initial delay in milliseconds
   * @returns {Promise} Operation result
   */
  async retry(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error object
   * @returns {boolean} True if should not retry
   */
  shouldNotRetry(error) {
    const noRetryErrors = [
      'auth/invalid-email',
      'auth/user-not-found',
      'auth/wrong-password',
      'firestore/permission-denied',
      'storage/unauthorized',
      'storage/unauthenticated'
    ];

    return noRetryErrors.includes(error.code);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle network errors
   * @param {Error} error - Error object
   * @returns {boolean} True if network error
   */
  isNetworkError(error) {
    return (
      !navigator.onLine ||
      error.message.includes('network') ||
      error.message.includes('offline') ||
      error.code === 'unavailable'
    );
  }

  /**
   * Show offline message
   */
  showOfflineMessage() {
    if (window.showToast) {
      window.showToast('You are offline. Some features may not work.', 'warning');
    }
  }

  /**
   * Show online message
   */
  showOnlineMessage() {
    if (window.showToast) {
      window.showToast('You are back online!', 'success');
    }
  }

  /**
   * Monitor network status
   */
  monitorNetworkStatus() {
    window.addEventListener('offline', () => {
      this.showOfflineMessage();
    });

    window.addEventListener('online', () => {
      this.showOnlineMessage();
    });
  }

  /**
   * Get error log
   * @returns {Array} Error log
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Export error log as JSON
   * @returns {string} JSON string of error log
   */
  exportErrorLog() {
    return JSON.stringify(this.errorLog, null, 2);
  }

  /**
   * Send error to monitoring service
   * @param {Object} errorEntry - Error entry with full context
   */
  sendToMonitoring(errorEntry) {
    // Implement integration with monitoring service (e.g., Sentry, LogRocket)
    // TODO: Add integration with error monitoring service
    // Example for Sentry:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(errorEntry.message), {
    //     contexts: {
    //       error: errorEntry
    //     }
    //   });
    // }

    // Example for LogRocket:
    // if (window.LogRocket) {
    //   window.LogRocket.captureException(new Error(errorEntry.message), {
    //     extra: errorEntry
    //   });
    // }
  }

  /**
   * Handle promise rejection
   * @param {Event} event - Unhandled rejection event
   */
  handleUnhandledRejection(event) {
    event.preventDefault();
    
    // Create error object from rejection reason
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.handle(error, 'Unhandled Promise Rejection');
  }

  /**
   * Handle global errors
   * @param {Event} event - Error event
   */
  handleGlobalError(event) {
    event.preventDefault();
    
    // Create error object with additional context
    const error = event.error || new Error(event.message);
    const context = `Global Error${event.filename ? ` in ${event.filename}:${event.lineno}:${event.colno}` : ''}`;
    
    this.handle(error, context);
  }

  /**
   * Initialize global error handlers
   */
  initGlobalHandlers() {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    window.addEventListener('error', (event) => {
      this.handleGlobalError(event);
    });

    this.monitorNetworkStatus();
  }
}

// Create and export singleton instance
const errorHandler = new ErrorHandler();
errorHandler.initGlobalHandlers();

export default errorHandler;

