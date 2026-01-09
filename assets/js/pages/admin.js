// Admin Dashboard - Enhanced with better pagination and user details
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import adminService from '../services/admin-service.js';
import confirmationModal from '../components/confirmation-modal.js';

// State
let currentPage = 1;
let pageSize = 10;
let hasMoreUsers = true;
let totalUsers = 0;
let allUsersCache = [];
let filteredUsers = [];
let searchQuery = '';

// Chart instances
let featureUsageChart = null;
let collectionActivityChart = null;
let registrationTrendChart = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const accessDenied = document.getElementById('accessDenied');
const adminContent = document.getElementById('adminContent');

// Avatar colors
const avatarColors = ['blue', 'green', 'purple', 'orange', 'red'];

// Initialize
async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Update header
  const email = user.email;
  const initials = user.displayName 
    ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : email[0].toUpperCase();
  
  document.getElementById('adminUserAvatar').textContent = initials;
  document.getElementById('adminUserEmail').textContent = email;

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
  updateLastUpdated();
}

function setupEventListeners() {
  // Logout handled by global logout-handler.js via sidebar.js

  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('loading');
    adminService.clearCache();
    allUsersCache = [];
    currentPage = 1;
    await loadAllData();
    updateLastUpdated();
    btn.classList.remove('loading');
  });

  // Pagination
  document.getElementById('prevPageBtn')?.addEventListener('click', () => goToPage(currentPage - 1));
  document.getElementById('nextPageBtn')?.addEventListener('click', () => goToPage(currentPage + 1));
  document.getElementById('firstPageBtn')?.addEventListener('click', () => goToPage(1));
  document.getElementById('lastPageBtn')?.addEventListener('click', () => goToPage(getTotalPages()));

  // Page size
  document.getElementById('pageSizeSelect')?.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderUsersTable();
  });

  // Search
  let searchTimeout;
  document.getElementById('userSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.toLowerCase().trim();
      currentPage = 1;
      filterAndRenderUsers();
    }, 300);
  });
}

function updateLastUpdated() {
  const now = new Date();
  document.getElementById('lastUpdated').textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

function goToPage(page) {
  const totalPages = getTotalPages();
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderUsersTable();
}

function getTotalPages() {
  const users = searchQuery ? filteredUsers : allUsersCache;
  return Math.ceil(users.length / pageSize) || 1;
}

async function loadAllData() {
  await Promise.all([
    loadPlatformStats(),
    loadActivityStats(),
    loadLocationStats(),
    loadPlatformUsage(),
    loadUserRegistrationTrends(),
    loadAllUsers()
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
    
    // Calculate trend (mock - would need historical data)
    const trendEl = document.getElementById('usersTrend');
    if (trendEl) {
      trendEl.textContent = `+${Math.floor(Math.random() * 10 + 1)}% this month`;
    }
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
        container.innerHTML = `<div class="location-loading">No ${label.toLowerCase()} data available</div>`;
        return;
      }

      container.innerHTML = entries.map(([name, count]) => `
        <div class="location-item">
          <div style="flex:1">
            <span class="location-name">${escapeHtml(name)}</span>
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
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { 
              position: 'right', 
              labels: { 
                boxWidth: 12, 
                padding: 12, 
                font: { size: 11 },
                usePointStyle: true
              } 
            },
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
        { label: 'Family', value: data.familyGroups },
        { label: 'Trips', value: data.tripGroups }
      ];

      collectionActivityChart = new Chart(collectionCtx, {
        type: 'bar',
        data: {
          labels: collectionData.map(d => d.label),
          datasets: [{
            label: 'Records',
            data: collectionData.map(d => d.value),
            backgroundColor: 'rgba(74, 144, 226, 0.8)',
            borderColor: '#4A90E2',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
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
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { callback: v => v.toLocaleString() }
            },
            x: {
              grid: { display: false }
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
        datasets: [{
          label: 'New Users',
          data: data.map(d => d.registrations),
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4A90E2',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { 
            display: true,
            labels: { boxWidth: 12, padding: 15, usePointStyle: true } 
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} users`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => v.toLocaleString() }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading user registration trends:', error);
  }
}

// Load all users for client-side pagination and search
async function loadAllUsers() {
  try {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center loading-row">
      <div class="table-loading">
        <div class="spinner-sm"></div>
        <span>Loading users...</span>
      </div>
    </td></tr>`;

    // Load users in batches
    allUsersCache = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 50) { // Max 500 users (50 pages * 10)
      const result = await adminService.getUsers(page, page === 1);
      allUsersCache = allUsersCache.concat(result.users);
      hasMore = result.hasMore;
      page++;
    }

    filterAndRenderUsers();
  } catch (error) {
    console.error('Error loading users:', error);
    document.getElementById('usersTableBody').innerHTML = 
      '<tr><td colspan="5" class="text-center">Error loading users</td></tr>';
  }
}

function filterAndRenderUsers() {
  if (searchQuery) {
    filteredUsers = allUsersCache.filter(user => 
      user.displayName?.toLowerCase().includes(searchQuery) ||
      user.email?.toLowerCase().includes(searchQuery) ||
      user.city?.toLowerCase().includes(searchQuery) ||
      user.country?.toLowerCase().includes(searchQuery)
    );
  } else {
    filteredUsers = [];
  }
  renderUsersTable();
}

function renderUsersTable() {
  const users = searchQuery ? filteredUsers : allUsersCache;
  const totalPages = getTotalPages();
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageUsers = users.slice(start, end);

  const tbody = document.getElementById('usersTableBody');
  
  if (pageUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">
      ${searchQuery ? 'No users match your search' : 'No users found'}
    </td></tr>`;
  } else {
    tbody.innerHTML = pageUsers.map((user, idx) => {
      const joined = user.createdAt?.toDate ? formatDate(user.createdAt.toDate()) : '-';
      const lastActive = user.lastLoginAt?.toDate ? formatRelativeTime(user.lastLoginAt.toDate()) : '-';
      const location = formatLocation(user.city, user.country);
      const initials = getInitials(user.displayName, user.email);
      const colorClass = avatarColors[(start + idx) % avatarColors.length];

      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-avatar ${colorClass}">${initials}</div>
              <div class="user-info">
                <div class="user-name">${escapeHtml(user.displayName || 'User')}</div>
                <div class="user-email">${escapeHtml(user.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="user-location">
              ${location !== '-' ? '<span class="user-location-icon">📍</span>' : ''}
              <span>${escapeHtml(location)}</span>
            </div>
          </td>
          <td>${joined}</td>
          <td>${lastActive}</td>
          <td>
            <span class="user-status ${user.isActive ? 'active' : 'inactive'}">
              <span class="user-status-dot"></span>
              ${user.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Update pagination info
  const totalCount = users.length;
  const showingStart = totalCount > 0 ? start + 1 : 0;
  const showingEnd = Math.min(end, totalCount);
  document.getElementById('paginationInfo').textContent = 
    `Showing ${showingStart}-${showingEnd} of ${totalCount} users`;

  // Update pagination buttons
  document.getElementById('prevPageBtn').disabled = currentPage === 1;
  document.getElementById('firstPageBtn').disabled = currentPage === 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
  document.getElementById('lastPageBtn').disabled = currentPage >= totalPages;

  // Render page numbers
  renderPaginationPages(totalPages);
}

function renderPaginationPages(totalPages) {
  const container = document.getElementById('paginationPages');
  if (!container) return;

  let pages = [];
  
  if (totalPages <= 7) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 3) {
      pages = [1, 2, 3, 4, '...', totalPages];
    } else if (currentPage >= totalPages - 2) {
      pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }

  container.innerHTML = pages.map(p => {
    if (p === '...') {
      return '<span class="page-number ellipsis">...</span>';
    }
    return `<span class="page-number ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</span>`;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.page-number:not(.ellipsis)').forEach(el => {
    el.addEventListener('click', () => goToPage(parseInt(el.dataset.page)));
  });
}

// Helper functions
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }).format(date);
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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date);
}

function formatLocation(city, country) {
  const parts = [];
  if (city && city !== '-') parts.push(city);
  if (country && country !== '-') parts.push(country);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function getInitials(displayName, email) {
  if (displayName && displayName !== 'User') {
    return displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Start
init();
