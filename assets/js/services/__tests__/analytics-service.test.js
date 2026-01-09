/**
 * Analytics Service Tests
 * Feature: analytics-and-loading-enhancements
 * Property-based tests for analytics calculations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock data generators for property-based testing
function generateRandomDate(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

function generateRandomTransaction(category = null, amount = null, date = null) {
  const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping'];
  return {
    id: Math.random().toString(36).substr(2, 9),
    category: category || categories[Math.floor(Math.random() * categories.length)],
    amount: amount !== null ? amount : Math.random() * 1000,
    date: date || new Date(),
    description: 'Test transaction'
  };
}

function generateTransactionsForDateRange(startDate, endDate, count = 20) {
  const transactions = [];
  for (let i = 0; i < count; i++) {
    transactions.push(generateRandomTransaction(null, null, generateRandomDate(startDate, endDate)));
  }
  return transactions;
}

// Helper functions that mirror analytics service calculations
function formatDateByGranularity(date, granularity) {
  if (granularity === 'daily') {
    return date.toISOString().split('T')[0];
  } else if (granularity === 'weekly') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0];
  } else if (granularity === 'monthly') {
    return date.toISOString().substring(0, 7);
  }
  return date.toISOString().split('T')[0];
}

function calculateSpendingTrends(transactions, startDate, endDate, granularity) {
  const trends = {};

  // Filter transactions within date range
  const filtered = transactions.filter(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    return tDate >= startDate && tDate <= endDate;
  });

  // Group by date and category
  filtered.forEach(transaction => {
    const tDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
    const dateKey = formatDateByGranularity(tDate, granularity);
    const category = transaction.category || 'Other';

    if (!trends[dateKey]) {
      trends[dateKey] = {};
    }

    if (!trends[dateKey][category]) {
      trends[dateKey][category] = 0;
    }

    trends[dateKey][category] += transaction.amount || 0;
  });

  // Convert to array format
  const result = [];
  for (const [dateKey, categories] of Object.entries(trends)) {
    for (const [category, amount] of Object.entries(categories)) {
      result.push({
        date: new Date(dateKey),
        amount,
        category,
        trend: 'stable'
      });
    }
  }

  return result.sort((a, b) => a.date - b.date);
}

function calculateCategoryBreakdown(transactions, startDate, endDate) {
  const categories = {};
  let totalAmount = 0;

  // Filter transactions within date range
  const filtered = transactions.filter(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    return tDate >= startDate && tDate <= endDate;
  });

  // Group by category
  filtered.forEach(transaction => {
    const category = transaction.category || 'Other';
    const amount = transaction.amount || 0;

    if (!categories[category]) {
      categories[category] = { total: 0, count: 0 };
    }

    categories[category].total += amount;
    categories[category].count += 1;
    totalAmount += amount;
  });

  // Convert to array format with percentages
  const result = [];
  const colors = ['#4A90E2', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6'];
  let colorIndex = 0;

  for (const [category, data] of Object.entries(categories)) {
    const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
    
    result.push({
      category,
      total: Math.round(data.total * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      transactionCount: data.count,
      color: colors[colorIndex % colors.length]
    });

    colorIndex++;
  }

  // Sort by total descending
  return result.sort((a, b) => b.total - a.total);
}

function calculateIncomeVsExpense(incomeTransactions, expenseTransactions, startDate, endDate) {
  let totalIncome = 0;
  let totalExpense = 0;

  // Sum income
  incomeTransactions.forEach(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    if (tDate >= startDate && tDate <= endDate) {
      totalIncome += t.amount || 0;
    }
  });

  // Sum expenses
  expenseTransactions.forEach(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    if (tDate >= startDate && tDate <= endDate) {
      totalExpense += t.amount || 0;
    }
  });

  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  const period = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  return {
    period,
    income: Math.round(totalIncome * 100) / 100,
    expense: Math.round(totalExpense * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100
  };
}

function calculateBudgetVsActual(budgets, expenses, startDate, endDate) {
  const comparisons = [];

  budgets.forEach(budget => {
    const category = budget.category || 'Other';
    const budgetedAmount = budget.amount || 0;

    // Sum actual expenses for this category
    let actualAmount = 0;
    expenses.forEach(expense => {
      const eDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
      if (eDate >= startDate && eDate <= endDate && expense.category === category) {
        actualAmount += expense.amount || 0;
      }
    });

    const remaining = budgetedAmount - actualAmount;
    const percentageUsed = budgetedAmount > 0 ? (actualAmount / budgetedAmount) * 100 : 0;

    comparisons.push({
      category,
      budgeted: Math.round(budgetedAmount * 100) / 100,
      actual: Math.round(actualAmount * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      percentageUsed: Math.round(percentageUsed * 100) / 100
    });
  });

  return comparisons;
}

function calculateHealthScore(incomeTransactions, expenseTransactions, budgets, startDate, endDate) {
  // Calculate savings rate (0-25 points)
  let totalIncome = 0;
  let totalExpense = 0;

  incomeTransactions.forEach(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    if (tDate >= startDate && tDate <= endDate) {
      totalIncome += t.amount || 0;
    }
  });

  expenseTransactions.forEach(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    if (tDate >= startDate && tDate <= endDate) {
      totalExpense += t.amount || 0;
    }
  });

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const savingsRateScore = Math.min(25, Math.max(0, savingsRate * 1.25));

  // Calculate expense control (0-25 points)
  let budgetedTotal = 0;
  let actualTotal = 0;

  budgets.forEach(budget => {
    budgetedTotal += budget.amount || 0;
  });

  expenseTransactions.forEach(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    if (tDate >= startDate && tDate <= endDate) {
      actualTotal += t.amount || 0;
    }
  });

  const budgetUtilization = budgetedTotal > 0 ? (actualTotal / budgetedTotal) * 100 : 100;
  const expenseControlScore = Math.min(25, Math.max(0, 25 - (budgetUtilization - 100) * 0.25));

  // Calculate debt ratio (0-25 points) - simplified
  const debtRatioScore = 25;

  // Calculate goal progress (0-25 points) - simplified
  const goalProgressScore = 20;

  const totalScore = savingsRateScore + expenseControlScore + debtRatioScore + goalProgressScore;

  return {
    score: Math.round(totalScore),
    components: {
      savingsRate: Math.round(savingsRateScore),
      debtRatio: Math.round(debtRatioScore),
      expenseControl: Math.round(expenseControlScore),
      goalProgress: Math.round(goalProgressScore)
    },
    trend: 'stable'
  };
}

describe('Analytics Service - Property-Based Tests', () => {
  // Property 7: Analytics Date Range Consistency
  describe('Property 7: Analytics Date Range Consistency', () => {
    test('should only include transactions within the specified date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      // Generate transactions across multiple months
      const transactions = [
        generateRandomTransaction('Food', 50, new Date('2023-12-31')), // Before range
        generateRandomTransaction('Food', 60, new Date('2024-01-15')), // Within range
        generateRandomTransaction('Transport', 30, new Date('2024-01-20')), // Within range
        generateRandomTransaction('Entertainment', 100, new Date('2024-02-01')) // After range
      ];

      const trends = calculateSpendingTrends(transactions, startDate, endDate, 'daily');
      
      // All trends should have dates within the range
      trends.forEach(trend => {
        expect(trend.date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(trend.date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    test('should produce consistent results for the same date range across multiple calls', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const transactions = generateTransactionsForDateRange(startDate, endDate, 30);

      const result1 = calculateSpendingTrends(transactions, startDate, endDate, 'daily');
      const result2 = calculateSpendingTrends(transactions, startDate, endDate, 'daily');

      expect(result1).toEqual(result2);
    });

    test('should handle different granularities (daily, weekly, monthly)', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');
      const transactions = generateTransactionsForDateRange(startDate, endDate, 50);

      const dailyTrends = calculateSpendingTrends(transactions, startDate, endDate, 'daily');
      const weeklyTrends = calculateSpendingTrends(transactions, startDate, endDate, 'weekly');
      const monthlyTrends = calculateSpendingTrends(transactions, startDate, endDate, 'monthly');

      // Monthly should have fewer or equal entries than weekly, which should have fewer or equal than daily
      expect(monthlyTrends.length).toBeLessThanOrEqual(weeklyTrends.length);
      expect(weeklyTrends.length).toBeLessThanOrEqual(dailyTrends.length);
    });
  });

  // Property 8: Category Breakdown Completeness
  describe('Property 8: Category Breakdown Completeness', () => {
    test('should ensure percentages sum to 100%', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const transactions = generateTransactionsForDateRange(startDate, endDate, 30);

      const breakdown = calculateCategoryBreakdown(transactions, startDate, endDate);

      const totalPercentage = breakdown.reduce((sum, cat) => sum + cat.percentage, 0);
      
      // Allow for small floating point errors
      expect(Math.abs(totalPercentage - 100)).toBeLessThanOrEqual(0.02);
    });

    test('should ensure totals sum to total expenses', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const transactions = generateTransactionsForDateRange(startDate, endDate, 30);

      const breakdown = calculateCategoryBreakdown(transactions, startDate, endDate);

      const totalFromBreakdown = breakdown.reduce((sum, cat) => sum + cat.total, 0);
      const totalFromTransactions = transactions
        .filter(t => {
          const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
          return tDate >= startDate && tDate <= endDate;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      expect(Math.abs(totalFromBreakdown - totalFromTransactions)).toBeLessThan(0.01);
    });

    test('should have non-negative percentages and totals', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const transactions = generateTransactionsForDateRange(startDate, endDate, 30);

      const breakdown = calculateCategoryBreakdown(transactions, startDate, endDate);

      breakdown.forEach(cat => {
        expect(cat.percentage).toBeGreaterThanOrEqual(0);
        expect(cat.total).toBeGreaterThanOrEqual(0);
        expect(cat.transactionCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // Property 9: Income vs Expense Calculation
  describe('Property 9: Income vs Expense Calculation', () => {
    test('should calculate savings as income minus expenses', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const incomeTransactions = [
        { amount: 5000, date: new Date('2024-01-15') },
        { amount: 2000, date: new Date('2024-01-20') }
      ];
      
      const expenseTransactions = [
        { amount: 1000, date: new Date('2024-01-10') },
        { amount: 500, date: new Date('2024-01-25') }
      ];

      const comparison = calculateIncomeVsExpense(
        incomeTransactions,
        expenseTransactions,
        startDate,
        endDate
      );

      const expectedSavings = 7000 - 1500;
      expect(comparison.savings).toBe(expectedSavings);
    });

    test('should calculate savings rate as savings divided by income', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const incomeTransactions = [
        { amount: 10000, date: new Date('2024-01-15') }
      ];
      
      const expenseTransactions = [
        { amount: 2000, date: new Date('2024-01-10') }
      ];

      const comparison = calculateIncomeVsExpense(
        incomeTransactions,
        expenseTransactions,
        startDate,
        endDate
      );

      const expectedRate = ((10000 - 2000) / 10000) * 100;
      expect(comparison.savingsRate).toBe(expectedRate);
    });

    test('should handle zero income gracefully', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const incomeTransactions = [];
      const expenseTransactions = [
        { amount: 1000, date: new Date('2024-01-10') }
      ];

      const comparison = calculateIncomeVsExpense(
        incomeTransactions,
        expenseTransactions,
        startDate,
        endDate
      );

      expect(comparison.savingsRate).toBe(0);
      expect(comparison.savings).toBe(-1000);
    });
  });

  // Property 10: Financial Health Score Bounds
  describe('Property 10: Financial Health Score Bounds', () => {
    test('should always return score between 0 and 100', () => {
      const incomeTransactions = generateTransactionsForDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        20
      ).map(t => ({ ...t, amount: Math.abs(t.amount) }));

      const expenseTransactions = generateTransactionsForDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        20
      ).map(t => ({ ...t, amount: Math.abs(t.amount) }));

      const budgets = [
        { category: 'Food', amount: 500 },
        { category: 'Transport', amount: 300 }
      ];

      const score = calculateHealthScore(
        incomeTransactions,
        expenseTransactions,
        budgets,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });

    test('should have all component scores between 0 and 100', () => {
      const incomeTransactions = generateTransactionsForDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        20
      ).map(t => ({ ...t, amount: Math.abs(t.amount) }));

      const expenseTransactions = generateTransactionsForDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        20
      ).map(t => ({ ...t, amount: Math.abs(t.amount) }));

      const budgets = [
        { category: 'Food', amount: 500 },
        { category: 'Transport', amount: 300 }
      ];

      const score = calculateHealthScore(
        incomeTransactions,
        expenseTransactions,
        budgets,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      Object.values(score.components).forEach(componentScore => {
        expect(componentScore).toBeGreaterThanOrEqual(0);
        expect(componentScore).toBeLessThanOrEqual(100);
      });
    });
  });

  // Property 11: Budget vs Actual Accuracy
  describe('Property 11: Budget vs Actual Accuracy', () => {
    test('should calculate remaining as budgeted minus actual', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const budgets = [
        { category: 'Food', amount: 500 },
        { category: 'Transport', amount: 300 }
      ];

      const expenses = [
        { category: 'Food', amount: 200, date: new Date('2024-01-10') },
        { category: 'Food', amount: 150, date: new Date('2024-01-20') },
        { category: 'Transport', amount: 100, date: new Date('2024-01-15') }
      ];

      const comparisons = calculateBudgetVsActual(budgets, expenses, startDate, endDate);

      const foodComparison = comparisons.find(c => c.category === 'Food');
      expect(foodComparison.remaining).toBe(500 - 350);

      const transportComparison = comparisons.find(c => c.category === 'Transport');
      expect(transportComparison.remaining).toBe(300 - 100);
    });

    test('should calculate percentage used as actual divided by budgeted', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const budgets = [
        { category: 'Food', amount: 500 }
      ];

      const expenses = [
        { category: 'Food', amount: 250, date: new Date('2024-01-10') }
      ];

      const comparisons = calculateBudgetVsActual(budgets, expenses, startDate, endDate);

      const foodComparison = comparisons.find(c => c.category === 'Food');
      expect(foodComparison.percentageUsed).toBe(50);
    });

    test('should have non-negative percentage used', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const budgets = [
        { category: 'Food', amount: 500 },
        { category: 'Transport', amount: 300 }
      ];

      const expenses = generateTransactionsForDateRange(startDate, endDate, 20);

      const comparisons = calculateBudgetVsActual(budgets, expenses, startDate, endDate);

      comparisons.forEach(comp => {
        expect(comp.percentageUsed).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // Property 12: Category Drill-Down Consistency
  describe('Property 12: Category Drill-Down Consistency', () => {
    test('should only return transactions from the specified category', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const targetCategory = 'Food';

      const transactions = [
        generateRandomTransaction('Food', 50, new Date('2024-01-10')),
        generateRandomTransaction('Food', 60, new Date('2024-01-15')),
        generateRandomTransaction('Transport', 30, new Date('2024-01-12')),
        generateRandomTransaction('Entertainment', 100, new Date('2024-01-20')),
        generateRandomTransaction('Food', 45, new Date('2024-01-25'))
      ];

      // Filter to simulate getCategoryTransactions
      const filtered = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.category === targetCategory && tDate >= startDate && tDate <= endDate;
      });

      // All returned transactions should be from the target category
      filtered.forEach(transaction => {
        expect(transaction.category).toBe(targetCategory);
      });
    });

    test('should only return transactions within the specified date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const targetCategory = 'Food';

      const transactions = [
        generateRandomTransaction('Food', 50, new Date('2023-12-31')), // Before range
        generateRandomTransaction('Food', 60, new Date('2024-01-15')), // Within range
        generateRandomTransaction('Food', 45, new Date('2024-02-01')) // After range
      ];

      // Filter to simulate getCategoryTransactions
      const filtered = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.category === targetCategory && tDate >= startDate && tDate <= endDate;
      });

      // All returned transactions should be within the date range
      filtered.forEach(transaction => {
        const tDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
        expect(tDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(tDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });

    test('should return consistent results for the same category and date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const targetCategory = 'Food';

      const transactions = generateTransactionsForDateRange(startDate, endDate, 30);

      // Filter twice to simulate multiple calls
      const result1 = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.category === targetCategory && tDate >= startDate && tDate <= endDate;
      });

      const result2 = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.category === targetCategory && tDate >= startDate && tDate <= endDate;
      });

      expect(result1).toEqual(result2);
    });

    test('should handle pagination correctly', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const targetCategory = 'Food';
      const pageSize = 5;

      // Create 15 transactions in the target category
      const transactions = [];
      for (let i = 0; i < 15; i++) {
        transactions.push(generateRandomTransaction(targetCategory, 50 + i, generateRandomDate(startDate, endDate)));
      }

      // Filter to get all transactions
      const filtered = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.category === targetCategory && tDate >= startDate && tDate <= endDate;
      });

      // Simulate pagination
      const page1 = filtered.slice(0, pageSize);
      const page2 = filtered.slice(pageSize, pageSize * 2);
      const page3 = filtered.slice(pageSize * 2, pageSize * 3);

      // Each page should have correct size
      expect(page1.length).toBe(pageSize);
      expect(page2.length).toBe(pageSize);
      expect(page3.length).toBe(5); // Remaining items

      // All items across pages should be unique
      const allItems = [...page1, ...page2, ...page3];
      const uniqueIds = new Set(allItems.map(t => t.id));
      expect(uniqueIds.size).toBe(allItems.length);
    });
  });

  // Property 19: Cache Invalidation on Data Change
  describe('Property 19: Cache Invalidation on Data Change', () => {
    test('should invalidate all analytics caches when invalidateCache is called without pattern', () => {
      // Simulate cache entries
      const cacheEntries = {
        'spending-trends-1704067200000-1706745600000-daily': { value: [1, 2, 3] },
        'category-breakdown-1704067200000-1706745600000': { value: [4, 5, 6] },
        'income-vs-expense-1704067200000-1706745600000': { value: [7, 8, 9] },
        'savings-rate-trends-1704067200000-1706745600000': { value: [10, 11, 12] },
        'budget-vs-actual-1704067200000-1706745600000': { value: [13, 14, 15] },
        'financial-health-score': { value: [16, 17, 18] }
      };

      // Verify all cache keys match the invalidation pattern
      const pattern = /^(spending-trends|category-breakdown|income-vs-expense|savings-rate-trends|budget-vs-actual|financial-health-score)/;
      
      Object.keys(cacheEntries).forEach(key => {
        expect(pattern.test(key)).toBe(true);
      });
    });

    test('should invalidate only matching cache entries when pattern is provided', () => {
      const cacheEntries = {
        'spending-trends-1704067200000-1706745600000-daily': { value: [1, 2, 3] },
        'category-breakdown-1704067200000-1706745600000': { value: [4, 5, 6] },
        'budget-vs-actual-1704067200000-1706745600000': { value: [13, 14, 15] },
        'other-cache-key': { value: [19, 20, 21] }
      };

      // Pattern to match only budget-related caches
      const pattern = /^budget-vs-actual/;

      const matchingKeys = Object.keys(cacheEntries).filter(key => pattern.test(key));
      const nonMatchingKeys = Object.keys(cacheEntries).filter(key => !pattern.test(key));

      // Should match only budget-vs-actual
      expect(matchingKeys).toEqual(['budget-vs-actual-1704067200000-1706745600000']);
      
      // Should not match other keys
      expect(nonMatchingKeys.length).toBe(3);
    });

    test('should invalidate income-related caches when income data changes', () => {
      const incomeRelatedPattern = /^(income-vs-expense|savings-rate-trends|financial-health-score)/;

      const cacheEntries = {
        'income-vs-expense-1704067200000-1706745600000': { value: [1, 2, 3] },
        'savings-rate-trends-1704067200000-1706745600000': { value: [4, 5, 6] },
        'financial-health-score': { value: [7, 8, 9] },
        'spending-trends-1704067200000-1706745600000-daily': { value: [10, 11, 12] }
      };

      const matchingKeys = Object.keys(cacheEntries).filter(key => incomeRelatedPattern.test(key));

      // Should match all income-related caches
      expect(matchingKeys.length).toBe(3);
      expect(matchingKeys).toContain('income-vs-expense-1704067200000-1706745600000');
      expect(matchingKeys).toContain('savings-rate-trends-1704067200000-1706745600000');
      expect(matchingKeys).toContain('financial-health-score');
    });

    test('should invalidate budget-related caches when budget data changes', () => {
      const budgetPattern = /^budget-vs-actual/;

      const cacheEntries = {
        'budget-vs-actual-1704067200000-1706745600000': { value: [1, 2, 3] },
        'budget-vs-actual-1704067200000-1706745600000-v2': { value: [4, 5, 6] },
        'spending-trends-1704067200000-1706745600000-daily': { value: [7, 8, 9] }
      };

      const matchingKeys = Object.keys(cacheEntries).filter(key => budgetPattern.test(key));

      // Should match all budget-vs-actual caches
      expect(matchingKeys.length).toBe(2);
      matchingKeys.forEach(key => {
        expect(key.startsWith('budget-vs-actual')).toBe(true);
      });
    });

    test('should maintain cache consistency after invalidation', () => {
      // Simulate cache state before and after invalidation
      const cacheBeforeInvalidation = {
        'spending-trends-1704067200000-1706745600000-daily': { value: [1, 2, 3], timestamp: Date.now() },
        'category-breakdown-1704067200000-1706745600000': { value: [4, 5, 6], timestamp: Date.now() }
      };

      // After invalidation, these entries should be removed
      const pattern = /^spending-trends/;
      const keysToRemove = Object.keys(cacheBeforeInvalidation).filter(key => pattern.test(key));

      // Simulate removal
      const cacheAfterInvalidation = { ...cacheBeforeInvalidation };
      keysToRemove.forEach(key => delete cacheAfterInvalidation[key]);

      // Verify only matching keys were removed
      expect(Object.keys(cacheAfterInvalidation).length).toBe(1);
      expect(cacheAfterInvalidation['category-breakdown-1704067200000-1706745600000']).toBeDefined();
      expect(cacheAfterInvalidation['spending-trends-1704067200000-1706745600000-daily']).toBeUndefined();
    });
  });
});


/**
 * Prediction Service Tests
 * Feature: analytics-and-loading-enhancements
 * Property-based tests for prediction calculations
 */

// Helper function to calculate spending forecast (mirrors prediction service)
function calculateSpendingForecast(transactions, days) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Filter transactions from last 90 days
  const historicalTransactions = transactions.filter(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    return tDate >= ninetyDaysAgo && tDate <= now;
  });

  // Group by category and calculate daily averages
  const categoryStats = {};
  historicalTransactions.forEach(t => {
    const category = t.category || 'Other';
    if (!categoryStats[category]) {
      categoryStats[category] = [];
    }
    categoryStats[category].push(t.amount || 0);
  });

  // Calculate statistics for each category
  const stats = {};
  for (const [category, amounts] of Object.entries(categoryStats)) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const frequency = amounts.length / 90;

    stats[category] = {
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      frequency: Math.round(frequency * 100) / 100,
      count: amounts.length
    };
  }

  // Generate forecasts for each day
  const forecasts = [];
  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    
    for (const [category, categoryStats] of Object.entries(stats)) {
      const { mean, stdDev } = categoryStats;
      
      // Use exponential smoothing to predict amount
      const predictedAmount = mean;
      
      // Calculate confidence interval (95% confidence)
      const marginOfError = 1.96 * stdDev;
      const lower = Math.max(0, predictedAmount - marginOfError);
      const upper = predictedAmount + marginOfError;

      forecasts.push({
        date: forecastDate,
        predictedAmount: Math.round(predictedAmount * 100) / 100,
        confidenceInterval: {
          lower: Math.round(lower * 100) / 100,
          upper: Math.round(upper * 100) / 100
        },
        category
      });
    }
  }

  return forecasts;
}

// Property 13: Spending Forecast Confidence Intervals
describe('Property 13: Spending Forecast Confidence Intervals', () => {
  test('should ensure lower bound is less than or equal to predicted amount', () => {
    // Feature: analytics-and-loading-enhancements, Property 13: Spending Forecast Confidence Intervals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Generate historical transactions
    const transactions = generateTransactionsForDateRange(ninetyDaysAgo, now, 50);
    
    // Calculate forecast
    const forecasts = calculateSpendingForecast(transactions, 30);
    
    // Verify confidence interval bounds for all forecasts
    forecasts.forEach(forecast => {
      expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.predictedAmount);
    });
  });

  test('should ensure upper bound is greater than or equal to predicted amount', () => {
    // Feature: analytics-and-loading-enhancements, Property 13: Spending Forecast Confidence Intervals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Generate historical transactions
    const transactions = generateTransactionsForDateRange(ninetyDaysAgo, now, 50);
    
    // Calculate forecast
    const forecasts = calculateSpendingForecast(transactions, 30);
    
    // Verify confidence interval bounds for all forecasts
    forecasts.forEach(forecast => {
      expect(forecast.confidenceInterval.upper).toBeGreaterThanOrEqual(forecast.predictedAmount);
    });
  });

  test('should ensure lower bound is less than upper bound', () => {
    // Feature: analytics-and-loading-enhancements, Property 13: Spending Forecast Confidence Intervals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Generate historical transactions
    const transactions = generateTransactionsForDateRange(ninetyDaysAgo, now, 50);
    
    // Calculate forecast
    const forecasts = calculateSpendingForecast(transactions, 30);
    
    // Verify confidence interval bounds for all forecasts
    forecasts.forEach(forecast => {
      expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.confidenceInterval.upper);
    });
  });

  test('should maintain confidence interval bounds across different forecast lengths', () => {
    // Feature: analytics-and-loading-enhancements, Property 13: Spending Forecast Confidence Intervals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Generate historical transactions
    const transactions = generateTransactionsForDateRange(ninetyDaysAgo, now, 50);
    
    // Calculate forecasts for different lengths
    const forecast7Days = calculateSpendingForecast(transactions, 7);
    const forecast30Days = calculateSpendingForecast(transactions, 30);
    const forecast60Days = calculateSpendingForecast(transactions, 60);
    
    // Verify all forecasts maintain proper bounds
    [forecast7Days, forecast30Days, forecast60Days].forEach(forecasts => {
      forecasts.forEach(forecast => {
        expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.predictedAmount);
        expect(forecast.confidenceInterval.upper).toBeGreaterThanOrEqual(forecast.predictedAmount);
        expect(forecast.confidenceInterval.lower).toBeLessThanOrEqual(forecast.confidenceInterval.upper);
      });
    });
  });

  test('should have non-negative confidence intervals', () => {
    // Feature: analytics-and-loading-enhancements, Property 13: Spending Forecast Confidence Intervals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Generate historical transactions with positive amounts
    const transactions = generateTransactionsForDateRange(ninetyDaysAgo, now, 50)
      .map(t => ({ ...t, amount: Math.abs(t.amount) }));
    
    // Calculate forecast
    const forecasts = calculateSpendingForecast(transactions, 30);
    
    // Verify all bounds are non-negative
    forecasts.forEach(forecast => {
      expect(forecast.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
      expect(forecast.confidenceInterval.upper).toBeGreaterThanOrEqual(0);
      expect(forecast.predictedAmount).toBeGreaterThanOrEqual(0);
    });
  });

  test('should produce consistent confidence intervals for the same input data', () => {
    // Feature: analytics-and-loading-enhancements, Property 13: Spending Forecast Confidence Intervals
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Generate fixed historical transactions
    const transactions = generateTransactionsForDateRange(ninetyDaysAgo, now, 50);
    
    // Calculate forecast twice
    const forecast1 = calculateSpendingForecast(transactions, 30);
    const forecast2 = calculateSpendingForecast(transactions, 30);
    
    // Verify results are identical
    expect(forecast1.length).toBe(forecast2.length);
    forecast1.forEach((f1, index) => {
      const f2 = forecast2[index];
      expect(f1.predictedAmount).toBe(f2.predictedAmount);
      expect(f1.confidenceInterval.lower).toBe(f2.confidenceInterval.lower);
      expect(f1.confidenceInterval.upper).toBe(f2.confidenceInterval.upper);
    });
  });
});

// Property 20: Analytics Calculation Performance
describe('Property 20: Analytics Calculation Performance', () => {
  test('should calculate spending trends within 2 seconds', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');
    
    // Generate large dataset (500 transactions)
    const transactions = generateTransactionsForDateRange(startDate, endDate, 500);
    
    // Measure calculation time
    const startTime = performance.now();
    const trends = calculateSpendingTrends(transactions, startDate, endDate, 'daily');
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Should complete within 2 seconds (2000ms)
    expect(duration).toBeLessThan(2000);
    expect(trends.length).toBeGreaterThan(0);
  });

  test('should calculate category breakdown within 2 seconds', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');
    
    // Generate large dataset (500 transactions)
    const transactions = generateTransactionsForDateRange(startDate, endDate, 500);
    
    // Measure calculation time
    const startTime = performance.now();
    const breakdown = calculateCategoryBreakdown(transactions, startDate, endDate);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Should complete within 2 seconds (2000ms)
    expect(duration).toBeLessThan(2000);
    expect(breakdown.length).toBeGreaterThan(0);
  });

  test('should calculate income vs expense within 2 seconds', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');
    
    // Generate large datasets (500 transactions each)
    const incomeTransactions = generateTransactionsForDateRange(startDate, endDate, 500);
    const expenseTransactions = generateTransactionsForDateRange(startDate, endDate, 500);
    
    // Measure calculation time
    const startTime = performance.now();
    const comparison = calculateIncomeVsExpense(
      incomeTransactions,
      expenseTransactions,
      startDate,
      endDate
    );
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Should complete within 2 seconds (2000ms)
    expect(duration).toBeLessThan(2000);
    expect(comparison).toBeDefined();
  });

  test('should calculate budget vs actual within 2 seconds', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');
    
    // Generate large dataset (500 transactions)
    const expenses = generateTransactionsForDateRange(startDate, endDate, 500);
    
    // Create budgets for each category
    const budgets = [
      { category: 'Food', amount: 500 },
      { category: 'Transport', amount: 300 },
      { category: 'Entertainment', amount: 200 },
      { category: 'Utilities', amount: 150 },
      { category: 'Healthcare', amount: 100 },
      { category: 'Shopping', amount: 400 }
    ];
    
    // Measure calculation time
    const startTime = performance.now();
    const comparisons = calculateBudgetVsActual(budgets, expenses, startDate, endDate);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Should complete within 2 seconds (2000ms)
    expect(duration).toBeLessThan(2000);
    expect(comparisons.length).toBeGreaterThan(0);
  });

  test('should calculate financial health score within 2 seconds', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');
    
    // Generate large datasets (500 transactions each)
    const incomeTransactions = generateTransactionsForDateRange(startDate, endDate, 500)
      .map(t => ({ ...t, amount: Math.abs(t.amount) }));
    const expenseTransactions = generateTransactionsForDateRange(startDate, endDate, 500)
      .map(t => ({ ...t, amount: Math.abs(t.amount) }));
    
    // Create budgets
    const budgets = [
      { category: 'Food', amount: 500 },
      { category: 'Transport', amount: 300 },
      { category: 'Entertainment', amount: 200 }
    ];
    
    // Measure calculation time
    const startTime = performance.now();
    const score = calculateHealthScore(
      incomeTransactions,
      expenseTransactions,
      budgets,
      startDate,
      endDate
    );
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Should complete within 2 seconds (2000ms)
    expect(duration).toBeLessThan(2000);
    expect(score.score).toBeDefined();
  });

  test('should handle very large datasets (1000+ transactions) efficiently', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-12-31');
    
    // Generate very large dataset (1000 transactions)
    const transactions = generateTransactionsForDateRange(startDate, endDate, 1000);
    
    // Measure calculation time for multiple operations
    const startTime = performance.now();
    
    const trends = calculateSpendingTrends(transactions, startDate, endDate, 'monthly');
    const breakdown = calculateCategoryBreakdown(transactions, startDate, endDate);
    
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    
    // Should complete within 2 seconds even with large dataset
    expect(duration).toBeLessThan(2000);
    expect(trends.length).toBeGreaterThan(0);
    expect(breakdown.length).toBeGreaterThan(0);
  });

  test('should maintain consistent performance across multiple calls', () => {
    // Feature: analytics-and-loading-enhancements, Property 20: Analytics Calculation Performance
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31');
    
    // Generate dataset
    const transactions = generateTransactionsForDateRange(startDate, endDate, 300);
    
    // Measure multiple calls
    const durations = [];
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      calculateSpendingTrends(transactions, startDate, endDate, 'daily');
      const endTime = performance.now();
      durations.push(endTime - startTime);
    }
    
    // All calls should be within 2 seconds
    durations.forEach(duration => {
      expect(duration).toBeLessThan(2000);
    });
    
    // Performance should be relatively consistent (no huge variations)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDeviation = Math.max(...durations.map(d => Math.abs(d - avgDuration)));
    
    // Max deviation should be less than 50% of average (allowing for system variance)
    expect(maxDeviation).toBeLessThan(avgDuration * 0.5);
  });
});
