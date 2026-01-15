// AI Features Initialization
// Automatically loads appropriate AI features based on current page

import aiExpenseCategorization from './ai-expense-categorization.js';
import aiGoalRecommendations from './ai-goal-recommendations.js';
import aiInvestmentAnalysis from './ai-investment-analysis.js';
import aiDashboardInsights from './ai-dashboard-insights.js';
import aiBudgetRecommendations from './ai-budget-recommendations.js';
import AIAssistant from '../components/ai-assistant.js';
import logger from '../utils/logger.js';

const log = logger.create('AIFeaturesInit');

class AIFeaturesInit {
  constructor() {
    this.initialized = false;
    this.assistantInitialized = false;
  }

  /**
   * Initialize AI features based on current page
   */
  async init() {
    if (this.initialized) return;

    try {
      // Initialize AI Assistant (appears on all pages)
      await this.initAssistant();

      // Initialize page-specific features
      const currentPage = this.getCurrentPage();
      log.log('Initializing AI features for page:', currentPage);

      switch (currentPage) {
        case 'expenses':
          await aiExpenseCategorization.init();
          break;

        case 'goals':
          await aiGoalRecommendations.init();
          break;

        case 'investments':
          await aiInvestmentAnalysis.init();
          break;

        case 'dashboard':
          await aiDashboardInsights.init();
          break;

        case 'budgets':
          await aiBudgetRecommendations.init();
          break;

        default:
          log.log('No page-specific AI features for this page');
      }

      this.initialized = true;
      log.log('AI features initialized successfully');
    } catch (error) {
      log.error('Failed to initialize AI features:', error);
    }
  }

  /**
   * Initialize AI Assistant (floating chat widget)
   */
  async initAssistant() {
    if (this.assistantInitialized) return;

    try {
      // Skip on login/signup pages
      const currentPage = this.getCurrentPage();
      if (currentPage === 'login' || currentPage === 'signup' || currentPage === 'index' || currentPage === '') {
        log.log('Skipping AI assistant on auth/landing pages');
        return;
      }

      log.log('Initializing AI Assistant...');
      await AIAssistant.initialize();
      this.assistantInitialized = true;
      log.log('AI Assistant initialized successfully');
    } catch (error) {
      log.error('Failed to initialize AI Assistant:', error);
    }
  }

  /**
   * Get current page name from URL
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '');
    return page || 'index';
  }

  /**
   * Manually initialize specific feature
   */
  async initFeature(featureName) {
    try {
      switch (featureName) {
        case 'expense-categorization':
          await aiExpenseCategorization.init();
          break;
        case 'goal-recommendations':
          await aiGoalRecommendations.init();
          break;
        case 'investment-analysis':
          await aiInvestmentAnalysis.init();
          break;
        case 'dashboard-insights':
          await aiDashboardInsights.init();
          break;
        case 'budget-recommendations':
          await aiBudgetRecommendations.init();
          break;
        default:
          log.warn('Unknown feature:', featureName);
      }
    } catch (error) {
      log.error(`Failed to initialize ${featureName}:`, error);
    }
  }
}

// Export singleton
const aiFeatures = new AIFeaturesInit();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    aiFeatures.init();
  });
} else {
  aiFeatures.init();
}

export default aiFeatures;
