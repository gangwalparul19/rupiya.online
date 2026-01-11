// Predictive Analytics Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import predictionService from '../services/prediction-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import breadcrumbManager from '../utils/breadcrumbs.js';
import loadingService from '../services/loading-service.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let charts = {};
let currentData = {
  forecasts: [],
  warnings: [],
  goals: [],
  anomalies: [],
  patterns: []
};

// DOM Elements
let loadingState;
let alertsSection, alertsContainer;
let warningsSection, warningsContainer;
let goalsSection, goalsContainer;
let anomaliesSection, anomaliesContainer;
let patternsSection, patternsContainer;

// Initialize page
async function init() {
  // Check authentication
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize breadcrumbs
  breadcrumbManager.setBreadcrumbs([
    { label: 'Dashboard', href: 'dashboard.html' },
    { label: 'Predictive Analytics', href: null }
  ]);

  // Initialize DOM elements
  initDOMElements();

  // Set up event listeners
  setupEventListeners();

  // Load user profile
  loadUserProfile(user);

  // Check if encryption reauth is needed and load data
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadData();
  });
  
  // Also load data directly (in case callback didn't work)
  // This ensures data loads even if encryption check has issues
  await loadData();
}

// Initialize DOM elements
function initDOMElements() {
  loadingState = document.getElementById('loadingState');
  alertsSection = document.getElementById('alertsSection');
  alertsContainer = document.getElementById('alertsContainer');
  warningsSection = document.getElementById('warningsSection');
  warningsContainer = document.getElementById('warningsContainer');
  goalsSection = document.getElementById('goalsSection');
  goalsContainer = document.getElementById('goalsContainer');
  anomaliesSection = document.getElementById('anomaliesSection');
  anomaliesContainer = document.getElementById('anomaliesContainer');
  patternsSection = document.getElementById('patternsSection');
  patternsContainer = document.getElementById('patternsContainer');
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

  sidebarOpen?.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });

  sidebarClose?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
}

// Load user profile
function loadUserProfile(user) {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  if (userName) userName.textContent = user.displayName || 'User';
  if (userEmail) userEmail.textContent = user.email;
  if (userAvatar) {
    userAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
  }
}

// Load data
async function loadData() {
  // Show skeleton screen instead of spinner
  const skeleton = loadingService.showLoading(loadingState, 'dashboard');

  try {
    console.log('[PredictiveAnalytics] Loading prediction data...');
    
    // Load all prediction data in parallel
    const [forecasts, warnings, goals, anomalies, patterns] = await Promise.all([
      predictionService.forecastSpending(30),
      predictionService.detectBudgetOverspendRisk(),
      loadGoalProjections(),
      predictionService.detectAnomalies(),
      predictionService.analyzeSpendingPatterns()
    ]);

    console.log('[PredictiveAnalytics] Data loaded:', {
      forecasts: forecasts?.length || 0,
      warnings: warnings?.length || 0,
      goals: goals?.length || 0,
      anomalies: anomalies?.length || 0,
      patterns: patterns?.length || 0
    });

    currentData = {
      forecasts,
      warnings,
      goals,
      anomalies,
      patterns
    };

    // Check if we have any data at all
    const hasAnyData = forecasts.length > 0 || warnings.length > 0 || 
                       goals.length > 0 || anomalies.length > 0 || patterns.length > 0;
    
    if (!hasAnyData) {
      console.log('[PredictiveAnalytics] No data available, showing empty state');
      showEmptyState();
      return;
    }

    // Render all sections
    renderSpendingForecastChart();
    renderBudgetOverspendWarnings();
    renderSavingsGoalProjections();
    renderAnomalies();
    renderSpendingPatterns();
    renderAlerts();
  } catch (error) {
    console.error('[PredictiveAnalytics] Error loading predictive analytics:', error);
    showToast('Failed to load predictive analytics', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Show empty state when no data is available
function showEmptyState() {
  const emptyHTML = `
    <div class="empty-state" style="text-align: center; padding: 60px 20px;">
      <div style="font-size: 64px; margin-bottom: 20px;">📊</div>
      <h2 style="color: var(--text-primary); margin-bottom: 10px;">No Data Available</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Add some expenses and income to see predictive analytics and insights.
      </p>
      <a href="expenses.html" class="btn btn-primary">Add Expenses</a>
    </div>
  `;
  
  // Hide all sections and show empty state
  if (alertsSection) alertsSection.style.display = 'none';
  if (warningsSection) warningsSection.style.display = 'none';
  if (goalsSection) goalsSection.style.display = 'none';
  if (anomaliesSection) anomaliesSection.style.display = 'none';
  if (patternsSection) patternsSection.style.display = 'none';
  
  // Insert empty state after loading state
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const emptyDiv = document.createElement('div');
    emptyDiv.innerHTML = emptyHTML;
    mainContent.appendChild(emptyDiv);
  }
}

// Load goal projections
async function loadGoalProjections() {
  try {
    const goals = await firestoreService.getGoals();
    const projections = [];

    for (const goal of goals) {
      const projection = await predictionService.projectSavingsGoal(goal.id);
      if (projection) {
        projections.push(projection);
      }
    }

    return projections;
  } catch (error) {
    console.error('Error loading goal projections:', error);
    return [];
  }
}

// Render spending forecast chart
function renderSpendingForecastChart() {
  const ctx = document.getElementById('spendingForecastChart');
  if (!ctx) return;

  // Destroy existing chart
  if (charts.spendingForecast) {
    charts.spendingForecast.destroy();
  }

  // Group forecasts by date
  const forecastsByDate = {};
  const historicalData = {};

  currentData.forecasts.forEach(forecast => {
    const dateKey = forecast.date.toISOString().split('T')[0];
    if (!forecastsByDate[dateKey]) {
      forecastsByDate[dateKey] = 0;
    }
    forecastsByDate[dateKey] += forecast.predictedAmount;
  });

  // Sort dates
  const sortedDates = Object.keys(forecastsByDate).sort();
  const labels = sortedDates.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  });

  const forecastData = sortedDates.map(date => forecastsByDate[date]);

  // Create confidence interval data
  const upperBound = sortedDates.map(date => {
    const dayForecasts = currentData.forecasts.filter(f => f.date.toISOString().split('T')[0] === date);
    return dayForecasts.reduce((sum, f) => sum + f.confidenceInterval.upper, 0);
  });

  const lowerBound = sortedDates.map(date => {
    const dayForecasts = currentData.forecasts.filter(f => f.date.toISOString().split('T')[0] === date);
    return dayForecasts.reduce((sum, f) => sum + f.confidenceInterval.lower, 0);
  });

  charts.spendingForecast = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Predicted Spending',
          data: forecastData,
          borderColor: 'rgba(74, 144, 226, 1)',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          borderWidth: 3,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(74, 144, 226, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Upper Bound (95% CI)',
          data: upperBound,
          borderColor: 'rgba(74, 144, 226, 0.5)',
          backgroundColor: 'rgba(74, 144, 226, 0.05)',
          borderWidth: 1,
          borderDash: [2, 2],
          fill: false,
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: 'Lower Bound (95% CI)',
          data: lowerBound,
          borderColor: 'rgba(74, 144, 226, 0.5)',
          backgroundColor: 'rgba(74, 144, 226, 0.05)',
          borderWidth: 1,
          borderDash: [2, 2],
          fill: false,
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value.toLocaleString('en-IN');
            }
          }
        }
      }
    }
  });
}

// Render budget overspend warnings
function renderBudgetOverspendWarnings() {
  if (currentData.warnings.length === 0) {
    warningsSection.style.display = 'none';
    return;
  }

  warningsSection.style.display = 'block';
  warningsContainer.innerHTML = currentData.warnings.map(warning => `
    <div class="warning-card warning-${warning.severity}">
      <div class="warning-header">
        <h3 class="warning-category">${warning.category}</h3>
        <span class="warning-severity">${warning.severity.toUpperCase()}</span>
      </div>
      <div class="warning-details">
        <div class="warning-detail">
          <span class="label">Budgeted:</span>
          <span class="value">${formatCurrency(warning.budgetedAmount)}</span>
        </div>
        <div class="warning-detail">
          <span class="label">Projected:</span>
          <span class="value">${formatCurrency(warning.projectedAmount)}</span>
        </div>
        <div class="warning-detail">
          <span class="label">Overspend:</span>
          <span class="value negative">${formatCurrency(warning.overspendAmount)}</span>
        </div>
      </div>
      <div class="warning-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, (warning.projectedAmount / warning.budgetedAmount) * 100)}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// Render savings goal projections
function renderSavingsGoalProjections() {
  if (currentData.goals.length === 0) {
    goalsSection.style.display = 'none';
    return;
  }

  goalsSection.style.display = 'block';
  goalsContainer.innerHTML = currentData.goals.map(goal => `
    <div class="goal-card ${goal.willAchieve ? 'achievable' : 'at-risk'}">
      <div class="goal-header">
        <h3 class="goal-name">${goal.goalName}</h3>
        <span class="goal-status ${goal.willAchieve ? 'positive' : 'negative'}">
          ${goal.willAchieve ? '✓ On Track' : '⚠ At Risk'}
        </span>
      </div>
      <div class="goal-details">
        <div class="goal-detail">
          <span class="label">Target:</span>
          <span class="value">${formatCurrency(goal.targetAmount)}</span>
        </div>
        <div class="goal-detail">
          <span class="label">Projected:</span>
          <span class="value">${formatCurrency(goal.projectedAmount)}</span>
        </div>
        <div class="goal-detail">
          <span class="label">Days to Achieve:</span>
          <span class="value">${goal.daysToAchieve}</span>
        </div>
      </div>
      <div class="goal-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, (goal.projectedAmount / goal.targetAmount) * 100)}%"></div>
        </div>
        <span class="progress-text">${Math.round((goal.projectedAmount / goal.targetAmount) * 100)}%</span>
      </div>
    </div>
  `).join('');
}

// Render anomalies
function renderAnomalies() {
  if (currentData.anomalies.length === 0) {
    anomaliesSection.style.display = 'none';
    return;
  }

  anomaliesSection.style.display = 'block';
  anomaliesContainer.innerHTML = currentData.anomalies.map(anomaly => `
    <div class="anomaly-card">
      <div class="anomaly-header">
        <h3 class="anomaly-category">${anomaly.category}</h3>
        <span class="anomaly-deviation ${anomaly.deviation > 0 ? 'negative' : 'positive'}">
          ${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(1)}%
        </span>
      </div>
      <div class="anomaly-details">
        <div class="anomaly-detail">
          <span class="label">Amount:</span>
          <span class="value">${formatCurrency(anomaly.amount)}</span>
        </div>
        <div class="anomaly-detail">
          <span class="label">Reason:</span>
          <span class="value">${anomaly.reason}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Render spending patterns
function renderSpendingPatterns() {
  if (currentData.patterns.length === 0) {
    patternsSection.style.display = 'none';
    return;
  }

  patternsSection.style.display = 'block';
  patternsContainer.innerHTML = currentData.patterns.map(pattern => `
    <div class="pattern-card">
      <div class="pattern-header">
        <h3 class="pattern-category">${pattern.category}</h3>
        <span class="pattern-frequency">${pattern.frequency.charAt(0).toUpperCase() + pattern.frequency.slice(1)}</span>
      </div>
      <div class="pattern-details">
        <div class="pattern-detail">
          <span class="label">Average Amount:</span>
          <span class="value">${formatCurrency(pattern.averageAmount)}</span>
        </div>
        <div class="pattern-detail">
          <span class="label">Next Expected:</span>
          <span class="value">${new Date(pattern.nextExpectedDate).toLocaleDateString('en-IN')}</span>
        </div>
        <div class="pattern-detail">
          <span class="label">Confidence:</span>
          <span class="value">${(pattern.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div class="pattern-confidence">
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${pattern.confidence * 100}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// Render alerts (combine warnings and anomalies)
function renderAlerts() {
  const alerts = [];

  // Add high-severity warnings
  currentData.warnings.forEach(warning => {
    if (warning.severity === 'high') {
      alerts.push({
        type: 'warning',
        severity: 'high',
        title: `Budget Alert: ${warning.category}`,
        message: `Projected to overspend by ${formatCurrency(warning.overspendAmount)}`
      });
    }
  });

  // Add anomalies
  currentData.anomalies.slice(0, 3).forEach(anomaly => {
    alerts.push({
      type: 'anomaly',
      severity: 'medium',
      title: `Unusual Spending: ${anomaly.category}`,
      message: anomaly.reason
    });
  });

  if (alerts.length === 0) {
    alertsSection.style.display = 'none';
    return;
  }

  alertsSection.style.display = 'block';
  alertsContainer.innerHTML = alerts.map(alert => `
    <div class="alert alert-${alert.severity}">
      <div class="alert-icon">
        ${alert.severity === 'high' ? '⚠️' : 'ℹ️'}
      </div>
      <div class="alert-content">
        <h4 class="alert-title">${alert.title}</h4>
        <p class="alert-message">${alert.message}</p>
      </div>
    </div>
  `).join('');
}

// Initialize page when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
