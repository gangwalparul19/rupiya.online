// Mock Firebase modules
global.firebase = {
  firestore: {
    Timestamp: {
      now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
      fromDate: (date) => ({ toMillis: () => date.getTime(), toDate: () => date })
    }
  }
};

// Suppress console output in tests
const noop = () => {};
global.console = {
  ...console,
  log: noop,
  debug: noop,
  info: noop,
  warn: noop,
};
