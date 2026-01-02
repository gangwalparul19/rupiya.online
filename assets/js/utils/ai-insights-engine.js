// AI Insights Engine - Analyze financial data and generate insights
class AIInsightsEngine {
  constructor() {
    this.expenses = [];
    this.income = [];
    this.budgets = [];
    this.goals = [];
  }

  // Load data for analysis
  loadData(expenses, income, budgets, goals) {
    this.expenses = expenses || [];
    this.income = income || [];
    this.budgets = budgets || [];
    this.goals = goals || [];
  }

  // Calculate Financial Health Score (0-100)
  calculateHealthScore() {
    const savingsRate = this.calculateSavingsRate();
    const budgetAdherence = this.calculateBudgetAdherence();
    const spendingConsistency = this.calculateSpendingConsistency();

    // Weighted average
    const score = Math.round(
      (savingsRate * 0.4) + 
      (budgetAdherence * 0.35) + 
      (spendingConsistency * 0.25)
    );

    return {
      score: Math.min(100, Math.max(0, score)),
      factors: {
        savingsRate: Math.round(savingsRate),
        budgetAdherence: Math.round(budgetAdherence),
        spendingConsistency: Math.round(spendingConsistency)
      }
    };
  }

  // Calculate savings rate
  calculateSavingsRate() {
    const totalIncome = this.getTotalIncome();
    const totalExpenses = this.getTotalExpenses();
    
    if (totalIncome === 0) return 0;
    
    const savings = totalIncome - totalExpenses;
    const rate = (savings / totalIncome) * 100;
    
    // Convert to 0-100 scale (30% savings = 100 score)
    return Math.min(100, (rate / 30) * 100);
  }

  // Calculate budget adherence
  calculateBudgetAdherence() {
    if (this.budgets.length === 0) return 50; // Neutral if no budgets
    
    let totalAdherence = 0;
    let validBudgets = 0;
    
    this.budgets.forEach(budget => {
      const spent = this.getCategorySpending(budget.category, budget.month);
      if (budget.amount > 0) {
        const adherence = Math.min(100, (1 - (spent / budget.amount)) * 100);
        totalAdherence += Math.max(0, adherence);
        validBudgets++;
      }
    });
    
    return validBudgets > 0 ? totalAdherence / validBudgets : 50;
  }

  // Calculate spending consistency
  calculateSpendingConsistency() {
    const monthlySpending = this.getMonthlySpending();
    if (monthlySpending.length < 2) return 50;
    
    const avg = monthlySpending.reduce((a, b) => a + b, 0) / monthlySpending.length;
    const variance = monthlySpending.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / monthlySpending.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? (stdDev / avg) : 0;
    
    // Lower coefficient of variation = higher consistency
    return Math.max(0, 100 - (cv * 100));
  }

  // Analyze spending patterns
  analyzeSpendingPatterns() {
    const thisMonth = this.getCurrentMonthExpenses();
    const lastMonth = this.getLastMonthExpenses();
    
    const thisMonthTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0);
    const lastMonthTotal = lastMonth.reduce((sum, e) => sum + e.amount, 0);
    
    const change = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    
    const insights = [];
    
    if (Math.abs(change) > 20) {
      insights.push({
        type: change > 0 ? 'warning' : 'positive',
        title: change > 0 ? 'Spending Increased' : 'Spending Decreased',
        value: `${Math.abs(change).toFixed(1)}%`,
        description: `Your spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month.`
      });
    }
    
    // Category-wise analysis
    const categoryChanges = this.analyzeCategoryChanges(thisMonth, lastMonth);
    categoryChanges.forEach(cat => {
      if (Math.abs(cat.change) > 30) {
        insights.push({
          type: cat.change > 0 ? 'warning' : 'positive',
          title: `${cat.category} ${cat.change > 0 ? 'Up' : 'Down'}`,
          value: `${Math.abs(cat.change).toFixed(1)}%`,
          description: `${cat.category} spending ${cat.change > 0 ? 'increased' : 'decreased'} significantly.`
        });
      }
    });
    
    return insights.length > 0 ? insights : [{
      type: 'neutral',
      title: 'Stable Spending',
      value: '±5%',
      description: 'Your spending patterns are consistent with last month.'
    }];
  }

  // Detect anomalies
  detectAnomalies() {
    const anomalies = [];
    const avgExpense = this.getAverageExpenseAmount();
    
    // Find unusually large expenses
    const largeExpenses = this.expenses.filter(e => e.amount > avgExpense * 3);
    if (largeExpenses.length > 0) {
      largeExpenses.slice(0, 3).forEach(expense => {
        anomalies.push({
          type: 'alert',
          title: 'Large Expense Detected',
          value: `₹${expense.amount.toFixed(2)}`,
          description: `${expense.category} expense is ${(expense.amount / avgExpense).toFixed(1)}x your average.`,
          badge: 'high'
        });
      });
    }
    
    // Check for unusual category spending
    const categoryAnomalies = this.detectCategoryAnomalies();
    anomalies.push(...categoryAnomalies);
    
    return anomalies.length > 0 ? anomalies : [{
      type: 'positive',
      title: 'No Anomalies',
      value: '✓',
      description: 'All spending appears normal and within expected ranges.',
      badge: 'low'
    }];
  }

  // Find savings opportunities
  findSavingsOpportunities() {
    const opportunities = [];
    
    // Check for overspending categories
    this.budgets.forEach(budget => {
      const spent = this.getCategorySpending(budget.category, budget.month);
      if (spent > budget.amount) {
        const overspend = spent - budget.amount;
        opportunities.push({
          type: 'warning',
          title: `Reduce ${budget.category}`,
          value: `₹${overspend.toFixed(2)}`,
          description: `You're over budget by ₹${overspend.toFixed(2)}. Consider cutting back.`
        });
      }
    });
    
    // Suggest budget creation for high-spending categories
    const topCategories = this.getTopSpendingCategories(3);
    topCategories.forEach(cat => {
      const hasBudget = this.budgets.some(b => b.category === cat.category);
      if (!hasBudget && cat.amount > 1000) {
        opportunities.push({
          type: 'neutral',
          title: `Set ${cat.category} Budget`,
          value: `₹${cat.amount.toFixed(2)}`,
          description: `Create a budget for ${cat.category} to track spending better.`
        });
      }
    });
    
    // Check for recurring subscriptions
    const recurring = this.detectRecurringExpenses();
    if (recurring.length > 0) {
      opportunities.push({
        type: 'neutral',
        title: 'Review Subscriptions',
        value: `${recurring.length} found`,
        description: `You have ${recurring.length} recurring expenses. Review if all are necessary.`
      });
    }
    
    return opportunities.length > 0 ? opportunities : [{
      type: 'positive',
      title: 'Great Job!',
      value: '✓',
      description: 'You\'re managing your finances well. Keep it up!'
    }];
  }

  // Generate budget recommendations
  generateBudgetRecommendations() {
    const recommendations = [];
    const totalIncome = this.getTotalIncome();
    
    if (totalIncome === 0) {
      return [{
        type: 'neutral',
        title: 'Add Income',
        value: '₹0',
        description: 'Add your income to get personalized budget recommendations.'
      }];
    }
    
    // 50/30/20 rule recommendations
    const needs = totalIncome * 0.5;
    const wants = totalIncome * 0.3;
    const savings = totalIncome * 0.2;
    
    recommendations.push({
      type: 'neutral',
      title: '50/30/20 Rule',
      value: 'Recommended',
      description: `Needs: ₹${needs.toFixed(0)}, Wants: ₹${wants.toFixed(0)}, Savings: ₹${savings.toFixed(0)}`
    });
    
    // Category-specific recommendations
    const topCategories = this.getTopSpendingCategories(3);
    topCategories.forEach(cat => {
      const percentage = (cat.amount / totalIncome) * 100;
      if (percentage > 15) {
        recommendations.push({
          type: 'warning',
          title: `${cat.category} Too High`,
          value: `${percentage.toFixed(1)}%`,
          description: `${cat.category} is ${percentage.toFixed(1)}% of income. Consider reducing to 10-15%.`
        });
      }
    });
    
    return recommendations;
  }

  // Analyze categories
  analyzeCategoryInsights() {
    const categories = this.getTopSpendingCategories(5);
    const totalSpending = this.getTotalExpenses();
    
    return categories.map(cat => ({
      type: 'neutral',
      title: cat.category,
      value: `₹${cat.amount.toFixed(2)}`,
      description: `${((cat.amount / totalSpending) * 100).toFixed(1)}% of total spending`
    }));
  }

  // Generate predictions
  generatePredictions() {
    const predictions = [];
    const avgMonthlySpending = this.getAverageMonthlySpending();
    const trend = this.getSpendingTrend();
    
    const nextMonthPrediction = avgMonthlySpending * (1 + trend);
    
    predictions.push({
      type: trend > 0 ? 'warning' : 'positive',
      title: 'Next Month Spending',
      value: `₹${nextMonthPrediction.toFixed(2)}`,
      description: `Based on trends, you'll likely spend ₹${nextMonthPrediction.toFixed(2)} next month.`
    });
    
    // Goal predictions
    this.goals.forEach(goal => {
      const remaining = goal.targetAmount - goal.currentAmount;
      const monthsToGoal = this.calculateMonthsToGoal(goal);
      
      if (monthsToGoal > 0) {
        predictions.push({
          type: 'neutral',
          title: goal.name,
          value: `${monthsToGoal} months`,
          description: `At current savings rate, you'll reach this goal in ${monthsToGoal} months.`
        });
      }
    });
    
    return predictions.length > 0 ? predictions : [{
      type: 'neutral',
      title: 'Insufficient Data',
      value: '—',
      description: 'Add more transactions to get accurate predictions.'
    }];
  }

  // Generate monthly report
  generateMonthlyReport() {
    const totalIncome = this.getTotalIncome();
    const totalExpenses = this.getTotalExpenses();
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
    
    const topCategories = this.getTopSpendingCategories(3);
    const healthScore = this.calculateHealthScore();
    
    return {
      summary: {
        income: totalIncome,
        expenses: totalExpenses,
        savings: savings,
        savingsRate: savingsRate
      },
      topCategories: topCategories,
      healthScore: healthScore.score,
      insights: this.analyzeSpendingPatterns(),
      recommendations: this.generateBudgetRecommendations()
    };
  }

  // Helper methods
  getTotalIncome() {
    return this.income.reduce((sum, i) => sum + i.amount, 0);
  }

  getTotalExpenses() {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  getCurrentMonthExpenses() {
    const now = new Date();
    return this.expenses.filter(e => {
      const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }

  getLastMonthExpenses() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return this.expenses.filter(e => {
      const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    });
  }

  getMonthlySpending() {
    const monthlyTotals = {};
    this.expenses.forEach(e => {
      const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyTotals[key] = (monthlyTotals[key] || 0) + e.amount;
    });
    return Object.values(monthlyTotals);
  }

  getAverageMonthlySpending() {
    const monthly = this.getMonthlySpending();
    return monthly.length > 0 ? monthly.reduce((a, b) => a + b, 0) / monthly.length : 0;
  }

  getSpendingTrend() {
    const monthly = this.getMonthlySpending();
    if (monthly.length < 2) return 0;
    
    const recent = monthly.slice(-3);
    const older = monthly.slice(-6, -3);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  getAverageExpenseAmount() {
    return this.expenses.length > 0 ? this.getTotalExpenses() / this.expenses.length : 0;
  }

  getCategorySpending(category, month) {
    return this.expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getTopSpendingCategories(limit = 5) {
    const categoryTotals = {};
    this.expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  analyzeCategoryChanges(thisMonth, lastMonth) {
    const thisCats = {};
    const lastCats = {};
    
    thisMonth.forEach(e => {
      thisCats[e.category] = (thisCats[e.category] || 0) + e.amount;
    });
    
    lastMonth.forEach(e => {
      lastCats[e.category] = (lastCats[e.category] || 0) + e.amount;
    });
    
    const changes = [];
    Object.keys(thisCats).forEach(cat => {
      const thisAmount = thisCats[cat];
      const lastAmount = lastCats[cat] || 0;
      const change = lastAmount > 0 ? ((thisAmount - lastAmount) / lastAmount) * 100 : 0;
      changes.push({ category: cat, change });
    });
    
    return changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  detectCategoryAnomalies() {
    const anomalies = [];
    const categoryAvgs = this.getCategoryAverages();
    
    this.getCurrentMonthExpenses().forEach(expense => {
      const avg = categoryAvgs[expense.category] || 0;
      if (avg > 0 && expense.amount > avg * 2) {
        anomalies.push({
          type: 'alert',
          title: `High ${expense.category} Expense`,
          value: `₹${expense.amount.toFixed(2)}`,
          description: `This expense is ${(expense.amount / avg).toFixed(1)}x your average for this category.`,
          badge: 'medium'
        });
      }
    });
    
    return anomalies.slice(0, 3);
  }

  getCategoryAverages() {
    const categoryTotals = {};
    const categoryCounts = {};
    
    this.expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });
    
    const averages = {};
    Object.keys(categoryTotals).forEach(cat => {
      averages[cat] = categoryTotals[cat] / categoryCounts[cat];
    });
    
    return averages;
  }

  detectRecurringExpenses() {
    // Simple heuristic: same amount, same category, monthly
    const recurring = [];
    const grouped = {};
    
    this.expenses.forEach(e => {
      const key = `${e.category}-${e.amount}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    Object.entries(grouped).forEach(([key, count]) => {
      if (count >= 3) {
        recurring.push(key);
      }
    });
    
    return recurring;
  }

  calculateMonthsToGoal(goal) {
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthlySavings = this.getTotalIncome() - this.getTotalExpenses();
    
    if (monthlySavings <= 0) return -1;
    
    return Math.ceil(remaining / monthlySavings);
  }
}

export default AIInsightsEngine;
