/**
 * Data Aggregation Service
 * Pre-calculates and caches expensive aggregations for better performance
 */

import logger from '../utils/logger.js';

class DataAggregationService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.isAggregating = new Map();
  }

  /**
   * Get dashboard KPIs with caching
   * @param {string} userId - User ID
   * @param {string} period - Time period (month, year, all)
   * @returns {Promise<Object>} Aggregated KPIs
   */
  async getDashboardKPIs(userId, period = 'month') {
    const cacheKey = `kpis:${userId}:${period}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.debug('Returning cached KPIs');
      return cached;
    }

    // Check if already aggregating
    if (this.isAggregating.has(cacheKey)) {
      return this.isAggregating.get(cacheKey);
    }

    // Start aggregation
    const aggregationPromise = this.calculateDashboardKPIs(userId, period);
    this.isAggregating.set(cacheKey, aggregationPromise);

    try {
      const result = await aggregationPromise;
      this.setCache(cacheKey, result);
      return result;
    } finally {
      this.isAggregating.delete(cacheKey);
    }
  }

  /**
   * Calculate dashboard KPIs
   */
  async calculateDashboardKPIs(userId, period) {
    const { default: firestoreService } = await import('./firestore-service.js');
    
    const dateRange = this.getDateRange(period);
    
    // Fetch data in parallel
    const [expenses, income, investments, budgets] = await Promise.all([
      firestoreService.getExpensesByDateRange(userId, dateRange.start, dateRange.end),
      firestoreService.getIncomeByDateRange(userId, dateRange.start, dateRange.end),
      firestoreService.getUserInvestments(userId),
      firestoreService.getUserBudgets(userId)
    ]);

    // Calculate aggregations
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalIncome = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    
    // Category breakdown
    const expensesByCategory = this.groupByCategory(expenses);
    const topCategories = this.getTopCategories(expensesByCategory, 5);
    
    // Budget utilization
    const budgetUtilization = this.calculateBudgetUtilization(budgets, expensesByCategory);
    
    // Trends
    const expenseTrend = this.calculateTrend(expenses, period);
    const incomeTrend = this.calculateTrend(income, period);
    
    return {
      summary: {
        totalExpenses,
        totalIncome,
        totalInvestments,
        netSavings: totalIncome - totalExpenses,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
        topCategories,
        trend: expenseTrend
      },
      income: {
        total: totalIncome,
        trend: incomeTrend
      },
      investments: {
        total: totalInvestments,
        count: investments.length
      },
      budgets: {
        utilization: budgetUtilization,
        overBudget: budgetUtilization.filter(b => b.percentage > 100).length
      },
      period,
      dateRange,
      calculatedAt: Date.now()
    };
  }

  /**
   * Get expense trends by category
   */
  async getCategoryTrends(userId, months = 6) {
    const cacheKey = `trends:${userId}:${months}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { default: firestoreService } = await import('./firestore-service.js');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await firestoreService.getExpensesByDateRange(userId, startDate, endDate);
    
    // Group by month and category
    const trends = {};
    
    expenses.forEach(expense => {
      const month = new Date(expense.date).toISOString().slice(0, 7); // YYYY-MM
      const category = expense.category || 'Uncategorized';
      
      if (!trends[category]) {
        trends[category] = {};
      }
      
      if (!trends[category][month]) {
        trends[category][month] = 0;
      }
      
      trends[category][month] += expense.amount || 0;
    });

    const result = {
      trends,
      months: this.getMonthLabels(startDate, endDate),
      calculatedAt: Date.now()
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get spending patterns
   */
  async getSpendingPatterns(userId) {
    const cacheKey = `patterns:${userId}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { default: firestoreService } = await import('./firestore-service.js');
    
    // Get last 3 months of expenses
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const expenses = await firestoreService.getExpensesByDateRange(userId, startDate, endDate);
    
    // Analyze patterns
    const patterns = {
      byDayOfWeek: this.groupByDayOfWeek(expenses),
      byTimeOfDay: this.groupByTimeOfDay(expenses),
      byCategory: this.groupByCategory(expenses),
      averageTransaction: expenses.length > 0 
        ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length 
        : 0,
      largestExpenses: expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10),
      recurringExpenses: this.detectRecurring(expenses),
      calculatedAt: Date.now()
    };

    this.setCache(cacheKey, patterns);
    return patterns;
  }

  /**
   * Invalidate cache for user
   */
  invalidateUserCache(userId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    logger.debug(`Invalidated ${keysToDelete.length} cache entries for user ${userId}`);
  }

  /**
   * Helper: Get from cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check expiry
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Helper: Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Helper: Get date range
   */
  getDateRange(period) {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2000, 0, 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }
    
    return { start, end };
  }

  /**
   * Helper: Group by category
   */
  groupByCategory(items) {
    const grouped = {};
    
    items.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = 0;
      }
      grouped[category] += item.amount || 0;
    });
    
    return grouped;
  }

  /**
   * Helper: Get top categories
   */
  getTopCategories(categoryData, limit = 5) {
    return Object.entries(categoryData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, amount]) => ({ category, amount }));
  }

  /**
   * Helper: Calculate budget utilization
   */
  calculateBudgetUtilization(budgets, expensesByCategory) {
    return budgets.map(budget => {
      const spent = expensesByCategory[budget.category] || 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      
      return {
        category: budget.category,
        budget: budget.amount,
        spent,
        remaining: budget.amount - spent,
        percentage
      };
    });
  }

  /**
   * Helper: Calculate trend
   */
  calculateTrend(items, period) {
    if (items.length < 2) return 0;
    
    // Sort by date
    const sorted = items.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Split into two halves
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    
    const firstSum = firstHalf.reduce((sum, item) => sum + item.amount, 0);
    const secondSum = secondHalf.reduce((sum, item) => sum + item.amount, 0);
    
    // Calculate percentage change
    return firstSum > 0 ? ((secondSum - firstSum) / firstSum) * 100 : 0;
  }

  /**
   * Helper: Group by day of week
   */
  groupByDayOfWeek(items) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};
    
    days.forEach(day => grouped[day] = 0);
    
    items.forEach(item => {
      const day = days[new Date(item.date).getDay()];
      grouped[day] += item.amount || 0;
    });
    
    return grouped;
  }

  /**
   * Helper: Group by time of day
   */
  groupByTimeOfDay(items) {
    const periods = {
      'Morning (6-12)': 0,
      'Afternoon (12-18)': 0,
      'Evening (18-24)': 0,
      'Night (0-6)': 0
    };
    
    items.forEach(item => {
      const hour = new Date(item.date).getHours();
      
      if (hour >= 6 && hour < 12) periods['Morning (6-12)'] += item.amount;
      else if (hour >= 12 && hour < 18) periods['Afternoon (12-18)'] += item.amount;
      else if (hour >= 18 && hour < 24) periods['Evening (18-24)'] += item.amount;
      else periods['Night (0-6)'] += item.amount;
    });
    
    return periods;
  }

  /**
   * Helper: Detect recurring expenses
   */
  detectRecurring(expenses) {
    // Group by similar amounts and categories
    const groups = {};
    
    expenses.forEach(expense => {
      const key = `${expense.category}:${Math.round(expense.amount)}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
    });
    
    // Find groups with 3+ occurrences
    return Object.entries(groups)
      .filter(([_, items]) => items.length >= 3)
      .map(([key, items]) => ({
        category: items[0].category,
        amount: items[0].amount,
        occurrences: items.length,
        averageInterval: this.calculateAverageInterval(items)
      }));
  }

  /**
   * Helper: Calculate average interval between dates
   */
  calculateAverageInterval(items) {
    if (items.length < 2) return 0;
    
    const sorted = items.sort((a, b) => new Date(a.date) - new Date(b.date));
    const intervals = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].date) - new Date(sorted[i - 1].date);
      intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Helper: Get month labels
   */
  getMonthLabels(startDate, endDate) {
    const labels = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      labels.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    
    return labels;
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Data aggregation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const dataAggregationService = new DataAggregationService();

export default dataAggregationService;
