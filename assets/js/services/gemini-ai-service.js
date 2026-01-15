// Gemini AI Service
// Wrapper for all AI-powered features in Rupiya
// Provides easy-to-use methods for AI functionality

import { auth } from '../config/firebase-config.js';
import geminiKeyService from './gemini-key-service.js';
import logger from '../utils/logger.js';

const log = logger.create('GeminiAIService');

class GeminiAIService {
  constructor() {
    this.isAvailable = false;
    this.checkAvailability();
  }

  /**
   * Check if AI features are available for the current user
   */
  async checkAvailability() {
    try {
      this.isAvailable = await geminiKeyService.hasUserKey();
      log.log('AI features available:', this.isAvailable);
    } catch (error) {
      log.error('Error checking AI availability:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Make a request to the Gemini API proxy
   * @private
   */
  async makeRequest(action, data) {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Get decrypted API key from key service
      const apiKey = await geminiKeyService.getUserKey();
      
      if (!apiKey) {
        throw new Error('No API key found. Please configure your Gemini API key in settings.');
      }

      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action, 
          data,
          apiKey // Send decrypted key to backend
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI request failed');
      }

      const result = await response.json();
      
      // Record usage
      if (result.usage) {
        log.log(`AI usage: ${result.usage.inputTokens} input + ${result.usage.outputTokens} output tokens`);
      }

      return result;
    } catch (error) {
      log.error(`AI request failed (${action}):`, error);
      throw error;
    }
  }

  /**
   * Auto-categorize an expense using AI
   * @param {string} description - Expense description
   * @param {number} amount - Expense amount
   * @param {Array<string>} userCategories - User's existing categories
   * @param {Array<Object>} recentExpenses - Recent expenses for context
   * @returns {Promise<Object>} - { category, confidence, reasoning }
   */
  async categorizeExpense(description, amount, userCategories = [], recentExpenses = []) {
    log.log('Categorizing expense:', description);
    
    const result = await this.makeRequest('categorizeExpense', {
      description,
      amount,
      userCategories,
      recentExpenses: recentExpenses.slice(0, 10) // Limit to last 10
    });

    try {
      // Parse JSON response from AI
      const suggestion = JSON.parse(result.data);
      log.log('Category suggestion:', suggestion);
      return suggestion;
    } catch (parseError) {
      log.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Analyze spending patterns and provide insights
   * @param {Array<Object>} expenses - Expenses to analyze
   * @param {Object} categories - Expenses grouped by category
   * @param {Array<Object>} previousPeriod - Previous period expenses for comparison
   * @returns {Promise<string>} - AI-generated insights
   */
  async analyzeSpending(expenses, categories, previousPeriod = []) {
    log.log('Analyzing spending patterns...');
    
    const result = await this.makeRequest('spendingInsights', {
      expenses,
      categories,
      previousPeriod
    });

    return result.data;
  }

  /**
   * Analyze budget and provide recommendations
   * @param {Object} budgetData - Budget information
   * @returns {Promise<string>} - AI-generated budget analysis
   */
  async analyzeBudget(budgetData) {
    log.log('Analyzing budget...');
    
    const result = await this.makeRequest('analyzeBudget', budgetData);
    return result.data;
  }

  /**
   * Recommend financial goals based on user's financial data
   * @param {Object} financialData - User's financial information
   * @returns {Promise<string>} - AI-generated goal recommendations
   */
  async recommendGoals(financialData) {
    log.log('Generating goal recommendations...');
    
    const result = await this.makeRequest('goalRecommendation', financialData);
    return result.data;
  }

  /**
   * Analyze investment portfolio
   * @param {Object} portfolioData - Investment portfolio information
   * @returns {Promise<string>} - AI-generated investment analysis
   */
  async analyzeInvestments(portfolioData) {
    log.log('Analyzing investment portfolio...');
    
    const result = await this.makeRequest('investmentAnalysis', portfolioData);
    return result.data;
  }

  /**
   * Chat with AI assistant
   * @param {string} message - User's message
   * @param {Object} context - Financial context (optional)
   * @returns {Promise<string>} - AI response
   */
  async chat(message, context = {}) {
    log.log('Sending chat message:', message);
    
    const result = await this.makeRequest('chat', {
      message,
      context
    });

    return result.data;
  }

  /**
   * Detect duplicate expenses
   * @param {Object} newExpense - New expense to check
   * @param {Array<Object>} recentExpenses - Recent expenses to compare against
   * @returns {Promise<Object>} - { isDuplicate, matchedExpense, confidence, reasoning }
   */
  async detectDuplicate(newExpense, recentExpenses) {
    log.log('Checking for duplicate expense...');
    
    const prompt = `
Analyze if this new expense is a duplicate of any recent expenses.

New expense:
- Description: "${newExpense.description}"
- Amount: ${newExpense.amount}
- Date: ${newExpense.date}

Recent expenses (last 7 days):
${recentExpenses.map(e => `- ${e.description} | ${e.amount} | ${e.date}`).join('\n')}

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "isDuplicate": true/false,
  "matchedExpenseIndex": 0-based index or null,
  "confidence": 0-100,
  "reasoning": "brief explanation"
}
    `.trim();

    const result = await this.makeRequest('chat', { message: prompt });
    
    try {
      const analysis = JSON.parse(result.data);
      return analysis;
    } catch (parseError) {
      log.error('Failed to parse duplicate detection response:', parseError);
      return { isDuplicate: false, confidence: 0, reasoning: 'Analysis failed' };
    }
  }

  /**
   * Find savings opportunities
   * @param {Array<Object>} expenses - User's expenses
   * @param {Object} categories - Expenses grouped by category
   * @returns {Promise<Array<Object>>} - List of savings opportunities
   */
  async findSavingsOpportunities(expenses, categories) {
    log.log('Finding savings opportunities...');
    
    const prompt = `
Analyze these expenses and identify specific savings opportunities.

Total expenses: ${expenses.length}
Categories: ${Object.keys(categories).join(', ')}

Category breakdown:
${Object.entries(categories).map(([cat, items]) => 
  `- ${cat}: ${items.length} transactions, total ${items.reduce((sum, e) => sum + e.amount, 0)}`
).join('\n')}

Provide 3-5 specific, actionable savings opportunities.
Respond ONLY with a JSON array (no markdown, no extra text):
[
  {
    "category": "category name",
    "opportunity": "specific suggestion",
    "potentialSavings": estimated monthly savings amount,
    "difficulty": "easy/medium/hard"
  }
]
    `.trim();

    const result = await this.makeRequest('chat', { message: prompt });
    
    try {
      const opportunities = JSON.parse(result.data);
      return opportunities;
    } catch (parseError) {
      log.error('Failed to parse savings opportunities:', parseError);
      return [];
    }
  }

  /**
   * Predict next month's expenses
   * @param {Array<Object>} historicalExpenses - Past 3-6 months of expenses
   * @returns {Promise<Object>} - Predictions by category
   */
  async predictExpenses(historicalExpenses) {
    log.log('Predicting next month expenses...');
    
    const prompt = `
Based on this historical expense data, predict next month's expenses by category.

Historical data (last 3 months):
${JSON.stringify(historicalExpenses, null, 2)}

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "predictions": {
    "category1": predicted_amount,
    "category2": predicted_amount
  },
  "totalPredicted": total_amount,
  "confidence": 0-100,
  "insights": "brief explanation of prediction"
}
    `.trim();

    const result = await this.makeRequest('chat', { message: prompt });
    
    try {
      const prediction = JSON.parse(result.data);
      return prediction;
    } catch (parseError) {
      log.error('Failed to parse expense prediction:', parseError);
      return null;
    }
  }

  /**
   * Get financial health score
   * @param {Object} financialData - Complete financial snapshot
   * @returns {Promise<Object>} - Health score and recommendations
   */
  async getFinancialHealthScore(financialData) {
    log.log('Calculating financial health score...');
    
    const prompt = `
Analyze this financial data and provide a health score.

Income: ${financialData.income}
Expenses: ${financialData.expenses}
Savings: ${financialData.savings}
Debt: ${financialData.debt}
Emergency Fund: ${financialData.emergencyFund}

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "score": 0-100,
  "grade": "A/B/C/D/F",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "summary": "brief overall assessment"
}
    `.trim();

    const result = await this.makeRequest('chat', { message: prompt });
    
    try {
      const healthScore = JSON.parse(result.data);
      return healthScore;
    } catch (parseError) {
      log.error('Failed to parse health score:', parseError);
      return null;
    }
  }
}

// Export singleton instance
export default new GeminiAIService();
