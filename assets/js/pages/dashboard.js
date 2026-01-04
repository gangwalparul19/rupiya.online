// Dashboard Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import gamificationService from '../services/gamification-service.js';
import gamificationUI from '../components/gamification-ui.js';
import { formatCurrency, formatCurrencyCompact, formatDate, getRelativeTime, escapeHtml } from '../utils/helpers.js';

// Check authentication
async function checkAuth() {
  console.log('[Dashboard] Checking authentication...');
  
  try {
    // Wait for auth to initialize - this waits for Firebase to restore session
    const user = await authService.waitForAuth();
    console.log('[Dashboard] waitForAuth returned:', user ? user.email : 'null');
    
    if (!user) {
      console.log('[Dashboard] No user found, redirecting to login...');
      window.location.href = 'login.html';
      return false;
    }
    
    console.log('[Dashboard] User authenticated:', user.email);
    return true;
  } catch (error) {
    console.error('[Dashboard] Auth check error:', error);
    window.location.href = 'login.html';
    return false;
  }
}

// Initialize dashboard only after auth check
async function init() {
  console.log('[Dashboard] Initializing...');
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await initDashboard();
  }
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

// KPI elements
const incomeValue = document.getElementById('incomeValue');
const expenseValue = document.getElementById('expenseValue');
const cashflowValue = document.getElementById('cashflowValue');
const savingsValue = document.getElementById('savingsValue');
const incomeChange = document.getElementById('incomeChange');
const expenseChange = document.getElementById('expenseChange');
const cashflowChange = document.getElementById('cashflowChange');
const savingsChange = document.getElementById('savingsChange');

// Transactions list
const transactionsList = document.getElementById('transactionsList');

// Chart elements
const trendChart = document.getElementById('trendChart');
const categoryChart = document.getElementById('categoryChart');
const trendPeriod = document.getElementById('trendPeriod');
const categoryPeriod = document.getElementById('categoryPeriod');
const generateDataBtn = document.getElementById('generateDataBtn');

// Chart instances
let trendChartInstance = null;
let categoryChartInstance = null;

// Initialize dashboard
async function initDashboard() {
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
    
    // Initialize PWA install banner
    initPWAInstallBanner();
    
    // Load gamification data
    await loadGamificationWidget();
    
    // Update streak on login
    await gamificationService.updateStreak();
    
    // Load dashboard data
    await loadDashboardData();
  }
}

// Load gamification widget
async function loadGamificationWidget() {
  try {
    const data = await gamificationService.getUserGamification();
    if (!data) return;
    
    const level = gamificationService.calculateLevel(data.points);
    const nextLevel = gamificationService.getNextLevel(data.points);
    
    // Update widget elements
    const levelIcon = document.getElementById('dashLevelIcon');
    const levelName = document.getElementById('dashLevelName');
    const levelNumber = document.getElementById('dashLevelNumber');
    const totalPoints = document.getElementById('dashTotalPoints');
    const progressText = document.getElementById('dashProgressText');
    const streakDisplay = document.getElementById('dashStreakDisplay');
    const levelProgress = document.getElementById('dashLevelProgress');
    
    if (levelIcon) levelIcon.textContent = level.icon;
    if (levelName) levelName.textContent = level.name;
    if (levelNumber) levelNumber.textContent = level.level;
    if (totalPoints) totalPoints.textContent = data.points;
    if (streakDisplay) streakDisplay.textContent = `🔥 ${data.streak?.current || 0}`;
    
    if (nextLevel) {
      const currentLevelMin = level.minPoints;
      const progress = ((data.points - currentLevelMin) / (nextLevel.minPoints - currentLevelMin)) * 100;
      if (progressText) progressText.textContent = `${nextLevel.pointsNeeded} pts to ${nextLevel.name}`;
      if (levelProgress) levelProgress.style.width = `${Math.min(progress, 100)}%`;
    } else {
      if (progressText) progressText.textContent = 'Max level reached! 🌟';
      if (levelProgress) levelProgress.style.width = '100%';
    }
  } catch (error) {
    console.error('Error loading gamification widget:', error);
  }
}

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('dashboardSubtitle');
  
  if (context.context === 'family' && context.group) {
    subtitle.textContent = `Financial overview for ${context.group.name}`;
  } else {
    subtitle.textContent = "Welcome back! Here's your financial overview.";
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    console.log('Loading dashboard data...');
    
    // Get current month data
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Use optimized monthly summary queries (cached)
    console.log('Fetching monthly summaries...');
    const [currentSummary, lastSummary, goals, recurring] = await Promise.all([
      firestoreService.getMonthlySummary(currentYear, currentMonth),
      firestoreService.getMonthlySummary(currentYear, currentMonth - 1),
      firestoreService.getGoals ? firestoreService.getGoals() : Promise.resolve([]),
      firestoreService.getRecurring ? firestoreService.getRecurring() : Promise.resolve([])
    ]);
    
    // Get limited expenses/income for charts (last 6 months only)
    const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
    const [expenses, income] = await Promise.all([
      firestoreService.getExpenses(200), // Limit to 200 for charts
      firestoreService.getIncome(200)
    ]);
    
    console.log('Current month summary:', currentSummary);
    
    // Define date range for current month (used by widgets)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    // Use pre-calculated summaries
    const currentMonthExpenses = currentSummary.totalExpenses;
    const currentMonthIncome = currentSummary.totalIncome;
    const lastMonthExpenses = lastSummary.totalExpenses;
    const lastMonthIncome = lastSummary.totalIncome;
    
    // Calculate metrics
    const cashFlow = currentMonthIncome - currentMonthExpenses;
    const savingsRate = currentMonthIncome > 0 ? (cashFlow / currentMonthIncome) * 100 : 0;
    
    // Calculate changes
    const incomeChangePercent = lastMonthIncome > 0 
      ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 
      : 0;
    const expenseChangePercent = lastMonthExpenses > 0 
      ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0;
    
    // Update KPIs with compact format
    incomeValue.textContent = formatCurrencyCompact(currentMonthIncome);
    expenseValue.textContent = formatCurrencyCompact(currentMonthExpenses);
    cashflowValue.textContent = formatCurrencyCompact(cashFlow);
    savingsValue.textContent = `${savingsRate.toFixed(1)}%`;
    
    // Update tooltips with full amounts
    const incomeKpi = document.getElementById('incomeKpi');
    const expenseKpi = document.getElementById('expenseKpi');
    const cashflowKpi = document.getElementById('cashflowKpi');
    const savingsKpi = document.getElementById('savingsKpi');
    
    if (incomeKpi) incomeKpi.setAttribute('data-tooltip', formatCurrency(currentMonthIncome));
    if (expenseKpi) expenseKpi.setAttribute('data-tooltip', formatCurrency(currentMonthExpenses));
    if (cashflowKpi) cashflowKpi.setAttribute('data-tooltip', formatCurrency(cashFlow));
    if (savingsKpi) savingsKpi.setAttribute('data-tooltip', `${savingsRate.toFixed(2)}%`);
    
    // Update changes
    updateChange(incomeChange, incomeChangePercent, 'positive');
    updateChange(expenseChange, expenseChangePercent, 'negative');
    updateCashflowChange(cashFlow);
    updateSavingsChange(savingsRate);
    
    // Check for spending alerts
    checkSpendingAlerts(currentMonthExpenses, lastMonthExpenses);
    
    // Load widgets
    loadTopCategoriesWidget(expenses, firstDayOfMonth, lastDayOfMonth);
    loadUpcomingBillsWidget(recurring);
    loadGoalProgressWidget(goals);
    
    // Load recent transactions
    loadRecentTransactions(expenses, income);
    
    // Load charts
    createTrendChart(expenses, income, 6);
    createCategoryChart(expenses, 'current');
    
    console.log('Dashboard data loaded successfully');
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    console.error('Error details:', error.message, error.code);
    toast.error('Failed to load dashboard data: ' + error.message);
  }
}

// Check for spending alerts
function checkSpendingAlerts(currentExpenses, lastMonthExpenses) {
  const alertEl = document.getElementById('spendingAlert');
  const alertTitle = document.getElementById('alertTitle');
  const alertText = document.getElementById('alertText');
  const closeBtn = document.getElementById('closeSpendingAlert');
  
  if (!alertEl) return;
  
  // Check if spending exceeds last month by 20%
  if (lastMonthExpenses > 0 && currentExpenses > lastMonthExpenses * 1.2) {
    const percentOver = ((currentExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(0);
    alertTitle.textContent = '⚠️ High Spending Alert';
    alertText.textContent = `You've spent ${percentOver}% more than last month. Consider reviewing your expenses.`;
    alertEl.style.display = 'flex';
    alertEl.classList.add('warning');
  }
  
  // Close button handler
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      alertEl.style.display = 'none';
    });
  }
}

// Load top spending categories widget
function loadTopCategoriesWidget(expenses, startDate, endDate) {
  const container = document.getElementById('topCategoriesList');
  if (!container) return;
  
  // Filter current month expenses
  const monthExpenses = expenses.filter(e => {
    const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
    return date >= startDate && date <= endDate;
  });
  
  // Group by category
  const categoryTotals = {};
  monthExpenses.forEach(e => {
    const cat = e.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });
  
  // Sort and get top 5
  const sorted = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (sorted.length === 0) {
    container.innerHTML = '<p style="color: #7F8C8D; text-align: center; padding: 1rem;">No expenses this month</p>';
    return;
  }
  
  const maxAmount = sorted[0][1];
  const colors = ['#4A90E2', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6'];
  
  container.innerHTML = sorted.map(([cat, amount], i) => {
    const percent = (amount / maxAmount * 100).toFixed(0);
    return `
      <div class="category-bar">
        <div class="category-bar-header">
          <span class="category-bar-name">${cat}</span>
          <span class="category-bar-amount">${formatCurrencyCompact(amount)}</span>
        </div>
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width: ${percent}%; background: ${colors[i % colors.length]};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Load upcoming bills widget
function loadUpcomingBillsWidget(recurring) {
  const container = document.getElementById('upcomingBillsList');
  if (!container) return;
  
  // Filter upcoming bills (next 7 days)
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const upcomingBills = recurring
    .filter(r => r.type === 'expense' && r.isActive !== false)
    .map(r => {
      // Calculate next due date based on frequency
      let nextDue = r.nextDueDate?.toDate ? r.nextDueDate.toDate() : new Date(r.nextDueDate || r.startDate);
      return { ...r, nextDue };
    })
    .filter(r => r.nextDue >= now && r.nextDue <= nextWeek)
    .sort((a, b) => a.nextDue - b.nextDue)
    .slice(0, 5);
  
  if (upcomingBills.length === 0) {
    container.innerHTML = '<p style="color: #7F8C8D; text-align: center; padding: 1rem;">No upcoming bills this week</p>';
    return;
  }
  
  container.innerHTML = upcomingBills.map(bill => {
    const daysUntil = Math.ceil((bill.nextDue - now) / (1000 * 60 * 60 * 24));
    const dueClass = daysUntil === 0 ? 'today' : daysUntil < 0 ? 'overdue' : '';
    const dueText = daysUntil === 0 ? 'Due today' : daysUntil < 0 ? 'Overdue' : `Due in ${daysUntil} days`;
    
    return `
      <div class="bill-item">
        <div class="bill-icon">📄</div>
        <div class="bill-info">
          <div class="bill-name">${bill.description || bill.category}</div>
          <div class="bill-due ${dueClass}">${dueText}</div>
        </div>
        <div class="bill-amount">${formatCurrencyCompact(bill.amount)}</div>
      </div>
    `;
  }).join('');
}

// Load goal progress widget
function loadGoalProgressWidget(goals) {
  const widget = document.getElementById('goalProgressWidget');
  if (!widget || !goals || goals.length === 0) return;
  
  // Get the first active goal
  const activeGoal = goals.find(g => g.status !== 'completed') || goals[0];
  if (!activeGoal) return;
  
  const current = activeGoal.currentAmount || 0;
  const target = activeGoal.targetAmount || 1;
  const percent = Math.min((current / target) * 100, 100);
  
  document.getElementById('goalName').textContent = activeGoal.name || 'Savings Goal';
  document.getElementById('goalPercent').textContent = `${percent.toFixed(0)}%`;
  document.getElementById('goalProgressFill').style.width = `${percent}%`;
  document.getElementById('goalCurrent').textContent = formatCurrencyCompact(current);
  document.getElementById('goalTarget').textContent = `of ${formatCurrencyCompact(target)}`;
  
  widget.style.display = 'block';
}

// Update change indicator
function updateChange(element, percent, positiveClass) {
  const isPositive = percent > 0;
  const isNegative = percent < 0;
  
  element.className = 'kpi-change';
  if (isPositive) element.classList.add(positiveClass);
  if (isNegative) element.classList.add(positiveClass === 'positive' ? 'negative' : 'positive');
  
  const arrow = isPositive ? '↑' : isNegative ? '↓' : '→';
  const text = percent === 0 ? 'No change' : `${Math.abs(percent).toFixed(1)}% from last month`;
  
  element.innerHTML = `<span>${arrow}</span><span>${text}</span>`;
}

// Update cashflow change
function updateCashflowChange(cashFlow) {
  cashflowChange.className = 'kpi-change';
  if (cashFlow > 0) {
    cashflowChange.classList.add('positive');
    cashflowChange.innerHTML = '<span>↑</span><span>Positive balance</span>';
  } else if (cashFlow < 0) {
    cashflowChange.classList.add('negative');
    cashflowChange.innerHTML = '<span>↓</span><span>Negative balance</span>';
  } else {
    cashflowChange.innerHTML = '<span>→</span><span>Break even</span>';
  }
}

// Update savings change
function updateSavingsChange(savingsRate) {
  savingsChange.className = 'kpi-change';
  if (savingsRate >= 20) {
    savingsChange.classList.add('positive');
    savingsChange.innerHTML = '<span>↑</span><span>Excellent savings</span>';
  } else if (savingsRate >= 10) {
    savingsChange.classList.add('positive');
    savingsChange.innerHTML = '<span>↑</span><span>Good progress</span>';
  } else if (savingsRate > 0) {
    savingsChange.innerHTML = '<span>→</span><span>Keep improving</span>';
  } else {
    savingsChange.classList.add('negative');
    savingsChange.innerHTML = '<span>↓</span><span>Need to save more</span>';
  }
}

// Load recent transactions
function loadRecentTransactions(expenses, income) {
  // Combine and sort by date
  const allTransactions = [
    ...expenses.map(e => ({ ...e, type: 'expense' })),
    ...income.map(i => ({ ...i, type: 'income' }))
  ].sort((a, b) => {
    const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
    const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
    return dateB - dateA;
  }).slice(0, 10); // Get last 10 transactions
  
  if (allTransactions.length === 0) {
    // Show empty state (already in HTML)
    return;
  }
  
  // Build transactions HTML
  const html = `
    <div class="transaction-list">
      ${allTransactions.map(t => {
        const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
        const icon = t.type === 'expense' ? '💸' : '💰';
        const amountClass = t.type === 'expense' ? 'expense' : 'income';
        const amountPrefix = t.type === 'expense' ? '-' : '+';
        
        return `
          <div class="transaction-item">
            <div class="transaction-icon">${icon}</div>
            <div class="transaction-details">
              <div class="transaction-title">${escapeHtml(t.description || t.category || 'Transaction')}</div>
              <div class="transaction-meta">${escapeHtml(t.category || t.source || 'Uncategorized')} • ${getRelativeTime(date)}</div>
            </div>
            <div class="transaction-amount ${amountClass}">${amountPrefix}${formatCurrency(t.amount)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  transactionsList.innerHTML = html;
}

// Sidebar toggle (mobile)
if (sidebarOpen) {
  sidebarOpen.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });
}

if (sidebarClose) {
  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
}

// Theme toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const newTheme = themeManager.toggleTheme();
    toast.success(`Switched to ${newTheme} mode`);
  });
}

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

// Chart Functions
function createTrendChart(expenses, income, months = 6) {
  const ctx = trendChart.getContext('2d');
  
  // Destroy existing chart
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }
  
  // Get last N months data
  const now = new Date();
  const labels = [];
  const expenseData = [];
  const incomeData = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    labels.push(monthName);
    
    // Calculate expenses for this month
    const monthExpenses = expenses
      .filter(e => {
        const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
        return expenseDate.getMonth() === date.getMonth() && 
               expenseDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate income for this month
    const monthIncome = income
      .filter(i => {
        const incomeDate = i.date.toDate ? i.date.toDate() : new Date(i.date);
        return incomeDate.getMonth() === date.getMonth() && 
               incomeDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, i) => sum + i.amount, 0);
    
    expenseData.push(monthExpenses);
    incomeData.push(monthIncome);
  }
  
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#27AE60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#E74C3C',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              family: "'Inter', sans-serif"
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += '₹' + context.parsed.y.toLocaleString('en-IN');
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + (value / 1000) + 'k';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function createCategoryChart(expenses, period = 'current') {
  const ctx = categoryChart.getContext('2d');
  
  // Destroy existing chart
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  
  // Filter expenses based on period
  let filteredExpenses = expenses;
  const now = new Date();
  
  if (period === 'current') {
    filteredExpenses = expenses.filter(e => {
      const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear();
    });
  } else if (period === 'last') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    filteredExpenses = expenses.filter(e => {
      const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return date.getMonth() === lastMonth.getMonth() && 
             date.getFullYear() === lastMonth.getFullYear();
    });
  }
  
  // Group by category
  const categoryTotals = {};
  filteredExpenses.forEach(e => {
    const category = e.category || 'Uncategorized';
    categoryTotals[category] = (categoryTotals[category] || 0) + e.amount;
  });
  
  // Sort by amount and get top 8
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  
  const labels = sortedCategories.map(c => c[0]);
  const data = sortedCategories.map(c => c[1]);
  
  // Generate colors
  const colors = [
    '#4A90E2', '#27AE60', '#E74C3C', '#F39C12', 
    '#9B59B6', '#3498DB', '#E67E22', '#1ABC9C'
  ];
  
  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 11,
              family: "'Inter', sans-serif"
            },
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Chart period change handlers
trendPeriod.addEventListener('change', async () => {
  try {
    const [expenses, income] = await Promise.all([
      firestoreService.getExpenses(),
      firestoreService.getIncome()
    ]);
    createTrendChart(expenses, income, parseInt(trendPeriod.value));
  } catch (error) {
    console.error('Error updating trend chart:', error);
  }
});

categoryPeriod.addEventListener('change', async () => {
  try {
    const expenses = await firestoreService.getExpenses();
    createCategoryChart(expenses, categoryPeriod.value);
  } catch (error) {
    console.error('Error updating category chart:', error);
  }
});



// PWA Install Banner
function initPWAInstallBanner() {
  const banner = document.getElementById('pwaInstallBannerDashboard');
  const installBtn = document.getElementById('dashboardInstallAppBtn');
  const closeBtn = document.getElementById('closePwaBannerDashboard');
  const mobileInstallBtn = document.getElementById('dashboardInstallBtn');
  
  let deferredPrompt;
  
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    // Already installed, don't show banner
    return;
  }
  
  // Check if user dismissed the banner before
  const bannerDismissed = localStorage.getItem('pwaBannerDismissed');
  if (bannerDismissed === 'true') {
    return;
  }
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show the banner
    if (banner) {
      banner.style.display = 'block';
    }
    
    // Show mobile install button
    if (mobileInstallBtn) {
      mobileInstallBtn.style.display = 'flex';
    }
  });
  
  // Install button click handler
  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      toast.success('App installed successfully!');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt
    deferredPrompt = null;
    
    // Hide the banner
    if (banner) {
      banner.style.display = 'none';
    }
    
    // Hide mobile install button
    if (mobileInstallBtn) {
      mobileInstallBtn.style.display = 'none';
    }
  };
  
  // Attach click handlers
  if (installBtn) {
    installBtn.addEventListener('click', handleInstall);
  }
  
  if (mobileInstallBtn) {
    mobileInstallBtn.addEventListener('click', handleInstall);
  }
  
  // Close button handler
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (banner) {
        banner.style.display = 'none';
      }
      // Remember that user dismissed the banner
      localStorage.setItem('pwaBannerDismissed', 'true');
    });
  }
  
  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    toast.success('App installed! You can now use Rupiya offline.');
    
    // Hide the banner
    if (banner) {
      banner.style.display = 'none';
    }
    
    // Hide mobile install button
    if (mobileInstallBtn) {
      mobileInstallBtn.style.display = 'none';
    }
    
    // Clear the deferredPrompt
    deferredPrompt = null;
  });
}
