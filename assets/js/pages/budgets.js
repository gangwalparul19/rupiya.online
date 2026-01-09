// Budgets Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import themeManager from '../utils/theme-manager.js';
import { Validator } from '../utils/validation.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State management
const state = {
  budgets: [],
  expenses: [],
  editingBudgetId: null
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
    await loadBudgets();
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
const addBudgetBtn = document.getElementById('addBudgetBtn');
const budgetsList = document.getElementById('budgetsList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');

// Summary elements
const totalBudget = document.getElementById('totalBudget');
const totalSpent = document.getElementById('totalSpent');
const totalRemaining = document.getElementById('totalRemaining');

// Form elements (inline)
const addBudgetSection = document.getElementById('addBudgetSection');
const formTitle = document.getElementById('formTitle');
const budgetForm = document.getElementById('budgetForm');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const saveFormBtn = document.getElementById('saveFormBtn');

// Form fields
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const monthInput = document.getElementById('month');
const alertThresholdInput = document.getElementById('alertThreshold');
const notesInput = document.getElementById('notes');

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteCategory = document.getElementById('deleteCategory');
const deleteMonth = document.getElementById('deleteMonth');

let deleteBudgetId = null;

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
    
    // Update subtitle based on context
    updatePageContext();
    
    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthInput.value = currentMonth;
    
    // Initialize categories
    await categoriesService.initializeCategories();
    
    // Load categories into dropdown
    await loadCategoryDropdown();
    
    // Load budgets and expenses
    await loadData();
    
    // Setup event listeners
    setupEventListeners();
  }
}

// Update page context based on family switcher
function updatePageContext() {
  const subtitle = document.getElementById('budgetsSubtitle');
  subtitle.textContent = 'Set spending limits and track your budget';
}

// Load categories into dropdown
async function loadCategoryDropdown() {
  try {
    const categories = await categoriesService.getExpenseCategories();
    
    // Populate category dropdown
    categoryInput.innerHTML = '<option value="">Select category</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Load budgets and expenses
async function loadBudgets() {
  await loadData();
}

// Load budgets and expenses
async function loadData() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    budgetsList.style.display = 'none';
    
    // Load budgets and current month category totals in parallel (optimized)
    const now = new Date();
    const [budgets, categoryTotals, currentMonthExpenses] = await Promise.all([
      firestoreService.getBudgets(),
      firestoreService.getCurrentMonthCategoryTotals(),
      firestoreService.getExpensesByMonth(now.getFullYear(), now.getMonth())
    ]);
    
    state.budgets = budgets;
    state.expenses = currentMonthExpenses; // Only current month expenses needed
    state.categoryTotals = categoryTotals; // Pre-calculated totals
    
    updateSummary();
    renderBudgets();
    
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Failed to load budgets');
    loadingState.style.display = 'none';
  }
}

// Update summary cards
function updateSummary() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter budgets for current month
  const currentBudgets = state.budgets.filter(b => b.month === currentMonth);
  
  // Calculate totals (ensure amounts are numbers)
  const budgetTotal = currentBudgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  
  // Calculate spent for each budget
  let spentTotal = 0;
  currentBudgets.forEach(budget => {
    const spent = calculateSpent(budget);
    spentTotal += spent;
  });
  
  const remaining = budgetTotal - spentTotal;
  
  totalBudget.textContent = formatCurrency(budgetTotal);
  totalSpent.textContent = formatCurrency(spentTotal);
  totalRemaining.textContent = formatCurrency(remaining);
  
  // Color code remaining
  if (remaining < 0) {
    totalRemaining.style.color = 'var(--accent-red)';
  } else if (remaining < budgetTotal * 0.2) {
    totalRemaining.style.color = 'var(--accent-orange)';
  } else {
    totalRemaining.style.color = 'var(--accent-green)';
  }
}

// Calculate spent amount for a budget
function calculateSpent(budget) {
  const [year, month] = budget.month.split('-');
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
  
  const spent = state.expenses
    .filter(e => {
      const expenseDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return e.category === budget.category && 
             expenseDate >= startDate && 
             expenseDate <= endDate;
    })
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  
  return spent;
}

// Render budgets
function renderBudgets() {
  loadingState.style.display = 'none';
  
  if (state.budgets.length === 0) {
    emptyState.style.display = 'flex';
    budgetsList.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  budgetsList.style.display = 'grid';
  
  // Sort budgets by month (descending)
  const sortedBudgets = [...state.budgets].sort((a, b) => b.month.localeCompare(a.month));
  
  // Render budget cards
  budgetsList.innerHTML = sortedBudgets.map(budget => createBudgetCard(budget)).join('');
  
  // Attach event listeners to cards
  attachCardEventListeners();
}

// Create budget card HTML
function createBudgetCard(budget) {
  // Ensure amount and alertThreshold are numbers (may be strings after decryption)
  const budgetAmount = parseFloat(budget.amount) || 0;
  const alertThreshold = parseFloat(budget.alertThreshold) || 80;
  
  const spent = calculateSpent(budget);
  const remaining = budgetAmount - spent;
  const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
  
  // Determine status
  let statusClass = '';
  let progressClass = '';
  let alertHtml = '';
  
  if (percentage >= 100) {
    statusClass = 'over-budget';
    progressClass = 'danger';
    alertHtml = `
      <div class="budget-alert danger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        Budget exceeded!
      </div>
    `;
  } else if (percentage >= alertThreshold) {
    statusClass = 'near-limit';
    progressClass = 'warning';
    alertHtml = `
      <div class="budget-alert warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        ${percentage.toFixed(0)}% of budget used
      </div>
    `;
  }
  
  // Format month for display
  const [year, month] = budget.month.split('-');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return `
    <div class="budget-card ${statusClass}" data-id="${budget.id}">
      <div class="budget-header">
        <div>
          <div class="budget-category">${budget.category}</div>
          <div class="budget-month">${monthName}</div>
        </div>
        <div class="budget-actions">
          <button class="btn-icon btn-edit" data-id="${budget.id}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete" data-id="${budget.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="budget-amounts">
        <div class="budget-amount">
          <div class="budget-amount-label">Budget</div>
          <div class="budget-amount-value">${formatCurrency(budgetAmount)}</div>
        </div>
        <div class="budget-amount">
          <div class="budget-amount-label">Spent</div>
          <div class="budget-amount-value spent">${formatCurrency(spent)}</div>
        </div>
        <div class="budget-amount">
          <div class="budget-amount-label">Remaining</div>
          <div class="budget-amount-value ${remaining < 0 ? 'over' : 'remaining'}">${formatCurrency(Math.abs(remaining))}</div>
        </div>
      </div>
      
      <div class="budget-progress">
        <div class="progress-bar-container">
          <div class="progress-bar ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
        </div>
        <div class="progress-text">
          <span>${formatCurrency(spent)} of ${formatCurrency(budgetAmount)}</span>
          <span class="progress-percentage">${percentage.toFixed(1)}%</span>
        </div>
      </div>
      
      ${alertHtml}
      
      ${budget.notes ? `<div class="budget-notes">${budget.notes}</div>` : ''}
    </div>
  `;
}

// Attach event listeners to budget cards
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
  
  // Logout handled by global logout-handler.js
  
  // Add budget button
  addBudgetBtn.addEventListener('click', openAddForm);
  
  // Form close buttons
  closeFormBtn.addEventListener('click', closeBudgetForm);
  cancelFormBtn.addEventListener('click', closeBudgetForm);
  
  // Form submit
  budgetForm.addEventListener('submit', handleFormSubmit);
  
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

// Open add form
function openAddForm() {
  state.editingBudgetId = null;
  formTitle.textContent = 'Add Budget';
  saveFormBtn.textContent = 'Save Budget';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Reset form
  budgetForm.reset();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthInput.value = currentMonth;
  alertThresholdInput.value = 80;
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addBudgetSection.classList.add('show');
  addBudgetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Open edit form
function openEditForm(id) {
  const budget = state.budgets.find(b => b.id === id);
  if (!budget) return;
  
  state.editingBudgetId = id;
  formTitle.textContent = 'Edit Budget';
  saveFormBtn.textContent = 'Update Budget';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Populate form
  categoryInput.value = budget.category;
  amountInput.value = budget.amount;
  monthInput.value = budget.month;
  alertThresholdInput.value = budget.alertThreshold;
  notesInput.value = budget.notes || '';
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addBudgetSection.classList.add('show');
  addBudgetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Close budget form
function closeBudgetForm() {
  addBudgetSection.classList.remove('show');
  budgetForm.reset();
  clearFormErrors();
  state.editingBudgetId = null;
}

// Clear form errors
function clearFormErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
}

// Validate form
function validateBudgetForm() {
  clearFormErrors();
  
  const validator = new Validator();
  let isValid = true;
  
  // Category validation
  if (!categoryInput.value) {
    document.getElementById('categoryError').textContent = 'Please select a category';
    isValid = false;
  }
  
  // Amount validation
  const amount = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amount) || amount <= 0) {
    document.getElementById('amountError').textContent = 'Please enter a valid amount greater than 0';
    isValid = false;
  }
  
  // Month validation
  if (!monthInput.value) {
    document.getElementById('monthError').textContent = 'Please select a month';
    isValid = false;
  }
  
  // Alert threshold validation
  const threshold = parseFloat(alertThresholdInput.value);
  if (!alertThresholdInput.value || isNaN(threshold) || threshold < 0 || threshold > 100) {
    document.getElementById('alertThresholdError').textContent = 'Please enter a value between 0 and 100';
    isValid = false;
  }
  
  return isValid;
}

// Handle form submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateBudgetForm()) {
    return;
  }
  
  // Show loading state
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';
  
  try {
    const budgetData = {
      category: categoryInput.value,
      amount: parseFloat(amountInput.value),
      month: monthInput.value,
      alertThreshold: parseFloat(alertThresholdInput.value),
      notes: notesInput.value.trim()
    };
    
    let result;
    
    if (state.editingBudgetId) {
      // Update existing budget
      result = await firestoreService.updateBudget(state.editingBudgetId, budgetData);
      
      if (result.success) {
        toast.success('Budget updated successfully');
      }
    } else {
      // Add new budget
      result = await firestoreService.addBudget(budgetData);
      
      if (result.success) {
        toast.success('Budget added successfully');
      }
    }
    
    if (result.success) {
      closeBudgetForm();
      await loadData();
    } else {
      toast.error(result.error || 'Failed to save budget');
    }
    
  } catch (error) {
    console.error('Error saving budget:', error);
    toast.error('Failed to save budget');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

// Open delete modal
function openDeleteModal(id) {
  const budget = state.budgets.find(b => b.id === id);
  if (!budget) return;
  
  deleteBudgetId = id;
  deleteCategory.textContent = budget.category;
  
  const [year, month] = budget.month.split('-');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  deleteMonth.textContent = monthName;
  
  deleteModal.classList.add('show');
}

// Close delete modal
function closeDeleteConfirmModal() {
  deleteModal.classList.remove('show');
  deleteBudgetId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteBudgetId) return;
  
  // Show loading state
  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';
  
  try {
    const result = await firestoreService.deleteBudget(deleteBudgetId);
    
    if (result.success) {
      toast.success('Budget deleted successfully');
      closeDeleteConfirmModal();
      await loadData();
    } else {
      toast.error(result.error || 'Failed to delete budget');
    }
    
  } catch (error) {
    console.error('Error deleting budget:', error);
    toast.error('Failed to delete budget');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}
