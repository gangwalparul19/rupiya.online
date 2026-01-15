// AI-Powered Budget Recommendations
// Analyzes spending patterns and suggests optimal budget allocations

import geminiAI from '../services/gemini-ai-service.js';
import toast from '../components/toast.js';
import logger from '../utils/logger.js';

const log = logger.create('AIBudgetRecommendations');

class AIBudgetRecommendations {
  constructor() {
    this.isAvailable = false;
    this.recommendationsBox = null;
  }

  /**
   * Initialize AI budget features
   */
  async init() {
    try {
      await geminiAI.checkAvailability();
      this.isAvailable = geminiAI.isAvailable;
      
      if (this.isAvailable) {
        this.addRecommendationsButton();
        log.log('AI budget recommendations initialized');
      }
    } catch (error) {
      log.error('Failed to initialize AI budget features:', error);
    }
  }

  /**
   * Add recommendations button to the page
   */
  addRecommendationsButton() {
    const header = document.querySelector('.page-header') || document.querySelector('h1');
    if (!header) return;

    if (document.getElementById('aiBudgetRecommendationsBtn')) return;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ai-budget-container';
    buttonContainer.innerHTML = `
      <button type="button" id="aiBudgetRecommendationsBtn" class="btn-ai-budget">
        ✨ Get AI Budget Recommendations
      </button>
      <div id="aiBudgetRecommendationsBox" style="display: none;"></div>
    `;

    header.parentElement.insertBefore(buttonContainer, header.nextSibling);

    document.getElementById('aiBudgetRecommendationsBtn').addEventListener('click', () => {
      this.generateRecommendations();
    });

    this.addStyles();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('ai-budget-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-budget-styles';
    style.textContent = `
      .ai-budget-container {
        margin: 20px 0;
      }

      .btn-ai-budget {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .btn-ai-budget:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
      }

      .btn-ai-budget:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .ai-budget-box {
        background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
        border: 2px solid #667eea;
        border-radius: 12px;
        padding: 20px;
        margin: 16px 0;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-budget-box h3 {
        margin: 0 0 16px 0;
        color: #667eea;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .budget-recommendation-card {
        background: white;
        border-radius: 10px;
        padding: 16px;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }

      .budget-recommendation-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .budget-rec-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .budget-rec-category {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .budget-rec-icon {
        font-size: 20px;
      }

      .budget-rec-amounts {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin: 12px 0;
      }

      .budget-amount-item {
        text-align: center;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
      }

      .budget-amount-label {
        font-size: 11px;
        color: #888;
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .budget-amount-value {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .budget-amount-value.current {
        color: #2196f3;
      }

      .budget-amount-value.recommended {
        color: #4caf50;
      }

      .budget-amount-value.difference {
        color: #ff9800;
      }

      .budget-rec-reasoning {
        font-size: 13px;
        color: #666;
        line-height: 1.6;
        margin: 12px 0;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
        border-left: 3px solid #667eea;
      }

      .budget-rec-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .btn-apply-budget {
        flex: 1;
        background: #4caf50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-apply-budget:hover {
        background: #45a049;
        transform: translateY(-1px);
      }

      .btn-dismiss-budget {
        background: #f5f5f5;
        color: #666;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-dismiss-budget:hover {
        background: #e0e0e0;
      }

      .budget-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }

      .status-over {
        background: #ffebee;
        color: #c62828;
      }

      .status-under {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status-good {
        background: #e3f2fd;
        color: #1976d2;
      }

      .ai-budget-loading {
        text-align: center;
        padding: 40px 20px;
        color: #667eea;
      }

      .ai-budget-loading .spinner {
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

      .budget-summary {
        background: white;
        border-radius: 10px;
        padding: 16px;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .budget-summary h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #333;
      }

      .budget-summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .budget-summary-item {
        padding: 12px;
        background: #f8f9fa;
        border-radius: 6px;
      }

      .budget-summary-label {
        font-size: 12px;
        color: #888;
        margin-bottom: 4px;
      }

      .budget-summary-value {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      @media (max-width: 768px) {
        .budget-rec-amounts {
          grid-template-columns: 1fr;
        }

        .budget-summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Generate budget recommendations
   */
  async generateRecommendations() {
    const btn = document.getElementById('aiBudgetRecommendationsBtn');
    const box = document.getElementById('aiBudgetRecommendationsBox');

    if (!btn || !box) return;

    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing your spending...';
    box.style.display = 'block';
    box.innerHTML = `
      <div class="ai-budget-loading">
        <div class="spinner"></div>
        <p>AI is analyzing your spending patterns to suggest optimal budgets...</p>
      </div>
    `;

    try {
      // Gather budget data
      const budgetData = await this.gatherBudgetData();

      if (!budgetData.expenses || budgetData.expenses.length === 0) {
        box.innerHTML = `
          <div class="ai-budget-box">
            <h3>📊 Budget Analysis</h3>
            <p style="color: #666;">No expense data available. Add some expenses to get budget recommendations.</p>
          </div>
        `;
        return;
      }

      // Get AI recommendations
      const recommendations = await geminiAI.analyzeBudget(budgetData);

      // Display recommendations
      this.displayRecommendations(recommendations, budgetData, box);

      toast.show('Budget recommendations ready!', 'success');
    } catch (error) {
      log.error('Failed to generate recommendations:', error);
      box.innerHTML = `
        <div class="ai-budget-box">
          <h3>❌ Unable to Generate Recommendations</h3>
          <p style="color: #666;">Sorry, we couldn't generate recommendations at this time.</p>
          <p style="color: #999; font-size: 13px; margin-top: 8px;">${error.message}</p>
        </div>
      `;
      toast.show('Failed to generate recommendations', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Get AI Budget Recommendations';
    }
  }

  /**
   * Gather budget data
   */
  async gatherBudgetData() {
    const data = {
      expenses: [],
      categories: {},
      existingBudgets: [],
      monthlyIncome: 0,
      averageMonthlySpending: 0
    };

    // Get expenses from multiple possible sources
    if (window.budgetsState && window.budgetsState.expenses) {
      data.expenses = window.budgetsState.expenses;
    } else if (window.expensesState && window.expensesState.expenses) {
      data.expenses = window.expensesState.expenses;
    } else if (window.dashboardState && window.dashboardState.expenses) {
      data.expenses = window.dashboardState.expenses;
    }

    // Group by category and calculate averages
    const categoryTotals = {};
    const monthlyTotals = {};

    data.expenses.forEach(expense => {
      const category = expense.category || 'Other';
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      // Category totals
      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, count: 0 };
      }
      categoryTotals[category].total += expense.amount || 0;
      categoryTotals[category].count++;

      // Monthly totals
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = 0;
      }
      monthlyTotals[monthKey] += expense.amount || 0;
    });

    // Calculate averages
    const months = Object.keys(monthlyTotals).length || 1;
    Object.entries(categoryTotals).forEach(([category, totals]) => {
      data.categories[category] = {
        averageMonthly: totals.total / months,
        totalSpent: totals.total,
        transactionCount: totals.count
      };
    });

    data.averageMonthlySpending = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0) / months;

    // Get existing budgets
    if (window.budgetsState && window.budgetsState.budgets) {
      data.existingBudgets = window.budgetsState.budgets.map(b => ({
        category: b.category,
        amount: b.amount,
        spent: b.spent || 0
      }));
    }

    return data;
  }

  /**
   * Display recommendations
   */
  displayRecommendations(recommendations, budgetData, box) {
    // Parse recommendations
    const budgetSuggestions = this.parseRecommendations(recommendations, budgetData);

    // Create summary
    const totalRecommended = budgetSuggestions.reduce((sum, b) => sum + b.recommended, 0);
    const totalCurrent = budgetSuggestions.reduce((sum, b) => sum + b.current, 0);

    const summaryHTML = `
      <div class="budget-summary">
        <h4>📊 Budget Overview</h4>
        <div class="budget-summary-grid">
          <div class="budget-summary-item">
            <div class="budget-summary-label">Current Total Budget</div>
            <div class="budget-summary-value">₹${this.formatAmount(totalCurrent)}</div>
          </div>
          <div class="budget-summary-item">
            <div class="budget-summary-label">Recommended Total</div>
            <div class="budget-summary-value" style="color: #4caf50;">₹${this.formatAmount(totalRecommended)}</div>
          </div>
          <div class="budget-summary-item">
            <div class="budget-summary-label">Average Monthly Spending</div>
            <div class="budget-summary-value">₹${this.formatAmount(budgetData.averageMonthlySpending)}</div>
          </div>
          <div class="budget-summary-item">
            <div class="budget-summary-label">Potential Savings</div>
            <div class="budget-summary-value" style="color: #2196f3;">₹${this.formatAmount(Math.max(0, totalCurrent - totalRecommended))}</div>
          </div>
        </div>
      </div>
    `;

    // Create recommendation cards
    const cardsHTML = budgetSuggestions.map((budget, index) => `
      <div class="budget-recommendation-card" data-budget-index="${index}">
        <div class="budget-rec-header">
          <div class="budget-rec-category">
            <span class="budget-rec-icon">${this.getCategoryIcon(budget.category)}</span>
            ${budget.category}
          </div>
          <span class="budget-status-badge ${budget.status}">${budget.statusText}</span>
        </div>
        <div class="budget-rec-amounts">
          <div class="budget-amount-item">
            <div class="budget-amount-label">Current</div>
            <div class="budget-amount-value current">₹${this.formatAmount(budget.current)}</div>
          </div>
          <div class="budget-amount-item">
            <div class="budget-amount-label">Recommended</div>
            <div class="budget-amount-value recommended">₹${this.formatAmount(budget.recommended)}</div>
          </div>
          <div class="budget-amount-item">
            <div class="budget-amount-label">Difference</div>
            <div class="budget-amount-value difference">${budget.difference > 0 ? '+' : ''}₹${this.formatAmount(budget.difference)}</div>
          </div>
        </div>
        <div class="budget-rec-reasoning">${budget.reasoning}</div>
        <div class="budget-rec-actions">
          <button class="btn-apply-budget" onclick="window.aiBudgetRecs.applyBudget(${index})">
            ✓ Apply This Budget
          </button>
          <button class="btn-dismiss-budget" onclick="window.aiBudgetRecs.dismissBudget(${index})">
            Dismiss
          </button>
        </div>
      </div>
    `).join('');

    box.innerHTML = `
      <div class="ai-budget-box">
        <h3>✨ AI Budget Recommendations</h3>
        ${summaryHTML}
        ${cardsHTML}
      </div>
    `;

    // Store recommendations
    this.currentRecommendations = budgetSuggestions;
    window.aiBudgetRecs = this;
  }

  /**
   * Parse recommendations from AI response
   */
  parseRecommendations(recommendations, budgetData) {
    const suggestions = [];

    // Get top spending categories
    Object.entries(budgetData.categories).forEach(([category, data]) => {
      const current = budgetData.existingBudgets.find(b => b.category === category)?.amount || 0;
      const recommended = Math.round(data.averageMonthly * 1.1); // 10% buffer
      const difference = recommended - current;

      let status = 'status-good';
      let statusText = 'On Track';

      if (data.totalSpent > current && current > 0) {
        status = 'status-over';
        statusText = 'Over Budget';
      } else if (current === 0) {
        status = 'status-under';
        statusText = 'No Budget Set';
      }

      suggestions.push({
        category,
        current,
        recommended,
        difference,
        status,
        statusText,
        reasoning: `Based on your average monthly spending of ₹${this.formatAmount(data.averageMonthly)} in ${category}, we recommend a budget of ₹${this.formatAmount(recommended)} (with 10% buffer).`
      });
    });

    return suggestions.sort((a, b) => b.recommended - a.recommended).slice(0, 5);
  }

  /**
   * Apply budget recommendation
   */
  applyBudget(index) {
    if (!this.currentRecommendations || !this.currentRecommendations[index]) return;

    const budget = this.currentRecommendations[index];

    // Try to fill budget form if it exists
    const categoryInput = document.getElementById('budgetCategory') || document.getElementById('category');
    const amountInput = document.getElementById('budgetAmount') || document.getElementById('amount');

    if (categoryInput) categoryInput.value = budget.category;
    if (amountInput) amountInput.value = budget.recommended;

    // Show the form
    const addBtn = document.getElementById('addBudgetBtn');
    if (addBtn) addBtn.click();

    toast.show('Budget details filled! Review and save.', 'success');
  }

  /**
   * Dismiss budget recommendation
   */
  dismissBudget(index) {
    const card = document.querySelector(`[data-budget-index="${index}"]`);
    if (card) {
      card.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => card.remove(), 300);
    }
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category) {
    const icons = {
      'Groceries': '🛒',
      'Transportation': '🚗',
      'Utilities': '💡',
      'Entertainment': '🎬',
      'Healthcare': '🏥',
      'Shopping': '🛍️',
      'Dining': '🍽️',
      'Education': '📚',
      'Food & Dining': '🍽️',
      'Bills & Utilities': '💡'
    };
    return icons[category] || '📦';
  }

  /**
   * Format amount
   */
  formatAmount(amount) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// Export singleton
export default new AIBudgetRecommendations();
