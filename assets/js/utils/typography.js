/**
 * Typography Utility
 * Provides consistent typography styles for analytics and UI components
 * Ensures consistent font sizes, weights, and spacing throughout the application
 */

const Typography = {
  // Font sizes (in rem)
  SIZES: {
    XS: '0.625rem',      // 10px
    SM: '0.75rem',       // 12px
    BASE: '0.875rem',    // 14px
    MD: '1rem',          // 16px
    LG: '1.125rem',      // 18px
    XL: '1.25rem',       // 20px
    '2XL': '1.5rem',     // 24px
    '3XL': '1.75rem',    // 28px
    '4XL': '2rem',       // 32px
    '5XL': '2.5rem'      // 40px
  },

  // Font weights
  WEIGHTS: {
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    EXTRABOLD: 800
  },

  // Line heights
  LINE_HEIGHTS: {
    TIGHT: 1.2,
    NORMAL: 1.5,
    RELAXED: 1.75,
    LOOSE: 2
  },

  // Letter spacing
  LETTER_SPACING: {
    TIGHT: '-0.02em',
    NORMAL: '0em',
    WIDE: '0.05em',
    WIDER: '0.1em'
  },

  // Spacing (in rem)
  SPACING: {
    XS: '0.25rem',    // 4px
    SM: '0.5rem',     // 8px
    MD: '1rem',       // 16px
    LG: '1.5rem',     // 24px
    XL: '2rem',       // 32px
    '2XL': '3rem',    // 48px
    '3XL': '4rem'     // 64px
  },

  // Predefined typography styles
  STYLES: {
    // Headings
    H1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      marginBottom: '1rem'
    },
    H2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      marginBottom: '0.875rem'
    },
    H3: {
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      marginBottom: '0.75rem'
    },
    H4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0em',
      marginBottom: '0.625rem'
    },
    H5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0em',
      marginBottom: '0.5rem'
    },
    H6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0em',
      marginBottom: '0.5rem'
    },

    // Body text
    BODY_LG: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em'
    },
    BODY_MD: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em'
    },
    BODY_SM: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0em'
    },

    // Labels and captions
    LABEL_LG: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0.05em',
      textTransform: 'uppercase'
    },
    LABEL_MD: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0.05em',
      textTransform: 'uppercase'
    },
    LABEL_SM: {
      fontSize: '0.625rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    },

    // Metrics and numbers
    METRIC_LG: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    METRIC_MD: {
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em'
    },
    METRIC_SM: {
      fontSize: '1.125rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '0em'
    }
  },

  /**
   * Apply typography style to an element
   * @param {HTMLElement} element - The element to apply typography to
   * @param {string} styleName - Name of the predefined style (e.g., 'H1', 'BODY_MD')
   */
  applyStyle(element, styleName) {
    if (!element || !this.STYLES[styleName]) return;

    const style = this.STYLES[styleName];
    Object.assign(element.style, style);
  },

  /**
   * Apply custom typography properties to an element
   * @param {HTMLElement} element - The element to apply typography to
   * @param {Object} properties - Typography properties (fontSize, fontWeight, etc.)
   */
  applyCustom(element, properties) {
    if (!element) return;

    Object.assign(element.style, properties);
  },

  /**
   * Get CSS string for a typography style
   * @param {string} styleName - Name of the predefined style
   * @returns {string} - CSS string
   */
  getStyleCSS(styleName) {
    if (!this.STYLES[styleName]) return '';

    const style = this.STYLES[styleName];
    return Object.entries(style)
      .map(([key, value]) => {
        // Convert camelCase to kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  },

  /**
   * Create a CSS class for a typography style
   * @param {string} className - Name of the CSS class
   * @param {string} styleName - Name of the predefined style
   * @returns {string} - CSS rule
   */
  createCSSClass(className, styleName) {
    if (!this.STYLES[styleName]) return '';

    const cssString = this.getStyleCSS(styleName);
    return `.${className} { ${cssString}; }`;
  },

  /**
   * Get spacing value
   * @param {string} size - Size key (XS, SM, MD, LG, XL, 2XL, 3XL)
   * @returns {string} - Spacing value in rem
   */
  getSpacing(size) {
    return this.SPACING[size] || this.SPACING.MD;
  },

  /**
   * Get font size value
   * @param {string} size - Size key (XS, SM, BASE, MD, LG, XL, 2XL, 3XL, 4XL, 5XL)
   * @returns {string} - Font size value in rem
   */
  getFontSize(size) {
    return this.SIZES[size] || this.SIZES.BASE;
  },

  /**
   * Get font weight value
   * @param {string} weight - Weight key (LIGHT, NORMAL, MEDIUM, SEMIBOLD, BOLD, EXTRABOLD)
   * @returns {number} - Font weight value
   */
  getFontWeight(weight) {
    return this.WEIGHTS[weight] || this.WEIGHTS.NORMAL;
  }
};

export default Typography;
