// AI-Powered Goal Recommendations
// Provides intelligent financial goal suggestions based on user's financial data

import geminiAI from '../services/gemini-ai-service.js';
import toast from '../components/toast.js';
import logger from '../utils/logger.js';

const log = logger.create('AIGoalRecommendations');

class AIGoalRecommendations {
  constructor() {
    this.isAvailable = false;
    this.recommendationsBox = null;
  }

  /**
   * Initialize AI goal features
   */
  async init() {
    try {
      await geminiAI.checkAvailability();
      this.isAvailable = geminiAI.isAvailable;
      
      if (this.isAvailable) {
        this.addRecommendationsButton();
        log.log('AI goal recommendations initialized');
      }
    } catch (error) {
      log.error('Failed to initialize AI goal features:', error);
    }
  }

  /**
   * Add recommendations button to the page
   */
  addRecommendationsButton() {
    // Find a good place to add the button (after the header or before the form)
    const header = document.querySelector('.page-header') || document.querySelector('h1');
    if (!header) return;

    // Check if button already exists
    if (document.getElementById('aiGoalRecommendationsBtn')) return;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ai-recommendations-container';
    buttonContainer.innerHTML = `
      <button type="button" id="aiGoalRecommendationsBtn" class="btn-ai-recommendations">
        ✨ Get AI Goal Recommendations
      </button>
      <div id="aiGoalRecommendationsBox" style="display: none;"></div>
    `;

    header.parentElement.insertBefore(buttonContainer, header.nextSibling);

    document.getElementById('aiGoalRecommendationsBtn').addEventListener('click', () => {
      this.generateRecommendations();
    });

    this.addStyles();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('ai-goal-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-goal-styles';
    style.textContent = `
      .ai-recommendations-container {
        margin: 20px 0;
      }

      .btn-ai-recommendations {
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

      .btn-ai-recommendations:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
      }

      .btn-ai-recommendations:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .ai-recommendations-box {
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

      .ai-recommendations-box h3 {
        margin: 0 0 16px 0;
        color: #667eea;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .goal-recommendation-card {
        background: white;
        border-radius: 10px;
        padding: 16px;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }

      .goal-recommendation-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .goal-rec-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .goal-rec-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0;
      }

      .goal-rec-icon {
        font-size: 24px;
      }

      .goal-rec-details {
        font-size: 14px;
        color: #666;
        line-height: 1.6;
        margin: 8px 0;
      }

      .goal-rec-amount {
        font-size: 18px;
        font-weight: 600;
        color: #4caf50;
        margin: 8px 0;
      }

      .goal-rec-timeline {
        font-size: 13px;
        color: #888;
        font-style: italic;
      }

      .goal-rec-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .btn-use-goal {
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

      .btn-use-goal:hover {
        background: #45a049;
        transform: translateY(-1px);
      }

      .btn-dismiss-goal {
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

      .btn-dismiss-goal:hover {
        background: #e0e0e0;
      }

      .ai-recommendations-loading {
        text-align: center;
        padding: 40px 20px;
        color: #667eea;
      }

      .ai-recommendations-loading .spinner {
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
    `;

    document.head.appendChild(style);
  }

  /**
   * Generate AI goal recommendations
   */
  async generateRecommendations() {
    const btn = document.getElementById('aiGoalRecommendationsBtn');
    const box = document.getElementById('aiGoalRecommendationsBox');

    if (!btn || !box) return;

    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing your finances...';
    box.style.display = 'block';
    box.innerHTML = `
      <div class="ai-recommendations-loading">
        <div class="spinner"></div>
        <p>AI is analyzing your financial data to suggest personalized goals...</p>
      </div>
    `;

    try {
      // Gather financial data
      const financialData = await this.gatherFinancialData();

      // Get AI recommendations
      const recommendations = await geminiAI.recommendGoals(financialData);

      // Parse and display recommendations
      this.displayRecommendations(recommendations, box);

      toast.show('AI recommendations ready!', 'success');
    } catch (error) {
      log.error('Failed to generate recommendations:', error);
      box.innerHTML = `
        <div class="ai-recommendations-box">
          <h3>❌ Unable to Generate Recommendations</h3>
          <p style="color: #666;">Sorry, we couldn't generate recommendations at this time. Please try again later.</p>
          <p style="color: #999; font-size: 13px; margin-top: 8px;">${error.message}</p>
        </div>
      `;
      toast.show('Failed to generate recommendations', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Get AI Goal Recommendations';
    }
  }

  /**
   * Gather financial data from the app
   */
  async gatherFinancialData() {
    // Try to get data from global state or localStorage
    const data = {
      monthlyIncome: 0,
      monthlyExpenses: 0,
      currentSavings: 0,
      existingGoals: [],
      expenseCategories: {},
      hasEmergencyFund: false
    };

    // Get income data
    try {
      const incomeData = localStorage.getItem('totalIncome');
      if (incomeData) {
        data.monthlyIncome = parseFloat(incomeData) || 0;
      }
    } catch (e) {
      log.warn('Could not get income data');
    }

    // Get expense data
    try {
      const expenseData = localStorage.getItem('totalExpenses');
      if (expenseData) {
        data.monthlyExpenses = parseFloat(expenseData) || 0;
      }
    } catch (e) {
      log.warn('Could not get expense data');
    }

    // Get existing goals
    try {
      if (window.goalsState && window.goalsState.goals) {
        data.existingGoals = window.goalsState.goals.map(g => ({
          name: g.name,
          target: g.targetAmount,
          current: g.currentAmount,
          deadline: g.deadline
        }));
      }
    } catch (e) {
      log.warn('Could not get goals data');
    }

    return data;
  }

  /**
   * Display recommendations
   */
  displayRecommendations(recommendations, box) {
    // Try to parse if it's a string
    let goals = [];
    
    try {
      if (typeof recommendations === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = recommendations.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          goals = JSON.parse(jsonMatch[0]);
        } else {
          // Parse as text recommendations
          goals = this.parseTextRecommendations(recommendations);
        }
      } else if (Array.isArray(recommendations)) {
        goals = recommendations;
      }
    } catch (e) {
      log.error('Failed to parse recommendations:', e);
      goals = this.parseTextRecommendations(recommendations);
    }

    if (goals.length === 0) {
      box.innerHTML = `
        <div class="ai-recommendations-box">
          <h3>💡 AI Recommendations</h3>
          <div style="color: #666; line-height: 1.6;">${recommendations}</div>
        </div>
      `;
      return;
    }

    const goalsHTML = goals.map((goal, index) => `
      <div class="goal-recommendation-card" data-goal-index="${index}">
        <div class="goal-rec-header">
          <h4 class="goal-rec-title">${goal.name || goal.goal || 'Financial Goal'}</h4>
          <span class="goal-rec-icon">${this.getGoalIcon(goal.name || goal.goal)}</span>
        </div>
        <div class="goal-rec-details">${goal.description || goal.reasoning || ''}</div>
        <div class="goal-rec-amount">Target: ₹${this.formatAmount(goal.target || goal.amount || 0)}</div>
        <div class="goal-rec-timeline">${goal.timeline || goal.timeframe || 'Flexible timeline'}</div>
        <div class="goal-rec-actions">
          <button class="btn-use-goal" onclick="window.aiGoalRecs.useGoal(${index})">
            ✓ Use This Goal
          </button>
          <button class="btn-dismiss-goal" onclick="window.aiGoalRecs.dismissGoal(${index})">
            Dismiss
          </button>
        </div>
      </div>
    `).join('');

    box.innerHTML = `
      <div class="ai-recommendations-box">
        <h3>✨ AI-Recommended Goals</h3>
        ${goalsHTML}
      </div>
    `;

    // Store goals for later use
    this.currentRecommendations = goals;
    window.aiGoalRecs = this; // Make accessible to onclick handlers
  }

  /**
   * Parse text recommendations into structured format
   */
  parseTextRecommendations(text) {
    const goals = [];
    const lines = text.split('\n');
    let currentGoal = null;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      // Look for goal patterns
      if (line.match(/^\d+\.|^-|^•/)) {
        if (currentGoal) {
          goals.push(currentGoal);
        }
        currentGoal = {
          name: line.replace(/^\d+\.|^-|^•/, '').trim(),
          description: '',
          target: 0,
          timeline: ''
        };
      } else if (currentGoal) {
        currentGoal.description += ' ' + line;
      }
    });

    if (currentGoal) {
      goals.push(currentGoal);
    }

    return goals;
  }

  /**
   * Use a recommended goal
   */
  useGoal(index) {
    if (!this.currentRecommendations || !this.currentRecommendations[index]) return;

    const goal = this.currentRecommendations[index];

    // Fill the goal form
    const nameInput = document.getElementById('goalName') || document.getElementById('name');
    const targetInput = document.getElementById('targetAmount') || document.getElementById('target');
    const descriptionInput = document.getElementById('goalDescription') || document.getElementById('description');

    if (nameInput) nameInput.value = goal.name || goal.goal || '';
    if (targetInput) targetInput.value = goal.target || goal.amount || '';
    if (descriptionInput) descriptionInput.value = goal.description || goal.reasoning || '';

    // Show the form
    const addBtn = document.getElementById('addGoalBtn');
    if (addBtn) addBtn.click();

    // Scroll to form
    setTimeout(() => {
      const form = document.getElementById('goalForm') || document.getElementById('addGoalSection');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    toast.show('Goal details filled! Review and save.', 'success');
  }

  /**
   * Dismiss a recommendation
   */
  dismissGoal(index) {
    const card = document.querySelector(`[data-goal-index="${index}"]`);
    if (card) {
      card.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => card.remove(), 300);
    }
  }

  /**
   * Get icon for goal type
   */
  getGoalIcon(goalName) {
    const name = (goalName || '').toLowerCase();
    if (name.includes('emergency')) return '🚨';
    if (name.includes('house') || name.includes('home')) return '🏠';
    if (name.includes('car') || name.includes('vehicle')) return '🚗';
    if (name.includes('vacation') || name.includes('travel')) return '✈️';
    if (name.includes('education')) return '🎓';
    if (name.includes('wedding')) return '💍';
    if (name.includes('retirement')) return '🏖️';
    if (name.includes('investment')) return '📈';
    return '🎯';
  }

  /**
   * Format amount with commas
   */
  formatAmount(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// Export singleton
export default new AIGoalRecommendations();
