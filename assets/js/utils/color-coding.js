/**
 * Color Coding Utility
 * Provides consistent color coding for analytics values across the application
 * - Green for positive values
 * - Red for negative values
 * - Gray for neutral values
 */

const ColorCoding = {
  // Color constants
  COLORS: {
    POSITIVE: {
      light: 'rgba(39, 174, 96, 0.1)',
      main: 'rgba(39, 174, 96, 0.8)',
      dark: 'rgba(39, 174, 96, 1)',
      text: '#27ae60'
    },
    NEGATIVE: {
      light: 'rgba(231, 76, 60, 0.1)',
      main: 'rgba(231, 76, 60, 0.8)',
      dark: 'rgba(231, 76, 60, 1)',
      text: '#e74c3c'
    },
    NEUTRAL: {
      light: 'rgba(149, 165, 166, 0.1)',
      main: 'rgba(149, 165, 166, 0.8)',
      dark: 'rgba(149, 165, 166, 1)',
      text: '#95a5a6'
    }
  },

  /**
   * Get color based on value
   * @param {number} value - The value to determine color for
   * @param {string} variant - 'light', 'main', or 'dark' (default: 'main')
   * @returns {string} - RGBA color string
   */
  getColor(value, variant = 'main') {
    if (value > 0) {
      return this.COLORS.POSITIVE[variant];
    } else if (value < 0) {
      return this.COLORS.NEGATIVE[variant];
    } else {
      return this.COLORS.NEUTRAL[variant];
    }
  },

  /**
   * Get text color based on value
   * @param {number} value - The value to determine color for
   * @returns {string} - Hex color string
   */
  getTextColor(value) {
    if (value > 0) {
      return this.COLORS.POSITIVE.text;
    } else if (value < 0) {
      return this.COLORS.NEGATIVE.text;
    } else {
      return this.COLORS.NEUTRAL.text;
    }
  },

  /**
   * Apply color coding to an element
   * @param {HTMLElement} element - The element to apply color to
   * @param {number} value - The value to determine color for
   * @param {string} property - CSS property to apply color to ('color', 'backgroundColor', 'borderColor')
   * @param {string} variant - 'light', 'main', or 'dark' (default: 'main')
   */
  applyColorToElement(element, value, property = 'color', variant = 'main') {
    if (!element) return;
    
    const color = property === 'color' ? this.getTextColor(value) : this.getColor(value, variant);
    element.style[property] = color;
  },

  /**
   * Get CSS class for color coding
   * @param {number} value - The value to determine class for
   * @returns {string} - CSS class name
   */
  getColorClass(value) {
    if (value > 0) {
      return 'color-positive';
    } else if (value < 0) {
      return 'color-negative';
    } else {
      return 'color-neutral';
    }
  },

  /**
   * Format value with color coding
   * @param {number} value - The value to format
   * @param {string} prefix - Prefix for the value (e.g., '₹')
   * @returns {string} - HTML string with color-coded value
   */
  formatWithColor(value, prefix = '') {
    const colorClass = this.getColorClass(value);
    const sign = value > 0 ? '+' : '';
    return `<span class="${colorClass}">${sign}${prefix}${Math.abs(value).toLocaleString('en-IN')}</span>`;
  },

  /**
   * Get color for comparison (comparing two values)
   * @param {number} actual - Actual value
   * @param {number} target - Target value
   * @param {string} variant - 'light', 'main', or 'dark' (default: 'main')
   * @returns {string} - RGBA color string
   */
  getComparisonColor(actual, target, variant = 'main') {
    const difference = actual - target;
    return this.getColor(difference, variant);
  }
};

export default ColorCoding;
