// Safe JSON parsing utility - prevents crashes from corrupted data
// Provides fallback values and error logging

import logger from './logger.js';

const log = logger.create('SafeParse');

/**
 * Safely parse JSON string with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Value to return if parsing fails
 * @param {string} context - Context for error logging
 * @returns {*} Parsed object or defaultValue
 */
export function safeJsonParse(jsonString, defaultValue = null, context = '') {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    log.error(`Failed to parse JSON${context ? ` in ${context}` : ''}:`, error.message);
    return defaultValue;
  }
}

/**
 * Safely stringify object to JSON
 * @param {*} obj - Object to stringify
 * @param {string} defaultValue - Value to return if stringification fails
 * @param {string} context - Context for error logging
 * @returns {string} JSON string or defaultValue
 */
export function safeJsonStringify(obj, defaultValue = '{}', context = '') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    log.error(`Failed to stringify JSON${context ? ` in ${context}` : ''}:`, error.message);
    return defaultValue;
  }
}

/**
 * Safely get nested property from object
 * @param {object} obj - Object to access
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Value to return if path doesn't exist
 * @returns {*} Property value or defaultValue
 */
export function safeGet(obj, path, defaultValue = null) {
  try {
    const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
    return value !== undefined ? value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Safely set nested property in object
 * @param {object} obj - Object to modify
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} value - Value to set
 * @returns {object} Modified object
 */
export function safeSet(obj, path, value) {
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  } catch (error) {
    log.error('Failed to set nested property:', error.message);
    return obj;
  }
}

export default {
  safeJsonParse,
  safeJsonStringify,
  safeGet,
  safeSet
};
