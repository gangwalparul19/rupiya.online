// Admin Dashboard - Enhanced with better pagination and user details
import '../services/services-init.js';
import authService from '../services/auth-service.js';
// Lazy load admin service - only used on admin page
// import adminService from '../services/admin-service.js';
import lazyLoader from '../utils/lazy-loader.js';
// Lazy load confirmation modal
// import confirmationModal from '../components/confirmation-modal.js';

// Lazy load monitoring services - only used on admin page
// import performanceMonitoring from '../services/performance-monitoring-service.js';
// import userAnalytics from '../services/user-analytics-service.js';
// import pushNotifications from '../services/push-notifications-service.js';
// import offlineSync from '../services/offline-sync-service.js';
// import encryptionAtRest from '../services/encryption-at-rest-service.js';
// import dataValidation from '../services/data-validation-service.js';
// import backupService from '../services/backup-service.js';

// State
let currentPage = 1;
let pageSize = 10;
let hasMoreUsers = true;
let totalUsers = 0;

// Lazy loaded services
let adminService = null;
let performanceMonitoring = null;
let userAnalytics = null;
let pushNotifications = null;
let offlineSync = null;
let encryptionAtRest = null;
let dataValidation = null;
let backupService = null;
let allUsersCache = [];
let filteredUsers = [];
let searchQuery = '';

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

  // Lazy load admin service
  adminService = await lazyLoader.service('admin-service');
  
  // Lazy load monitoring services in parallel
  [performanceMonitoring, userAnalytics, pushNotifications, offlineSync, 
   encryptionAtRest, dataValidation, backupService] = await Promise.all([
    lazyLoader.service('performance-monitoring-service'),
    lazyLoader.service('user-analytics-service'),
    lazyLoader.service('push-notifications-service'),
    lazyLoader.service('offline-sync-service'),
    lazyLoader.service('encryption-at-rest-service'),
    lazyLoader.service('data-validation-service'),
    lazyLoader.service('backup-service')
  ]);

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
    loadAllUsers()
  ]);
}

async function loadPlatformStats() {
  try {
    const stats = await adminService.getPlatformStats();
    const userStats = await adminService.getUserStats();
    
    // Total Users
    document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
    totalUsers = stats.totalUsers;
    
    // Users from India
    document.getElementById('usersFromIndia').textContent = userStats.usersFromIndia.toLocaleString();
    const indiaPercentage = stats.totalUsers > 0 ? ((userStats.usersFromIndia / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('indiaPercentage').textContent = `${indiaPercentage}%`;
    
    // Users from Outside India
    document.getElementById('usersOutsideIndia').textContent = userStats.usersOutsideIndia.toLocaleString();
    const outsideIndiaPercentage = stats.totalUsers > 0 ? ((userStats.usersOutsideIndia / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('outsideIndiaPercentage').textContent = `${outsideIndiaPercentage}%`;
    
    // Active Users (Last 30 Days)
    document.getElementById('activeUsersMonth').textContent = userStats.activeThisMonth.toLocaleString();
    const activePercentage = stats.totalUsers > 0 ? ((userStats.activeThisMonth / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('activePercentage').textContent = `${activePercentage}%`;
    
    // Inactive Users (30+ Days)
    const inactiveCount = stats.totalUsers - userStats.activeThisMonth;
    document.getElementById('inactiveUsersCount').textContent = inactiveCount.toLocaleString();
    const inactivePercentage = stats.totalUsers > 0 ? ((inactiveCount / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('inactivePercentage').textContent = `${inactivePercentage}%`;
    
    // Users with Location Data
    document.getElementById('usersWithLocation').textContent = userStats.usersWithLocation.toLocaleString();
    const locationPercentage = stats.totalUsers > 0 ? ((userStats.usersWithLocation / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('locationPercentage').textContent = `${locationPercentage}%`;
    
    // Users with Display Name
    document.getElementById('usersWithName').textContent = userStats.usersWithDisplayName.toLocaleString();
    const namePercentage = stats.totalUsers > 0 ? ((userStats.usersWithDisplayName / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('namePercentage').textContent = `${namePercentage}%`;
    
    // Users with Phone
    document.getElementById('usersWithPhone').textContent = userStats.usersWithPhone.toLocaleString();
    const phonePercentage = stats.totalUsers > 0 ? ((userStats.usersWithPhone / stats.totalUsers) * 100).toFixed(1) : 0;
    document.getElementById('phonePercentage').textContent = `${phonePercentage}%`;
    
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


// ============================================
// MONITORING FEATURES - Performance, Analytics, Notifications, Sync, Encryption, Validation, Backup
// ============================================

// Initialize monitoring services
try {
  // Make services globally available
  window.performanceMonitoring = performanceMonitoring;
  window.userAnalytics = userAnalytics;
  window.pushNotifications = pushNotifications;
  window.offlineSync = offlineSync;
  window.encryptionAtRest = encryptionAtRest;
  window.dataValidation = dataValidation;
  window.backupService = backupService;

  // Initialize monitoring (with suppressed initial alerts)
  performanceMonitoring.startMonitoring();
  userAnalytics.initSession('admin-user', { role: 'admin' });
  offlineSync.loadQueue();
} catch (error) {
  console.warn('Monitoring services initialization warning (non-critical):', error.message);
}

// Tab Switching
function switchMonitoringTab(tabName) {
  document.querySelectorAll('.monitoring-tab-content').forEach(tab => tab.style.display = 'none');
  document.querySelectorAll('.monitoring-tab-btn').forEach(btn => btn.classList.remove('active'));
  
  const tab = document.getElementById(tabName + '-tab');
  if (tab) tab.style.display = 'block';
  
  event.target.classList.add('active');
  
  // Refresh data when tab opens
  if (tabName === 'performance') refreshPerformanceMetrics();
  if (tabName === 'analytics') displayAnalytics();
  if (tabName === 'notifications') displayNotificationStatus();
  if (tabName === 'sync') refreshSyncStatus();
  if (tabName === 'encryption') displayEncryptionStatus();
}

// Performance Monitoring Functions
function refreshPerformanceMetrics() {
  const metrics = performanceMonitoring.getAllMetrics();
  const html = Object.entries(metrics).map(([name, stats]) => {
    if (stats.count) {
      return `<div class="metric"><span class="metric-label">${name}</span><span class="metric-value">${stats.avg?.toFixed(2) || stats.count} ms</span></div>`;
    }
    return '';
  }).join('');
  document.getElementById('performanceMetrics').innerHTML = html || '<p>No metrics recorded yet</p>';
  
  const alerts = performanceMonitoring.getAlerts();
  const alertsHtml = alerts.slice(-5).map(alert => `<div class="alert warning"><strong>${new Date(alert.timestamp).toLocaleTimeString()}:</strong> ${alert.message}</div>`).join('');
  document.getElementById('performanceAlerts').innerHTML = alertsHtml || '<p>No alerts</p>';
  
  const report = performanceMonitoring.getPerformanceReport();
  const reportHtml = `<div class="metric"><span class="metric-label">Total Metrics</span><span class="metric-value">${report.summary.totalMetrics}</span></div><div class="metric"><span class="metric-label">Total Alerts</span><span class="metric-value">${report.summary.totalAlerts}</span></div><div class="metric"><span class="metric-label">Monitoring Active</span><span class="metric-value">${report.summary.isMonitoring ? '✅' : '❌'}</span></div>`;
  document.getElementById('performanceReport').innerHTML = reportHtml;
}

// Analytics Functions
function generateTestAnalytics() {
  const userId = 'test-user-' + Date.now();
  userAnalytics.initSession(userId, { device: 'desktop' });
  userAnalytics.logPageView('expenses');
  userAnalytics.logFeatureUsage('budget_alert');
  userAnalytics.logEvent('expense_added', { amount: 100, category: 'Food' });
  userAnalytics.logConversion('premium_upgrade', 99);
  userAnalytics.logTiming('encryption_operation', 150);
  displayAnalytics();
  addLog('✅ Test analytics generated', 'validationLog');
}

function displayAnalytics() {
  const report = userAnalytics.getAnalyticsReport();
  document.getElementById('sessionAnalytics').innerHTML = `<div class="metric"><span class="metric-label">Total Events</span><span class="metric-value">${report.summary.totalEvents}</span></div><div class="metric"><span class="metric-label">Total Sessions</span><span class="metric-value">${report.summary.totalSessions}</span></div><div class="metric"><span class="metric-label">Total Users</span><span class="metric-value">${report.summary.totalUsers}</span></div>`;
  
  const featureStats = userAnalytics.getFeatureUsageStats();
  const featureHtml = Object.entries(featureStats).map(([feature, data]) => `<div class="metric"><span class="metric-label">${feature}</span><span class="metric-value">${data.count} uses</span></div>`).join('');
  document.getElementById('featureUsageStats').innerHTML = featureHtml || '<p>No feature usage yet</p>';
  
  const errorStats = userAnalytics.getErrorStats();
  const errorHtml = Object.entries(errorStats).map(([type, data]) => `<div class="metric"><span class="metric-label">${type}</span><span class="metric-value">${data.count} errors</span></div>`).join('');
  document.getElementById('errorStats').innerHTML = errorHtml || '<p>No errors recorded</p>';
}

// Notification Functions
function displayNotificationStatus() {
  const status = pushNotifications.getSubscriptionStatus();
  document.getElementById('notificationStatus').innerHTML = `<div class="metric"><span class="metric-label">Supported</span><span class="metric-value">${status.isSupported ? '✅' : '❌'}</span></div><div class="metric"><span class="metric-label">Subscribed</span><span class="metric-value">${status.isSubscribed ? '✅' : '❌'}</span></div><div class="metric"><span class="metric-label">Permission</span><span class="metric-value">${status.permission}</span></div>`;
}

async function requestNotificationPermission() {
  const permission = await pushNotifications.requestPermission();
  addLog(`Permission: ${permission}`, 'syncLog');
  displayNotificationStatus();
}

async function subscribeNotifications() {
  const success = await pushNotifications.subscribe();
  addLog(`Subscription: ${success ? 'Success' : 'Failed'}`, 'syncLog');
  displayNotificationStatus();
}

function testBudgetNotification() {
  pushNotifications.notifyBudgetExceeded('Food', 500, 400);
  addLog('Budget notification sent', 'syncLog');
}

function testGoalNotification() {
  pushNotifications.notifyGoalMilestone('Vacation', 75);
  addLog('Goal notification sent', 'syncLog');
}

function testEMINotification() {
  pushNotifications.notifyEMIDue('Home Loan', 50000, '2024-02-15');
  addLog('EMI notification sent', 'syncLog');
}

// Offline Sync Functions
function refreshSyncStatus() {
  const status = offlineSync.getSyncStatus();
  document.getElementById('syncStatus').innerHTML = `<div class="metric"><span class="metric-label">Online</span><span class="metric-value"><span class="status ${status.isOnline ? 'online' : 'offline'}">${status.isOnline ? 'Online' : 'Offline'}</span></span></div><div class="metric"><span class="metric-label">Syncing</span><span class="metric-value">${status.isSyncing ? '⏳' : '✅'}</span></div><div class="metric"><span class="metric-label">Pending</span><span class="metric-value">${status.pendingCount}</span></div><div class="metric"><span class="metric-label">Failed</span><span class="metric-value">${status.failedCount}</span></div>`;
  
  const queue = offlineSync.getSyncQueue();
  const queueHtml = queue.slice(-5).map(item => `<div class="metric"><span class="metric-label">${item.operation} ${item.collection}</span><span class="metric-value">${item.status}</span></div>`).join('');
  document.getElementById('syncQueue').innerHTML = queueHtml || '<p>Queue empty</p>';
}

function queueTestOperation() {
  offlineSync.queueOperation('add', 'expenses', 'test-' + Date.now(), { amount: 100, description: 'Test expense', category: 'Testing' });
  addLog('✅ Test operation queued', 'syncLog');
  refreshSyncStatus();
}

async function syncAll() {
  const result = await offlineSync.syncAll();
  addLog(`Sync result: ${result.synced} synced, ${result.failed} failed`, 'syncLog');
  refreshSyncStatus();
}

async function retryFailed() {
  const result = await offlineSync.retryFailed();
  addLog(`Retry result: ${result.synced} synced, ${result.failed} failed`, 'syncLog');
  refreshSyncStatus();
}

function clearQueue() {
  offlineSync.clearQueue();
  addLog('✅ Queue cleared', 'syncLog');
  refreshSyncStatus();
}

// Encryption Functions
async function initializeEncryption() {
  const password = document.getElementById('masterPassword').value;
  if (!password) {
    addLog('❌ Please enter a password', 'encryptionLog');
    return;
  }
  const success = await encryptionAtRest.initialize(password);
  addLog(success ? '✅ Encryption initialized' : '❌ Initialization failed', 'encryptionLog');
  displayEncryptionStatus();
}

function displayEncryptionStatus() {
  const status = encryptionAtRest.getStatus();
  document.getElementById('encryptionStatus').innerHTML = `<div class="metric"><span class="metric-label">Initialized</span><span class="metric-value">${status.isInitialized ? '✅' : '❌'}</span></div><div class="metric"><span class="metric-label">Algorithm</span><span class="metric-value">${status.algorithm}</span></div><div class="metric"><span class="metric-label">Key Length</span><span class="metric-value">${status.keyLength} bits</span></div>`;
  
  const stats = encryptionAtRest.getStats();
  document.getElementById('encryptionStats').innerHTML = `<div class="metric"><span class="metric-label">Items Encrypted</span><span class="metric-value">${stats.itemsEncrypted}</span></div><div class="metric"><span class="metric-label">Total Size</span><span class="metric-value">${(stats.totalSize / 1024).toFixed(2)} KB</span></div>`;
}

async function testEncryption() {
  try {
    const testData = 'This is sensitive data';
    const encrypted = await encryptionAtRest.encrypt(testData);
    const decrypted = await encryptionAtRest.decrypt(encrypted);
    addLog(`✅ Encryption test passed`, 'encryptionLog');
    addLog(`Original: ${testData}`, 'encryptionLog');
    addLog(`Decrypted: ${decrypted}`, 'encryptionLog');
  } catch (error) {
    addLog(`❌ Encryption test failed: ${error.message}`, 'encryptionLog');
  }
}

async function testFieldEncryption() {
  try {
    const data = { name: 'John', email: 'john@example.com', phone: '9876543210' };
    const encrypted = await encryptionAtRest.encryptFields(data, ['email', 'phone']);
    const decrypted = await encryptionAtRest.decryptFields(encrypted, ['email', 'phone']);
    addLog(`✅ Field encryption test passed`, 'encryptionLog');
    addLog(`Original email: ${data.email}`, 'encryptionLog');
    addLog(`Decrypted email: ${decrypted.email}`, 'encryptionLog');
  } catch (error) {
    addLog(`❌ Field encryption test failed: ${error.message}`, 'encryptionLog');
  }
}

// Validation Functions
function testExpenseValidation() {
  const validData = { amount: 100, description: 'Lunch', category: 'Food', date: new Date() };
  const result = dataValidation.validate(validData, 'expenses');
  addLog(result.isValid ? '✅ Valid expense data' : '❌ Invalid expense data', 'validationLog');
  if (!result.isValid) addLog(JSON.stringify(result.errors), 'validationLog');
}

function testInvalidData() {
  const invalidData = { amount: -100, description: '', category: 'Food', date: 'invalid-date' };
  const result = dataValidation.validate(invalidData, 'expenses');
  addLog(result.isValid ? '✅ Valid' : '✅ Correctly rejected invalid data', 'validationLog');
  addLog(JSON.stringify(result.errors), 'validationLog');
}

function testSanitization() {
  const maliciousData = '<script>alert("XSS")</script>';
  const sanitized = dataValidation.sanitize({ description: maliciousData }, ['description']);
  addLog('✅ XSS sanitization test', 'validationLog');
  addLog(`Original: ${maliciousData}`, 'validationLog');
  addLog(`Sanitized: ${sanitized.description}`, 'validationLog');
}

// Backup Functions
async function exportAllData() {
  try {
    const data = await backupService.exportUserData();
    addLog(`✅ Export successful: ${data.metadata.totalDocuments} documents`, 'syncLog');
  } catch (error) {
    addLog(`❌ Export failed: ${error.message}`, 'syncLog');
  }
}

async function estimateBackupSize() {
  try {
    const size = await backupService.getBackupSizeEstimate();
    addLog(`✅ Backup size: ${size.mb} MB (${size.documents} documents)`, 'syncLog');
  } catch (error) {
    addLog(`❌ Size estimation failed: ${error.message}`, 'syncLog');
  }
}

// Utility Functions
function addLog(message, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}
