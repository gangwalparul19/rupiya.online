/**
 * Analytics Dashboard
 * Displays user analytics, feature usage, and performance metrics
 */

import dataAggregationService from '../services/data-aggregation-service.js';
import userAnalyticsService from '../services/user-analytics-service.js';
import logger from '../utils/logger.js';

class AnalyticsDashboard {
  constructor() {
    this.userId = null;
    this.charts = {};
    this.refreshInterval = null;
  }

  /**
   * Initialize dashboard
   */
  async init(userId) {
    this.userId = userId;
    
    try {
      await this.loadDashboardData();
      this.setupEventListeners();
      this.startAutoRefresh();
    } catch (error) {
      logger.error('Failed to initialize analytics dashboard:', error);
      this.showError('Failed to load analytics data');
    }
  }

  /**
   * Load all dashboard data
   */
  async loadDashboardData() {
    this.showLoading();

    try {
      // Load data in parallel
      const [kpis, trends, patterns, userStats] = await Promise.all([
        dataAggregationService.getDashboardKPIs(this.userId, 'month'),
        dataAggregationService.getCategoryTrends(this.userId, 6),
        dataAggregationService.getSpendingPatterns(this.userId),
        userAnalyticsService.getUserStats()
      ]);

      // Render sections
      this.renderKPIs(kpis);
      this.renderTrends(trends);
      this.renderPatterns(patterns);
      this.renderUserStats(userStats);
      
      this.hideLoading();
    } catch (error) {
      logger.error('Failed to load dashboard data:', error);
      this.showError('Failed to load analytics data');
    }
  }

  /**
   * Render KPI cards
   */
  renderKPIs(kpis) {
    const container = document.getElementById('kpi-cards');
    if (!container) return;

    const { summary, expenses, income, investments, budgets } = kpis;

    container.innerHTML = `
      <div class="kpi-grid">
        <!-- Total Expenses -->
        <div class="kpi-card">
          <div class="kpi-icon expenses">
            <i class="fas fa-arrow-down"></i>
          </div>
          <div class="kpi-content">
            <h3>Total Expenses</h3>
            <p class="kpi-value">₹${this.formatNumber(summary.totalExpenses)}</p>
            <span class="kpi-trend ${expenses.trend >= 0 ? 'up' : 'down'}">
              <i class="fas fa-arrow-${expenses.trend >= 0 ? 'up' : 'down'}"></i>
              ${Math.abs(expenses.trend).toFixed(1)}% vs last period
            </span>
          </div>
        </div>

        <!-- Total Income -->
        <div class="kpi-card">
          <div class="kpi-icon income">
            <i class="fas fa-arrow-up"></i>
          </div>
          <div class="kpi-content">
            <h3>Total Income</h3>
            <p class="kpi-value">₹${this.formatNumber(summary.totalIncome)}</p>
            <span class="kpi-trend ${income.trend >= 0 ? 'up' : 'down'}">
              <i class="fas fa-arrow-${income.trend >= 0 ? 'up' : 'down'}"></i>
              ${Math.abs(income.trend).toFixed(1)}% vs last period
            </span>
          </div>
        </div>

        <!-- Net Savings -->
        <div class="kpi-card">
          <div class="kpi-icon savings">
            <i class="fas fa-piggy-bank"></i>
          </div>
          <div class="kpi-content">
            <h3>Net Savings</h3>
            <p class="kpi-value">₹${this.formatNumber(summary.netSavings)}</p>
            <span class="kpi-subtitle">
              ${summary.savingsRate.toFixed(1)}% savings rate
            </span>
          </div>
        </div>

        <!-- Investments -->
        <div class="kpi-card">
          <div class="kpi-icon investments">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="kpi-content">
            <h3>Investments</h3>
            <p class="kpi-value">₹${this.formatNumber(summary.totalInvestments)}</p>
            <span class="kpi-subtitle">
              ${investments.count} active investments
            </span>
          </div>
        </div>

        <!-- Budget Status -->
        <div class="kpi-card">
          <div class="kpi-icon budget">
            <i class="fas fa-wallet"></i>
          </div>
          <div class="kpi-content">
            <h3>Budget Status</h3>
            <p class="kpi-value">${budgets.utilization.length} budgets</p>
            <span class="kpi-subtitle ${budgets.overBudget > 0 ? 'warning' : 'success'}">
              ${budgets.overBudget > 0 
                ? `${budgets.overBudget} over budget` 
                : 'All within budget'}
            </span>
          </div>
        </div>

        <!-- Top Category -->
        <div class="kpi-card">
          <div class="kpi-icon category">
            <i class="fas fa-tags"></i>
          </div>
          <div class="kpi-content">
            <h3>Top Category</h3>
            <p class="kpi-value">${expenses.topCategories[0]?.category || 'N/A'}</p>
            <span class="kpi-subtitle">
              ₹${this.formatNumber(expenses.topCategories[0]?.amount || 0)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render trend charts
   */
  renderTrends(trends) {
    const container = document.getElementById('trend-charts');
    if (!container) return;

    // Create chart for each category
    const topCategories = Object.keys(trends.trends).slice(0, 5);
    
    container.innerHTML = `
      <div class="chart-container">
        <h3>Spending Trends (Last 6 Months)</h3>
        <canvas id="trends-chart"></canvas>
      </div>
    `;

    // Render chart using Chart.js (if available)
    this.renderTrendsChart(trends, topCategories);
  }

  /**
   * Render spending patterns
   */
  renderPatterns(patterns) {
    const container = document.getElementById('spending-patterns');
    if (!container) return;

    container.innerHTML = `
      <div class="patterns-grid">
        <!-- By Day of Week -->
        <div class="pattern-card">
          <h3>Spending by Day</h3>
          <div class="pattern-chart">
            ${this.renderBarChart(patterns.byDayOfWeek)}
          </div>
        </div>

        <!-- By Time of Day -->
        <div class="pattern-card">
          <h3>Spending by Time</h3>
          <div class="pattern-chart">
            ${this.renderBarChart(patterns.byTimeOfDay)}
          </div>
        </div>

        <!-- Recurring Expenses -->
        <div class="pattern-card">
          <h3>Recurring Expenses</h3>
          <div class="recurring-list">
            ${patterns.recurringExpenses.length > 0 
              ? patterns.recurringExpenses.map(r => `
                <div class="recurring-item">
                  <span class="category">${r.category}</span>
                  <span class="amount">₹${this.formatNumber(r.amount)}</span>
                  <span class="frequency">Every ${Math.round(r.averageInterval)} days</span>
                </div>
              `).join('')
              : '<p class="empty-state">No recurring expenses detected</p>'
            }
          </div>
        </div>

        <!-- Largest Expenses -->
        <div class="pattern-card">
          <h3>Largest Expenses</h3>
          <div class="large-expenses-list">
            ${patterns.largestExpenses.slice(0, 5).map(e => `
              <div class="expense-item">
                <span class="description">${e.description || 'No description'}</span>
                <span class="amount">₹${this.formatNumber(e.amount)}</span>
                <span class="category">${e.category}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render user statistics
   */
  renderUserStats(stats) {
    const container = document.getElementById('user-stats');
    if (!container) return;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Total Sessions</h4>
          <p class="stat-value">${stats.totalSessions || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Total Events</h4>
          <p class="stat-value">${stats.totalEvents || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Avg Session Duration</h4>
          <p class="stat-value">${this.formatDuration(stats.avgSessionDuration || 0)}</p>
        </div>
        <div class="stat-card">
          <h4>Most Used Feature</h4>
          <p class="stat-value">${stats.mostUsedFeature || 'N/A'}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render simple bar chart (CSS-based)
   */
  renderBarChart(data) {
    const max = Math.max(...Object.values(data));
    
    return Object.entries(data).map(([label, value]) => {
      const percentage = max > 0 ? (value / max) * 100 : 0;
      return `
        <div class="bar-item">
          <span class="bar-label">${label}</span>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="bar-value">₹${this.formatNumber(value)}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Period selector
    const periodSelector = document.getElementById('period-selector');
    if (periodSelector) {
      periodSelector.addEventListener('change', (e) => {
        this.changePeriod(e.target.value);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-analytics');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadDashboardData();
      });
    }

    // Export button
    const exportBtn = document.getElementById('export-analytics');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportData();
      });
    }
  }

  /**
   * Change time period
   */
  async changePeriod(period) {
    const kpis = await dataAggregationService.getDashboardKPIs(this.userId, period);
    this.renderKPIs(kpis);
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    // Refresh every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Export analytics data
   */
  async exportData() {
    try {
      const [kpis, trends, patterns] = await Promise.all([
        dataAggregationService.getDashboardKPIs(this.userId, 'year'),
        dataAggregationService.getCategoryTrends(this.userId, 12),
        dataAggregationService.getSpendingPatterns(this.userId)
      ]);

      const exportData = {
        kpis,
        trends,
        patterns,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rupiya-analytics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export analytics:', error);
      alert('Failed to export analytics data');
    }
  }

  /**
   * Helper: Format number
   */
  formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(Math.round(num));
  }

  /**
   * Helper: Format duration
   */
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  /**
   * Show loading state
   */
  showLoading() {
    const container = document.getElementById('analytics-content');
    if (container) {
      container.classList.add('loading');
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const container = document.getElementById('analytics-content');
    if (container) {
      container.classList.remove('loading');
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const container = document.getElementById('analytics-content');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>${message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoRefresh();
    
    // Destroy charts
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });
    
    this.charts = {};
  }
}

// Create singleton instance
const analyticsDashboard = new AnalyticsDashboard();

export default analyticsDashboard;
