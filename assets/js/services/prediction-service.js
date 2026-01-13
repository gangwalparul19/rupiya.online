/**
 * Prediction Service
 * Provides forward-looking financial predictions including spending forecasts,
 * savings goal projections, budget overspend detection, and anomaly detection
 */

import firestoreService from './firestore-service.js';
import cacheManager from '../utils/cache-manager.js';
import {
  createSpendingForecast,
  createGoalProjection,
  createBudgetOverspendWarning,
  createAnomalyDetection,
  createSpendingPattern
} from './analytics-models.js';

class PredictionService {
  constructor() {
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Forecast spending for the next N days based on historical patterns
   * @param {number} days - Number of days to forecast (default: 30)
   * @returns {Promise<Array>} Array of spending forecasts with confidence intervals
   */
  async forecastSpending(days = 30) {
    const cacheKey = `spending-forecast-${days}`;
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
    const expenses = await firestoreService.getExpenses();
      
      if (!expenses || expenses.length === 0) {
        return [];
      }
      
      const forecasts = this.calculateSpendingForecast(expenses, days);
      
      // Cache result
      cacheManager.set(cacheKey, forecasts, this.cacheTTL);
      
      return forecasts;
    } catch (error) {
      console.error('[PredictionService] Error forecasting spending:', error);
      return [];
    }
  }

  /**
   * Calculate spending forecast using exponential smoothing
   * @private
   */
  calculateSpendingForecast(transactions, days) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Filter transactions from last 90 days
    const historicalTransactions = transactions.filter(t => {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      return tDate >= ninetyDaysAgo && tDate <= now;
    });

    // Group by category and calculate daily averages
    const categoryStats = this.calculateCategoryStatistics(historicalTransactions);

    // Generate forecasts for each day
    const forecasts = [];
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      
      for (const [category, stats] of Object.entries(categoryStats)) {
        const { mean, stdDev, frequency } = stats;
        
        // Use exponential smoothing to predict amount
        const predictedAmount = mean * frequency;
        
        // Calculate confidence interval (95% confidence)
        const marginOfError = 1.96 * stdDev;
        const lower = Math.max(0, predictedAmount - marginOfError);
        const upper = predictedAmount + marginOfError;

        forecasts.push(createSpendingForecast(
          forecastDate,
          Math.round(predictedAmount * 100) / 100,
          {
            lower: Math.round(lower * 100) / 100,
            upper: Math.round(upper * 100) / 100
          },
          category
        ));
      }
    }

    return forecasts;
  }

  /**
   * Calculate statistics for each spending category
   * @private
   */
  calculateCategoryStatistics(transactions) {
    const categoryData = {};

    // Group transactions by category
    transactions.forEach(t => {
      const category = t.category || 'Other';
      if (!categoryData[category]) {
        categoryData[category] = [];
      }
      categoryData[category].push(t.amount || 0);
    });

    // Calculate statistics for each category
    const stats = {};
    for (const [category, amounts] of Object.entries(categoryData)) {
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const frequency = amounts.length / 90; // Average frequency per day

      stats[category] = {
        mean: Math.round(mean * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        frequency: Math.round(frequency * 100) / 100,
        count: amounts.length
      };
    }

    return stats;
  }

  /**
   * Project savings goal achievement
   * @param {string} goalId - Goal ID
   * @returns {Promise<Object>} Goal projection with achievement status
   */
  async projectSavingsGoal(goalId) {
    try {
      const goals = await firestoreService.getGoals();
      const goal = goals.find(g => g.id === goalId);

      if (!goal) {
        throw new Error(`Goal with ID ${goalId} not found`);
      }

      const projection = this.calculateGoalProjection(goal);
      return projection;
    } catch (error) {
      console.error('Error projecting savings goal:', error);
      return null;
    }
  }

  /**
   * Calculate goal projection
   * @private
   */
  calculateGoalProjection(goal) {
    const now = new Date();
    const targetDate = goal.targetDate?.toDate ? goal.targetDate.toDate() : new Date(goal.targetDate);
    const targetAmount = goal.targetAmount || 0;
    const currentAmount = goal.currentAmount || 0;

    // Calculate days remaining
    const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    // Calculate required daily savings
    const amountNeeded = Math.max(0, targetAmount - currentAmount);
    const requiredDailySavings = daysRemaining > 0 ? amountNeeded / daysRemaining : 0;

    // Estimate projected amount based on average savings rate
    // For now, assume linear growth (can be enhanced with historical data)
    const projectedAmount = currentAmount + (requiredDailySavings * daysRemaining);

    // Determine if goal will be achieved
    const willAchieve = projectedAmount >= targetAmount;

    // Calculate days to achieve at current rate
    const daysToAchieve = requiredDailySavings > 0 
      ? Math.ceil(amountNeeded / requiredDailySavings)
      : daysRemaining;

    return createGoalProjection(
      goal.id,
      goal.name || 'Unnamed Goal',
      Math.round(targetAmount * 100) / 100,
      Math.round(projectedAmount * 100) / 100,
      willAchieve,
      Math.max(0, daysToAchieve)
    );
  }

  /**
   * Detect budget overspend risk
   * @returns {Promise<Array>} Array of budget overspend warnings
   */
  async detectBudgetOverspendRisk() {
    const cacheKey = 'budget-overspend-warnings';
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const budgets = await firestoreService.getBudgets();
      const expenses = await firestoreService.getExpenses();
      const forecasts = await this.forecastSpending(30);

      const warnings = this.calculateBudgetOverspendWarnings(budgets, expenses, forecasts);
      
      // Cache result
      cacheManager.set(cacheKey, warnings, this.cacheTTL);
      
      return warnings;
    } catch (error) {
      console.error('Error detecting budget overspend:', error);
      return [];
    }
  }

  /**
   * Calculate budget overspend warnings
   * @private
   */
  calculateBudgetOverspendWarnings(budgets, expenses, forecasts) {
    const warnings = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    budgets.forEach(budget => {
      const category = budget.category || 'Other';
      const budgetedAmount = budget.amount || 0;

      // Sum current month expenses for this category
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      let currentExpenses = 0;
      expenses.forEach(expense => {
        const eDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
        if (eDate >= currentMonthStart && eDate <= now && expense.category === category) {
          currentExpenses += expense.amount || 0;
        }
      });

      // Sum projected expenses for this category
      let projectedExpenses = 0;
      forecasts.forEach(forecast => {
        if (forecast.category === category && forecast.date <= thirtyDaysFromNow) {
          projectedExpenses += forecast.predictedAmount;
        }
      });

      const totalProjected = currentExpenses + projectedExpenses;
      const overspendAmount = Math.max(0, totalProjected - budgetedAmount);

      // Only create warning if there's overspend risk
      if (overspendAmount > 0) {
        // Determine severity
        const overspendPercentage = (overspendAmount / budgetedAmount) * 100;
        let severity = 'low';
        if (overspendPercentage > 20) severity = 'high';
        else if (overspendPercentage > 10) severity = 'medium';

        warnings.push(createBudgetOverspendWarning(
          category,
          Math.round(budgetedAmount * 100) / 100,
          Math.round(totalProjected * 100) / 100,
          Math.round(overspendAmount * 100) / 100,
          severity
        ));
      }
    });

    return warnings;
  }

  /**
   * Detect anomalies in spending patterns
   * @returns {Promise<Array>} Array of anomaly detections
   */
  async detectAnomalies() {
    const cacheKey = 'spending-anomalies';
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const expenses = await firestoreService.getExpenses();
      const anomalies = this.calculateAnomalies(expenses);
      
      // Cache result
      cacheManager.set(cacheKey, anomalies, this.cacheTTL);
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  /**
   * Calculate anomalies using statistical methods (Z-score)
   * @private
   */
  calculateAnomalies(transactions) {
    const anomalies = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group transactions by category
    const categoryTransactions = {};
    transactions.forEach(t => {
      const category = t.category || 'Other';
      if (!categoryTransactions[category]) {
        categoryTransactions[category] = [];
      }
      categoryTransactions[category].push(t);
    });

    // Detect anomalies in each category
    for (const [category, categoryTxns] of Object.entries(categoryTransactions)) {
      // Get recent transactions (last 30 days)
      const recentTxns = categoryTxns.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return tDate >= thirtyDaysAgo && tDate <= now;
      });

      if (recentTxns.length < 3) continue; // Need at least 3 transactions for statistics

      // Calculate mean and standard deviation
      const amounts = recentTxns.map(t => t.amount || 0);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);

      // Detect outliers using Z-score (threshold: 2.5)
      recentTxns.forEach(transaction => {
        const amount = transaction.amount || 0;
        const zScore = stdDev > 0 ? Math.abs((amount - mean) / stdDev) : 0;

        if (zScore > 2.5) {
          const deviation = ((amount - mean) / mean) * 100;
          const reason = amount > mean 
            ? `Spending ${Math.round(Math.abs(deviation))}% higher than usual`
            : `Spending ${Math.round(Math.abs(deviation))}% lower than usual`;

          anomalies.push(createAnomalyDetection(
            transaction.id,
            Math.round(amount * 100) / 100,
            category,
            Math.round(deviation * 100) / 100,
            reason
          ));
        }
      });
    }

    return anomalies;
  }

  /**
   * Analyze spending patterns to identify recurring expenses
   * @returns {Promise<Array>} Array of spending patterns
   */
  async analyzeSpendingPatterns() {
    const cacheKey = 'spending-patterns';
    
    // Check cache
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const expenses = await firestoreService.getExpenses();
      const patterns = this.calculateSpendingPatterns(expenses);
      
      // Cache result
      cacheManager.set(cacheKey, patterns, this.cacheTTL);
      
      return patterns;
    } catch (error) {
      console.error('Error analyzing spending patterns:', error);
      return [];
    }
  }

  /**
   * Calculate spending patterns
   * @private
   */
  calculateSpendingPatterns(transactions) {
    const patterns = [];
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Group transactions by category
    const categoryTransactions = {};
    transactions.forEach(t => {
      const category = t.category || 'Other';
      if (!categoryTransactions[category]) {
        categoryTransactions[category] = [];
      }
      categoryTransactions[category].push(t);
    });

    // Analyze patterns for each category
    for (const [category, categoryTxns] of Object.entries(categoryTransactions)) {
      // Filter to last 90 days
      const recentTxns = categoryTxns.filter(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return tDate >= ninetyDaysAgo && tDate <= now;
      });

      if (recentTxns.length < 2) continue; // Need at least 2 transactions

      // Sort by date
      recentTxns.sort((a, b) => {
        const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return aDate - bDate;
      });

      // Calculate frequency
      const daysBetweenTransactions = [];
      for (let i = 1; i < recentTxns.length; i++) {
        const prevDate = recentTxns[i - 1].date?.toDate ? recentTxns[i - 1].date.toDate() : new Date(recentTxns[i - 1].date);
        const currDate = recentTxns[i].date?.toDate ? recentTxns[i].date.toDate() : new Date(recentTxns[i].date);
        const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
        daysBetweenTransactions.push(daysDiff);
      }

      // Determine frequency
      const avgDaysBetween = daysBetweenTransactions.reduce((a, b) => a + b, 0) / daysBetweenTransactions.length;
      let frequency = 'monthly';
      let confidence = 0.5;

      if (avgDaysBetween <= 1.5) {
        frequency = 'daily';
        confidence = 0.8;
      } else if (avgDaysBetween <= 7.5) {
        frequency = 'weekly';
        confidence = 0.75;
      } else if (avgDaysBetween <= 35) {
        frequency = 'monthly';
        confidence = 0.7;
      }

      // Calculate average amount
      const amounts = recentTxns.map(t => t.amount || 0);
      const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      // Calculate next expected date
      const lastTransaction = recentTxns[recentTxns.length - 1];
      const lastDate = lastTransaction.date?.toDate ? lastTransaction.date.toDate() : new Date(lastTransaction.date);
      const nextExpectedDate = new Date(lastDate.getTime() + avgDaysBetween * 24 * 60 * 60 * 1000);

      patterns.push(createSpendingPattern(
        category,
        frequency,
        Math.round(averageAmount * 100) / 100,
        nextExpectedDate,
        confidence
      ));
    }

    return patterns;
  }

  /**
   * Invalidate prediction cache
   * @param {string} pattern - Optional pattern to match cache keys
   */
  invalidateCache(pattern = null) {
    if (pattern) {
      cacheManager.invalidatePattern(pattern);
    } else {
      // Invalidate all prediction-related caches
      cacheManager.invalidatePattern(/^(spending-forecast|budget-overspend-warnings|spending-anomalies|spending-patterns)/);
    }
  }

  /**
   * Register cache invalidation listener for data changes
   */
  registerCacheInvalidationListener() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('transactionUpdated', () => {
        this.invalidateCache();
      });

      window.addEventListener('budgetUpdated', () => {
        this.invalidateCache(/^budget-overspend-warnings/);
      });

      window.addEventListener('goalUpdated', () => {
        this.invalidateCache(/^goal-projection/);
      });
    }
  }
}

// Export singleton instance
const predictionService = new PredictionService();
export default predictionService;
