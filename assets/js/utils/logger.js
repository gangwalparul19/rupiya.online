/**
 * Logger Service
 * Centralized logging with environment-based control
 * Only logs in development mode (localhost)
 */

class Logger {
  constructor() {
    this.isDev = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.hostname.includes('192.168.');
    this.prefix = '[Rupiya]';
  }

  /**
   * Set a custom prefix for log messages
   * @param {string} prefix - The prefix to use
   */
  setPrefix(prefix) {
    this.prefix = prefix;
  }

  /**
   * Create a namespaced logger
   * @param {string} namespace - The namespace (e.g., 'Auth', 'Dashboard')
   * @returns {Object} - Logger with namespace prefix
   */
  create(namespace) {
    const prefix = `[${namespace}]`;
    return {
      log: (...args) => this.log(prefix, ...args),
      info: (...args) => this.info(prefix, ...args),
      warn: (...args) => this.warn(prefix, ...args),
      error: (...args) => this.error(prefix, ...args),
      debug: (...args) => this.debug(prefix, ...args),
      group: (label) => this.group(`${prefix} ${label}`),
      groupEnd: () => this.groupEnd(),
      time: (label) => this.time(`${prefix} ${label}`),
      timeEnd: (label) => this.timeEnd(`${prefix} ${label}`)
    };
  }

  /**
   * Log message (dev only)
   */
  log(...args) {
    if (this.isDev) {
    }
  }

  /**
   * Info message (dev only)
   */
  info(...args) {
    if (this.isDev) {
      console.info(...args);
    }
  }

  /**
   * Warning message (always logged)
   */
  warn(...args) {
    console.warn(...args);
  }

  /**
   * Error message (always logged)
   */
  error(...args) {
    console.error(...args);
  }

  /**
   * Debug message (dev only)
   */
  debug(...args) {
    if (this.isDev) {
      console.debug(...args);
    }
  }

  /**
   * Group start (dev only)
   */
  group(label) {
    if (this.isDev) {
      console.group(label);
    }
  }

  /**
   * Group end (dev only)
   */
  groupEnd() {
    if (this.isDev) {
      console.groupEnd();
    }
  }

  /**
   * Timer start (dev only)
   */
  time(label) {
    if (this.isDev) {
      console.time(label);
    }
  }

  /**
   * Timer end (dev only)
   */
  timeEnd(label) {
    if (this.isDev) {
      console.timeEnd(label);
    }
  }

  /**
   * Check if in development mode
   */
  isDevMode() {
    return this.isDev;
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
export { Logger };
export default logger;
