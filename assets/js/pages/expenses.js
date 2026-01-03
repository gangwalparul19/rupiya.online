// Expenses Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { Validator } from '../utils/validation.js';
import { formatCurrency, formatDate, formatDateForInput, debounce, exportToCSV } from '../utils/helpers.js';

// State management
const state = {
  expenses: [],
  filteredExpenses: [],
  currentPage: 1,
  itemsPerPage: 20,
  filters: {
    category: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  },
  editingExpenseId: null
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
const saveFormBtnText = document.getElementById('saveFormBtnText');
const saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');

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
const deleteBtnText = document.getElementById('deleteBtnText');
const deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
const deleteAmount = document.getElementById('deleteAmount');
const deleteDescription = document.getElementById('deleteDescription');

let deleteExpenseId = null;

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
    await loadCategoryDropdowns();
    
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

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('expensesSubtitle');
  const expenseTypeGroup = document.getElementById('expenseTypeGroup');
  
  if (context.context === 'family' && context.group) {
    subtitle.textContent = `Tracking expenses for ${context.group.name}`;
    // Show personal/shared option in form
    if (expenseTypeGroup) {
      expenseTypeGroup.style.display = 'block';
    }
  } else {
    subtitle.textContent = 'Track and manage your spending';
    // Hide personal/shared option
    if (expenseTypeGroup) {
      expenseTypeGroup.style.display = 'none';
    }
  }
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

// Check URL parameters for pre-filled data
function checkURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const linkedType = urlParams.get('linkedType');
  const linkedId = urlParams.get('linkedId');
  const linkedName = urlParams.get('linkedName');
  const category = urlParams.get('category');
  
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
      
      // Show info message
      const infoDiv = document.createElement('div');
      infoDiv.className = 'linked-info';
      infoDiv.innerHTML = `<strong>Linked to:</strong> ${linkedName} (${linkedType})`;
      infoDiv.style.cssText = 'padding: 12px; background: #E3F2FD; border: 1px solid #4A90E2; border-radius: 8px; margin-bottom: 1rem; color: #2C3E50;';
      expenseForm.insertBefore(infoDiv, expenseForm.firstChild);
    }, 100);
  }
}

// Load expenses from Firestore
async function loadExpenses() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    expensesList.style.display = 'none';
    
    state.expenses = await firestoreService.getExpenses();
    state.filteredExpenses = [...state.expenses];
    
    applyFilters();
    
  } catch (error) {
    console.error('Error loading expenses:', error);
    toast.error('Failed to load expenses');
    loadingState.style.display = 'none';
  }
}

// Apply filters
function applyFilters() {
  let filtered = [...state.expenses];
  
  // Category filter
  if (state.filters.category) {
    filtered = filtered.filter(e => e.category === state.filters.category);
  }
  
  // Payment method filter
  if (state.filters.paymentMethod) {
    filtered = filtered.filter(e => e.paymentMethod === state.filters.paymentMethod);
  }
  
  // Date range filter
  if (state.filters.dateFrom) {
    const fromDate = new Date(state.filters.dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    filtered = filtered.filter(e => {
      const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return expenseDate >= fromDate;
    });
  }
  
  if (state.filters.dateTo) {
    const toDate = new Date(state.filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(e => {
      const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return expenseDate <= toDate;
    });
  }
  
  // Search filter
  if (state.filters.search) {
    const searchLower = state.filters.search.toLowerCase();
    filtered = filtered.filter(e => 
      (e.description || '').toLowerCase().includes(searchLower)
    );
  }
  
  state.filteredExpenses = filtered;
  state.currentPage = 1;
  
  updateCounts();
  renderExpenses();
}

// Update counts
function updateCounts() {
  totalCount.textContent = state.expenses.length;
  displayedCount.textContent = state.filteredExpenses.length;
}

// Render expenses
function renderExpenses() {
  loadingState.style.display = 'none';
  
  if (state.filteredExpenses.length === 0) {
    emptyState.style.display = 'flex';
    expensesList.style.display = 'none';
    paginationContainer.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  expensesList.style.display = 'grid';
  
  // Calculate pagination
  const totalPages = Math.ceil(state.filteredExpenses.length / state.itemsPerPage);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageExpenses = state.filteredExpenses.slice(startIndex, endIndex);
  
  // Render expense cards
  expensesList.innerHTML = pageExpenses.map(expense => createExpenseCard(expense)).join('');
  
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

// Create expense card HTML
function createExpenseCard(expense) {
  const date = expense.date.toDate ? expense.date.toDate() : new Date(expense.date);
  
  return `
    <div class="expense-card" data-id="${expense.id}">
      <div class="expense-header">
        <div class="expense-amount">${formatCurrency(expense.amount)}</div>
        <div class="expense-category">${expense.category}</div>
        <div class="expense-actions">
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
      ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
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
}

// Load user's payment methods
async function loadUserPaymentMethods() {
  try {
    const paymentMethodsService = window.paymentMethodsService;
    if (paymentMethodsService) {
      userPaymentMethods = await paymentMethodsService.getPaymentMethods();
    }
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
  
  // Add expense button
  addExpenseBtn.addEventListener('click', openAddForm);
  
  // Export button
  exportBtn.addEventListener('click', handleExport);
  
  // Payment method cascading selection
  paymentMethodInput.addEventListener('change', handlePaymentMethodChange);
  
  // Filters
  categoryFilter.addEventListener('change', () => {
    state.filters.category = categoryFilter.value;
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
      renderExpenses();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredExpenses.length / state.itemsPerPage);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderExpenses();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  // Form close buttons
  closeFormBtn.addEventListener('click', closeExpenseForm);
  cancelFormBtn.addEventListener('click', closeExpenseForm);
  
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
}

// Clear filters
function clearFilters() {
  state.filters = {
    category: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  };
  
  categoryFilter.value = '';
  paymentMethodFilter.value = '';
  dateFromFilter.value = '';
  dateToFilter.value = '';
  searchInput.value = '';
  
  applyFilters();
}

// Open add form
function openAddForm() {
  state.editingExpenseId = null;
  formTitle.textContent = 'Add Expense';
  saveFormBtnText.textContent = 'Save Expense';
  
  // Reset form
  expenseForm.reset();
  dateInput.value = formatDateForInput(new Date());
  
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
  saveFormBtnText.textContent = 'Update Expense';
  
  // Populate form
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  descriptionInput.value = expense.description || '';
  const date = expense.date.toDate ? expense.date.toDate() : new Date(expense.date);
  dateInput.value = formatDateForInput(date);
  paymentMethodInput.value = expense.paymentMethod;
  
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
  
  if (!validateExpenseForm()) {
    return;
  }
  
  // Show loading state
  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';
  
  try {
    const expenseData = {
      amount: parseFloat(amountInput.value),
      category: categoryInput.value,
      description: descriptionInput.value.trim(),
      date: new Date(dateInput.value),
      paymentMethod: paymentMethodInput.value,
      specificPaymentMethodId: specificPaymentMethodInput.value || null,
      specificPaymentMethodName: specificPaymentMethodInput.value ? 
        specificPaymentMethodInput.options[specificPaymentMethodInput.selectedIndex].text : null
    };
    
    // Add family context if in family mode
    const context = familySwitcher.getCurrentContext();
    if (context.context === 'family' && context.groupId) {
      expenseData.familyGroupId = context.groupId;
      
      // Check if expense is personal or shared
      const expenseTypeRadio = document.querySelector('input[name="expenseType"]:checked');
      if (expenseTypeRadio) {
        expenseData.expenseType = expenseTypeRadio.value; // 'personal' or 'shared'
        expenseData.isShared = expenseTypeRadio.value === 'shared';
      } else {
        expenseData.expenseType = 'personal';
        expenseData.isShared = false;
      }
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
      }
    }
    
    if (result.success) {
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
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
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
  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';
  
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
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
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
    const date = expense.date.toDate ? expense.date.toDate() : new Date(expense.date);
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
  const filename = `expenses_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.csv`;
  
  exportToCSV(exportData, filename);
  toast.success('Expenses exported successfully');
}
