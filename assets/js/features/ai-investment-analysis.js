// AI-Powered Investment Analysis
// Provides portfolio insights and recommendations

import geminiAI from '../services/gemini-ai-service.js';
import toast from '../components/toast.js';
import logger from '../utils/logger.js';

const log = logger.create('AIInvestmentAnalysis');

class AIInvestmentAnalysis {
  constructor() {
    this.isAvailable = false;
    this.analysisBox = null;
  }

  /**
   * Initialize AI investment features
   */
  async init() {
    try {
      await geminiAI.checkAvailability();
      this.isAvailable = geminiAI.isAvailable;
      
      if (this.isAvailable) {
        this.addAnalysisButton();
        log.log('AI investment analysis initialized');
      }
    } catch (error) {
      log.error('Failed to initialize AI investment features:', error);
    }
  }

  /**
   * Add analysis button to the page
   */
  addAnalysisButton() {
    const header = document.querySelector('.page-header') || document.querySelector('h1');
    if (!header) return;

    if (document.getElementById('aiInvestmentAnalysisBtn')) return;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ai-analysis-container';
    buttonContainer.innerHTML = `
      <button type="button" id="aiInvestmentAnalysisBtn" class="btn-ai-analysis">
        ✨ Get AI Portfolio Analysis
      </button>
      <div id="aiInvestmentAnalysisBox" style="display: none;"></div>
    `;

    header.parentElement.insertBefore(buttonContainer, header.nextSibling);

    document.getElementById('aiInvestmentAnalysisBtn').addEventListener('click', () => {
      this.analyzePortfolio();
    });

    this.addStyles();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('ai-investment-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-investment-styles';
    style.textContent = `
      .ai-analysis-container {
        margin: 20px 0;
      }

      .btn-ai-analysis {
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

      .btn-ai-analysis:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
      }

      .btn-ai-analysis:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .ai-analysis-box {
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

      .ai-analysis-box h3 {
        margin: 0 0 16px 0;
        color: #667eea;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .analysis-section {
        background: white;
        border-radius: 10px;
        padding: 16px;
        margin: 12px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .analysis-section h4 {
        margin: 0 0 12px 0;
        color: #333;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .analysis-content {
        font-size: 14px;
        color: #666;
        line-height: 1.6;
      }

      .analysis-content ul {
        margin: 8px 0;
        padding-left: 20px;
      }

      .analysis-content li {
        margin: 6px 0;
      }

      .risk-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }

      .risk-low {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .risk-medium {
        background: #fff3e0;
        color: #e65100;
      }

      .risk-high {
        background: #ffebee;
        color: #c62828;
      }

      .diversification-chart {
        display: flex;
        gap: 8px;
        margin: 12px 0;
        height: 30px;
        border-radius: 6px;
        overflow: hidden;
      }

      .diversification-segment {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        color: white;
        transition: all 0.3s ease;
      }

      .diversification-segment:hover {
        opacity: 0.8;
      }

      .recommendation-card {
        background: #f8f9fa;
        border-left: 4px solid #667eea;
        padding: 12px;
        margin: 8px 0;
        border-radius: 4px;
      }

      .recommendation-card strong {
        color: #667eea;
      }

      .ai-analysis-loading {
        text-align: center;
        padding: 40px 20px;
        color: #667eea;
      }

      .ai-analysis-loading .spinner {
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

      .disclaimer {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;
        padding: 12px;
        margin: 16px 0;
        font-size: 13px;
        color: #856404;
      }

      .disclaimer strong {
        display: block;
        margin-bottom: 4px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Analyze portfolio
   */
  async analyzePortfolio() {
    const btn = document.getElementById('aiInvestmentAnalysisBtn');
    const box = document.getElementById('aiInvestmentAnalysisBox');

    if (!btn || !box) return;

    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing portfolio...';
    box.style.display = 'block';
    box.innerHTML = `
      <div class="ai-analysis-loading">
        <div class="spinner"></div>
        <p>AI is analyzing your investment portfolio...</p>
      </div>
    `;

    try {
      const portfolioData = await this.gatherPortfolioData();

      if (!portfolioData.investments || portfolioData.investments.length === 0) {
        box.innerHTML = `
          <div class="ai-analysis-box">
            <h3>📊 Portfolio Analysis</h3>
            <p style="color: #666;">No investments found. Add some investments to get AI analysis.</p>
          </div>
        `;
        return;
      }

      const analysis = await geminiAI.analyzeInvestments(portfolioData);

      this.displayAnalysis(analysis, portfolioData, box);

      toast.show('Portfolio analysis complete!', 'success');
    } catch (error) {
      log.error('Failed to analyze portfolio:', error);
      box.innerHTML = `
        <div class="ai-analysis-box">
          <h3>❌ Analysis Failed</h3>
          <p style="color: #666;">Sorry, we couldn't analyze your portfolio at this time.</p>
          <p style="color: #999; font-size: 13px; margin-top: 8px;">${error.message}</p>
        </div>
      `;
      toast.show('Analysis failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Get AI Portfolio Analysis';
    }
  }

  /**
   * Gather portfolio data
   */
  async gatherPortfolioData() {
    const data = {
      investments: [],
      totalValue: 0,
      totalInvested: 0,
      byType: {},
      byRisk: {}
    };

    // Try to get from global state
    if (window.investmentsState && window.investmentsState.investments) {
      data.investments = window.investmentsState.investments.map(inv => ({
        name: inv.name,
        type: inv.type,
        amount: inv.currentValue || inv.amount,
        invested: inv.investedAmount || inv.amount,
        returns: ((inv.currentValue || inv.amount) - (inv.investedAmount || inv.amount)),
        percentage: inv.percentage || 0
      }));

      data.totalValue = data.investments.reduce((sum, inv) => sum + inv.amount, 0);
      data.totalInvested = data.investments.reduce((sum, inv) => sum + inv.invested, 0);

      // Group by type
      data.investments.forEach(inv => {
        if (!data.byType[inv.type]) {
          data.byType[inv.type] = { count: 0, value: 0 };
        }
        data.byType[inv.type].count++;
        data.byType[inv.type].value += inv.amount;
      });
    }

    return data;
  }

  /**
   * Display analysis
   */
  displayAnalysis(analysis, portfolioData, box) {
    const totalReturns = portfolioData.totalValue - portfolioData.totalInvested;
    const returnsPercentage = portfolioData.totalInvested > 0 
      ? ((totalReturns / portfolioData.totalInvested) * 100).toFixed(2)
      : 0;

    // Create diversification chart
    const diversificationHTML = this.createDiversificationChart(portfolioData.byType, portfolioData.totalValue);

    box.innerHTML = `
      <div class="ai-analysis-box">
        <h3>📊 AI Portfolio Analysis</h3>

        <div class="analysis-section">
          <h4>💼 Portfolio Overview</h4>
          <div class="analysis-content">
            <p><strong>Total Value:</strong> ₹${this.formatAmount(portfolioData.totalValue)}</p>
            <p><strong>Total Invested:</strong> ₹${this.formatAmount(portfolioData.totalInvested)}</p>
            <p><strong>Returns:</strong> ₹${this.formatAmount(totalReturns)} (${returnsPercentage}%)</p>
            <p><strong>Number of Investments:</strong> ${portfolioData.investments.length}</p>
          </div>
        </div>

        <div class="analysis-section">
          <h4>🎯 Diversification</h4>
          ${diversificationHTML}
        </div>

        <div class="analysis-section">
          <h4>🤖 AI Insights</h4>
          <div class="analysis-content">
            ${this.formatAnalysisText(analysis)}
          </div>
        </div>

        <div class="disclaimer">
          <strong>⚠️ Disclaimer</strong>
          This analysis is for informational purposes only and does not constitute financial advice. 
          Please consult with a qualified financial advisor before making investment decisions.
        </div>
      </div>
    `;
  }

  /**
   * Create diversification chart
   */
  createDiversificationChart(byType, totalValue) {
    if (!byType || Object.keys(byType).length === 0) {
      return '<p style="color: #666;">No diversification data available</p>';
    }

    const colors = {
      'Stocks': '#4caf50',
      'Mutual Funds': '#2196f3',
      'Fixed Deposit': '#ff9800',
      'Gold': '#ffc107',
      'Real Estate': '#9c27b0',
      'Crypto': '#00bcd4',
      'Bonds': '#795548',
      'Other': '#9e9e9e'
    };

    const segments = Object.entries(byType).map(([type, data]) => {
      const percentage = ((data.value / totalValue) * 100).toFixed(1);
      const color = colors[type] || '#9e9e9e';
      return {
        type,
        percentage,
        color,
        value: data.value
      };
    }).sort((a, b) => b.percentage - a.percentage);

    const chartHTML = `
      <div class="diversification-chart">
        ${segments.map(seg => `
          <div class="diversification-segment" 
               style="width: ${seg.percentage}%; background: ${seg.color};"
               title="${seg.type}: ${seg.percentage}%">
            ${seg.percentage > 10 ? seg.percentage + '%' : ''}
          </div>
        `).join('')}
      </div>
      <div class="analysis-content">
        <ul>
          ${segments.map(seg => `
            <li>
              <span style="display: inline-block; width: 12px; height: 12px; background: ${seg.color}; border-radius: 2px; margin-right: 8px;"></span>
              <strong>${seg.type}:</strong> ${seg.percentage}% (₹${this.formatAmount(seg.value)})
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    return chartHTML;
  }

  /**
   * Format analysis text
   */
  formatAnalysisText(text) {
    // Convert markdown-style formatting to HTML
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap in paragraph if not already
    if (!formatted.startsWith('<p>')) {
      formatted = '<p>' + formatted + '</p>';
    }

    // Convert bullet points
    formatted = formatted.replace(/- (.*?)(<br>|<\/p>)/g, '<li>$1</li>');
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    return formatted;
  }

  /**
   * Format amount with commas
   */
  formatAmount(amount) {
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// Export singleton
export default new AIInvestmentAnalysis();
