// Investments Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import encryptionService from '../services/encryption-service.js';
import investmentHistoryService from '../services/investment-history-service.js';
import googleSheetsPriceService from '../services/google-sheets-price-service.js'; // Changed from livePriceService
import symbolSearchService from '../services/symbol-search-service.js';
import crossFeatureIntegrationService from '../services/cross-feature-integration-service.js';
// Lazy load analytics service - only loaded when analytics tab is clicked
// import investmentAnalyticsService from '../services/investment-analytics-service.js';
import lazyLoader from '../utils/lazy-loader.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate, escapeHtml, formatDateForInput } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
// Lazy load confirmation modal - only loaded when delete is clicked
// import confirmationModal from '../components/confirmation-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
const state = {
  investments: [],
  filteredInvestments: [],
  currentPage: 1,
  itemsPerPage: 10,
  totalCount: 0,
  allDataKPI: {
    totalInvested: 0,
    currentValue: 0,
    totalReturns: 0,
    returnsPercentage: 0
  }
};
let editingInvestmentId = null;

// Symbol search state
let symbolSearchResults = [];
let selectedSymbolIndex = -1;
let isSearching = false;
let searchDebounceTimer = null;

// DOM Elements
let addInvestmentBtn, addInvestmentSection, closeFormBtn, cancelFormBtn;
let investmentForm, formTitle, saveFormBtn;
let investmentsList, emptyState, loadingState;
let totalInvestedEl, currentValueEl, totalReturnsEl, returnsPercentageEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteInvestmentName, deleteInvestmentType;
let deleteInvestmentId = null;

// Initialize page
async function init() {
  // Check authentication
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Preload Google Sheets data in background for faster symbol search
  googleSheetsPriceService.preloadData();

  // Initialize DOM elements FIRST (before any function that uses them)
  initDOMElements();

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadInvestments();
  });

  // Set up event listeners
  setupEventListeners();

  // Load user profile
  loadUserProfile(user);

  // Load investments again after encryption is ready (fixes race condition)
  await loadInvestments();

  // Set default date to today if element exists
  const purchaseDateInput = document.getElementById('purchaseDate');
  if (purchaseDateInput) {
    purchaseDateInput.valueAsDate = new Date();
  }
}

// Initialize DOM elements
function initDOMElements() {
  addInvestmentBtn = document.getElementById('addInvestmentBtn');
  addInvestmentSection = document.getElementById('addInvestmentSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  investmentForm = document.getElementById('investmentForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  investmentsList = document.getElementById('investmentsList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalInvestedEl = document.getElementById('totalInvested');
  currentValueEl = document.getElementById('currentValue');
  totalReturnsEl = document.getElementById('totalReturns');
  returnsPercentageEl = document.getElementById('returnsPercentage');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteInvestmentName = document.getElementById('deleteInvestmentName');
  deleteInvestmentType = document.getElementById('deleteInvestmentType');
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

  // Add investment
  addInvestmentBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  investmentForm.addEventListener('submit', handleSubmit);

  // Delete modal
  closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);

  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      handleTabClick(btn.dataset.tab);
    });
  });

  // Analytics toggle
  const toggleAnalyticsBtn = document.getElementById('toggleAnalyticsBtn');
  const refreshAnalyticsBtn = document.getElementById('refreshAnalyticsBtn');
  
  toggleAnalyticsBtn?.addEventListener('click', toggleAnalyticsSection);
  refreshAnalyticsBtn?.addEventListener('click', () => loadAndRenderAnalytics(true));

  // Symbol search
  const symbolInput = document.getElementById('symbol');
  const typeInput = document.getElementById('type');

  if (symbolInput) {
    symbolInput.addEventListener('input', handleSymbolSearch);
    symbolInput.addEventListener('keydown', handleSymbolKeydown);
    symbolInput.addEventListener('blur', () => {
      // Hide dropdown after a longer delay on mobile to allow touch events to complete
      setTimeout(() => {
        const dropdown = document.getElementById('symbolDropdown');
        if (dropdown && !dropdown.matches(':hover') && !dropdown.contains(document.activeElement)) {
          dropdown.style.display = 'none';
        }
      }, 300);
    });
    symbolInput.addEventListener('focus', handleSymbolFocus);
  }

  if (typeInput) {
    typeInput.addEventListener('change', () => {
      // Only hide the dropdown when type changes, don't clear the symbol
      const dropdown = document.getElementById('symbolDropdown');
      if (dropdown) dropdown.style.display = 'none';
    });
  }
  
  // Pagination buttons
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        goToPage(state.currentPage - 1);
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalRecords = state.filteredInvestments.length;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
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

// Show add form
function showAddForm() {
  editingInvestmentId = null;
  formTitle.textContent = 'Add Investment';
  saveFormBtn.textContent = 'Save Investment';
  investmentForm.reset();

  // Reset button state
  saveFormBtn.disabled = false;

  // Set default date if element exists
  const purchaseDateInput = document.getElementById('purchaseDate');
  if (purchaseDateInput) {
    purchaseDateInput.valueAsDate = new Date();
  }

  addInvestmentSection.classList.add('show');
  addInvestmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Hide form
function hideForm() {
  addInvestmentSection.classList.remove('show');
  investmentForm.reset();
  editingInvestmentId = null;
}

// Show edit form
function showEditForm(investment) {
  editingInvestmentId = investment.id;
  formTitle.textContent = 'Edit Investment';
  saveFormBtn.textContent = 'Update Investment';

  // Reset button state
  saveFormBtn.disabled = false;

  // Fill form
  document.getElementById('name').value = investment.name;
  document.getElementById('type').value = investment.type;
  document.getElementById('symbol').value = investment.symbol || '';
  document.getElementById('quantity').value = investment.quantity;
  document.getElementById('purchasePrice').value = investment.purchasePrice;
  document.getElementById('currentPrice').value = investment.currentPrice;
  document.getElementById('purchaseDate').value = formatDateForInput(investment.purchaseDate);
  const brokerageUsernameEl = document.getElementById('brokerageUsername');
  if (brokerageUsernameEl) brokerageUsernameEl.value = investment.brokerageUsername || '';
  const dividendDetailsEl = document.getElementById('dividendDetails');
  if (dividendDetailsEl) dividendDetailsEl.value = investment.dividendDetails || '';
  document.getElementById('notes').value = investment.notes || '';
  document.getElementById('currency').value = investment.currency || 'INR';

  addInvestmentSection.classList.add('show');
  addInvestmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();

  // Get form data
  const formData = {
    name: document.getElementById('name').value.trim(),
    type: document.getElementById('type').value,
    symbol: document.getElementById('symbol').value.trim().toUpperCase(),
    quantity: parseFloat(document.getElementById('quantity').value),
    purchasePrice: parseFloat(document.getElementById('purchasePrice').value),
    currentPrice: parseFloat(document.getElementById('currentPrice').value),
    purchaseDate: timezoneService.parseInputDate(document.getElementById('purchaseDate').value),
    brokerageUsername: document.getElementById('brokerageUsername')?.value.trim() || '',
    dividendDetails: document.getElementById('dividendDetails')?.value.trim() || '',
    notes: document.getElementById('notes')?.value.trim() || '',
    currency: 'INR' // Always store as INR
  };

  // Validate symbol
  if (!formData.symbol) {
    showToast('Please enter a symbol (e.g., AAPL, RELIANCE, BTC-USD)', 'error');
    return;
  }

  // Show loading
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';

  try {
    // Try to fetch live price and convert to INR
    let livePrice = null;
    try {
      const priceData = await googleSheetsPriceService.getLivePrice(formData.symbol);
      livePrice = priceData.price;
      
      // Convert USD to INR if needed
      if (priceData.currency === 'USD') {
        livePrice = await googleSheetsPriceService.convertUSDToINR(priceData.price);
      }
      
      formData.currentPrice = livePrice;
      showToast(`Price fetched for ${formData.symbol}: ₹${livePrice.toFixed(2)}`, 'success');
    } catch (error) {
      // Silently use manual price - users can add stocks not in sheets
      // and update prices manually weekly or bi-weekly
    }

    let result;
    if (editingInvestmentId) {
      // Update existing investment
      result = await firestoreService.updateInvestment(editingInvestmentId, formData);
      if (result.success) {
        // Record price update in history
        await investmentHistoryService.recordPriceUpdate(
          editingInvestmentId,
          formData.currentPrice,
          `Price updated: ${formData.notes}`
        );
        showToast('Investment updated successfully', 'success');
      }
    } else {
      // Add new investment
      result = await firestoreService.addInvestment(formData);
      if (result.success) {
        // Record initial price in history
        await investmentHistoryService.recordPriceUpdate(
          result.id,
          formData.currentPrice,
          'Initial price recorded'
        );
        showToast('Investment added successfully', 'success');
      }
    }

    if (result.success) {
      hideForm();
      await loadInvestments();
    } else {
      showToast(result.error || 'Failed to save investment', 'error');
    }
  } catch (error) {
    console.error('Error saving investment:', error);
    showToast('Failed to save investment', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

// Load investments
async function loadInvestments() {
  loadingState.style.display = 'flex';
  investmentsList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    state.investments = await firestoreService.getInvestments();
    state.totalCount = state.investments.length;

    if (state.investments.length === 0) {
      emptyState.style.display = 'block';
    } else {
      // Fetch live prices for all investments
      await updateLivePrices();
      
      calculateKPISummary();
      filterInvestments();
      state.currentPage = 1;
      
      renderInvestments();
      investmentsList.style.display = 'grid';
    }

    await updateSummary();
  } catch (error) {
    console.error('Error loading investments:', error);
    showToast('Failed to load investments', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Update live prices for all investments
async function updateLivePrices() {
  for (const investment of state.investments) {
    if (investment.symbol) {
      try {
        const priceData = await googleSheetsPriceService.getLivePrice(investment.symbol);
        
        // Convert USD to INR if needed
        let inrPrice = priceData.price;
        let inrChange = priceData.change;
        
        if (priceData.currency === 'USD') {
          try {
            inrPrice = await googleSheetsPriceService.convertUSDToINR(priceData.price);
            inrChange = await googleSheetsPriceService.convertUSDToINR(priceData.change);
          } catch (error) {
            // Silently use original price if conversion fails
          }
        }
        
        // Store INR prices
        investment.livePrice = inrPrice;
        investment.priceChange = inrChange;
        investment.priceChangePercent = priceData.changePercent;
        investment.lastPriceUpdate = priceData.lastUpdate;
        investment.currency = 'INR'; // Always store as INR
      } catch (error) {
        // Silently keep using the stored current price if live price fails
        // Users can manually update prices for stocks not in sheets
      }
    }
  }
}

// Current active tab
let activeTab = 'all';

// Calculate KPI summary
function calculateKPISummary() {
  let totalInvested = 0;
  let currentValue = 0;

  state.investments.forEach(investment => {
    const investPurchasePrice = investment.purchasePrice;
    const investCurrentPrice = investment.livePrice || investment.currentPrice;

    totalInvested += investment.quantity * investPurchasePrice;
    currentValue += investment.quantity * investCurrentPrice;
  });

  const totalReturns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;

  state.allDataKPI = {
    totalInvested,
    currentValue,
    totalReturns,
    returnsPercentage
  };
}

// Filter investments based on active tab
function filterInvestments() {
  if (activeTab === 'all') {
    state.filteredInvestments = [...state.investments];
  } else {
    const typeMap = {
      'stocks': 'Stocks',
      'mf': 'Mutual Funds',
      'crypto': 'Cryptocurrency',
      'other': ['Real Estate', 'Gold', 'Fixed Deposit', 'Other']
    };
    
    const filterType = typeMap[activeTab];
    
    if (Array.isArray(filterType)) {
      state.filteredInvestments = state.investments.filter(inv => filterType.includes(inv.type));
    } else {
      state.filteredInvestments = state.investments.filter(inv => inv.type === filterType);
    }
  }
  state.currentPage = 1;
}

// Get filtered investments based on active tab (for backward compatibility)
function getFilteredInvestments() {
  return state.filteredInvestments;
}

// Handle tab click
function handleTabClick(tabName) {
  activeTab = tabName;
  
  // Update active tab button
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
  
  // Re-filter and render investments
  filterInvestments();
  renderInvestments();
  updateSummaryForTab();
}

// Update summary for current tab
function updateSummaryForTab() {
  const filteredInvestments = state.filteredInvestments;
  let totalInvested = 0;
  let currentValue = 0;

  filteredInvestments.forEach(investment => {
    const investPurchasePrice = investment.purchasePrice;
    const investCurrentPrice = investment.livePrice || investment.currentPrice;

    totalInvested += investment.quantity * investPurchasePrice;
    currentValue += investment.quantity * investCurrentPrice;
  });

  const totalReturns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;
  const returnsClass = totalReturns >= 0 ? 'positive' : 'negative';
  const returnsSign = totalReturns >= 0 ? '+' : '';

  totalInvestedEl.textContent = formatCurrency(totalInvested, '₹');
  currentValueEl.textContent = formatCurrency(currentValue, '₹');
  totalReturnsEl.textContent = `${returnsSign}${formatCurrency(Math.abs(totalReturns), '₹')}`;
  returnsPercentageEl.textContent = `${returnsSign}${returnsPercentage}%`;
  returnsPercentageEl.className = `summary-change ${returnsClass}`;
}

// Render investments
function renderInvestments() {
  const paginationContainer = document.getElementById('paginationContainer');
  
  if (state.filteredInvestments.length === 0) {
    investmentsList.innerHTML = '';
    investmentsList.style.display = 'none';
    emptyState.style.display = 'block';
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  investmentsList.style.display = 'grid';
  emptyState.style.display = 'none';
  
  // Calculate pagination
  const totalRecords = state.filteredInvestments.length;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageInvestments = state.filteredInvestments.slice(startIndex, endIndex);
  
  investmentsList.innerHTML = pageInvestments.map(investment => {
    // Use live price if available, otherwise use stored current price, fallback to purchase price
    const currentPrice = investment.livePrice || investment.currentPrice || investment.purchasePrice || 0;
    const purchasePrice = investment.purchasePrice || 0;
    const quantity = investment.quantity || 0;
    const totalInvested = quantity * purchasePrice;
    const currentValue = quantity * currentPrice;
    const returns = currentValue - totalInvested;
    const returnsPercentage = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(2) : 0;
    const returnsClass = returns >= 0 ? 'positive' : 'negative';
    const returnsSign = returns >= 0 ? '+' : '';
    const escapedName = escapeHtml(investment.name);
    const escapedType = escapeHtml(investment.type);
    const escapedNotes = investment.notes ? escapeHtml(investment.notes) : '';
    const escapedSymbol = escapeHtml(investment.symbol || '');

    // Price change indicator (always in INR)
    const priceChangeClass = (investment.priceChange || 0) >= 0 ? 'positive' : 'negative';
    const priceChangeSign = (investment.priceChange || 0) >= 0 ? '+' : '';
    const priceChangeDisplay = investment.priceChange !== undefined
      ? `<span class="price-change ${priceChangeClass}">${priceChangeSign}₹${(investment.priceChange || 0).toFixed(2)} (${priceChangeSign}${(investment.priceChangePercent || 0).toFixed(2)}%)</span>`
      : '';

    // Live price indicator
    const liveIndicator = investment.livePrice
      ? '<span class="live-indicator">🔴 LIVE</span>'
      : '';

    return `
      <div class="investment-card">
        <div class="investment-card-header">
          <div class="investment-info">
            <div class="investment-name">${escapedName}</div>
            <span class="investment-type">${escapedType}</span>
            ${escapedSymbol ? `<span class="investment-symbol">${escapedSymbol}</span>` : ''}
          </div>
          <div class="investment-actions">
            <button type="button" class="btn-icon" onclick="window.refreshInvestmentPrice('${investment.id}')" title="Refresh Price">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button type="button" class="btn-icon" onclick="window.viewPriceHistory('${investment.id}')" title="View Price History">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </button>
            <button type="button" class="btn-icon" onclick="window.editInvestment('${investment.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${investment.id}')" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="investment-card-body">
          <div class="investment-stats-row">
            <div class="investment-stat">
              <div class="investment-stat-label">Quantity</div>
              <div class="investment-stat-value">${investment.quantity}</div>
            </div>
          </div>
          <div class="investment-stats-row">
            <div class="investment-stat">
              <div class="investment-stat-label">Purchase Price</div>
              <div class="investment-stat-value">₹${purchasePrice.toFixed(2)}</div>
            </div>
            <div class="investment-stat">
              <div class="investment-stat-label">Current Price ${liveIndicator}</div>
              <div class="investment-stat-value">₹${currentPrice.toFixed(2)}</div>
              ${priceChangeDisplay}
            </div>
          </div>
          <div class="investment-stats-row">
            <div class="investment-stat">
              <div class="investment-stat-label">Total Invested</div>
              <div class="investment-stat-value">₹${totalInvested.toFixed(2)}</div>
            </div>
            <div class="investment-stat">
              <div class="investment-stat-label">Current Value</div>
              <div class="investment-stat-value">₹${currentValue.toFixed(2)}</div>
            </div>
          </div>
          <div class="investment-stats-row investment-returns-row">
            <div class="investment-stat investment-stat-full">
              <div class="investment-stat-label">Returns</div>
              <div class="investment-stat-value ${returnsClass}">
               ${returnsSign}₹${Math.abs(returns).toFixed(2)} (${returnsSign}${returnsPercentage}%)
              </div>
            </div>
          </div>
        </div>

        <div class="investment-card-footer">
          <div class="investment-date">
            Purchased: ${formatDate(investment.purchaseDate)}
            ${investment.lastPriceUpdate ? `<br>Price Updated: ${formatDate(investment.lastPriceUpdate)}` : ''}
          </div>
        </div>

        <div class="investment-card-actions">
          <button type="button" class="btn btn-sm btn-success" onclick="window.showDividendModal('${investment.id}')" title="Record Dividend">
            💰 Dividend
          </button>
          <button type="button" class="btn btn-sm btn-primary" onclick="window.showCapitalGainsModal('${investment.id}')" title="Record Sale">
            📈 Sell
          </button>
        </div>

        ${investment.notes ? `
          <div class="investment-notes">
            ${escapedNotes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationNumbers = document.getElementById('paginationNumbers');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
  if (!paginationContainer || !paginationNumbers) return;
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  if (prevBtn) prevBtn.disabled = state.currentPage === 1;
  if (nextBtn) nextBtn.disabled = state.currentPage === totalPages;
  
  const pageNumbers = generatePageNumbers(state.currentPage, totalPages);
  
  paginationNumbers.innerHTML = pageNumbers.map(page => {
    if (page === '...') {
      return '<span class="ellipsis">...</span>';
    }
    
    const isActive = page === state.currentPage;
    return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
  }).join('');
  
  paginationNumbers.querySelectorAll('.page-number').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      goToPage(page);
    });
  });
}

// Generate page numbers
function generatePageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxVisible = 7;
  
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('...');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    pages.push(totalPages);
  }
  
  return pages;
}

// Go to page
function goToPage(page) {
  state.currentPage = page;
  renderInvestments();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update summary
async function updateSummary() {
  const returnsClass = state.allDataKPI.totalReturns >= 0 ? 'positive' : 'negative';
  const returnsSign = state.allDataKPI.totalReturns >= 0 ? '+' : '';

  totalInvestedEl.textContent = formatCurrency(state.allDataKPI.totalInvested, '₹');
  currentValueEl.textContent = formatCurrency(state.allDataKPI.currentValue, '₹');
  totalReturnsEl.textContent = `${returnsSign}${formatCurrency(Math.abs(state.allDataKPI.totalReturns), '₹')}`;
  returnsPercentageEl.textContent = `${returnsSign}${state.allDataKPI.returnsPercentage}%`;
  returnsPercentageEl.className = `summary-change ${returnsClass}`;
}

// Show delete confirmation
function showDeleteConfirmation(id) {
  const investment = state.investments.find(i => i.id === id);
  if (!investment) return;

  deleteInvestmentId = id;
  deleteInvestmentName.textContent = investment.name;
  deleteInvestmentType.textContent = investment.type;
  deleteModal.classList.add('show');
}

// Hide delete modal
function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteInvestmentId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteInvestmentId) return;

  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const result = await firestoreService.deleteInvestment(deleteInvestmentId);

    if (result.success) {
      showToast('Investment deleted successfully', 'success');
      hideDeleteModal();
      await loadInvestments();
    } else {
      showToast(result.error || 'Failed to delete investment', 'error');
    }
  } catch (error) {
    console.error('Error deleting investment:', error);
    showToast('Failed to delete investment', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}

// Edit investment
function editInvestment(id) {
  const investment = state.investments.find(i => i.id === id);
  if (investment) {
    showEditForm(investment);
  }
}


// Expose functions to window for onclick handlers
window.editInvestment = editInvestment;
window.showDeleteConfirmation = showDeleteConfirmation;
window.viewPriceHistory = viewPriceHistory;
window.refreshInvestmentPrice = refreshInvestmentPrice;
window.selectSymbol = selectSymbol;
window.showDividendModal = showDividendModal;
window.showCapitalGainsModal = showCapitalGainsModal;

// ============================================
// DIVIDEND INCOME MODAL
// ============================================

function showDividendModal(investmentId) {
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;

  // Create modal if it doesn't exist
  let modal = document.getElementById('dividendModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dividendModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Record Dividend Income</h2>
          <button class="modal-close" onclick="document.getElementById('dividendModal').classList.remove('show')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="investment-info-banner" id="dividendInvestmentInfo"></div>
          <form id="dividendForm">
            <input type="hidden" id="dividendInvestmentId">
            <div class="form-group">
              <label for="dividendAmount">Dividend Amount (₹) *</label>
              <input type="number" id="dividendAmount" step="0.01" min="0" required placeholder="Enter total dividend received">
            </div>
            <div class="form-group">
              <label for="dividendPerShare">Dividend Per Share (₹)</label>
              <input type="number" id="dividendPerShare" step="0.01" min="0" placeholder="Optional">
            </div>
            <div class="form-group">
              <label for="dividendDate">Date *</label>
              <input type="date" id="dividendDate" required>
            </div>
            <div class="form-group">
              <label for="dividendNote">Note</label>
              <textarea id="dividendNote" rows="2" placeholder="e.g., Q3 2025 dividend"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('dividendModal').classList.remove('show')">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveDividendBtn">Record Dividend</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
    
    // Save button handler
    document.getElementById('saveDividendBtn').addEventListener('click', handleSaveDividend);
  }

  // Populate modal
  document.getElementById('dividendInvestmentId').value = investmentId;
  document.getElementById('dividendInvestmentInfo').innerHTML = `
    <strong>${escapeHtml(investment.name)}</strong> (${escapeHtml(investment.symbol || 'N/A')})
    <br>Quantity: ${investment.quantity} units
  `;
  document.getElementById('dividendAmount').value = '';
  document.getElementById('dividendPerShare').value = '';
  document.getElementById('dividendDate').valueAsDate = new Date();
  document.getElementById('dividendNote').value = '';

  modal.classList.add('show');
}

async function handleSaveDividend() {
  const investmentId = document.getElementById('dividendInvestmentId').value;
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;

  const amount = parseFloat(document.getElementById('dividendAmount').value);
  const dividendPerShare = parseFloat(document.getElementById('dividendPerShare').value) || null;
  const date = document.getElementById('dividendDate').value;
  const note = document.getElementById('dividendNote').value.trim();

  if (!amount || amount <= 0) {
    showToast('Please enter a valid dividend amount', 'error');
    return;
  }

  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveDividendBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Use cross-feature integration to create income
    const result = await crossFeatureIntegrationService.createDividendIncome(
      investmentId,
      investment.name,
      {
        amount: amount,
        dividendPerShare: dividendPerShare,
        quantity: investment.quantity,
        date: new Date(date),
        note: note
      }
    );

    if (result.success) {
      showToast('Dividend income recorded successfully', 'success');
      document.getElementById('dividendModal').classList.remove('show');
    } else {
      showToast(result.error || 'Failed to record dividend', 'error');
    }
  } catch (error) {
    console.error('Error recording dividend:', error);
    showToast('Failed to record dividend', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Record Dividend';
  }
}

// ============================================
// CAPITAL GAINS MODAL
// ============================================

function showCapitalGainsModal(investmentId) {
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;

  // Create modal if it doesn't exist
  let modal = document.getElementById('capitalGainsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'capitalGainsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2 class="modal-title">Record Sale / Capital Gains</h2>
          <button class="modal-close" onclick="document.getElementById('capitalGainsModal').classList.remove('show')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="investment-info-banner" id="capitalGainsInvestmentInfo"></div>
          <form id="capitalGainsForm">
            <input type="hidden" id="capitalGainsInvestmentId">
            <div class="form-group">
              <label for="saleQuantity">Quantity Sold *</label>
              <input type="number" id="saleQuantity" step="0.0001" min="0" required placeholder="Number of units sold">
            </div>
            <div class="form-group">
              <label for="salePrice">Sale Price Per Unit (₹) *</label>
              <input type="number" id="salePrice" step="0.01" min="0" required placeholder="Price at which you sold">
            </div>
            <div class="form-group">
              <label for="saleDate">Sale Date *</label>
              <input type="date" id="saleDate" required>
            </div>
            <div class="form-group">
              <label for="saleNote">Note</label>
              <textarea id="saleNote" rows="2" placeholder="e.g., Partial profit booking"></textarea>
            </div>
            <div class="capital-gains-preview" id="capitalGainsPreview" style="display: none;">
              <h4>Capital Gains Preview</h4>
              <div class="preview-row">
                <span>Purchase Value:</span>
                <span id="previewPurchaseValue">₹0</span>
              </div>
              <div class="preview-row">
                <span>Sale Value:</span>
                <span id="previewSaleValue">₹0</span>
              </div>
              <div class="preview-row gains-row">
                <span>Capital Gains:</span>
                <span id="previewCapitalGains">₹0</span>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('capitalGainsModal').classList.remove('show')">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveCapitalGainsBtn">Record Sale</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
    
    // Save button handler
    document.getElementById('saveCapitalGainsBtn').addEventListener('click', handleSaveCapitalGains);
    
    // Preview calculation on input change
    document.getElementById('saleQuantity').addEventListener('input', updateCapitalGainsPreview);
    document.getElementById('salePrice').addEventListener('input', updateCapitalGainsPreview);
  }

  // Populate modal
  document.getElementById('capitalGainsInvestmentId').value = investmentId;
  document.getElementById('capitalGainsInvestmentInfo').innerHTML = `
    <strong>${escapeHtml(investment.name)}</strong> (${escapeHtml(investment.symbol || 'N/A')})
    <br>Holdings: ${investment.quantity} units @ ₹${investment.purchasePrice.toFixed(2)}/unit
    <br>Current Price: ₹${(investment.livePrice || investment.currentPrice).toFixed(2)}/unit
  `;
  document.getElementById('saleQuantity').value = '';
  document.getElementById('saleQuantity').max = investment.quantity;
  document.getElementById('salePrice').value = (investment.livePrice || investment.currentPrice).toFixed(2);
  document.getElementById('saleDate').valueAsDate = new Date();
  document.getElementById('saleNote').value = '';
  document.getElementById('capitalGainsPreview').style.display = 'none';

  modal.classList.add('show');
  updateCapitalGainsPreview();
}

function updateCapitalGainsPreview() {
  const investmentId = document.getElementById('capitalGainsInvestmentId').value;
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;

  const quantity = parseFloat(document.getElementById('saleQuantity').value) || 0;
  const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;

  if (quantity > 0 && salePrice > 0) {
    const purchaseValue = quantity * investment.purchasePrice;
    const saleValue = quantity * salePrice;
    const capitalGains = saleValue - purchaseValue;

    document.getElementById('previewPurchaseValue').textContent = formatCurrency(purchaseValue);
    document.getElementById('previewSaleValue').textContent = formatCurrency(saleValue);
    document.getElementById('previewCapitalGains').textContent = formatCurrency(capitalGains);
    document.getElementById('previewCapitalGains').className = capitalGains >= 0 ? 'positive' : 'negative';
    document.getElementById('capitalGainsPreview').style.display = 'block';
  } else {
    document.getElementById('capitalGainsPreview').style.display = 'none';
  }
}

async function handleSaveCapitalGains() {
  const investmentId = document.getElementById('capitalGainsInvestmentId').value;
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;

  const quantity = parseFloat(document.getElementById('saleQuantity').value);
  const salePrice = parseFloat(document.getElementById('salePrice').value);
  const date = document.getElementById('saleDate').value;
  const note = document.getElementById('saleNote').value.trim();

  if (!quantity || quantity <= 0) {
    showToast('Please enter a valid quantity', 'error');
    return;
  }

  if (quantity > investment.quantity) {
    showToast('Sale quantity cannot exceed holdings', 'error');
    return;
  }

  if (!salePrice || salePrice <= 0) {
    showToast('Please enter a valid sale price', 'error');
    return;
  }

  if (!date) {
    showToast('Please select a date', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveCapitalGainsBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const purchaseAmount = quantity * investment.purchasePrice;
    const saleAmount = quantity * salePrice;

    // Use cross-feature integration to create income (only if profit)
    const result = await crossFeatureIntegrationService.createCapitalGainsIncome(
      investmentId,
      investment.name,
      {
        quantity: quantity,
        saleAmount: saleAmount,
        purchaseAmount: purchaseAmount,
        date: new Date(date),
        note: note,
        holdingPeriod: calculateHoldingPeriod(investment.purchaseDate)
      }
    );

    // Update investment quantity
    const newQuantity = investment.quantity - quantity;
    if (newQuantity <= 0) {
      // Delete investment if fully sold
      await firestoreService.deleteInvestment(investmentId);
      showToast('Investment fully sold and removed', 'success');
    } else {
      // Update remaining quantity
      await firestoreService.updateInvestment(investmentId, {
        quantity: newQuantity
      });
      showToast('Sale recorded successfully', 'success');
    }

    document.getElementById('capitalGainsModal').classList.remove('show');
    await loadInvestments();
  } catch (error) {
    console.error('Error recording sale:', error);
    showToast('Failed to record sale', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Record Sale';
  }
}

function calculateHoldingPeriod(purchaseDate) {
  if (!purchaseDate) return null;
  const purchase = purchaseDate.toDate ? purchaseDate.toDate() : new Date(purchaseDate);
  const now = new Date();
  const diffTime = Math.abs(now - purchase);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Handle symbol search input
async function handleSymbolSearch(e) {
  const query = e.target.value.trim();
  const typeInput = document.getElementById('type');
  const type = typeInput?.value || 'all';

  if (query.length < 1) {
    const dropdown = document.getElementById('symbolDropdown');
    if (dropdown) dropdown.style.display = 'none';
    return;
  }

  // Debounce the search to avoid too many API calls
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(async () => {
    if (isSearching) return;
    
    isSearching = true;
    try {
      symbolSearchResults = await symbolSearchService.searchSymbols(query, type, 15);
      renderSymbolDropdown(symbolSearchResults);
    } catch (error) {
      console.error('Error searching symbols:', error);
      // Show error in dropdown
      const dropdown = document.getElementById('symbolDropdown');
      if (dropdown) {
        dropdown.innerHTML = '<div class="symbol-item no-results">Error searching. Please try again.</div>';
        dropdown.style.display = 'block';
      }
    } finally {
      isSearching = false;
    }
  }, 300); // 300ms debounce
}

// Handle symbol focus
async function handleSymbolFocus(e) {
  const query = e.target.value.trim();
  if (query.length > 0) {
    handleSymbolSearch(e);
  }
}

// Handle symbol keyboard navigation
function handleSymbolKeydown(e) {
  const dropdown = document.getElementById('symbolDropdown');
  if (!dropdown || dropdown.style.display === 'none') return;

  const items = dropdown.querySelectorAll('.symbol-item');
  if (items.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedSymbolIndex = Math.min(selectedSymbolIndex + 1, items.length - 1);
      updateSymbolSelection(items);
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedSymbolIndex = Math.max(selectedSymbolIndex - 1, -1);
      updateSymbolSelection(items);
      break;
    case 'Enter':
      e.preventDefault();
      if (selectedSymbolIndex >= 0 && items[selectedSymbolIndex]) {
        items[selectedSymbolIndex].click();
      }
      break;
    case 'Escape':
      dropdown.style.display = 'none';
      break;
  }
}

// Update symbol selection highlight
function updateSymbolSelection(items) {
  items.forEach((item, index) => {
    if (index === selectedSymbolIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Render symbol dropdown
function renderSymbolDropdown(results) {
  // Try to find existing dropdown first
  let dropdown = document.getElementById('symbolDropdown');

  // If not found, create it inside the wrapper
  if (!dropdown) {
    const symbolInput = document.getElementById('symbol');
    const wrapper = symbolInput?.parentNode;

    if (wrapper) {
      dropdown = document.createElement('div');
      dropdown.id = 'symbolDropdown';
      dropdown.className = 'symbol-dropdown';
      wrapper.appendChild(dropdown);
    } else {
      console.error('Could not find symbol input wrapper');
      return;
    }
  }

  if (results.length === 0) {
    dropdown.innerHTML = '<div class="symbol-item no-results">No symbols found. You can still enter a custom symbol.</div>';
    dropdown.style.display = 'block';
    return;
  }

  selectedSymbolIndex = -1;
  dropdown.innerHTML = results.map((result, index) => {
    // Display company name prominently with ticker in parentheses
    const symbolDisplay = escapeHtml(result.symbol);
    const nameDisplay = result.name ? escapeHtml(result.name) : '';
    const exchangeDisplay = result.exchange ? escapeHtml(result.exchange) : '';
    
    // Use originalSymbol for lookup (handles CURRENCY:BTCUSD format for crypto)
    const lookupSymbol = result.originalSymbol || result.symbol;
    
    // Format: "Company Name (TICKER)" or just "TICKER" if no name
    const mainDisplay = nameDisplay ? `${nameDisplay} (${symbolDisplay})` : symbolDisplay;
    
    return `
      <div class="symbol-item" data-symbol="${escapeHtml(lookupSymbol)}" data-type="${escapeHtml(result.type || 'Other')}" data-name="${escapeHtml(nameDisplay)}">
        <div class="symbol-name">${mainDisplay}</div>
        ${exchangeDisplay ? `<div class="symbol-detail">${exchangeDisplay}</div>` : ''}
      </div>
    `;
  }).join('');

  // Add touch/click event listeners to each item
  dropdown.querySelectorAll('.symbol-item:not(.no-results)').forEach(item => {
    const handleSelect = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const symbol = item.dataset.symbol;
      const type = item.dataset.type;
      const name = item.dataset.name;
      selectSymbol(symbol, type, name);
    };
    
    // Use both touchend and click for better mobile support
    item.addEventListener('touchend', handleSelect, { passive: false });
    item.addEventListener('click', handleSelect);
    
    // Prevent touchstart from triggering blur
    item.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
    
    // Prevent mousedown from triggering blur on desktop
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  });

  dropdown.style.display = 'block';
}

// Select symbol from dropdown
async function selectSymbol(symbol, type, name = '') {
  const symbolInput = document.getElementById('symbol');
  const typeInput = document.getElementById('type');
  const nameInput = document.getElementById('name');
  const currentPriceInput = document.getElementById('currentPrice');
  const purchasePriceInput = document.getElementById('purchasePrice');
  const currencyInput = document.getElementById('currency');

  symbolInput.value = symbol;

  // Set type based on the symbol's type
  const normalizedType = type || 'Other';
  if (typeInput) {
    // Check if type exists in select options
    const typeExists = Array.from(typeInput.options).some(o => o.value === normalizedType);
    if (typeExists) {
      typeInput.value = normalizedType;
    }
  }

  // Set company name if provided and name field is empty
  if (nameInput && name && !nameInput.value) {
    nameInput.value = name;
  }

  const dropdown = document.getElementById('symbolDropdown');
  if (dropdown) dropdown.style.display = 'none';

  // Auto-populate price and other details
  if (currentPriceInput) {
    try {
      currentPriceInput.placeholder = 'Fetching price...';
      currentPriceInput.disabled = true;
      
      // Get price data from Google Sheets
      const priceData = await googleSheetsPriceService.getLivePrice(symbol);
      
      if (priceData && priceData.price) {
        // Set name if available
        if (nameInput && priceData.name && !nameInput.value) {
          nameInput.value = priceData.name;
        }
        
        // Always convert to INR and store in INR
        let inrPrice = priceData.price;
        let displayMessage = '';
        
        if (priceData.currency === 'USD') {
          // Convert USD to INR
          try {
            inrPrice = await googleSheetsPriceService.convertUSDToINR(priceData.price);
            displayMessage = `${priceData.name || symbol}\nPrice: $${priceData.price.toFixed(2)} USD = ₹${inrPrice.toFixed(2)} INR`;
          } catch (conversionError) {
            console.warn('Could not convert to INR:', conversionError);
            displayMessage = `${priceData.name || symbol}\nPrice: $${priceData.price.toFixed(2)} USD\nNote: Could not convert to INR`;
          }
        } else {
          // Already in INR or other currency
          displayMessage = `${priceData.name || symbol}\nPrice: ₹${inrPrice.toFixed(2)} INR`;
        }
        
        // Set the INR price in the form
        currentPriceInput.value = inrPrice.toFixed(2);
        if (purchasePriceInput && !purchasePriceInput.value) {
          purchasePriceInput.value = inrPrice.toFixed(2);
        }
        
        // Always set currency to INR
        if (currencyInput) {
          currencyInput.value = 'INR';
        }
        
        showToast(displayMessage, 'success');
        
        // Show additional info if available
        if (priceData.change !== undefined) {
          const changeSign = priceData.change >= 0 ? '+' : '';
        }
      } else {
        showToast(`Symbol selected: ${name || symbol}. Please enter price manually.`, 'info');
      }
      
      currentPriceInput.disabled = false;
      currentPriceInput.placeholder = '0.00';
      
    } catch (error) {
      console.error('Could not auto-populate price:', error);
      currentPriceInput.placeholder = '0.00';
      currentPriceInput.disabled = false;
      showToast(`Symbol selected: ${name || symbol}. Please enter price manually.`, 'info');
    }
  }
}

// Refresh live price for an investment
async function refreshInvestmentPrice(investmentId) {
  const investment = investments.find(i => i.id === investmentId);
  if (!investment || !investment.symbol) {
    showToast('Investment symbol not found', 'error');
    return;
  }

  try {
    showToast('Fetching live price...', 'info');
    const priceData = await googleSheetsPriceService.getLivePrice(investment.symbol);

    // Convert USD to INR if needed
    let inrPrice = priceData.price;
    let inrChange = priceData.change;
    
    if (priceData.currency === 'USD') {
      try {
        inrPrice = await googleSheetsPriceService.convertUSDToINR(priceData.price);
        inrChange = await googleSheetsPriceService.convertUSDToINR(priceData.change);
      } catch (error) {
        console.warn('Could not convert to INR:', error);
      }
    }

    // Store INR prices
    investment.livePrice = inrPrice;
    investment.priceChange = inrChange;
    investment.priceChangePercent = priceData.changePercent;
    investment.lastPriceUpdate = priceData.lastUpdate;
    investment.currency = 'INR';

    // Update in Firestore
    await firestoreService.updateInvestment(investmentId, {
      currentPrice: inrPrice,
      lastPriceUpdate: new Date(),
      currency: 'INR'
    });

    // Record in history
    await investmentHistoryService.recordPriceUpdate(
      investmentId,
      inrPrice,
      `Live price updated from Google Sheets: ₹${inrPrice.toFixed(2)}`
    );

    renderInvestments();
    updateSummary();
    showToast(`Price updated: ₹${inrPrice.toFixed(2)}`, 'success');
  } catch (error) {
    console.error('Error refreshing price:', error);
    // Show user-friendly error message
    if (error.message.includes('not found')) {
      showToast(`Symbol "${investment.symbol}" not found in Google Sheets. Please verify the symbol.`, 'error');
    } else {
      showToast(`Failed to fetch live price: ${error.message}`, 'error');
    }
  }
}

// View price history for an investment
async function viewPriceHistory(investmentId) {
  const investment = investments.find(i => i.id === investmentId);
  if (!investment) return;

  // Create modal if it doesn't exist
  let modal = document.getElementById('priceHistoryModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'priceHistoryModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 800px;">
        <div class="modal-header">
          <h2 class="modal-title">Price History - <span id="historyInvestmentName"></span></h2>
          <button class="modal-close" onclick="document.getElementById('priceHistoryModal').classList.remove('show')">&times;</button>
        </div>
        <div class="modal-body" id="priceHistoryContent">
          <div class="loading">Loading price history...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  }

  modal.classList.add('show');
  document.getElementById('historyInvestmentName').textContent = investment.name;

  try {
    // Get price history
    const history = await investmentHistoryService.getPriceHistory(investmentId, 100);
    const changes = await investmentHistoryService.getMultiplePeriodChanges(investmentId);
    const volatility7d = await investmentHistoryService.getPriceVolatility(investmentId, 7);
    const volatility30d = await investmentHistoryService.getPriceVolatility(investmentId, 30);

    let content = `
      <div class="price-history-analytics">
        <div class="analytics-section">
          <h3>Performance Summary</h3>
          <div class="analytics-grid">
    `;

    // Add period changes
    if (changes.last3Days) {
      const changeClass = changes.last3Days.change >= 0 ? 'positive' : 'negative';
      const changeSign = changes.last3Days.change >= 0 ? '+' : '';
      content += `
        <div class="analytics-card">
          <div class="analytics-label">Last 3 Days</div>
          <div class="analytics-value ${changeClass}">
            ${changeSign}${formatCurrency(changes.last3Days.change)}
            <span class="analytics-percent">(${changeSign}${changes.last3Days.changePercent}%)</span>
          </div>
          <div class="analytics-detail">${formatCurrency(changes.last3Days.oldPrice)} → ${formatCurrency(changes.last3Days.newPrice)}</div>
        </div>
      `;
    }

    if (changes.lastWeek) {
      const changeClass = changes.lastWeek.change >= 0 ? 'positive' : 'negative';
      const changeSign = changes.lastWeek.change >= 0 ? '+' : '';
      content += `
        <div class="analytics-card">
          <div class="analytics-label">Last Week</div>
          <div class="analytics-value ${changeClass}">
            ${changeSign}${formatCurrency(changes.lastWeek.change)}
            <span class="analytics-percent">(${changeSign}${changes.lastWeek.changePercent}%)</span>
          </div>
          <div class="analytics-detail">${formatCurrency(changes.lastWeek.oldPrice)} → ${formatCurrency(changes.lastWeek.newPrice)}</div>
        </div>
      `;
    }

    if (changes.lastMonth) {
      const changeClass = changes.lastMonth.change >= 0 ? 'positive' : 'negative';
      const changeSign = changes.lastMonth.change >= 0 ? '+' : '';
      content += `
        <div class="analytics-card">
          <div class="analytics-label">Last Month</div>
          <div class="analytics-value ${changeClass}">
            ${changeSign}${formatCurrency(changes.lastMonth.change)}
            <span class="analytics-percent">(${changeSign}${changes.lastMonth.changePercent}%)</span>
          </div>
          <div class="analytics-detail">${formatCurrency(changes.lastMonth.oldPrice)} → ${formatCurrency(changes.lastMonth.newPrice)}</div>
        </div>
      `;
    }

    if (changes.lastYear) {
      const changeClass = changes.lastYear.change >= 0 ? 'positive' : 'negative';
      const changeSign = changes.lastYear.change >= 0 ? '+' : '';
      content += `
        <div class="analytics-card">
          <div class="analytics-label">Last Year</div>
          <div class="analytics-value ${changeClass}">
            ${changeSign}${formatCurrency(changes.lastYear.change)}
            <span class="analytics-percent">(${changeSign}${changes.lastYear.changePercent}%)</span>
          </div>
          <div class="analytics-detail">${formatCurrency(changes.lastYear.oldPrice)} → ${formatCurrency(changes.lastYear.newPrice)}</div>
        </div>
      `;
    }

    content += `
          </div>
        </div>
    `;

    // Add volatility info
    if (volatility7d || volatility30d) {
      content += `
        <div class="analytics-section">
          <h3>Price Volatility</h3>
          <div class="analytics-grid">
      `;

      if (volatility7d) {
        content += `
          <div class="analytics-card">
            <div class="analytics-label">7-Day Volatility</div>
            <div class="analytics-value">${volatility7d.volatility}%</div>
            <div class="analytics-detail">Std Dev: ${volatility7d.stdDev}</div>
          </div>
        `;
      }

      if (volatility30d) {
        content += `
          <div class="analytics-card">
            <div class="analytics-label">30-Day Volatility</div>
            <div class="analytics-value">${volatility30d.volatility}%</div>
            <div class="analytics-detail">Std Dev: ${volatility30d.stdDev}</div>
          </div>
        `;
      }

      content += `
          </div>
        </div>
      `;
    }

    // Add price history table
    if (history.length > 0) {
      content += `
        <div class="analytics-section">
          <h3>Price History (Last 20 Updates)</h3>
          <div class="price-history-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Price</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
      `;

      history.slice(0, 20).forEach(record => {
        const timestamp = record.timestamp?.toDate ? record.timestamp.toDate() : new Date(record.timestamp);
        content += `
          <tr>
            <td>${formatDate(timestamp)}</td>
            <td>${formatCurrency(record.price)}</td>
            <td>${record.notes ? escapeHtml(record.notes) : '-'}</td>
          </tr>
        `;
      });

      content += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    document.getElementById('priceHistoryContent').innerHTML = content;
  } catch (error) {
    console.error('Error loading price history:', error);
    document.getElementById('priceHistoryContent').innerHTML = `
      <div class="error-message">Failed to load price history</div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================
// PORTFOLIO ANALYTICS FUNCTIONS
// ============================================

let analyticsVisible = false;
let analyticsData = null;

// Toggle analytics section visibility
function toggleAnalyticsSection() {
  const section = document.getElementById('portfolioAnalyticsSection');
  const toggleText = document.getElementById('analyticsToggleText');
  
  analyticsVisible = !analyticsVisible;
  
  if (analyticsVisible) {
    section.style.display = 'block';
    toggleText.textContent = 'Hide Analytics';
    loadAndRenderAnalytics();
  } else {
    section.style.display = 'none';
    toggleText.textContent = 'Show Analytics';
  }
}

// Load and render analytics
async function loadAndRenderAnalytics(forceRefresh = false) {
  if (!analyticsVisible) return;
  
  try {
    // Show loading state
    showAnalyticsLoading();
    
    // Lazy load analytics service
    const investmentAnalyticsService = await lazyLoader.service('investment-analytics-service');
    
    // Get analytics data
    analyticsData = await investmentAnalyticsService.getPortfolioAnalytics();
    
    // Render all sections
    renderPerformanceMetrics(analyticsData.performance);
    renderRiskAnalysis(analyticsData.riskAnalysis);
    renderDiversificationScore(analyticsData.diversificationScore);
    renderAllocationChart(analyticsData.allocation);
    renderSectorChart(analyticsData.sectorDistribution);
    renderBenchmarkComparison(analyticsData.performance.benchmarkComparison);
    renderTopPerformers(analyticsData.topPerformers);
    renderBottomPerformers(analyticsData.bottomPerformers);
    renderRecommendations(analyticsData.recommendations);
    
    if (forceRefresh) {
      showToast('Analytics refreshed', 'success');
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
    showToast('Failed to load analytics', 'error');
  }
}

// Show loading state for analytics
function showAnalyticsLoading() {
  const placeholders = document.querySelectorAll('.chart-placeholder');
  placeholders.forEach(p => p.textContent = 'Loading...');
}

// Render performance metrics
function renderPerformanceMetrics(performance) {
  const cagrEl = document.getElementById('analyticsCAGR');
  const xirrEl = document.getElementById('analyticsXIRR');
  const absReturnsEl = document.getElementById('analyticsAbsoluteReturns');
  const periodEl = document.getElementById('analyticsInvestmentPeriod');
  
  if (cagrEl) {
    const cagrClass = performance.cagr >= 0 ? 'positive' : 'negative';
    cagrEl.textContent = `${performance.cagr >= 0 ? '+' : ''}${performance.cagr}%`;
    cagrEl.className = `metric-value ${cagrClass}`;
  }
  
  if (xirrEl) {
    const xirrClass = performance.xirr >= 0 ? 'positive' : 'negative';
    xirrEl.textContent = `${performance.xirr >= 0 ? '+' : ''}${performance.xirr}%`;
    xirrEl.className = `metric-value ${xirrClass}`;
  }
  
  if (absReturnsEl) {
    const absClass = performance.absoluteReturns >= 0 ? 'positive' : 'negative';
    absReturnsEl.textContent = formatCurrency(performance.absoluteReturns);
    absReturnsEl.className = `metric-value ${absClass}`;
  }
  
  if (periodEl) {
    periodEl.textContent = `${performance.investmentPeriodYears} years`;
  }
}

// Render risk analysis
function renderRiskAnalysis(riskAnalysis) {
  const scoreEl = document.getElementById('riskScore');
  const labelEl = document.getElementById('riskLabel');
  const barFillEl = document.getElementById('riskBarFill');
  
  if (scoreEl) scoreEl.textContent = riskAnalysis.overallRiskScore;
  if (labelEl) {
    labelEl.textContent = riskAnalysis.overallRiskLevel;
    labelEl.className = `risk-label risk-${riskAnalysis.overallRiskLevel.toLowerCase().replace(/\s+/g, '-')}`;
  }
  if (barFillEl) {
    const percentage = (riskAnalysis.overallRiskScore / riskAnalysis.maxRiskScore) * 100;
    barFillEl.style.width = `${percentage}%`;
    
    // Color based on risk level
    if (riskAnalysis.overallRiskScore <= 3) {
      barFillEl.style.background = 'linear-gradient(90deg, #10B981, #34D399)';
    } else if (riskAnalysis.overallRiskScore <= 6) {
      barFillEl.style.background = 'linear-gradient(90deg, #F59E0B, #FBBF24)';
    } else {
      barFillEl.style.background = 'linear-gradient(90deg, #EF4444, #F87171)';
    }
  }
}

// Render diversification score
function renderDiversificationScore(score) {
  const scoreEl = document.getElementById('diversificationScore');
  const circleEl = document.getElementById('diversificationCircle');
  const descEl = document.getElementById('diversificationDescription');
  
  if (scoreEl) scoreEl.textContent = score;
  
  if (circleEl) {
    // Color based on score
    if (score >= 70) {
      circleEl.style.borderColor = '#10B981';
      circleEl.style.color = '#10B981';
    } else if (score >= 40) {
      circleEl.style.borderColor = '#F59E0B';
      circleEl.style.color = '#F59E0B';
    } else {
      circleEl.style.borderColor = '#EF4444';
      circleEl.style.color = '#EF4444';
    }
  }
  
  if (descEl) {
    if (score >= 70) {
      descEl.textContent = 'Well diversified portfolio';
    } else if (score >= 40) {
      descEl.textContent = 'Moderate diversification';
    } else {
      descEl.textContent = 'Consider diversifying more';
    }
  }
}

// Render allocation chart (simple bar chart)
function renderAllocationChart(allocation) {
  const chartEl = document.getElementById('allocationChart');
  const legendEl = document.getElementById('allocationLegend');
  
  if (!chartEl || allocation.data.length === 0) {
    if (chartEl) chartEl.innerHTML = '<div class="chart-placeholder">No data available</div>';
    return;
  }
  
  const colors = ['#4A90E2', '#27AE60', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#3498DB'];
  
  // Create simple horizontal bar chart
  let chartHtml = '<div class="allocation-bars">';
  allocation.data.forEach((item, index) => {
    const color = colors[index % colors.length];
    chartHtml += `
      <div class="allocation-bar-item">
        <div class="allocation-bar-label">${escapeHtml(item.type)}</div>
        <div class="allocation-bar-container">
          <div class="allocation-bar-fill" style="width: ${item.percentage}%; background: ${color}"></div>
          <span class="allocation-bar-value">${item.percentage}%</span>
        </div>
      </div>
    `;
  });
  chartHtml += '</div>';
  
  chartEl.innerHTML = chartHtml;
  
  // Legend
  if (legendEl) {
    legendEl.innerHTML = allocation.data.map((item, index) => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${colors[index % colors.length]}"></span>
        <span class="legend-label">${escapeHtml(item.type)}: ${formatCurrency(item.value)}</span>
      </div>
    `).join('');
  }
}

// Render sector chart
function renderSectorChart(sectorDistribution) {
  const chartEl = document.getElementById('sectorChart');
  const legendEl = document.getElementById('sectorLegend');
  
  if (!chartEl || sectorDistribution.data.length === 0) {
    if (chartEl) chartEl.innerHTML = '<div class="chart-placeholder">No data available</div>';
    return;
  }
  
  const colors = ['#3498DB', '#2ECC71', '#E91E63', '#FF5722', '#00BCD4', '#9C27B0', '#607D8B'];
  
  // Create simple horizontal bar chart
  let chartHtml = '<div class="allocation-bars">';
  sectorDistribution.data.forEach((item, index) => {
    const color = colors[index % colors.length];
    chartHtml += `
      <div class="allocation-bar-item">
        <div class="allocation-bar-label">${escapeHtml(item.sector)}</div>
        <div class="allocation-bar-container">
          <div class="allocation-bar-fill" style="width: ${item.percentage}%; background: ${color}"></div>
          <span class="allocation-bar-value">${item.percentage}%</span>
        </div>
      </div>
    `;
  });
  chartHtml += '</div>';
  
  chartEl.innerHTML = chartHtml;
  
  // Legend
  if (legendEl) {
    legendEl.innerHTML = sectorDistribution.data.map((item, index) => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${colors[index % colors.length]}"></span>
        <span class="legend-label">${escapeHtml(item.sector)}: ${formatCurrency(item.value)}</span>
      </div>
    `).join('');
  }
}

// Render benchmark comparison
function renderBenchmarkComparison(benchmarkComparison) {
  const tableEl = document.getElementById('benchmarkTable');
  
  if (!tableEl || Object.keys(benchmarkComparison).length === 0) {
    if (tableEl) tableEl.innerHTML = '<div class="chart-placeholder">No data available</div>';
    return;
  }
  
  let html = `
    <table class="benchmark-comparison-table">
      <thead>
        <tr>
          <th>Benchmark</th>
          <th>Expected Value</th>
          <th>Your Value</th>
          <th>Outperformance</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  for (const [benchmark, data] of Object.entries(benchmarkComparison)) {
    const outperformClass = data.outperformance >= 0 ? 'positive' : 'negative';
    const sign = data.outperformance >= 0 ? '+' : '';
    
    html += `
      <tr>
        <td>${escapeHtml(benchmark)}</td>
        <td>${formatCurrency(data.expectedValue)}</td>
        <td>${formatCurrency(data.actualValue)}</td>
        <td class="${outperformClass}">${sign}${formatCurrency(data.outperformance)} (${sign}${data.outperformancePercentage}%)</td>
      </tr>
    `;
  }
  
  html += '</tbody></table>';
  tableEl.innerHTML = html;
}

// Render top performers
function renderTopPerformers(performers) {
  const listEl = document.getElementById('topPerformersList');
  
  if (!listEl || performers.length === 0) {
    if (listEl) listEl.innerHTML = '<div class="chart-placeholder">No data available</div>';
    return;
  }
  
  listEl.innerHTML = performers.map(p => `
    <div class="performer-item">
      <div class="performer-info">
        <span class="performer-name">${escapeHtml(p.name)}</span>
        <span class="performer-symbol">${escapeHtml(p.symbol || '')}</span>
      </div>
      <div class="performer-returns positive">
        +${p.returnsPercentage}%
      </div>
    </div>
  `).join('');
}

// Render bottom performers
function renderBottomPerformers(performers) {
  const listEl = document.getElementById('bottomPerformersList');
  
  if (!listEl || performers.length === 0) {
    if (listEl) listEl.innerHTML = '<div class="chart-placeholder">No data available</div>';
    return;
  }
  
  listEl.innerHTML = performers.map(p => {
    const returnClass = p.returnsPercentage >= 0 ? 'positive' : 'negative';
    const sign = p.returnsPercentage >= 0 ? '+' : '';
    return `
      <div class="performer-item">
        <div class="performer-info">
          <span class="performer-name">${escapeHtml(p.name)}</span>
          <span class="performer-symbol">${escapeHtml(p.symbol || '')}</span>
        </div>
        <div class="performer-returns ${returnClass}">
          ${sign}${p.returnsPercentage}%
        </div>
      </div>
    `;
  }).join('');
}

// Render recommendations
function renderRecommendations(recommendations) {
  const listEl = document.getElementById('recommendationsList');
  
  if (!listEl || recommendations.length === 0) {
    if (listEl) listEl.innerHTML = '<div class="chart-placeholder">No recommendations at this time</div>';
    return;
  }
  
  const iconMap = {
    'warning': '⚠️',
    'info': 'ℹ️',
    'suggestion': '💡'
  };
  
  listEl.innerHTML = recommendations.map(r => `
    <div class="recommendation-item recommendation-${r.type}">
      <span class="recommendation-icon">${iconMap[r.type] || '💡'}</span>
      <div class="recommendation-content">
        <strong>${escapeHtml(r.title)}</strong>
        <p>${escapeHtml(r.message)}</p>
      </div>
    </div>
  `).join('');
}
