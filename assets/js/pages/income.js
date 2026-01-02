// Income Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import toast from '../components/toast.js';
import { Validator } from '../utils/validation.js';
import { formatCurrency, formatDate, formatDateForInput, debounce, exportToCSV } from '../utils/helpers.js';

// State management
const state = {
  income: [],
  filteredIncome: [],
  currentPage: 1,
  itemsPerPage: 20,
  filters: {
    source: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  },
  editingIncomeId: null
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
const saveFormBtnText = document.getElementById('saveFormBtnText');
const saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');

// Form fields
const amountInput = document.getElementById('amount');
const sourceInput = document.getElementById('source');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const paymentMethodInput = document.getElementById('paymentMethod');

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteBtnText = document.getElementById('deleteBtnText');
const deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
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
    
    // Initialize categories
    await categoriesService.initializeCategories();
    
    // Load categories into dropdowns
    await loadSourceDropdowns();
    
    // Check for URL parameters (linked income from house/vehicle)
    checkURLParameters();
    
    // Load income
    await loadIncome();
    
    // Setup event listeners
    setupEventListeners();
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
  const linkedType = urlParams.get('linkedType');
  const linkedId = urlParams.get('linkedId');
  const linkedName = urlParams.get('linkedName');
  const source = urlParams.get('source');
  
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
      
      // Show info message
      const infoDiv = document.createElement('div');
      infoDiv.className = 'linked-info';
      infoDiv.innerHTML = `<strong>Linked to:</strong> ${linkedName} (${linkedType})`;
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
    
    state.income = await firestoreService.getIncome();
    state.filteredIncome = [...state.income];
    
    applyFilters();
    
  } catch (error) {
    console.error('Error loading income:', error);
    toast.error('Failed to load income');
    loadingState.style.display = 'none';
  }
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
    const fromDate = new Date(state.filters.dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    filtered = filtered.filter(i => {
      const incomeDate = i.date.toDate ? i.date.toDate() : new Date(i.date);
      return incomeDate >= fromDate;
    });
  }
  
  if (state.filters.dateTo) {
    const toDate = new Date(state.filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(i => {
      const incomeDate = i.date.toDate ? i.date.toDate() : new Date(i.date);
      return incomeDate <= toDate;
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
    paginationContainer.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  incomeList.style.display = 'grid';
  
  // Calculate pagination
  const totalPages = Math.ceil(state.filteredIncome.length / state.itemsPerPage);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageIncome = state.filteredIncome.slice(startIndex, endIndex);
  
  // Render income cards
  incomeList.innerHTML = pageIncome.map(income => createIncomeCard(income)).join('');
  
  // Update pagination
  if (totalPages > 1) {
    paginationContainer.style.display = 'flex';
    currentPageSpan.textContent = state.currentPage;
    totalPagesSpan.textContent = totalPages;
    prevPageBtn.disabled = state.currentPage === 1;
    nextPageBtn.disabled = state.currentPage === totalPages;
  } else {
    paginationContainer.style.display = 'none';
  }
  
  // Attach event listeners to cards
  attachCardEventListeners();
}

// Create income card HTML
function createIncomeCard(income) {
  const date = income.date.toDate ? income.date.toDate() : new Date(income.date);
  
  return `
    <div class="income-card" data-id="${income.id}">
      <div class="income-header">
        <div class="income-amount">${formatCurrency(income.amount)}</div>
        <div class="income-actions">
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
      <div class="income-source">${income.source}</div>
      ${income.description ? `<div class="income-description">${income.description}</div>` : ''}
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
  
  // Pagination
  prevPageBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderIncome();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredIncome.length / state.itemsPerPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderIncome();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  // Form close buttons
  closeFormBtn.addEventListener('click', closeIncomeForm);
  cancelFormBtn.addEventListener('click', closeIncomeForm);
  
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
  saveFormBtnText.textContent = 'Save Income';
  
  // Reset form
  incomeForm.reset();
  dateInput.value = formatDateForInput(new Date());
  
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
  saveFormBtnText.textContent = 'Update Income';
  
  // Populate form
  amountInput.value = income.amount;
  sourceInput.value = income.source;
  descriptionInput.value = income.description || '';
  const date = income.date.toDate ? income.date.toDate() : new Date(income.date);
  dateInput.value = formatDateForInput(date);
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
    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
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
  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';
  
  try {
    const incomeData = {
      amount: parseFloat(amountInput.value),
      source: sourceInput.value,
      description: descriptionInput.value.trim(),
      date: new Date(dateInput.value),
      paymentMethod: paymentMethodInput.value
    };
    
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
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
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
  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';
  
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
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
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
    const date = income.date.toDate ? income.date.toDate() : new Date(income.date);
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
  const filename = `income_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.csv`;
  
  exportToCSV(exportData, filename);
  toast.success('Income exported successfully');
}
