// AI Insights Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import AIInsightsEngine from '../utils/ai-insights-engine.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency } from '../utils/helpers.js';

// Initialize AI engine
const aiEngine = new AIInsightsEngine();

// Check authentication
async function checkAuth() {
  await authService.waitForAuth();
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize page
async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  
  await initPage();
}

// Start initialization
init();

// Get DOM elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarOpen = document.getElementById('sidebarOpen');
const sidebarClose = document.getElementById('sidebarClose');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const refreshInsightsBtn = document.getElementById('refreshInsightsBtn');

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Update user profile
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    
    userAvatar.textContent = initials;
    userName.textContent = user.displayName || 'User';
    userEmail.textContent = user.email;
    
    // Initialize family switcher
    await familySwitcher.init();
    
    // Update subtitle based on context
    updatePageContext();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load insights
    await loadInsights();
  }
}

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('aiInsightsSubtitle');
  
  if (subtitle && context.context === 'family' && context.group) {
    subtitle.textContent = `AI insights for ${context.group.name}`;
  } else if (subtitle) {
    subtitle.textContent = 'Smart recommendations powered by AI';
  }
}

// Load insights
async function loadInsights() {
  try {
    // Show loading states
    showLoadingStates();
    
    // Load all data
    const [expenses, income, budgets, goals] = await Promise.all([
      firestoreService.getExpenses(),
      firestoreService.getIncome(),
      firestoreService.getBudgets(),
      firestoreService.getGoals()
    ]);
    
    // Check if we have enough data
    if (expenses.length === 0 && income.length === 0) {
      showInsufficientDataMessage();
      return;
    }
    
    // Load data into AI engine
    aiEngine.loadData(expenses, income, budgets, goals);
    
    // Generate and render insights
    renderHealthScore();
    renderSpendingPatterns();
    renderAnomalies();
    renderSavingsOpportunities();
    renderBudgetRecommendations();
    renderCategoryInsights();
    renderPredictions();
    renderMonthlyReport();
    
    toast.success('Insights updated successfully');
    
  } catch (error) {
    console.error('Error loading insights:', error);
    toast.error('Failed to load insights');
  }
}

// Show loading states
function showLoadingStates() {
  const loadingHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Analyzing...</p>
    </div>
  `;
  
  document.getElementById('spendingPatternsContent').innerHTML = loadingHTML;
  document.getElementById('anomaliesContent').innerHTML = loadingHTML;
  document.getElementById('savingsOpportunitiesContent').innerHTML = loadingHTML;
  document.getElementById('budgetRecommendationsContent').innerHTML = loadingHTML;
  document.getElementById('categoryInsightsContent').innerHTML = loadingHTML;
  document.getElementById('predictionsContent').innerHTML = loadingHTML;
  document.getElementById('monthlyReportContent').innerHTML = `
    <div class="loading-state">
      <div class="spinner-lg"></div>
      <p>Generating report...</p>
    </div>
  `;
}

// Show insufficient data message
function showInsufficientDataMessage() {
  const message = `
    <div class="insight-item">
      <div class="insight-item-header">
        <div class="insight-item-title">Insufficient Data</div>
        <div class="insight-item-value neutral">—</div>
      </div>
      <div class="insight-item-description">
        Add expenses and income to get personalized insights.
      </div>
    </div>
  `;
  
  document.getElementById('spendingPatternsContent').innerHTML = message;
  document.getElementById('anomaliesContent').innerHTML = message;
  document.getElementById('savingsOpportunitiesContent').innerHTML = message;
  document.getElementById('budgetRecommendationsContent').innerHTML = message;
  document.getElementById('categoryInsightsContent').innerHTML = message;
  document.getElementById('predictionsContent').innerHTML = message;
  
  document.getElementById('monthlyReportContent').innerHTML = `
    <div class="report-section">
      <h3 class="report-section-title">
        <span class="report-section-icon">📊</span>
        Get Started
      </h3>
      <div class="report-section-content">
        <p>Start tracking your expenses and income to receive personalized AI-powered insights and recommendations.</p>
        <p>The more data you add, the better our AI can help you manage your finances.</p>
      </div>
    </div>
  `;
}

// Render health score
function renderHealthScore() {
  const { score, factors } = aiEngine.calculateHealthScore();
  
  // Animate score ring
  const scoreRing = document.getElementById('scoreRing');
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  
  // Reset animation
  scoreRing.style.transition = 'none';
  scoreRing.style.strokeDashoffset = circumference;
  
  setTimeout(() => {
    scoreRing.style.transition = 'stroke-dashoffset 1s ease-out';
    scoreRing.style.strokeDashoffset = offset;
  }, 100);
  
  // Animate score number
  animateNumber('scoreNumber', 0, score, 1000);
  
  // Update factors with animation
  setTimeout(() => {
    document.getElementById('savingsRateFill').style.width = `${factors.savingsRate}%`;
    document.getElementById('savingsRateValue').textContent = `${factors.savingsRate}%`;
    
    document.getElementById('budgetAdherenceFill').style.width = `${factors.budgetAdherence}%`;
    document.getElementById('budgetAdherenceValue').textContent = `${factors.budgetAdherence}%`;
    
    document.getElementById('spendingConsistencyFill').style.width = `${factors.spendingConsistency}%`;
    document.getElementById('spendingConsistencyValue').textContent = `${factors.spendingConsistency}%`;
  }, 200);
}

// Animate number
function animateNumber(elementId, start, end, duration) {
  const element = document.getElementById(elementId);
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = Math.round(current);
  }, 16);
}

// Render spending patterns
function renderSpendingPatterns() {
  const patterns = aiEngine.analyzeSpendingPatterns();
  const container = document.getElementById('spendingPatternsContent');
  container.innerHTML = patterns.map(p => createInsightItem(p)).join('');
}

// Render anomalies
function renderAnomalies() {
  const anomalies = aiEngine.detectAnomalies();
  const container = document.getElementById('anomaliesContent');
  container.innerHTML = anomalies.map(a => createInsightItem(a)).join('');
}

// Render savings opportunities
function renderSavingsOpportunities() {
  const opportunities = aiEngine.findSavingsOpportunities();
  const container = document.getElementById('savingsOpportunitiesContent');
  container.innerHTML = opportunities.map(o => createInsightItem(o)).join('');
}

// Render budget recommendations
function renderBudgetRecommendations() {
  const recommendations = aiEngine.generateBudgetRecommendations();
  const container = document.getElementById('budgetRecommendationsContent');
  container.innerHTML = recommendations.map(r => createInsightItem(r)).join('');
}

// Render category insights
function renderCategoryInsights() {
  const insights = aiEngine.analyzeCategoryInsights();
  const container = document.getElementById('categoryInsightsContent');
  
  if (insights.length === 0) {
    container.innerHTML = `
      <div class="insight-item">
        <div class="insight-item-header">
          <div class="insight-item-title">No Data</div>
          <div class="insight-item-value neutral">—</div>
        </div>
        <div class="insight-item-description">
          Add expenses to see category breakdown.
        </div>
      </div>
    `;
  } else {
    container.innerHTML = insights.map(i => createInsightItem(i)).join('');
  }
}

// Render predictions
function renderPredictions() {
  const predictions = aiEngine.generatePredictions();
  const container = document.getElementById('predictionsContent');
  container.innerHTML = predictions.map(p => createInsightItem(p)).join('');
}

// Render monthly report
function renderMonthlyReport() {
  const report = aiEngine.generateMonthlyReport();
  const container = document.getElementById('monthlyReportContent');
  
  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  container.innerHTML = `
    <div class="report-section">
      <h3 class="report-section-title">
        <span class="report-section-icon">📊</span>
        Financial Summary - ${monthName}
      </h3>
      <div class="report-section-content">
        <p>This month, you earned <strong>${formatCurrency(report.summary.income)}</strong> and spent <strong>${formatCurrency(report.summary.expenses)}</strong>, resulting in ${report.summary.savings >= 0 ? 'savings' : 'a deficit'} of <strong>${formatCurrency(Math.abs(report.summary.savings))}</strong> (${report.summary.savingsRate.toFixed(1)}% ${report.summary.savings >= 0 ? 'savings' : 'deficit'} rate).</p>
      </div>
    </div>
    
    ${report.topCategories.length > 0 ? `
      <div class="report-section">
        <h3 class="report-section-title">
          <span class="report-section-icon">🏷️</span>
          Top Spending Categories
        </h3>
        <div class="report-section-content">
          <ul>
            ${report.topCategories.map(cat => `<li><strong>${cat.category}</strong>: ${formatCurrency(cat.amount)}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : ''}
    
    <div class="report-highlight">
      <div class="report-highlight-title">Financial Health Score: ${report.healthScore}/100</div>
      <p>${getHealthScoreMessage(report.healthScore)}</p>
    </div>
    
    ${report.insights.length > 0 ? `
      <div class="report-section">
        <h3 class="report-section-title">
          <span class="report-section-icon">💡</span>
          Key Insights
        </h3>
        <div class="report-section-content">
          <ul>
            ${report.insights.slice(0, 3).map(insight => `<li>${insight.description}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : ''}
    
    ${report.recommendations.length > 0 ? `
      <div class="report-section">
        <h3 class="report-section-title">
          <span class="report-section-icon">🎯</span>
          Recommendations
        </h3>
        <div class="report-section-content">
          <ul>
            ${report.recommendations.slice(0, 3).map(rec => `<li>${rec.description}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : ''}
    
    <div class="report-section">
      <h3 class="report-section-title">
        <span class="report-section-icon">📈</span>
        Next Steps
      </h3>
      <div class="report-section-content">
        <p>Based on your financial data, here are some actions you can take:</p>
        <ul>
          ${report.healthScore < 60 ? '<li>Review your budget and identify areas to cut spending</li>' : ''}
          ${report.summary.savingsRate < 20 ? '<li>Aim to increase your savings rate to at least 20%</li>' : ''}
          ${report.topCategories.length > 0 && report.topCategories[0].amount > report.summary.income * 0.3 ? '<li>Consider reducing spending in your top category</li>' : ''}
          <li>Continue tracking all expenses and income regularly</li>
          <li>Review your financial goals and adjust as needed</li>
          ${report.healthScore >= 80 ? '<li>Great job! Keep up the good financial habits</li>' : ''}
        </ul>
      </div>
    </div>
  `;
}

// Create insight item HTML
function createInsightItem(insight) {
  return `
    <div class="insight-item">
      <div class="insight-item-header">
        <div class="insight-item-title">${insight.title}</div>
        <div class="insight-item-value ${insight.type}">${insight.value}</div>
      </div>
      <div class="insight-item-description">${insight.description}</div>
      ${insight.badge ? `<span class="insight-badge ${insight.badge}">${insight.badge}</span>` : ''}
    </div>
  `;
}

// Get health score message
function getHealthScoreMessage(score) {
  if (score >= 80) return 'Excellent! You\'re managing your finances very well. Keep up the great work!';
  if (score >= 60) return 'Good job! You\'re on the right track. There\'s room for improvement in some areas.';
  if (score >= 40) return 'Fair. Consider following the recommendations below to improve your financial health.';
  return 'Needs attention. Focus on improving your savings rate and budget adherence. Small changes can make a big difference!';
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  sidebarOpen.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });
  
  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
  
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
  
  // Logout
  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
    const result = await authService.signOut();
    if (result.success) {
      toast.success('Logged out successfully');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      toast.error('Failed to logout');
    }
  });
  
  // Refresh insights
  refreshInsightsBtn.addEventListener('click', async () => {
    refreshInsightsBtn.disabled = true;
    await loadInsights();
    refreshInsightsBtn.disabled = false;
  });
}
