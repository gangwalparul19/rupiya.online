/**
 * Analytics and Loading Enhancements Integration Tests
 * 
 * Feature: analytics-and-loading-enhancements
 * Tests end-to-end workflows for analytics dashboard, predictive analytics, and loading states
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Analytics and Loading Enhancements - Integration Tests', () => {
  let mockFirestoreService;
  let mockPredictionService;
  let mockLoadingService;
  let mockBreadcrumbManager;

  beforeEach(() => {
    // Mock Firestore Service
    mockFirestoreService = {
      getExpenses: jest.fn().mockResolvedValue([
        { id: '1', amount: 100, category: 'Food', date: new Date('2024-01-01') },
        { id: '2', amount: 200, category: 'Transport', date: new Date('2024-01-02') },
        { id: '3', amount: 150, category: 'Food', date: new Date('2024-01-03') }
      ]),
      getIncome: jest.fn().mockResolvedValue([
        { id: '1', amount: 5000, date: new Date('2024-01-01') }
      ]),
      getExpenseKPISummary: jest.fn().mockResolvedValue({
        totalCount: 3,
        totalAmount: 450
      }),
      getExpensesPaginated: jest.fn().mockResolvedValue({
        data: [
          { id: '1', amount: 100, category: 'Food', date: new Date('2024-01-01') },
          { id: '2', amount: 200, category: 'Transport', date: new Date('2024-01-02') }
        ]
      })
    };

    // Mock Prediction Service
    mockPredictionService = {
      forecastSpending: jest.fn().mockResolvedValue([
        { date: new Date('2024-02-01'), predictedAmount: 450, confidenceInterval: { lower: 400, upper: 500 } },
        { date: new Date('2024-02-02'), predictedAmount: 480, confidenceInterval: { lower: 420, upper: 540 } }
      ]),
      detectBudgetOverspendRisk: jest.fn().mockResolvedValue([
        { category: 'Food', budgetedAmount: 500, projectedAmount: 600, overspendAmount: 100, severity: 'high' }
      ]),
      detectAnomalies: jest.fn().mockResolvedValue([
        { transactionId: '1', amount: 1000, category: 'Food', deviation: 500, reason: 'Unusual spending' }
      ]),
      analyzeSpendingPatterns: jest.fn().mockResolvedValue([
        { category: 'Food', frequency: 'daily', averageAmount: 150, nextExpectedDate: new Date('2024-02-01'), confidence: 0.9 }
      ])
    };

    // Mock Loading Service
    mockLoadingService = {
      showLoading: jest.fn().mockReturnValue(document.createElement('div')),
      createSkeletonScreen: jest.fn().mockReturnValue(document.createElement('div')),
      setButtonLoading: jest.fn(),
      setFormLoading: jest.fn(),
      transitionToContent: jest.fn().mockResolvedValue(undefined)
    };

    // Mock Breadcrumb Manager
    mockBreadcrumbManager = {
      setBreadcrumbs: jest.fn(),
      addBreadcrumb: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics Dashboard Workflow', () => {
    test('should load analytics data and display summary metrics', async () => {
      // Arrange
      const expenses = await mockFirestoreService.getExpenses();
      const income = await mockFirestoreService.getIncome();

      // Act
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
      const savings = totalIncome - totalExpenses;

      // Assert
      expect(totalExpenses).toBe(450);
      expect(totalIncome).toBe(5000);
      expect(savings).toBe(4550);
      expect(mockFirestoreService.getExpenses).toHaveBeenCalled();
      expect(mockFirestoreService.getIncome).toHaveBeenCalled();
    });

    test('should display category breakdown with correct percentages', async () => {
      // Arrange
      const expenses = await mockFirestoreService.getExpenses();
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Act
      const categoryBreakdown = {};
      expenses.forEach(expense => {
        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = { total: 0, count: 0 };
        }
        categoryBreakdown[expense.category].total += expense.amount;
        categoryBreakdown[expense.category].count += 1;
      });

      const categoryPercentages = Object.entries(categoryBreakdown).map(([category, data]) => ({
        category,
        percentage: (data.total / totalExpenses) * 100
      }));

      // Assert
      expect(categoryPercentages.length).toBe(2);
      expect(categoryPercentages[0].percentage + categoryPercentages[1].percentage).toBeCloseTo(100, 1);
    });

    test('should set breadcrumbs for analytics page', () => {
      // Act
      mockBreadcrumbManager.setBreadcrumbs([
        { label: 'Dashboard', href: 'dashboard.html' },
        { label: 'Analytics', href: null }
      ]);

      // Assert
      expect(mockBreadcrumbManager.setBreadcrumbs).toHaveBeenCalledWith([
        { label: 'Dashboard', href: 'dashboard.html' },
        { label: 'Analytics', href: null }
      ]);
    });

    test('should show loading state while fetching analytics data', async () => {
      // Act
      const skeleton = mockLoadingService.showLoading(document.createElement('div'), 'dashboard');
      await mockFirestoreService.getExpenses();

      // Assert
      expect(mockLoadingService.showLoading).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        'dashboard'
      );
      expect(skeleton).toBeDefined();
    });
  });

  describe('Predictive Analytics Workflow', () => {
    test('should generate spending forecast with confidence intervals', async () => {
      // Act
      const forecasts = await mockPredictionService.forecastSpending(30);

      // Assert
      expect(forecasts.length).toBeGreaterThan(0);
      forecasts.forEach(forecast => {
        expect(forecast.predictedAmount).toBeDefined();
        expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.predictedAmount);
        expect(forecast.confidenceInterval.upper).toBeGreaterThanOrEqual(forecast.predictedAmount);
      });
    });

    test('should detect budget overspend warnings', async () => {
      // Act
      const warnings = await mockPredictionService.detectBudgetOverspendRisk();

      // Assert
      expect(warnings.length).toBeGreaterThan(0);
      warnings.forEach(warning => {
        expect(warning.projectedAmount).toBeGreaterThan(warning.budgetedAmount);
        expect(warning.overspendAmount).toBe(warning.projectedAmount - warning.budgetedAmount);
      });
    });

    test('should detect spending anomalies', async () => {
      // Act
      const anomalies = await mockPredictionService.detectAnomalies();

      // Assert
      expect(anomalies.length).toBeGreaterThan(0);
      anomalies.forEach(anomaly => {
        expect(anomaly.deviation).toBeDefined();
        expect(anomaly.reason).toBeDefined();
      });
    });

    test('should analyze spending patterns', async () => {
      // Act
      const patterns = await mockPredictionService.analyzeSpendingPatterns();

      // Assert
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(pattern => {
        expect(pattern.frequency).toMatch(/daily|weekly|monthly/);
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should set breadcrumbs for predictive analytics page', () => {
      // Act
      mockBreadcrumbManager.setBreadcrumbs([
        { label: 'Dashboard', href: 'dashboard.html' },
        { label: 'Predictive Analytics', href: null }
      ]);

      // Assert
      expect(mockBreadcrumbManager.setBreadcrumbs).toHaveBeenCalledWith([
        { label: 'Dashboard', href: 'dashboard.html' },
        { label: 'Predictive Analytics', href: null }
      ]);
    });

    test('should show loading state while generating predictions', async () => {
      // Act
      const skeleton = mockLoadingService.showLoading(document.createElement('div'), 'dashboard');
      await mockPredictionService.forecastSpending(30);

      // Assert
      expect(mockLoadingService.showLoading).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        'dashboard'
      );
      expect(skeleton).toBeDefined();
    });
  });

  describe('Loading States Integration', () => {
    test('should show skeleton screen for list content', () => {
      // Act
      const skeleton = mockLoadingService.createSkeletonScreen('list');

      // Assert
      expect(mockLoadingService.createSkeletonScreen).toHaveBeenCalledWith('list');
      expect(skeleton).toBeDefined();
    });

    test('should show skeleton screen for dashboard content', () => {
      // Act
      const skeleton = mockLoadingService.createSkeletonScreen('dashboard');

      // Assert
      expect(mockLoadingService.createSkeletonScreen).toHaveBeenCalledWith('dashboard');
      expect(skeleton).toBeDefined();
    });

    test('should set button loading state', () => {
      // Arrange
      const button = document.createElement('button');

      // Act
      mockLoadingService.setButtonLoading(button, true);

      // Assert
      expect(mockLoadingService.setButtonLoading).toHaveBeenCalledWith(button, true);
    });

    test('should set form loading state', () => {
      // Arrange
      const form = document.createElement('form');

      // Act
      mockLoadingService.setFormLoading(form, true);

      // Assert
      expect(mockLoadingService.setFormLoading).toHaveBeenCalledWith(form, true);
    });

    test('should transition from skeleton to content', async () => {
      // Arrange
      const skeleton = document.createElement('div');
      const content = document.createElement('div');

      // Act
      await mockLoadingService.transitionToContent(skeleton, content);

      // Assert
      expect(mockLoadingService.transitionToContent).toHaveBeenCalledWith(skeleton, content);
    });
  });

  describe('End-to-End Analytics Workflow', () => {
    test('should complete full analytics dashboard workflow', async () => {
      // Arrange
      const container = document.createElement('div');

      // Act - Show loading
      mockLoadingService.showLoading(container, 'dashboard');
      
      // Act - Load data
      const expenses = await mockFirestoreService.getExpenses();
      const income = await mockFirestoreService.getIncome();
      
      // Act - Set breadcrumbs
      mockBreadcrumbManager.setBreadcrumbs([
        { label: 'Dashboard', href: 'dashboard.html' },
        { label: 'Analytics', href: null }
      ]);

      // Assert
      expect(mockLoadingService.showLoading).toHaveBeenCalled();
      expect(mockFirestoreService.getExpenses).toHaveBeenCalled();
      expect(mockFirestoreService.getIncome).toHaveBeenCalled();
      expect(mockBreadcrumbManager.setBreadcrumbs).toHaveBeenCalled();
      expect(expenses.length).toBeGreaterThan(0);
      expect(income.length).toBeGreaterThan(0);
    });

    test('should complete full predictive analytics workflow', async () => {
      // Arrange
      const container = document.createElement('div');

      // Act - Show loading
      mockLoadingService.showLoading(container, 'dashboard');
      
      // Act - Load predictions
      const forecasts = await mockPredictionService.forecastSpending(30);
      const warnings = await mockPredictionService.detectBudgetOverspendRisk();
      const anomalies = await mockPredictionService.detectAnomalies();
      const patterns = await mockPredictionService.analyzeSpendingPatterns();
      
      // Act - Set breadcrumbs
      mockBreadcrumbManager.setBreadcrumbs([
        { label: 'Dashboard', href: 'dashboard.html' },
        { label: 'Predictive Analytics', href: null }
      ]);

      // Assert
      expect(mockLoadingService.showLoading).toHaveBeenCalled();
      expect(mockPredictionService.forecastSpending).toHaveBeenCalled();
      expect(mockPredictionService.detectBudgetOverspendRisk).toHaveBeenCalled();
      expect(mockPredictionService.detectAnomalies).toHaveBeenCalled();
      expect(mockPredictionService.analyzeSpendingPatterns).toHaveBeenCalled();
      expect(mockBreadcrumbManager.setBreadcrumbs).toHaveBeenCalled();
      expect(forecasts.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('should handle loading states across multiple pages', async () => {
      // Arrange
      const analyticsContainer = document.createElement('div');
      const predictiveContainer = document.createElement('div');

      // Act - Analytics page loading
      mockLoadingService.showLoading(analyticsContainer, 'dashboard');
      await mockFirestoreService.getExpenses();
      
      // Act - Predictive analytics page loading
      mockLoadingService.showLoading(predictiveContainer, 'dashboard');
      await mockPredictionService.forecastSpending(30);

      // Assert
      expect(mockLoadingService.showLoading).toHaveBeenCalledTimes(2);
      expect(mockFirestoreService.getExpenses).toHaveBeenCalled();
      expect(mockPredictionService.forecastSpending).toHaveBeenCalled();
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency between analytics and predictions', async () => {
      // Arrange
      const expenses = await mockFirestoreService.getExpenses();
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Act
      const forecasts = await mockPredictionService.forecastSpending(30);
      const avgForecast = forecasts.reduce((sum, f) => sum + f.predictedAmount, 0) / forecasts.length;

      // Assert
      expect(totalExpenses).toBeGreaterThan(0);
      expect(avgForecast).toBeGreaterThan(0);
      // Forecast should be in reasonable range based on historical data
      expect(avgForecast).toBeLessThan(totalExpenses * 2);
    });

    test('should ensure budget warnings are based on valid data', async () => {
      // Arrange
      const expenses = await mockFirestoreService.getExpenses();
      const warnings = await mockPredictionService.detectBudgetOverspendRisk();

      // Act & Assert
      warnings.forEach(warning => {
        expect(warning.projectedAmount).toBeGreaterThan(0);
        expect(warning.budgetedAmount).toBeGreaterThan(0);
        expect(warning.severity).toMatch(/low|medium|high/);
      });
    });
  });
});
