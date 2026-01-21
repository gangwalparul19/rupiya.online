/**
 * Safe Timestamp Utilities
 * Handles Firestore Timestamp conversion with proper null checks
 */

/**
 * Safely convert Firestore Timestamp to JavaScript Date
 * @param {*} timestamp - Firestore Timestamp or Date object
 * @param {Date} defaultValue - Default value if conversion fails
 * @returns {Date} JavaScript Date object
 */
export function toDate(timestamp, defaultValue = new Date()) {
  if (!timestamp) {
    return defaultValue;
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Firestore Timestamp with toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    try {
      return timestamp.toDate();
    } catch (error) {
      console.warn('Failed to convert Firestore Timestamp:', error);
      return defaultValue;
    }
  }

  // String date
  if (typeof timestamp === 'string') {
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? defaultValue : date;
    } catch (error) {
      console.warn('Failed to parse date string:', error);
      return defaultValue;
    }
  }

  // Timestamp in milliseconds
  if (typeof timestamp === 'number') {
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? defaultValue : date;
    } catch (error) {
      console.warn('Failed to parse timestamp number:', error);
      return defaultValue;
    }
  }

  return defaultValue;
}

/**
 * Safely format a Firestore Timestamp to locale string
 * @param {*} timestamp - Firestore Timestamp or Date object
 * @param {string} locale - Locale string (default: 'en-IN')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp, locale = 'en-IN', options = {}) {
  const date = toDate(timestamp);
  try {
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.warn('Failed to format date:', error);
    return 'Invalid Date';
  }
}

/**
 * Check if a value is a valid Firestore Timestamp
 * @param {*} value - Value to check
 * @returns {boolean} True if valid Firestore Timestamp
 */
export function isFirestoreTimestamp(value) {
  return value && typeof value.toDate === 'function';
}

/**
 * Safely compare two timestamps
 * @param {*} timestamp1 - First timestamp
 * @param {*} timestamp2 - Second timestamp
 * @returns {number} -1 if timestamp1 < timestamp2, 0 if equal, 1 if timestamp1 > timestamp2
 */
export function compareTimestamps(timestamp1, timestamp2) {
  const date1 = toDate(timestamp1);
  const date2 = toDate(timestamp2);
  
  const time1 = date1.getTime();
  const time2 = date2.getTime();
  
  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
}

export default {
  toDate,
  formatDate,
  isFirestoreTimestamp,
  compareTimestamps
};
