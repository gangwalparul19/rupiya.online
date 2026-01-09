// Analytics Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import confirmationModal from '../components/confirmation-modal.js';
import lazyChartLoader from '../utils/lazy-chart-loader.js';
import PaginationHelper from '../utils/pagination-helper.js';
import ColorCoding from '../utils/color-coding.js';
import Typography from '../utils/typography.js';
import breadcrumbManager from '../utils/breadcrumbs.js';
import loadingService from '../services/loading-service.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let expenses = [];
let income = [];
let charts = {};
let currentTrendGranularity = 'weekly';

// DOM Elements
let periodFilter;
let startDateInput, endDateInput;
let totalIncomeEl, totalExpensesEl, netSavingsEl, savingsRateEl;
let savingsRateValueEl, healthScoreEl, healthTrendEl, budgetStatusEl, budgetTrendEl;
let topCategoriesTable, loadingState;
let categoryDrillDownModal, categoryDrillDownTitle, categoryDrillDownTable, categoryDrillDownClose;
let drillDownPagination;
let currentDrillDownCategory = null;
let currentDrillDownPage = 1;
let healthScoreDisplay, healthScoreTrend;
let savingsRateBar, expenseControlBar, debtRatioBar, goalProgressBar;
let savingsRateBreakdown, expenseControlBreakdown, debtRatioBreakdown, goalProgressBreakdown;

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
    { label: 'Analytics', href: null }
  ]);

  // Initialize DOM elements
  initDOMElements();


  // Set up event listeners
  setupEventListeners();

  // Load user profile
  loadUserProfile(user);

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadData();
  });
}


// Initialize DOM elements
function initDOMElements() {
  periodFilter = document.getElementById('periodFilter');
  startDateInput = document.getElementById('startDate');
  endDateInput = document.getElementById('endDate');
  totalIncomeEl = document.getElementById('totalIncome');
  totalExpensesEl = document.getElementById('totalExpenses');
  netSavingsEl = document.getElementById('netSavings');
  savingsRateEl = document.getElementById('savingsRate');
  savingsRateValueEl = document.getElementById('savingsRateValue');
  healthScoreEl = document.getElementById('healthScore');
  healthTrendEl = document.getElementById('healthTrend');
  budgetStatusEl = document.getElementById('budgetStatus');
  budgetTrendEl = document.getElementById('budgetTrend');
  topCategoriesTable = document.getElementById('topCategoriesTable');
  loadingState = document.getElementById('loadingState');
  categoryDrillDownModal = document.getElementById('categoryDrillDownModal');
  categoryDrillDownTitle = document.getElementById('categoryDrillDownTitle');
  categoryDrillDownTable = document.getElementById('categoryDrillDownTable');
  categoryDrillDownClose = document.getElementById('categoryDrillDownClose');
  drillDownPagination = document.getElementById('drillDownPagination');
  healthScoreDisplay = document.getElementById('healthScoreDisplay');
  healthScoreTrend = document.getElementById('healthScoreTrend');
  savingsRateBar = document.getElementById('savingsRateBar');
  expenseControlBar = document.getElementById('expenseControlBar');
  debtRatioBar = document.getElementById('debtRatioBar');
  goalProgressBar = document.getElementById('goalProgressBar');
  savingsRateBreakdown = document.getElementById('savingsRateBreakdown');
  expenseControlBreakdown = document.getElementById('expenseControlBreakdown');
  debtRatioBreakdown = document.getElementById('debtRatioBreakdown');
  goalProgressBreakdown = document.getElementById('goalProgressBreakdown');
  
  // Apply consistent typography to metric values
  if (totalIncomeEl) Typography.applyStyle(totalIncomeEl, 'METRIC_LG');
  if (totalExpensesEl) Typography.applyStyle(totalExpensesEl, 'METRIC_LG');
  if (netSavingsEl) Typography.applyStyle(netSavingsEl, 'METRIC_LG');
  if (savingsRateValueEl) Typography.applyStyle(savingsRateValueEl, 'METRIC_MD');
  if (healthScoreEl) Typography.applyStyle(healthScoreEl, 'METRIC_LG');
  if (budgetStatusEl) Typography.applyStyle(budgetStatusEl, 'METRIC_MD');
  
  // Apply consistent typography to labels
  const labels = document.querySelectorAll('.summary-label');
  labels.forEach(label => Typography.applyStyle(label, 'LABEL_MD'));
  
  const chartTitles = document.querySelectorAll('.chart-title');
  chartTitles.forEach(title => Typography.applyStyle(title, 'H3'));
  
  // Set default date range (current month)
  setDefaultDateRange();
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

  // Logout handled by global logout-handler.js via sidebar.js

  // Period filter
  periodFilter.addEventListener('change', async (e) => {
    if (e.target.value === 'custom') {
      // Show date inputs for custom range
      startDateInput.style.display = 'block';
      endDateInput.style.display = 'block';
    } else {
      // Hide date inputs and load data for preset period
      startDateInput.style.display = 'none';
      endDateInput.style.display = 'none';
      await loadData();
    }
  });

  // Date range inputs
  startDateInput?.addEventListener('change', async () => {
    if (periodFilter.value === 'custom') {
      await loadData();
    }
  });

  endDateInput?.addEventListener('change', async () => {
    if (periodFilter.value === 'custom') {
      await loadData();
    }
  });

  // Trend granularity selector
  const trendGranularity = document.getElementById('trendGranularity');
  trendGranularity?.addEventListener('change', (e) => {
    currentTrendGranularity = e.target.value;
    renderSpendingTrendsChart();
  });

  // Category drill-down modal
  categoryDrillDownClose?.addEventListener('click', () => {
    categoryDrillDownModal.style.display = 'none';
  });

  categoryDrillDownModal?.addEventListener('click', (e) => {
    if (e.target === categoryDrillDownModal) {
      categoryDrillDownModal.style.display = 'none';
    }
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

// Set default date range
function setDefaultDateRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  
  startDateInput.value = firstDay.toISOString().split('T')[0];
  endDateInput.value = now.toISOString().split('T')[0];
  startDateInput.style.display = 'none';
  endDateInput.style.display = 'none';
}

// Get date range based on period filter
function getDateRange() {
  const now = new Date();
  const period = periodFilter.value;
  let startDate, endDate = now;

  if (period === 'custom') {
    startDate = new Date(startDateInput.value);
    endDate = new Date(endDateInput.value);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), quarter * 3, 1);
  } else if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else {
    // 'all' - use a very old date
    startDate = new Date(2000, 0, 1);
  }

  return { startDate, endDate };
}

// Load data
async function loadData() {
  // Show skeleton screen instead of spinner
  const skeleton = loadingService.showLoading(loadingState, 'dashboard');

  try {
    const { startDate, endDate } = getDateRange();
    
    // Load all data
    [expenses, income] = await Promise.all([
      firestoreService.getExpenses(),
      firestoreService.getIncome()
    ]);

    // Update summary
    updateSummary(startDate, endDate);

    // Render charts
    renderCharts();

    // Render top categories table
    renderTopCategories(startDate, endDate);
  } catch (error) {
    console.error('Error loading analytics:', error);
    showToast('Failed to load analytics', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Filter data by period (kept for compatibility but data is now pre-filtered)
function filterByPeriod(data, period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      return data;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return data.filter(item => {
    const itemDate = item.date.toDate ? item.date.toDate() : new Date(item.date);
    return itemDate >= startDate;
  });
}

// Update summary
function updateSummary(startDate, endDate) {
  // Filter data by date range
  const filteredExpenses = expenses.filter(e => {
    const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return eDate >= startDate && eDate <= endDate;
  });

  const filteredIncome = income.filter(i => {
    const iDate = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    return iDate >= startDate && iDate <= endDate;
  });

  const totalIncome = filteredIncome.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

  totalIncomeEl.textContent = formatCurrency(totalIncome);
  ColorCoding.applyColorToElement(totalIncomeEl, totalIncome, 'color');
  
  totalExpensesEl.textContent = formatCurrency(totalExpenses);
  ColorCoding.applyColorToElement(totalExpensesEl, -totalExpenses, 'color');
  
  netSavingsEl.textContent = formatCurrency(netSavings);
  ColorCoding.applyColorToElement(netSavingsEl, netSavings, 'color');
  
  savingsRateEl.textContent = `${savingsRate}%`;
  savingsRateEl.className = `summary-change ${netSavings >= 0 ? 'positive' : 'negative'}`;
  ColorCoding.applyColorToElement(savingsRateEl, netSavings, 'color');
  
  // Update new KPI cards
  savingsRateValueEl.textContent = `${savingsRate}%`;
  ColorCoding.applyColorToElement(savingsRateValueEl, netSavings, 'color');
  
  // Calculate financial health score
  const healthScore = calculateHealthScore(totalIncome, totalExpenses);
  healthScoreEl.textContent = healthScore;
  healthTrendEl.textContent = 'stable';
  healthTrendEl.className = 'summary-change positive';
  ColorCoding.applyColorToElement(healthTrendEl, 1, 'color');
  
  // Update health score display
  updateHealthScoreDisplay(totalIncome, totalExpenses);
  
  // Calculate budget status (simplified)
  const budgetStatus = totalExpenses > 0 ? Math.min(100, (totalExpenses / (totalIncome || 1)) * 100).toFixed(0) : 0;
  budgetStatusEl.textContent = `${budgetStatus}%`;
  budgetTrendEl.textContent = budgetStatus <= 80 ? 'on track' : 'over budget';
  budgetTrendEl.className = `summary-change ${budgetStatus <= 80 ? 'positive' : 'negative'}`;
  ColorCoding.applyColorToElement(budgetTrendEl, budgetStatus <= 80 ? 1 : -1, 'color');
}

// Update health score display with breakdown
function updateHealthScoreDisplay(totalIncome, totalExpenses) {
  // Calculate components
  const savingsRateScore = totalIncome > 0 ? Math.min(25, Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100 * 1.25)) : 0;
  const expenseControlScore = totalIncome > 0 ? Math.min(25, Math.max(0, 25 - ((totalExpenses / totalIncome) * 100 - 100) * 0.25)) : 0;
  const debtRatioScore = 25; // Assuming no debt data
  const goalProgressScore = 20; // Assuming some goal progress

  const totalScore = Math.round(savingsRateScore + expenseControlScore + debtRatioScore + goalProgressScore);

  // Update display
  healthScoreDisplay.textContent = totalScore;
  
  // Update breakdown bars
  const savingsRatePercent = Math.round((savingsRateScore / 25) * 100);
  const expenseControlPercent = Math.round((expenseControlScore / 25) * 100);
  const debtRatioPercent = Math.round((debtRatioScore / 25) * 100);
  const goalProgressPercent = Math.round((goalProgressScore / 25) * 100);

  savingsRateBar.style.width = `${savingsRatePercent}%`;
  expenseControlBar.style.width = `${expenseControlPercent}%`;
  debtRatioBar.style.width = `${debtRatioPercent}%`;
  goalProgressBar.style.width = `${goalProgressPercent}%`;

  savingsRateBreakdown.textContent = `${savingsRatePercent}%`;
  expenseControlBreakdown.textContent = `${expenseControlPercent}%`;
  debtRatioBreakdown.textContent = `${debtRatioPercent}%`;
  goalProgressBreakdown.textContent = `${goalProgressPercent}%`;
}

// Calculate health score (simplified version)
function calculateHealthScore(income, expenses) {
  if (income === 0) return 0;
  
  const savingsRate = ((income - expenses) / income) * 100;
  // Score based on savings rate: 20% savings = 100 points
  const score = Math.min(100, Math.max(0, savingsRate * 5));
  return Math.round(score);
}

// Render charts
function renderCharts() {
  // Register charts for lazy loading
  lazyChartLoader.registerChart('spendingTrendsChart', renderSpendingTrendsChart);
  lazyChartLoader.registerChart('expenseByCategoryChart', renderExpenseByCategoryChart);
  lazyChartLoader.registerChart('incomeVsExpensesChart', renderIncomeVsExpensesChart);
  lazyChartLoader.registerChart('savingsRateTrendsChart', renderSavingsRateTrendsChart);
  lazyChartLoader.registerChart('monthlyTrendChart', renderMonthlyTrendChart);
  lazyChartLoader.registerChart('budgetVsActualChart', renderBudgetVsActualChart);
}

// Render spending trends chart (Line)
function renderSpendingTrendsChart() {
  const ctx = document.getElementById('spendingTrendsChart');
  if (!ctx) return;
  
  // Destroy existing chart
  if (charts.spendingTrends) {
    charts.spendingTrends.destroy();
  }

  const { startDate, endDate } = getDateRange();

  // Group expenses by date based on granularity
  const trendData = {};
  
  expenses.forEach(expense => {
    const eDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
    if (eDate >= startDate && eDate <= endDate) {
      const dateKey = formatDateByGranularity(eDate, currentTrendGranularity);
      if (!trendData[dateKey]) {
        trendData[dateKey] = 0;
      }
      trendData[dateKey] += parseFloat(expense.amount) || 0;
    }
  });

  // Sort by date
  const sortedDates = Object.keys(trendData).sort();
  const labels = sortedDates.map(date => formatDateLabel(date, currentTrendGranularity));
  const data = sortedDates.map(date => trendData[date]);

  // Calculate trend line (simple moving average)
  const trendLine = calculateMovingAverage(data, 3);

  charts.spendingTrends = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Spending',
          data: data,
          borderColor: 'rgba(231, 76, 60, 1)',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(231, 76, 60, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Trend',
          data: trendLine,
          borderColor: 'rgba(74, 144, 226, 1)',
          borderWidth: 2,
          borderDash: [5, 5],
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
              if (context.dataset.label === 'Trend') {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
              }
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

// Helper: Format date by granularity
function formatDateByGranularity(date, granularity) {
  if (granularity === 'daily') {
    return date.toISOString().split('T')[0];
  } else if (granularity === 'weekly') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0];
  } else if (granularity === 'monthly') {
    return date.toISOString().substring(0, 7);
  }
  return date.toISOString().split('T')[0];
}

// Helper: Format date label for display
function formatDateLabel(dateStr, granularity) {
  const date = new Date(dateStr);
  if (granularity === 'daily') {
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } else if (granularity === 'weekly') {
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 6);
    return `${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  } else if (granularity === 'monthly') {
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  return dateStr;
}

// Helper: Calculate moving average
function calculateMovingAverage(data, windowSize) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / windowSize);
    }
  }
  return result;
}

// Render expense by category chart (Pie)
function renderExpenseByCategoryChart() {
  const ctx = document.getElementById('expenseByCategoryChart');
  
  // Destroy existing chart
  if (charts.expenseByCategory) {
    charts.expenseByCategory.destroy();
  }

  const { startDate, endDate } = getDateRange();

  // Filter and group expenses by category
  const categoryData = {};
  expenses.forEach(expense => {
    const eDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
    if (eDate >= startDate && eDate <= endDate) {
      const category = expense.category || 'Other';
      categoryData[category] = (categoryData[category] || 0) + (parseFloat(expense.amount) || 0);
    }
  });

  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  const colors = generateColors(labels.length);

  charts.expenseByCategory = new Chart(ctx, {
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
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const category = labels[index];
          showCategoryDrillDown(category, startDate, endDate);
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = formatCurrency(context.parsed);
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Render income vs expenses chart (Bar)
function renderIncomeVsExpensesChart() {
  const ctx = document.getElementById('incomeVsExpensesChart');
  
  // Destroy existing chart
  if (charts.incomeVsExpenses) {
    charts.incomeVsExpenses.destroy();
  }

  const { startDate, endDate } = getDateRange();

  // Filter data by date range
  const filteredIncome = income.filter(i => {
    const iDate = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    return iDate >= startDate && iDate <= endDate;
  });

  const filteredExpenses = expenses.filter(e => {
    const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return eDate >= startDate && eDate <= endDate;
  });

  const totalIncome = filteredIncome.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const savings = totalIncome - totalExpenses;

  charts.incomeVsExpenses = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Savings'],
      datasets: [{
        data: [totalIncome, totalExpenses, savings],
        backgroundColor: [
          'rgba(39, 174, 96, 0.8)',
          'rgba(231, 76, 60, 0.8)',
          'rgba(74, 144, 226, 0.8)'
        ],
        borderColor: [
          'rgba(39, 174, 96, 1)',
          'rgba(231, 76, 60, 1)',
          'rgba(74, 144, 226, 1)'
        ],
        borderWidth: 2
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
            },
            afterLabel: function(context) {
              if (context.label === 'Savings') {
                const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;
                return `(${savingsRate}% of income)`;
              }
              return '';
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

// Render savings rate trends chart (Line)
function renderSavingsRateTrendsChart() {
  const ctx = document.getElementById('savingsRateTrendsChart');
  if (!ctx) return;
  
  // Destroy existing chart
  if (charts.savingsRateTrends) {
    charts.savingsRateTrends.destroy();
  }

  const { startDate, endDate } = getDateRange();

  // Group by month
  const monthlyData = {};
  
  income.forEach(inc => {
    const iDate = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
    if (iDate >= startDate && iDate <= endDate) {
      const monthKey = `${iDate.getFullYear()}-${String(iDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }
      monthlyData[monthKey].income += (parseFloat(inc.amount) || 0);
    }
  });

  expenses.forEach(exp => {
    const eDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
    if (eDate >= startDate && eDate <= endDate) {
      const monthKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }
      monthlyData[monthKey].expenses += (parseFloat(exp.amount) || 0);
    }
  });

  // Sort by month
  const sortedMonths = Object.keys(monthlyData).sort();
  const labels = sortedMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const date = new Date(year, monthNum - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const savingsRates = sortedMonths.map(month => {
    const data = monthlyData[month];
    return data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0;
  });

  const targetRate = 20; // 20% target

  charts.savingsRateTrends = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Savings Rate',
          data: savingsRates,
          borderColor: 'rgba(39, 174, 96, 1)',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: 'rgba(39, 174, 96, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Target (20%)',
          data: Array(labels.length).fill(targetRate),
          borderColor: 'rgba(243, 156, 18, 1)',
          borderWidth: 2,
          borderDash: [5, 5],
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
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

// Render monthly trend chart (Line)
function renderMonthlyTrendChart() {
  const ctx = document.getElementById('monthlyTrendChart');
  
  // Destroy existing chart
  if (charts.monthlyTrend) {
    charts.monthlyTrend.destroy();
  }

  // Group by month
  const monthlyData = {};
  
  expenses.forEach(expense => {
    const date = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    monthlyData[monthKey].expenses += (parseFloat(expense.amount) || 0);
  });

  income.forEach(inc => {
    const date = inc.date?.toDate ? inc.date.toDate() : new Date(inc.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    monthlyData[monthKey].income += (parseFloat(inc.amount) || 0);
  });

  // Sort by month
  const sortedMonths = Object.keys(monthlyData).sort();
  const labels = sortedMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const date = new Date(year, monthNum - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const incomeData = sortedMonths.map(month => monthlyData[month].income);
  const expenseData = sortedMonths.map(month => monthlyData[month].expenses);

  charts.monthlyTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: 'rgba(39, 174, 96, 1)',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: 'rgba(231, 76, 60, 1)',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
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

// Render top categories table
function renderTopCategories(startDate, endDate) {
  // Filter expenses by date range
  const filteredExpenses = expenses.filter(e => {
    const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return eDate >= startDate && eDate <= endDate;
  });

  // Group expenses by category
  const categoryData = {};
  filteredExpenses.forEach(expense => {
    const category = expense.category || 'Other';
    if (!categoryData[category]) {
      categoryData[category] = { amount: 0, count: 0 };
    }
    categoryData[category].amount += (parseFloat(expense.amount) || 0);
    categoryData[category].count += 1;
  });

  // Sort by amount
  const sortedCategories = Object.entries(categoryData)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 10);

  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  if (sortedCategories.length === 0) {
    topCategoriesTable.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
    return;
  }

  topCategoriesTable.innerHTML = sortedCategories.map(([category, data]) => {
    const percentage = totalExpenses > 0 ? ((data.amount / totalExpenses) * 100).toFixed(1) : 0;
    const colorClass = ColorCoding.getColorClass(-data.amount);
    return `
      <tr>
        <td class="category-name">${category}</td>
        <td class="category-amount ${colorClass}">${formatCurrency(data.amount)}</td>
        <td><span class="category-percentage">${percentage}%</span></td>
        <td class="category-count">${data.count} transactions</td>
      </tr>
    `;
  }).join('');
}

// Show category drill-down modal
async function showCategoryDrillDown(category, startDate, endDate) {
  currentDrillDownCategory = category;
  currentDrillDownPage = 1;
  categoryDrillDownTitle.textContent = `${category} Transactions`;
  categoryDrillDownModal.style.display = 'flex';
  
  await loadCategoryTransactions(category, startDate, endDate, 1);
}

// Load category transactions with pagination
async function loadCategoryTransactions(category, startDate, endDate, pageNumber) {
  try {
    // Filter transactions for the category
    const categoryTransactions = expenses.filter(e => {
      const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return e.category === category && eDate >= startDate && eDate <= endDate;
    });

    // Sort by date descending
    categoryTransactions.sort((a, b) => {
      const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return bDate - aDate;
    });

    // Use pagination helper for efficient pagination
    const pageSize = 10;
    const paginationState = PaginationHelper.createPaginationState(
      categoryTransactions,
      pageSize,
      pageNumber
    );

    // Render table
    if (paginationState.items.length === 0) {
      categoryDrillDownTable.innerHTML = '<tr><td colspan="3" class="text-center">No transactions found</td></tr>';
    } else {
      categoryDrillDownTable.innerHTML = paginationState.items.map(t => {
        const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return `
          <tr>
            <td>${tDate.toLocaleDateString('en-IN')}</td>
            <td>${t.description || 'N/A'}</td>
            <td>${formatCurrency(t.amount)}</td>
          </tr>
        `;
      }).join('');
    }

    // Render pagination with page numbers
    renderPaginationWithNumbers(
      paginationState.currentPage,
      paginationState.totalPages,
      paginationState.pageNumbers,
      category,
      startDate,
      endDate
    );
  } catch (error) {
    console.error('Error loading category transactions:', error);
    categoryDrillDownTable.innerHTML = '<tr><td colspan="3" class="text-center">Error loading transactions</td></tr>';
  }
}

// Render pagination controls
function renderPagination(currentPage, totalPages, category, startDate, endDate) {
  drillDownPagination.innerHTML = '';
  
  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      loadCategoryTransactions(category, startDate, endDate, currentPage - 1);
    }
  });
  drillDownPagination.appendChild(prevBtn);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      loadCategoryTransactions(category, startDate, endDate, i);
    });
    drillDownPagination.appendChild(pageBtn);
  }

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      loadCategoryTransactions(category, startDate, endDate, currentPage + 1);
    }
  });
  drillDownPagination.appendChild(nextBtn);
}

// Render pagination controls with smart page numbers
function renderPaginationWithNumbers(currentPage, totalPages, pageNumbers, category, startDate, endDate) {
  drillDownPagination.innerHTML = '';
  
  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      loadCategoryTransactions(category, startDate, endDate, currentPage - 1);
    }
  });
  drillDownPagination.appendChild(prevBtn);

  // Page numbers with ellipsis
  pageNumbers.forEach(pageNum => {
    if (pageNum === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      ellipsis.style.cssText = 'padding: 0 5px; display: inline-block;';
      drillDownPagination.appendChild(ellipsis);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${pageNum === currentPage ? 'active' : ''}`;
      pageBtn.textContent = pageNum;
      pageBtn.addEventListener('click', () => {
        loadCategoryTransactions(category, startDate, endDate, pageNum);
      });
      drillDownPagination.appendChild(pageBtn);
    }
  });

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      loadCategoryTransactions(category, startDate, endDate, currentPage + 1);
    }
  });
  drillDownPagination.appendChild(nextBtn);
}

// Render budget vs actual chart (Horizontal Bar)
function renderBudgetVsActualChart() {
  const ctx = document.getElementById('budgetVsActualChart');
  if (!ctx) return;
  
  // Destroy existing chart
  if (charts.budgetVsActual) {
    charts.budgetVsActual.destroy();
  }

  const { startDate, endDate } = getDateRange();

  // Get budgets
  firestoreService.getBudgets().then(budgets => {
    // Calculate actual spending by category
    const categoryActuals = {};
    expenses.forEach(expense => {
      const eDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
      if (eDate >= startDate && eDate <= endDate) {
        const category = expense.category || 'Other';
        categoryActuals[category] = (categoryActuals[category] || 0) + (parseFloat(expense.amount) || 0);
      }
    });

    // Prepare data
    const labels = budgets.map(b => b.category || 'Other');
    const budgetedData = budgets.map(b => parseFloat(b.amount) || 0);
    const actualData = budgets.map(b => categoryActuals[b.category || 'Other'] || 0);

    charts.budgetVsActual = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Budgeted',
            data: budgetedData,
            backgroundColor: 'rgba(74, 144, 226, 0.8)',
            borderColor: 'rgba(74, 144, 226, 1)',
            borderWidth: 2
          },
          {
            label: 'Actual',
            data: actualData,
            backgroundColor: 'rgba(231, 76, 60, 0.8)',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 2
          }
        ]
      },
      options: {
        indexAxis: 'y',
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
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.x)}`;
              }
            }
          }
        },
        scales: {
          x: {
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
  }).catch(error => {
    console.error('Error loading budgets:', error);
  });
}

// Generate colors for charts
function generateColors(count) {
  const baseColors = [
    'rgba(74, 144, 226, 0.8)',
    'rgba(231, 76, 60, 0.8)',
    'rgba(39, 174, 96, 0.8)',
    'rgba(243, 156, 18, 0.8)',
    'rgba(155, 89, 182, 0.8)',
    'rgba(0, 206, 209, 0.8)',
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)'
  ];

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
