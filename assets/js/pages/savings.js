// Savings Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import { formatCurrency, formatCurrencyCompact, formatDate, formatDateForInput, escapeHtml } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';

// State management
const state = {
  savings: [],
  filteredSavings: [],
  goals: [],
  currentPage: 1,
  itemsPerPage: 10,
  editingSavingId: null,
  totalCount: 0,
  allDataKPI: {
    monthlyCommitment: 0,
    totalSaved: 0,
    activeSavings: 0,
    expectedMaturity: 0
  }
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
  
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadSavings();
  });
  
  await initPage();
}

// Start initialization
init();

// DOM elements (will be initialized after page loads)
let addSavingBtn, addSavingSection, closeFormBtn, cancelFormBtn, savingForm, formTitle, saveFormBtn;
let savingsList, emptyState, loadingState;
let monthlySavingsValue, totalSavedValue, activeSavingsValue, maturityValue;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn, deleteSavingName, deleteSavingType;
let deleteSavingId = null;

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Initialize DOM elements after page is loaded
    addSavingBtn = document.getElementById('addSavingBtn');
    addSavingSection = document.getElementById('addSavingSection');
    closeFormBtn = document.getElementById('closeFormBtn');
    cancelFormBtn = document.getElementById('cancelFormBtn');
    savingForm = document.getElementById('savingForm');
    formTitle = document.getElementById('formTitle');
    saveFormBtn = document.getElementById('saveFormBtn');
    savingsList = document.getElementById('savingsList');
    emptyState = document.getElementById('emptyState');
    loadingState = document.getElementById('loadingState');
    
    // KPI elements
    monthlySavingsValue = document.getElementById('monthlySavingsValue');
    totalSavedValue = document.getElementById('totalSavedValue');
    activeSavingsValue = document.getElementById('activeSavingsValue');
    maturityValue = document.getElementById('maturityValue');
    
    // Delete modal
    deleteModal = document.getElementById('deleteModal');
    closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
    cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    deleteSavingName = document.getElementById('deleteSavingName');
    deleteSavingType = document.getElementById('deleteSavingType');
    
    loadUserProfile(user);
    
    // Load goals for linking
    await loadGoals();
    
    // Set default start date to today
    document.getElementById('startDate').value = formatDateForInput(new Date());
    
    await loadSavings();
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

// Load goals for linking
async function loadGoals() {
  try {
    state.goals = await firestoreService.getGoals();
    const linkedGoalSelect = document.getElementById('linkedGoal');
    
    if (linkedGoalSelect && state.goals.length > 0) {
      linkedGoalSelect.innerHTML = '<option value="">No goal linked</option>' +
        state.goals.map(goal => `<option value="${goal.id}">${escapeHtml(goal.name)}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading goals:', error);
  }
}

// Load savings
async function loadSavings() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    savingsList.style.display = 'none';
    
    state.savings = await firestoreService.getSavings();
    state.filteredSavings = [...state.savings];
    state.totalCount = state.savings.length;
    
    calculateKPISummary();
    updateKPIs();
    
    state.currentPage = 1;
    renderSavings();
    
  } catch (error) {
    console.error('Error loading savings:', error);
    toast.error('Failed to load savings');
    loadingState.style.display = 'none';
  }
}

// Calculate KPI summary
function calculateKPISummary() {
  let monthlyCommitment = 0;
  let totalSaved = 0;
  let activeSavings = 0;
  let expectedMaturity = 0;
  
  state.savings.forEach(saving => {
    const amount = parseFloat(saving.amount) || 0;
    const currentValue = parseFloat(saving.currentValue) || 0;
    const isActive = saving.status === 'active';
    
    if (isActive && saving.autoDeduct) {
      // Calculate monthly equivalent
      if (saving.frequency === 'monthly') {
        monthlyCommitment += amount;
      } else if (saving.frequency === 'quarterly') {
        monthlyCommitment += amount / 3;
      } else if (saving.frequency === 'yearly') {
        monthlyCommitment += amount / 12;
      }
    }
    
    totalSaved += currentValue;
    
    if (isActive) {
      activeSavings++;
    }
    
    // Calculate expected maturity value
    if (saving.maturityDate && saving.interestRate) {
      const maturityVal = calculateMaturityValue(saving);
      expectedMaturity += maturityVal;
    } else {
      expectedMaturity += currentValue;
    }
  });
  
  state.allDataKPI = {
    monthlyCommitment,
    totalSaved,
    activeSavings,
    expectedMaturity
  };
}

// Calculate maturity value with compound interest
function calculateMaturityValue(saving) {
  const principal = parseFloat(saving.currentValue) || 0;
  const rate = parseFloat(saving.interestRate) || 0;
  const amount = parseFloat(saving.amount) || 0;
  
  if (!saving.maturityDate || rate === 0) {
    return principal;
  }
  
  const startDate = saving.startDate?.toDate ? saving.startDate.toDate() : new Date(saving.startDate);
  const maturityDate = saving.maturityDate?.toDate ? saving.maturityDate.toDate() : new Date(saving.maturityDate);
  const years = (maturityDate - startDate) / (1000 * 60 * 60 * 24 * 365);
  
  if (years <= 0) return principal;
  
  // For recurring savings (SIP, RD), use future value of annuity formula
  if (saving.frequency !== 'one-time' && amount > 0) {
    const monthlyRate = rate / 12 / 100;
    const months = years * 12;
    const futureValue = amount * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    return futureValue;
  }
  
  // For one-time deposits (FD), use compound interest
  const maturityValue = principal * Math.pow(1 + rate / 100, years);
  return maturityValue;
}

// Update KPIs
function updateKPIs() {
  monthlySavingsValue.textContent = formatCurrencyCompact(state.allDataKPI.monthlyCommitment);
  totalSavedValue.textContent = formatCurrencyCompact(state.allDataKPI.totalSaved);
  activeSavingsValue.textContent = state.allDataKPI.activeSavings;
  maturityValue.textContent = formatCurrencyCompact(state.allDataKPI.expectedMaturity);
}

// Render savings
function renderSavings() {
  loadingState.style.display = 'none';
  
  if (state.filteredSavings.length === 0) {
    emptyState.style.display = 'flex';
    savingsList.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  savingsList.style.display = 'grid';
  
  // Sort by start date (newest first)
  const sortedSavings = [...state.filteredSavings].sort((a, b) => {
    const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
    const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
    return dateB - dateA;
  });
  
  // Pagination
  const totalRecords = sortedSavings.length;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageSavings = sortedSavings.slice(startIndex, endIndex);
  
  savingsList.innerHTML = pageSavings.map(saving => createSavingCard(saving)).join('');
  renderPagination(totalPages);
  attachCardEventListeners();
}

// Create saving card HTML
function createSavingCard(saving) {
  const amount = parseFloat(saving.amount) || 0;
  const currentValue = parseFloat(saving.currentValue) || 0;
  const interestRate = parseFloat(saving.interestRate) || 0;
  const isActive = saving.status === 'active';
  const statusClass = isActive ? 'active' : 'inactive';
  
  const startDate = saving.startDate?.toDate ? saving.startDate.toDate() : new Date(saving.startDate);
  const maturityDate = saving.maturityDate?.toDate ? saving.maturityDate.toDate() : new Date(saving.maturityDate);
  
  // Calculate progress
  let progress = 0;
  let progressLabel = '';
  
  if (saving.maturityDate) {
    const now = new Date();
    const totalDuration = maturityDate - startDate;
    const elapsed = now - startDate;
    progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    progressLabel = 'Time Progress';
  } else {
    progressLabel = 'Current Value';
  }
  
  // Calculate expected maturity
  const expectedMaturity = calculateMaturityValue(saving);
  const returns = expectedMaturity - currentValue;
  
  // Check if maturing soon
  let maturityAlert = '';
  if (saving.maturityDate && isActive) {
    const daysToMaturity = Math.ceil((maturityDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysToMaturity <= 30 && daysToMaturity > 0) {
      maturityAlert = `
        <div class="maturity-alert upcoming">
          ⏰ Maturing in ${daysToMaturity} days
        </div>
      `;
    } else if (daysToMaturity <= 0) {
      maturityAlert = `
        <div class="maturity-alert">
          🎯 Matured! Time to reinvest or withdraw
        </div>
      `;
    }
  }
  
  // Linked goal badge
  let linkedGoalBadge = '';
  if (saving.linkedGoalId) {
    const goal = state.goals.find(g => g.id === saving.linkedGoalId);
    if (goal) {
      linkedGoalBadge = `<span class="linked-goal-badge">🎯 ${escapeHtml(goal.name)}</span>`;
    }
  }
  
  return `
    <div class="saving-card ${statusClass}">
      <div class="saving-card-header">
        <div class="saving-info">
          <span class="saving-type-badge">${escapeHtml(saving.savingType)}</span>
          <div class="saving-name">${escapeHtml(saving.name)}</div>
          <div class="saving-frequency">${formatFrequency(saving.frequency)}</div>
        </div>
        <div class="saving-actions">
          <button type="button" class="btn-icon" onclick="window.editSaving('${saving.id}')" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button type="button" class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${saving.id}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="saving-card-body">
        <div class="saving-stats-row">
          <div class="saving-stat">
            <div class="saving-stat-label">Amount</div>
            <div class="saving-stat-value">${formatCurrency(amount)}</div>
          </div>
          <div class="saving-stat">
            <div class="saving-stat-label">Current Value</div>
            <div class="saving-stat-value">${formatCurrency(currentValue)}</div>
          </div>
        </div>

        ${saving.maturityDate ? `
          <div class="saving-stats-row">
            <div class="saving-stat">
              <div class="saving-stat-label">Expected Maturity</div>
              <div class="saving-stat-value positive">${formatCurrency(expectedMaturity)}</div>
            </div>
            <div class="saving-stat">
              <div class="saving-stat-label">Expected Returns</div>
              <div class="saving-stat-value ${returns >= 0 ? 'positive' : 'negative'}">
                ${returns >= 0 ? '+' : ''}${formatCurrency(returns)}
              </div>
            </div>
          </div>
        ` : ''}

        ${saving.maturityDate ? `
          <div class="saving-progress">
            <div class="saving-progress-header">
              <span class="saving-progress-label">${progressLabel}</span>
              <span class="saving-progress-percent">${progress.toFixed(0)}%</span>
            </div>
            <div class="saving-progress-bar">
              <div class="saving-progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        ` : ''}

        ${interestRate > 0 ? `
          <div class="interest-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span>Interest Rate: ${interestRate}% p.a.</span>
          </div>
        ` : ''}

        ${maturityAlert}

        ${saving.autoDeduct ? '<span class="auto-deduct-badge">🔄 Auto-deduct</span>' : ''}
        ${linkedGoalBadge}
      </div>

      <div class="saving-card-footer">
        <div class="saving-dates">
          <div>Started: ${formatDate(startDate)}</div>
          ${saving.maturityDate ? `<div>Matures: ${formatDate(maturityDate)}</div>` : ''}
        </div>
        <span class="saving-status ${statusClass}">
          ${isActive ? '✅ Active' : '⏸️ Inactive'}
        </span>
      </div>

      ${saving.notes ? `
        <div class="saving-notes">
          ${escapeHtml(saving.notes)}
        </div>
      ` : ''}
    </div>
  `;
}

// Format frequency
function formatFrequency(frequency) {
  const map = {
    'monthly': 'Monthly',
    'quarterly': 'Quarterly',
    'yearly': 'Yearly',
    'one-time': 'One-time'
  };
  return map[frequency] || frequency;
}

// Setup event listeners
function setupEventListeners() {
  if (addSavingBtn) {
    addSavingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Add Saving button clicked');
      showAddForm();
    });
  }
  
  if (closeFormBtn) {
    closeFormBtn.addEventListener('click', hideForm);
  }
  
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', hideForm);
  }
  
  if (savingForm) {
    savingForm.addEventListener('submit', handleSubmit);
  }
  
  if (closeDeleteModalBtn) {
    closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  }
  
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  }
  
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleDelete);
  }
  
  // Pagination
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
      const totalPages = Math.ceil(state.filteredSavings.length / state.itemsPerPage);
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
  }
}

// Show add form
function showAddForm() {
  console.log('showAddForm called');
  console.log('addSavingSection:', addSavingSection);
  
  if (!addSavingSection) {
    console.error('addSavingSection element not found');
    return;
  }
  
  state.editingSavingId = null;
  formTitle.textContent = 'Add Saving';
  saveFormBtn.textContent = 'Save Saving';
  savingForm.reset();
  document.getElementById('startDate').value = formatDateForInput(new Date());
  document.getElementById('autoDeduct').checked = true;
  
  // Remove display: none and add show class
  addSavingSection.style.display = 'block';
  addSavingSection.classList.add('show');
  
  console.log('Form should be visible now');
  
  // Scroll to form
  setTimeout(() => {
    addSavingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Hide form
function hideForm() {
  if (!addSavingSection) return;
  
  addSavingSection.classList.remove('show');
  addSavingSection.style.display = 'none';
  savingForm.reset();
  state.editingSavingId = null;
}

// Show edit form
function showEditForm(saving) {
  if (!addSavingSection) return;
  
  state.editingSavingId = saving.id;
  formTitle.textContent = 'Edit Saving';
  saveFormBtn.textContent = 'Update Saving';
  
  document.getElementById('savingType').value = saving.savingType;
  document.getElementById('savingName').value = saving.name;
  document.getElementById('amount').value = saving.amount;
  document.getElementById('frequency').value = saving.frequency;
  document.getElementById('startDate').value = formatDateForInput(saving.startDate);
  document.getElementById('maturityDate').value = saving.maturityDate ? formatDateForInput(saving.maturityDate) : '';
  document.getElementById('interestRate').value = saving.interestRate || '';
  document.getElementById('currentValue').value = saving.currentValue || '';
  document.getElementById('autoDeduct').checked = saving.autoDeduct !== false;
  document.getElementById('linkedGoal').value = saving.linkedGoalId || '';
  document.getElementById('notes').value = saving.notes || '';
  
  addSavingSection.style.display = 'block';
  addSavingSection.classList.add('show');
  
  setTimeout(() => {
    addSavingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();
  
  const formData = {
    savingType: document.getElementById('savingType').value,
    name: document.getElementById('savingName').value.trim(),
    amount: parseFloat(document.getElementById('amount').value),
    frequency: document.getElementById('frequency').value,
    startDate: timezoneService.parseInputDate(document.getElementById('startDate').value),
    maturityDate: document.getElementById('maturityDate').value ? 
      timezoneService.parseInputDate(document.getElementById('maturityDate').value) : null,
    interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
    currentValue: parseFloat(document.getElementById('currentValue').value) || 0,
    autoDeduct: document.getElementById('autoDeduct').checked,
    linkedGoalId: document.getElementById('linkedGoal').value || null,
    notes: document.getElementById('notes').value.trim(),
    status: 'active'
  };
  
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';
  
  try {
    let result;
    if (state.editingSavingId) {
      result = await firestoreService.updateSaving(state.editingSavingId, formData);
      if (result.success) {
        toast.success('Saving updated successfully');
      }
    } else {
      result = await firestoreService.addSaving(formData);
      if (result.success) {
        toast.success('Saving added successfully');
      }
    }
    
    if (result.success) {
      hideForm();
      await loadSavings();
    } else {
      toast.error(result.error || 'Failed to save');
    }
  } catch (error) {
    console.error('Error saving:', error);
    toast.error('Failed to save');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = state.editingSavingId ? 'Update Saving' : 'Save Saving';
  }
}

// Show delete confirmation
function showDeleteConfirmation(savingId) {
  const saving = state.savings.find(s => s.id === savingId);
  if (!saving) return;
  
  deleteSavingId = savingId;
  deleteSavingName.textContent = saving.name;
  deleteSavingType.textContent = saving.savingType;
  deleteModal.classList.add('show');
}

// Hide delete modal
function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteSavingId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteSavingId) return;
  
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';
  
  try {
    const result = await firestoreService.deleteSaving(deleteSavingId);
    if (result.success) {
      toast.success('Saving deleted successfully');
      hideDeleteModal();
      await loadSavings();
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  } catch (error) {
    console.error('Error deleting:', error);
    toast.error('Failed to delete');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete';
  }
}

// Render pagination
function renderPagination(totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationNumbers = document.getElementById('paginationNumbers');
  
  if (!paginationContainer || !paginationNumbers) return;
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  
  paginationNumbers.innerHTML = pageNumbers.map(page => {
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

// Go to page
function goToPage(page) {
  state.currentPage = page;
  renderSavings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attach card event listeners
function attachCardEventListeners() {
  // Event listeners are handled via onclick attributes in HTML
}

// Global functions for onclick handlers
window.editSaving = (savingId) => {
  const saving = state.savings.find(s => s.id === savingId);
  if (saving) showEditForm(saving);
};

window.showDeleteConfirmation = showDeleteConfirmation;
