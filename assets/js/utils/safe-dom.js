// Safe DOM manipulation utilities - prevents crashes from missing elements
// Provides null-safe methods for common DOM operations

import logger from './logger.js';

const log = logger.create('SafeDOM');

/**
 * Safely get element by ID
 * @param {string} id - Element ID
 * @param {boolean} throwError - Whether to throw error if not found
 * @returns {Element|null} Element or null
 */
export function safeGetById(id, throwError = false) {
  try {
    const element = document.getElementById(id);
    if (!element && throwError) {
      throw new Error(`Element with ID "${id}" not found`);
    }
    return element;
  } catch (error) {
    log.error(`Failed to get element by ID "${id}":`, error.message);
    if (throwError) throw error;
    return null;
  }
}

/**
 * Safely query selector
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element (defaults to document)
 * @returns {Element|null} Element or null
 */
export function safeQuery(selector, parent = document) {
  try {
    return parent?.querySelector(selector) || null;
  } catch (error) {
    log.error(`Failed to query selector "${selector}":`, error.message);
    return null;
  }
}

/**
 * Safely query all elements
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element (defaults to document)
 * @returns {Element[]} Array of elements
 */
export function safeQueryAll(selector, parent = document) {
  try {
    return Array.from(parent?.querySelectorAll(selector) || []);
  } catch (error) {
    log.error(`Failed to query all "${selector}":`, error.message);
    return [];
  }
}

/**
 * Safely set element text content
 * @param {Element|string} element - Element or element ID
 * @param {string} text - Text content
 * @returns {boolean} Success status
 */
export function safeSetText(element, text) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.textContent = text;
    return true;
  } catch (error) {
    log.error('Failed to set text content:', error.message);
    return false;
  }
}

/**
 * Safely set element HTML content
 * @param {Element|string} element - Element or element ID
 * @param {string} html - HTML content
 * @returns {boolean} Success status
 */
export function safeSetHtml(element, html) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.innerHTML = html;
    return true;
  } catch (error) {
    log.error('Failed to set HTML content:', error.message);
    return false;
  }
}

/**
 * Safely get element value
 * @param {Element|string} element - Element or element ID
 * @param {*} defaultValue - Default value if element not found
 * @returns {*} Element value or defaultValue
 */
export function safeGetValue(element, defaultValue = '') {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return defaultValue;
    return el.value !== undefined ? el.value : defaultValue;
  } catch (error) {
    log.error('Failed to get element value:', error.message);
    return defaultValue;
  }
}

/**
 * Safely set element value
 * @param {Element|string} element - Element or element ID
 * @param {*} value - Value to set
 * @returns {boolean} Success status
 */
export function safeSetValue(element, value) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.value = value;
    return true;
  } catch (error) {
    log.error('Failed to set element value:', error.message);
    return false;
  }
}

/**
 * Safely add class to element
 * @param {Element|string} element - Element or element ID
 * @param {string} className - Class name
 * @returns {boolean} Success status
 */
export function safeAddClass(element, className) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.classList.add(className);
    return true;
  } catch (error) {
    log.error('Failed to add class:', error.message);
    return false;
  }
}

/**
 * Safely remove class from element
 * @param {Element|string} element - Element or element ID
 * @param {string} className - Class name
 * @returns {boolean} Success status
 */
export function safeRemoveClass(element, className) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.classList.remove(className);
    return true;
  } catch (error) {
    log.error('Failed to remove class:', error.message);
    return false;
  }
}

/**
 * Safely toggle class on element
 * @param {Element|string} element - Element or element ID
 * @param {string} className - Class name
 * @returns {boolean} Success status
 */
export function safeToggleClass(element, className) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.classList.toggle(className);
    return true;
  } catch (error) {
    log.error('Failed to toggle class:', error.message);
    return false;
  }
}

/**
 * Safely set element attribute
 * @param {Element|string} element - Element or element ID
 * @param {string} attr - Attribute name
 * @param {string} value - Attribute value
 * @returns {boolean} Success status
 */
export function safeSetAttr(element, attr, value) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.setAttribute(attr, value);
    return true;
  } catch (error) {
    log.error('Failed to set attribute:', error.message);
    return false;
  }
}

/**
 * Safely get element attribute
 * @param {Element|string} element - Element or element ID
 * @param {string} attr - Attribute name
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Attribute value or defaultValue
 */
export function safeGetAttr(element, attr, defaultValue = null) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return defaultValue;
    return el.getAttribute(attr) || defaultValue;
  } catch (error) {
    log.error('Failed to get attribute:', error.message);
    return defaultValue;
  }
}

/**
 * Safely add event listener
 * @param {Element|string} element - Element or element ID
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @returns {boolean} Success status
 */
export function safeAddListener(element, event, handler) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el || typeof handler !== 'function') return false;
    el.addEventListener(event, handler);
    return true;
  } catch (error) {
    log.error('Failed to add event listener:', error.message);
    return false;
  }
}

/**
 * Safely remove event listener
 * @param {Element|string} element - Element or element ID
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @returns {boolean} Success status
 */
export function safeRemoveListener(element, event, handler) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el || typeof handler !== 'function') return false;
    el.removeEventListener(event, handler);
    return true;
  } catch (error) {
    log.error('Failed to remove event listener:', error.message);
    return false;
  }
}

/**
 * Safely show element
 * @param {Element|string} element - Element or element ID
 * @returns {boolean} Success status
 */
export function safeShow(element) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.style.display = '';
    return true;
  } catch (error) {
    log.error('Failed to show element:', error.message);
    return false;
  }
}

/**
 * Safely hide element
 * @param {Element|string} element - Element or element ID
 * @returns {boolean} Success status
 */
export function safeHide(element) {
  try {
    const el = typeof element === 'string' ? safeGetById(element) : element;
    if (!el) return false;
    el.style.display = 'none';
    return true;
  } catch (error) {
    log.error('Failed to hide element:', error.message);
    return false;
  }
}

export default {
  safeGetById,
  safeQuery,
  safeQueryAll,
  safeSetText,
  safeSetHtml,
  safeGetValue,
  safeSetValue,
  safeAddClass,
  safeRemoveClass,
  safeToggleClass,
  safeSetAttr,
  safeGetAttr,
  safeAddListener,
  safeRemoveListener,
  safeShow,
  safeHide
};
