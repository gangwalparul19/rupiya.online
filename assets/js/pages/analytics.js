// Analytics Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let expenses = [];
let income = [];
let charts = {};

// DOM Elements
let periodFilter;
let totalIncomeEl, totalExpensesEl, netSavingsEl, savingsRateEl;
let topCategoriesTable, loadingState;

// Initialize page
async function init() {
  // Check authentication
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize DOM elements
  initDOMElements();

  // Initialize family switcher
  await familySwitcher.init();
  
  // Update subtitle based on context
  updatePageContext();

  // Set up event listeners
  setupEventListeners();

  // Load user profile
  loadUserProfile(user);

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadData();
  });
}

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('analyticsSubtitle');
  
  if (subtitle && context.context === 'family' && context.group) {
    subtitle.textContent = `Analyzing data for ${context.group.name}`;
  } else if (subtitle) {
    subtitle.textContent = 'Visualize your financial data';
  }
}

// Initialize DOM elements
function initDOMElements() {
  periodFilter = document.getElementById('periodFilter');
  totalIncomeEl = document.getElementById('totalIncome');
  totalExpensesEl = document.getElementById('totalExpenses');
  netSavingsEl = document.getElementById('netSavings');
  savingsRateEl = document.getElementById('savingsRate');
  topCategoriesTable = document.getElementById('topCategoriesTable');
  loadingState = document.getElementById('loadingState');
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

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Period filter
  periodFilter.addEventListener('change', async () => {
    await loadData();
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
  loadingState.style.display = 'flex';

  try {
    // Load expenses and income
    expenses = await firestoreService.getExpenses();
    income = await firestoreService.getIncome();

    // Filter by period
    const period = periodFilter.value;
    expenses = filterByPeriod(expenses, period);
    income = filterByPeriod(income, period);

    // Update summary
    updateSummary();

    // Render charts
    renderCharts();

    // Render top categories table
    renderTopCategories();
  } catch (error) {
    console.error('Error loading analytics:', error);
    showToast('Failed to load analytics', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Filter data by period
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
function updateSummary() {
  const totalIncome = income.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

  totalIncomeEl.textContent = formatCurrency(totalIncome);
  totalExpensesEl.textContent = formatCurrency(totalExpenses);
  netSavingsEl.textContent = formatCurrency(netSavings);
  savingsRateEl.textContent = `${savingsRate}%`;
  savingsRateEl.className = `summary-change ${netSavings >= 0 ? 'positive' : 'negative'}`;
}

// Render charts
function renderCharts() {
  renderExpenseByCategoryChart();
  renderIncomeVsExpensesChart();
  renderMonthlyTrendChart();
}

// Render expense by category chart (Pie)
function renderExpenseByCategoryChart() {
  const ctx = document.getElementById('expenseByCategoryChart');
  
  // Destroy existing chart
  if (charts.expenseByCategory) {
    charts.expenseByCategory.destroy();
  }

  // Group expenses by category
  const categoryData = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Other';
    categoryData[category] = (categoryData[category] || 0) + (parseFloat(expense.amount) || 0);
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

  const totalIncome = income.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  charts.incomeVsExpenses = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Savings'],
      datasets: [{
        data: [totalIncome, totalExpenses, totalIncome - totalExpenses],
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
function renderTopCategories() {
  // Group expenses by category
  const categoryData = {};
  expenses.forEach(expense => {
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

  const totalExpenses = expenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  if (sortedCategories.length === 0) {
    topCategoriesTable.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
    return;
  }

  topCategoriesTable.innerHTML = sortedCategories.map(([category, data]) => {
    const percentage = totalExpenses > 0 ? ((data.amount / totalExpenses) * 100).toFixed(1) : 0;
    return `
      <tr>
        <td class="category-name">${category}</td>
        <td class="category-amount">${formatCurrency(data.amount)}</td>
        <td><span class="category-percentage">${percentage}%</span></td>
        <td class="category-count">${data.count} transactions</td>
      </tr>
    `;
  }).join('');
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

// Handle logout
async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    showToast('Failed to logout', 'error');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
