// Dashboard Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import pwaInstallManager from '../utils/pwa-install.js';
import { formatCurrency, formatDate, getRelativeTime } from '../utils/helpers.js';

// Check authentication
async function checkAuth() {
  await authService.waitForAuth();
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize dashboard only after auth check
async function init() {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await initDashboard();
    setupPWAInstall();
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
    
    // Load dashboard data
    await loadDashboardData();
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    console.log('Loading dashboard data...');
    
    // Get current month data
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get previous month data for comparison
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Fetch expenses and income
    console.log('Fetching expenses and income...');
    const [expenses, income] = await Promise.all([
      firestoreService.getExpenses(),
      firestoreService.getIncome()
    ]);
    
    console.log('Expenses:', expenses.length, 'Income:', income.length);
    
    // Calculate current month totals
    const currentMonthExpenses = expenses
      .filter(e => {
        const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
        return date >= firstDayOfMonth && date <= lastDayOfMonth;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    const currentMonthIncome = income
      .filter(i => {
        const date = i.date.toDate ? i.date.toDate() : new Date(i.date);
        return date >= firstDayOfMonth && date <= lastDayOfMonth;
      })
      .reduce((sum, i) => sum + i.amount, 0);
    
    console.log('Current month - Expenses:', currentMonthExpenses, 'Income:', currentMonthIncome);
    
    // Calculate last month totals
    const lastMonthExpenses = expenses
      .filter(e => {
        const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
        return date >= firstDayOfLastMonth && date <= lastDayOfLastMonth;
      })
      .reduce((sum, e) => sum + e.amount, 0);
    
    const lastMonthIncome = income
      .filter(i => {
        const date = i.date.toDate ? i.date.toDate() : new Date(i.date);
        return date >= firstDayOfLastMonth && date <= lastDayOfLastMonth;
      })
      .reduce((sum, i) => sum + i.amount, 0);
    
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
    
    // Update KPIs
    incomeValue.textContent = formatCurrency(currentMonthIncome);
    expenseValue.textContent = formatCurrency(currentMonthExpenses);
    cashflowValue.textContent = formatCurrency(cashFlow);
    savingsValue.textContent = `${savingsRate.toFixed(1)}%`;
    
    // Update changes
    updateChange(incomeChange, incomeChangePercent, 'positive');
    updateChange(expenseChange, expenseChangePercent, 'negative');
    updateCashflowChange(cashFlow);
    updateSavingsChange(savingsRate);
    
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
              <div class="transaction-title">${t.description || t.category || 'Transaction'}</div>
              <div class="transaction-meta">${t.category || t.source || 'Uncategorized'} • ${getRelativeTime(date)}</div>
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


// Setup PWA Install functionality
function setupPWAInstall() {
  const installBtn = document.getElementById('dashboardInstallBtn');

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      const installed = await pwaInstallManager.promptInstall();
      if (installed) {
        // Hide button after successful install
        installBtn.style.display = 'none';
        toast.success('🎉 App installed! You can now use Rupiya like a native app.');
      }
    });
  }

  // Check if app is already installed
  const status = pwaInstallManager.getInstallStatus();
  if (status.isStandalone || status.isInstalled) {
    // App is already installed, hide button
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }
}
