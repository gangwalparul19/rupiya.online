/**
 * Analytics Data Models and Interfaces
 * Defines TypeScript-like interfaces for all analytics data structures
 */

/**
 * Skeleton Screen Model
 */
export const SkeletonScreenModel = {
  dashboard: {
    type: 'dashboard',
    layout: {
      width: '100%',
      height: '600px',
      rows: 3,
      columns: 2
    },
    shimmerAnimation: {
      duration: 1500,
      delay: 0,
      easing: 'ease-in-out'
    }
  },
  list: {
    type: 'list',
    layout: {
      width: '100%',
      height: '400px',
      rows: 5,
      columns: 1
    },
    shimmerAnimation: {
      duration: 1500,
      delay: 0,
      easing: 'ease-in-out'
    }
  },
  chart: {
    type: 'chart',
    layout: {
      width: '100%',
      height: '300px',
      rows: 1,
      columns: 1
    },
    shimmerAnimation: {
      duration: 1500,
      delay: 0,
      easing: 'ease-in-out'
    }
  },
  form: {
    type: 'form',
    layout: {
      width: '100%',
      height: '250px',
      rows: 4,
      columns: 1
    },
    shimmerAnimation: {
      duration: 1500,
      delay: 0,
      easing: 'ease-in-out'
    }
  }
};

/**
 * Spending Trend Model
 */
export function createSpendingTrend(date, amount, category, trend = 'stable') {
  return {
    date,
    amount,
    category,
    trend // 'up' | 'down' | 'stable'
  };
}

/**
 * Category Breakdown Model
 */
export function createCategoryBreakdown(category, total, percentage, transactionCount, color) {
  return {
    category,
    total,
    percentage,
    transactionCount,
    color
  };
}

/**
 * Income vs Expense Comparison Model
 */
export function createIncomeExpenseComparison(period, income, expense, savings, savingsRate) {
  return {
    period,
    income,
    expense,
    savings,
    savingsRate // percentage
  };
}

/**
 * Savings Rate Trend Model
 */
export function createSavingsRateTrend(date, rate, target) {
  return {
    date,
    rate, // percentage
    target
  };
}

/**
 * Budget Comparison Model
 */
export function createBudgetComparison(category, budgeted, actual, remaining, percentageUsed) {
  return {
    category,
    budgeted,
    actual,
    remaining,
    percentageUsed
  };
}

/**
 * Financial Health Score Model
 */
export function createFinancialHealthScore(score, components, trend) {
  return {
    score, // 0-100
    components: {
      savingsRate: components.savingsRate || 0,
      debtRatio: components.debtRatio || 0,
      expenseControl: components.expenseControl || 0,
      goalProgress: components.goalProgress || 0
    },
    trend // 'improving' | 'stable' | 'declining'
  };
}

/**
 * Spending Forecast Model
 */
export function createSpendingForecast(date, predictedAmount, confidenceInterval, category) {
  return {
    date,
    predictedAmount,
    confidenceInterval: {
      lower: confidenceInterval.lower,
      upper: confidenceInterval.upper
    },
    category
  };
}

/**
 * Goal Projection Model
 */
export function createGoalProjection(goalId, goalName, targetAmount, projectedAmount, willAchieve, daysToAchieve) {
  return {
    goalId,
    goalName,
    targetAmount,
    projectedAmount,
    willAchieve,
    daysToAchieve
  };
}

/**
 * Budget Overspend Warning Model
 */
export function createBudgetOverspendWarning(category, budgetedAmount, projectedAmount, overspendAmount, severity) {
  return {
    category,
    budgetedAmount,
    projectedAmount,
    overspendAmount,
    severity // 'low' | 'medium' | 'high'
  };
}

/**
 * Anomaly Detection Model
 */
export function createAnomalyDetection(transactionId, amount, category, deviation, reason) {
  return {
    transactionId,
    amount,
    category,
    deviation, // percentage from normal
    reason
  };
}

/**
 * Spending Pattern Model
 */
export function createSpendingPattern(category, frequency, averageAmount, nextExpectedDate, confidence) {
  return {
    category,
    frequency, // 'daily' | 'weekly' | 'monthly'
    averageAmount,
    nextExpectedDate,
    confidence // 0-1
  };
}

/**
 * Analytics Dashboard Data Model
 */
export function createAnalyticsDashboard() {
  return {
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      totalSavings: 0,
      savingsRate: 0,
      transactionCount: 0
    },
    spendingTrends: [],
    categoryBreakdown: [],
    incomeVsExpense: null,
    savingsRateTrends: [],
    budgetComparisons: [],
    financialHealthScore: null,
    lastUpdated: new Date()
  };
}

/**
 * Predictive Analytics Data Model
 */
export function createPredictiveAnalytics() {
  return {
    spendingForecasts: [],
    goalProjections: [],
    budgetOverspendWarnings: [],
    anomalies: [],
    spendingPatterns: [],
    lastUpdated: new Date()
  };
}

/**
 * Loading State Model
 */
export function createLoadingState(contentType, isLoading = true) {
  return {
    contentType, // 'dashboard' | 'list' | 'chart' | 'form'
    isLoading,
    progress: 0, // 0-100
    message: 'Loading...'
  };
}

/**
 * Cache Entry Model
 */
export function createCacheEntry(key, value, ttlMs = 5 * 60 * 1000) {
  return {
    key,
    value,
    timestamp: Date.now(),
    ttl: ttlMs,
    expiresAt: Date.now() + ttlMs
  };
}
