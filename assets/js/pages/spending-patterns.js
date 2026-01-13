/**
 * Spending Patterns & Heatmap Page
 * Visualizes spending patterns with heatmaps and charts
 */

import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import toast from '../components/toast.js';

// Chart.js CDN
const chartScript = document.createElement('script');
chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
document.head.appendChild(chartScript);

let currentUser = null;
let allExpenses = [];
let dateRange = 90; // Default 3 months
let charts = {};

// Initialize page
async function init() {
  try {
    // Wait for auth
    currentUser = await authService.waitForAuth();
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    // Load user profile
    loadUserProfile();

    // Check if encryption reauth is needed
    await encryptionReauthModal.checkAndPrompt(async () => {
      await loadData();
    });

    // Setup event listeners
    setupEventListeners();

    // Load data
    await loadData();
  } catch (error) {
    console.error('Initialization error:', error);
    toast.error('Failed to initialize page');
  }
}

// Load user profile
function loadUserProfile() {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  if (userName) {
    userName.textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  }

  if (userEmail) {
    userEmail.textContent = currentUser.email || '';
  }

  if (userAvatar) {
    if (currentUser.photoURL) {
      userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="User Avatar">`;
    } else {
      const initial = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  const dateRangeSelect = document.getElementById('dateRange');
  const customDateRange = document.getElementById('customDateRange');
  const applyCustomRange = document.getElementById('applyCustomRange');
  const exportBtn = document.getElementById('exportBtn');
  const mobileExportBtn = document.getElementById('mobileExportBtn');

  dateRangeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customDateRange.style.display = 'flex';
    } else {
      customDateRange.style.display = 'none';
      dateRange = parseInt(e.target.value);
      loadData();
    }
  });

  applyCustomRange?.addEventListener('click', () => {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      dateRange = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      loadData();
    } else {
      toast.error('Please select both start and end dates');
    }
  });

  exportBtn?.addEventListener('click', exportReport);
  mobileExportBtn?.addEventListener('click', exportReport);
}

// Load expense data
async function loadData() {
  try {
    console.log('Loading spending data...');

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    startDate.setHours(0, 0, 0, 0); // Start of day

    console.log('Date range:', startDate, 'to', endDate);

    // Fetch all expenses and filter by date range
    const allExpensesData = await firestoreService.getAll('expenses', 'date', 'desc');
    console.log('Total expenses fetched:', allExpensesData.length);
    
    allExpenses = allExpensesData.filter(exp => {
      // Handle both Firestore Timestamp and string dates
      let expDate;
      if (exp.date && exp.date.toDate) {
        // Firestore Timestamp
        expDate = exp.date.toDate();
      } else if (exp.date) {
        // String date
        expDate = new Date(exp.date);
      } else {
        return false;
      }
      
      const isInRange = expDate >= startDate && expDate <= endDate;
      return isInRange;
    });

    console.log('Filtered expenses:', allExpenses.length);

    if (allExpenses.length === 0) {
      showEmptyState();
      toast.warning('No expenses found in the selected date range');
      return;
    }

    // Update UI
    updateKPIs();
    generateCalendarHeatmap();
    generateDayOfWeekChart();
    generateCategoryHeatmap();
    generateMonthlyTrendChart();
    generateInsights();

    toast.success(`Loaded ${allExpenses.length} expenses`);
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Failed to load spending data');
  }
}

// Update KPI cards
function updateKPIs() {
  const totalSpending = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgDaily = totalSpending / dateRange;

  // Most active day
  const dayCount = {};
  allExpenses.forEach(exp => {
    let expDate;
    if (exp.date && exp.date.toDate) {
      expDate = exp.date.toDate();
    } else {
      expDate = new Date(exp.date);
    }
    const day = expDate.toLocaleDateString('en-US', { weekday: 'long' });
    dayCount[day] = (dayCount[day] || 0) + 1;
  });
  const mostActiveDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

  // Spending streak
  const dates = allExpenses.map(exp => {
    let expDate;
    if (exp.date && exp.date.toDate) {
      expDate = exp.date.toDate();
    } else {
      expDate = new Date(exp.date);
    }
    return expDate.toDateString();
  });
  const uniqueDates = [...new Set(dates)].sort();
  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = (new Date(uniqueDates[i]) - new Date(uniqueDates[i-1])) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }

  // Peak spending day
  const dailySpending = {};
  allExpenses.forEach(exp => {
    let expDate;
    if (exp.date && exp.date.toDate) {
      expDate = exp.date.toDate();
    } else {
      expDate = new Date(exp.date);
    }
    const date = expDate.toDateString();
    dailySpending[date] = (dailySpending[date] || 0) + exp.amount;
  });
  const peakDay = Object.entries(dailySpending).sort((a, b) => b[1] - a[1])[0];

  // Update UI
  document.getElementById('avgDailySpending').textContent = `₹${avgDaily.toFixed(0)}`;
  document.getElementById('mostActiveDay').textContent = mostActiveDay ? mostActiveDay[0] : '-';
  document.getElementById('spendingStreak').textContent = `${maxStreak} days`;
  document.getElementById('peakSpendingDay').textContent = peakDay ? `₹${peakDay[1].toFixed(0)}` : '₹0';
}

// Generate calendar heatmap
function generateCalendarHeatmap() {
  const container = document.getElementById('calendarHeatmap');
  container.innerHTML = '';

  // Group expenses by date
  const dailySpending = {};
  allExpenses.forEach(exp => {
    let expDate;
    if (exp.date && exp.date.toDate) {
      expDate = exp.date.toDate();
    } else {
      expDate = new Date(exp.date);
    }
    const date = expDate.toISOString().split('T')[0];
    dailySpending[date] = (dailySpending[date] || 0) + exp.amount;
  });

  // Calculate max spending for color scale
  const maxSpending = Math.max(...Object.values(dailySpending), 1);

  // Generate heatmap
  const heatmapDiv = document.createElement('div');
  heatmapDiv.className = 'calendar-heatmap';

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);

  // Group by month
  const months = {};
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    months[monthKey].push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Create month columns
  Object.entries(months).forEach(([monthLabel, dates]) => {
    const monthDiv = document.createElement('div');
    monthDiv.className = 'heatmap-month';

    const label = document.createElement('div');
    label.className = 'month-label';
    label.textContent = monthLabel;
    monthDiv.appendChild(label);

    // Group dates by week
    const weeks = [];
    let week = [];
    dates.forEach((date, index) => {
      week.push(date);
      if (date.getDay() === 6 || index === dates.length - 1) {
        weeks.push([...week]);
        week = [];
      }
    });

    // Create week rows
    weeks.forEach(weekDates => {
      const weekDiv = document.createElement('div');
      weekDiv.className = 'heatmap-week';

      weekDates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const spending = dailySpending[dateStr] || 0;
        const level = spending === 0 ? 0 : Math.min(4, Math.ceil((spending / maxSpending) * 4));

        const dayDiv = document.createElement('div');
        dayDiv.className = 'heatmap-day';
        dayDiv.setAttribute('data-level', level);
        dayDiv.setAttribute('data-date', dateStr);
        dayDiv.setAttribute('data-amount', spending);
        dayDiv.title = `${date.toLocaleDateString()}: ₹${spending.toFixed(0)}`;

        weekDiv.appendChild(dayDiv);
      });

      monthDiv.appendChild(weekDiv);
    });

    heatmapDiv.appendChild(monthDiv);
  });

  container.appendChild(heatmapDiv);
}

// Generate day of week chart
function generateDayOfWeekChart() {
  const createChart = () => {
    const ctx = document.getElementById('dayOfWeekChart');
    if (!ctx) return;

    const daySpending = {
      'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0,
      'Thursday': 0, 'Friday': 0, 'Saturday': 0
    };

    allExpenses.forEach(exp => {
      let expDate;
      if (exp.date && exp.date.toDate) {
        expDate = exp.date.toDate();
      } else {
        expDate = new Date(exp.date);
      }
      const day = expDate.toLocaleDateString('en-US', { weekday: 'long' });
      daySpending[day] += exp.amount;
    });

    if (charts.dayOfWeek) charts.dayOfWeek.destroy();

    // Check if Chart is available
    if (typeof Chart !== 'undefined') {
      charts.dayOfWeek = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(daySpending),
          datasets: [{
            label: 'Total Spending',
            data: Object.values(daySpending),
            backgroundColor: 'rgba(74, 144, 226, 0.6)',
            borderColor: 'rgba(74, 144, 226, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: value => `₹${value.toFixed(0)}`
              }
            }
          }
        }
      });
    }
  };

  // Check if Chart.js is already loaded
  if (typeof Chart !== 'undefined') {
    createChart();
  } else {
    chartScript.addEventListener('load', createChart);
  }
}

// Generate category heatmap
function generateCategoryHeatmap() {
  const container = document.getElementById('categoryHeatmap');
  container.innerHTML = '';

  // Group by category and month
  const categoryMonthly = {};
  allExpenses.forEach(exp => {
    let expDate;
    if (exp.date && exp.date.toDate) {
      expDate = exp.date.toDate();
    } else {
      expDate = new Date(exp.date);
    }
    const month = expDate.toLocaleDateString('en-US', { month: 'short' });
    if (!categoryMonthly[exp.category]) {
      categoryMonthly[exp.category] = {};
    }
    categoryMonthly[exp.category][month] = (categoryMonthly[exp.category][month] || 0) + exp.amount;
  });

  // Get unique months
  const months = [...new Set(allExpenses.map(exp => {
    let expDate;
    if (exp.date && exp.date.toDate) {
      expDate = exp.date.toDate();
    } else {
      expDate = new Date(exp.date);
    }
    return expDate.toLocaleDateString('en-US', { month: 'short' });
  }))].sort();

  // Create rows for each category
  Object.entries(categoryMonthly).forEach(([category, monthData]) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'category-row';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'category-label';
    labelDiv.textContent = category;
    rowDiv.appendChild(labelDiv);

    const cellsDiv = document.createElement('div');
    cellsDiv.className = 'category-cells';

    const maxAmount = Math.max(...Object.values(monthData), 1);

    months.forEach(month => {
      const amount = monthData[month] || 0;
      const intensity = amount === 0 ? 0 : (amount / maxAmount);
      
      const cellDiv = document.createElement('div');
      cellDiv.className = 'category-cell';
      cellDiv.style.background = `rgba(74, 144, 226, ${intensity})`;
      cellDiv.textContent = amount > 0 ? `₹${(amount/1000).toFixed(1)}k` : '-';
      cellDiv.title = `${category} - ${month}: ₹${amount.toFixed(0)}`;

      cellsDiv.appendChild(cellDiv);
    });

    rowDiv.appendChild(cellsDiv);
    container.appendChild(rowDiv);
  });
}

// Generate monthly trend chart
function generateMonthlyTrendChart() {
  const createChart = () => {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;

    const monthlySpending = {};
    allExpenses.forEach(exp => {
      let expDate;
      if (exp.date && exp.date.toDate) {
        expDate = exp.date.toDate();
      } else {
        expDate = new Date(exp.date);
      }
      const month = expDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlySpending[month] = (monthlySpending[month] || 0) + exp.amount;
    });

    if (charts.monthlyTrend) charts.monthlyTrend.destroy();

    // Check if Chart is available
    if (typeof Chart !== 'undefined') {
      charts.monthlyTrend = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Object.keys(monthlySpending),
          datasets: [{
            label: 'Monthly Spending',
            data: Object.values(monthlySpending),
            borderColor: 'rgba(74, 144, 226, 1)',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: value => `₹${(value/1000).toFixed(1)}k`
              }
            }
          }
        }
      });
    }
  };

  // Check if Chart.js is already loaded
  if (typeof Chart !== 'undefined') {
    createChart();
  } else {
    chartScript.addEventListener('load', createChart);
  }
}

// Generate insights
function generateInsights() {
  const container = document.getElementById('insightsContainer');
  container.innerHTML = '';

  const insights = [];

  // Day of week insight
  const daySpending = {};
  allExpenses.forEach(exp => {
    const day = new Date(exp.date).toLocaleDateString('en-US', { weekday: 'long' });
    daySpending[day] = (daySpending[day] || 0) + exp.amount;
  });
  const topDay = Object.entries(daySpending).sort((a, b) => b[1] - a[1])[0];
  if (topDay) {
    insights.push({
      type: 'info',
      icon: '📅',
      title: 'Peak Spending Day',
      description: `You spend the most on ${topDay[0]}s (₹${topDay[1].toFixed(0)} total). Consider planning major purchases on other days.`
    });
  }

  // Category insight
  const categorySpending = {};
  allExpenses.forEach(exp => {
    categorySpending[exp.category] = (categorySpending[exp.category] || 0) + exp.amount;
  });
  const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    const percentage = (topCategory[1] / allExpenses.reduce((sum, exp) => sum + exp.amount, 0) * 100).toFixed(1);
    insights.push({
      type: 'warning',
      icon: '🎯',
      title: 'Top Spending Category',
      description: `${topCategory[0]} accounts for ${percentage}% of your spending (₹${topCategory[1].toFixed(0)}). Review if this aligns with your priorities.`
    });
  }

  // Trend insight
  const recentSpending = allExpenses.filter(exp => {
    const date = new Date(exp.date);
    const daysAgo = (new Date() - date) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  }).reduce((sum, exp) => sum + exp.amount, 0);

  const previousSpending = allExpenses.filter(exp => {
    const date = new Date(exp.date);
    const daysAgo = (new Date() - date) / (1000 * 60 * 60 * 24);
    return daysAgo > 30 && daysAgo <= 60;
  }).reduce((sum, exp) => sum + exp.amount, 0);

  if (previousSpending > 0) {
    const change = ((recentSpending - previousSpending) / previousSpending * 100).toFixed(1);
    const type = change > 0 ? 'warning' : 'success';
    const icon = change > 0 ? '📈' : '📉';
    insights.push({
      type,
      icon,
      title: 'Spending Trend',
      description: `Your spending has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}% compared to the previous month.`
    });
  }

  // Render insights
  insights.forEach(insight => {
    const card = document.createElement('div');
    card.className = `insight-card ${insight.type}`;
    card.innerHTML = `
      <div class="insight-title">
        <span>${insight.icon}</span>
        <span>${insight.title}</span>
      </div>
      <div class="insight-description">${insight.description}</div>
    `;
    container.appendChild(card);
  });
}

// Show empty state
function showEmptyState() {
  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-title">No Spending Data</div>
      <div class="empty-state-description">
        Start tracking expenses to see your spending patterns and insights.
      </div>
      <a href="expenses.html" class="btn btn-primary" style="margin-top: 1rem;">
        Add Expense
      </a>
    </div>
  `;
}

// Export report
function exportReport() {
  try {
    const report = {
      dateRange: `Last ${dateRange} days`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalExpenses: allExpenses.length,
        totalSpending: allExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        avgDaily: allExpenses.reduce((sum, exp) => sum + exp.amount, 0) / dateRange
      },
      expenses: allExpenses
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spending-patterns-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export report');
  }
}

// Initialize on load
init();
