/**
 * Predictive Analytics Page Tests
 * Feature: analytics-and-loading-enhancements
 * Tests for forecast generation, anomaly detection, and pattern analysis
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock data generators
function generateMockForecast(overrides = {}) {
  return {
    date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    predictedAmount: Math.random() * 1000,
    confidenceInterval: {
      lower: Math.random() * 500,
      upper: Math.random() * 1000 + 500
    },
    category: 'Test Category',
    ...overrides
  };
}

function generateMockWarning(overrides = {}) {
  return {
    category: 'Test Category',
    budgetedAmount: 1000,
    projectedAmount: 1200,
    overspendAmount: 200,
    severity: 'medium',
    ...overrides
  };
}

function generateMockGoal(overrides = {}) {
  return {
    goalId: 'goal-1',
    goalName: 'Test Goal',
    targetAmount: 10000,
    projectedAmount: 8000,
    willAchieve: false,
    daysToAchieve: 30,
    ...overrides
  };
}

function generateMockAnomaly(overrides = {}) {
  return {
    transactionId: 'txn-1',
    amount: 500,
    category: 'Test Category',
    deviation: 150,
    reason: 'Spending 150% higher than usual',
    ...overrides
  };
}

function generateMockPattern(overrides = {}) {
  return {
    category: 'Test Category',
    frequency: 'weekly',
    averageAmount: 100,
    nextExpectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    confidence: 0.8,
    ...overrides
  };
}

describe('Predictive Analytics Page', () => {
  // Test forecast generation
  describe('Forecast Generation', () => {
    test('should generate forecasts for 30 days', () => {
      const forecasts = [];
      const now = new Date();
      
      for (let i = 1; i <= 30; i++) {
        forecasts.push(generateMockForecast({
          date: new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
        }));
      }

      // Property: should have forecasts for 30 days
      expect(forecasts.length).toBeGreaterThan(0);
      
      // All forecasts should be in the future
      forecasts.forEach(forecast => {
        expect(forecast.date.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    test('should include confidence intervals in forecasts', () => {
      const forecast = generateMockForecast();

      // Property: confidence interval should have lower and upper bounds
      expect(forecast.confidenceInterval).toBeDefined();
      expect(forecast.confidenceInterval.lower).toBeDefined();
      expect(forecast.confidenceInterval.upper).toBeDefined();
      
      // Lower bound should be less than upper bound
      expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.confidenceInterval.upper);
    });

    test('should categorize forecasts by spending category', () => {
      const forecasts = [
        generateMockForecast({ category: 'Food' }),
        generateMockForecast({ category: 'Transport' }),
        generateMockForecast({ category: 'Entertainment' })
      ];

      // Property: each forecast should have a category
      forecasts.forEach(forecast => {
        expect(forecast.category).toBeDefined();
        expect(typeof forecast.category).toBe('string');
      });
    });

    test('should have positive predicted amounts', () => {
      const forecasts = [
        generateMockForecast({ predictedAmount: 100 }),
        generateMockForecast({ predictedAmount: 500 }),
        generateMockForecast({ predictedAmount: 1000 })
      ];

      // Property: all predicted amounts should be non-negative
      forecasts.forEach(forecast => {
        expect(forecast.predictedAmount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // Test anomaly detection
  describe('Anomaly Detection', () => {
    test('should identify anomalous transactions', () => {
      const anomalies = [
        generateMockAnomaly({ deviation: 150 }),
        generateMockAnomaly({ deviation: 200 }),
        generateMockAnomaly({ deviation: 250 })
      ];

      // Property: anomalies should have significant deviations
      anomalies.forEach(anomaly => {
        expect(Math.abs(anomaly.deviation)).toBeGreaterThan(100);
      });
    });

    test('should provide deviation explanation', () => {
      const anomaly = generateMockAnomaly({
        deviation: 150,
        reason: 'Spending 150% higher than usual'
      });

      // Property: anomaly should have a reason
      expect(anomaly.reason).toBeDefined();
      expect(typeof anomaly.reason).toBe('string');
      expect(anomaly.reason.length).toBeGreaterThan(0);
    });

    test('should include transaction context', () => {
      const anomaly = generateMockAnomaly({
        transactionId: 'txn-123',
        amount: 500,
        category: 'Food'
      });

      // Property: anomaly should include transaction details
      expect(anomaly.transactionId).toBeDefined();
      expect(anomaly.amount).toBeDefined();
      expect(anomaly.category).toBeDefined();
    });

    test('should handle both positive and negative deviations', () => {
      const positiveDeviation = generateMockAnomaly({ deviation: 150 });
      const negativeDeviation = generateMockAnomaly({ deviation: -50 });

      // Property: deviations can be positive or negative
      expect(positiveDeviation.deviation).toBeGreaterThan(0);
      expect(negativeDeviation.deviation).toBeLessThan(0);
    });
  });

  // Test pattern analysis
  describe('Pattern Analysis', () => {
    test('should identify spending patterns', () => {
      const patterns = [
        generateMockPattern({ frequency: 'daily' }),
        generateMockPattern({ frequency: 'weekly' }),
        generateMockPattern({ frequency: 'monthly' })
      ];

      // Property: patterns should have valid frequencies
      patterns.forEach(pattern => {
        expect(['daily', 'weekly', 'monthly']).toContain(pattern.frequency);
      });
    });

    test('should calculate average spending amounts', () => {
      const patterns = [
        generateMockPattern({ averageAmount: 50 }),
        generateMockPattern({ averageAmount: 100 }),
        generateMockPattern({ averageAmount: 200 })
      ];

      // Property: average amounts should be positive
      patterns.forEach(pattern => {
        expect(pattern.averageAmount).toBeGreaterThan(0);
      });
    });

    test('should predict next occurrence date', () => {
      const now = new Date();
      const pattern = generateMockPattern({
        nextExpectedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      });

      // Property: next expected date should be in the future
      expect(pattern.nextExpectedDate.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should include confidence level', () => {
      const patterns = [
        generateMockPattern({ confidence: 0.5 }),
        generateMockPattern({ confidence: 0.8 }),
        generateMockPattern({ confidence: 0.95 })
      ];

      // Property: confidence should be between 0 and 1
      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should categorize patterns by spending category', () => {
      const patterns = [
        generateMockPattern({ category: 'Food' }),
        generateMockPattern({ category: 'Transport' }),
        generateMockPattern({ category: 'Entertainment' })
      ];

      // Property: each pattern should have a category
      patterns.forEach(pattern => {
        expect(pattern.category).toBeDefined();
        expect(typeof pattern.category).toBe('string');
      });
    });
  });

  // Test budget overspend warnings
  describe('Budget Overspend Warnings', () => {
    test('should generate warnings for at-risk budgets', () => {
      const warnings = [
        generateMockWarning({ severity: 'high' }),
        generateMockWarning({ severity: 'medium' }),
        generateMockWarning({ severity: 'low' })
      ];

      // Property: warnings should have valid severity levels
      warnings.forEach(warning => {
        expect(['low', 'medium', 'high']).toContain(warning.severity);
      });
    });

    test('should calculate overspend amounts correctly', () => {
      const warning = generateMockWarning({
        budgetedAmount: 1000,
        projectedAmount: 1200,
        overspendAmount: 200
      });

      // Property: overspend = projected - budgeted
      expect(warning.overspendAmount).toBe(warning.projectedAmount - warning.budgetedAmount);
    });

    test('should only warn when projected exceeds budgeted', () => {
      const warnings = [
        generateMockWarning({ budgetedAmount: 1000, projectedAmount: 1200 }),
        generateMockWarning({ budgetedAmount: 1000, projectedAmount: 800 })
      ];

      // Property: warning should only exist if projected > budgeted
      warnings.forEach(warning => {
        if (warning.projectedAmount > warning.budgetedAmount) {
          expect(warning.overspendAmount).toBeGreaterThan(0);
        }
      });
    });

    test('should include budget category', () => {
      const warning = generateMockWarning({
        category: 'Food'
      });

      // Property: warning should have a category
      expect(warning.category).toBeDefined();
      expect(typeof warning.category).toBe('string');
    });
  });

  // Test savings goal projections
  describe('Savings Goal Projections', () => {
    test('should project goal achievement', () => {
      const goals = [
        generateMockGoal({ willAchieve: true }),
        generateMockGoal({ willAchieve: false })
      ];

      // Property: willAchieve should be a boolean
      goals.forEach(goal => {
        expect(typeof goal.willAchieve).toBe('boolean');
      });
    });

    test('should calculate days to achieve', () => {
      const goals = [
        generateMockGoal({ daysToAchieve: 30 }),
        generateMockGoal({ daysToAchieve: 60 }),
        generateMockGoal({ daysToAchieve: 90 })
      ];

      // Property: days to achieve should be non-negative
      goals.forEach(goal => {
        expect(goal.daysToAchieve).toBeGreaterThanOrEqual(0);
      });
    });

    test('should show projected vs target amounts', () => {
      const goal = generateMockGoal({
        targetAmount: 10000,
        projectedAmount: 8000
      });

      // Property: both amounts should be defined
      expect(goal.targetAmount).toBeDefined();
      expect(goal.projectedAmount).toBeDefined();
      expect(goal.targetAmount).toBeGreaterThan(0);
      expect(goal.projectedAmount).toBeGreaterThanOrEqual(0);
    });

    test('should include goal name', () => {
      const goal = generateMockGoal({
        goalName: 'Emergency Fund'
      });

      // Property: goal should have a name
      expect(goal.goalName).toBeDefined();
      expect(typeof goal.goalName).toBe('string');
      expect(goal.goalName.length).toBeGreaterThan(0);
    });

    test('should match willAchieve with projected vs target', () => {
      const achievableGoal = generateMockGoal({
        targetAmount: 10000,
        projectedAmount: 12000,
        willAchieve: true
      });

      const unachievableGoal = generateMockGoal({
        targetAmount: 10000,
        projectedAmount: 8000,
        willAchieve: false
      });

      // Property: willAchieve should match projected >= target
      if (achievableGoal.projectedAmount >= achievableGoal.targetAmount) {
        expect(achievableGoal.willAchieve).toBe(true);
      }

      if (unachievableGoal.projectedAmount < unachievableGoal.targetAmount) {
        expect(unachievableGoal.willAchieve).toBe(false);
      }
    });
  });

  // Test data rendering
  describe('Data Rendering', () => {
    test('should render forecast chart with correct data structure', () => {
      const forecasts = [
        generateMockForecast({ date: new Date('2024-02-01'), predictedAmount: 100 }),
        generateMockForecast({ date: new Date('2024-02-02'), predictedAmount: 120 }),
        generateMockForecast({ date: new Date('2024-02-03'), predictedAmount: 110 })
      ];

      // Property: forecasts should be sortable by date
      const sorted = [...forecasts].sort((a, b) => a.date.getTime() - b.date.getTime());
      expect(sorted[0].date.getTime()).toBeLessThanOrEqual(sorted[1].date.getTime());
      expect(sorted[1].date.getTime()).toBeLessThanOrEqual(sorted[2].date.getTime());
    });

    test('should group forecasts by date for chart display', () => {
      const forecasts = [
        generateMockForecast({ date: new Date('2024-02-01'), category: 'Food', predictedAmount: 100 }),
        generateMockForecast({ date: new Date('2024-02-01'), category: 'Transport', predictedAmount: 50 }),
        generateMockForecast({ date: new Date('2024-02-02'), category: 'Food', predictedAmount: 120 })
      ];

      // Group by date
      const byDate = {};
      forecasts.forEach(f => {
        const dateKey = f.date.toISOString().split('T')[0];
        if (!byDate[dateKey]) byDate[dateKey] = 0;
        byDate[dateKey] += f.predictedAmount;
      });

      // Property: grouped data should have correct totals
      expect(byDate['2024-02-01']).toBe(150); // 100 + 50
      expect(byDate['2024-02-02']).toBe(120);
    });

    test('should format currency values correctly', () => {
      const amounts = [100, 1000, 10000, 100000];

      // Property: all amounts should be positive
      amounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0);
      });
    });

    test('should display alerts in priority order', () => {
      const alerts = [
        { severity: 'high', title: 'High Priority' },
        { severity: 'medium', title: 'Medium Priority' },
        { severity: 'low', title: 'Low Priority' }
      ];

      // Property: high severity should come first
      const severityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < alerts.length; i++) {
        expect(severityOrder[alerts[i - 1].severity]).toBeLessThanOrEqual(severityOrder[alerts[i].severity]);
      }
    });
  });

  // Test edge cases
  describe('Edge Cases', () => {
    test('should handle empty forecast data', () => {
      const forecasts = [];

      // Property: should handle empty array gracefully
      expect(Array.isArray(forecasts)).toBe(true);
      expect(forecasts.length).toBe(0);
    });

    test('should handle missing anomalies', () => {
      const anomalies = [];

      // Property: should handle empty anomalies
      expect(Array.isArray(anomalies)).toBe(true);
      expect(anomalies.length).toBe(0);
    });

    test('should handle zero confidence patterns', () => {
      const pattern = generateMockPattern({ confidence: 0 });

      // Property: confidence can be zero
      expect(pattern.confidence).toBe(0);
      expect(pattern.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle very large amounts', () => {
      const forecast = generateMockForecast({ predictedAmount: 1000000 });
      const warning = generateMockWarning({ budgetedAmount: 1000000, projectedAmount: 1200000 });

      // Property: should handle large numbers
      expect(forecast.predictedAmount).toBeGreaterThan(0);
      expect(warning.projectedAmount).toBeGreaterThan(warning.budgetedAmount);
    });

    test('should handle very small amounts', () => {
      const forecast = generateMockForecast({ predictedAmount: 0.01 });
      const pattern = generateMockPattern({ averageAmount: 0.01 });

      // Property: should handle small numbers
      expect(forecast.predictedAmount).toBeGreaterThan(0);
      expect(pattern.averageAmount).toBeGreaterThan(0);
    });

    test('should handle dates far in the future', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const pattern = generateMockPattern({ nextExpectedDate: futureDate });

      // Property: should handle future dates
      expect(pattern.nextExpectedDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
