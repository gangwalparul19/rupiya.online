// AI Insights Page Logic - Redesigned
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import AIInsightsEngine from '../utils/ai-insights-engine.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import { formatCurrency, formatCurrencyCompact } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

const aiEngine = new AIInsightsEngine();

async function checkAuth() {
  await authService.waitForAuth();
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  
  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await initPage();
  });
}

init();

const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarOpen = document.getElementById('sidebarOpen');
const sidebarClose = document.getElementById('sidebarClose');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const refreshInsightsBtn = document.getElementById('refreshInsightsBtn');

async function initPage() {
  const user = authService.getCurrentUser();
  if (user) {
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    userAvatar.textContent = initials;
    userName.textContent = user.displayName || 'User';
    userEmail.textContent = user.email;
    await familySwitcher.init();
    setupEventListeners();
    setupTabs();
    await loadInsights();
  }
}

function setupTabs() {
  document.querySelectorAll('.insight-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.insight-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
}

function setupEventListeners() {
  // Sidebar toggle
  sidebarOpen?.addEventListener('click', () => {
    sidebar?.classList.add('open');
    sidebarOverlay?.classList.add('active');
  });

  sidebarClose?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);

  // Logout
  logoutBtn?.addEventListener('click', async () => {
    await authService.logout();
    window.location.href = 'login.html';
  });

  // Refresh insights
  refreshInsightsBtn?.addEventListener('click', () => {
    loadInsights(true);
  });
}

function closeSidebar() {
  sidebar?.classList.remove('open');
  sidebarOverlay?.classList.remove('active');
}

async function loadInsights(forceRefresh = false) {
  showLoadingStates();
  
  try {
    // Fetch all data
    const [expenses, income, budgets, goals] = await Promise.all([
      firestoreService.getExpenses(),
      firestoreService.getIncome(),
      firestoreService.getBudgets(),
      firestoreService.getGoals()
    ]);

    // Check if we have enough data
    if (expenses.length < 3 && income.length < 1) {
      showInsufficientDataMessage();
      return;
    }

    // Load data into AI engine
    aiEngine.loadData(expenses, income, budgets, goals);

    // Update all sections
    updateMonthlyStats(expenses, income);
    renderHealthScore();
    renderTopPriority();
    renderAnomalies();
    renderCategoryInsights();
    renderSpendingPatterns();
    renderBudgetRecommendations();
    renderSavingsOpportunities();
    renderPredictions();
    renderMonthlyReport();

    if (forceRefresh) {
      toast.success('Insights refreshed!');
    }
  } catch (error) {
    console.error('Error loading insights:', error);
    toast.error('Failed to load insights');
  }
}

function showLoadingStates() {
  const loadingHTML = `
    <div class="insight-loading">
      <div class="spinner"></div>
    </div>
  `;
  
  document.getElementById('anomaliesContent').innerHTML = loadingHTML;
  document.getElementById('categoryInsightsContent').innerHTML = loadingHTML;
  document.getElementById('spendingPatternsContent').innerHTML = loadingHTML;
  document.getElementById('budgetRecommendationsContent').innerHTML = loadingHTML;
  document.getElementById('savingsOpportunitiesContent').innerHTML = loadingHTML;
  document.getElementById('predictionsContent').innerHTML = loadingHTML;
  document.getElementById('monthlyReportContent').innerHTML = `
    <div class="insight-loading">
      <div class="spinner-lg"></div>
      <p>Generating your personalized report...</p>
    </div>
  `;
}

function showInsufficientDataMessage() {
  const emptyState = createEmptyState(
    '📊',
    'Not Enough Data',
    'Add more transactions to unlock AI-powered insights. We need at least a few expenses and income entries to analyze your finances.'
  );

  document.getElementById('anomaliesContent').innerHTML = emptyState;
  document.getElementById('categoryInsightsContent').innerHTML = emptyState;
  document.getElementById('spendingPatternsContent').innerHTML = emptyState;
  document.getElementById('budgetRecommendationsContent').innerHTML = emptyState;
  document.getElementById('savingsOpportunitiesContent').innerHTML = emptyState;
  document.getElementById('predictionsContent').innerHTML = emptyState;
  document.getElementById('monthlyReportContent').innerHTML = emptyState;
  
  // Reset health score
  document.getElementById('scoreNumber').textContent = '—';
  document.getElementById('healthMessage').textContent = 'Add more data to calculate your financial health score.';
}

function updateMonthlyStats(expenses, income) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter current month data
  const monthlyExpenses = expenses.filter(e => {
    const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const monthlyIncome = income.filter(i => {
    const date = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalExpense = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = monthlyIncome.reduce((sum, i) => sum + i.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Animate numbers
  animateNumber('monthlyIncome', totalIncome);
  animateNumber('monthlyExpense', totalExpense);
  animateNumber('monthlySavings', netSavings);

  // Update subtitle
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('aiInsightsSubtitle').textContent = 
    `Analyzing your ${monthNames[currentMonth]} ${currentYear} finances`;
  document.getElementById('reportDate').textContent = `${monthNames[currentMonth]} ${currentYear}`;
}

function renderHealthScore() {
  const healthData = aiEngine.calculateHealthScore();
  const score = healthData.score;
  const factors = healthData.factors;

  // Animate score number
  const scoreEl = document.getElementById('scoreNumber');
  animateValue(scoreEl, 0, score, 1500);

  // Animate ring
  const ring = document.getElementById('scoreRing');
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (score / 100) * circumference;
  
  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = getScoreColor(score);
  }, 100);

  // Update message
  const messages = {
    excellent: 'Excellent! Your finances are in great shape.',
    good: 'Good job! You\'re managing your money well.',
    fair: 'Fair. There\'s room for improvement.',
    poor: 'Needs attention. Let\'s work on improving your finances.'
  };
  
  let messageKey = 'poor';
  if (score >= 80) messageKey = 'excellent';
  else if (score >= 60) messageKey = 'good';
  else if (score >= 40) messageKey = 'fair';
  
  document.getElementById('healthMessage').textContent = messages[messageKey];

  // Update tags
  document.getElementById('savingsTag').textContent = `💰 Savings: ${factors.savingsRate}%`;
  document.getElementById('budgetTag').textContent = `📊 Budget: ${factors.budgetAdherence}%`;
  document.getElementById('consistencyTag').textContent = `📈 Consistency: ${factors.spendingConsistency}%`;

  // Update factor bars
  document.getElementById('savingsRateValue').textContent = `${factors.savingsRate}%`;
  document.getElementById('savingsRateFill').style.width = `${factors.savingsRate}%`;
  
  document.getElementById('budgetAdherenceValue').textContent = `${factors.budgetAdherence}%`;
  document.getElementById('budgetAdherenceFill').style.width = `${factors.budgetAdherence}%`;
  
  document.getElementById('spendingConsistencyValue').textContent = `${factors.spendingConsistency}%`;
  document.getElementById('spendingConsistencyFill').style.width = `${factors.spendingConsistency}%`;
}

function getScoreColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function renderTopPriority() {
  const anomalies = aiEngine.detectAnomalies();
  const savings = aiEngine.findSavingsOpportunities();
  const budgetRecs = aiEngine.generateBudgetRecommendations();

  // Find the most important insight
  let topInsight = null;
  
  // Priority: anomalies > savings opportunities > budget recommendations
  if (anomalies.length > 0 && anomalies[0].type === 'alert') {
    topInsight = anomalies[0];
  } else if (savings.length > 0 && savings[0].type === 'warning') {
    topInsight = savings[0];
  } else if (budgetRecs.length > 0 && budgetRecs[0].type === 'warning') {
    topInsight = budgetRecs[0];
  } else {
    topInsight = {
      title: 'You\'re Doing Great!',
      description: 'No urgent financial issues detected. Keep up the good work!'
    };
  }

  document.getElementById('topPriorityText').textContent = 
    topInsight.description || 'Analyzing your financial priorities...';
}

function renderAnomalies() {
  const anomalies = aiEngine.detectAnomalies();
  const container = document.getElementById('anomaliesContent');
  
  if (anomalies.length === 0) {
    container.innerHTML = createEmptyState('✅', 'All Clear', 'No unusual activity detected.');
    return;
  }

  container.innerHTML = anomalies.slice(0, 3).map(item => createInsightItem(item)).join('');
}

function renderCategoryInsights() {
  const categories = aiEngine.getTopSpendingCategories(5);
  const totalSpending = aiEngine.getTotalExpenses();
  const container = document.getElementById('categoryInsightsContent');

  if (categories.length === 0) {
    container.innerHTML = createEmptyState('🏷️', 'No Categories', 'Add expenses to see category breakdown.');
    return;
  }

  const colors = ['#4A90E2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  container.innerHTML = categories.map((cat, index) => {
    const percentage = totalSpending > 0 ? (cat.amount / totalSpending) * 100 : 0;
    return `
      <div class="category-bar-item">
        <div class="category-bar-header">
          <span class="category-bar-name">${cat.category}</span>
          <span class="category-bar-value">${formatCurrency(cat.amount)}</span>
        </div>
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width: ${percentage}%; background: ${colors[index % colors.length]}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSpendingPatterns() {
  const patterns = aiEngine.analyzeSpendingPatterns();
  const container = document.getElementById('spendingPatternsContent');

  if (patterns.length === 0) {
    container.innerHTML = createEmptyState('📊', 'No Patterns Yet', 'Add more transactions to see spending patterns.');
    return;
  }

  container.innerHTML = patterns.map(item => createInsightItem(item)).join('');
}

function renderBudgetRecommendations() {
  const recommendations = aiEngine.generateBudgetRecommendations();
  const container = document.getElementById('budgetRecommendationsContent');

  if (recommendations.length === 0) {
    container.innerHTML = createEmptyState('💳', 'No Recommendations', 'Add budgets to get personalized recommendations.');
    return;
  }

  container.innerHTML = recommendations.slice(0, 4).map(item => createInsightItem(item)).join('');
}

function renderSavingsOpportunities() {
  const opportunities = aiEngine.findSavingsOpportunities();
  const container = document.getElementById('savingsOpportunitiesContent');

  if (opportunities.length === 0) {
    container.innerHTML = createEmptyState('💡', 'Great Job!', 'No immediate savings opportunities found.');
    return;
  }

  container.innerHTML = opportunities.map(item => createInsightItem(item)).join('');
}

function renderPredictions() {
  const predictions = aiEngine.generatePredictions();
  const container = document.getElementById('predictionsContent');

  if (predictions.length === 0) {
    container.innerHTML = createEmptyState('🔮', 'Need More Data', 'Add more transactions to enable predictions.');
    return;
  }

  container.innerHTML = predictions.map(item => createInsightItem(item)).join('');
}

function renderMonthlyReport() {
  const report = aiEngine.generateMonthlyReport();
  const container = document.getElementById('monthlyReportContent');

  const savingsStatus = report.summary.savings >= 0 ? 'positive' : 'negative';
  const savingsIcon = report.summary.savings >= 0 ? '📈' : '📉';

  container.innerHTML = `
    <div class="report-block">
      <div class="report-block-title">📊 Financial Summary</div>
      <div class="report-block-content">
        <div class="report-highlight-box">
          <p><strong>Total Income:</strong> ${formatCurrency(report.summary.income)}</p>
          <p><strong>Total Expenses:</strong> ${formatCurrency(report.summary.expenses)}</p>
          <p><strong>Net Savings:</strong> <span class="${savingsStatus}">${formatCurrency(report.summary.savings)}</span> (${report.summary.savingsRate.toFixed(1)}% savings rate)</p>
        </div>
      </div>
    </div>

    <div class="report-block">
      <div class="report-block-title">🏷️ Top Spending Categories</div>
      <div class="report-block-content">
        <div class="top-categories-grid">
          ${report.topCategories.map((cat, index) => {
            const colors = ['#4A90E2', '#E74C3C', '#F39C12', '#27AE60', '#9B59B6'];
            const color = colors[index % colors.length];
            return `
              <div class="category-card">
                <div class="category-card-icon" style="background: ${color}20; color: ${color};">
                  ${getCategoryIcon(cat.category)}
                </div>
                <div class="category-card-name">${cat.category}</div>
                <div class="category-card-amount">${formatCurrency(cat.amount)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="report-block">
      <div class="report-block-title">${savingsIcon} Key Insights</div>
      <div class="report-block-content">
        <ul>
          ${report.insights.slice(0, 3).map(insight => `
            <li>${insight.description}</li>
          `).join('')}
        </ul>
      </div>
    </div>

    <div class="report-block">
      <div class="report-block-title">💡 Recommendations</div>
      <div class="report-block-content">
        <ul>
          ${report.recommendations.slice(0, 3).map(rec => `
            <li>${rec.description}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

function createInsightItem(item) {
  const iconClass = item.type === 'positive' ? 'positive' : 
                    item.type === 'warning' || item.type === 'alert' ? 'negative' : 'neutral';
  const valueClass = item.type === 'positive' ? 'positive' : 
                     item.type === 'warning' || item.type === 'alert' ? 'negative' : 'neutral';
  
  const icon = item.type === 'positive' ? '✅' : 
               item.type === 'warning' ? '⚠️' : 
               item.type === 'alert' ? '🚨' : 'ℹ️';

  return `
    <div class="insight-item-new">
      <div class="insight-item-icon ${iconClass}">${icon}</div>
      <div class="insight-item-content">
        <div class="insight-item-title">${item.title}</div>
        <div class="insight-item-desc">${item.description}</div>
      </div>
      ${item.value ? `<div class="insight-item-value ${valueClass}">${item.value}</div>` : ''}
    </div>
  `;
}

function createEmptyState(icon, title, description) {
  return `
    <div class="insight-empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-desc">${description}</div>
    </div>
  `;
}

function getCategoryIcon(category) {
  const icons = {
    'Food': '🍔',
    'Transport': '🚗',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Healthcare': '🏥',
    'Education': '📚',
    'Bills': '📄',
    'Utilities': '💡',
    'Rent': '🏠',
    'Groceries': '🛒',
    'Travel': '✈️',
    'Fuel': '⛽',
    'Insurance': '🛡️',
    'Investment': '💰',
    'Savings': '💵',
    'Other': '📦'
  };
  return icons[category] || '📊';
}

function animateNumber(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const prefix = value < 0 ? '-₹' : '₹';
  const absValue = Math.abs(value);
  
  animateValue(el, 0, absValue, 1000, (v) => `${prefix}${formatCurrencyCompact(v)}`);
}

function animateValue(element, start, end, duration, formatter = (v) => Math.round(v)) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * easeOut;
    
    element.textContent = formatter(current);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}
