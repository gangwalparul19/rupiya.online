/**
 * Animation Timing Tests
 * Feature: analytics-and-loading-enhancements
 * Property 22: Animation Timing Consistency
 * Validates: Requirements 5.4
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import AnimationTiming from '../animation-timing.js';

describe('Animation Timing Utility - Property 22: Animation Timing Consistency', () => {
  // Property 22: Animation Timing Consistency
  // For any loading state animation, the timing should be consistent across all animations
  // using the same easing functions and durations

  describe('Animation Duration Consistency', () => {
    test('should have consistent duration values for all predefined animations', () => {
      const animations = Object.values(AnimationTiming.ANIMATIONS);
      
      // All animations should have a duration property
      animations.forEach(animation => {
        expect(animation).toHaveProperty('duration');
        expect(typeof animation.duration).toBe('number');
        expect(animation.duration).toBeGreaterThanOrEqual(0);
      });
    });

    test('should return correct duration for all duration keys', () => {
      const expectedDurations = {
        INSTANT: 0,
        FAST: 150,
        BASE: 300,
        SLOW: 500,
        SLOWER: 750,
        SLOWEST: 1000
      };

      Object.entries(expectedDurations).forEach(([key, expectedDuration]) => {
        const duration = AnimationTiming.getDuration(key);
        expect(duration).toBe(expectedDuration);
      });
    });

    test('should return BASE duration for unknown duration key', () => {
      const duration = AnimationTiming.getDuration('UNKNOWN_KEY');
      expect(duration).toBe(AnimationTiming.DURATIONS.BASE);
    });

    test('should maintain consistent duration across multiple calls', () => {
      const duration1 = AnimationTiming.getDuration('BASE');
      const duration2 = AnimationTiming.getDuration('BASE');
      const duration3 = AnimationTiming.getDuration('BASE');

      expect(duration1).toBe(duration2);
      expect(duration2).toBe(duration3);
    });
  });

  describe('Easing Function Consistency', () => {
    test('should have consistent easing functions for all predefined animations', () => {
      const animations = Object.values(AnimationTiming.ANIMATIONS);
      
      // All animations should have an easing property
      animations.forEach(animation => {
        expect(animation).toHaveProperty('easing');
        expect(typeof animation.easing).toBe('string');
        expect(animation.easing.length).toBeGreaterThan(0);
      });
    });

    test('should return correct easing function for all easing keys', () => {
      const easingKeys = Object.keys(AnimationTiming.EASING);
      
      easingKeys.forEach(key => {
        const easing = AnimationTiming.getEasing(key);
        expect(easing).toBe(AnimationTiming.EASING[key]);
      });
    });

    test('should return EASE_OUT easing for unknown easing key', () => {
      const easing = AnimationTiming.getEasing('UNKNOWN_KEY');
      expect(easing).toBe(AnimationTiming.EASING.EASE_OUT);
    });

    test('should maintain consistent easing across multiple calls', () => {
      const easing1 = AnimationTiming.getEasing('EASE_OUT');
      const easing2 = AnimationTiming.getEasing('EASE_OUT');
      const easing3 = AnimationTiming.getEasing('EASE_OUT');

      expect(easing1).toBe(easing2);
      expect(easing2).toBe(easing3);
    });

    test('should use cubic-bezier format for custom easing functions', () => {
      const customEasings = [
        'EASE_IN_QUAD',
        'EASE_OUT_QUAD',
        'EASE_IN_OUT_QUAD',
        'EASE_IN_CUBIC',
        'EASE_OUT_CUBIC',
        'EASE_IN_OUT_CUBIC',
        'EASE_OUT_BACK',
        'EASE_IN_OUT_BACK'
      ];

      customEasings.forEach(key => {
        const easing = AnimationTiming.getEasing(key);
        expect(easing).toMatch(/^cubic-bezier\(/);
      });
    });
  });

  describe('Animation Configuration Consistency', () => {
    test('should have all required properties in animation configurations', () => {
      const requiredProperties = ['duration', 'easing', 'delay', 'iterationCount'];
      
      Object.values(AnimationTiming.ANIMATIONS).forEach(animation => {
        requiredProperties.forEach(prop => {
          expect(animation).toHaveProperty(prop);
        });
      });
    });

    test('should have consistent delay values (all should be 0 or positive)', () => {
      Object.values(AnimationTiming.ANIMATIONS).forEach(animation => {
        expect(animation.delay).toBeGreaterThanOrEqual(0);
      });
    });

    test('should have valid iteration count values', () => {
      const validIterationCounts = ['1', 'infinite'];
      
      Object.values(AnimationTiming.ANIMATIONS).forEach(animation => {
        expect(
          validIterationCounts.includes(animation.iterationCount) ||
          typeof animation.iterationCount === 'number'
        ).toBe(true);
      });
    });

    test('should return consistent animation configuration for same animation name', () => {
      const config1 = AnimationTiming.getAnimation('FADE_IN');
      const config2 = AnimationTiming.getAnimation('FADE_IN');

      expect(config1).toEqual(config2);
    });
  });

  describe('CSS Animation String Generation', () => {
    test('should generate valid CSS animation string', () => {
      const animationCSS = AnimationTiming.getAnimationCSS('FADE_IN');
      
      // Should contain animation name, duration, easing, delay, and iteration count
      expect(animationCSS).toContain('FADE_IN');
      expect(animationCSS).toContain('ms');
      expect(animationCSS).toMatch(/ease|linear|cubic-bezier/);
    });

    test('should generate consistent CSS animation strings for same animation', () => {
      const css1 = AnimationTiming.getAnimationCSS('FADE_IN');
      const css2 = AnimationTiming.getAnimationCSS('FADE_IN');

      expect(css1).toBe(css2);
    });

    test('should allow overriding animation configuration', () => {
      const customOptions = { duration: 500, easing: 'linear' };
      const animationCSS = AnimationTiming.getAnimationCSS('FADE_IN', customOptions);

      expect(animationCSS).toContain('500ms');
      expect(animationCSS).toContain('linear');
    });

    test('should generate valid CSS transition string', () => {
      const transitionCSS = AnimationTiming.getTransitionCSS('opacity', 'BASE', 'EASE_OUT', 0);
      
      // Should contain property, duration, easing, and delay
      expect(transitionCSS).toContain('opacity');
      expect(transitionCSS).toContain('300ms');
      expect(transitionCSS).toContain('ease-out');
    });

    test('should generate consistent CSS transition strings for same parameters', () => {
      const css1 = AnimationTiming.getTransitionCSS('opacity', 'BASE', 'EASE_OUT', 0);
      const css2 = AnimationTiming.getTransitionCSS('opacity', 'BASE', 'EASE_OUT', 0);

      expect(css1).toBe(css2);
    });
  });

  describe('Element Animation Application', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    });

    test('should apply animation to element', () => {
      AnimationTiming.applyAnimation(mockElement, 'FADE_IN');
      
      expect(mockElement.style.animation).toBeDefined();
      expect(mockElement.style.animation).toContain('FADE_IN');
    });

    test('should apply consistent animation to multiple elements', () => {
      const element1 = { style: {} };
      const element2 = { style: {} };

      AnimationTiming.applyAnimation(element1, 'FADE_IN');
      AnimationTiming.applyAnimation(element2, 'FADE_IN');

      expect(element1.style.animation).toBe(element2.style.animation);
    });

    test('should apply transition to element', () => {
      AnimationTiming.applyTransition(mockElement, 'opacity', 'BASE', 'EASE_OUT', 0);
      
      expect(mockElement.style.transition).toBeDefined();
      expect(mockElement.style.transition).toContain('opacity');
      expect(mockElement.style.transition).toContain('300ms');
    });

    test('should apply multiple transitions to element', () => {
      const transitions = [
        { property: 'opacity', durationKey: 'BASE', easingKey: 'EASE_OUT', delay: 0 },
        { property: 'transform', durationKey: 'BASE', easingKey: 'EASE_OUT', delay: 0 }
      ];

      AnimationTiming.applyMultipleTransitions(mockElement, transitions);

      expect(mockElement.style.transition).toContain('opacity');
      expect(mockElement.style.transition).toContain('transform');
      expect(mockElement.style.transition).toContain(',');
    });

    test('should handle null element gracefully', () => {
      expect(() => {
        AnimationTiming.applyAnimation(null, 'FADE_IN');
      }).not.toThrow();

      expect(() => {
        AnimationTiming.applyTransition(null, 'opacity');
      }).not.toThrow();
    });
  });

  describe('Loading State Animation Consistency', () => {
    test('should have consistent timing for all loading animations', () => {
      const loadingAnimations = [
        'SKELETON_SHIMMER',
        'BUTTON_LOADING',
        'SKELETON_TRANSITION',
        'FORM_SUBMIT'
      ];

      const durations = loadingAnimations.map(name => {
        const config = AnimationTiming.getAnimation(name);
        return config.duration;
      });

      // All durations should be valid numbers
      durations.forEach(duration => {
        expect(typeof duration).toBe('number');
        expect(duration).toBeGreaterThan(0);
      });
    });

    test('should use appropriate easing for different animation types', () => {
      // Shimmer should use linear
      const shimmerConfig = AnimationTiming.getAnimation('SKELETON_SHIMMER');
      expect(shimmerConfig.easing).toBe('linear');

      // Fade in should use ease-out
      const fadeInConfig = AnimationTiming.getAnimation('FADE_IN');
      expect(fadeInConfig.easing).toBe('ease-out');

      // Bounce should use cubic-bezier
      const bounceConfig = AnimationTiming.getAnimation('BOUNCE');
      expect(bounceConfig.easing).toMatch(/cubic-bezier/);
    });

    test('should have infinite iteration for continuous animations', () => {
      const continuousAnimations = [
        'SKELETON_SHIMMER',
        'BUTTON_LOADING',
        'PULSE'
      ];

      continuousAnimations.forEach(name => {
        const config = AnimationTiming.getAnimation(name);
        expect(config.iterationCount).toBe('infinite');
      });
    });

    test('should have single iteration for one-time animations', () => {
      const oneTimeAnimations = [
        'FADE_IN',
        'FADE_OUT',
        'SLIDE_IN_LEFT',
        'SCALE_UP',
        'BOUNCE'
      ];

      oneTimeAnimations.forEach(name => {
        const config = AnimationTiming.getAnimation(name);
        expect(config.iterationCount).toBe(1);
      });
    });
  });

  describe('Animation Timing Across Different Scenarios', () => {
    test('should maintain consistent timing for skeleton screen animations', () => {
      const shimmerConfig = AnimationTiming.getAnimation('SKELETON_SHIMMER');
      const transitionConfig = AnimationTiming.getAnimation('SKELETON_TRANSITION');

      // Shimmer should be longer than transition
      expect(shimmerConfig.duration).toBeGreaterThan(transitionConfig.duration);
      
      // Both should have valid durations
      expect(shimmerConfig.duration).toBeGreaterThan(0);
      expect(transitionConfig.duration).toBeGreaterThan(0);
    });

    test('should maintain consistent timing for button loading animations', () => {
      const buttonLoadingConfig = AnimationTiming.getAnimation('BUTTON_LOADING');
      
      expect(buttonLoadingConfig.duration).toBe(1000);
      expect(buttonLoadingConfig.easing).toBe('linear');
      expect(buttonLoadingConfig.iterationCount).toBe('infinite');
    });

    test('should maintain consistent timing for form submission animations', () => {
      const formSubmitConfig = AnimationTiming.getAnimation('FORM_SUBMIT');
      
      expect(formSubmitConfig.duration).toBe(300);
      expect(formSubmitConfig.easing).toBe('ease-out');
      expect(formSubmitConfig.iterationCount).toBe(1);
    });
  });

  describe('Animation Timing Utility Functions', () => {
    test('should debounce animation calls with consistent timing', (done) => {
      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      const debouncedCallback = AnimationTiming.debounceAnimation(callback, 'FAST');

      // Call multiple times rapidly
      debouncedCallback();
      debouncedCallback();
      debouncedCallback();

      // Should not have called yet
      expect(callCount).toBe(0);

      // Wait for debounce to complete
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 200);
    });

    test('should throttle animation calls with consistent timing', (done) => {
      let callCount = 0;
      const callback = () => {
        callCount++;
      };

      const throttledCallback = AnimationTiming.throttleAnimation(callback, 'FAST');

      // Call immediately
      throttledCallback();
      expect(callCount).toBe(1);

      // Call again immediately (should be throttled)
      throttledCallback();
      expect(callCount).toBe(1);

      // Wait for throttle to expire
      setTimeout(() => {
        throttledCallback();
        expect(callCount).toBe(2);
        done();
      }, 200);
    });
  });

  describe('Animation Timing Constants Validation', () => {
    test('should have valid duration values', () => {
      Object.values(AnimationTiming.DURATIONS).forEach(duration => {
        expect(typeof duration).toBe('number');
        expect(duration).toBeGreaterThanOrEqual(0);
      });
    });

    test('should have valid easing values', () => {
      Object.values(AnimationTiming.EASING).forEach(easing => {
        expect(typeof easing).toBe('string');
        expect(easing.length).toBeGreaterThan(0);
      });
    });

    test('should have valid animation configurations', () => {
      Object.entries(AnimationTiming.ANIMATIONS).forEach(([name, config]) => {
        expect(typeof name).toBe('string');
        expect(config).toHaveProperty('duration');
        expect(config).toHaveProperty('easing');
        expect(config).toHaveProperty('delay');
        expect(config).toHaveProperty('iterationCount');
      });
    });
  });
});
