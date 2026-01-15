// AI-Powered Expense Categorization Feature
// Adds auto-categorization and duplicate detection to expenses

import geminiAI from '../services/gemini-ai-service.js';
import toast from '../components/toast.js';
import logger from '../utils/logger.js';

const log = logger.create('AIExpenseCategorization');

class AIExpenseCategorization {
  constructor() {
    this.isAvailable = false;
    this.suggestionBox = null;
    this.currentSuggestion = null;
  }

  /**
   * Initialize AI features
   */
  async init() {
    try {
      await geminiAI.checkAvailability();
      this.isAvailable = geminiAI.isAvailable;
      
      if (this.isAvailable) {
        this.addAIButton();
        this.addDuplicateDetection();
        log.log('AI expense features initialized');
      } else {
        log.log('AI features not available - user needs to set up API key');
      }
    } catch (error) {
      log.error('Failed to initialize AI features:', error);
    }
  }

  /**
   * Add AI categorization button to the form
   */
  addAIButton() {
    const categoryGroup = document.querySelector('#category')?.parentElement;
    if (!categoryGroup) return;

    // Check if button already exists
    if (document.getElementById('aiCategorizeBtn')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'aiCategorizeBtn';
    button.className = 'btn-ai-suggest';
    button.innerHTML = '✨ Auto-Categorize';
    button.title = 'Use AI to suggest a category';
    
    button.addEventListener('click', () => this.handleCategorization());
    
    categoryGroup.appendChild(button);
    this.addStyles();
  }

  /**
   * Add CSS styles for AI features
   */
  addStyles() {
    if (document.getElementById('ai-expense-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-expense-styles';
    style.textContent = `
      .btn-ai-suggest {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
        margin-top: 8px;
        width: 100%;
        justify-content: center;
      }

      .btn-ai-suggest:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      .btn-ai-suggest:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .ai-suggestion-box {
        background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
        border: 2px solid #667eea;
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
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

      .ai-suggestion-box h4 {
        margin: 0 0 12px 0;
        color: #667eea;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .ai-suggestion-content {
        background: white;
        border-radius: 8px;
        padding: 12px;
        margin: 8px 0;
      }

      .category-suggestion {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .confidence-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 600;
      }

      .confidence-high {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .confidence-medium {
        background: #fff3e0;
        color: #e65100;
      }

      .confidence-low {
        background: #ffebee;
        color: #c62828;
      }

      .ai-reasoning {
        font-size: 13px;
        color: #555;
        margin: 8px 0 0 0;
        line-height: 1.5;
        font-style: italic;
      }

      .ai-suggestion-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .ai-suggestion-actions button {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
        font-size: 14px;
      }

      .btn-accept {
        background: #4caf50;
        color: white;
      }

      .btn-accept:hover {
        background: #45a049;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
      }

      .btn-reject {
        background: #f44336;
        color: white;
      }

      .btn-reject:hover {
        background: #da190b;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
      }

      .duplicate-warning {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border: 2px solid #ff9800;
        border-radius: 12px;
        padding: 16px;
        margin: 12px 0;
        animation: slideDown 0.3s ease;
      }

      .duplicate-warning h4 {
        margin: 0 0 8px 0;
        color: #e65100;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .duplicate-details {
        background: white;
        border-radius: 8px;
        padding: 12px;
        margin: 8px 0;
        font-size: 13px;
        color: #555;
      }

      .duplicate-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .duplicate-actions button {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s ease;
        font-size: 14px;
      }

      .btn-continue {
        background: #2196f3;
        color: white;
      }

      .btn-continue:hover {
        background: #1976d2;
      }

      .btn-cancel-add {
        background: #9e9e9e;
        color: white;
      }

      .btn-cancel-add:hover {
        background: #757575;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Handle AI categorization
   */
  async handleCategorization() {
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const categorySelect = document.getElementById('category');
    const aiBtn = document.getElementById('aiCategorizeBtn');

    if (!descriptionInput || !amountInput || !categorySelect || !aiBtn) {
      log.error('Required form elements not found');
      return;
    }

    // Validate inputs
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!description) {
      toast.show('Please enter a description first', 'warning');
      descriptionInput.focus();
      return;
    }

    if (!amount || amount <= 0) {
      toast.show('Please enter a valid amount first', 'warning');
      amountInput.focus();
      return;
    }

    // Get user's categories
    const userCategories = Array.from(categorySelect.options)
      .map(opt => opt.value)
      .filter(val => val !== '');

    // Get recent expenses for context
    const recentExpenses = this.getRecentExpenses();

    // Show loading state
    aiBtn.disabled = true;
    aiBtn.innerHTML = '⏳ Analyzing...';

    try {
      const suggestion = await geminiAI.categorizeExpense(
        description,
        amount,
        userCategories,
        recentExpenses
      );

      this.showSuggestion(suggestion, categorySelect);
      toast.show('AI suggestion ready!', 'success');
    } catch (error) {
      log.error('AI categorization failed:', error);
      toast.show('AI categorization failed: ' + error.message, 'error');
    } finally {
      aiBtn.disabled = false;
      aiBtn.innerHTML = '✨ Auto-Categorize';
    }
  }

  /**
   * Show AI suggestion
   */
  showSuggestion(suggestion, categorySelect) {
    // Remove existing suggestion
    this.removeSuggestion();

    this.currentSuggestion = suggestion;

    // Create suggestion box
    const box = document.createElement('div');
    box.className = 'ai-suggestion-box';
    box.id = 'aiSuggestionBox';

    const confidenceClass = 
      suggestion.confidence >= 80 ? 'confidence-high' :
      suggestion.confidence >= 60 ? 'confidence-medium' : 'confidence-low';

    box.innerHTML = `
      <h4>✨ AI Suggestion</h4>
      <div class="ai-suggestion-content">
        <div class="category-suggestion">
          ${this.getCategoryIcon(suggestion.category)} ${suggestion.category}
          <span class="confidence-badge ${confidenceClass}">
            ${suggestion.confidence}% confident
          </span>
        </div>
        <div class="ai-reasoning">${suggestion.reasoning}</div>
      </div>
      <div class="ai-suggestion-actions">
        <button class="btn-accept" id="acceptSuggestionBtn">
          ✓ Accept
        </button>
        <button class="btn-reject" id="rejectSuggestionBtn">
          ✗ Reject
        </button>
      </div>
    `;

    // Insert after category group
    categorySelect.parentElement.appendChild(box);

    // Add event listeners
    document.getElementById('acceptSuggestionBtn').addEventListener('click', () => {
      this.acceptSuggestion(categorySelect);
    });

    document.getElementById('rejectSuggestionBtn').addEventListener('click', () => {
      this.removeSuggestion();
    });

    this.suggestionBox = box;
  }

  /**
   * Accept AI suggestion
   */
  acceptSuggestion(categorySelect) {
    if (!this.currentSuggestion) return;

    categorySelect.value = this.currentSuggestion.category;
    
    // Trigger change event
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    
    this.removeSuggestion();
    toast.show('✓ Category applied!', 'success');
  }

  /**
   * Remove suggestion box
   */
  removeSuggestion() {
    if (this.suggestionBox) {
      this.suggestionBox.remove();
      this.suggestionBox = null;
    }
    this.currentSuggestion = null;
  }

  /**
   * Add duplicate detection
   */
  addDuplicateDetection() {
    const form = document.getElementById('expenseForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      if (!this.isAvailable) return;

      const descriptionInput = document.getElementById('description');
      const amountInput = document.getElementById('amount');
      const dateInput = document.getElementById('date');

      if (!descriptionInput || !amountInput || !dateInput) return;

      const newExpense = {
        description: descriptionInput.value.trim(),
        amount: parseFloat(amountInput.value),
        date: dateInput.value
      };

      // Skip if no description
      if (!newExpense.description) return;

      // Get recent expenses
      const recentExpenses = this.getRecentExpenses(7);

      // Check for duplicates
      try {
        const result = await geminiAI.detectDuplicate(newExpense, recentExpenses);

        if (result.isDuplicate && result.confidence >= 70) {
          e.preventDefault();
          this.showDuplicateWarning(result, recentExpenses);
        }
      } catch (error) {
        log.error('Duplicate detection failed:', error);
        // Don't block submission on error
      }
    });
  }

  /**
   * Show duplicate warning
   */
  showDuplicateWarning(result, recentExpenses) {
    // Remove existing warning
    const existing = document.getElementById('duplicateWarning');
    if (existing) existing.remove();

    const matchedExpense = recentExpenses[result.matchedExpenseIndex];
    if (!matchedExpense) return;

    const warning = document.createElement('div');
    warning.className = 'duplicate-warning';
    warning.id = 'duplicateWarning';
    warning.innerHTML = `
      <h4>⚠️ Possible Duplicate Detected</h4>
      <div class="duplicate-details">
        <p><strong>Similar expense found:</strong></p>
        <p>${matchedExpense.description} - ₹${matchedExpense.amount} on ${matchedExpense.date}</p>
        <p style="margin-top: 8px; font-style: italic;">${result.reasoning}</p>
      </div>
      <div class="duplicate-actions">
        <button class="btn-continue" id="continueAnywayBtn">
          Continue Anyway
        </button>
        <button class="btn-cancel-add" id="cancelAddBtn">
          Cancel
        </button>
      </div>
    `;

    const form = document.getElementById('expenseForm');
    form.insertBefore(warning, form.firstChild);

    document.getElementById('continueAnywayBtn').addEventListener('click', () => {
      warning.remove();
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: false }));
    });

    document.getElementById('cancelAddBtn').addEventListener('click', () => {
      warning.remove();
    });
  }

  /**
   * Get recent expenses from the page
   */
  getRecentExpenses(days = 10) {
    // Try to get from global state if available
    if (window.expensesState && window.expensesState.expenses) {
      return window.expensesState.expenses
        .slice(0, days)
        .map(e => ({
          description: e.description || '',
          amount: e.amount || 0,
          category: e.category || '',
          date: e.date || ''
        }));
    }

    // Fallback: parse from DOM
    const expenseCards = document.querySelectorAll('.expense-card');
    const expenses = [];

    expenseCards.forEach((card, index) => {
      if (index >= days) return;

      const description = card.querySelector('.expense-description')?.textContent || '';
      const amountText = card.querySelector('.expense-amount')?.textContent || '0';
      const amount = parseFloat(amountText.replace(/[^0-9.-]+/g, ''));
      const category = card.querySelector('.expense-category')?.textContent || '';
      const date = card.querySelector('.expense-date')?.textContent || '';

      expenses.push({ description, amount, category, date });
    });

    return expenses;
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
   * Clean up when form is closed
   */
  cleanup() {
    this.removeSuggestion();
    const warning = document.getElementById('duplicateWarning');
    if (warning) warning.remove();
  }
}

// Export singleton
export default new AIExpenseCategorization();
