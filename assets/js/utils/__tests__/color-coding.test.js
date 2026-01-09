/**
 * Color Coding Tests
 * Feature: analytics-and-loading-enhancements
 * Property 21: Color Coding Consistency
 * Validates: Requirements 5.2
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import ColorCoding from '../color-coding.js';

describe('Color Coding Utility - Property 21: Color Coding Consistency', () => {
  // Property 21: Color Coding Consistency
  // For any metric displayed with color coding, positive values should use green,
  // negative values should use red, and neutral values should use gray.

  describe('Color Selection for Values', () => {
    test('should return green color for positive values', () => {
      const positiveValues = [1, 10, 100, 0.01, 1000000];
      
      positiveValues.forEach(value => {
        const color = ColorCoding.getColor(value, 'main');
        expect(color).toBe(ColorCoding.COLORS.POSITIVE.main);
      });
    });

    test('should return red color for negative values', () => {
      const negativeValues = [-1, -10, -100, -0.01, -1000000];
      
      negativeValues.forEach(value => {
        const color = ColorCoding.getColor(value, 'main');
        expect(color).toBe(ColorCoding.COLORS.NEGATIVE.main);
      });
    });

    test('should return gray color for zero (neutral) values', () => {
      const color = ColorCoding.getColor(0, 'main');
      expect(color).toBe(ColorCoding.COLORS.NEUTRAL.main);
    });

    test('should return correct color variants (light, main, dark)', () => {
      // Positive value
      expect(ColorCoding.getColor(100, 'light')).toBe(ColorCoding.COLORS.POSITIVE.light);
      expect(ColorCoding.getColor(100, 'main')).toBe(ColorCoding.COLORS.POSITIVE.main);
      expect(ColorCoding.getColor(100, 'dark')).toBe(ColorCoding.COLORS.POSITIVE.dark);

      // Negative value
      expect(ColorCoding.getColor(-100, 'light')).toBe(ColorCoding.COLORS.NEGATIVE.light);
      expect(ColorCoding.getColor(-100, 'main')).toBe(ColorCoding.COLORS.NEGATIVE.main);
      expect(ColorCoding.getColor(-100, 'dark')).toBe(ColorCoding.COLORS.NEGATIVE.dark);

      // Neutral value
      expect(ColorCoding.getColor(0, 'light')).toBe(ColorCoding.COLORS.NEUTRAL.light);
      expect(ColorCoding.getColor(0, 'main')).toBe(ColorCoding.COLORS.NEUTRAL.main);
      expect(ColorCoding.getColor(0, 'dark')).toBe(ColorCoding.COLORS.NEUTRAL.dark);
    });
  });

  describe('Text Color Selection', () => {
    test('should return green text color for positive values', () => {
      const positiveValues = [1, 50, 999];
      
      positiveValues.forEach(value => {
        const textColor = ColorCoding.getTextColor(value);
        expect(textColor).toBe(ColorCoding.COLORS.POSITIVE.text);
        expect(textColor).toBe('#27ae60');
      });
    });

    test('should return red text color for negative values', () => {
      const negativeValues = [-1, -50, -999];
      
      negativeValues.forEach(value => {
        const textColor = ColorCoding.getTextColor(value);
        expect(textColor).toBe(ColorCoding.COLORS.NEGATIVE.text);
        expect(textColor).toBe('#e74c3c');
      });
    });

    test('should return gray text color for zero (neutral) values', () => {
      const textColor = ColorCoding.getTextColor(0);
      expect(textColor).toBe(ColorCoding.COLORS.NEUTRAL.text);
      expect(textColor).toBe('#95a5a6');
    });
  });

  describe('CSS Class Assignment', () => {
    test('should return color-positive class for positive values', () => {
      const positiveValues = [1, 100, 0.5];
      
      positiveValues.forEach(value => {
        const cssClass = ColorCoding.getColorClass(value);
        expect(cssClass).toBe('color-positive');
      });
    });

    test('should return color-negative class for negative values', () => {
      const negativeValues = [-1, -100, -0.5];
      
      negativeValues.forEach(value => {
        const cssClass = ColorCoding.getColorClass(value);
        expect(cssClass).toBe('color-negative');
      });
    });

    test('should return color-neutral class for zero values', () => {
      const cssClass = ColorCoding.getColorClass(0);
      expect(cssClass).toBe('color-neutral');
    });
  });

  describe('Element Color Application', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        style: {}
      };
    });

    test('should apply green text color to element for positive values', () => {
      ColorCoding.applyColorToElement(mockElement, 100, 'color');
      expect(mockElement.style.color).toBe(ColorCoding.COLORS.POSITIVE.text);
    });

    test('should apply red text color to element for negative values', () => {
      ColorCoding.applyColorToElement(mockElement, -100, 'color');
      expect(mockElement.style.color).toBe(ColorCoding.COLORS.NEGATIVE.text);
    });

    test('should apply gray text color to element for zero values', () => {
      ColorCoding.applyColorToElement(mockElement, 0, 'color');
      expect(mockElement.style.color).toBe(ColorCoding.COLORS.NEUTRAL.text);
    });

    test('should apply background color to element', () => {
      ColorCoding.applyColorToElement(mockElement, 100, 'backgroundColor', 'main');
      expect(mockElement.style.backgroundColor).toBe(ColorCoding.COLORS.POSITIVE.main);
    });

    test('should apply border color to element', () => {
      ColorCoding.applyColorToElement(mockElement, -100, 'borderColor', 'main');
      expect(mockElement.style.borderColor).toBe(ColorCoding.COLORS.NEGATIVE.main);
    });

    test('should handle null element gracefully', () => {
      // Should not throw error
      expect(() => {
        ColorCoding.applyColorToElement(null, 100, 'color');
      }).not.toThrow();
    });
  });

  describe('Formatted Value with Color', () => {
    test('should format positive value with green color class', () => {
      const formatted = ColorCoding.formatWithColor(100, '₹');
      expect(formatted).toContain('color-positive');
      expect(formatted).toContain('+');
      expect(formatted).toContain('₹');
      expect(formatted).toContain('100');
    });

    test('should format negative value with red color class', () => {
      const formatted = ColorCoding.formatWithColor(-100, '₹');
      expect(formatted).toContain('color-negative');
      expect(formatted).toContain('₹');
      expect(formatted).toContain('100');
    });

    test('should format zero value with gray color class', () => {
      const formatted = ColorCoding.formatWithColor(0, '₹');
      expect(formatted).toContain('color-neutral');
      expect(formatted).toContain('₹');
      expect(formatted).toContain('0');
    });

    test('should format large numbers with locale string', () => {
      const formatted = ColorCoding.formatWithColor(1000000, '₹');
      expect(formatted).toContain('10,00,000');
    });
  });

  describe('Comparison Color Selection', () => {
    test('should return green color when actual exceeds target', () => {
      const color = ColorCoding.getComparisonColor(150, 100, 'main');
      expect(color).toBe(ColorCoding.COLORS.POSITIVE.main);
    });

    test('should return red color when actual is below target', () => {
      const color = ColorCoding.getComparisonColor(50, 100, 'main');
      expect(color).toBe(ColorCoding.COLORS.NEGATIVE.main);
    });

    test('should return gray color when actual equals target', () => {
      const color = ColorCoding.getComparisonColor(100, 100, 'main');
      expect(color).toBe(ColorCoding.COLORS.NEUTRAL.main);
    });

    test('should work with different variants', () => {
      expect(ColorCoding.getComparisonColor(150, 100, 'light')).toBe(ColorCoding.COLORS.POSITIVE.light);
      expect(ColorCoding.getComparisonColor(50, 100, 'dark')).toBe(ColorCoding.COLORS.NEGATIVE.dark);
    });
  });

  describe('Color Consistency Across Different Value Ranges', () => {
    test('should consistently color values across different magnitudes', () => {
      const smallPositive = ColorCoding.getColor(0.01, 'main');
      const largePositive = ColorCoding.getColor(1000000, 'main');
      expect(smallPositive).toBe(largePositive);
      expect(smallPositive).toBe(ColorCoding.COLORS.POSITIVE.main);
    });

    test('should consistently color values across different negative magnitudes', () => {
      const smallNegative = ColorCoding.getColor(-0.01, 'main');
      const largeNegative = ColorCoding.getColor(-1000000, 'main');
      expect(smallNegative).toBe(largeNegative);
      expect(smallNegative).toBe(ColorCoding.COLORS.NEGATIVE.main);
    });

    test('should maintain color consistency for fractional values', () => {
      const positiveDecimal = ColorCoding.getColor(0.5, 'main');
      const negativeDecimal = ColorCoding.getColor(-0.5, 'main');
      
      expect(positiveDecimal).toBe(ColorCoding.COLORS.POSITIVE.main);
      expect(negativeDecimal).toBe(ColorCoding.COLORS.NEGATIVE.main);
    });
  });

  describe('Color Constants Validation', () => {
    test('should have valid RGBA color format for all variants', () => {
      const rgbaPattern = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
      
      Object.values(ColorCoding.COLORS).forEach(colorSet => {
        expect(rgbaPattern.test(colorSet.light)).toBe(true);
        expect(rgbaPattern.test(colorSet.main)).toBe(true);
        expect(rgbaPattern.test(colorSet.dark)).toBe(true);
      });
    });

    test('should have valid hex color format for text colors', () => {
      const hexPattern = /^#[0-9a-f]{6}$/i;
      
      Object.values(ColorCoding.COLORS).forEach(colorSet => {
        expect(hexPattern.test(colorSet.text)).toBe(true);
      });
    });

    test('should have consistent opacity levels across variants', () => {
      // Light variants should have lower opacity than main
      const positiveLight = ColorCoding.COLORS.POSITIVE.light;
      const positiveMain = ColorCoding.COLORS.POSITIVE.main;
      
      // Extract opacity values
      const lightOpacity = parseFloat(positiveLight.match(/[\d.]+\)$/)[0]);
      const mainOpacity = parseFloat(positiveMain.match(/[\d.]+\)$/)[0]);
      
      expect(lightOpacity).toBeLessThan(mainOpacity);
    });
  });
});
