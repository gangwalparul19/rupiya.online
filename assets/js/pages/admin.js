// Admin Dashboard - Optimized with pagination
import authService from '../services/auth-service.js';
import adminService from '../services/admin-service.js';
import { formatCurrency, formatCurrencyCompact } from '../utils/helpers.js';

// State
let currentPage = 1;
let hasMoreUsers = true;
let totalUsers = 0;

// Chart instances
let featureUsageChart = null;
let collectionActivityChart = null;
let registrationTrendChart = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const accessDenied = document.getElementById('accessDenied');
const adminContent = document.getElementById('adminContent');

// Initialize
async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Update header
  document.getElementById('adminUserEmail').textContent = user.email;

  // Check admin access
  const isAdmin = await adminService.isAdmin();
  loadingState.style.display = 'none';

  if (!isAdmin) {
    accessDenied.style.display = 'flex';
    return;
  }

  adminContent.style.display = 'block';
  setupEventListeners();
  await loadAllData();
}

function setupEventListeners() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await authService.signOut();
    window.location.href = 'login.html';
  });

  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('loading');
    adminService.clearCache();
    currentPage = 1;
    await loadAllData();
    btn.classList.remove('loading');
  });

  document.getElementById('prevPageBtn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsers(true);
    }
  });

  document.getElementById('nextPageBtn')?.addEventListener('click', () => {
    if (hasMoreUsers) {
      currentPage++;
      loadUsers();
    }
  });
}

async function loadAllData() {
  await Promise.all([
    loadPlatformStats(),
    loadActivityStats(),
    loadLocationStats(),
    loadPlatformUsage(),
    loadUserRegistrationTrends(),
    loadUsers(true)
  ]);
}

async function loadPlatformStats() {
  try {
    const stats = await adminService.getPlatformStats();
    document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
    document.getElementById('totalTransactions').textContent = stats.totalTransactions.toLocaleString();
    document.getElementById('totalFamilyGroups').textContent = stats.totalFamilyGroups.toLocaleString();
    document.getElementById('totalTripGroups').textContent = stats.totalTripGroups.toLocaleString();
    totalUsers = stats.totalUsers;
  } catch (error) {
    console.error('Error loading platform stats:', error);
  }
}

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

async function loadLocationStats() {
  try {
    const data = await adminService.getUsersByLocation();
    
    const renderList = (containerId, items, label) => {
      const container = document.getElementById(containerId);
      const entries = Object.entries(items);
      const max = entries.length > 0 ? entries[0][1] : 1;

      if (entries.length === 0) {
        container.innerHTML = `<p class="text-muted">No ${label.toLowerCase()} data available</p>`;
        return;
      }

      container.innerHTML = entries.map(([name, count]) => `
        <div class="location-item">
          <div style="flex:1">
            <span class="location-name">${name}</span>
            <div class="location-bar">
              <div class="location-bar-fill" style="width:${(count/max)*100}%"></div>
            </div>
          </div>
          <span class="location-count">${count}</span>
        </div>
      `).join('');
    };

    renderList('countryList', data.byCountry, 'Country');
    renderList('cityList', data.byCity, 'City');
    
    // Update unknown count if element exists
    const unknownEl = document.getElementById('unknownLocationCount');
    if (unknownEl && data.unknown > 0) {
      unknownEl.textContent = `${data.unknown} users without location data`;
      unknownEl.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading location stats:', error);
  }
}

async function loadPlatformUsage() {
  try {
    const data = await adminService.getPlatformUsageStats();
    
    // Feature Usage Chart (doughnut)
    const featureCtx = document.getElementById('featureUsageChart')?.getContext('2d');
    if (featureCtx) {
      if (featureUsageChart) featureUsageChart.destroy();

      const featureData = [
        { label: 'Expenses', value: data.expenses },
        { label: 'Income', value: data.income },
        { label: 'Budgets', value: data.budgets },
        { label: 'Goals', value: data.goals },
        { label: 'Investments', value: data.investments },
        { label: 'Notes', value: data.notes }
      ].filter(item => item.value > 0);

      const colors = ['#e74c3c','#2ecc71','#3498db','#f39c12','#9b59b6','#1abc9c'];

      featureUsageChart = new Chart(featureCtx, {
        type: 'doughnut',
        data: {
          labels: featureData.map(d => d.label),
          datasets: [{ 
            data: featureData.map(d => d.value), 
            backgroundColor: colors.slice(0, featureData.length), 
            borderWidth: 0 
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.label}: ${ctx.raw.toLocaleString()} records`
              }
            }
          }
        }
      });
    }

    // Collection Activity Chart (bar)
    const collectionCtx = document.getElementById('collectionActivityChart')?.getContext('2d');
    if (collectionCtx) {
      if (collectionActivityChart) collectionActivityChart.destroy();

      const collectionData = [
        { label: 'Documents', value: data.documents },
        { label: 'Vehicles', value: data.vehicles },
        { label: 'Houses', value: data.houses },
        { label: 'Splits', value: data.splits },
        { label: 'Family Groups', value: data.familyGroups },
        { label: 'Trip Groups', value: data.tripGroups }
      ];

      collectionActivityChart = new Chart(collectionCtx, {
        type: 'bar',
        data: {
          labels: collectionData.map(d => d.label),
          datasets: [{
            label: 'Records',
            data: collectionData.map(d => d.value),
            backgroundColor: '#3498db',
            borderColor: '#2980b9',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.raw.toLocaleString()} records`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => v.toLocaleString() }
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error loading platform usage:', error);
  }
}

async function loadUserRegistrationTrends() {
  try {
    const data = await adminService.getUserRegistrationTrends();
    const ctx = document.getElementById('registrationTrendChart')?.getContext('2d');
    if (!ctx || data.length === 0) return;

    if (registrationTrendChart) registrationTrendChart.destroy();

    const labels = data.map(d => {
      const [year, month] = d.month.split('-');
      return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    registrationTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New Users',
            data: data.map(d => d.registrations),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52,152,219,0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { labels: { boxWidth: 12, padding: 15 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} users`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => v.toLocaleString() }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading user registration trends:', error);
  }
}

async function loadUsers(reset = false) {
  try {
    const { users, hasMore } = await adminService.getUsers(currentPage, reset);
    hasMoreUsers = hasMore;

    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
    } else {
      tbody.innerHTML = users.map(user => {
        const joined = user.createdAt?.toDate ? formatDate(user.createdAt.toDate()) : '-';
        const lastActive = user.lastLoginAt?.toDate ? formatRelativeTime(user.lastLoginAt.toDate()) : '-';
        const location = user.city !== '-' || user.country !== '-' 
          ? `${user.city}${user.city !== '-' && user.country !== '-' ? ', ' : ''}${user.country !== '-' ? user.country : ''}`
          : '-';

        return `
          <tr>
            <td>
              <div class="user-name">${escapeHtml(user.displayName)}</div>
              <div class="user-email">${escapeHtml(user.email)}</div>
            </td>
            <td>${escapeHtml(location)}</td>
            <td>${joined}</td>
            <td>${lastActive}</td>
            <td><span class="user-status ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
          </tr>
        `;
      }).join('');
    }

    // Update pagination
    document.getElementById('currentPage').textContent = `Page ${currentPage}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = !hasMore;
    
    const start = (currentPage - 1) * 10 + 1;
    const end = start + users.length - 1;
    document.getElementById('paginationInfo').textContent = `Showing ${start}-${end} of ${totalUsers} users`;
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Helpers
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Start
init();
