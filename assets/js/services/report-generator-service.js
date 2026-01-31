/**
 * Report Generator Service
 * Generates downloadable weekly and monthly reports with charts and graphs
 */

import firestoreService from './firestore-service.js';
import authService from './auth-service.js';
import { formatCurrency } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class ReportGeneratorService {
  constructor() {
    this.reportTypes = ['weekly', 'monthly'];
    this.chartColors = {
      primary: '#4F46E5',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#3B82F6',
      purple: '#8B5CF6',
      pink: '#EC4899'
    };
  }

  /**
   * Generate report data
   * @param {string} type - 'weekly' or 'monthly'
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Promise<Object>} Report data
   */
  async generateReportData(type, startDate, endDate) {
    try {
      logger.info(`Generating ${type} report from ${startDate} to ${endDate}`);

      const userId = authService.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Fetch all necessary data in parallel
      const [expenses, income, budgets, investments, goals] = await Promise.all([
        firestoreService.queryByDateRange('expenses', startDate, endDate),
        firestoreService.queryByDateRange('income', startDate, endDate),
        firestoreService.getBudgets(),
        firestoreService.getInvestments(),
        firestoreService.getGoals()
      ]);

      // Calculate aggregations
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalIncome = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;

      // Category breakdown
      const categoryBreakdown = this.calculateCategoryBreakdown(expenses);
      
      // Daily spending trend
      const dailyTrend = this.calculateDailyTrend(expenses, startDate, endDate);
      
      // Budget comparison
      const budgetComparison = this.calculateBudgetComparison(budgets, categoryBreakdown);
      
      // Top expenses
      const topExpenses = expenses
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 10);

      // Income sources
      const incomeSources = this.calculateIncomeSources(income);

      // Investment summary
      const investmentSummary = this.calculateInvestmentSummary(investments);

      // Goals progress
      const goalsProgress = this.calculateGoalsProgress(goals);

      return {
        type,
        period: {
          start: startDate,
          end: endDate,
          label: this.getPeriodLabel(type, startDate, endDate)
        },
        summary: {
          totalExpenses,
          totalIncome,
          netSavings,
          savingsRate,
          transactionCount: expenses.length + income.length,
          expenseCount: expenses.length,
          incomeCount: income.length
        },
        categoryBreakdown,
        dailyTrend,
        budgetComparison,
        topExpenses,
        incomeSources,
        investmentSummary,
        goalsProgress,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to generate report data:', error);
      throw error;
    }
  }

  /**
   * Calculate category breakdown
   */
  calculateCategoryBreakdown(expenses) {
    const breakdown = {};
    let total = 0;

    expenses.forEach(exp => {
      const category = exp.category || 'Other';
      const amount = exp.amount || 0;
      
      if (!breakdown[category]) {
        breakdown[category] = { amount: 0, count: 0 };
      }
      
      breakdown[category].amount += amount;
      breakdown[category].count += 1;
      total += amount;
    });

    // Convert to array and calculate percentages
    return Object.entries(breakdown)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: total > 0 ? (data.amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Calculate daily spending trend
   */
  calculateDailyTrend(expenses, startDate, endDate) {
    const trend = {};
    
    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      trend[dateKey] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate expenses by date
    expenses.forEach(exp => {
      const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      const dateKey = date.toISOString().split('T')[0];
      
      if (trend.hasOwnProperty(dateKey)) {
        trend[dateKey] += exp.amount || 0;
      }
    });

    return Object.entries(trend)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Calculate budget comparison
   */
  calculateBudgetComparison(budgets, categoryBreakdown) {
    return budgets.map(budget => {
      const categoryData = categoryBreakdown.find(c => c.category === budget.category);
      const spent = categoryData ? categoryData.amount : 0;
      const remaining = budget.amount - spent;
      const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        category: budget.category,
        budgeted: budget.amount,
        spent,
        remaining,
        percentageUsed,
        status: percentageUsed > 100 ? 'over' : percentageUsed > 80 ? 'warning' : 'good'
      };
    });
  }

  /**
   * Calculate income sources
   */
  calculateIncomeSources(income) {
    const sources = {};
    let total = 0;

    income.forEach(inc => {
      const source = inc.source || inc.category || 'Other';
      const amount = inc.amount || 0;
      
      if (!sources[source]) {
        sources[source] = 0;
      }
      
      sources[source] += amount;
      total += amount;
    });

    return Object.entries(sources)
      .map(([source, amount]) => ({
        source,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Calculate investment summary
   */
  calculateInvestmentSummary(investments) {
    const totalValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0);
    const totalGain = totalValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

    return {
      totalValue,
      totalInvested,
      totalGain,
      returnPercentage,
      count: investments.length
    };
  }

  /**
   * Calculate goals progress
   */
  calculateGoalsProgress(goals) {
    return goals.map(goal => {
      const progress = goal.targetAmount > 0 ? ((goal.currentAmount || 0) / goal.targetAmount) * 100 : 0;
      const remaining = goal.targetAmount - (goal.currentAmount || 0);
      
      return {
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount || 0,
        progress,
        remaining,
        status: progress >= 100 ? 'completed' : progress >= 75 ? 'on-track' : 'needs-attention'
      };
    });
  }

  /**
   * Get period label
   */
  getPeriodLabel(type, startDate, endDate) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = startDate.toLocaleDateString('en-US', options);
    const end = endDate.toLocaleDateString('en-US', options);
    
    if (type === 'monthly') {
      return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    return `${start} - ${end}`;
  }

  /**
   * Generate HTML report
   * @param {Object} reportData - Report data from generateReportData
   * @returns {string} HTML string
   */
  generateHTMLReport(reportData) {
    const { period, summary, categoryBreakdown, dailyTrend, budgetComparison, topExpenses, incomeSources, investmentSummary, goalsProgress } = reportData;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportData.type === 'monthly' ? 'Monthly' : 'Weekly'} Financial Report - ${period.label}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: #1f2937; 
      line-height: 1.6; 
      padding: 30px 20px; 
    }
    .report-wrapper { 
      max-width: 1200px; 
      margin: 0 auto; 
      background: white; 
      border: 4px solid #4F46E5; 
      border-radius: 20px; 
      padding: 50px; 
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(79, 70, 229, 0.1) inset; 
    }
    .logo { 
      text-align: center; 
      margin-bottom: 30px; 
      padding-bottom: 20px;
      border-bottom: 3px solid #f3f4f6;
    }
    .logo img { 
      max-width: 180px; 
      height: auto; 
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { 
      text-align: center; 
      margin-bottom: 50px; 
      padding: 40px 30px; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      border-radius: 16px; 
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
    }
    .header h1 { 
      font-size: 36px; 
      margin-bottom: 12px; 
      font-weight: 800;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header p { 
      font-size: 20px; 
      opacity: 0.95; 
      font-weight: 500;
    }
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
      gap: 24px; 
      margin-bottom: 50px; 
    }
    .summary-card { 
      background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); 
      padding: 28px; 
      border-radius: 16px; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); 
      border: 2px solid #e5e7eb;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }
    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    }
    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    .summary-card h3 { 
      font-size: 13px; 
      color: #6b7280; 
      text-transform: uppercase; 
      letter-spacing: 1px; 
      margin-bottom: 12px; 
      font-weight: 700;
    }
    .summary-card .value { 
      font-size: 32px; 
      font-weight: 800; 
      color: #1f2937; 
      margin-bottom: 4px;
    }
    .summary-card .subtext { 
      font-size: 14px; 
      color: #9ca3af; 
      margin-top: 8px; 
      font-weight: 500;
    }
    .summary-card.positive .value { 
      color: #10b981; 
      text-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    }
    .summary-card.negative .value { 
      color: #ef4444; 
      text-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
    }
    .section { 
      background: white; 
      padding: 35px; 
      border-radius: 16px; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); 
      margin-bottom: 35px; 
      border: 2px solid #e5e7eb;
    }
    .section h2 { 
      font-size: 26px; 
      margin-bottom: 24px; 
      color: #1f2937; 
      font-weight: 700;
      padding-bottom: 12px;
      border-bottom: 3px solid #4F46E5;
      display: inline-block;
    }
    .chart-container { 
      position: relative; 
      height: 320px; 
      margin: 24px 0; 
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border: 2px solid #e5e7eb;
    }
    .table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }
    .table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .table th { 
      text-align: left; 
      padding: 16px; 
      font-weight: 700; 
      color: white; 
      font-size: 14px; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .table tbody tr {
      background: white;
      transition: background-color 0.2s;
    }
    .table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    .table tbody tr:hover {
      background: #f3f4f6;
    }
    .table td { 
      padding: 14px 16px; 
      border-top: 1px solid #e5e7eb; 
      font-size: 14px;
      color: #374151;
    }
    .table tbody tr:first-child td {
      border-top: none;
    }
    .badge { 
      display: inline-block; 
      padding: 6px 14px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 700; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge.good { 
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); 
      color: #065f46; 
      border: 1px solid #10b981;
    }
    .badge.warning { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
      color: #92400e; 
      border: 1px solid #f59e0b;
    }
    .badge.over { 
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); 
      color: #991b1b; 
      border: 1px solid #ef4444;
    }
    .progress-bar { 
      height: 10px; 
      background: #e5e7eb; 
      border-radius: 6px; 
      overflow: hidden; 
      margin-top: 10px; 
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #d1d5db;
    }
    .progress-fill { 
      height: 100%; 
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); 
      transition: width 0.3s; 
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.4);
    }
    .footer { 
      text-align: center; 
      margin-top: 50px; 
      padding: 30px; 
      color: #6b7280; 
      font-size: 14px; 
      border-top: 3px solid #f3f4f6;
      background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      border-radius: 12px;
    }
    .footer p {
      margin: 6px 0;
      font-weight: 500;
    }
    .footer p:last-child {
      font-weight: 700;
      color: #4F46E5;
      font-size: 16px;
    }
    @media print { 
      body { background: white; padding: 0; } 
      .report-wrapper { border: 2px solid #4F46E5; box-shadow: none; }
      .container { padding: 20px; } 
      .section { page-break-inside: avoid; }
      .summary-card { page-break-inside: avoid; }
      .chart-container { page-break-inside: avoid; }
      .summary-card:hover { transform: none; }
      .table tbody tr:hover { background: inherit; }
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    <div class="logo">
      <img src="https://www.rupiya.online/assets/images/logo.png" alt="Rupiya Logo" style="max-width: 150px; height: auto;" onerror="this.style.display='none'" crossorigin="anonymous">
    </div>
    <div class="container">
      <div class="header">
        <h1>${reportData.type === 'monthly' ? 'Monthly' : 'Weekly'} Financial Report</h1>
        <p>${period.label}</p>
      </div>

    <div class="summary-grid">
      <div class="summary-card">
        <h3>Total Income</h3>
        <div class="value positive">${formatCurrency(summary.totalIncome)}</div>
        <div class="subtext">${summary.incomeCount} transactions</div>
      </div>
      <div class="summary-card">
        <h3>Total Expenses</h3>
        <div class="value negative">${formatCurrency(summary.totalExpenses)}</div>
        <div class="subtext">${summary.expenseCount} transactions</div>
      </div>
      <div class="summary-card ${summary.netSavings >= 0 ? 'positive' : 'negative'}">
        <h3>Net Savings</h3>
        <div class="value">${formatCurrency(summary.netSavings)}</div>
        <div class="subtext">${summary.savingsRate.toFixed(1)}% savings rate</div>
      </div>
      <div class="summary-card">
        <h3>Transactions</h3>
        <div class="value">${summary.transactionCount}</div>
        <div class="subtext">Total recorded</div>
      </div>
    </div>

    <div class="section">
      <h2>Spending by Category</h2>
      <div class="chart-container">
        <canvas id="categoryChart"></canvas>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Transactions</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${categoryBreakdown.slice(0, 10).map(cat => `
            <tr>
              <td>${cat.category}</td>
              <td>${formatCurrency(cat.amount)}</td>
              <td>${cat.count}</td>
              <td>${cat.percentage.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Daily Spending Trend</h2>
      <div class="chart-container">
        <canvas id="trendChart"></canvas>
      </div>
    </div>

    ${budgetComparison.length > 0 ? `
    <div class="section">
      <h2>Budget Performance</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Budgeted</th>
            <th>Spent</th>
            <th>Remaining</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${budgetComparison.map(budget => `
            <tr>
              <td>${budget.category}</td>
              <td>${formatCurrency(budget.budgeted)}</td>
              <td>${formatCurrency(budget.spent)}</td>
              <td>${formatCurrency(budget.remaining)}</td>
              <td>
                <span class="badge ${budget.status}">${budget.percentageUsed.toFixed(0)}%</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min(budget.percentageUsed, 100)}%; background: ${budget.status === 'over' ? '#ef4444' : budget.status === 'warning' ? '#f59e0b' : '#10b981'}"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${incomeSources.length > 0 ? `
    <div class="section">
      <h2>Income Sources</h2>
      <div class="chart-container">
        <canvas id="incomeChart"></canvas>
      </div>
    </div>
    ` : ''}

    ${topExpenses.length > 0 ? `
    <div class="section">
      <h2>Top 10 Expenses</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${topExpenses.map(exp => {
            const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
            return `
            <tr>
              <td>${date.toLocaleDateString()}</td>
              <td>${exp.description || '-'}</td>
              <td>${exp.category || 'Other'}</td>
              <td>${formatCurrency(exp.amount)}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${investmentSummary.count > 0 ? `
    <div class="section">
      <h2>Investment Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Value</h3>
          <div class="value">${formatCurrency(investmentSummary.totalValue)}</div>
        </div>
        <div class="summary-card">
          <h3>Total Invested</h3>
          <div class="value">${formatCurrency(investmentSummary.totalInvested)}</div>
        </div>
        <div class="summary-card ${investmentSummary.totalGain >= 0 ? 'positive' : 'negative'}">
          <h3>Total Gain/Loss</h3>
          <div class="value">${formatCurrency(investmentSummary.totalGain)}</div>
          <div class="subtext">${investmentSummary.returnPercentage.toFixed(2)}% return</div>
        </div>
      </div>
    </div>
    ` : ''}

    ${goalsProgress.length > 0 ? `
    <div class="section">
      <h2>Goals Progress</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Goal</th>
            <th>Target</th>
            <th>Current</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${goalsProgress.map(goal => `
            <tr>
              <td>${goal.name}</td>
              <td>${formatCurrency(goal.targetAmount)}</td>
              <td>${formatCurrency(goal.currentAmount)}</td>
              <td>
                <span class="badge ${goal.status === 'completed' ? 'good' : goal.status === 'on-track' ? 'warning' : 'over'}">${goal.progress.toFixed(0)}%</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min(goal.progress, 100)}%"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>Rupiya - Personal Finance Manager</p>
    </div>
  </div>
  </div>

  <script>
    // Category Pie Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
      new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: ${JSON.stringify(categoryBreakdown.slice(0, 8).map(c => c.category))},
          datasets: [{
            data: ${JSON.stringify(categoryBreakdown.slice(0, 8).map(c => c.amount))},
            backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' }
          }
        }
      });
    }

    // Daily Trend Line Chart
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
      new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: ${JSON.stringify(dailyTrend.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })))},
          datasets: [{
            label: 'Daily Spending',
            data: ${JSON.stringify(dailyTrend.map(d => d.amount))},
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Income Sources Pie Chart
    const incomeCtx = document.getElementById('incomeChart');
    if (incomeCtx) {
      new Chart(incomeCtx, {
        type: 'pie',
        data: {
          labels: ${JSON.stringify(incomeSources.map(s => s.source))},
          datasets: [{
            data: ${JSON.stringify(incomeSources.map(s => s.amount))},
            backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' }
          }
        }
      });
    }
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Download report as HTML
   */
  async downloadHTMLReport(type, startDate, endDate) {
    try {
      const reportData = await this.generateReportData(type, startDate, endDate);
      const html = this.generateHTMLReport(reportData);
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${startDate.toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.info(`${type} report downloaded successfully`);
      return true;
    } catch (error) {
      logger.error('Failed to download HTML report:', error);
      throw error;
    }
  }

  /**
   * Get date range for report type
   */
  getDateRangeForType(type) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    
    if (type === 'weekly') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (type === 'monthly') {
      startDate.setDate(1);
      startDate.setMonth(endDate.getMonth());
    }
    
    startDate.setHours(0, 0, 0, 0);
    
    return { startDate, endDate };
  }
}

export default new ReportGeneratorService();
