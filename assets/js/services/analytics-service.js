/**
 * Analytics Service
 * Provides comprehensive financial analytics calculations
 * Includes spending trends, category breakdowns, income vs expense, and financial health scoring
 */

import firestoreService from './firestore-service.js';
import cacheManager from '../utils/cache-manager.js';
import {
  createSpendingTrend,
  createCategoryBreakdown,
  createIncomeExpenseComparison,
  createSavingsRateTrend,
  createBudgetComparison,
  createFinancialHealthScore,
  createAnalyticsDashboard
} from './analytics-models.js';

class AnalyticsService {
  constructor() {
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get spending trends for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} granularity - 'daily' | 'weekly' | 'monthly'
   * @returns {Promise<Array>} Array of spending trends
   */
  async getSpendingTrends(startDate, endDate, granularity = 'daily') {
    const cacheKey = `spending-trends-${startDate.getTime()}-${endDate.getTime()}-${granularity}`;
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const transactions = await firestoreService.getExpenses();
      const trends = this.calculateSpendingTrends(transactions, startDate, endDate, granularity);
      
      // Cache result
      cacheManager.set(cacheKey, trends, this.cacheTTL);
      
      return trends;
    } catch (error) {
      console.error('Error calculating spending trends:', error);
      return [];
    }
  }

  /**
   * Calculate spending trends from transactions
   * @private
   */
  calculateSpendingTrends(transactions, startDate, endDate, granularity) {
    const trends = {};
    const dateFormat = this.getDateFormat(granularity);

    // Filter transactions within date range
    const filtered = transactions.filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    // Group by date and category
    filtered.forEach(transaction => {
      const tDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
      const dateKey = this.formatDateByGranularity(tDate, granularity);
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
        result.push(createSpendingTrend(
          new Date(dateKey),
          amount,
          category,
          'stable'
        ));
      }
    }

    return result.sort((a, b) => a.date - b.date);
  }

  /**
   * Get category-wise breakdown
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of category breakdowns
   */
  async getCategoryBreakdown(startDate, endDate) {
    const cacheKey = `category-breakdown-${startDate.getTime()}-${endDate.getTime()}`;
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const transactions = await firestoreService.getExpenses();
      const breakdown = this.calculateCategoryBreakdown(transactions, startDate, endDate);
      
      // Cache result
      cacheManager.set(cacheKey, breakdown, this.cacheTTL);
      
      return breakdown;
    } catch (error) {
      console.error('Error calculating category breakdown:', error);
      return [];
    }
  }

  /**
   * Calculate category breakdown from transactions
   * @private
   */
  calculateCategoryBreakdown(transactions, startDate, endDate) {
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
    const colors = this.getCategoryColors();
    let colorIndex = 0;

    for (const [category, data] of Object.entries(categories)) {
      const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
      
      result.push(createCategoryBreakdown(
        category,
        Math.round(data.total * 100) / 100,
        Math.round(percentage * 100) / 100,
        data.count,
        colors[colorIndex % colors.length]
      ));

      colorIndex++;
    }

    // Sort by total descending
    return result.sort((a, b) => b.total - a.total);
  }

  /**
   * Get income vs expense comparison
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Income vs expense comparison
   */
  async getIncomeVsExpense(startDate, endDate) {
    const cacheKey = `income-vs-expense-${startDate.getTime()}-${endDate.getTime()}`;
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const expenses = await firestoreService.getExpenses();
      const income = await firestoreService.getIncome();
      
      const comparison = this.calculateIncomeVsExpense(income, expenses, startDate, endDate);
      
      // Cache result
      cacheManager.set(cacheKey, comparison, this.cacheTTL);
      
      return comparison;
    } catch (error) {
      console.error('Error calculating income vs expense:', error);
      return null;
    }
  }

  /**
   * Calculate income vs expense comparison
   * @private
   */
  calculateIncomeVsExpense(incomeTransactions, expenseTransactions, startDate, endDate) {
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

    return createIncomeExpenseComparison(
      period,
      Math.round(totalIncome * 100) / 100,
      Math.round(totalExpense * 100) / 100,
      Math.round(savings * 100) / 100,
      Math.round(savingsRate * 100) / 100
    );
  }

  /**
   * Get savings rate trends
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of savings rate trends
   */
  async getSavingsRateTrends(startDate, endDate) {
    const cacheKey = `savings-rate-trends-${startDate.getTime()}-${endDate.getTime()}`;
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const expenses = await firestoreService.getExpenses();
      const income = await firestoreService.getIncome();
      
      const trends = this.calculateSavingsRateTrends(income, expenses, startDate, endDate);
      
      // Cache result
      cacheManager.set(cacheKey, trends, this.cacheTTL);
      
      return trends;
    } catch (error) {
      console.error('Error calculating savings rate trends:', error);
      return [];
    }
  }

  /**
   * Calculate savings rate trends
   * @private
   */
  calculateSavingsRateTrends(incomeTransactions, expenseTransactions, startDate, endDate) {
    const trends = {};

    // Process income
    incomeTransactions.forEach(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (tDate >= startDate && tDate <= endDate) {
        const dateKey = this.formatDateByGranularity(tDate, 'monthly');
        if (!trends[dateKey]) {
          trends[dateKey] = { income: 0, expense: 0 };
        }
        trends[dateKey].income += t.amount || 0;
      }
    });

    // Process expenses
    expenseTransactions.forEach(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (tDate >= startDate && tDate <= endDate) {
        const dateKey = this.formatDateByGranularity(tDate, 'monthly');
        if (!trends[dateKey]) {
          trends[dateKey] = { income: 0, expense: 0 };
        }
        trends[dateKey].expense += t.amount || 0;
      }
    });

    // Convert to array format
    const result = [];
    for (const [dateKey, data] of Object.entries(trends)) {
      const savings = data.income - data.expense;
      const rate = data.income > 0 ? (savings / data.income) * 100 : 0;

      result.push(createSavingsRateTrend(
        new Date(dateKey),
        Math.round(rate * 100) / 100,
        20 // Default target of 20%
      ));
    }

    return result.sort((a, b) => a.date - b.date);
  }

  /**
   * Get budget vs actual comparison
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of budget comparisons
   */
  async getBudgetVsActual(startDate, endDate) {
    const cacheKey = `budget-vs-actual-${startDate.getTime()}-${endDate.getTime()}`;
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const budgets = await firestoreService.getBudgets();
      const expenses = await firestoreService.getExpenses();
      
      const comparisons = this.calculateBudgetVsActual(budgets, expenses, startDate, endDate);
      
      // Cache result
      cacheManager.set(cacheKey, comparisons, this.cacheTTL);
      
      return comparisons;
    } catch (error) {
      console.error('Error calculating budget vs actual:', error);
      return [];
    }
  }

  /**
   * Calculate budget vs actual comparison
   * @private
   */
  calculateBudgetVsActual(budgets, expenses, startDate, endDate) {
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

      comparisons.push(createBudgetComparison(
        category,
        Math.round(budgetedAmount * 100) / 100,
        Math.round(actualAmount * 100) / 100,
        Math.round(remaining * 100) / 100,
        Math.round(percentageUsed * 100) / 100
      ));
    });

    return comparisons;
  }

  /**
   * Calculate financial health score
   * @returns {Promise<Object>} Financial health score
   */
  async calculateFinancialHealthScore() {
    const cacheKey = 'financial-health-score';
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const expenses = await firestoreService.getExpenses();
      const income = await firestoreService.getIncome();
      const budgets = await firestoreService.getBudgets();

      const score = this.calculateHealthScore(income, expenses, budgets, thirtyDaysAgo, now);
      
      // Cache result
      cacheManager.set(cacheKey, score, this.cacheTTL);
      
      return score;
    } catch (error) {
      console.error('Error calculating financial health score:', error);
      return createFinancialHealthScore(0, {}, 'stable');
    }
  }

  /**
   * Calculate health score components
   * @private
   */
  calculateHealthScore(incomeTransactions, expenseTransactions, budgets, startDate, endDate) {
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
    const savingsRateScore = Math.min(25, Math.max(0, savingsRate * 1.25)); // 20% savings = 25 points

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
    const debtRatioScore = 25; // Assuming no debt data available

    // Calculate goal progress (0-25 points) - simplified
    const goalProgressScore = 20; // Assuming some goal progress

    const totalScore = savingsRateScore + expenseControlScore + debtRatioScore + goalProgressScore;

    return createFinancialHealthScore(
      Math.round(totalScore),
      {
        savingsRate: Math.round(savingsRateScore),
        debtRatio: Math.round(debtRatioScore),
        expenseControl: Math.round(expenseControlScore),
        goalProgress: Math.round(goalProgressScore)
      },
      'stable'
    );
  }

  /**
   * Get transactions for a specific category with pagination
   * @param {string} category - Category name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} pageSize - Number of transactions per page (default: 20)
   * @param {number} pageNumber - Page number (default: 1)
   * @returns {Promise<Object>} Object with transactions array and pagination info
   */
  async getCategoryTransactions(category, startDate, endDate, pageSize = 20, pageNumber = 1) {
    try {
      const transactions = await firestoreService.getExpenses();
      
      // Filter transactions by category and date range
      const filtered = transactions.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return t.category === category && tDate >= startDate && tDate <= endDate;
      });

      // Sort by date descending (most recent first)
      filtered.sort((a, b) => {
        const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return bDate - aDate;
      });

      // Calculate pagination
      const totalCount = filtered.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const startIndex = (pageNumber - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedTransactions = filtered.slice(startIndex, endIndex);

      return {
        transactions: paginatedTransactions,
        pagination: {
          pageNumber,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1
        }
      };
    } catch (error) {
      console.error('Error getting category transactions:', error);
      return {
        transactions: [],
        pagination: {
          pageNumber: 1,
          pageSize,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    }
  }

  /**
   * Invalidate analytics cache
   * @param {string} pattern - Optional pattern to match cache keys
   */
  invalidateCache(pattern = null) {
    if (pattern) {
      cacheManager.invalidatePattern(pattern);
    } else {
      // Invalidate all analytics-related caches
      cacheManager.invalidatePattern(/^(spending-trends|category-breakdown|income-vs-expense|savings-rate-trends|budget-vs-actual|financial-health-score)/);
    }
  }

  /**
   * Register cache invalidation listener for data changes
   * This should be called when transactions, budgets, or income data changes
   */
  registerCacheInvalidationListener() {
    // Listen for transaction changes and invalidate related caches
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('transactionUpdated', () => {
        this.invalidateCache();
      });

      window.addEventListener('budgetUpdated', () => {
        this.invalidateCache(/^budget-vs-actual/);
      });

      window.addEventListener('incomeUpdated', () => {
        this.invalidateCache(/^(income-vs-expense|savings-rate-trends|financial-health-score)/);
      });
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return cacheManager.getStats();
  }

  /**
   * Helper: Format date by granularity
   * @private
   */
  formatDateByGranularity(date, granularity) {
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

  /**
   * Helper: Get date format
   * @private
   */
  getDateFormat(granularity) {
    if (granularity === 'daily') return 'YYYY-MM-DD';
    if (granularity === 'weekly') return 'YYYY-Www';
    if (granularity === 'monthly') return 'YYYY-MM';
    return 'YYYY-MM-DD';
  }

  /**
   * Helper: Get category colors
   * @private
   */
  getCategoryColors() {
    return [
      '#4A90E2', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6',
      '#1ABC9C', '#E67E22', '#3498DB', '#2ECC71', '#E91E63',
      '#00BCD4', '#FF5722', '#607D8B', '#795548', '#9C27B0'
    ];
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
