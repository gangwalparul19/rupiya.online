// Income Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import paymentMethodsService from '../services/payment-methods-service.js';
import smartCategorizationService from '../services/smart-categorization-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import Pagination from '../components/pagination.js';
import { Validator } from '../utils/validation.js';
import { formatCurrency, formatCurrencyCompact, formatDate, formatDateForInput, debounce, exportToCSV, escapeHtml } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State management
const state = {
  income: [],
  filteredIncome: [],
  currentPage: 1,
  itemsPerPage: 10,
  filters: {
    source: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  },
  editingIncomeId: null,
  selectedIncome: new Set(),
  bulkMode: false,
  totalCount: 0
};

// Pagination instance
let pagination = null;

// Source icons mapping
const sourceIcons = {
  'Salary': '💼',
  'Freelance': '💻',
  'Business': '🏢',
  'Investments': '📈',
  'Rental': '🏠',
  'Interest': '🏦',
  'Dividends': '💹',
  'Bonus': '🎁',
  'Commission': '💵',
  'Pension': '👴',
  'Gifts': '🎀',
  'Refunds': '↩️',
  'Other': '💰'
};

// Check authentication
async function checkAuth() {
  await authService.waitForAuth();
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize page
async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  
  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    // On successful reauth, reload income
    await loadIncome();
  });
  
  await initPage();
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

// Page elements
const addIncomeBtn = document.getElementById('addIncomeBtn');
const exportBtn = document.getElementById('exportBtn');
const incomeList = document.getElementById('incomeList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');

// Filter elements
const filtersToggle = document.getElementById('filtersToggle');
const filtersContent = document.getElementById('filtersContent');
const sourceFilter = document.getElementById('sourceFilter');
const paymentMethodFilter = document.getElementById('paymentMethodFilter');
const dateFromFilter = document.getElementById('dateFromFilter');
const dateToFilter = document.getElementById('dateToFilter');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const searchInput = document.getElementById('searchInput');
const displayedCount = document.getElementById('displayedCount');
const totalCount = document.getElementById('totalCount');

// Pagination elements
const paginationContainer = document.getElementById('paginationContainer');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// Form elements (inline)
const addIncomeSection = document.getElementById('addIncomeSection');
const formTitle = document.getElementById('formTitle');
const incomeForm = document.getElementById('incomeForm');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const saveFormBtn = document.getElementById('saveFormBtn');

// Form fields
const amountInput = document.getElementById('amount');
const sourceInput = document.getElementById('source');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const paymentMethodInput = document.getElementById('paymentMethod');
const specificPaymentMethodGroup = document.getElementById('specificPaymentMethodGroup');
const specificPaymentMethodInput = document.getElementById('specificPaymentMethod');

// Store user's payment methods
let userPaymentMethods = [];

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteAmount = document.getElementById('deleteAmount');
const deleteDescription = document.getElementById('deleteDescription');

let deleteIncomeId = null;

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Update user profile
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    
    userAvatar.textContent = initials;
    userName.textContent = user.displayName || 'User';
    userEmail.textContent = user.email;
    
    // Initialize family switcher
    await familySwitcher.init();
    
    // Update subtitle based on context
    updatePageContext();
    
    // Initialize categories
    await categoriesService.initializeCategories();
    
    // Load categories into dropdowns
    await loadSourceDropdowns();
    
    // Load user's payment methods
    await loadUserPaymentMethods();
    
    // Check for URL parameters (linked income from house/vehicle)
    checkURLParameters();
    
    // Load income
    await loadIncome();
    
    // Setup event listeners
    setupEventListeners();
  }
}

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('incomeSubtitle');
  const incomeTypeGroup = document.getElementById('incomeTypeGroup');
  
  if (context.context === 'family' && context.group) {
    subtitle.textContent = `Tracking income for ${context.group.name}`;
    // Show personal/shared option in form
    if (incomeTypeGroup) {
      incomeTypeGroup.style.display = 'block';
    }
  } else {
    subtitle.textContent = 'Track and manage your earnings';
    // Hide personal/shared option
    if (incomeTypeGroup) {
      incomeTypeGroup.style.display = 'none';
    }
  }
}

// Load income sources into dropdowns
async function loadSourceDropdowns() {
  try {
    const sources = await categoriesService.getIncomeCategories();
    
    // Populate form source dropdown
    sourceInput.innerHTML = '<option value="">Select source</option>' +
      sources.map(src => `<option value="${src}">${src}</option>`).join('');
    
    // Populate filter source dropdown
    sourceFilter.innerHTML = '<option value="">All Sources</option>' +
      sources.map(src => `<option value="${src}">${src}</option>`).join('');
  } catch (error) {
    console.error('Error loading income sources:', error);
  }
}

// Check URL parameters for pre-filled data
function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const linkedType = urlParams.get('linkedType');
  const linkedId = urlParams.get('linkedId');
  const linkedName = urlParams.get('linkedName');
  const source = urlParams.get('source');
  
  // Check if action=add to open form automatically
  if (action === 'add') {
    setTimeout(() => {
      openAddForm();
    }, 100);
  }
  
  if (linkedType && linkedId && linkedName) {
    // Open add form with pre-filled data
    setTimeout(() => {
      openAddForm();
      if (source) {
        sourceInput.value = source;
      }
      // Store linked data in form (will be used on submit)
      incomeForm.dataset.linkedType = linkedType;
      incomeForm.dataset.linkedId = linkedId;
      incomeForm.dataset.linkedName = linkedName;
      
      // Show info message (escape user input to prevent XSS)
      const infoDiv = document.createElement('div');
      infoDiv.className = 'linked-info';
      infoDiv.innerHTML = `<strong>Linked to:</strong> ${escapeHtml(linkedName)} (${escapeHtml(linkedType)})`;
      infoDiv.style.cssText = 'padding: 12px; background: #E8F5E9; border: 1px solid #27AE60; border-radius: 8px; margin-bottom: 1rem; color: #2C3E50;';
      incomeForm.insertBefore(infoDiv, incomeForm.firstChild);
    }, 100);
  }
}

// Load income from Firestore
async function loadIncome() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    incomeList.style.display = 'none';
    
    // Get total count for pagination
    state.totalCount = await firestoreService.getIncomeCount();
    
    // Initialize pagination if not already done
    if (!pagination) {
      pagination = new Pagination({
        pageSize: state.itemsPerPage,
        containerId: 'paginationContainer',
        onPageChange: handlePageChange
      });
    }
    
    pagination.setTotal(state.totalCount);
    
    // Load all income for filtering and KPIs (cached by firestore service)
    state.income = await firestoreService.getIncome();
    state.filteredIncome = [...state.income];
    
    // Update KPI cards
    updateIncomeKPIs();
    
    applyFilters();
    
  } catch (error) {
    console.error('Error loading income:', error);
    toast.error('Failed to load income');
    loadingState.style.display = 'none';
  }
}

// Handle page change from pagination component
function handlePageChange(page) {
  state.currentPage = page;
  renderIncome();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update Income KPI Cards
function updateIncomeKPIs() {
  const now = new Date();
  const thisMonthStart = timezoneService.startOfMonth(now);
  const lastMonthStart = timezoneService.startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = timezoneService.endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let totalAll = 0;
  
  state.income.forEach(income => {
    const amount = Number(income.amount) || 0;
    const incomeDate = timezoneService.toLocalDate(income.date);
    
    totalAll += amount;
    
    if (incomeDate >= thisMonthStart) {
      thisMonthTotal += amount;
    } else if (incomeDate >= lastMonthStart && incomeDate <= lastMonthEnd) {
      lastMonthTotal += amount;
    }
  });
  
  // Update UI with compact format
  const thisMonthEl = document.getElementById('thisMonthIncome');
  const lastMonthEl = document.getElementById('lastMonthIncome');
  const totalEl = document.getElementById('totalIncome');
  
  if (thisMonthEl) thisMonthEl.textContent = formatCurrencyCompact(thisMonthTotal);
  if (lastMonthEl) lastMonthEl.textContent = formatCurrencyCompact(lastMonthTotal);
  if (totalEl) totalEl.textContent = formatCurrencyCompact(totalAll);
  
  // Update tooltips with full amounts
  const thisMonthKpi = document.getElementById('thisMonthKpi');
  const lastMonthKpi = document.getElementById('lastMonthKpi');
  const totalKpi = document.getElementById('totalKpi');
  
  if (thisMonthKpi) thisMonthKpi.setAttribute('data-tooltip', formatCurrency(thisMonthTotal));
  if (lastMonthKpi) lastMonthKpi.setAttribute('data-tooltip', formatCurrency(lastMonthTotal));
  if (totalKpi) totalKpi.setAttribute('data-tooltip', formatCurrency(totalAll));
}

// Apply filters
function applyFilters() {
  let filtered = [...state.income];
  
  // Source filter
  if (state.filters.source) {
    filtered = filtered.filter(i => i.source === state.filters.source);
  }
  
  // Payment method filter
  if (state.filters.paymentMethod) {
    filtered = filtered.filter(i => i.paymentMethod === state.filters.paymentMethod);
  }
  
  // Date range filter
  if (state.filters.dateFrom) {
    const fromDate = timezoneService.parseInputDate(state.filters.dateFrom);
    const fromStart = timezoneService.startOfDay(fromDate);
    filtered = filtered.filter(i => {
      const incomeDate = timezoneService.toLocalDate(i.date);
      return incomeDate >= fromStart;
    });
  }
  
  if (state.filters.dateTo) {
    const toDate = timezoneService.parseInputDate(state.filters.dateTo);
    const toEnd = timezoneService.endOfDay(toDate);
    filtered = filtered.filter(i => {
      const incomeDate = timezoneService.toLocalDate(i.date);
      return incomeDate <= toEnd;
    });
  }
  
  // Search filter
  if (state.filters.search) {
    const searchLower = state.filters.search.toLowerCase();
    filtered = filtered.filter(i => 
      (i.description || '').toLowerCase().includes(searchLower)
    );
  }
  
  state.filteredIncome = filtered;
  state.currentPage = 1;
  
  // Update pagination with filtered count
  if (pagination) {
    pagination.setTotal(filtered.length);
    pagination.currentPage = 1;
  }
  
  updateCounts();
  renderIncome();
}

// Update counts
function updateCounts() {
  totalCount.textContent = state.income.length;
  displayedCount.textContent = state.filteredIncome.length;
}

// Render income
function renderIncome() {
  loadingState.style.display = 'none';
  
  if (state.filteredIncome.length === 0) {
    emptyState.style.display = 'flex';
    incomeList.style.display = 'none';
    if (pagination) {
      const container = document.getElementById('paginationContainer');
      if (container) container.style.display = 'none';
    }
    return;
  }
  
  emptyState.style.display = 'none';
  incomeList.style.display = 'grid';
  
  // Calculate pagination
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageIncome = state.filteredIncome.slice(startIndex, endIndex);
  
  // Render income cards
  incomeList.innerHTML = pageIncome.map(income => createIncomeCard(income)).join('');
  
  // Render pagination using the component
  if (pagination) {
    pagination.render();
  }
  
  // Attach event listeners to cards
  attachCardEventListeners();
}

// Create income card HTML
function createIncomeCard(income) {
  const date = timezoneService.toLocalDate(income.date);
  const sourceIcon = sourceIcons[income.source] || '💰';
  const isRecurring = income.isRecurring || income.recurringId;
  const isSelected = state.selectedIncome.has(income.id);
  
  return `
    <div class="income-card swipeable-card ${isSelected ? 'selected' : ''}" data-id="${income.id}">
      <div class="card-content">
        <div class="income-header">
          <input type="checkbox" class="income-checkbox" data-id="${income.id}" ${isSelected ? 'checked' : ''}>
          <div class="income-amount">${formatCurrency(income.amount)}</div>
          <div class="income-source-with-icon">
            <span class="category-icon">${sourceIcon}</span>
            <span>${income.source}</span>
            ${isRecurring ? '<span class="recurring-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Recurring</span>' : ''}
          </div>
          <div class="income-actions">
            <button class="btn-icon btn-duplicate" data-id="${income.id}" title="Duplicate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
            <button class="btn-icon btn-edit" data-id="${income.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete" data-id="${income.id}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
        ${income.description ? `<div class="income-description">${escapeHtml(income.description)}</div>` : ''}
        <div class="income-meta">
          <div class="income-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            ${formatDate(date)}
          </div>
          <div class="income-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            ${income.paymentMethod}
          </div>
        </div>
      </div>
      <div class="swipe-actions">
        <div class="swipe-action edit" data-id="${income.id}">✏️</div>
        <div class="swipe-action delete" data-id="${income.id}">🗑️</div>
      </div>
    </div>
  `;
}

// Attach event listeners to income cards
function attachCardEventListeners() {
  // Edit buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openEditForm(id);
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openDeleteModal(id);
    });
  });
  
  // Duplicate buttons
  document.querySelectorAll('.btn-duplicate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      duplicateIncome(id);
    });
  });
  
  // Checkboxes for bulk selection
  document.querySelectorAll('.income-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      if (e.target.checked) {
        state.selectedIncome.add(id);
      } else {
        state.selectedIncome.delete(id);
      }
      updateBulkActionsBar();
    });
  });
  
  // Swipe actions for mobile
  initSwipeActions();
}

// Duplicate income
async function duplicateIncome(id) {
  const income = state.income.find(i => i.id === id);
  if (!income) return;
  
  // Open add form with pre-filled data
  openAddForm();
  amountInput.value = income.amount;
  sourceInput.value = income.source;
  descriptionInput.value = income.description || '';
  paymentMethodInput.value = income.paymentMethod;
  
  toast.info('Income duplicated - modify and save');
}

// Update bulk actions bar
function updateBulkActionsBar() {
  const bulkBar = document.getElementById('bulkActionsBar');
  const countEl = document.getElementById('bulkSelectedCount');
  
  if (state.selectedIncome.size > 0) {
    bulkBar.classList.add('visible');
    countEl.textContent = `${state.selectedIncome.size} selected`;
  } else {
    bulkBar.classList.remove('visible');
  }
}

// Bulk delete selected income
async function bulkDeleteIncome() {
  if (state.selectedIncome.size === 0) return;
  
  const confirmed = confirm(`Delete ${state.selectedIncome.size} selected income entries?`);
  if (!confirmed) return;
  
  try {
    const deletePromises = Array.from(state.selectedIncome).map(id => 
      firestoreService.deleteIncome(id)
    );
    await Promise.all(deletePromises);
    
    toast.success(`${state.selectedIncome.size} income entries deleted`);
    state.selectedIncome.clear();
    updateBulkActionsBar();
    await loadIncome();
  } catch (error) {
    console.error('Error bulk deleting:', error);
    toast.error('Failed to delete some entries');
  }
}

// Initialize swipe actions for mobile
function initSwipeActions() {
  if ('ontouchstart' in window) {
    document.querySelectorAll('.swipeable-card').forEach(card => {
      let startX = 0;
      let currentX = 0;
      
      card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });
      
      card.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        
        if (diff > 50) {
          card.classList.add('swiped');
        } else if (diff < -50) {
          card.classList.remove('swiped');
        }
      });
      
      card.addEventListener('touchend', () => {
        // Keep state based on final position
      });
    });
    
    // Swipe action buttons
    document.querySelectorAll('.swipe-action.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openEditForm(id);
      });
    });
    
    document.querySelectorAll('.swipe-action.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openDeleteModal(id);
      });
    });
  }
}

// Load user's payment methods
async function loadUserPaymentMethods() {
  try {
    userPaymentMethods = await paymentMethodsService.getPaymentMethods();
    console.log('Loaded payment methods:', userPaymentMethods);
  } catch (error) {
    console.error('Error loading payment methods:', error);
    userPaymentMethods = [];
  }
}

// Handle payment method type change
function handlePaymentMethodChange() {
  const selectedType = paymentMethodInput.value;
  
  if (!selectedType || selectedType === 'cash') {
    // Hide specific payment method dropdown for cash or no selection
    specificPaymentMethodGroup.style.display = 'none';
    specificPaymentMethodInput.value = '';
    return;
  }
  
  // Filter payment methods by selected type
  const methodsOfType = userPaymentMethods.filter(method => method.type === selectedType);
  
  if (methodsOfType.length === 0) {
    // No saved methods of this type
    specificPaymentMethodGroup.style.display = 'none';
    specificPaymentMethodInput.value = '';
    toast.info(`No saved ${getPaymentTypeLabel(selectedType)} found. Add one in Profile > Payment Methods.`);
    return;
  }
  
  // Populate specific payment method dropdown
  specificPaymentMethodInput.innerHTML = '<option value="">Select...</option>' +
    methodsOfType.map(method => {
      const displayName = getPaymentMethodDisplayName(method);
      const icon = getPaymentMethodIcon(method.type);
      return `<option value="${method.id}">${icon} ${displayName}</option>`;
    }).join('');
  
  // Show the dropdown
  specificPaymentMethodGroup.style.display = 'block';
}

// Get payment method display name
function getPaymentMethodDisplayName(method) {
  let details = method.name;
  
  switch (method.type) {
    case 'card':
      if (method.cardNumber) {
        details += ` (****${method.cardNumber})`;
      }
      break;
    case 'upi':
      if (method.upiId) {
        details += ` (${method.upiId})`;
      }
      break;
    case 'wallet':
      if (method.walletNumber) {
        details += ` (${method.walletNumber})`;
      }
      break;
    case 'bank':
      if (method.bankAccountNumber) {
        details += ` (****${method.bankAccountNumber})`;
      }
      break;
  }
  
  return details;
}

// Get payment method icon
function getPaymentMethodIcon(type) {
  const icons = {
    cash: '💵',
    card: '💳',
    upi: '📱',
    wallet: '👛',
    bank: '🏦'
  };
  return icons[type] || '💰';
}

// Get payment type label
function getPaymentTypeLabel(type) {
  const labels = {
    cash: 'Cash',
    card: 'Cards',
    upi: 'UPI methods',
    wallet: 'Wallets',
    bank: 'Bank Accounts'
  };
  return labels[type] || type;
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  sidebarOpen.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });
  
  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
  
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });
  
  // Theme toggle
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = themeManager.toggleTheme();
      toast.success(`Switched to ${newTheme} mode`);
    });
  }
  
  // Filters toggle (mobile)
  filtersToggle.addEventListener('click', () => {
    filtersContent.classList.toggle('show');
    filtersToggle.classList.toggle('active');
  });
  
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
  
  // Add income button
  addIncomeBtn.addEventListener('click', openAddForm);
  
  // Export button
  exportBtn.addEventListener('click', handleExport);
  
  // Payment method cascading selection
  paymentMethodInput.addEventListener('change', handlePaymentMethodChange);
  
  // Filters
  sourceFilter.addEventListener('change', () => {
    state.filters.source = sourceFilter.value;
    applyFilters();
  });
  
  paymentMethodFilter.addEventListener('change', () => {
    state.filters.paymentMethod = paymentMethodFilter.value;
    applyFilters();
  });
  
  dateFromFilter.addEventListener('change', () => {
    state.filters.dateFrom = dateFromFilter.value;
    applyFilters();
  });
  
  dateToFilter.addEventListener('change', () => {
    state.filters.dateTo = dateToFilter.value;
    applyFilters();
  });
  
  clearFiltersBtn.addEventListener('click', clearFilters);
  
  // Search with debounce
  searchInput.addEventListener('input', debounce(() => {
    state.filters.search = searchInput.value;
    applyFilters();
  }, 300));
  
  // Pagination is now handled by the Pagination component
  // Old manual pagination listeners removed - using pagination.onPageChange callback
  
  // Form close buttons
  closeFormBtn.addEventListener('click', closeIncomeForm);
  cancelFormBtn.addEventListener('click', closeIncomeForm);
  
  // Smart categorization on description input
  descriptionInput.addEventListener('input', debounce(async () => {
    const description = descriptionInput.value.trim();
    if (description.length >= 3 && !sourceInput.value) {
      const suggestion = await smartCategorizationService.suggestCategory(description, 'income');
      if (suggestion.category && suggestion.confidence >= 0.5) {
        // Show suggestion
        showSourceSuggestion(suggestion);
      } else {
        hideSourceSuggestion();
      }
    } else {
      hideSourceSuggestion();
    }
  }, 500));
  
  // Form submit
  incomeForm.addEventListener('submit', handleFormSubmit);
  
  // Delete modal
  closeDeleteModalBtn.addEventListener('click', closeDeleteConfirmModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);
  
  // Close delete modal on overlay click
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteConfirmModal();
    }
  });
  
  // FAB button
  const fabBtn = document.getElementById('fabAddIncome');
  if (fabBtn) {
    fabBtn.addEventListener('click', openAddForm);
  }
  
  // Bulk actions
  const bulkCancelBtn = document.getElementById('bulkCancelBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  
  if (bulkCancelBtn) {
    bulkCancelBtn.addEventListener('click', () => {
      state.selectedIncome.clear();
      updateBulkActionsBar();
      renderIncome();
    });
  }
  
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', bulkDeleteIncome);
  }
  
  // Pull to refresh
  initPullToRefresh();
}

// Initialize pull to refresh
function initPullToRefresh() {
  let startY = 0;
  let pulling = false;
  const pullIndicator = document.getElementById('pullToRefresh');
  
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 80 && window.scrollY === 0) {
      pullIndicator.classList.add('visible');
    }
  });
  
  document.addEventListener('touchend', async () => {
    if (pullIndicator && pullIndicator.classList.contains('visible')) {
      await loadIncome();
      pullIndicator.classList.remove('visible');
      toast.success('Refreshed');
    }
    pulling = false;
  });
}

// Clear filters
function clearFilters() {
  state.filters = {
    source: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  };
  
  sourceFilter.value = '';
  paymentMethodFilter.value = '';
  dateFromFilter.value = '';
  dateToFilter.value = '';
  searchInput.value = '';
  
  applyFilters();
}

// Open add form
function openAddForm() {
  state.editingIncomeId = null;
  formTitle.textContent = 'Add Income';
  saveFormBtn.textContent = 'Save Income';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Reset form
  incomeForm.reset();
  dateInput.value = timezoneService.formatDateForInput(new Date());
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addIncomeSection.classList.add('show');
  addIncomeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Open edit form
function openEditForm(id) {
  const income = state.income.find(i => i.id === id);
  if (!income) return;
  
  state.editingIncomeId = id;
  formTitle.textContent = 'Edit Income';
  saveFormBtn.textContent = 'Update Income';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Populate form
  amountInput.value = income.amount;
  sourceInput.value = income.source;
  descriptionInput.value = income.description || '';
  const date = timezoneService.toLocalDate(income.date);
  dateInput.value = timezoneService.formatDateForInput(date);
  paymentMethodInput.value = income.paymentMethod;
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addIncomeSection.classList.add('show');
  addIncomeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Close income form
function closeIncomeForm() {
  addIncomeSection.classList.remove('show');
  incomeForm.reset();
  clearFormErrors();
  state.editingIncomeId = null;
}

// Clear form errors
function clearFormErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
}

// Validate form
function validateIncomeForm() {
  clearFormErrors();
  
  const validator = new Validator();
  let isValid = true;
  
  // Amount validation
  const amount = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amount) || amount <= 0) {
    document.getElementById('amountError').textContent = 'Please enter a valid amount greater than 0';
    isValid = false;
  }
  
  // Source validation
  if (!sourceInput.value) {
    document.getElementById('sourceError').textContent = 'Please select a source';
    isValid = false;
  }
  
  // Date validation
  if (!dateInput.value) {
    document.getElementById('dateError').textContent = 'Please select a date';
    isValid = false;
  } else {
    const selectedDate = timezoneService.parseInputDate(dateInput.value);
    const today = timezoneService.endOfDay(new Date());
    
    if (selectedDate > today) {
      document.getElementById('dateError').textContent = 'Date cannot be in the future';
      isValid = false;
    }
  }
  
  // Payment method validation
  if (!paymentMethodInput.value) {
    document.getElementById('paymentMethodError').textContent = 'Please select a payment method';
    isValid = false;
  }
  
  return isValid;
}

// Handle form submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateIncomeForm()) {
    return;
  }
  
  // Show loading state
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';
  
  try {
    const incomeData = {
      amount: parseFloat(amountInput.value),
      source: sourceInput.value,
      description: descriptionInput.value.trim(),
      date: timezoneService.parseInputDate(dateInput.value),
      paymentMethod: paymentMethodInput.value,
      specificPaymentMethodId: specificPaymentMethodInput.value || null,
      specificPaymentMethodName: specificPaymentMethodInput.value ? 
        specificPaymentMethodInput.options[specificPaymentMethodInput.selectedIndex].text : null
    };
    
    // Add family context if in family mode
    const context = familySwitcher.getCurrentContext();
    if (context.context === 'family' && context.groupId) {
      incomeData.familyGroupId = context.groupId;
      
      // Check if income is personal or shared
      const incomeTypeRadio = document.querySelector('input[name="incomeType"]:checked');
      if (incomeTypeRadio) {
        incomeData.incomeType = incomeTypeRadio.value; // 'personal' or 'shared'
        incomeData.isShared = incomeTypeRadio.value === 'shared';
      } else {
        incomeData.incomeType = 'personal';
        incomeData.isShared = false;
      }
    }
    
    // Add linked data if present
    if (incomeForm.dataset.linkedType) {
      incomeData.linkedType = incomeForm.dataset.linkedType;
      incomeData.linkedId = incomeForm.dataset.linkedId;
      incomeData.linkedName = incomeForm.dataset.linkedName;
    }
    
    let result;
    
    if (state.editingIncomeId) {
      // Update existing income
      result = await firestoreService.updateIncome(state.editingIncomeId, incomeData);
      
      if (result.success) {
        toast.success('Income updated successfully');
      }
    } else {
      // Add new income
      result = await firestoreService.addIncome(incomeData);
      
      if (result.success) {
        toast.success('Income added successfully');
      }
    }
    
    if (result.success) {
      // Learn from this categorization for smart suggestions
      if (incomeData.description && incomeData.source) {
        smartCategorizationService.learnFromCategorization(
          incomeData.description,
          incomeData.source,
          'income'
        );
      }
      
      closeIncomeForm();
      
      // If came from house/vehicle page, redirect back
      if (incomeForm.dataset.linkedType) {
        const linkedType = incomeForm.dataset.linkedType;
        setTimeout(() => {
          window.location.href = linkedType === 'house' ? 'houses.html' : 'vehicles.html';
        }, 1000);
      } else {
        await loadIncome();
      }
    } else {
      toast.error(result.error || 'Failed to save income');
    }
    
  } catch (error) {
    console.error('Error saving income:', error);
    toast.error('Failed to save income');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

// Open delete modal
function openDeleteModal(id) {
  const income = state.income.find(i => i.id === id);
  if (!income) return;
  
  deleteIncomeId = id;
  deleteAmount.textContent = formatCurrency(income.amount);
  deleteDescription.textContent = income.description || income.source;
  
  deleteModal.classList.add('show');
}

// Close delete modal
function closeDeleteConfirmModal() {
  deleteModal.classList.remove('show');
  deleteIncomeId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteIncomeId) return;
  
  // Show loading state
  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';
  
  try {
    const result = await firestoreService.deleteIncome(deleteIncomeId);
    
    if (result.success) {
      toast.success('Income deleted successfully');
      closeDeleteConfirmModal();
      await loadIncome();
    } else {
      toast.error(result.error || 'Failed to delete income');
    }
    
  } catch (error) {
    console.error('Error deleting income:', error);
    toast.error('Failed to delete income');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}

// Handle export
function handleExport() {
  if (state.filteredIncome.length === 0) {
    toast.warning('No income to export');
    return;
  }
  
  // Prepare data for export
  const exportData = state.filteredIncome.map(income => {
    const date = timezoneService.toLocalDate(income.date);
    return {
      Date: formatDate(date),
      Amount: income.amount,
      Source: income.source,
      Description: income.description || '',
      'Payment Method': income.paymentMethod
    };
  });
  
  // Generate filename with current date
  const today = new Date();
  const filename = `income_${timezoneService.formatDateForInput(today)}.csv`;
  
  exportToCSV(exportData, filename);
  toast.success('Income exported successfully');
}


// ============================================
// SMART CATEGORIZATION HELPERS
// ============================================

// Show source suggestion
function showSourceSuggestion(suggestion) {
  // Remove existing suggestion if any
  hideSourceSuggestion();
  
  const sourceGroup = sourceInput.closest('.form-group');
  if (!sourceGroup) return;
  
  const suggestionDiv = document.createElement('div');
  suggestionDiv.id = 'sourceSuggestion';
  suggestionDiv.className = 'category-suggestion';
  suggestionDiv.innerHTML = `
    <span class="suggestion-icon">💡</span>
    <span class="suggestion-text">Suggested: <strong>${escapeHtml(suggestion.category)}</strong></span>
    <span class="suggestion-confidence">(${Math.round(suggestion.confidence * 100)}% match)</span>
    <button type="button" class="suggestion-apply" onclick="applySourceSuggestion('${escapeHtml(suggestion.category)}')">Apply</button>
    <button type="button" class="suggestion-dismiss" onclick="hideSourceSuggestion()">✕</button>
  `;
  
  // Show other suggestions if available
  if (suggestion.suggestions && suggestion.suggestions.length > 1) {
    const otherSuggestions = suggestion.suggestions.slice(1, 4);
    if (otherSuggestions.length > 0) {
      const othersDiv = document.createElement('div');
      othersDiv.className = 'other-suggestions';
      othersDiv.innerHTML = `
        <span>Other options: </span>
        ${otherSuggestions.map(s => 
          `<button type="button" class="suggestion-alt" onclick="applySourceSuggestion('${escapeHtml(s.category)}')">${escapeHtml(s.category)}</button>`
        ).join('')}
      `;
      suggestionDiv.appendChild(othersDiv);
    }
  }
  
  sourceGroup.appendChild(suggestionDiv);
}

// Hide source suggestion
function hideSourceSuggestion() {
  const existing = document.getElementById('sourceSuggestion');
  if (existing) {
    existing.remove();
  }
}

// Apply source suggestion
function applySourceSuggestion(source) {
  sourceInput.value = source;
  hideSourceSuggestion();
  toast.success(`Source set to "${source}"`);
}

// Expose to window for onclick handlers
window.applySourceSuggestion = applySourceSuggestion;
window.hideSourceSuggestion = hideSourceSuggestion;
