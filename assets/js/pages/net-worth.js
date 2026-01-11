// Net Worth Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import netWorthService from '../services/net-worth-service.js';
import transfersService from '../services/transfers-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatCurrencyCompact, escapeHtml } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State
let currentNetWorth = null;
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// Asset type icons
const assetIcons = {
  investments: '📈',
  realEstate: '🏠',
  vehicles: '🚗',
  savings: '🐷',
  other: '💰'
};

// Liability type icons
const liabilityIcons = {
  loans: '🏦',
  creditCards: '💳',
  other: '📋'
};

// Loan type icons
const loanTypeIcons = {
  home: '🏠',
  car: '🚗',
  personal: '💳',
  education: '🎓',
  gold: '🥇',
  business: '💼',
  'two-wheeler': '🏍️',
  'credit-card': '💳',
  other: '📋'
};

// Investment type icons
const investmentTypeIcons = {
  'Stocks': '📈',
  'Mutual Funds': '💼',
  'Real Estate': '🏠',
  'Cryptocurrency': '₿',
  'Gold': '🥇',
  'Fixed Deposit': '🏦',
  'Other': '💰'
};

// Helper function to safely format currency and prevent NaN
function safeFormatCurrency(value) {
  const num = parseFloat(value) || 0;
  return isNaN(num) ? '₹0' : formatCurrency(num);
}

// Helper function to safely format compact currency
function safeFormatCurrencyCompact(value) {
  const num = parseFloat(value) || 0;
  return isNaN(num) ? '₹0' : formatCurrencyCompact(num);
}

// Helper function to safely format percentage
function safeFormatPercent(value) {
  const num = parseFloat(value) || 0;
  return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
}
async function checkAuth() {
  try {
    const user = await authService.waitForAuth();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  } catch (error) {
    console.error('[NetWorth] Auth error:', error);
    window.location.href = 'login.html';
    return false;
  }
}

// Initialize
async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  
  // Check encryption reauth
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadNetWorth();
  });
  
  await initPage();
  
  // Load data again after encryption is ready (fixes race condition)
  await loadNetWorth();
}

init();

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Update user profile
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = user.displayName || 'User';
    document.getElementById('userEmail').textContent = user.email;
    
    setupEventListeners();
    await loadNetWorth();
    await loadCashFlow();
    await loadHistory();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
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
  
  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    toast.info('Refreshing...');
    await loadNetWorth();
    await loadCashFlow();
    toast.success('Data refreshed');
  });
  
  // Save snapshot button
  document.getElementById('saveSnapshotBtn')?.addEventListener('click', async () => {
    try {
      await netWorthService.saveSnapshot(currentNetWorth);
      toast.success('Snapshot saved successfully');
      await loadHistory();
    } catch (error) {
      console.error('Error saving snapshot:', error);
      toast.error('Failed to save snapshot');
    }
  });
  
  // Month navigation
  document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    updateMonthLabel();
    loadCashFlow();
  });
  
  document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    updateMonthLabel();
    loadCashFlow();
  });
  
  updateMonthLabel();
}

// Update month label
function updateMonthLabel() {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('currentMonthLabel').textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;
}

// Load net worth data
async function loadNetWorth() {
  try {
    currentNetWorth = await netWorthService.calculateNetWorth();
    
    // Update main net worth display
    document.getElementById('netWorthValue').textContent = safeFormatCurrency(currentNetWorth.netWorth);
    document.getElementById('totalAssets').textContent = safeFormatCurrency(currentNetWorth.totalAssets);
    document.getElementById('totalLiabilities').textContent = safeFormatCurrency(currentNetWorth.totalLiabilities);
    document.getElementById('assetsSectionTotal').textContent = safeFormatCurrency(currentNetWorth.totalAssets);
    document.getElementById('liabilitiesSectionTotal').textContent = safeFormatCurrency(currentNetWorth.totalLiabilities);
    
    // Update debt ratio
    const debtRatio = await netWorthService.getDebtToAssetRatio();
    document.getElementById('debtRatio').textContent = safeFormatPercent(debtRatio);
    
    // Update net worth change
    const change = await netWorthService.getNetWorthChange(30);
    const changeEl = document.getElementById('netWorthChange');
    const changeValueEl = changeEl.querySelector('.change-value');
    changeValueEl.textContent = `${(change.change || 0) >= 0 ? '+' : ''}${safeFormatCurrency(change.change)}`;
    changeValueEl.className = `change-value ${(change.change || 0) >= 0 ? 'positive' : 'negative'}`;
    
    // Render breakdowns
    renderAssetsBreakdown(currentNetWorth);
    renderLiabilitiesBreakdown(currentNetWorth);
    renderAllocationChart(currentNetWorth);
    
  } catch (error) {
    console.error('[NetWorth] Error loading net worth:', error);
    toast.error('Failed to load net worth data');
  }
}

// Render assets breakdown
function renderAssetsBreakdown(data) {
  const container = document.getElementById('assetsBreakdown');
  
  const assetCards = [];
  
  // Investments
  if (data.assets.investments > 0) {
    const invBreakdown = data.breakdown.investments;
    let detailsHtml = '';
    
    Object.entries(invBreakdown).forEach(([type, info]) => {
      const icon = investmentTypeIcons[type] || '💰';
      const gainLoss = info.value - info.invested;
      const gainLossClass = gainLoss >= 0 ? 'positive' : 'negative';
      
      detailsHtml += `
        <div class="breakdown-detail">
          <span class="detail-icon">${icon}</span>
          <span class="detail-name">${escapeHtml(type)}</span>
          <span class="detail-value">${safeFormatCurrencyCompact(info.value)}</span>
          <span class="detail-change ${gainLossClass}">${gainLoss >= 0 ? '+' : ''}${safeFormatCurrencyCompact(gainLoss)}</span>
        </div>
      `;
    });
    
    assetCards.push(`
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="breakdown-icon">${assetIcons.investments}</span>
          <span class="breakdown-title">Investments</span>
          <span class="breakdown-value">${safeFormatCurrency(data.assets.investments)}</span>
        </div>
        <div class="breakdown-details">${detailsHtml}</div>
        <a href="investments.html" class="breakdown-link">View All →</a>
      </div>
    `);
  }
  
  // Real Estate
  if (data.assets.realEstate > 0) {
    const reBreakdown = data.breakdown.realEstate;
    let detailsHtml = reBreakdown.map(house => `
      <div class="breakdown-detail">
        <span class="detail-icon">🏠</span>
        <span class="detail-name">${escapeHtml(house.name)}</span>
        <span class="detail-value">${safeFormatCurrencyCompact(house.currentValue)}</span>
      </div>
    `).join('');
    
    assetCards.push(`
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="breakdown-icon">${assetIcons.realEstate}</span>
          <span class="breakdown-title">Real Estate</span>
          <span class="breakdown-value">${safeFormatCurrency(data.assets.realEstate)}</span>
        </div>
        <div class="breakdown-details">${detailsHtml}</div>
        <a href="houses.html" class="breakdown-link">View All →</a>
      </div>
    `);
  }
  
  // Vehicles
  if (data.assets.vehicles > 0) {
    assetCards.push(`
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="breakdown-icon">${assetIcons.vehicles}</span>
          <span class="breakdown-title">Vehicles</span>
          <span class="breakdown-value">${safeFormatCurrency(data.assets.vehicles)}</span>
        </div>
        <a href="vehicles.html" class="breakdown-link">View All →</a>
      </div>
    `);
  }
  
  // Savings (Goals)
  if (data.assets.savings > 0) {
    assetCards.push(`
      <div class="breakdown-card">
        <div class="breakdown-header">
          <span class="breakdown-icon">${assetIcons.savings}</span>
          <span class="breakdown-title">Savings Goals</span>
          <span class="breakdown-value">${safeFormatCurrency(data.assets.savings)}</span>
        </div>
        <a href="goals.html" class="breakdown-link">View All →</a>
      </div>
    `);
  }
  
  if (assetCards.length === 0) {
    container.innerHTML = `
      <div class="empty-breakdown">
        <p>No assets tracked yet</p>
        <a href="investments.html" class="btn btn-primary btn-sm">Add Investment</a>
      </div>
    `;
  } else {
    container.innerHTML = assetCards.join('');
  }
}

// Render liabilities breakdown
function renderLiabilitiesBreakdown(data) {
  const container = document.getElementById('liabilitiesBreakdown');
  
  const liabilityCards = [];
  
  // Loans
  if (data.liabilities.loans > 0) {
    const loanBreakdown = data.breakdown.loans;
    let detailsHtml = '';
    
    Object.entries(loanBreakdown).forEach(([type, info]) => {
      const icon = loanTypeIcons[type] || '📋';
      const paidPercent = info.original > 0 ? ((info.original - info.outstanding) / info.original) * 100 : 0;
      
      detailsHtml += `
        <div class="breakdown-detail">
          <span class="detail-icon">${icon}</span>
          <span class="detail-name">${escapeHtml(type.charAt(0).toUpperCase() + type.slice(1))} Loan</span>
          <span class="detail-value">${safeFormatCurrencyCompact(info.outstanding)}</span>
          <span class="detail-progress">${(paidPercent || 0).toFixed(0)}% paid</span>
        </div>
      `;
    });
    
    liabilityCards.push(`
      <div class="breakdown-card liability">
        <div class="breakdown-header">
          <span class="breakdown-icon">${liabilityIcons.loans}</span>
          <span class="breakdown-title">Loans</span>
          <span class="breakdown-value text-danger">${safeFormatCurrency(data.liabilities.loans)}</span>
        </div>
        <div class="breakdown-details">${detailsHtml}</div>
        <a href="loans.html" class="breakdown-link">View All →</a>
      </div>
    `);
  }
  
  if (liabilityCards.length === 0) {
    container.innerHTML = `
      <div class="empty-breakdown">
        <p>No liabilities tracked</p>
        <span class="text-success">🎉 Debt-free!</span>
      </div>
    `;
  } else {
    container.innerHTML = liabilityCards.join('');
  }
}

// Render allocation chart (simple CSS-based)
function renderAllocationChart(data) {
  const chartContainer = document.getElementById('allocationChart');
  const legendContainer = document.getElementById('allocationLegend');
  
  const total = data.totalAssets;
  if (total === 0) {
    chartContainer.innerHTML = '<div class="chart-empty">No assets to display</div>';
    legendContainer.innerHTML = '';
    return;
  }
  
  const colors = {
    investments: '#4A90E2',
    realEstate: '#27AE60',
    vehicles: '#F39C12',
    savings: '#9B59B6',
    other: '#7F8C8D'
  };
  
  const labels = {
    investments: 'Investments',
    realEstate: 'Real Estate',
    vehicles: 'Vehicles',
    savings: 'Savings',
    other: 'Other'
  };
  
  // Create pie chart segments
  let cumulativePercent = 0;
  let gradientParts = [];
  let legendItems = [];
  
  Object.entries(data.assets).forEach(([key, value]) => {
    if (value > 0) {
      const percent = (value / total) * 100;
      const startPercent = cumulativePercent;
      cumulativePercent += percent;
      
      gradientParts.push(`${colors[key]} ${startPercent}% ${cumulativePercent}%`);
      
      legendItems.push(`
        <div class="legend-item">
          <span class="legend-color" style="background: ${colors[key]}"></span>
          <span class="legend-label">${labels[key]}</span>
          <span class="legend-value">${isNaN(percent) ? '0%' : percent.toFixed(1) + '%'}</span>
        </div>
      `);
    }
  });
  
  chartContainer.innerHTML = `
    <div class="pie-chart" style="background: conic-gradient(${gradientParts.join(', ')})"></div>
  `;
  
  legendContainer.innerHTML = legendItems.join('');
}

// Load cash flow data
async function loadCashFlow() {
  try {
    const cashFlow = await netWorthService.getMonthlyCashFlow(currentYear, currentMonth);
    
    document.getElementById('monthlyIncome').textContent = safeFormatCurrency(cashFlow.income);
    document.getElementById('monthlyExpenses').textContent = safeFormatCurrency(cashFlow.expenses);
    document.getElementById('monthlyAvailable').textContent = safeFormatCurrency(cashFlow.availableForSavings);
    
    // Update allocation
    document.getElementById('allocInvestments').textContent = safeFormatCurrency(cashFlow.transfers.totalInvestmentPurchases);
    document.getElementById('allocLoanPrincipal').textContent = safeFormatCurrency(cashFlow.transfers.totalPrincipalPaid);
    document.getElementById('allocInterest').textContent = safeFormatCurrency(cashFlow.transfers.totalInterestPaid);
    
  } catch (error) {
    console.error('[NetWorth] Error loading cash flow:', error);
  }
}

// Load history
async function loadHistory() {
  try {
    const history = await netWorthService.getHistory(10);
    const container = document.getElementById('historyList');
    
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h3>No history yet</h3>
          <p>Save snapshots to track your net worth over time</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = history.map((snapshot, index) => {
      const date = snapshot.date?.toDate ? snapshot.date.toDate() : new Date(snapshot.date);
      const prevSnapshot = history[index + 1];
      const change = prevSnapshot ? snapshot.netWorth - prevSnapshot.netWorth : 0;
      const changeClass = change >= 0 ? 'positive' : 'negative';
      
      return `
        <div class="history-item">
          <div class="history-date">${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div class="history-value">${safeFormatCurrency(snapshot.netWorth)}</div>
          ${prevSnapshot ? `<div class="history-change ${changeClass}">${change >= 0 ? '+' : ''}${safeFormatCurrencyCompact(change)}</div>` : ''}
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('[NetWorth] Error loading history:', error);
  }
}
