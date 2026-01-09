// Mock Firebase modules
global.firebase = {
  firestore: {
    Timestamp: {
      now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
      fromDate: (date) => ({ toMillis: () => date.getTime(), toDate: () => date })
    }
  }
};

// Mock fetch for Firebase imports
global.fetch = () => Promise.reject(new Error('Firebase module not available in tests'));

// Suppress console output in tests
const noop = () => {};
global.console = {
  ...console,
  log: noop,
  debug: noop,
  info: noop,
  warn: noop,
};
