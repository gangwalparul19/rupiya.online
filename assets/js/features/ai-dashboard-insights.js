// AI-Powered Dashboard Insights
// Provides spending analysis, savings opportunities, and financial insights

import geminiAI from '../services/gemini-ai-service.js';
import toast from '../components/toast.js';
import logger from '../utils/logger.js';

const log = logger.create('AIDashboardInsights');

class AIDashboardInsights {
  constructor() {
    this.isAvailable = false;
    this.insightsWidget = null;
    this.savingsWidget = null;
  }

  /**
   * Initialize AI dashboard features
   */
  async init() {
    try {
      await geminiAI.checkAvailability();
      this.isAvailable = geminiAI.isAvailable;
      
      if (this.isAvailable) {
        this.addInsightsWidget();
        this.addSavingsWidget();
        this.addStyles();
        log.log('AI dashboard insights initialized');
      }
    } catch (error) {
      log.error('Failed to initialize AI dashboard features:', error);
    }
  }

  /**
   * Add AI insights widget to dashboard
   */
  addInsightsWidget() {
    // Find a good place to add the widget (after KPI cards)
    const kpiSection = document.querySelector('.kpi-cards') || 
                       document.querySelector('.dashboard-grid') ||
                       document.querySelector('.main-content');
    
    if (!kpiSection) return;

    // Check if widget already exists
    if (document.getElementById('aiInsightsWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'aiInsightsWidget';
    widget.className = 'ai-insights-widget';
    widget.innerHTML = `
      <div class="ai-widget-header">
        <h3>✨ AI Spending Insights</h3>
        <button class="btn-refresh-insights" id="refreshInsightsBtn" title="Refresh insights">
          🔄
        </button>
      </div>
      <div class="ai-widget-content" id="aiInsightsContent">
        <div class="ai-widget-loading">
          <div class="spinner"></div>
          <p>Loading AI insights...</p>
        </div>
      </div>
    `;

    // Insert after KPI section
    kpiSection.parentElement.insertBefore(widget, kpiSection.nextSibling);

    // Add event listener
    document.getElementById('refreshInsightsBtn').addEventListener('click', () => {
      this.loadInsights();
    });

    // Auto-load insights
    this.loadInsights();
  }

  /**
   * Add savings opportunities widget
   */
  addSavingsWidget() {
    const insightsWidget = document.getElementById('aiInsightsWidget');
    if (!insightsWidget) return;

    // Check if widget already exists
    if (document.getElementById('aiSavingsWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'aiSavingsWidget';
    widget.className = 'ai-savings-widget';
    widget.innerHTML = `
      <div class="ai-widget-header">
        <h3>💰 Savings Opportunities</h3>
        <button class="btn-refresh-savings" id="refreshSavingsBtn" title="Refresh opportunities">
          🔄
        </button>
      </div>
      <div class="ai-widget-content" id="aiSavingsContent">
        <div class="ai-widget-loading">
          <div class="spinner"></div>
          <p>Finding savings opportunities...</p>
        </div>
      </div>
    `;

    // Insert after insights widget
    insightsWidget.parentElement.insertBefore(widget, insightsWidget.nextSibling);

    // Add event listener
    document.getElementById('refreshSavingsBtn').addEventListener('click', () => {
      this.loadSavingsOpportunities();
    });

    // Auto-load savings opportunities
    this.loadSavingsOpportunities();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('ai-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-dashboard-styles';
    style.textContent = `
      .ai-insights-widget,
      .ai-savings-widget {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #f0f0f0;
      }

      .ai-widget-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .btn-refresh-insights,
      .btn-refresh-savings {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .btn-refresh-insights:hover,
      .btn-refresh-savings:hover {
        background: #f0f0f0;
        transform: rotate(180deg);
      }

      .ai-widget-content {
        min-height: 100px;
      }

      .ai-widget-loading {
        text-align: center;
        padding: 40px 20px;
        color: #667eea;
      }

      .ai-widget-loading .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .insight-card {
        background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
        border-left: 4px solid #667eea;
        border-radius: 8px;
        padding: 16px;
        margin: 12px 0;
        transition: all 0.2s ease;
      }

      .insight-card:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }

      .insight-card h4 {
        margin: 0 0 8px 0;
        font-size: 15px;
        font-weight: 600;
        color: #667eea;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .insight-card p {
        margin: 0;
        font-size: 14px;
        color: #555;
        line-height: 1.6;
      }

      .insight-trend {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 8px;
      }

      .trend-up {
        background: #ffebee;
        color: #c62828;
      }

      .trend-down {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .trend-neutral {
        background: #fff3e0;
        color: #e65100;
      }

      .savings-opportunity {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border-left: 4px solid #4caf50;
        border-radius: 8px;
        padding: 16px;
        margin: 12px 0;
        transition: all 0.2s ease;
      }

      .savings-opportunity:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
      }

      .savings-opportunity h4 {
        margin: 0 0 8px 0;
        font-size: 15px;
        font-weight: 600;
        color: #2e7d32;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .savings-opportunity p {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #555;
        line-height: 1.6;
      }

      .savings-amount {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: #4caf50;
        color: white;
        border-radius: 16px;
        font-size: 13px;
        font-weight: 600;
      }

      .difficulty-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        margin-left: 8px;
      }

      .difficulty-easy {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .difficulty-medium {
        background: #fff3e0;
        color: #e65100;
      }

      .difficulty-hard {
        background: #ffebee;
        color: #c62828;
      }

      .ai-widget-error {
        text-align: center;
        padding: 40px 20px;
        color: #999;
      }

      .ai-widget-error p {
        margin: 8px 0;
        font-size: 14px;
      }

      .ai-widget-empty {
        text-align: center;
        padding: 40px 20px;
        color: #999;
      }

      .ai-widget-empty p {
        margin: 8px 0;
        font-size: 14px;
      }

      @media (max-width: 768px) {
        .ai-insights-widget,
        .ai-savings-widget {
          padding: 16px;
          margin: 16px 0;
        }

        .ai-widget-header h3 {
          font-size: 16px;
        }

        .insight-card,
        .savings-opportunity {
          padding: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Load AI insights
   */
  async loadInsights() {
    const content = document.getElementById('aiInsightsContent');
    if (!content) return;

    const btn = document.getElementById('refreshInsightsBtn');
    if (btn) btn.disabled = true;

    content.innerHTML = `
      <div class="ai-widget-loading">
        <div class="spinner"></div>
        <p>AI is analyzing your spending patterns...</p>
      </div>
    `;

    try {
      // Gather expense data
      const expenseData = await this.gatherExpenseData();

      if (!expenseData.expenses || expenseData.expenses.length === 0) {
        content.innerHTML = `
          <div class="ai-widget-empty">
            <p>📊 No expense data available yet.</p>
            <p style="font-size: 13px; color: #999;">Add some expenses to get AI insights!</p>
          </div>
        `;
        return;
      }

      // Get AI insights
      const insights = await geminiAI.analyzeSpending(
        expenseData.expenses,
        expenseData.categories,
        expenseData.previousPeriod
      );

      // Display insights
      this.displayInsights(insights, expenseData, content);

      toast.show('Insights updated!', 'success');
    } catch (error) {
      log.error('Failed to load insights:', error);
      content.innerHTML = `
        <div class="ai-widget-error">
          <p>❌ Unable to load insights</p>
          <p style="font-size: 13px;">${error.message}</p>
        </div>
      `;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Load savings opportunities
   */
  async loadSavingsOpportunities() {
    const content = document.getElementById('aiSavingsContent');
    if (!content) return;

    const btn = document.getElementById('refreshSavingsBtn');
    if (btn) btn.disabled = true;

    content.innerHTML = `
      <div class="ai-widget-loading">
        <div class="spinner"></div>
        <p>Finding ways to save money...</p>
      </div>
    `;

    try {
      // Gather expense data
      const expenseData = await this.gatherExpenseData();

      if (!expenseData.expenses || expenseData.expenses.length === 0) {
        content.innerHTML = `
          <div class="ai-widget-empty">
            <p>💰 No expense data available yet.</p>
            <p style="font-size: 13px; color: #999;">Add some expenses to get savings tips!</p>
          </div>
        `;
        return;
      }

      // Get savings opportunities
      const opportunities = await geminiAI.findSavingsOpportunities(
        expenseData.expenses,
        expenseData.categories
      );

      // Display opportunities
      this.displaySavingsOpportunities(opportunities, content);

      toast.show('Savings opportunities updated!', 'success');
    } catch (error) {
      log.error('Failed to load savings opportunities:', error);
      content.innerHTML = `
        <div class="ai-widget-error">
          <p>❌ Unable to find savings opportunities</p>
          <p style="font-size: 13px;">${error.message}</p>
        </div>
      `;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Gather expense data
   */
  async gatherExpenseData() {
    const data = {
      expenses: [],
      categories: {},
      previousPeriod: [],
      totalThisMonth: 0,
      totalLastMonth: 0
    };

    // Try to get from global state
    if (window.dashboardState && window.dashboardState.expenses) {
      data.expenses = window.dashboardState.expenses;
    } else if (window.expensesState && window.expensesState.expenses) {
      data.expenses = window.expensesState.expenses;
    }

    // Group by category
    data.expenses.forEach(expense => {
      const category = expense.category || 'Other';
      if (!data.categories[category]) {
        data.categories[category] = [];
      }
      data.categories[category].push(expense);
    });

    // Get previous period (if available)
    if (window.dashboardState && window.dashboardState.previousExpenses) {
      data.previousPeriod = window.dashboardState.previousExpenses;
    }

    // Calculate totals
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    data.expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const expenseMonth = expenseDate.getMonth();
      const expenseYear = expenseDate.getFullYear();

      if (expenseMonth === thisMonth && expenseYear === thisYear) {
        data.totalThisMonth += expense.amount || 0;
      } else if (expenseMonth === thisMonth - 1 && expenseYear === thisYear) {
        data.totalLastMonth += expense.amount || 0;
      }
    });

    return data;
  }

  /**
   * Display insights
   */
  displayInsights(insights, expenseData, container) {
    // Parse insights if it's a string
    let insightsHTML = '';

    if (typeof insights === 'string') {
      // Convert text insights to HTML
      const lines = insights.split('\n').filter(line => line.trim());
      
      lines.forEach((line, index) => {
        if (line.match(/^\d+\.|^-|^•/)) {
          // This is an insight point
          const text = line.replace(/^\d+\.|^-|^•/, '').trim();
          insightsHTML += `
            <div class="insight-card">
              <h4>💡 Insight ${index + 1}</h4>
              <p>${text}</p>
            </div>
          `;
        }
      });
    }

    // Add spending trend
    const trend = this.calculateTrend(expenseData.totalThisMonth, expenseData.totalLastMonth);
    const trendHTML = `
      <div class="insight-card">
        <h4>📊 Monthly Trend</h4>
        <p>This month: ₹${this.formatAmount(expenseData.totalThisMonth)}</p>
        <p>Last month: ₹${this.formatAmount(expenseData.totalLastMonth)}</p>
        <span class="insight-trend ${trend.class}">${trend.icon} ${trend.text}</span>
      </div>
    `;

    // Add top categories
    const topCategories = Object.entries(expenseData.categories)
      .map(([category, expenses]) => ({
        category,
        total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        count: expenses.length
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    const categoriesHTML = topCategories.length > 0 ? `
      <div class="insight-card">
        <h4>🏆 Top Spending Categories</h4>
        ${topCategories.map(cat => `
          <p style="margin: 4px 0;">
            <strong>${cat.category}:</strong> ₹${this.formatAmount(cat.total)} 
            <span style="color: #999; font-size: 12px;">(${cat.count} transactions)</span>
          </p>
        `).join('')}
      </div>
    ` : '';

    container.innerHTML = trendHTML + categoriesHTML + (insightsHTML || `
      <div class="insight-card">
        <h4>💡 AI Analysis</h4>
        <p>${insights}</p>
      </div>
    `);
  }

  /**
   * Display savings opportunities
   */
  displaySavingsOpportunities(opportunities, container) {
    if (!opportunities || opportunities.length === 0) {
      container.innerHTML = `
        <div class="ai-widget-empty">
          <p>🎉 Great job! No major savings opportunities found.</p>
          <p style="font-size: 13px; color: #999;">Your spending looks optimized!</p>
        </div>
      `;
      return;
    }

    const opportunitiesHTML = opportunities.map(opp => `
      <div class="savings-opportunity">
        <h4>💰 ${opp.category || 'Savings Opportunity'}</h4>
        <p>${opp.opportunity || opp.suggestion || opp.description}</p>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
          <span class="savings-amount">
            Save ₹${this.formatAmount(opp.potentialSavings || opp.amount || 0)}/month
          </span>
          <span class="difficulty-badge difficulty-${opp.difficulty || 'medium'}">
            ${this.getDifficultyIcon(opp.difficulty)} ${opp.difficulty || 'medium'}
          </span>
        </div>
      </div>
    `).join('');

    container.innerHTML = opportunitiesHTML;
  }

  /**
   * Calculate spending trend
   */
  calculateTrend(thisMonth, lastMonth) {
    if (lastMonth === 0) {
      return { class: 'trend-neutral', icon: '➡️', text: 'No previous data' };
    }

    const change = ((thisMonth - lastMonth) / lastMonth) * 100;

    if (change > 10) {
      return { class: 'trend-up', icon: '📈', text: `${change.toFixed(1)}% increase` };
    } else if (change < -10) {
      return { class: 'trend-down', icon: '📉', text: `${Math.abs(change).toFixed(1)}% decrease` };
    } else {
      return { class: 'trend-neutral', icon: '➡️', text: 'Stable spending' };
    }
  }

  /**
   * Get difficulty icon
   */
  getDifficultyIcon(difficulty) {
    const icons = {
      easy: '✅',
      medium: '⚡',
      hard: '💪'
    };
    return icons[difficulty] || '⚡';
  }

  /**
   * Format amount
   */
  formatAmount(amount) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// Export singleton
export default new AIDashboardInsights();
