// Investments Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let investments = [];
let editingInvestmentId = null;

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
  document.getElementById('quantity').value = investment.quantity;
  document.getElementById('purchasePrice').value = investment.purchasePrice;
  document.getElementById('currentPrice').value = investment.currentPrice;
  document.getElementById('purchaseDate').value = formatDateForInput(investment.purchaseDate);
  document.getElementById('notes').value = investment.notes || '';

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
    quantity: parseFloat(document.getElementById('quantity').value),
    purchasePrice: parseFloat(document.getElementById('purchasePrice').value),
    currentPrice: parseFloat(document.getElementById('currentPrice').value),
    purchaseDate: new Date(document.getElementById('purchaseDate').value),
    notes: document.getElementById('notes').value.trim()
  };

  // Show loading
  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

  try {
    let result;
    if (editingInvestmentId) {
      // Update existing investment
      result = await firestoreService.updateInvestment(editingInvestmentId, formData);
      if (result.success) {
        showToast('Investment updated successfully', 'success');
      }
    } else {
      // Add new investment
      result = await firestoreService.addInvestment(formData);
      if (result.success) {
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
      renderInvestments();
      investmentsList.style.display = 'grid';
    }

    updateSummary();
  } catch (error) {
    console.error('Error loading investments:', error);
    showToast('Failed to load investments', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Render investments
function renderInvestments() {
  investmentsList.innerHTML = investments.map(investment => {
    const totalInvested = investment.quantity * investment.purchasePrice;
    const currentValue = investment.quantity * investment.currentPrice;
    const returns = currentValue - totalInvested;
    const returnsPercentage = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(2) : 0;
    const returnsClass = returns >= 0 ? 'positive' : 'negative';
    const returnsSign = returns >= 0 ? '+' : '';

    return `
      <div class="investment-card">
        <div class="investment-card-header">
          <div class="investment-info">
            <div class="investment-name">${investment.name}</div>
            <span class="investment-type">${investment.type}</span>
          </div>
          <div class="investment-actions">
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
          <div class="investment-stat">
            <div class="investment-stat-label">Quantity</div>
            <div class="investment-stat-value">${investment.quantity}</div>
          </div>
          <div class="investment-stat">
            <div class="investment-stat-label">Purchase Price</div>
            <div class="investment-stat-value">${formatCurrency(investment.purchasePrice)}</div>
          </div>
          <div class="investment-stat">
            <div class="investment-stat-label">Current Price</div>
            <div class="investment-stat-value">${formatCurrency(investment.currentPrice)}</div>
          </div>
          <div class="investment-stat">
            <div class="investment-stat-label">Total Invested</div>
            <div class="investment-stat-value">${formatCurrency(totalInvested)}</div>
          </div>
          <div class="investment-stat">
            <div class="investment-stat-label">Current Value</div>
            <div class="investment-stat-value">${formatCurrency(currentValue)}</div>
          </div>
        </div>

        <div class="investment-card-footer">
          <div class="investment-returns">
            <div class="investment-returns-label">Returns</div>
            <div class="investment-returns-value ${returnsClass}">
              ${returnsSign}${formatCurrency(Math.abs(returns))} (${returnsSign}${returnsPercentage}%)
            </div>
          </div>
          <div class="investment-date">
            Purchased: ${formatDate(investment.purchaseDate)}
          </div>
        </div>

        ${investment.notes ? `
          <div class="investment-notes">
            ${investment.notes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Update summary
function updateSummary() {
  let totalInvested = 0;
  let currentValue = 0;

  investments.forEach(investment => {
    totalInvested += investment.quantity * investment.purchasePrice;
    currentValue += investment.quantity * investment.currentPrice;
  });

  const totalReturns = currentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;
  const returnsClass = totalReturns >= 0 ? 'positive' : 'negative';
  const returnsSign = totalReturns >= 0 ? '+' : '';

  totalInvestedEl.textContent = formatCurrency(totalInvested);
  currentValueEl.textContent = formatCurrency(currentValue);
  totalReturnsEl.textContent = `${returnsSign}${formatCurrency(Math.abs(totalReturns))}`;
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

// Format date for input
function formatDateForInput(date) {
  if (!date) return '';
  
  let d;
  if (date.toDate) {
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Expose functions to window for onclick handlers
window.editInvestment = editInvestment;
window.showDeleteConfirmation = showDeleteConfirmation;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
