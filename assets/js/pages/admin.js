// Admin Dashboard Page Logic
import authService from '../services/auth-service.js';
import adminService from '../services/admin-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatCurrencyCompact } from '../utils/helpers.js';

// Chart instances
let expenseCategoryChart = null;
let incomeSourceChart = null;
let monthlyTrendChart = null;
let userGrowthChart = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const accessDenied = document.getElementById('accessDenied');
const adminContent = document.getElementById('adminContent');
const refreshBtn = document.getElementById('refreshBtn');

// Initialize page
async function init() {
  // Check authentication
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Load user profile
  loadUserProfile(user);
  setupEventListeners();

  // Check admin access
  const isAdmin = await adminService.isAdmin();
  
  loadingState.style.display = 'none';
  
  if (!isAdmin) {
    accessDenied.style.display = 'flex';
    return;
  }

  adminContent.style.display = 'block';
  
  // Load all admin data
  await loadAdminData();
}

function loadUserProfile(user) {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  if (userName) userName.textContent = user.displayName || 'Admin';
  if (userEmail) userEmail.textContent = user.email;
  if (userAvatar) {
    userAvatar.textContent = (user.displayName || user.email || 'A')[0].toUpperCase();
  }
}

function setupEventListeners() {
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

  sidebarOpen?.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
  });

  sidebarClose?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await authService.signOut();
    window.location.href = 'login.html';
  });

  // Refresh button
  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.classList.add('loading');
    adminService.clearCache();
    await loadAdminData();
    refreshBtn.classList.remove('loading');
    toast.success('Data refreshed');
  });
}


// Load all admin data
async function loadAdminData() {
  try {
    await Promise.all([
      loadPlatformStats(),
      loadActivityStats(),
      loadLocationStats(),
      loadExpensesByCategory(),
      loadIncomeBySource(),
      loadMonthlyTrends(),
      loadUserGrowth(),
      loadRecentUsers()
    ]);
  } catch (error) {
    console.error('Error loading admin data:', error);
    toast.error('Failed to load some data');
  }
}

// Load platform statistics
async function loadPlatformStats() {
  try {
    const stats = await adminService.getPlatformStats();
    
    document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
    document.getElementById('totalIncome').textContent = formatCurrencyCompact(stats.totalIncome);
    document.getElementById('totalExpenses').textContent = formatCurrencyCompact(stats.totalExpenses);
    document.getElementById('netSavings').textContent = formatCurrencyCompact(stats.netSavings);
    document.getElementById('totalFamilyGroups').textContent = stats.totalFamilyGroups.toLocaleString();
    document.getElementById('totalTripGroups').textContent = stats.totalTripGroups.toLocaleString();
    
    // Insights
    document.getElementById('avgExpensePerUser').textContent = formatCurrency(stats.avgExpensePerUser);
    document.getElementById('avgIncomePerUser').textContent = formatCurrency(stats.avgIncomePerUser);
    document.getElementById('totalTransactions').textContent = (stats.expenseCount + stats.incomeCount).toLocaleString();
  } catch (error) {
    console.error('Error loading platform stats:', error);
  }
}

// Load user activity statistics
async function loadActivityStats() {
  try {
    const stats = await adminService.getUserActivityStats();
    
    document.getElementById('activeToday').textContent = stats.activeToday.toLocaleString();
    document.getElementById('activeThisWeek').textContent = stats.activeThisWeek.toLocaleString();
    document.getElementById('activeThisMonth').textContent = stats.activeThisMonth.toLocaleString();
    document.getElementById('inactiveUsers').textContent = stats.inactiveUsers.toLocaleString();
  } catch (error) {
    console.error('Error loading activity stats:', error);
  }
}

// Load location statistics
async function loadLocationStats() {
  try {
    const locationData = await adminService.getUsersByLocation();
    
    // Render country list
    const countryList = document.getElementById('countryList');
    const countries = Object.entries(locationData.byCountry);
    const maxCountryCount = countries.length > 0 ? countries[0][1] : 1;
    
    if (countries.length === 0 && locationData.unknown > 0) {
      countryList.innerHTML = `
        <div class="location-item">
          <span class="location-name">Unknown</span>
          <span class="location-count">${locationData.unknown}</span>
        </div>
        <p class="text-muted" style="margin-top: 1rem; font-size: 0.875rem;">
          Users haven't set their location yet
        </p>
      `;
    } else if (countries.length === 0) {
      countryList.innerHTML = '<p class="text-muted">No location data available</p>';
    } else {
      countryList.innerHTML = countries.slice(0, 10).map(([country, count]) => `
        <div class="location-item">
          <div>
            <span class="location-name">${country}</span>
            <div class="location-bar">
              <div class="location-bar-fill" style="width: ${(count / maxCountryCount) * 100}%"></div>
            </div>
          </div>
          <span class="location-count">${count}</span>
        </div>
      `).join('');
      
      if (locationData.unknown > 0) {
        countryList.innerHTML += `
          <div class="location-item" style="opacity: 0.6;">
            <span class="location-name">Unknown</span>
            <span class="location-count">${locationData.unknown}</span>
          </div>
        `;
      }
    }
    
    // Render city list
    const cityList = document.getElementById('cityList');
    const cities = Object.entries(locationData.byCity);
    const maxCityCount = cities.length > 0 ? cities[0][1] : 1;
    
    if (cities.length === 0) {
      cityList.innerHTML = '<p class="text-muted">No city data available</p>';
    } else {
      cityList.innerHTML = cities.slice(0, 10).map(([city, count]) => `
        <div class="location-item">
          <div>
            <span class="location-name">${city}</span>
            <div class="location-bar">
              <div class="location-bar-fill" style="width: ${(count / maxCityCount) * 100}%"></div>
            </div>
          </div>
          <span class="location-count">${count}</span>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading location stats:', error);
  }
}


// Load expenses by category chart
async function loadExpensesByCategory() {
  try {
    const data = await adminService.getExpensesByCategory();
    const top10 = data.slice(0, 10);
    
    const ctx = document.getElementById('expenseCategoryChart').getContext('2d');
    
    if (expenseCategoryChart) {
      expenseCategoryChart.destroy();
    }
    
    const colors = [
      '#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#7B68EE',
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
    ];
    
    expenseCategoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top10.map(d => d.category),
        datasets: [{
          data: top10.map(d => d.total),
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
              padding: 10,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading expenses by category:', error);
  }
}

// Load income by source chart
async function loadIncomeBySource() {
  try {
    const data = await adminService.getIncomeBySource();
    const top10 = data.slice(0, 10);
    
    const ctx = document.getElementById('incomeSourceChart').getContext('2d');
    
    if (incomeSourceChart) {
      incomeSourceChart.destroy();
    }
    
    const colors = [
      '#2ECC71', '#27AE60', '#1ABC9C', '#16A085', '#3498DB',
      '#2980B9', '#9B59B6', '#8E44AD', '#F39C12', '#E67E22'
    ];
    
    incomeSourceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top10.map(d => d.source),
        datasets: [{
          data: top10.map(d => d.total),
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
              padding: 10,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading income by source:', error);
  }
}

// Load monthly trends chart
async function loadMonthlyTrends() {
  try {
    const data = await adminService.getMonthlyTrends(12);
    
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    
    if (monthlyTrendChart) {
      monthlyTrendChart.destroy();
    }
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color');
    
    monthlyTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => {
          const [year, month] = d.month.split('-');
          return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }),
        datasets: [
          {
            label: 'Income',
            data: data.map(d => d.income),
            borderColor: '#2ECC71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Expenses',
            data: data.map(d => d.expenses),
            borderColor: '#E74C3C',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Savings',
            data: data.map(d => d.savings),
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            labels: { color: textColor }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: (value) => formatCurrencyCompact(value)
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading monthly trends:', error);
  }
}


// Load user growth chart
async function loadUserGrowth() {
  try {
    const data = await adminService.getPlatformGrowth();
    
    const ctx = document.getElementById('userGrowthChart').getContext('2d');
    
    if (userGrowthChart) {
      userGrowthChart.destroy();
    }
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color');
    
    userGrowthChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => {
          const [year, month] = d.month.split('-');
          return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }),
        datasets: [
          {
            label: 'New Users',
            data: data.map(d => d.newUsers),
            backgroundColor: '#4A90E2',
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Total Users',
            data: data.map(d => d.totalUsers),
            type: 'line',
            borderColor: '#2ECC71',
            backgroundColor: 'transparent',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            labels: { color: textColor }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: gridColor },
            ticks: { color: textColor },
            title: {
              display: true,
              text: 'New Users',
              color: textColor
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: textColor },
            title: {
              display: true,
              text: 'Total Users',
              color: textColor
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading user growth:', error);
  }
}

// Load recent users table
async function loadRecentUsers() {
  try {
    const users = await adminService.getRecentUsers(10);
    const tbody = document.getElementById('recentUsersTable');
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
      return;
    }
    
    tbody.innerHTML = users.map(user => {
      const joinedDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
      const lastActiveDate = user.lastLoginAt?.toDate ? user.lastLoginAt.toDate() : null;
      
      const location = user.city && user.country 
        ? `${user.city}, ${user.country}` 
        : user.city || user.country || '-';
      
      return `
        <tr>
          <td>
            <div class="user-email">${user.displayName || 'User'}</div>
            <div class="user-location">${user.email}</div>
          </td>
          <td>${location}</td>
          <td>${formatDate(joinedDate)}</td>
          <td>${lastActiveDate ? formatRelativeTime(lastActiveDate) : '-'}</td>
          <td>
            <span class="user-status ${user.isActive ? 'active' : 'inactive'}">
              ${user.isActive ? '● Active' : '○ Inactive'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading recent users:', error);
  }
}

// Helper: Format date
function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Helper: Format relative time
function formatRelativeTime(date) {
  if (!date) return '-';
  
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatDate(date);
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
