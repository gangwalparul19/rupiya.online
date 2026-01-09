// Recurring Transactions Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
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
let recurringTransactions = [];
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

  // Fill form
  document.getElementById('type').value = recurring.type;
  document.getElementById('description').value = recurring.description;
  document.getElementById('amount').value = recurring.amount;
  document.getElementById('category').value = recurring.category;
  document.getElementById('frequency').value = recurring.frequency;
  document.getElementById('startDate').value = formatDateForInput(recurring.startDate);
  document.getElementById('endDate').value = recurring.endDate ? formatDateForInput(recurring.endDate) : '';
  document.getElementById('status').value = recurring.status;
  document.getElementById('paymentMethod').value = recurring.paymentMethod || 'cash';
  document.getElementById('notes').value = recurring.notes || '';

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

  // Get specific payment method if selected
  const specificMethodId = specificPaymentMethodInput?.value;
  const specificMethod = specificMethodId ? userPaymentMethods.find(m => m.id === specificMethodId) : null;

  // Get form data
  const formData = {
    type: document.getElementById('type').value,
    description: document.getElementById('description').value,
    amount: parseFloat(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    frequency: document.getElementById('frequency').value,
    startDate: timezoneService.parseInputDate(document.getElementById('startDate').value),
    endDate: document.getElementById('endDate').value ? timezoneService.parseInputDate(document.getElementById('endDate').value) : null,
    status: document.getElementById('status').value,
    paymentMethod: document.getElementById('paymentMethod')?.value || 'cash',
    paymentMethodId: specificMethodId || null,
    paymentMethodName: specificMethod ? getPaymentMethodDisplayName(specificMethod) : null,
    notes: document.getElementById('notes').value
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
    recurringTransactions = await firestoreService.getAll('recurringTransactions', 'startDate', 'desc');

    if (recurringTransactions.length === 0) {
      loadingState.style.display = 'none';
      emptyState.style.display = 'flex';
      updateSummary();
      return;
    }

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

// Render recurring transactions
function renderRecurringTransactions() {
  recurringList.innerHTML = '';

  recurringTransactions.forEach(recurring => {
    const card = createRecurringCard(recurring);
    recurringList.appendChild(card);
  });
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

// Calculate monthly amount
function calculateMonthlyAmount(recurring) {
  const amount = recurring.amount;
  
  switch (recurring.frequency) {
    case 'daily':
      return amount * 30;
    case 'weekly':
      return amount * 4.33;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

// Update summary
function updateSummary() {
  let monthlyExpenses = 0;
  let monthlyIncome = 0;
  let activeCount = 0;

  recurringTransactions.forEach(recurring => {
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

  monthlyExpensesEl.textContent = formatCurrency(monthlyExpenses);
  monthlyIncomeEl.textContent = formatCurrency(monthlyIncome);
  activeCountEl.textContent = activeCount;
}

// Show delete confirmation
function showDeleteConfirmation(id) {
  const recurring = recurringTransactions.find(r => r.id === id);
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
  const recurring = recurringTransactions.find(r => r.id === id);
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
