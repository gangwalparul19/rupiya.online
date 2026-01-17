// Expenses Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import paymentMethodsService from '../services/payment-methods-service.js';
import creditCardService from '../services/credit-card-service.js';
import smartCategorizationService from '../services/smart-categorization-service.js';
import encryptionService from '../services/encryption-service.js';
import loadingService from '../services/loading-service.js';
import toast from '../components/toast.js';
// Lazy load confirmation modal - only loaded when delete is clicked
// import confirmationModal from '../components/confirmation-modal.js';
import lazyLoader from '../utils/lazy-loader.js';
import themeManager from '../utils/theme-manager.js';
import Pagination from '../components/pagination.js';
import { Validator } from '../utils/validation.js';
import { formatCurrency, formatCurrencyCompact, formatDate, formatDateForInput, debounce, exportToCSV, escapeHtml } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State management
const state = {
  expenses: [],
  filteredExpenses: [],
  currentPage: 1,
  itemsPerPage: 10,
  filters: {
    category: '',
    paymentMethod: '',
    specificPaymentMethod: '',
    familyMember: '', // Single select
    dateFrom: '',
    dateTo: '',
    search: ''
  },
  editingExpenseId: null,
  selectedExpenses: new Set(),
  bulkMode: false,
  totalCount: 0,
  filteredCount: 0,
  lastDoc: null,
  hasMore: true,
  loadingMore: false,
  allExpensesKPI: {
    thisMonth: 0,
    lastMonth: 0,
    total: 0
  }
};

// Current user reference
let currentUser = null;

// Pagination instance
let pagination = null;

// Category icons mapping
const categoryIcons = {
  'Groceries': '🛒',
  'Transportation': '🚗',
  'Utilities': '💡',
  'Entertainment': '🎬',
  'Healthcare': '🏥',
  'Shopping': '🛍️',
  'Dining': '🍽️',
  'Education': '📚',
  'Rent': '🏠',
  'Insurance': '🛡️',
  'Fuel': '⛽',
  'Maintenance': '🔧',
  'Travel': '✈️',
  'Subscriptions': '📺',
  'Personal Care': '💅',
  'Gifts': '🎁',
  'House Help': '🧹',
  'Food & Dining': '🍽️',
  'Bills & Utilities': '💡',
  'House Maintenance': '🏠',
  'Vehicle Fuel': '⛽',
  'Vehicle Maintenance': '🔧',
  'Taxes': '📋',
  'Gifts & Donations': '🎁',
  'Other': '📦'
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
    // On successful reauth, reload expenses
    await loadExpenses();
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
const addExpenseBtn = document.getElementById('addExpenseBtn');
const exportBtn = document.getElementById('exportBtn');
const expensesList = document.getElementById('expensesList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');

// Filter elements
const filtersToggle = document.getElementById('filtersToggle');
const filtersContent = document.getElementById('filtersContent');
const categoryFilter = document.getElementById('categoryFilter');
const paymentMethodFilter = document.getElementById('paymentMethodFilter');
const specificPaymentMethodFilter = document.getElementById('specificPaymentMethodFilter');
const familyMemberFilter = document.getElementById('familyMemberFilter');
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
const addExpenseSection = document.getElementById('addExpenseSection');
const formTitle = document.getElementById('formTitle');
const expenseForm = document.getElementById('expenseForm');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const saveFormBtn = document.getElementById('saveFormBtn');

// Form fields
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
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

let deleteExpenseId = null;

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  currentUser = user; // Store for later use
  
  if (user) {
    // Load user profile
    loadUserProfile(user);
    
    // Update subtitle based on context
    updatePageContext();
    
    // Initialize categories
    await categoriesService.initializeCategories();
    
    // Initialize family members (creates defaults if none exist)
    initializeFamilyMembers();
    
    // Load categories into dropdowns
    await loadCategoryDropdowns();
    
    // Load family members into filter
    await loadFamilyMemberFilter();
    
    // Load user's payment methods
    await loadUserPaymentMethods();
    
    // Check for URL parameters (linked expense from house/vehicle)
    checkURLParameters();
    
    // Load expenses
    await loadExpenses();
    
    // Setup event listeners
    setupEventListeners();
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

// Update page context based on family switcher
function updatePageContext() {
  const subtitle = document.getElementById('expensesSubtitle');
  subtitle.textContent = 'Track and manage your spending';
}

// Load categories into dropdowns
async function loadCategoryDropdowns() {
  try {
    const categories = await categoriesService.getExpenseCategories();
    
    // Populate form category dropdown
    categoryInput.innerHTML = '<option value="">Select category</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    
    // Populate filter category dropdown
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Load family members into filter dropdown
async function loadFamilyMemberFilter() {
  const familyMemberFilter = document.getElementById('familyMemberFilter');
  if (!familyMemberFilter) return;
  
  try {
    // Get family members from both localStorage and actual expenses data
    const familyMembers = await getActiveFamilyMembers();
    const expenseFamilyMembers = await extractFamilyMembersFromExpenses();
    
    // Combine and deduplicate family members
    const allMembers = new Map();
    
    // Add members from localStorage
    if (familyMembers && familyMembers.length > 0) {
      familyMembers.forEach(member => {
        allMembers.set(member.id, member);
      });
    }
    
    // Add members from expenses (these might have different names/IDs)
    if (expenseFamilyMembers && expenseFamilyMembers.length > 0) {
      expenseFamilyMembers.forEach(member => {
        // Use memberName as key if no ID, to avoid duplicates
        const key = member.id || member.name;
        if (!allMembers.has(key)) {
          allMembers.set(key, member);
        }
      });
    }
    
    const uniqueMembers = Array.from(allMembers.values());
    
    if (uniqueMembers && uniqueMembers.length > 0) {
      const options = uniqueMembers.map(member => {
        const memberId = member.id || member.name;
        const memberName = member.name || member.memberName;
        return `<option value="${memberId}">${escapeHtml(memberName)}</option>`;
      }).join('');
      
      familyMemberFilter.innerHTML = '<option value="">All Members</option>' + options;
    }
  } catch (error) {
    console.error('Error loading family member filter:', error);
  }
}

// Handle payment method filter change (cascading filter)
function handlePaymentMethodFilterChange() {
  const selectedType = paymentMethodFilter.value;
  const specificPaymentMethodGroup = document.getElementById('specificPaymentMethodFilterGroup');
  
  if (!selectedType || selectedType === 'cash') {
    // Hide specific payment method dropdown for cash or no selection
    specificPaymentMethodGroup.style.display = 'none';
    specificPaymentMethodFilter.value = '';
    state.filters.specificPaymentMethod = '';
    applyFilters();
    return;
  }
  
  // Filter payment methods by selected type
  const methodsOfType = userPaymentMethods.filter(method => method.type === selectedType);
  
  if (methodsOfType.length === 0) {
    // No saved methods of this type
    specificPaymentMethodGroup.style.display = 'none';
    specificPaymentMethodFilter.value = '';
    state.filters.specificPaymentMethod = '';
    applyFilters();
    return;
  }
  
  // Populate specific payment method dropdown
  specificPaymentMethodFilter.innerHTML = '<option value="">All ' + getPaymentTypeLabel(selectedType) + '</option>' +
    methodsOfType.map(method => {
      const displayName = getPaymentMethodDisplayName(method);
      const icon = getPaymentMethodIcon(method.type);
      return `<option value="${method.id}">${icon} ${displayName}</option>`;
    }).join('');
  
  // Show the dropdown
  specificPaymentMethodGroup.style.display = 'block';
  
  // Apply filters when payment method type is selected
  applyFilters();
}

// Check URL parameters for pre-filled data
function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const linkedType = urlParams.get('linkedType');
  const linkedId = urlParams.get('linkedId');
  const linkedName = urlParams.get('linkedName');
  const category = urlParams.get('category');
  
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
      if (category) {
        categoryInput.value = category;
      }
      // Store linked data in form (will be used on submit)
      expenseForm.dataset.linkedType = linkedType;
      expenseForm.dataset.linkedId = linkedId;
      expenseForm.dataset.linkedName = linkedName;
      
      // Show info message (escape user input to prevent XSS)
      const infoDiv = document.createElement('div');
      infoDiv.className = 'linked-info';
      infoDiv.innerHTML = `<strong>Linked to:</strong> ${escapeHtml(linkedName)} (${escapeHtml(linkedType)})`;
      infoDiv.style.cssText = 'padding: 12px; background: #E3F2FD; border: 1px solid #4A90E2; border-radius: 8px; margin-bottom: 1rem; color: #2C3E50;';
      expenseForm.insertBefore(infoDiv, expenseForm.firstChild);
    }, 100);
  }
}

// Load expenses from Firestore
async function loadExpenses() {
  try {
    // Show skeleton screen instead of spinner
    const skeleton = loadingService.showLoading(loadingState, 'list');
    emptyState.style.display = 'none';
    expensesList.style.display = 'none';
    
    // Get KPI summary for ALL expenses (unfiltered)
    const kpiSummary = await firestoreService.getExpenseKPISummary();
    state.allExpensesKPI = {
      thisMonth: kpiSummary.thisMonth,
      lastMonth: kpiSummary.lastMonth,
      total: kpiSummary.totalCount
    };
    
    state.totalCount = kpiSummary.totalCount;
        
    // Update KPI cards with all expenses
    updateExpenseKPIsFromSummary(kpiSummary);
    
    // Build filters array for Firestore query
    const filters = buildFirestoreFilters();
        
    // Check if filters are applied
    // NOTE: Payment method filters are encrypted, so they're applied client-side
    const hasFilters = filters.length > 0 || 
                       state.filters.paymentMethod ||
                       state.filters.specificPaymentMethod ||
                       state.filters.familyMember ||
                       state.filters.search || 
                       state.filters.dateFrom || 
                       state.filters.dateTo;
    
    if (hasFilters) {
      // Check if we have Firestore filters or only client-side filters
      const hasFirestoreFilters = filters.length > 0;
      const hasClientSideFilters = state.filters.paymentMethod ||
                                    state.filters.specificPaymentMethod ||
                                    state.filters.familyMember ||
                                    state.filters.search || 
                                    state.filters.dateFrom || 
                                    state.filters.dateTo;
      
      // If only client-side filters, load all data first
      if (!hasFirestoreFilters && hasClientSideFilters) {
        const result = await firestoreService.getExpensesPaginated({ 
          pageSize: 1000,
          filters: [] // No Firestore filters
        });
        
        state.expenses = result.data;
        state.filteredExpenses = [...state.expenses];
        applyClientSideFilters();
        state.filteredCount = state.filteredExpenses.length;
        updateFilteredExpenseKPIs();
      } else {
        // With Firestore filters: Load filtered data
        const result = await firestoreService.getExpensesPaginated({ 
          pageSize: 1000,
          filters: filters
        });
        
        state.expenses = result.data;
        state.filteredExpenses = [...state.expenses];
        applyClientSideFilters();
        state.filteredCount = state.filteredExpenses.length;
        updateFilteredExpenseKPIs();
      }
    } else {
      // No filters: Load initial batch (50 records for first 5 pages)
      const initialBatchSize = state.itemsPerPage * 1; // 10 records
      const result = await firestoreService.getExpensesPaginated({ 
        pageSize: initialBatchSize,
        filters: filters
      });
      
      state.expenses = result.data;
      state.lastDoc = result.lastDoc;
      state.hasMore = result.hasMore;
      state.filteredExpenses = [...state.expenses];
      state.filteredCount = state.totalCount;
    }
    

    // Reset to page 1
    state.currentPage = 1;
    
    // Render expenses
    await renderExpenses();
    
  } catch (error) {
    console.error('Error loading expenses:', error);
    toast.error('Failed to load expenses');
    loadingState.style.display = 'none';
  }
}

// Load more expenses when user navigates to a page that needs more data
async function loadMoreExpensesIfNeeded(targetPage) {
  const requiredRecords = targetPage * state.itemsPerPage;
  
  // Check if we have enough data loaded
  if (requiredRecords <= state.expenses.length) {
    return true; // We have enough data
  }
  
  // Check if there's more data to load
  if (!state.hasMore) {
    return false; // No more data available
  }
  
  // Check if already loading
  if (state.loadingMore) {
    return false;
  }
  
  let loadingToast = null;
  try {
    state.loadingMore = true;
    
    // Show loading indicator
    loadingToast = toast.info('Loading more expenses...', 0);
    
    // Calculate how many records we need to load
    const recordsNeeded = requiredRecords - state.expenses.length;
    // Load in batches of 50, or exactly what we need (whichever is larger)
    const batchSize = Math.max(50, recordsNeeded);
    
    const result = await firestoreService.getExpensesPaginated({
      pageSize: batchSize,
      lastDoc: state.lastDoc,
      filters: buildFirestoreFilters()
    });

    // Append new data
    state.expenses = [...state.expenses, ...result.data];
    state.lastDoc = result.lastDoc;
    state.hasMore = result.hasMore;
    state.filteredExpenses = [...state.expenses];
    
    // Check if we have enough data now
    if (state.expenses.length >= requiredRecords) {
      return true;
    } else if (!state.hasMore) {
      // No more data available, but we don't have enough
      return false;
    } else {
      // Still need more data, but we loaded what we could
      return true;
    }
  } catch (error) {
    console.error('[LoadMore] Error loading more expenses:', error);
    toast.error('Failed to load more expenses');
    return false;
  } finally {
    // Always dismiss loading toast
    if (loadingToast) {
      toast.removeToast(loadingToast);
    }
    state.loadingMore = false;
  }
}

// Load more expenses when user clicks "Load More" button
async function loadMoreExpenses() {
  if (state.loadingMore || !state.hasMore || state.allDataLoaded) return;
  
  try {
    state.loadingMore = true;
    
    // Show loading indicator on button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = '<span class="spinner"></span> Loading...';
    }
    
    // Build filters array for Firestore query
    const filters = buildFirestoreFilters();
    
    const result = await firestoreService.getExpensesPaginated({
      pageSize: state.itemsPerPage,
      lastDoc: state.lastDoc,
      filters: filters
    });
    
    if (result.data.length > 0) {
      state.expenses = [...state.expenses, ...result.data];
      state.lastDoc = result.lastDoc;
      state.hasMore = result.hasMore;
      
      // Check if all data is loaded
      if (!result.hasMore || state.expenses.length >= state.totalCount) {
        state.allDataLoaded = true;
      }
      
      // Apply client-side filters and re-render
      state.filteredExpenses = [...state.expenses];
      applyClientSideFilters();
    }
  } catch (error) {
    console.error('Error loading more expenses:', error);
    toast.error('Failed to load more expenses');
  } finally {
    state.loadingMore = false;
    
    // Reset button state
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = 'Load More';
    }
  }
}

// Update KPIs from pre-calculated summary
function updateExpenseKPIsFromSummary(summary) {
  const thisMonthEl = document.getElementById('thisMonthExpenses');
  const lastMonthEl = document.getElementById('lastMonthExpenses');
  const totalEl = document.getElementById('totalExpenses');
  
  if (thisMonthEl) thisMonthEl.textContent = formatCurrencyCompact(summary.thisMonth);
  if (lastMonthEl) lastMonthEl.textContent = formatCurrencyCompact(summary.lastMonth);
  if (totalEl) totalEl.textContent = summary.totalCount.toLocaleString();
  
  // Update tooltips with full amounts
  const thisMonthKpi = document.getElementById('thisMonthKpi');
  const lastMonthKpi = document.getElementById('lastMonthKpi');
  const totalKpi = document.getElementById('totalKpi');
  
  if (thisMonthKpi) thisMonthKpi.setAttribute('data-tooltip', formatCurrency(summary.thisMonth));
  if (lastMonthKpi) lastMonthKpi.setAttribute('data-tooltip', formatCurrency(summary.lastMonth));
  if (totalKpi) totalKpi.setAttribute('data-tooltip', `${summary.totalCount} expenses`);
  
  // Reinitialize tooltips after data is set
  if (window.kpiTooltipManager) {
    window.kpiTooltipManager.reinitializeTooltips();
  }
}

// Handle page change from pagination component
function handlePageChange(page) {
  goToPage(page);
}

// Update Expense KPI Cards
function updateExpenseKPIs() {
  const now = new Date();
  const thisMonthStart = timezoneService.startOfMonth(now);
  const lastMonthStart = timezoneService.startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = timezoneService.endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let totalAll = 0;
  
  state.expenses.forEach(expense => {
    // For split expenses, calculate the user's share based on current filter
    let amount = Number(expense.amount) || 0;
    
    // If expense has family member splits and a family member filter is active
    if (expense.hasSplit && expense.splitDetails && expense.splitDetails.length > 0 && state.filters.familyMember) {
      // Find the selected member's share
      const memberSplit = expense.splitDetails.find(split => 
        String(split.memberId).trim() === String(state.filters.familyMember).trim()
      );
      
      if (memberSplit) {
        amount = Number(memberSplit.amount) || 0;
      } else {
        // Member not in this split, skip this expense
        return;
      }
    }
    
    const expenseDate = timezoneService.toLocalDate(expense.date);
    
    totalAll += amount;
    
    if (expenseDate >= thisMonthStart) {
      thisMonthTotal += amount;
    } else if (expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd) {
      lastMonthTotal += amount;
    }
  });
  
  // Update UI with compact format
  const thisMonthEl = document.getElementById('thisMonthExpenses');
  const lastMonthEl = document.getElementById('lastMonthExpenses');
  const totalEl = document.getElementById('totalExpenses');
  
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
  
  // Reinitialize tooltips after data is set
  if (window.kpiTooltipManager) {
    window.kpiTooltipManager.reinitializeTooltips();
  }
}

// Update KPIs based on filtered data
function updateFilteredExpenseKPIs() {
  const now = new Date();
  const thisMonthStart = timezoneService.startOfMonth(now);
  const lastMonthStart = timezoneService.startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = timezoneService.endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let totalAll = 0;
  
  // Use filtered expenses instead of all expenses
  state.filteredExpenses.forEach(expense => {
    // For split expenses, calculate the user's share based on current filter
    let amount = Number(expense.amount) || 0;
    
    // If expense has family member splits and a family member filter is active
    if (expense.hasSplit && expense.splitDetails && expense.splitDetails.length > 0 && state.filters.familyMember) {
      // Find the selected member's share
      const memberSplit = expense.splitDetails.find(split => 
        String(split.memberId).trim() === String(state.filters.familyMember).trim()
      );
      
      if (memberSplit) {
        amount = Number(memberSplit.amount) || 0;
      } else {
        // Member not in this split, skip this expense
        return;
      }
    }
    
    const expenseDate = timezoneService.toLocalDate(expense.date);
    
    totalAll += amount;
    
    if (expenseDate >= thisMonthStart) {
      thisMonthTotal += amount;
    } else if (expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd) {
      lastMonthTotal += amount;
    }
  });
  
  // Update UI with compact format
  const thisMonthEl = document.getElementById('thisMonthExpenses');
  const lastMonthEl = document.getElementById('lastMonthExpenses');
  const totalEl = document.getElementById('totalExpenses');
  
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
  
  // Reinitialize tooltips after data is set
  if (window.kpiTooltipManager) {
    window.kpiTooltipManager.reinitializeTooltips();
  }
}

// Build Firestore filters from current filter state
// Only includes filters that can be efficiently done in Firestore
function buildFirestoreFilters() {
  const filters = [];
  
  // Category filter - can be done in Firestore with index
  if (state.filters.category) {
    filters.push({ field: 'category', operator: '==', value: state.filters.category });
  }
  
  // NOTE: Payment method and specific payment method filters are encrypted fields
  // They cannot be filtered at Firestore level, so they are applied client-side
  // See applyClientSideFilters() for payment method filtering
  
  // Note: Date range, search, and family member filters are applied client-side
  // because they require complex logic or don't have indexes
  return filters;
}

// Apply only client-side filters (search, family member, date range, payment method)
// Note: Category is filtered at Firestore level
// Note: Payment method and specific payment method are encrypted, so they must be filtered client-side
function applyClientSideFilters() {
  let filtered = [...state.expenses];
  
  // Payment method filter - encrypted field, must be client-side
  if (state.filters.paymentMethod) {
    filtered = filtered.filter(e => e.paymentMethod === state.filters.paymentMethod);
  }
  
  // Specific payment method filter - encrypted field, must be client-side
  if (state.filters.specificPaymentMethod) {
    filtered = filtered.filter(e => e.specificPaymentMethodId === state.filters.specificPaymentMethod);
  }
  
  // Family member filter - single select
  if (state.filters.familyMember) {
    filtered = filtered.filter(e => {
      // Check if expense has split details
      if (e.hasSplit && e.splitDetails && e.splitDetails.length > 0) {
        // Check if the selected member has any amount in this expense
        const hasMatch = e.splitDetails.some(split => {
          const splitMemberId = String(split.memberId).trim();
          const isSelected = String(state.filters.familyMember).trim() === splitMemberId;
          const hasAmount = split.amount > 0;
          return isSelected && hasAmount;
        });
        return hasMatch;
      }
      return false;
    });
  }
  
  // Date range filter - client-side for now (could be moved to Firestore)
  if (state.filters.dateFrom) {
    const fromDate = timezoneService.parseInputDate(state.filters.dateFrom);
    const fromStart = timezoneService.startOfDay(fromDate);
    filtered = filtered.filter(e => {
      const expenseDate = timezoneService.toLocalDate(e.date);
      return expenseDate >= fromStart;
    });
  }
  
  if (state.filters.dateTo) {
    const toDate = timezoneService.parseInputDate(state.filters.dateTo);
    const toEnd = timezoneService.endOfDay(toDate);
    filtered = filtered.filter(e => {
      const expenseDate = timezoneService.toLocalDate(e.date);
      return expenseDate <= toEnd;
    });
  }
  
  // Search filter - must be client-side (no full-text search in Firestore)
  if (state.filters.search) {
    const searchLower = state.filters.search.toLowerCase();
    filtered = filtered.filter(e => {
      // Search in description
      const descriptionMatch = (e.description || '').toLowerCase().includes(searchLower);
      
      // Search in family member names (for split expenses)
      let memberMatch = false;
      if (e.hasSplit && e.splitDetails && e.splitDetails.length > 0) {
        memberMatch = e.splitDetails.some(split => {
          const memberName = (split.memberName || '').toLowerCase();
          return memberName.includes(searchLower);
        });
      }
      
      // Return true if matches either description or member name
      return descriptionMatch || memberMatch;
    });
  }
  
  state.filteredExpenses = filtered;
  state.filteredCount = filtered.length;
  state.currentPage = 1;
  
  updateCounts();
  
  // Update KPI cards based on filtered data
  if (hasActiveFilters()) {
    updateFilteredExpenseKPIs();
  } else {
    // No filters - show all expenses KPI
    updateExpenseKPIsFromSummary({
      thisMonth: state.allExpensesKPI.thisMonth,
      lastMonth: state.allExpensesKPI.lastMonth,
      totalCount: state.allExpensesKPI.total
    });
  }
  
  // Don't call renderExpenses() here - it's called by loadExpenses()
}

// Check if any filters are active
function hasActiveFilters() {
  return state.filters.category || 
         state.filters.paymentMethod || 
         state.filters.specificPaymentMethod || 
         state.filters.familyMember ||
         state.filters.dateFrom || 
         state.filters.dateTo || 
         state.filters.search;
}

// Apply filters - now reloads data with server-side filters
async function applyFilters() {
  // Reload expenses with new filters applied at Firestore level
  await loadExpenses();
}

// Update counts
function updateCounts() {
  totalCount.textContent = state.allExpensesKPI.total;
  displayedCount.textContent = state.filteredExpenses.length;
}

// Render expenses
async function renderExpenses() {
  
  loadingState.style.display = 'none';
  
  if (state.filteredExpenses.length === 0) {
    emptyState.style.display = 'flex';
    expensesList.style.display = 'none';
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  expensesList.style.display = 'grid';
  
  // Calculate pagination based on total count (not just loaded data)
  const hasFilters = state.filters.category || 
                     state.filters.paymentMethod || 
                     state.filters.specificPaymentMethod || 
                     state.filters.familyMember || 
                     state.filters.dateFrom || 
                     state.filters.dateTo || 
                     state.filters.search;
  
  // Use filtered count if filters applied, otherwise use total from DB
  const totalRecords = hasFilters ? state.filteredExpenses.length : state.totalCount;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageExpenses = state.filteredExpenses.slice(startIndex, endIndex);
  
  // Render expense cards (async to handle decryption)
  const cardResults = await Promise.allSettled(pageExpenses.map(expense => createExpenseCard(expense)));
  const cardsHTML = cardResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to render expense card ${index}:`, result.reason);
      return '<div class="expense-card error">Failed to load expense</div>';
    }
  });
  expensesList.innerHTML = cardsHTML.join('');
  
  // Render pagination
  renderPagination(totalPages);
  
  // Attach event listeners to cards
  attachCardEventListeners();
}

// Render pagination with numbered pages
function renderPagination(totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationNumbers = document.getElementById('paginationNumbers');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
  if (!paginationContainer || !paginationNumbers) {
    console.error('[Pagination] Container or numbers div not found');
    return;
  }
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  // Update prev/next buttons
  if (prevBtn) prevBtn.disabled = state.currentPage === 1;
  if (nextBtn) nextBtn.disabled = state.currentPage === totalPages;
  
  // Generate page numbers
  const pageNumbers = generatePageNumbers(state.currentPage, totalPages);
  
  paginationNumbers.innerHTML = pageNumbers.map(page => {
    if (page === '...') {
      return '<span class="ellipsis">...</span>';
    }
    
    const isActive = page === state.currentPage;
    return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
  }).join('');
  
  // Attach event listeners to page numbers
  paginationNumbers.querySelectorAll('.page-number').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      goToPage(page);
    });
  });
}

// Generate page numbers with ellipsis
function generatePageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxVisible = 7; // Maximum number of page buttons to show
  
  if (totalPages <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('...');
    }
    
    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    // Always show last page
    pages.push(totalPages);
  }
  
  return pages;
}

// Go to specific page
async function goToPage(page) {
  
  // Check if we need to load more data
  const hasEnoughData = await loadMoreExpensesIfNeeded(page);
  
  if (!hasEnoughData && page > Math.ceil(state.expenses.length / state.itemsPerPage)) {
    toast.warning('No more expenses to load');
    return;
  }
  
  state.currentPage = page;
  await renderExpenses();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Create expense card HTML
async function createExpenseCard(expense) {
  const date = timezoneService.toLocalDate(expense.date);
  const categoryIcon = categoryIcons[expense.category] || '📦';
  const isRecurring = expense.isRecurring || expense.recurringId;
  const isSelected = state.selectedExpenses.has(expense.id);
  const isTripExpense = expense.tripGroupId && expense.tripGroupExpenseId;
  const hasSplit = expense.hasSplit && expense.splitDetails && expense.splitDetails.length > 0;
  
  // Build split details HTML if available (decrypt member names)
  let splitDetailsHTML = '';
  if (hasSplit) {
    try {
      const splitResults = await Promise.allSettled(expense.splitDetails.map(async (split) => {
        const memberName = await encryptionService.decryptValue(split.memberName);
        return { ...split, memberName };
      }));
      
      const decryptedSplits = splitResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to decrypt split member ${index}:`, result.reason);
          return { ...expense.splitDetails[index], memberName: '[Encrypted]' };
        }
      });
      
      splitDetailsHTML = `
        <div class="expense-split-details">
          <div class="expense-split-header">💰 Split by member:</div>
          <div class="expense-split-list">
            ${decryptedSplits.map(split => `
              <div class="expense-split-item">
                <span class="split-member">${escapeHtml(split.memberName)}</span>
                <span class="split-amount">${formatCurrency(split.amount)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error decrypting split details:', error);
      // Fallback to showing without decryption
      splitDetailsHTML = `
        <div class="expense-split-details">
          <div class="expense-split-header">💰 Split by member</div>
        </div>
      `;
    }
  }
  
  return `
    <div class="expense-card swipeable-card ${isSelected ? 'selected' : ''}" data-id="${expense.id}">
      <div class="card-content">
        <div class="expense-header">
          <input type="checkbox" class="expense-checkbox" data-id="${expense.id}" ${isSelected ? 'checked' : ''}>
          <div class="expense-amount">${formatCurrency(expense.amount)}</div>
          <div class="expense-category-with-icon">
            <span class="category-icon">${categoryIcon}</span>
            <span>${expense.category}</span>
            ${isRecurring ? '<span class="recurring-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Recurring</span>' : ''}
            ${isTripExpense ? `<a href="trip-group-detail.html?id=${expense.tripGroupId}" class="trip-badge" title="View Trip Group">✈️ Trip</a>` : ''}
            ${hasSplit ? '<span class="split-badge" title="Split by member">💰 Split</span>' : ''}
          </div>
          <div class="expense-actions">
            <button class="btn-icon btn-duplicate" data-id="${expense.id}" title="Duplicate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
            <button class="btn-icon btn-edit" data-id="${expense.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn-icon btn-delete" data-id="${expense.id}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
        ${expense.description ? `<div class="expense-description">${escapeHtml(expense.description)}</div>` : ''}
        ${splitDetailsHTML}
        <div class="expense-meta">
          <div class="expense-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            ${formatDate(date)}
          </div>
          <div class="expense-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            ${expense.paymentMethod}
          </div>
        </div>
      </div>
      <div class="swipe-actions">
        <div class="swipe-action edit" data-id="${expense.id}">✏️</div>
        <div class="swipe-action delete" data-id="${expense.id}">🗑️</div>
      </div>
    </div>
  `;
}

// Attach event listeners to expense cards
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
      duplicateExpense(id);
    });
  });
  
  // Checkboxes for bulk selection
  document.querySelectorAll('.expense-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      if (e.target.checked) {
        state.selectedExpenses.add(id);
      } else {
        state.selectedExpenses.delete(id);
      }
      updateBulkActionsBar();
    });
  });
  
  // Swipe actions for mobile
  initSwipeActions();
}

// Duplicate expense
async function duplicateExpense(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;
  
  // Open add form with pre-filled data
  openAddForm();
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  descriptionInput.value = expense.description || '';
  paymentMethodInput.value = expense.paymentMethod;
  
  toast.info('Expense duplicated - modify and save');
}

// Update bulk actions bar
function updateBulkActionsBar() {
  const bulkBar = document.getElementById('bulkActionsBar');
  const countEl = document.getElementById('bulkSelectedCount');
  
  if (state.selectedExpenses.size > 0) {
    bulkBar.classList.add('visible');
    countEl.textContent = `${state.selectedExpenses.size} selected`;
  } else {
    bulkBar.classList.remove('visible');
  }
}

// Bulk delete selected expenses
async function bulkDeleteExpenses() {
  if (state.selectedExpenses.size === 0) return;
  
  // Lazy load confirmation modal
  const confirmationModal = await lazyLoader.component('confirmation-modal');
  
  const confirmed = await confirmationModal.show({
    title: 'Delete Expenses',
    message: `Delete ${state.selectedExpenses.size} selected expenses? This action cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger'
  });
  if (!confirmed) return;
  
  try {
    const deleteResults = await Promise.allSettled(
      Array.from(state.selectedExpenses).map(id => firestoreService.deleteExpense(id))
    );
    
    const successCount = deleteResults.filter(r => r.status === 'fulfilled').length;
    const failCount = deleteResults.filter(r => r.status === 'rejected').length;
    
    if (failCount > 0) {
      console.error('Some deletes failed:', deleteResults.filter(r => r.status === 'rejected'));
      toast.warning(`${successCount} expenses deleted, ${failCount} failed`);
    } else {
      toast.success(`${successCount} expenses deleted`);
    }
    
    state.selectedExpenses.clear();
    updateBulkActionsBar();
    await loadExpenses();
  } catch (error) {
    console.error('Error bulk deleting:', error);
    toast.error('Failed to delete expenses');
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

// ============================================
// SPLIT BY MEMBER FUNCTIONALITY
// ============================================

// Load family members for split
async function loadFamilyMembersForSplit() {
  const splitMembersList = document.getElementById('splitMembersList');
  if (!splitMembersList) return;
  
  try {
    // Get active family members for splitting
    const familyMembers = await getActiveFamilyMembers();
    
    if (!familyMembers || familyMembers.length === 0) {
      splitMembersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No active family members. Please enable members in your profile settings.</p>';
      return;
    }
    
    // Create input for each active member with selection checkbox
    splitMembersList.innerHTML = familyMembers.map(member => {
      return `
        <div class="split-member-item" data-member-id="${member.id}">
          <input 
            type="checkbox" 
            class="split-member-checkbox" 
            data-member-id="${member.id}"
            title="Select to include in split"
            style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;"
          >
          <div class="split-member-avatar">${member.icon}</div>
          <div class="split-member-info">
            <div class="split-member-name">${escapeHtml(member.name)}</div>
          </div>
          <div class="split-member-input-wrapper">
            <input 
              type="number" 
              class="split-amount-input" 
              data-member-id="${member.id}"
              data-member-name="${escapeHtml(member.name)}"
              placeholder="0" 
              step="0.01" 
              min="0"
              value="0"
            >
          </div>
        </div>
      `;
    }).join('');
    
    // Add event listeners to split inputs
    document.querySelectorAll('.split-amount-input').forEach(input => {
      input.addEventListener('input', updateSplitSummary);
    });

    // Add event listeners to checkboxes
    document.querySelectorAll('.split-member-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const item = e.target.closest('.split-member-item');
        if (e.target.checked) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
          // Clear the amount when unchecked
          item.querySelector('.split-amount-input').value = '0';
        }
        updateSplitSummary();
      });
    });
    
    // Initialize summary
    updateSplitSummary();
  } catch (error) {
    console.error('Error loading family members:', error);
    splitMembersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Error loading family members</p>';
  }
}

// Get family members from localStorage
async function getFamilyMembers() {
  try {
    const stored = localStorage.getItem('familyMembers');
    if (stored) {
      const members = JSON.parse(stored);
      
      // Decrypt family member names and roles
      const memberResults = await Promise.allSettled(members.map(async (member) => {
        try {
          const decryptedName = await encryptionService.decryptValue(member.name);
          const decryptedRole = await encryptionService.decryptValue(member.role);
          return {
            ...member,
            name: decryptedName,
            role: decryptedRole
          };
        } catch (error) {
          console.warn('Error decrypting family member data:', error);
          // Return member as-is if decryption fails (might already be decrypted)
          return member;
        }
      }));
      
      const decryptedMembers = memberResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to decrypt family member ${index}:`, result.reason);
          return members[index]; // Return original if decryption fails
        }
      });
      
      return decryptedMembers;
    }
    return getDefaultFamilyMembers();
  } catch (error) {
    console.error('Error getting family members:', error);
    return getDefaultFamilyMembers();
  }
}

// Get default family members (6 slots)
function getDefaultFamilyMembers() {
  return [
    { id: 'member-1', name: 'Me', icon: '\u{1F468}', role: 'Self', active: true },
    { id: 'member-2', name: 'Spouse', icon: '\u{1F469}', role: 'Spouse', active: true },
    { id: 'member-3', name: 'Child 1', icon: '\u{1F467}', role: 'Child', active: true },
    { id: 'member-4', name: 'Child 2', icon: '\u{1F466}', role: 'Child', active: true },
    { id: 'member-5', name: 'Father', icon: '\u{1F474}', role: 'Parent', active: true },
    { id: 'member-6', name: 'Mother', icon: '\u{1F475}', role: 'Parent', active: true }
  ];
}

// Initialize default family members if none exist
function initializeFamilyMembers() {
  try {
    const existing = localStorage.getItem('familyMembers');
    if (!existing) {
      const defaultMembers = getDefaultFamilyMembers();
      localStorage.setItem('familyMembers', JSON.stringify(defaultMembers));
      return defaultMembers;
    }
    return JSON.parse(existing);
  } catch (error) {
    console.error('Error initializing family members:', error);
    return getDefaultFamilyMembers();
  }
}

// Get active family members (for splitting)
async function getActiveFamilyMembers() {
  const members = await getFamilyMembers();
  return members.filter(m => m.active);
}

// Extract unique family members from actual expenses data
async function extractFamilyMembersFromExpenses() {
  try {
    const uniqueMembers = new Map();
    
    // Extract from state.expenses if available
    if (state.expenses && state.expenses.length > 0) {
      for (const expense of state.expenses) {
        // Check if expense has split details
        if (expense.hasSplit && expense.splitDetails && expense.splitDetails.length > 0) {
          for (const split of expense.splitDetails) {
            // Use memberName as the key to avoid duplicates
            const memberName = split.memberName || split.name;
            const memberId = split.memberId || split.id;
            
            if (memberName && !uniqueMembers.has(memberName)) {
              // Try to decrypt the member name if it's encrypted
              try {
                const decryptedName = await encryptionService.decryptValue(memberName);
                uniqueMembers.set(decryptedName, {
                  id: memberId,
                  name: decryptedName,
                  memberName: decryptedName
                });
              } catch (e) {
                // If decryption fails, use the name as-is
                uniqueMembers.set(memberName, {
                  id: memberId,
                  name: memberName,
                  memberName: memberName
                });
              }
            }
          }
        }
      }
    }
    
    return Array.from(uniqueMembers.values());
  } catch (error) {
    console.error('Error extracting family members from expenses:', error);
    return [];
  }
}

// Update family member
function updateFamilyMember(memberId, updates) {
  try {
    const members = getFamilyMembers();
    const index = members.findIndex(m => m.id === memberId);
    if (index !== -1) {
      members[index] = { ...members[index], ...updates };
      localStorage.setItem('familyMembers', JSON.stringify(members));
      return members[index];
    }
    return null;
  } catch (error) {
    console.error('Error updating family member:', error);
    return null;
  }
}

// Save all family members
function saveFamilyMembers(members) {
  try {
    localStorage.setItem('familyMembers', JSON.stringify(members));
    return true;
  } catch (error) {
    console.error('Error saving family members:', error);
    return false;
  }
}

// Reset family members to defaults
function resetFamilyMembers() {
  try {
    const defaultMembers = getDefaultFamilyMembers();
    localStorage.setItem('familyMembers', JSON.stringify(defaultMembers));
    return defaultMembers;
  } catch (error) {
    console.error('Error resetting family members:', error);
    return getDefaultFamilyMembers();
  }
}

// Update split summary
function updateSplitSummary() {
  const totalAmount = parseFloat(amountInput.value) || 0;
  
  // Only count checked members
  const checkedItems = document.querySelectorAll('.split-member-item.selected');
  
  let allocatedAmount = 0;
  checkedItems.forEach(item => {
    const input = item.querySelector('.split-amount-input');
    allocatedAmount += parseFloat(input.value) || 0;
  });
  
  const remainingAmount = totalAmount - allocatedAmount;
  
  // Update UI
  document.getElementById('splitTotalAmount').textContent = formatCurrency(totalAmount);
  document.getElementById('splitAllocatedAmount').textContent = formatCurrency(allocatedAmount);
  document.getElementById('splitRemainingAmount').textContent = formatCurrency(Math.abs(remainingAmount));
  
  // Update remaining item styling
  const remainingItem = document.getElementById('splitRemainingItem');
  remainingItem.classList.remove('positive', 'negative', 'zero');
  
  if (remainingAmount > 0.01) {
    remainingItem.classList.add('positive');
  } else if (remainingAmount < -0.01) {
    remainingItem.classList.add('negative');
  } else {
    remainingItem.classList.add('zero');
  }
}

// Auto-distribute split equally
function autoDistributeSplit() {
  const totalAmount = parseFloat(amountInput.value) || 0;
  
  if (totalAmount <= 0) {
    toast.warning('Please enter a total amount first');
    return;
  }
  
  // Get only checked members
  const checkedInputs = Array.from(document.querySelectorAll('.split-member-checkbox:checked'))
    .map(checkbox => checkbox.closest('.split-member-item').querySelector('.split-amount-input'));
  
  if (checkedInputs.length === 0) {
    toast.warning('Please select at least one family member to split with');
    return;
  }
  
  const amountPerMember = (totalAmount / checkedInputs.length).toFixed(2);
  
  checkedInputs.forEach((input, index) => {
    // For the last member, adjust to account for rounding
    if (index === checkedInputs.length - 1) {
      const currentTotal = checkedInputs.slice(0, -1).reduce((sum, inp) => sum + parseFloat(inp.value || 0), 0);
      input.value = (totalAmount - currentTotal).toFixed(2);
    } else {
      input.value = amountPerMember;
    }
  });
  
  updateSplitSummary();
  toast.success('Amount distributed equally among selected members');
}

// Validate split details
function validateSplitDetails() {
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  
  if (!enableSplitCheckbox || !enableSplitCheckbox.checked) {
    return true; // Split not enabled, no validation needed
  }
  
  const totalAmount = parseFloat(amountInput.value) || 0;
  
  // Only validate checked members
  const checkedItems = document.querySelectorAll('.split-member-item.selected');
  
  let allocatedAmount = 0;
  let hasNonZero = false;
  
  checkedItems.forEach(item => {
    const input = item.querySelector('.split-amount-input');
    const value = parseFloat(input.value) || 0;
    allocatedAmount += value;
    if (value > 0) hasNonZero = true;
  });
  
  const splitDetailsError = document.getElementById('splitDetailsError');
  
  if (!hasNonZero) {
    splitDetailsError.textContent = 'Please allocate amounts to at least one selected family member';
    return false;
  }
  
  const difference = Math.abs(totalAmount - allocatedAmount);
  
  if (difference > 0.01) {
    splitDetailsError.textContent = `Split amounts must equal total amount. Difference: ${formatCurrency(difference)}`;
    return false;
  }
  
  splitDetailsError.textContent = '';
  return true;
}

// Get split details data
function getSplitDetailsData() {
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  
  if (!enableSplitCheckbox || !enableSplitCheckbox.checked) {
    return null;
  }
  
  // Only get checked members
  const checkedItems = document.querySelectorAll('.split-member-item.selected');
  const splitDetails = [];
  
  checkedItems.forEach(item => {
    const input = item.querySelector('.split-amount-input');
    const amount = parseFloat(input.value) || 0;
    if (amount > 0) {
      const splitData = {
        memberId: input.dataset.memberId,
        memberName: input.dataset.memberName,
        amount: amount
      };
      splitDetails.push(splitData);
    }
  });
  
  return splitDetails.length > 0 ? splitDetails : null;
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
  
  // Logout handled by global logout-handler.js
  
  // Add expense button
  addExpenseBtn.addEventListener('click', openAddForm);
  
  // Export button
  exportBtn.addEventListener('click', handleExport);
  
  // Payment method cascading selection
  paymentMethodInput.addEventListener('change', handlePaymentMethodChange);
  
  // Split by member functionality
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  const splitDetailsContainer = document.getElementById('splitDetailsContainer');
  const autoDistributeBtn = document.getElementById('autoDistributeBtn');
  
  if (enableSplitCheckbox) {
    enableSplitCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        splitDetailsContainer.style.display = 'block';
        loadFamilyMembersForSplit();
      } else {
        splitDetailsContainer.style.display = 'none';
      }
    });
  }
  
  if (autoDistributeBtn) {
    autoDistributeBtn.addEventListener('click', autoDistributeSplit);
  }
  
  // Update split summary when amount changes
  amountInput.addEventListener('input', updateSplitSummary);
  
  // Filters
  categoryFilter.addEventListener('change', () => {
    state.filters.category = categoryFilter.value;
    applyFilters();
  });
  
  paymentMethodFilter.addEventListener('change', () => {
    state.filters.paymentMethod = paymentMethodFilter.value;
    handlePaymentMethodFilterChange();
  });
  
  if (specificPaymentMethodFilter) {
    specificPaymentMethodFilter.addEventListener('change', () => {
      state.filters.specificPaymentMethod = specificPaymentMethodFilter.value;
      applyFilters();
    });
  }
  
  if (familyMemberFilter) {
    familyMemberFilter.addEventListener('change', () => {
      state.filters.familyMember = familyMemberFilter.value;
      applyFilters();
    });
  }
  
  if (dateFromFilter) {
    dateFromFilter.addEventListener('change', () => {
      state.filters.dateFrom = dateFromFilter.value;
      applyFilters();
    });
  }
  
  if (dateToFilter) {
    dateToFilter.addEventListener('change', () => {
      state.filters.dateTo = dateToFilter.value;
      applyFilters();
    });
  }
  
  clearFiltersBtn.addEventListener('click', clearFilters);
  
  // Search with debounce
  searchInput.addEventListener('input', debounce(() => {
    state.filters.search = searchInput.value;
    applyFilters();
  }, 300));
  
  // Pagination is now handled by the Pagination component
  // Old manual pagination listeners removed - using pagination.onPageChange callback
  
  // Form close buttons
  closeFormBtn.addEventListener('click', closeExpenseForm);
  cancelFormBtn.addEventListener('click', closeExpenseForm);
  
  // Smart categorization on description input
  descriptionInput.addEventListener('input', debounce(async () => {
    const description = descriptionInput.value.trim();
    if (description.length >= 3 && !categoryInput.value) {
      const suggestion = await smartCategorizationService.suggestCategory(description, 'expense');
      if (suggestion.category && suggestion.confidence >= 0.5) {
        // Show suggestion
        showCategorySuggestion(suggestion);
      } else {
        hideCategorySuggestion();
      }
    } else {
      hideCategorySuggestion();
    }
  }, 500));
  
  // Form submit
  expenseForm.addEventListener('submit', handleFormSubmit);
  
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
  const fabBtn = document.getElementById('fabAddExpense');
  if (fabBtn) {
    fabBtn.addEventListener('click', openAddForm);
  }
  
  // Bulk actions
  const bulkCancelBtn = document.getElementById('bulkCancelBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  
  if (bulkCancelBtn) {
    bulkCancelBtn.addEventListener('click', () => {
      state.selectedExpenses.clear();
      updateBulkActionsBar();
      renderExpenses();
    });
  }
  
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', bulkDeleteExpenses);
  }
  
  // Pull to refresh
  initPullToRefresh();
  
  // Pagination buttons
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', async () => {
      if (state.currentPage > 1) {
        await goToPage(state.currentPage - 1);
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', async () => {
      const hasFilters = state.filters.category || 
                         state.filters.paymentMethod || 
                         state.filters.specificPaymentMethod || 
                         state.filters.familyMember || 
                         state.filters.dateFrom || 
                         state.filters.dateTo || 
                         state.filters.search;
      
      const totalRecords = hasFilters ? state.filteredExpenses.length : state.totalCount;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        await goToPage(state.currentPage + 1);
      }
    });
  }
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
    if (pullIndicator.classList.contains('visible')) {
      try {
        await loadExpenses();
        toast.success('Refreshed');
      } catch (error) {
        console.error('Error refreshing expenses:', error);
        toast.error('Failed to refresh');
      } finally {
        pullIndicator.classList.remove('visible');
      }
    }
    pulling = false;
  });
}

// Clear filters
function clearFilters() {
  state.filters = {
    category: '',
    paymentMethod: '',
    specificPaymentMethod: '',
    familyMembers: [],
    dateFrom: '',
    dateTo: '',
    search: ''
  };
  
  if (categoryFilter) categoryFilter.value = '';
  if (paymentMethodFilter) paymentMethodFilter.value = '';
  if (specificPaymentMethodFilter) specificPaymentMethodFilter.value = '';
  if (familyMemberFilter) familyMemberFilter.value = '';
  if (dateFromFilter) dateFromFilter.value = '';
  if (dateToFilter) dateToFilter.value = '';
  if (searchInput) searchInput.value = '';
  
  // Hide specific payment method filter
  const specificPaymentMethodGroup = document.getElementById('specificPaymentMethodFilterGroup');
  if (specificPaymentMethodGroup) {
    specificPaymentMethodGroup.style.display = 'none';
  }
  
  applyFilters();
  // Reload full KPI data when filters are cleared
  updateExpenseKPIs();
}

// Open add form
function openAddForm() {
  state.editingExpenseId = null;
  formTitle.textContent = 'Add Expense';
  saveFormBtn.textContent = 'Save Expense';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Reset form
  expenseForm.reset();
  dateInput.value = timezoneService.formatDateForInput(new Date());
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addExpenseSection.classList.add('show');
  addExpenseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Open edit form
function openEditForm(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;
  
  state.editingExpenseId = id;
  formTitle.textContent = 'Edit Expense';
  saveFormBtn.textContent = 'Update Expense';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Populate form
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  descriptionInput.value = expense.description || '';
  const date = timezoneService.toLocalDate(expense.date);
  dateInput.value = timezoneService.formatDateForInput(date);
  paymentMethodInput.value = expense.paymentMethod;
  
  // Trigger payment method change to populate saved methods dropdown
  handlePaymentMethodChange();
  
  // Set specific payment method if available
  if (expense.specificPaymentMethodId && specificPaymentMethodInput) {
    specificPaymentMethodInput.value = expense.specificPaymentMethodId;
  }
  
  // Populate split details if available
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  const splitDetailsContainer = document.getElementById('splitDetailsContainer');
  
  if (expense.hasSplit && expense.splitDetails && expense.splitDetails.length > 0) {
    if (enableSplitCheckbox) {
      enableSplitCheckbox.checked = true;
      splitDetailsContainer.style.display = 'block';
      
      // Load family members first
      loadFamilyMembersForSplit().then(() => {
        // Then populate the split amounts
        expense.splitDetails.forEach(split => {
          const input = document.querySelector(`.split-amount-input[data-member-id="${split.memberId}"]`);
          if (input) {
            input.value = split.amount;
          }
        });
        updateSplitSummary();
      });
    }
  } else {
    if (enableSplitCheckbox) {
      enableSplitCheckbox.checked = false;
      splitDetailsContainer.style.display = 'none';
    }
  }
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addExpenseSection.classList.add('show');
  addExpenseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Close expense form
function closeExpenseForm() {
  addExpenseSection.classList.remove('show');
  expenseForm.reset();
  clearFormErrors();
  state.editingExpenseId = null;
  
  // Reset split details
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  const splitDetailsContainer = document.getElementById('splitDetailsContainer');
  if (enableSplitCheckbox) {
    enableSplitCheckbox.checked = false;
  }
  if (splitDetailsContainer) {
    splitDetailsContainer.style.display = 'none';
  }
}

// Clear form errors
function clearFormErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
}

// Validate form
function validateExpenseForm() {
  clearFormErrors();
  
  const validator = new Validator();
  let isValid = true;
  
  // Amount validation
  const amount = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amount) || amount <= 0) {
    document.getElementById('amountError').textContent = 'Please enter a valid amount greater than 0';
    isValid = false;
  }
  
  // Category validation
  if (!categoryInput.value) {
    document.getElementById('categoryError').textContent = 'Please select a category';
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
  
  // Split details validation
  if (!validateSplitDetails()) {
    isValid = false;
  }
  
  return isValid;
}

// Handle form submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateExpenseForm()) {
    return;
  }
  
  // Show loading state
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';
  
  try {
    const expenseData = {
      amount: parseFloat(amountInput.value),
      category: categoryInput.value,
      description: descriptionInput.value.trim(),
      date: timezoneService.parseInputDate(dateInput.value),
      paymentMethod: paymentMethodInput.value,
      specificPaymentMethodId: specificPaymentMethodInput.value || null,
      specificPaymentMethodName: specificPaymentMethodInput.value ? 
        specificPaymentMethodInput.options[specificPaymentMethodInput.selectedIndex].text : null
    };
    
    // Family context removed - personal expenses only
    
    // Add split details if enabled (encrypt member names)
    const splitDetails = getSplitDetailsData();
    if (splitDetails) {
      // Encrypt member names in split details
      const encryptedSplitDetails = await Promise.all(splitDetails.map(async (split) => {
        return {
          ...split,
          memberName: await encryptionService.encryptValue(split.memberName)
        };
      }));
      
      expenseData.splitDetails = encryptedSplitDetails;
      expenseData.hasSplit = true;
    }
    
    // Add linked data if present
    if (expenseForm.dataset.linkedType) {
      expenseData.linkedType = expenseForm.dataset.linkedType;
      expenseData.linkedId = expenseForm.dataset.linkedId;
      expenseData.linkedName = expenseForm.dataset.linkedName;
    }
    
    let result;
    
    if (state.editingExpenseId) {
      // Update existing expense
      result = await firestoreService.updateExpense(state.editingExpenseId, expenseData);
      
      if (result.success) {
        toast.success('Expense updated successfully');
      }
    } else {
      // Add new expense
      result = await firestoreService.addExpense(expenseData);
      
      if (result.success) {
        toast.success('Expense added successfully');
        
        // Update credit card balance if payment method is a credit card
        if (expenseData.paymentMethod === 'card' && expenseData.specificPaymentMethodId) {
          await creditCardService.updateCardBalanceOnExpense(
            expenseData.specificPaymentMethodId,
            expenseData.amount
          );
        }
      }
    }
    
    if (result.success) {
      // Learn from this categorization for smart suggestions
      if (expenseData.description && expenseData.category) {
        smartCategorizationService.learnFromCategorization(
          expenseData.description,
          expenseData.category,
          'expense'
        );
      }
      
      closeExpenseForm();
      
      // If came from house/vehicle page, redirect back
      if (expenseForm.dataset.linkedType) {
        const linkedType = expenseForm.dataset.linkedType;
        setTimeout(() => {
          window.location.href = linkedType === 'house' ? 'houses.html' : 'vehicles.html';
        }, 1000);
      } else {
        await loadExpenses();
      }
    } else {
      toast.error(result.error || 'Failed to save expense');
    }
    
  } catch (error) {
    console.error('Error saving expense:', error);
    toast.error('Failed to save expense');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

// Open delete modal
function openDeleteModal(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;
  
  deleteExpenseId = id;
  deleteAmount.textContent = formatCurrency(expense.amount);
  deleteDescription.textContent = expense.description || expense.category;
  
  deleteModal.classList.add('show');
}

// Close delete modal
function closeDeleteConfirmModal() {
  deleteModal.classList.remove('show');
  deleteExpenseId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteExpenseId) return;
  
  // Show loading state
  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';
  
  try {
    const result = await firestoreService.deleteExpense(deleteExpenseId);
    
    if (result.success) {
      toast.success('Expense deleted successfully');
      closeDeleteConfirmModal();
      await loadExpenses();
    } else {
      toast.error(result.error || 'Failed to delete expense');
    }
    
  } catch (error) {
    console.error('Error deleting expense:', error);
    toast.error('Failed to delete expense');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}

// Handle export
function handleExport() {
  if (state.filteredExpenses.length === 0) {
    toast.warning('No expenses to export');
    return;
  }
  
  // Prepare data for export
  const exportData = state.filteredExpenses.map(expense => {
    const date = timezoneService.toLocalDate(expense.date);
    return {
      Date: formatDate(date),
      Amount: expense.amount,
      Category: expense.category,
      Description: expense.description || '',
      'Payment Method': expense.paymentMethod
    };
  });
  
  // Generate filename with current date
  const today = new Date();
  const filename = `expenses_${timezoneService.formatDateForInput(today)}.csv`;
  
  exportToCSV(exportData, filename);
  toast.success('Expenses exported successfully');
}

// ============================================
// SMART CATEGORIZATION HELPERS
// ============================================

// Show category suggestion
function showCategorySuggestion(suggestion) {
  // Remove existing suggestion if any
  hideCategorySuggestion();
  
  const categoryGroup = categoryInput.closest('.form-group');
  if (!categoryGroup) return;
  
  const suggestionDiv = document.createElement('div');
  suggestionDiv.id = 'categorySuggestion';
  suggestionDiv.className = 'category-suggestion';
  suggestionDiv.innerHTML = `
    <span class="suggestion-icon">💡</span>
    <span class="suggestion-text">Suggested: <strong>${escapeHtml(suggestion.category)}</strong></span>
    <span class="suggestion-confidence">(${Math.round(suggestion.confidence * 100)}% match)</span>
    <button type="button" class="suggestion-apply" onclick="applyCategorySuggestion('${escapeHtml(suggestion.category)}')">Apply</button>
    <button type="button" class="suggestion-dismiss" onclick="hideCategorySuggestion()">✕</button>
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
          `<button type="button" class="suggestion-alt" onclick="applyCategorySuggestion('${escapeHtml(s.category)}')">${escapeHtml(s.category)}</button>`
        ).join('')}
      `;
      suggestionDiv.appendChild(othersDiv);
    }
  }
  
  categoryGroup.appendChild(suggestionDiv);
}

// Hide category suggestion
function hideCategorySuggestion() {
  const existing = document.getElementById('categorySuggestion');
  if (existing) {
    existing.remove();
  }
}

// Apply category suggestion
function applyCategorySuggestion(category) {
  categoryInput.value = category;
  hideCategorySuggestion();
  toast.success(`Category set to "${category}"`);
}

// Expose to window for onclick handlers
window.applyCategorySuggestion = applyCategorySuggestion;
window.hideCategorySuggestion = hideCategorySuggestion;
