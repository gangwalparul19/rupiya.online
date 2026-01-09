/**
 * Animation Timing Utility
 * Provides consistent animation timing, easing functions, and durations
 * Ensures all animations across the application follow the same patterns
 */

const AnimationTiming = {
  // Animation durations (in milliseconds)
  DURATIONS: {
    INSTANT: 0,
    FAST: 150,
    BASE: 300,
    SLOW: 500,
    SLOWER: 750,
    SLOWEST: 1000
  },

  // Easing functions (CSS easing values)
  EASING: {
    LINEAR: 'linear',
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    EASE_IN_QUAD: 'cubic-bezier(0.11, 0, 0.5, 0)',
    EASE_OUT_QUAD: 'cubic-bezier(0.5, 1, 0.89, 1)',
    EASE_IN_OUT_QUAD: 'cubic-bezier(0.45, 0.1, 0.55, 0.9)',
    EASE_IN_CUBIC: 'cubic-bezier(0.32, 0, 0.67, 0)',
    EASE_OUT_CUBIC: 'cubic-bezier(0.33, 1, 0.68, 1)',
    EASE_IN_OUT_CUBIC: 'cubic-bezier(0.65, 0, 0.35, 1)',
    EASE_OUT_BACK: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    EASE_IN_OUT_BACK: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },

  // Predefined animation configurations
  ANIMATIONS: {
    // Skeleton screen shimmer
    SKELETON_SHIMMER: {
      duration: 1500,
      easing: 'linear',
      delay: 0,
      iterationCount: 'infinite'
    },

    // Fade in
    FADE_IN: {
      duration: 300,
      easing: 'ease-out',
      delay: 0,
      iterationCount: 1
    },

    // Fade out
    FADE_OUT: {
      duration: 300,
      easing: 'ease-in',
      delay: 0,
      iterationCount: 1
    },

    // Slide in from left
    SLIDE_IN_LEFT: {
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 0,
      iterationCount: 1
    },

    // Slide in from right
    SLIDE_IN_RIGHT: {
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 0,
      iterationCount: 1
    },

    // Slide out to left
    SLIDE_OUT_LEFT: {
      duration: 300,
      easing: 'ease-in',
      delay: 0,
      iterationCount: 1
    },

    // Slide out to right
    SLIDE_OUT_RIGHT: {
      duration: 300,
      easing: 'ease-in',
      delay: 0,
      iterationCount: 1
    },

    // Scale up
    SCALE_UP: {
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 0,
      iterationCount: 1
    },

    // Scale down
    SCALE_DOWN: {
      duration: 300,
      easing: 'ease-in',
      delay: 0,
      iterationCount: 1
    },

    // Pulse
    PULSE: {
      duration: 2000,
      easing: 'ease-in-out',
      delay: 0,
      iterationCount: 'infinite'
    },

    // Bounce
    BOUNCE: {
      duration: 600,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      delay: 0,
      iterationCount: 1
    },

    // Skeleton to content transition
    SKELETON_TRANSITION: {
      duration: 300,
      easing: 'ease-out',
      delay: 0,
      iterationCount: 1
    },

    // Button loading state
    BUTTON_LOADING: {
      duration: 1000,
      easing: 'linear',
      delay: 0,
      iterationCount: 'infinite'
    },

    // Form submission
    FORM_SUBMIT: {
      duration: 300,
      easing: 'ease-out',
      delay: 0,
      iterationCount: 1
    }
  },

  /**
   * Get animation duration in milliseconds
   * @param {string} key - Duration key (INSTANT, FAST, BASE, SLOW, SLOWER, SLOWEST)
   * @returns {number} - Duration in milliseconds
   */
  getDuration(key) {
    return this.DURATIONS[key] !== undefined ? this.DURATIONS[key] : this.DURATIONS.BASE;
  },

  /**
   * Get easing function
   * @param {string} key - Easing key
   * @returns {string} - CSS easing value
   */
  getEasing(key) {
    return this.EASING[key] || this.EASING.EASE_OUT;
  },

  /**
   * Get animation configuration
   * @param {string} animationName - Animation name
   * @returns {Object} - Animation configuration
   */
  getAnimation(animationName) {
    return this.ANIMATIONS[animationName] || this.ANIMATIONS.FADE_IN;
  },

  /**
   * Apply animation to element
   * @param {HTMLElement} element - Element to animate
   * @param {string} animationName - Animation name or keyframe name
   * @param {Object} options - Override options
   */
  applyAnimation(element, animationName, options = {}) {
    if (!element) return;

    const config = { ...this.getAnimation(animationName), ...options };

    element.style.animation = `${animationName} ${config.duration}ms ${config.easing} ${config.delay}ms ${config.iterationCount}`;
  },

  /**
   * Create CSS animation string
   * @param {string} animationName - Animation name
   * @param {Object} options - Override options
   * @returns {string} - CSS animation string
   */
  getAnimationCSS(animationName, options = {}) {
    const config = { ...this.getAnimation(animationName), ...options };
    return `${animationName} ${config.duration}ms ${config.easing} ${config.delay}ms ${config.iterationCount}`;
  },

  /**
   * Create CSS transition string
   * @param {string} property - CSS property to transition
   * @param {string} durationKey - Duration key
   * @param {string} easingKey - Easing key
   * @param {number} delay - Delay in milliseconds
   * @returns {string} - CSS transition string
   */
  getTransitionCSS(property, durationKey = 'BASE', easingKey = 'EASE_OUT', delay = 0) {
    const duration = this.getDuration(durationKey);
    const easing = this.getEasing(easingKey);
    return `${property} ${duration}ms ${easing} ${delay}ms`;
  },

  /**
   * Apply transition to element
   * @param {HTMLElement} element - Element to transition
   * @param {string} property - CSS property to transition
   * @param {string} durationKey - Duration key
   * @param {string} easingKey - Easing key
   * @param {number} delay - Delay in milliseconds
   */
  applyTransition(element, property, durationKey = 'BASE', easingKey = 'EASE_OUT', delay = 0) {
    if (!element) return;

    const transitionCSS = this.getTransitionCSS(property, durationKey, easingKey, delay);
    element.style.transition = transitionCSS;
  },

  /**
   * Apply multiple transitions to element
   * @param {HTMLElement} element - Element to transition
   * @param {Array} transitions - Array of transition configs [{property, durationKey, easingKey, delay}]
   */
  applyMultipleTransitions(element, transitions) {
    if (!element || !Array.isArray(transitions)) return;

    const transitionStrings = transitions.map(t =>
      this.getTransitionCSS(t.property, t.durationKey, t.easingKey, t.delay)
    );

    element.style.transition = transitionStrings.join(', ');
  },

  /**
   * Wait for animation to complete
   * @param {HTMLElement} element - Element being animated
   * @returns {Promise} - Resolves when animation completes
   */
  waitForAnimation(element) {
    return new Promise(resolve => {
      if (!element) {
        resolve();
        return;
      }

      const handleAnimationEnd = () => {
        element.removeEventListener('animationend', handleAnimationEnd);
        resolve();
      };

      element.addEventListener('animationend', handleAnimationEnd);
    });
  },

  /**
   * Wait for transition to complete
   * @param {HTMLElement} element - Element being transitioned
   * @returns {Promise} - Resolves when transition completes
   */
  waitForTransition(element) {
    return new Promise(resolve => {
      if (!element) {
        resolve();
        return;
      }

      const handleTransitionEnd = () => {
        element.removeEventListener('transitionend', handleTransitionEnd);
        resolve();
      };

      element.addEventListener('transitionend', handleTransitionEnd);
    });
  },

  /**
   * Debounce animation calls
   * @param {Function} callback - Callback function
   * @param {string} durationKey - Duration key for debounce
   * @returns {Function} - Debounced function
   */
  debounceAnimation(callback, durationKey = 'BASE') {
    let timeoutId;
    const duration = this.getDuration(durationKey);

    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback.apply(this, args), duration);
    };
  },

  /**
   * Throttle animation calls
   * @param {Function} callback - Callback function
   * @param {string} durationKey - Duration key for throttle
   * @returns {Function} - Throttled function
   */
  throttleAnimation(callback, durationKey = 'BASE') {
    let lastCall = 0;
    const duration = this.getDuration(durationKey);

    return function throttled(...args) {
      const now = Date.now();
      if (now - lastCall >= duration) {
        lastCall = now;
        callback.apply(this, args);
      }
    };
  }
};

export default AnimationTiming;
