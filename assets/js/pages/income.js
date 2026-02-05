// Income Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import paymentMethodsService from '../services/payment-methods-service.js';
import smartCategorizationService from '../services/smart-categorization-service.js';
import encryptionService from '../services/encryption-service.js';
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
  income: [],
  filteredIncome: [],
  currentPage: 1,
  itemsPerPage: 10,
  filters: {
    source: '',
    paymentMethod: '',
    specificPaymentMethod: '',
    familyMember: '', // Single select
    dateFrom: '',
    dateTo: '',
    search: ''
  },
  editingIncomeId: null,
  selectedIncome: new Set(),
  bulkMode: false,
  totalCount: 0,
  filteredCount: 0,
  lastDoc: null,
  hasMore: true,
  loadingMore: false,
  allIncomeKPI: {
    thisMonth: 0,
    lastMonth: 0,
    total: 0
  }
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
    // Load user profile
    loadUserProfile(user);
    
    // Update subtitle based on context
    updatePageContext();
    
    // Initialize categories
    await categoriesService.initializeCategories();
    
    // Initialize family members (creates defaults if none exist)
    initializeFamilyMembers();
    
    // Load categories into dropdowns
    await loadSourceDropdowns();
    
    // Populate family member filter
    populateFamilyMemberFilter();
    
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
  const subtitle = document.getElementById('incomeSubtitle');
  const incomeTypeGroup = document.getElementById('incomeTypeGroup');
  
  subtitle.textContent = 'Track and manage your earnings';
  // Hide personal/shared option
  if (incomeTypeGroup) {
    incomeTypeGroup.style.display = 'none';
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

// Populate family member filter
async function populateFamilyMemberFilter() {
  try {
    // Get family members from both localStorage and actual income data
    const familyMembers = await getActiveFamilyMembers();
    const incomeFamilyMembers = await extractFamilyMembersFromIncome();
    const familyMemberFilter = document.getElementById('familyMemberFilter');
    
    if (!familyMemberFilter) return;
    
    // Combine and deduplicate family members using name as the unique key
    const allMembers = new Map();
    
    // Add members from localStorage
    if (familyMembers && familyMembers.length > 0) {
      familyMembers.forEach(member => {
        const memberName = member.name || member.memberName;
        if (memberName) {
          allMembers.set(memberName.toLowerCase(), member);
        }
      });
    }
    
    // Add members from income (only if not already in map)
    if (incomeFamilyMembers && incomeFamilyMembers.length > 0) {
      incomeFamilyMembers.forEach(member => {
        const memberName = member.name || member.memberName;
        if (memberName) {
          const key = memberName.toLowerCase();
          if (!allMembers.has(key)) {
            allMembers.set(key, member);
          }
        }
      });
    }
    
    const uniqueMembers = Array.from(allMembers.values());
    
    if (uniqueMembers && uniqueMembers.length > 0) {
      familyMemberFilter.innerHTML = '<option value="">All Members</option>' +
        uniqueMembers.map(member => {
          const memberId = member.id || member.name;
          const memberName = member.name || member.memberName;
          const icon = member.icon || '';
          return `<option value="${memberId}">${icon} ${escapeHtml(memberName)}</option>`;
        }).join('');
    }
  } catch (error) {
    console.error('Error populating family member filter:', error);
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
  const source = urlParams.get('source');
  
  // Only open form if there are linked parameters or source data
  // Do NOT open just because action=add is present (user should click Add Income button)
  const hasLinkedData = linkedType && linkedId && linkedName;
  const hasSourceData = source;
  
  // Only auto-open if there's actual data to pre-fill (linked data or source)
  if (hasLinkedData || hasSourceData) {
    setTimeout(() => {
      openAddForm();
      if (source) {
        sourceInput.value = source;
      }
      
      if (hasLinkedData) {
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
      }
    }, 100);
  }
  
  // If action=add but no data to pre-fill, just remove the parameter from URL
  // This keeps the URL clean without opening the form
  if (action === 'add' && !hasLinkedData && !hasSourceData) {
    // Clean up URL without reloading the page
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}

// Load income from Firestore
async function loadIncome() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    incomeList.style.display = 'none';
    
    // Get KPI summary for ALL income (unfiltered)
    const kpiSummary = await firestoreService.getIncomeKPISummary();
    state.allIncomeKPI = {
      thisMonth: kpiSummary.thisMonth,
      lastMonth: kpiSummary.lastMonth,
      total: kpiSummary.totalCount
    };
    
    state.totalCount = kpiSummary.totalCount;
    
    // Update KPI cards with all income
    updateIncomeKPIsFromSummary(kpiSummary);
    
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
        const result = await firestoreService.getIncomePaginated({ 
          pageSize: 1000,
          filters: [] // No Firestore filters
        });
        
        state.income = result.data;
        state.filteredIncome = [...state.income];
        applyClientSideFilters();
        state.filteredCount = state.filteredIncome.length;
        updateFilteredIncomeKPIs();
      } else {
        // With Firestore filters: Load filtered data
        const result = await firestoreService.getIncomePaginated({ 
          pageSize: 1000,
          filters: filters
        });
        
        state.income = result.data;
        state.filteredIncome = [...state.income];
        applyClientSideFilters();
        state.filteredCount = state.filteredIncome.length;
        updateFilteredIncomeKPIs();
      }
    } else {
      // No filters: Load initial batch (50 records for first 5 pages)
      const initialBatchSize = state.itemsPerPage * 5; // 50 records
      const result = await firestoreService.getIncomePaginated({ 
        pageSize: initialBatchSize,
        filters: filters
      });
      
      state.income = result.data;
      state.lastDoc = result.lastDoc;
      state.hasMore = result.hasMore;
      state.filteredIncome = [...state.income];
      state.filteredCount = state.totalCount;
    }
    
    // Reset to page 1
    state.currentPage = 1;
    
    // Render income
    renderIncome();
    
  } catch (error) {
    console.error('Error loading income:', error);
    toast.error('Failed to load income');
    loadingState.style.display = 'none';
  }
}

// Load more income when user navigates to a page that needs more data
async function loadMoreIncomeIfNeeded(targetPage) {
  const requiredRecords = targetPage * state.itemsPerPage;
  
  // Check if we have enough data loaded
  if (requiredRecords <= state.income.length) {
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
    loadingToast = toast.info('Loading more income...', 0);
    
    // Calculate how many records we need to load
    const recordsNeeded = requiredRecords - state.income.length;
    // Load in batches of 50, or exactly what we need (whichever is larger)
    const batchSize = Math.max(50, recordsNeeded);
    
    const result = await firestoreService.getIncomePaginated({
      pageSize: batchSize,
      lastDoc: state.lastDoc,
      filters: buildFirestoreFilters()
    });
    
    // Append new data
    state.income = [...state.income, ...result.data];
    state.lastDoc = result.lastDoc;
    state.hasMore = result.hasMore;
    state.filteredIncome = [...state.income];
    
    // Check if we have enough data now
    if (state.income.length >= requiredRecords) {
      return true;
    } else if (!state.hasMore) {
      // No more data available, but we don't have enough
      return false;
    } else {
      // Still need more data, but we loaded what we could
      return true;
    }
  } catch (error) {
    console.error('[LoadMore] Error loading more income:', error);
    toast.error('Failed to load more income');
    return false;
  } finally {
    // Always dismiss loading toast
    if (loadingToast) {
      toast.removeToast(loadingToast);
    }
    state.loadingMore = false;
  }
}

// Load more income when user clicks "Load More" button
async function loadMoreIncome() {
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
    
    const result = await firestoreService.getIncomePaginated({
      pageSize: state.itemsPerPage,
      lastDoc: state.lastDoc,
      filters: filters
    });
    
    if (result.data.length > 0) {
      state.income = [...state.income, ...result.data];
      state.lastDoc = result.lastDoc;
      state.hasMore = result.hasMore;
      
      // Check if all data is loaded
      if (!result.hasMore || state.income.length >= state.totalCount) {
        state.allDataLoaded = true;
      }
      
      // Apply client-side filters and re-render
      state.filteredIncome = [...state.income];
      applyClientSideFilters();
    }
  } catch (error) {
    console.error('Error loading more income:', error);
    toast.error('Failed to load more income');
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
function updateIncomeKPIsFromSummary(summary) {
  const thisMonthEl = document.getElementById('thisMonthIncome');
  const lastMonthEl = document.getElementById('lastMonthIncome');
  const totalEl = document.getElementById('totalIncome');
  
  if (thisMonthEl) thisMonthEl.textContent = formatCurrencyCompact(summary.thisMonth);
  if (lastMonthEl) lastMonthEl.textContent = formatCurrencyCompact(summary.lastMonth);
  if (totalEl) totalEl.textContent = summary.totalCount.toLocaleString();
  
  // Update tooltips with full amounts
  const thisMonthKpi = document.getElementById('thisMonthKpi');
  const lastMonthKpi = document.getElementById('lastMonthKpi');
  const totalKpi = document.getElementById('totalKpi');
  
  if (thisMonthKpi) thisMonthKpi.setAttribute('data-tooltip', formatCurrency(summary.thisMonth));
  if (lastMonthKpi) lastMonthKpi.setAttribute('data-tooltip', formatCurrency(summary.lastMonth));
  if (totalKpi) totalKpi.setAttribute('data-tooltip', `${summary.totalCount} income entries`);
  
  // Reinitialize tooltips after data is set
  if (window.kpiTooltipManager) {
    window.kpiTooltipManager.reinitializeTooltips();
  }
}

// Handle page change from pagination component
async function handlePageChange(page) {
  await goToPage(page);
}

// Go to specific page
async function goToPage(page) {
  // Check if we need to load more data
  const hasEnoughData = await loadMoreIncomeIfNeeded(page);
  
  if (!hasEnoughData && page > Math.ceil(state.income.length / state.itemsPerPage)) {
    toast.warning('No more income to load');
    return;
  }
  
  state.currentPage = page;
  renderIncome();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Check if any filters are active
function hasActiveFilters() {
  return state.filters.source || 
         state.filters.paymentMethod || 
         state.filters.specificPaymentMethod || 
         state.filters.familyMember ||
         state.filters.dateFrom || 
         state.filters.dateTo || 
         state.filters.search;
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
    // For split income, calculate the user's share based on current filter
    let amount = Number(income.amount) || 0;
    
    // If income has family member splits and a family member filter is active
    if (income.hasSplit && income.splitDetails && income.splitDetails.length > 0 && state.filters.familyMember) {
      // Find the selected member's share
      const memberSplit = income.splitDetails.find(split => 
        String(split.memberId).trim() === String(state.filters.familyMember).trim()
      );
      
      if (memberSplit) {
        amount = Number(memberSplit.amount) || 0;
      } else {
        // Member not in this split, skip this income
        return;
      }
    }
    
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
  
  // Reinitialize tooltips after data is set
  if (window.kpiTooltipManager) {
    window.kpiTooltipManager.reinitializeTooltips();
  }
}

// Update KPIs based on filtered data
function updateFilteredIncomeKPIs() {
  const now = new Date();
  const thisMonthStart = timezoneService.startOfMonth(now);
  const lastMonthStart = timezoneService.startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = timezoneService.endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let totalAll = 0;
  
  // Use filtered income instead of all income
  state.filteredIncome.forEach(income => {
    // For split income, calculate the user's share based on current filter
    let amount = Number(income.amount) || 0;
    
    // If income has family member splits and a family member filter is active
    if (income.hasSplit && income.splitDetails && income.splitDetails.length > 0 && state.filters.familyMember) {
      // Find the selected member's share
      const memberSplit = income.splitDetails.find(split => 
        String(split.memberId).trim() === String(state.filters.familyMember).trim()
      );
      
      if (memberSplit) {
        amount = Number(memberSplit.amount) || 0;
      } else {
        // Member not in this split, skip this income
        return;
      }
    }
    
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
  
  // Reinitialize tooltips after data is set
  if (window.kpiTooltipManager) {
    window.kpiTooltipManager.reinitializeTooltips();
  }
}

// Build Firestore filters from current filter state
// Only includes filters that can be efficiently done in Firestore
function buildFirestoreFilters() {
  const filters = [];
  
  // Source filter - can be done in Firestore with index
  if (state.filters.source) {
    filters.push({ field: 'source', operator: '==', value: state.filters.source });
  }
  
  // NOTE: Payment method and specific payment method filters are encrypted fields
  // They cannot be filtered at Firestore level, so they are applied client-side
  // See applyClientSideFilters() for payment method filtering
  
  // Note: Date range, search, and family member filters are applied client-side
  
  return filters;
}

// Apply only client-side filters (search, family member, date range)
// Apply only client-side filters (search, family member, date range, payment method)
// Note: Source is filtered at Firestore level
// Note: Payment method and specific payment method are encrypted, so they must be filtered client-side
function applyClientSideFilters() {
  let filtered = [...state.income];
  
  // Payment method filter - encrypted field, must be client-side
  if (state.filters.paymentMethod) {
    filtered = filtered.filter(i => i.paymentMethod === state.filters.paymentMethod);
  }
  
  // Specific payment method filter - encrypted field, must be client-side
  if (state.filters.specificPaymentMethod) {
    filtered = filtered.filter(i => i.specificPaymentMethodId === state.filters.specificPaymentMethod);
  }
  
  // Family member filter (for split income) - single select
  if (state.filters.familyMember) {
    filtered = filtered.filter(i => {
      if (!i.hasSplit || !i.splitDetails) return false;
      const hasMatch = i.splitDetails.some(split => {
        const splitMemberId = String(split.memberId).trim();
        const isSelected = String(state.filters.familyMember).trim() === splitMemberId;
        return isSelected;
      });
      return hasMatch;
    });
  }
  
  // Date range filter - client-side for now
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
  
  // Search filter - must be client-side
  if (state.filters.search) {
    const searchLower = state.filters.search.toLowerCase();
    filtered = filtered.filter(i => {
      // Search in description
      const descriptionMatch = (i.description || '').toLowerCase().includes(searchLower);
      
      // Search in family member names (for split income)
      let memberMatch = false;
      if (i.hasSplit && i.splitDetails && i.splitDetails.length > 0) {
        memberMatch = i.splitDetails.some(split => {
          const memberName = (split.memberName || '').toLowerCase();
          return memberName.includes(searchLower);
        });
      }
      
      // Return true if matches either description or member name
      return descriptionMatch || memberMatch;
    });
  }
  
  state.filteredIncome = filtered;
  state.filteredCount = filtered.length;
  state.currentPage = 1;
  
  updateCounts();
  
  // Update KPI cards based on filtered data
  if (hasActiveFilters()) {
    updateFilteredIncomeKPIs();
  } else {
    // No filters - show all income KPI
    updateIncomeKPIsFromSummary({
      thisMonth: state.allIncomeKPI.thisMonth,
      lastMonth: state.allIncomeKPI.lastMonth,
      totalCount: state.allIncomeKPI.total
    });
  }
  
  // Don't call renderIncome() here - it's called by loadIncome()
}

// Apply filters - now reloads data with server-side filters
async function applyFilters() {
  // Reload income with new filters applied at Firestore level
  await loadIncome();
}

// Update counts
function updateCounts() {
  totalCount.textContent = state.allIncomeKPI.total;
  displayedCount.textContent = state.filteredIncome.length;
}

// Render income
function renderIncome() {
  loadingState.style.display = 'none';
  
  if (state.filteredIncome.length === 0) {
    emptyState.style.display = 'flex';
    incomeList.style.display = 'none';
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  incomeList.style.display = 'grid';
  
  // Calculate pagination based on total count (not just loaded data)
  const hasFilters = state.filters.source || 
                     state.filters.paymentMethod || 
                     state.filters.specificPaymentMethod || 
                     state.filters.familyMember || 
                     state.filters.dateFrom || 
                     state.filters.dateTo || 
                     state.filters.search;
  
  // Use filtered count if filters applied, otherwise use total from DB
  const totalRecords = hasFilters ? state.filteredIncome.length : state.totalCount;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageIncome = state.filteredIncome.slice(startIndex, endIndex);
  
  // Render income cards
  incomeList.innerHTML = pageIncome.map(income => createIncomeCard(income)).join('');
  
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
            ${income.hasSplit ? '<span class="split-badge" title="Split income">👥 Split</span>' : ''}
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
        ${income.hasSplit && income.splitDetails ? `
          <div class="split-info">
            <div class="split-members">
              ${income.splitDetails.map(split => `<span class="split-member-tag">${split.memberName}: ${formatCurrency(split.amount)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
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
  
  // Lazy load confirmation modal
  const confirmationModal = await lazyLoader.component('confirmation-modal');
  
  const confirmed = await confirmationModal.show({
    title: 'Delete Income',
    message: `Delete ${state.selectedIncome.size} selected income entries? This action cannot be undone.`,
    confirmText: 'Delete',
    type: 'danger'
  });
  if (!confirmed) return;
  
  try {
    const deleteResults = await Promise.allSettled(
      Array.from(state.selectedIncome).map(id => firestoreService.deleteIncome(id))
    );
    
    const successCount = deleteResults.filter(r => r.status === 'fulfilled').length;
    const failCount = deleteResults.filter(r => r.status === 'rejected').length;
    
    if (failCount > 0) {
      console.error('Some deletes failed:', deleteResults.filter(r => r.status === 'rejected'));
      toast.warning(`${successCount} income entries deleted, ${failCount} failed`);
    } else {
      toast.success(`${successCount} income entries deleted`);
    }
    
    state.selectedIncome.clear();
    updateBulkActionsBar();
    await loadIncome();
  } catch (error) {
    console.error('Error bulk deleting:', error);
    toast.error('Failed to delete income entries');
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
  
  // Add income button
  addIncomeBtn.addEventListener('click', openAddForm);
  
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
        loadFamilyMembersForSplitIncome();
      } else {
        splitDetailsContainer.style.display = 'none';
      }
    });
  }
  
  if (autoDistributeBtn) {
    autoDistributeBtn.addEventListener('click', autoDistributeSplitIncome);
  }
  
  // Update split summary when amount changes
  amountInput.addEventListener('input', updateSplitIncomeSummary);
  
  // Filters
  sourceFilter.addEventListener('change', () => {
    state.filters.source = sourceFilter.value;
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
  
  const familyMemberFilter = document.getElementById('familyMemberFilter');
  if (familyMemberFilter) {
    familyMemberFilter.addEventListener('change', () => {
      state.filters.familyMember = familyMemberFilter.value;
      applyFilters();
    });
  }
  
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
  
  // Pagination buttons
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', async () => {
      if (state.currentPage > 1) {
        await goToPage(state.currentPage - 1);
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', async () => {
      const hasFilters = state.filters.source || 
                         state.filters.paymentMethod || 
                         state.filters.specificPaymentMethod || 
                         state.filters.familyMember || 
                         state.filters.dateFrom || 
                         state.filters.dateTo || 
                         state.filters.search;
      const totalRecords = hasFilters ? state.filteredIncome.length : state.totalCount;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        await goToPage(state.currentPage + 1);
      }
    });
  }
  
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
    specificPaymentMethod: '',
    familyMembers: [],
    dateFrom: '',
    dateTo: '',
    search: ''
  };
  
  sourceFilter.value = '';
  paymentMethodFilter.value = '';
  const specificPaymentMethodGroup = document.getElementById('specificPaymentMethodFilterGroup');
  if (specificPaymentMethodGroup) {
    specificPaymentMethodGroup.style.display = 'none';
  }
  if (specificPaymentMethodFilter) {
    specificPaymentMethodFilter.value = '';
  }
  const familyMemberFilter = document.getElementById('familyMemberFilter');
  if (familyMemberFilter) {
    familyMemberFilter.value = '';
  }
  dateFromFilter.value = '';
  dateToFilter.value = '';
  searchInput.value = '';
  
  applyFilters();
  // Reload full KPI data when filters are cleared
  updateIncomeKPIs();
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
  
  // Reset split details
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  const splitDetailsContainer = document.getElementById('splitDetailsContainer');
  if (enableSplitCheckbox) {
    enableSplitCheckbox.checked = false;
  }
  if (splitDetailsContainer) {
    splitDetailsContainer.style.display = 'none';
  }
  
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
  
  // Trigger payment method change to populate saved methods dropdown
  handlePaymentMethodChange();
  
  // Set specific payment method if available
  if (income.specificPaymentMethodId && specificPaymentMethodInput) {
    specificPaymentMethodInput.value = income.specificPaymentMethodId;
  }
  
  // Populate split details if available
  const enableSplitCheckbox = document.getElementById('enableSplitByMember');
  const splitDetailsContainer = document.getElementById('splitDetailsContainer');
  
  if (income.hasSplit && income.splitDetails && income.splitDetails.length > 0) {
    if (enableSplitCheckbox) {
      enableSplitCheckbox.checked = true;
      splitDetailsContainer.style.display = 'block';
      
      // Load family members first
      loadFamilyMembersForSplitIncome().then(() => {
        // Then populate the split amounts
        income.splitDetails.forEach(split => {
          const input = document.querySelector(`.split-amount-input[data-member-id="${split.memberId}"]`);
          if (input) {
            input.value = split.amount;
          }
        });
        updateSplitIncomeSummary();
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
  addIncomeSection.classList.add('show');
  addIncomeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Close income form
function closeIncomeForm() {
  addIncomeSection.classList.remove('show');
  incomeForm.reset();
  clearFormErrors();
  state.editingIncomeId = null;
  
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

// ============================================
// FAMILY MEMBER FUNCTIONS
// ============================================

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

// Get active family members (for splitting)
async function getActiveFamilyMembers() {
  const members = await getFamilyMembers();
  return members.filter(m => m.active);
}

// Extract unique family members from actual income data
async function extractFamilyMembersFromIncome() {
  try {
    const uniqueMembers = new Map();
    
    // Extract from state.income if available
    if (state.income && state.income.length > 0) {
      for (const income of state.income) {
        // Check if income has split details
        if (income.hasSplit && income.splitDetails && income.splitDetails.length > 0) {
          for (const split of income.splitDetails) {
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
    console.error('Error extracting family members from income:', error);
    return [];
  }
}

// ============================================
// SPLIT INCOME FUNCTIONS
// ============================================

async function loadFamilyMembersForSplitIncome() {
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
      input.addEventListener('input', updateSplitIncomeSummary);
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
        updateSplitIncomeSummary();
      });
    });
    
    // Initialize summary
    updateSplitIncomeSummary();
  } catch (error) {
    console.error('Error loading family members:', error);
    splitMembersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Error loading family members</p>';
  }
}

// Update split income summary
function updateSplitIncomeSummary() {
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

// Auto-distribute split income equally
function autoDistributeSplitIncome() {
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
  
  updateSplitIncomeSummary();
  toast.success('Amount distributed equally among selected members');
}

// Validate split income details
function validateSplitIncomeDetails() {
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

// Get split income details data
function getSplitIncomeDetailsData() {
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
      splitDetails.push({
        memberId: input.dataset.memberId,
        memberName: input.dataset.memberName,
        amount: amount
      });
    }
  });
  
  return splitDetails.length > 0 ? splitDetails : null;
}

// Validate income form
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
  
  // Split income details validation
  if (!validateSplitIncomeDetails()) {
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
    
    // Add split details if enabled (encrypt member names)
    const splitDetails = getSplitIncomeDetailsData();
    if (splitDetails) {
      // Encrypt member names in split details
      const splitResults = await Promise.allSettled(splitDetails.map(async (split) => {
        return {
          ...split,
          memberName: await encryptionService.encryptValue(split.memberName)
        };
      }));
      
      const encryptedSplitDetails = splitResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to encrypt split detail ${index}:`, result.reason);
          return splitDetails[index]; // Return unencrypted if encryption fails
        }
      });
      
      incomeData.splitDetails = encryptedSplitDetails;
      incomeData.hasSplit = true;
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
