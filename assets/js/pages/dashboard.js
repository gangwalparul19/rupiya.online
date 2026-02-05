// Dashboard Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import themeManager from '../utils/theme-manager.js';
import setupWizard from '../components/setup-wizard.js';
import recurringProcessor from '../services/recurring-processor.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import { formatCurrency, formatCurrencyCompact, getRelativeTime, escapeHtml } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import logger from '../utils/logger.js';
import kpiEnhancer from '../utils/kpi-enhancements.js';
import TransactionListEnhancer from '../utils/transaction-list-enhancements.js';
import { setupAutoCacheClear } from '../utils/cache-buster.js';
import lazyLoader from '../utils/lazy-loader.js';

const log = logger.create('Dashboard');

// Setup automatic cache clearing on version change
setupAutoCacheClear();

// Preload commonly used modules during idle time
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    lazyLoader.preload([
      { type: 'service', name: 'investment-analytics-service' },
      { type: 'util', name: 'ai-insights-engine' }
    ]);
  }, { timeout: 2000 });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(() => {
    lazyLoader.preload([
      { type: 'service', name: 'investment-analytics-service' },
      { type: 'util', name: 'ai-insights-engine' }
    ]);
  }, 2000);
}

// Check authentication
async function checkAuth() {
  log.log('Checking authentication...');
  
  try {
    // Wait for auth to initialize - this waits for Firebase to restore session
    const user = await authService.waitForAuth();
    log.log('waitForAuth returned:', user ? user.email : 'null');
    
    if (!user) {
      log.log('No user found, redirecting to login...');
      window.location.href = 'login.html';
      return false;
    }
    
    log.log('User authenticated:', user.email);
    return true;
  } catch (error) {
    log.error('Auth check error:', error);
    window.location.href = 'login.html';
    return false;
  }
}

// Check if first-time user needs setup
async function checkFirstTimeSetup() {
  try {
    const needsSetup = await setupWizard.needsSetup();
    if (needsSetup) {
      log.log('First-time user detected, showing setup wizard');
      setupWizard.show();
    }
  } catch (error) {
    log.error('Error checking setup status:', error);
  }
}

// Initialize dashboard only after auth check
async function init() {
  log.log('Initializing...');
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    // Check if encryption reauth is needed (after page refresh)
    const needsReauth = await encryptionReauthModal.checkAndPrompt(async () => {
      // On successful reauth, reload dashboard data
      await loadDashboardData();
    });
    
    if (!needsReauth) {
      // No reauth needed, proceed normally
      await initDashboard();
      // Check for first-time setup after dashboard loads
      await checkFirstTimeSetup();
    } else {
      // Show basic UI while waiting for reauth
      await initDashboard();
    }
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

const trendChart = document.getElementById('trendChart');
const categoryChart = document.getElementById('categoryChart');
const trendPeriod = document.getElementById('trendPeriod');
const categoryPeriod = document.getElementById('categoryPeriod');

// Chart instances
let trendChartInstance = null;
let categoryChartInstance = null;

// Initialize dashboard
async function initDashboard() {
  const user = authService.getCurrentUser();
  
  if (user) {
    try {
      // Load user profile
      loadUserProfile(user);
      
      // Initialize PWA install banner
      initPWAInstallBanner();
      
      // Process recurring transactions (runs once per day)
      await processRecurringTransactions();
      
      // Load dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('[Dashboard] Error initializing dashboard:', error);
      toast.error('Failed to load dashboard. Please refresh the page.');
    }
  }
}

// Load user profile
function loadUserProfile(user) {
  if (!user) return;
  
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userName) {
    userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
  }
  
  if (userEmail) {
    userEmail.textContent = user.email || '';
  }
  
  if (userAvatar) {
    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
    } else {
      const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }
  }
}

// Process recurring transactions
async function processRecurringTransactions() {
  try {
    const result = await recurringProcessor.processRecurring();
    
    if (result.processed > 0) {
      log.log(`Processed ${result.processed} recurring transactions`);
      toast.success(`${result.processed} recurring transaction(s) added automatically`);
      
      // Refresh dashboard data to show new transactions
      log.log('Refreshing dashboard data after processing recurring transactions');
      await loadDashboardData();
    } else if (result.skipped) {
      log.log('Recurring transactions already processed today');
    } else if (result.error) {
      log.error('Error processing recurring:', result.error);
    }
  } catch (error) {
    log.error('Error in recurring processor:', error);
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    log.log('Loading dashboard data...');
    
    // Get current month data
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Use optimized monthly summary queries (cached)
    log.log('Fetching monthly summaries and all-time data...');
    const [currentSummary, lastSummary, recurring, allExpenses, allIncome] = await Promise.all([
      firestoreService.getMonthlySummary(currentYear, currentMonth),
      firestoreService.getMonthlySummary(currentYear, currentMonth - 1),
      firestoreService.getRecurring ? firestoreService.getRecurring() : Promise.resolve([]),
      firestoreService.getExpenses(10000), // Get up to 10000 expenses for overall KPIs
      firestoreService.getIncome(10000) // Get up to 10000 income for overall KPIs
    ]);
    
    // Get limited expenses/income/splits for charts (last 6 months only)
    const [expenses, income, splits] = await Promise.all([
      firestoreService.getExpenses(200), // Limit to 200 for charts
      firestoreService.getIncome(200),
      firestoreService.getSplits ? firestoreService.getSplits() : Promise.resolve([])
    ]);
    
    log.log('Current month summary:', currentSummary);
    
    // Define date range for current month (used by widgets)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    // Calculate OVERALL (all-time) totals for KPIs
    const overallIncome = allIncome.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const overallExpenses = allExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const overallCashFlow = overallIncome - overallExpenses;
    const overallSavingsRate = overallIncome > 0 ? (overallCashFlow / overallIncome) * 100 : 0;
    
    // Log overall totals for debugging
    log.log('Overall Income:', overallIncome, 'from', allIncome.length, 'income entries');
    log.log('Overall Expenses:', overallExpenses, 'from', allExpenses.length, 'expense entries');
    log.log('Overall Cash Flow:', overallCashFlow);
    log.log('Overall Savings Rate:', overallSavingsRate.toFixed(2) + '%');
    
    // Use pre-calculated summaries for month-over-month comparison
    const currentMonthExpenses = currentSummary.totalExpenses;
    const currentMonthIncome = currentSummary.totalIncome;
    const lastMonthExpenses = lastSummary.totalExpenses;
    const lastMonthIncome = lastSummary.totalIncome;
    
    // Calculate changes (comparing current month vs last month)
    const incomeChangePercent = lastMonthIncome > 0 
      ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 
      : 0;
    const expenseChangePercent = lastMonthExpenses > 0 
      ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0;
    
    // Update KPIs with OVERALL amounts (compact format)
    if (incomeValue) incomeValue.textContent = formatCurrencyCompact(overallIncome);
    if (expenseValue) expenseValue.textContent = formatCurrencyCompact(overallExpenses);
    if (cashflowValue) cashflowValue.textContent = formatCurrencyCompact(overallCashFlow);
    if (savingsValue) savingsValue.textContent = `${overallSavingsRate.toFixed(1)}%`;
    
    log.log('KPI values updated:', {
      income: incomeValue?.textContent,
      expense: expenseValue?.textContent,
      cashflow: cashflowValue?.textContent,
      savings: savingsValue?.textContent
    });
    
    // Update tooltips with full amounts
    const incomeKpi = document.getElementById('incomeKpi');
    const expenseKpi = document.getElementById('expenseKpi');
    const cashflowKpi = document.getElementById('cashflowKpi');
    const savingsKpi = document.getElementById('savingsKpi');
    
    if (incomeKpi) incomeKpi.setAttribute('data-tooltip', `Overall: ${formatCurrency(overallIncome)}`);
    if (expenseKpi) expenseKpi.setAttribute('data-tooltip', `Overall: ${formatCurrency(overallExpenses)}`);
    if (cashflowKpi) cashflowKpi.setAttribute('data-tooltip', `Overall: ${formatCurrency(overallCashFlow)}`);
    if (savingsKpi) savingsKpi.setAttribute('data-tooltip', `Overall: ${overallSavingsRate.toFixed(2)}%`);
    
    // Reinitialize tooltips after data is set
    if (window.kpiTooltipManager) {
      window.kpiTooltipManager.reinitializeTooltips();
    }
    
    // Initialize KPI enhancements
    kpiEnhancer.initCard('incomeKpi', { showSparkline: true, showDetails: true, detailsLink: 'income.html' });
    kpiEnhancer.initCard('expenseKpi', { showSparkline: true, showDetails: true, detailsLink: 'expenses.html' });
    kpiEnhancer.initCard('cashflowKpi', { showSparkline: false, showDetails: true });
    kpiEnhancer.initCard('savingsKpi', { showSparkline: false, showDetails: false });
    
    // Update changes (still showing month-over-month comparison)
    updateChange(incomeChange, incomeChangePercent, 'positive');
    updateChange(expenseChange, expenseChangePercent, 'negative');
    updateCashflowChange(overallCashFlow);
    updateSavingsChange(overallSavingsRate);
    
    // Update Savings Rate Widget (using current month data)
    const currentMonthCashFlow = currentMonthIncome - currentMonthExpenses;
    const currentMonthSavingsRate = currentMonthIncome > 0 ? (currentMonthCashFlow / currentMonthIncome) * 100 : 0;
    updateSavingsRateWidget(currentMonthIncome, currentMonthExpenses, currentMonthCashFlow, currentMonthSavingsRate);
    
    // Load Monthly Savings Trend Widget
    await loadMonthlySavingsTrendWidget(expenses, income);
    
    // Check for spending alerts
    checkSpendingAlerts(currentMonthExpenses, lastMonthExpenses);
    
    // Load widgets
    loadTopCategoriesWidget(expenses, splits, firstDayOfMonth, lastDayOfMonth);
    loadUpcomingBillsWidget(recurring);
    
    // Load recent transactions (include splits)
    loadRecentTransactions(expenses, income, splits);
    
    // Load charts (include splits in category chart)
    createTrendChart(expenses, income, 6, splits);
    createCategoryChart(expenses, 'current', splits);
    
    log.log('Dashboard data loaded successfully');
    
  } catch (error) {
    log.error('Error loading dashboard data:', error);
    log.error('Error details:', error.message, error.code);
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
function loadTopCategoriesWidget(expenses, splits, startDate, endDate) {
  const container = document.getElementById('topCategoriesList');
  if (!container) return;
    
  // Filter current month expenses (with null check for date)
  const monthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    let date;
    if (e.date instanceof Date) {
      date = e.date;
    } else if (e.date.toDate && typeof e.date.toDate === 'function') {
      date = e.date.toDate();
    } else if (typeof e.date === 'string') {
      date = new Date(e.date);
    } else {
      return false;
    }
    return date >= startDate && date <= endDate;
  });
    
  // Filter current month splits and convert to expense-like objects
  const monthSplits = (splits || []).filter(s => {
    if (!s.date) return false;
    let date;
    if (s.date instanceof Date) {
      date = s.date;
    } else if (s.date.toDate && typeof s.date.toDate === 'function') {
      date = s.date.toDate();
    } else if (typeof s.date === 'string') {
      date = new Date(s.date);
    } else {
      return false;
    }
    return date >= startDate && date <= endDate;
  });
  
  // Group by category (parse amount as number)
  const categoryTotals = {};
  monthExpenses.forEach(e => {
    const cat = e.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
  });
    
  // Add split expenses to categories (your share only)
  monthSplits.forEach(split => {
    const myShare = split.participants?.find(p => p.name === 'Me');
    const myAmount = myShare ? parseFloat(myShare.amount) || 0 : 0;
    if (myAmount > 0) {
      const cat = split.category || 'Split Expense';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + myAmount;
    }
  });
  
  // Sort and get top 5
  const sorted = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  log.log('Top 5 categories:', sorted);
  
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
    .filter(r => r.type === 'expense' && r.status === 'active')
    .map(r => {
      // Calculate next due date based on frequency
      let nextDue;
      if (r.nextDueDate) {
        nextDue = r.nextDueDate?.toDate ? r.nextDueDate.toDate() : new Date(r.nextDueDate);
      } else {
        // Calculate next due date from start date and frequency
        nextDue = calculateNextDueDate(r);
      }
      return { ...r, nextDue };
    })
    .filter(r => r.nextDue && r.nextDue >= now && r.nextDue <= nextWeek)
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
    const billName = escapeHtml(bill.description || bill.category || 'Unnamed');
    const billAmount = parseFloat(bill.amount) || 0;
    
    return `
      <div class="bill-item">
        <div class="bill-icon">📄</div>
        <div class="bill-info">
          <div class="bill-name">${billName}</div>
          <div class="bill-due ${dueClass}">${dueText}</div>
        </div>
        <div class="bill-amount">${formatCurrencyCompact(billAmount)}</div>
      </div>
    `;
  }).join('');
}

// Calculate next due date for recurring transaction
function calculateNextDueDate(recurring) {
  const startDate = recurring.startDate?.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
  const today = new Date();
  let nextDate = new Date(startDate);
  
  // Calculate next occurrence based on frequency
  while (nextDate < today) {
    switch (recurring.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }
  
  return nextDate;
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

// Update Savings Rate Widget
function updateSavingsRateWidget(income, expenses, saved, rate) {
  const valueEl = document.getElementById('savingsRateValue');
  const fillEl = document.getElementById('savingsRateFill');
  const incomeEl = document.getElementById('srIncome');
  const expensesEl = document.getElementById('srExpenses');
  const savedEl = document.getElementById('srSaved');
  const tipEl = document.getElementById('savingsRateTip');
  
  if (!valueEl) return;
  
  // Update values
  valueEl.textContent = `${rate.toFixed(1)}%`;
  incomeEl.textContent = formatCurrencyCompact(income);
  expensesEl.textContent = formatCurrencyCompact(expenses);
  savedEl.textContent = formatCurrencyCompact(saved);
  
  // Update saved value color
  if (saved >= 0) {
    savedEl.classList.add('positive');
    savedEl.classList.remove('negative');
  } else {
    savedEl.classList.add('negative');
    savedEl.classList.remove('positive');
  }
  
  // Update progress bar (cap at 50% for visual)
  const fillWidth = Math.min(Math.max(rate, 0), 50) * 2;
  fillEl.style.width = `${fillWidth}%`;
  
  // Update tip based on rate
  if (rate >= 30) {
    tipEl.textContent = '🌟 Outstanding! You\'re saving like a pro!';
  } else if (rate >= 20) {
    tipEl.textContent = '✨ Excellent! You\'re on track for financial freedom';
  } else if (rate >= 10) {
    tipEl.textContent = '👍 Good start! Try to reach 20% for better security';
  } else if (rate > 0) {
    tipEl.textContent = '💪 Keep going! Small savings add up over time';
  } else {
    tipEl.textContent = '⚠️ Try to reduce expenses to start saving';
  }
}

// Load Weekly Savings Trend Widget
async function loadMonthlySavingsTrendWidget(expenses, income) {
  const changeEl = document.getElementById('savingsTrendChange');
  const currentWeekEl = document.getElementById('currentMonthSavings');
  const lastWeekEl = document.getElementById('lastMonthSavings');
  const avgEl = document.getElementById('avgSavings');
  const chartCanvas = document.getElementById('savingsTrendMiniChart');
  
  if (!changeEl || !chartCanvas) return;
  
  // Calculate savings for last 8 weeks
  const now = new Date();
  const weeklyData = [];
  
  // Helper function to get week start (Monday) and end (Sunday)
  function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  }
  
  // Get week label (e.g., "W1", "W2", etc. or "Jan 1-7")
  function getWeekLabel(weekStart, weeksAgo) {
    if (weeksAgo === 0) return 'This Week';
    if (weeksAgo === 1) return 'Last Week';
    const month = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const day = weekStart.getDate();
    return `${month} ${day}`;
  }
  
  for (let i = 7; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - (i * 7));
    
    const { start: weekStart, end: weekEnd } = getWeekRange(weekDate);
    
    // Calculate income for this week
    const weekIncome = income
      .filter(item => {
        const itemDate = item.date.toDate ? item.date.toDate() : new Date(item.date);
        return itemDate >= weekStart && itemDate <= weekEnd;
      })
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // Calculate expenses for this week
    const weekExpenses = expenses
      .filter(item => {
        const itemDate = item.date.toDate ? item.date.toDate() : new Date(item.date);
        return itemDate >= weekStart && itemDate <= weekEnd;
      })
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    const savings = weekIncome - weekExpenses;
    
    weeklyData.push({
      week: getWeekLabel(weekStart, i),  // i represents weeks ago (7 = 7 weeks ago, 0 = this week)
      savings: savings,
      weekStart: weekStart
    });
  }
  
  // Get current week, last week, and 4-week average
  const currentWeekSavings = weeklyData[7]?.savings || 0;
  const lastWeekSavings = weeklyData[6]?.savings || 0;
  const last4WeeksAvg = weeklyData.slice(4, 8).reduce((sum, w) => sum + w.savings, 0) / 4;
  
  // Calculate change percentage
  let changePercent = 0;
  let changeDirection = 'neutral';
  let changeArrow = '→';
  
  if (lastWeekSavings !== 0) {
    changePercent = ((currentWeekSavings - lastWeekSavings) / Math.abs(lastWeekSavings)) * 100;
    if (changePercent > 0) {
      changeDirection = 'positive';
      changeArrow = '↑';
    } else if (changePercent < 0) {
      changeDirection = 'negative';
      changeArrow = '↓';
    }
  } else if (currentWeekSavings > 0) {
    changeDirection = 'positive';
    changeArrow = '↑';
    changePercent = 100;
  } else if (currentWeekSavings < 0) {
    changeDirection = 'negative';
    changeArrow = '↓';
    changePercent = 100;
  }
  
  // Update UI
  changeEl.className = `monthly-savings-trend-change ${changeDirection}`;
  changeEl.innerHTML = `
    <span class="trend-arrow">${changeArrow}</span>
    <span class="trend-text">${Math.abs(changePercent).toFixed(0)}%</span>
  `;
  
  currentWeekEl.textContent = formatCurrencyCompact(currentWeekSavings);
  lastWeekEl.textContent = formatCurrencyCompact(lastWeekSavings);
  avgEl.textContent = formatCurrencyCompact(last4WeeksAvg);
  
  // Create mini chart
  const ctx = chartCanvas.getContext('2d');
  
  // Destroy existing chart if it exists
  if (window.savingsTrendChart) {
    window.savingsTrendChart.destroy();
  }
  
  // Reverse the data so newest is on the right
  const reversedData = [...weeklyData].reverse();
  
  window.savingsTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: reversedData.map(w => w.week),
      datasets: [{
        label: 'Savings',
        data: reversedData.map(w => w.savings),
        borderColor: currentWeekSavings >= 0 ? '#4ade80' : '#f87171',
        backgroundColor: currentWeekSavings >= 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 10
            },
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 10
            },
            callback: function(value) {
              return formatCurrencyCompact(value);
            }
          }
        }
      }
    }
  });
}

// Load recent transactions
function loadRecentTransactions(expenses, income, splits) {
  // Convert splits to transaction-like objects
  const splitTransactions = (splits || []).map(split => {
    const myShare = split.participants?.find(p => p.name === 'Me');
    const myAmount = myShare ? parseFloat(myShare.amount) || 0 : 0;
    return {
      ...split,
      amount: myAmount,
      type: 'split',
      description: split.description || 'Split Expense',
      category: split.category || 'Split Expense'
    };
  }).filter(t => t.amount > 0);
  
  // Combine and sort by date (with null checks)
  const allTransactions = [
    ...expenses.map(e => ({ ...e, type: 'expense' })),
    ...income.map(i => ({ ...i, type: 'income' })),
    ...splitTransactions
  ].filter(t => t.date) // Filter out items without dates
  .sort((a, b) => {
    const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
    const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
    return dateB - dateA;
  }).slice(0, 10); // Get last 10 transactions
  
  if (allTransactions.length === 0) {
    // Show empty state
    transactionsList.innerHTML = `
      <div class="empty-state transactions-empty animate-in">
        <div class="empty-state-icon">📊</div>
        <h3 class="empty-state-title">No transactions yet</h3>
        <p class="empty-state-text">Start tracking your expenses and income to see them here.</p>
        <div class="empty-state-actions">
          <a href="expenses.html" class="btn btn-primary">Add Your First Transaction</a>
        </div>
      </div>
    `;
    return;
  }
  
  // Use TransactionListEnhancer for rendering
  const enhancer = new TransactionListEnhancer();
  enhancer.init('transactionsList', allTransactions);
  
  // Override edit/delete handlers
  enhancer.onEdit = (transactionId) => {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (transaction && transaction.type === 'split') {
      window.location.href = `split-expense.html?id=${transactionId}&action=edit`;
    } else if (transaction && transaction.type === 'income') {
      window.location.href = `income.html?id=${transactionId}&action=edit`;
    } else {
      window.location.href = `expenses.html?id=${transactionId}&action=edit`;
    }
  };
  
  enhancer.onDelete = (transactionId) => {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    confirmationModal.show({
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${transaction.type}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    }).then(async (confirmed) => {
      if (confirmed) {
        try {
          if (transaction.type === 'split') {
            await firestoreService.deleteSplit(transactionId);
          } else if (transaction.type === 'income') {
            await firestoreService.deleteIncome(transactionId);
          } else {
            // Delete expense
            await firestoreService.deleteExpense(transactionId);
            
            // Delete linked fuel log if this expense is linked to a fuel entry
            if (transaction.fuelLogId) {
              try {
                await firestoreService.delete('fuelLogs', transaction.fuelLogId);
                console.log('[Dashboard] Deleted linked fuel log:', transaction.fuelLogId);
              } catch (fuelLogError) {
                console.error('[Dashboard] Error deleting linked fuel log:', fuelLogError);
              }
            }
          }
          toast.success('Transaction deleted');
          enhancer.removeTransaction(transactionId);
        } catch (error) {
          log.error('Error deleting transaction:', error);
          toast.error('Failed to delete transaction');
        }
      }
    });
  };
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

// KPI Card Click Handlers - Navigate to respective pages
const incomeKpi = document.getElementById('incomeKpi');
const expenseKpi = document.getElementById('expenseKpi');

if (incomeKpi) {
  incomeKpi.style.cursor = 'pointer';
  incomeKpi.addEventListener('click', () => {
    window.location.href = 'income.html';
  });
}

if (expenseKpi) {
  expenseKpi.style.cursor = 'pointer';
  expenseKpi.addEventListener('click', () => {
    window.location.href = 'expenses.html';
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

// Logout handled by global logout-handler.js

// Chart Functions
function createTrendChart(expenses, income, months = 6, splits = []) {
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
    const monthName = timezoneService.formatShortMonthYear(date);
    labels.push(monthName);
    
    // Calculate expenses for this month
    const monthExpenses = expenses
      .filter(e => {
        const expenseDate = timezoneService.toLocalDate(e.date);
        return expenseDate.getMonth() === date.getMonth() && 
               expenseDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    // Calculate split expenses for this month (your share only)
    const monthSplitExpenses = (splits || [])
      .filter(s => {
        if (!s.date) return false;
        const splitDate = timezoneService.toLocalDate(s.date);
        return splitDate.getMonth() === date.getMonth() && 
               splitDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, split) => {
        const myShare = split.participants?.find(p => p.name === 'Me');
        return sum + (myShare ? parseFloat(myShare.amount) || 0 : 0);
      }, 0);
    
    // Calculate income for this month
    const monthIncome = income
      .filter(i => {
        const incomeDate = timezoneService.toLocalDate(i.date);
        return incomeDate.getMonth() === date.getMonth() && 
               incomeDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    
    // Calculate settled split income for this month (money received from others)
    const monthSplitIncome = (splits || [])
      .filter(s => {
        if (!s.date || s.status !== 'settled' || s.paidBy !== 'me') return false;
        const splitDate = timezoneService.toLocalDate(s.date);
        return splitDate.getMonth() === date.getMonth() && 
               splitDate.getFullYear() === date.getFullYear();
      })
      .reduce((sum, split) => {
        const othersTotal = split.participants
          ?.filter(p => p.name !== 'Me')
          .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) || 0;
        return sum + othersTotal;
      }, 0);
    
    expenseData.push(monthExpenses + monthSplitExpenses);
    incomeData.push(monthIncome + monthSplitIncome);
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

function createCategoryChart(expenses, period = 'current', splits = []) {
  const ctx = categoryChart.getContext('2d');
  
  // Destroy existing chart
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  
  // Filter expenses based on period
  let filteredExpenses = expenses;
  let filteredSplits = splits || [];
  const now = new Date();
  
  if (period === 'current') {
    filteredExpenses = expenses.filter(e => {
      if (!e.date) return false;
      let date;
      if (e.date instanceof Date) {
        date = e.date;
      } else if (e.date.toDate && typeof e.date.toDate === 'function') {
        date = e.date.toDate();
      } else if (typeof e.date === 'string') {
        date = new Date(e.date);
      } else {
        return false;
      }
      return date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear();
    });
    filteredSplits = (splits || []).filter(s => {
      if (!s.date) return false;
      let date;
      if (s.date instanceof Date) {
        date = s.date;
      } else if (s.date.toDate && typeof s.date.toDate === 'function') {
        date = s.date.toDate();
      } else if (typeof s.date === 'string') {
        date = new Date(s.date);
      } else {
        return false;
      }
      return date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear();
    });
  } else if (period === 'last') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    filteredExpenses = expenses.filter(e => {
      if (!e.date) return false;
      let date;
      if (e.date instanceof Date) {
        date = e.date;
      } else if (e.date.toDate && typeof e.date.toDate === 'function') {
        date = e.date.toDate();
      } else if (typeof e.date === 'string') {
        date = new Date(e.date);
      } else {
        return false;
      }
      return date.getMonth() === lastMonth.getMonth() && 
             date.getFullYear() === lastMonth.getFullYear();
    });
    filteredSplits = (splits || []).filter(s => {
      if (!s.date) return false;
      let date;
      if (s.date instanceof Date) {
        date = s.date;
      } else if (s.date.toDate && typeof s.date.toDate === 'function') {
        date = s.date.toDate();
      } else if (typeof s.date === 'string') {
        date = new Date(s.date);
      } else {
        return false;
      }
      return date.getMonth() === lastMonth.getMonth() && 
             date.getFullYear() === lastMonth.getFullYear();
    });
  }
  
  // Group by category
  const categoryTotals = {};
  filteredExpenses.forEach(e => {
    const category = e.category || 'Uncategorized';
    categoryTotals[category] = (categoryTotals[category] || 0) + (parseFloat(e.amount) || 0);
  });
  
  // Add split expenses to categories (your share only)
  filteredSplits.forEach(split => {
    const myShare = split.participants?.find(p => p.name === 'Me');
    const myAmount = myShare ? parseFloat(myShare.amount) || 0 : 0;
    if (myAmount > 0) {
      const category = split.category || 'Split Expense';
      categoryTotals[category] = (categoryTotals[category] || 0) + myAmount;
    }
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
    const months = parseInt(trendPeriod.value);
    // Use optimized query that only fetches data for the selected period
    const [expenses, income, splits] = await Promise.all([
      firestoreService.getExpensesForLastMonths(months),
      firestoreService.getIncomeForLastMonths(months),
      firestoreService.getSplits ? firestoreService.getSplits() : Promise.resolve([])
    ]);
    createTrendChart(expenses, income, months, splits);
  } catch (error) {
    log.error('Error updating trend chart:', error);
  }
});

categoryPeriod.addEventListener('change', async () => {
  try {
    // For category chart, we only need current or last month data
    const now = new Date();
    const period = categoryPeriod.value;
    let expenses, splits;
    
    if (period === 'current') {
      [expenses, splits] = await Promise.all([
        firestoreService.getExpensesByMonth(now.getFullYear(), now.getMonth()),
        firestoreService.getSplits ? firestoreService.getSplits() : Promise.resolve([])
      ]);
    } else if (period === 'last') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      [expenses, splits] = await Promise.all([
        firestoreService.getExpensesByMonth(lastMonth.getFullYear(), lastMonth.getMonth()),
        firestoreService.getSplits ? firestoreService.getSplits() : Promise.resolve([])
      ]);
    } else {
      // For 'all', use limited data
      [expenses, splits] = await Promise.all([
        firestoreService.getExpenses(500),
        firestoreService.getSplits ? firestoreService.getSplits() : Promise.resolve([])
      ]);
    }
    
    createCategoryChart(expenses, period, splits);
  } catch (error) {
    log.error('Error updating category chart:', error);
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
      log.log('User accepted the install prompt');
      toast.success('App installed successfully!');
    } else {
      log.log('User dismissed the install prompt');
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
    log.log('PWA was installed');
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
