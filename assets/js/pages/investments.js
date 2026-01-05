// Investments Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import investmentHistoryService from '../services/investment-history-service.js';
import livePriceService from '../services/live-price-service.js';
import symbolSearchService from '../services/symbol-search-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate, escapeHtml, formatDateForInput } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let investments = [];
let editingInvestmentId = null;

// Symbol search state
let symbolSearchResults = [];
let selectedSymbolIndex = -1;
let isSearching = false;

// DOM Elements
let addInvestmentBtn, addInvestmentSection, closeFormBtn, cancelFormBtn;
let investmentForm, formTitle, saveFormBtn, saveFormBtnText, saveFormBtnSpinner;
let investmentsList, emptyState, loadingState;
let totalInvestedEl, currentValueEl, totalReturnsEl, returnsPercentageEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteBtnText, deleteBtnSpinner, deleteInvestmentName, deleteInvestmentType;
let deleteInvestmentId = null;

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

  // Load investments
  await loadInvestments();

  // Set default date to today if element exists
  const purchaseDateInput = document.getElementById('purchaseDate');
  if (purchaseDateInput) {
    purchaseDateInput.valueAsDate = new Date();
  }
}

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('investmentsSubtitle');

  if (subtitle && context.context === 'family' && context.group) {
    subtitle.textContent = `Tracking investments for ${context.group.name}`;
  } else if (subtitle) {
    subtitle.textContent = 'Track your investment portfolio';
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
  saveFormBtnText = document.getElementById('saveFormBtnText');
  saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
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
  deleteBtnText = document.getElementById('deleteBtnText');
  deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
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

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Add investment
  addInvestmentBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  investmentForm.addEventListener('submit', handleSubmit);

  // Delete modal
  closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);

  // Symbol search
  const symbolInput = document.getElementById('symbol');
  const typeInput = document.getElementById('type');

  if (symbolInput) {
    symbolInput.addEventListener('input', handleSymbolSearch);
    symbolInput.addEventListener('keydown', handleSymbolKeydown);
    symbolInput.addEventListener('blur', () => {
      // Hide dropdown after a short delay to allow click
      setTimeout(() => {
        const dropdown = document.getElementById('symbolDropdown');
        if (dropdown) dropdown.style.display = 'none';
      }, 200);
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

// Show add form
function showAddForm() {
  editingInvestmentId = null;
  formTitle.textContent = 'Add Investment';
  saveFormBtnText.textContent = 'Save Investment';
  investmentForm.reset();

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
  saveFormBtnText.textContent = 'Update Investment';

  // Fill form
  document.getElementById('name').value = investment.name;
  document.getElementById('type').value = investment.type;
  document.getElementById('symbol').value = investment.symbol || '';
  document.getElementById('quantity').value = investment.quantity;
  document.getElementById('purchasePrice').value = investment.purchasePrice;
  document.getElementById('currentPrice').value = investment.currentPrice;
  document.getElementById('purchaseDate').value = formatDateForInput(investment.purchaseDate);
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
    notes: document.getElementById('notes').value.trim(),
    currency: document.getElementById('currency').value
  };

  // Validate symbol
  if (!formData.symbol) {
    showToast('Please enter a symbol (e.g., AAPL, BTC-USD, GC=F)', 'error');
    return;
  }

  // Show loading
  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

  try {
    // Try to fetch live price
    let livePrice = null;
    try {
      const priceData = await livePriceService.getLivePrice(formData.symbol);
      livePrice = priceData.price;
      formData.currentPrice = livePrice;
      showToast(`Live price fetched: ${formatCurrency(livePrice)}`, 'success');
    } catch (error) {
      console.warn('Could not fetch live price, using manual price:', error);
      showToast('Using manual price (could not fetch live price)', 'info');
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
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
  }
}

// Load investments
async function loadInvestments() {
  loadingState.style.display = 'flex';
  investmentsList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    investments = await firestoreService.getInvestments();

    if (investments.length === 0) {
      emptyState.style.display = 'block';
    } else {
      // Fetch live prices for all investments
      await updateLivePrices();
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
  for (const investment of investments) {
    if (investment.symbol) {
      try {
        const priceData = await livePriceService.getLivePrice(investment.symbol);
        investment.livePrice = priceData.price;
        investment.priceChange = priceData.change;
        investment.priceChangePercent = priceData.changePercent;
        investment.lastPriceUpdate = priceData.lastUpdate;
        investment.currency = priceData.currency;

        // Add INR conversion for US stocks
        if (priceData.currency === 'USD') {
          try {
            investment.inrPrice = await livePriceService.convertUSDToINR(priceData.price);
            investment.inrChange = await livePriceService.convertUSDToINR(priceData.change);
            investment.hasInrConversion = true;
          } catch (error) {
            console.warn(`Could not convert ${investment.symbol} to INR:`, error);
          }
        }
      } catch (error) {
        console.warn(`Could not fetch live price for ${investment.symbol}:`, error.message);
        // Keep using the stored current price if live price fails
        // Don't show error toast here - just silently use cached price
      }
    }
  }
}

// Render investments
function renderInvestments() {
  investmentsList.innerHTML = investments.map(investment => {
    // Use live price if available, otherwise use stored current price
    const currentPrice = investment.livePrice || investment.currentPrice;
    const totalInvested = investment.quantity * investment.purchasePrice;
    const currentValue = investment.quantity * currentPrice;
    const returns = currentValue - totalInvested;
    const returnsPercentage = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(2) : 0;
    const returnsClass = returns >= 0 ? 'positive' : 'negative';
    const returnsSign = returns >= 0 ? '+' : '';
    const escapedName = escapeHtml(investment.name);
    const escapedType = escapeHtml(investment.type);
    const escapedNotes = investment.notes ? escapeHtml(investment.notes) : '';
    const escapedSymbol = escapeHtml(investment.symbol || '');

    // Price change indicator
    const priceChangeClass = investment.priceChange >= 0 ? 'positive' : 'negative';
    const priceChangeSign = investment.priceChange >= 0 ? '+' : '';
    const priceChangeDisplay = investment.priceChange !== undefined
      ? `<span class="price-change ${priceChangeClass}">${priceChangeSign}${investment.priceChange?.toFixed(2)} (${priceChangeSign}${investment.priceChangePercent?.toFixed(2)}%)</span>`
      : '';

    // INR price change for US stocks
    const inrChangeClass = investment.inrChange >= 0 ? 'positive' : 'negative';
    const inrChangeSign = investment.inrChange >= 0 ? '+' : '';
    const inrChangeDisplay = investment.hasInrConversion && investment.inrChange !== undefined
      ? `<span class="price-change inr-change ${inrChangeClass}">${inrChangeSign}₹${investment.inrChange?.toFixed(2)} (${inrChangeSign}${investment.priceChangePercent?.toFixed(2)}%)</span>`
      : '';

    // Live price indicator
    const liveIndicator = investment.livePrice
      ? '<span class="live-indicator">🔴 LIVE</span>'
      : '';

    // Currency display
    const currencyDisplay = investment.currency ? `(${investment.currency})` : '';

    // INR conversion display for US stocks
    const inrDisplay = investment.hasInrConversion && investment.inrPrice
      ? `<div class="investment-stat-inr">₹${investment.inrPrice.toFixed(2)} INR ${inrChangeDisplay}</div>`
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
            <button class="btn-icon" onclick="window.refreshInvestmentPrice('${investment.id}')" title="Refresh Price">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="window.viewPriceHistory('${investment.id}')" title="View Price History">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="window.editInvestment('${investment.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${investment.id}')" title="Delete">
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
              <div class="investment-stat-value">${formatCurrency(investment.purchasePrice, investment.currency === 'USD' ? '$' : '₹')}</div>
            </div>
            <div class="investment-stat">
              <div class="investment-stat-label">Current Price ${liveIndicator}</div>
              <div class="investment-stat-value">${formatCurrency(currentPrice, investment.currency === 'USD' ? '$' : '₹')} ${currencyDisplay}</div>
              ${inrDisplay}
              ${priceChangeDisplay}
            </div>
          </div>
          <div class="investment-stats-row">
            <div class="investment-stat">
              <div class="investment-stat-label">Total Invested</div>
              <div class="investment-stat-value">${formatCurrency(totalInvested, investment.currency === 'USD' ? '$' : '₹')}</div>
            </div>
            <div class="investment-stat">
              <div class="investment-stat-label">Current Value</div>
              <div class="investment-stat-value">${formatCurrency(currentValue, investment.currency === 'USD' ? '$' : '₹')}</div>
            </div>
          </div>
          <div class="investment-stats-row investment-returns-row">
            <div class="investment-stat investment-stat-full">
              <div class="investment-stat-label">Returns</div>
              <div class="investment-stat-value ${returnsClass}">
               ${returnsSign}${formatCurrency(Math.abs(returns), investment.currency === 'USD' ? '$' : '₹')} (${returnsSign}${returnsPercentage}%)
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

        ${investment.notes ? `
          <div class="investment-notes">
            ${escapedNotes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Update summary
// Update summary
async function updateSummary() {
  let totalInvested = 0;
  let currentValue = 0;

  // Get exchange rate for Summary calculations
  let usdToInrRate = 89.50; // Fallback
  try {
    usdToInrRate = await livePriceService.getUSDToINRRate();
  } catch (e) {
    console.warn('Using fallback rate for summary:', e);
  }

  investments.forEach(investment => {
    let investPurchasePrice = investment.purchasePrice;
    let investCurrentPrice = investment.currentPrice;

    // Convert USD to INR for summary totals
    if (investment.currency === 'USD') {
      investPurchasePrice = investment.purchasePrice * usdToInrRate;
      investCurrentPrice = (investment.inrPrice || (investment.currentPrice * usdToInrRate));
    }

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

// Show delete confirmation
function showDeleteConfirmation(id) {
  const investment = investments.find(i => i.id === id);
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

  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

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
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
  }
}

// Edit investment
function editInvestment(id) {
  const investment = investments.find(i => i.id === id);
  if (investment) {
    showEditForm(investment);
  }
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

// Expose functions to window for onclick handlers
window.editInvestment = editInvestment;
window.showDeleteConfirmation = showDeleteConfirmation;
window.viewPriceHistory = viewPriceHistory;
window.refreshInvestmentPrice = refreshInvestmentPrice;
window.selectSymbol = selectSymbol;

// Handle symbol search input
async function handleSymbolSearch(e) {
  const query = e.target.value.trim();
  const typeInput = document.getElementById('type');
  const type = typeInput?.value || 'all';

  console.log('Symbol search triggered:', { query, type });

  if (query.length < 1) {
    const dropdown = document.getElementById('symbolDropdown');
    if (dropdown) dropdown.style.display = 'none';
    return;
  }

  isSearching = true;
  try {
    symbolSearchResults = await symbolSearchService.searchSymbols(query, type, 15);
    console.log('Search results received:', symbolSearchResults);
    renderSymbolDropdown(symbolSearchResults);
  } catch (error) {
    console.error('Error searching symbols:', error);
  } finally {
    isSearching = false;
  }
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
  console.log('Rendering dropdown with results:', results);

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
      console.log('Created new dropdown in wrapper');
    } else {
      console.error('Could not find symbol input wrapper');
      return;
    }
  }

  if (results.length === 0) {
    dropdown.innerHTML = '<div class="symbol-item no-results">No symbols found. You can still enter a custom symbol.</div>';
    dropdown.style.display = 'block';
    console.log('No results found, showing message');
    return;
  }

  selectedSymbolIndex = -1;
  dropdown.innerHTML = results.map((result, index) => {
    const display = symbolSearchService.formatSymbolDisplay(result);
    return `
      <div class="symbol-item" onclick="window.selectSymbol('${result.symbol}', '${result.type}')">
        <div class="symbol-name">${escapeHtml(result.symbol)}</div>
        <div class="symbol-detail">${escapeHtml(display.split(' - ')[1] || '')}</div>
      </div>
    `;
  }).join('');

  dropdown.style.display = 'block';
  console.log('Dropdown rendered with', results.length, 'items');
}

// Select symbol from dropdown
// Select symbol from dropdown
// Select symbol from dropdown
async function selectSymbol(symbol, type) {
  const symbolInput = document.getElementById('symbol');
  const typeInput = document.getElementById('type');
  const currentPriceInput = document.getElementById('currentPrice');

  symbolInput.value = symbol;

  // Normalize type to match select options
  let normalizedType = type;
  const upperType = type ? type.toUpperCase() : '';

  if (upperType === 'EQUITY' || upperType === 'ETF' || upperType === 'INDEX') {
    normalizedType = 'Stocks';
  } else if (upperType.includes('FUND')) {
    normalizedType = 'Mutual Funds';
  } else if (upperType === 'CRYPTOCURRENCY' || upperType === 'CRYPTO') {
    normalizedType = 'Cryptocurrency';
  } else if (upperType.includes('GOLD') || upperType.includes('Currencies')) {
    normalizedType = 'Gold';
  }

  // Check if normalized type exists in the select options
  let typeExists = false;
  for (let i = 0; i < typeInput.options.length; i++) {
    if (typeInput.options[i].value === normalizedType) {
      typeExists = true;
      break;
    }
  }

  // If normalized type exists, select it
  if (typeExists) {
    typeInput.value = normalizedType;
  } else if (upperType && !typeInput.value) {
    // Fallback to 'Other' if possible
    const otherOption = Array.from(typeInput.options).find(o => o.value === 'Other');
    if (otherOption) {
      typeInput.value = 'Other';
    }
  }

  const dropdown = document.getElementById('symbolDropdown');
  if (dropdown) dropdown.style.display = 'none';

  // Auto-populate current price
  if (currentPriceInput) {
    try {
      currentPriceInput.placeholder = 'Fetching...';
      const priceData = await livePriceService.getLivePrice(symbol);
      if (priceData && priceData.price) {
        currentPriceInput.value = priceData.price;

        // Auto-select currency
        const currencyInput = document.getElementById('currency');
        if (priceData.currency && currencyInput) {
          currencyInput.value = priceData.currency;
        }

        // Also populate purchase price if empty, as a starting point
        const purchasePriceInput = document.getElementById('purchasePrice');
        if (purchasePriceInput && !purchasePriceInput.value) {
          purchasePriceInput.value = priceData.price;
        }
        showToast(`Price fetched for ${symbol}: ${formatCurrency(priceData.price)}`, 'success');
      }
    } catch (error) {
      console.warn('Could not auto-populate price:', error);
      currentPriceInput.placeholder = '0.00';
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
    const priceData = await livePriceService.getLivePrice(investment.symbol);

    investment.livePrice = priceData.price;
    investment.priceChange = priceData.change;
    investment.priceChangePercent = priceData.changePercent;
    investment.lastPriceUpdate = priceData.lastUpdate;
    investment.currency = priceData.currency;

    // Add INR conversion for US stocks
    if (priceData.currency === 'USD') {
      try {
        investment.inrPrice = await livePriceService.convertUSDToINR(priceData.price);
        investment.inrChange = await livePriceService.convertUSDToINR(priceData.change);
        investment.hasInrConversion = true;
      } catch (error) {
        console.warn('Could not convert to INR:', error);
      }
    }

    // Update in Firestore
    await firestoreService.updateInvestment(investmentId, {
      currentPrice: priceData.price,
      lastPriceUpdate: new Date()
    });

    // Record in history
    await investmentHistoryService.recordPriceUpdate(
      investmentId,
      priceData.price,
      `Live price updated from Yahoo Finance: ${priceData.price}`
    );

    renderInvestments();
    updateSummary();
    showToast(`Price updated: ${formatCurrency(priceData.price)}`, 'success');
  } catch (error) {
    console.error('Error refreshing price:', error);
    // Show user-friendly error message
    if (error.message.includes('not found')) {
      showToast(`Symbol "${investment.symbol}" not found on Yahoo Finance. Please verify the symbol.`, 'error');
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
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Price History - <span id="historyInvestmentName"></span></h2>
          <button class="modal-close" onclick="document.getElementById('priceHistoryModal').classList.remove('show')">&times;</button>
        </div>
        <div class="modal-body" id="priceHistoryContent">
          <div class="loading">Loading price history...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
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
