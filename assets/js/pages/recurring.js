// Recurring Transactions Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import encryptionService from '../services/encryption-service.js';
import categoriesService from '../services/categories-service.js';
import paymentMethodsService from '../services/payment-methods-service.js';
import toast from '../components/toast.js';
import recurringProcessor from '../services/recurring-processor.js';
import { formatCurrency, formatDate, escapeHtml, formatDateForInput } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import confirmationModal from '../components/confirmation-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
const state = {
  recurringTransactions: [],
  filteredRecurring: [],
  currentPage: 1,
  itemsPerPage: 10,
  totalCount: 0,
  lastDoc: null,
  hasMore: true,
  loadingMore: false,
  allDataKPI: {
    monthlyExpenses: 0,
    monthlyIncome: 0,
    activeCount: 0
  }
};
let editingRecurringId = null;
let userPaymentMethods = [];

// DOM Elements
let addRecurringBtn, addRecurringSection, closeFormBtn, cancelFormBtn;
let recurringForm, formTitle, saveFormBtn;
let recurringList, emptyState, loadingState;
let processNowBtn;
let monthlyExpensesEl, monthlyIncomeEl, activeCountEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteRecurringDescription, deleteRecurringAmount;
let deleteRecurringId = null;
let paymentMethodInput, specificPaymentMethodGroup, specificPaymentMethodInput;

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

  // Set up event listeners
  setupEventListeners();

  // Load user profile
  loadUserProfile(user);

  // Initialize categories
  await categoriesService.initializeCategories();
  
  // Load categories into dropdown
  await loadCategoryDropdown();

  // Load user payment methods
  await loadUserPaymentMethods();

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadRecurringTransactions();
  });

  // Load data again after encryption is ready (fixes race condition)
  await loadRecurringTransactions();

  // Set default date to today if element exists
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    startDateInput.valueAsDate = new Date();
  }
}

// Load categories into dropdown
async function loadCategoryDropdown() {
  try {
    const expenseCategories = await categoriesService.getExpenseCategories();
    const incomeCategories = await categoriesService.getIncomeCategories();
    
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
      // Combine both expense and income categories
      const allCategories = [...expenseCategories, ...incomeCategories];
      categorySelect.innerHTML = '<option value="">Select category</option>' +
        allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
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
    showToast(`No saved ${getPaymentTypeLabel(selectedType)} found. Add one in Profile > Payment Methods.`, 'info');
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
    'cash': '💵',
    'card': '💳',
    'upi': '📱',
    'bank': '🏦',
    'wallet': '👛'
  };
  return icons[type] || '💰';
}

// Get payment type label
function getPaymentTypeLabel(type) {
  const labels = {
    'cash': 'Cash',
    'card': 'Cards',
    'upi': 'UPI accounts',
    'bank': 'Bank accounts',
    'wallet': 'Digital wallets'
  };
  return labels[type] || type;
}

// Initialize DOM elements
function initDOMElements() {
  addRecurringBtn = document.getElementById('addRecurringBtn');
  processNowBtn = document.getElementById('processNowBtn');
  addRecurringSection = document.getElementById('addRecurringSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  recurringForm = document.getElementById('recurringForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  recurringList = document.getElementById('recurringList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  monthlyExpensesEl = document.getElementById('monthlyExpenses');
  monthlyIncomeEl = document.getElementById('monthlyIncome');
  activeCountEl = document.getElementById('activeCount');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteRecurringDescription = document.getElementById('deleteRecurringDescription');
  deleteRecurringAmount = document.getElementById('deleteRecurringAmount');
  
  // Payment method elements
  paymentMethodInput = document.getElementById('paymentMethod');
  specificPaymentMethodGroup = document.getElementById('specificPaymentMethodGroup');
  specificPaymentMethodInput = document.getElementById('specificPaymentMethod');
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

  // Add recurring
  addRecurringBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  recurringForm.addEventListener('submit', handleSubmit);

  // Process now button
  processNowBtn?.addEventListener('click', handleProcessNow);

  // Payment method change handler
  paymentMethodInput?.addEventListener('change', handlePaymentMethodChange);

  // Delete modal
  closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);
  
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
      const totalRecords = state.filteredRecurring.length;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
  }
}

// Handle process now button click
async function handleProcessNow() {
  processNowBtn.disabled = true;
  processNowBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="spin">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    Processing...
  `;

  try {
    // Force process regardless of daily check
    recurringProcessor.resetProcessingFlag();
    const result = await recurringProcessor.processRecurring(true);

    if (result.processed > 0) {
      showToast(`✅ Created ${result.processed} transaction(s) from recurring entries`, 'success');
      // Reload the list to show updated lastProcessedDate
      await loadRecurringTransactions();
      
      // Invalidate dashboard cache so it shows the new transactions
      firestoreService.invalidateCache('expenses');
      firestoreService.invalidateCache('income');
    } else if (result.error) {
      showToast(`Error: ${result.error}`, 'error');
    } else {
      showToast('No transactions due for processing', 'info');
    }
  } catch (error) {
    console.error('Error processing recurring:', error);
    showToast('Failed to process recurring transactions', 'error');
  } finally {
    processNowBtn.disabled = false;
    processNowBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Process Now
    `;
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
  editingRecurringId = null;
  formTitle.textContent = 'Add Recurring Transaction';
  saveFormBtn.textContent = 'Save Recurring';
  recurringForm.reset();
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Set default date if element exists
  const startDateInput = document.getElementById('startDate');
  if (startDateInput) {
    startDateInput.valueAsDate = new Date();
  }
  
  // Reset specific payment method dropdown
  if (specificPaymentMethodGroup) {
    specificPaymentMethodGroup.style.display = 'none';
  }
  if (specificPaymentMethodInput) {
    specificPaymentMethodInput.value = '';
  }
  
  addRecurringSection.classList.add('show');
  addRecurringSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Hide form
function hideForm() {
  addRecurringSection.classList.remove('show');
  recurringForm.reset();
  editingRecurringId = null;
  
  // Reset specific payment method dropdown
  if (specificPaymentMethodGroup) {
    specificPaymentMethodGroup.style.display = 'none';
  }
}

// Show edit form
function showEditForm(recurring) {
  editingRecurringId = recurring.id;
  formTitle.textContent = 'Edit Recurring Transaction';
  saveFormBtn.textContent = 'Update Recurring';

  // Reset button state
  saveFormBtn.disabled = false;

  // Fill form with null checks
  const typeEl = document.getElementById('type');
  const descriptionEl = document.getElementById('description');
  const amountEl = document.getElementById('amount');
  const categoryEl = document.getElementById('category');
  const frequencyEl = document.getElementById('frequency');
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  const statusEl = document.getElementById('status');
  const notesEl = document.getElementById('notes');

  if (typeEl) typeEl.value = recurring.type;
  if (descriptionEl) descriptionEl.value = recurring.description;
  if (amountEl) amountEl.value = recurring.amount;
  if (categoryEl) categoryEl.value = recurring.category;
  if (frequencyEl) frequencyEl.value = recurring.frequency;
  if (startDateEl) startDateEl.value = formatDateForInput(recurring.startDate);
  if (endDateEl) endDateEl.value = recurring.endDate ? formatDateForInput(recurring.endDate) : '';
  if (statusEl) statusEl.value = recurring.status;
  if (paymentMethodInput) paymentMethodInput.value = recurring.paymentMethod || 'cash';
  if (notesEl) notesEl.value = recurring.notes || '';

  // Handle specific payment method
  handlePaymentMethodChange();
  if (recurring.paymentMethodId && specificPaymentMethodInput) {
    specificPaymentMethodInput.value = recurring.paymentMethodId;
  }

  addRecurringSection.classList.add('show');
  addRecurringSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();

  // Validate that all required form elements exist
  const typeEl = document.getElementById('type');
  const descriptionEl = document.getElementById('description');
  const amountEl = document.getElementById('amount');
  const categoryEl = document.getElementById('category');
  const frequencyEl = document.getElementById('frequency');
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  const statusEl = document.getElementById('status');
  const notesEl = document.getElementById('notes');

  if (!typeEl || !descriptionEl || !amountEl || !categoryEl || !frequencyEl || !startDateEl || !statusEl) {
    console.error('Required form elements not found. Form may not be fully loaded.');
    showToast('Form is not fully loaded. Please refresh the page and try again.', 'error');
    return;
  }

  // Get specific payment method if selected
  const specificMethodId = specificPaymentMethodInput?.value;
  const specificMethod = specificMethodId ? userPaymentMethods.find(m => m.id === specificMethodId) : null;

  // Get form data
  const formData = {
    type: typeEl.value,
    description: descriptionEl.value,
    amount: parseFloat(amountEl.value),
    category: categoryEl.value,
    frequency: frequencyEl.value,
    startDate: timezoneService.parseInputDate(startDateEl.value),
    endDate: endDateEl?.value ? timezoneService.parseInputDate(endDateEl.value) : null,
    status: statusEl.value,
    paymentMethod: paymentMethodInput?.value || 'cash',
    paymentMethodId: specificMethodId || null,
    paymentMethodName: specificMethod ? getPaymentMethodDisplayName(specificMethod) : null,
    notes: notesEl?.value || ''
  };

  // Show loading
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';

  try {
    let result;
    if (editingRecurringId) {
      // Update existing
      result = await firestoreService.update('recurringTransactions', editingRecurringId, formData);
      if (result.success) {
        showToast('Recurring transaction updated successfully!', 'success');
      }
    } else {
      // Add new
      result = await firestoreService.add('recurringTransactions', formData);
      if (result.success) {
        showToast('Recurring transaction added successfully!', 'success');
      }
    }

    if (result.success) {
      hideForm();
      await loadRecurringTransactions();
      
      // Auto-process if this is a new recurring transaction with a past start date
      if (!editingRecurringId && formData.startDate <= new Date()) {
        showToast('Processing past due entries...', 'info');
        recurringProcessor.resetProcessingFlag();
        const processResult = await recurringProcessor.processRecurring(true);
        if (processResult.processed > 0) {
          showToast(`✅ Created ${processResult.processed} transaction(s) automatically`, 'success');
        }
      }
    } else {
      showToast(result.error || 'Failed to save recurring transaction', 'error');
    }
  } catch (error) {
    console.error('Error saving recurring:', error);
    showToast('An error occurred. Please try again.', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

// Load recurring transactions
async function loadRecurringTransactions() {
  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  recurringList.innerHTML = '';

  try {
    // Get all recurring transactions (usually small dataset)
    const allRecurring = await firestoreService.getAll('recurringTransactions', 'startDate', 'desc');
    
    state.recurringTransactions = allRecurring;
    state.filteredRecurring = [...allRecurring];
    state.totalCount = allRecurring.length;
    
    // Calculate KPI for all data
    calculateKPISummary();

    if (state.filteredRecurring.length === 0) {
      loadingState.style.display = 'none';
      emptyState.style.display = 'flex';
      updateSummary();
      return;
    }

    state.currentPage = 1;
    renderRecurringTransactions();
    updateSummary();
    loadingState.style.display = 'none';
  } catch (error) {
    console.error('Error loading recurring transactions:', error);
    showToast('Failed to load recurring transactions', 'error');
    loadingState.style.display = 'none';
    emptyState.style.display = 'flex';
  }
}

// Calculate KPI summary
function calculateKPISummary() {
  let monthlyExpenses = 0;
  let monthlyIncome = 0;
  let activeCount = 0;

  state.recurringTransactions.forEach(recurring => {
    if (recurring.status === 'active') {
      activeCount++;
      const monthlyAmount = calculateMonthlyAmount(recurring);
      
      if (recurring.type === 'expense') {
        monthlyExpenses += monthlyAmount;
      } else {
        monthlyIncome += monthlyAmount;
      }
    }
  });

  state.allDataKPI = {
    monthlyExpenses,
    monthlyIncome,
    activeCount
  };
}

// Render recurring transactions with pagination
function renderRecurringTransactions() {
  loadingState.style.display = 'none';
  
  if (state.filteredRecurring.length === 0) {
    emptyState.style.display = 'flex';
    recurringList.style.display = 'none';
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  recurringList.style.display = 'grid';
  
  // Calculate pagination
  const totalRecords = state.filteredRecurring.length;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageRecurring = state.filteredRecurring.slice(startIndex, endIndex);
  
  // Render cards
  recurringList.innerHTML = '';
  pageRecurring.forEach(recurring => {
    const card = createRecurringCard(recurring);
    recurringList.appendChild(card);
  });
  
  // Render pagination
  renderPagination(totalPages);
}

// Render pagination with numbered pages
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

// Generate page numbers with ellipsis
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

// Go to specific page
function goToPage(page) {
  state.currentPage = page;
  renderRecurringTransactions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Create recurring card
function createRecurringCard(recurring) {
  const card = document.createElement('div');
  card.className = `recurring-card ${recurring.type} ${recurring.status}`;

  const nextDate = calculateNextDate(recurring);
  const monthlyAmount = calculateMonthlyAmount(recurring);
  const paymentMethodIcons = {
    cash: '💵',
    card: '💳',
    upi: '📱',
    bank: '🏦',
    wallet: '👛'
  };
  const paymentIcon = paymentMethodIcons[recurring.paymentMethod] || '💰';

  card.innerHTML = `
    <div class="recurring-header">
      <div>
        <span class="recurring-type ${recurring.type}">${escapeHtml(recurring.type)}</span>
        <div class="recurring-description">${escapeHtml(recurring.description)}</div>
        <div class="recurring-amount ${recurring.type}">${formatCurrency(recurring.amount)}</div>
      </div>
      <div class="recurring-actions">
        <button type="button" class="btn-icon" onclick="window.editRecurring('${recurring.id}')" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button type="button" class="btn-icon btn-delete" onclick="window.deleteRecurring('${recurring.id}')" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="recurring-details">
      <div class="recurring-detail">
        <span class="recurring-detail-label">Category</span>
        <span class="recurring-detail-value">${escapeHtml(recurring.category)}</span>
      </div>
      <div class="recurring-detail">
        <span class="recurring-detail-label">Frequency</span>
        <span class="recurring-detail-value">${capitalizeFirst(recurring.frequency)}</span>
      </div>
      <div class="recurring-detail">
        <span class="recurring-detail-label">Payment</span>
        <span class="recurring-detail-value">${paymentIcon} ${capitalizeFirst(recurring.paymentMethod || 'cash')}</span>
      </div>
      <div class="recurring-detail">
        <span class="recurring-detail-label">Status</span>
        <span class="recurring-status ${recurring.status}">${capitalizeFirst(recurring.status)}</span>
      </div>
    </div>

    <div class="recurring-footer">
      <div class="recurring-frequency">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span>Started: ${formatDate(recurring.startDate)}</span>
      </div>
      ${nextDate ? `<div class="recurring-next-date">Next: ${formatDate(nextDate)}</div>` : ''}
    </div>
  `;

  return card;
}

// Calculate next date
function calculateNextDate(recurring) {
  if (recurring.status === 'paused') return null;

  const startDate = recurring.startDate.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
  const today = new Date();
  let nextDate = new Date(startDate);

  // Calculate next occurrence based on frequency
  while (nextDate < today) {
    switch (recurring.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
  }

  // Check if end date has passed
  if (recurring.endDate) {
    const endDate = recurring.endDate.toDate ? recurring.endDate.toDate() : new Date(recurring.endDate);
    if (nextDate > endDate) return null;
  }

  return nextDate;
}

// Calculate monthly amount based on actual occurrences in current month
function calculateMonthlyAmount(recurring) {
  const amount = recurring.amount;
  const frequency = recurring.frequency;
  
  // For monthly, quarterly, yearly - use simple division
  switch (frequency) {
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
  }
  
  // For daily, weekly, biweekly - calculate actual occurrences in current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Get first and last day of current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  
  // Parse start date
  const startDate = recurring.startDate ? new Date(recurring.startDate) : firstDayOfMonth;
  
  // If recurring hasn't started yet, return 0
  if (startDate > lastDayOfMonth) {
    return 0;
  }
  
  // Calculate occurrences based on frequency
  let occurrences = 0;
  
  if (frequency === 'daily') {
    // Count days from start date (or first of month) to end of month
    const effectiveStart = startDate > firstDayOfMonth ? startDate : firstDayOfMonth;
    const daysInMonth = Math.floor((lastDayOfMonth - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
    occurrences = Math.max(0, daysInMonth);
  } 
  else if (frequency === 'weekly') {
    // Count weekly occurrences in current month
    const effectiveStart = startDate > firstDayOfMonth ? new Date(startDate) : new Date(firstDayOfMonth);
    let currentDate = new Date(effectiveStart);
    
    // If start date is before this month, find first occurrence in this month
    if (startDate < firstDayOfMonth) {
      const daysSinceStart = Math.floor((firstDayOfMonth - startDate) / (1000 * 60 * 60 * 24));
      const weeksSinceStart = Math.floor(daysSinceStart / 7);
      currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + (weeksSinceStart * 7));
      
      // Move to first occurrence in current month
      while (currentDate < firstDayOfMonth) {
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }
    
    // Count occurrences
    while (currentDate <= lastDayOfMonth) {
      occurrences++;
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }
  else if (frequency === 'biweekly') {
    // Count biweekly occurrences in current month
    const effectiveStart = startDate > firstDayOfMonth ? new Date(startDate) : new Date(firstDayOfMonth);
    let currentDate = new Date(effectiveStart);
    
    // If start date is before this month, find first occurrence in this month
    if (startDate < firstDayOfMonth) {
      const daysSinceStart = Math.floor((firstDayOfMonth - startDate) / (1000 * 60 * 60 * 24));
      const biweeksSinceStart = Math.floor(daysSinceStart / 14);
      currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + (biweeksSinceStart * 14));
      
      // Move to first occurrence in current month
      while (currentDate < firstDayOfMonth) {
        currentDate.setDate(currentDate.getDate() + 14);
      }
    }
    
    // Count occurrences
    while (currentDate <= lastDayOfMonth) {
      occurrences++;
      currentDate.setDate(currentDate.getDate() + 14);
    }
  }
  
  return amount * occurrences;
}

// Update summary
function updateSummary() {
  monthlyExpensesEl.textContent = formatCurrency(state.allDataKPI.monthlyExpenses);
  monthlyIncomeEl.textContent = formatCurrency(state.allDataKPI.monthlyIncome);
  activeCountEl.textContent = state.allDataKPI.activeCount;
}

// Show delete confirmation
function showDeleteConfirmation(id) {
  const recurring = state.recurringTransactions.find(r => r.id === id);
  if (!recurring) return;

  deleteRecurringId = id;
  deleteRecurringDescription.textContent = recurring.description;
  deleteRecurringAmount.textContent = `${formatCurrency(recurring.amount)} (${recurring.frequency})`;
  deleteModal.classList.add('show');
}

// Hide delete modal
function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteRecurringId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteRecurringId) return;

  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const result = await firestoreService.delete('recurringTransactions', deleteRecurringId);

    if (result.success) {
      showToast('Recurring transaction deleted successfully!', 'success');
      hideDeleteModal();
      await loadRecurringTransactions();
    } else {
      showToast(result.error || 'Failed to delete recurring transaction', 'error');
    }
  } catch (error) {
    console.error('Error deleting recurring:', error);
    showToast('An error occurred. Please try again.', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}


// Helper functions
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Make functions available globally for onclick handlers
window.editRecurring = (id) => {
  const recurring = state.recurringTransactions.find(r => r.id === id);
  if (recurring) showEditForm(recurring);
};

window.deleteRecurring = (id) => {
  showDeleteConfirmation(id);
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
