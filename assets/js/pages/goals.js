// Goals Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import themeManager from '../utils/theme-manager.js';
import { Validator } from '../utils/validation.js';
import { formatCurrency, formatDate, formatDateForInput } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State management
const state = {
  goals: [],
  editingGoalId: null,
  contributingGoalId: null
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
    await loadGoals();
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
const addGoalBtn = document.getElementById('addGoalBtn');
const goalsList = document.getElementById('goalsList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');

// Summary elements
const activeGoals = document.getElementById('activeGoals');
const totalTarget = document.getElementById('totalTarget');
const totalSaved = document.getElementById('totalSaved');

// Form elements (inline)
const addGoalSection = document.getElementById('addGoalSection');
const formTitle = document.getElementById('formTitle');
const goalForm = document.getElementById('goalForm');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const saveFormBtn = document.getElementById('saveFormBtn');

// Form fields
const nameInput = document.getElementById('name');
const targetAmountInput = document.getElementById('targetAmount');
const currentAmountInput = document.getElementById('currentAmount');
const targetDateInput = document.getElementById('targetDate');
const descriptionInput = document.getElementById('description');

// Contribution modal elements
const contributionModal = document.getElementById('contributionModal');
const closeContributionModalBtn = document.getElementById('closeContributionModalBtn');
const cancelContributionBtn = document.getElementById('cancelContributionBtn');
const contributionForm = document.getElementById('contributionForm');
const saveContributionBtn = document.getElementById('saveContributionBtn');
const contributionGoalName = document.getElementById('contributionGoalName');
const contributionGoalProgress = document.getElementById('contributionGoalProgress');
const contributionAmountInput = document.getElementById('contributionAmount');
const contributionDateInput = document.getElementById('contributionDate');
const contributionNoteInput = document.getElementById('contributionNote');

// Delete modal elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteGoalName = document.getElementById('deleteGoalName');
const deleteGoalTarget = document.getElementById('deleteGoalTarget');

let deleteGoalId = null;

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
    
    // Set default target date to 1 year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    targetDateInput.value = formatDateForInput(oneYearFromNow);
    
    // Set contribution date to today
    contributionDateInput.value = formatDateForInput(new Date());
    
    // Load goals
    await loadGoals();
    
    // Setup event listeners
    setupEventListeners();
  }
}

// Update page context based on family switcher
function updatePageContext() {
  const context = familySwitcher.getCurrentContext();
  const subtitle = document.getElementById('goalsSubtitle');
  
  if (subtitle && context.context === 'family' && context.group) {
    subtitle.textContent = `Tracking goals for ${context.group.name}`;
  } else if (subtitle) {
    subtitle.textContent = 'Set and track your financial goals';
  }
}

// Load goals
async function loadGoals() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    goalsList.style.display = 'none';
    
    state.goals = await firestoreService.getGoals();
    
    updateSummary();
    renderGoals();
    
  } catch (error) {
    console.error('Error loading goals:', error);
    toast.error('Failed to load goals');
    loadingState.style.display = 'none';
  }
}

// Update summary cards
function updateSummary() {
  const active = state.goals.filter(g => g.currentAmount < g.targetAmount).length;
  const target = state.goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const saved = state.goals.reduce((sum, g) => sum + g.currentAmount, 0);
  
  activeGoals.textContent = active;
  totalTarget.textContent = formatCurrency(target);
  totalSaved.textContent = formatCurrency(saved);
}

// Calculate days remaining
function calculateDaysRemaining(targetDate) {
  const target = targetDate.toDate ? targetDate.toDate() : new Date(targetDate);
  const today = new Date();
  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Render goals
function renderGoals() {
  loadingState.style.display = 'none';
  
  if (state.goals.length === 0) {
    emptyState.style.display = 'flex';
    goalsList.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  goalsList.style.display = 'grid';
  
  // Sort goals by target date (ascending)
  const sortedGoals = [...state.goals].sort((a, b) => {
    const dateA = a.targetDate.toDate ? a.targetDate.toDate() : new Date(a.targetDate);
    const dateB = b.targetDate.toDate ? b.targetDate.toDate() : new Date(b.targetDate);
    return dateA - dateB;
  });
  
  // Render goal cards
  goalsList.innerHTML = sortedGoals.map(goal => createGoalCard(goal)).join('');
  
  // Attach event listeners to cards
  attachCardEventListeners();
}

// Create goal card HTML
function createGoalCard(goal) {
  const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const daysRemaining = calculateDaysRemaining(goal.targetDate);
  
  const targetDate = goal.targetDate.toDate ? goal.targetDate.toDate() : new Date(goal.targetDate);
  const targetDateStr = formatDate(targetDate);
  
  let statusHtml = '';
  let daysHtml = '';
  
  if (isCompleted) {
    statusHtml = `
      <div class="goal-status completed">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Goal Achieved!
      </div>
    `;
  } else {
    statusHtml = `
      <div class="goal-status active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        In Progress
      </div>
    `;
    
    if (daysRemaining > 0) {
      const urgentClass = daysRemaining <= 30 ? 'urgent' : '';
      daysHtml = `
        <div class="days-remaining ${urgentClass}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${daysRemaining} days remaining
        </div>
      `;
    } else if (daysRemaining === 0) {
      daysHtml = `
        <div class="days-remaining urgent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Target date is today!
        </div>
      `;
    } else {
      daysHtml = `
        <div class="days-remaining urgent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          Target date passed!
        </div>
      `;
    }
  }
  
  return `
    <div class="goal-card ${isCompleted ? 'completed' : ''}" data-id="${goal.id}">
      <div class="goal-header">
        <div>
          <div class="goal-name">${goal.name}</div>
          <div class="goal-target-date">Target: ${targetDateStr}</div>
          ${daysHtml}
        </div>
        <div class="goal-actions">
          ${!isCompleted ? `
            <button class="btn-icon btn-contribute" data-id="${goal.id}" title="Add Contribution">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          ` : ''}
          <button class="btn-icon btn-edit" data-id="${goal.id}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete" data-id="${goal.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
      
      ${statusHtml}
      
      <div class="goal-amounts">
        <div class="goal-amount">
          <div class="goal-amount-label">Current</div>
          <div class="goal-amount-value current">${formatCurrency(goal.currentAmount)}</div>
        </div>
        <div class="goal-amount">
          <div class="goal-amount-label">Target</div>
          <div class="goal-amount-value target">${formatCurrency(goal.targetAmount)}</div>
        </div>
        <div class="goal-amount">
          <div class="goal-amount-label">Remaining</div>
          <div class="goal-amount-value remaining">${formatCurrency(Math.max(0, remaining))}</div>
        </div>
      </div>
      
      <div class="goal-progress">
        <div class="progress-bar-container">
          <div class="progress-bar ${isCompleted ? 'completed' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
        </div>
        <div class="progress-text">
          <span>${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)}</span>
          <span class="progress-percentage ${isCompleted ? 'completed' : ''}">${percentage.toFixed(1)}%</span>
        </div>
      </div>
      
      ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}
    </div>
  `;
}

// Attach event listeners to goal cards
function attachCardEventListeners() {
  // Contribute buttons
  document.querySelectorAll('.btn-contribute').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openContributionModal(id);
    });
  });
  
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
  
  // Logout
  logoutBtn.addEventListener('click', async () => {
    const confirmed = await confirmationModal.show({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      type: 'warning',
      icon: '👋'
    });
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
  
  // Add goal button
  addGoalBtn.addEventListener('click', openAddForm);
  
  // Form close buttons
  closeFormBtn.addEventListener('click', closeGoalForm);
  cancelFormBtn.addEventListener('click', closeGoalForm);
  
  // Form submit
  goalForm.addEventListener('submit', handleFormSubmit);
  
  // Contribution modal
  closeContributionModalBtn.addEventListener('click', closeContributionModalFunc);
  cancelContributionBtn.addEventListener('click', closeContributionModalFunc);
  contributionForm.addEventListener('submit', handleContributionSubmit);
  
  // Delete modal
  closeDeleteModalBtn.addEventListener('click', closeDeleteConfirmModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);
  
  // Close modals on overlay click
  contributionModal.addEventListener('click', (e) => {
    if (e.target === contributionModal) {
      closeContributionModalFunc();
    }
  });
  
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteConfirmModal();
    }
  });
}

// Open add form
function openAddForm() {
  state.editingGoalId = null;
  formTitle.textContent = 'Add Goal';
  saveFormBtn.textContent = 'Save Goal';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Reset form
  goalForm.reset();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  targetDateInput.value = formatDateForInput(oneYearFromNow);
  currentAmountInput.value = 0;
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addGoalSection.classList.add('show');
  addGoalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Open edit form
function openEditForm(id) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  
  state.editingGoalId = id;
  formTitle.textContent = 'Edit Goal';
  saveFormBtn.textContent = 'Update Goal';
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Populate form
  nameInput.value = goal.name;
  targetAmountInput.value = goal.targetAmount;
  currentAmountInput.value = goal.currentAmount;
  const date = goal.targetDate.toDate ? goal.targetDate.toDate() : new Date(goal.targetDate);
  targetDateInput.value = formatDateForInput(date);
  descriptionInput.value = goal.description || '';
  
  // Clear errors
  clearFormErrors();
  
  // Show form and scroll to it
  addGoalSection.classList.add('show');
  addGoalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Close goal form
function closeGoalForm() {
  addGoalSection.classList.remove('show');
  goalForm.reset();
  clearFormErrors();
  state.editingGoalId = null;
}

// Clear form errors
function clearFormErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
  });
}

// Validate form
function validateGoalForm() {
  clearFormErrors();
  
  let isValid = true;
  
  // Name validation
  if (!nameInput.value.trim()) {
    document.getElementById('nameError').textContent = 'Please enter a goal name';
    isValid = false;
  }
  
  // Target amount validation
  const targetAmount = parseFloat(targetAmountInput.value);
  if (!targetAmountInput.value || isNaN(targetAmount) || targetAmount <= 0) {
    document.getElementById('targetAmountError').textContent = 'Please enter a valid target amount greater than 0';
    isValid = false;
  }
  
  // Current amount validation
  const currentAmount = parseFloat(currentAmountInput.value);
  if (currentAmountInput.value === '' || isNaN(currentAmount) || currentAmount < 0) {
    document.getElementById('currentAmountError').textContent = 'Please enter a valid current amount';
    isValid = false;
  }
  
  // Check current <= target
  if (currentAmount > targetAmount) {
    document.getElementById('currentAmountError').textContent = 'Current amount cannot exceed target amount';
    isValid = false;
  }
  
  // Target date validation
  if (!targetDateInput.value) {
    document.getElementById('targetDateError').textContent = 'Please select a target date';
    isValid = false;
  } else {
    const selectedDate = new Date(targetDateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      document.getElementById('targetDateError').textContent = 'Target date must be in the future';
      isValid = false;
    }
  }
  
  return isValid;
}

// Handle form submit
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateGoalForm()) {
    return;
  }
  
  // Show loading state
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';
  
  try {
    const goalData = {
      name: nameInput.value.trim(),
      targetAmount: parseFloat(targetAmountInput.value),
      currentAmount: parseFloat(currentAmountInput.value),
      targetDate: new Date(targetDateInput.value),
      description: descriptionInput.value.trim()
    };
    
    let result;
    
    if (state.editingGoalId) {
      // Update existing goal
      result = await firestoreService.updateGoal(state.editingGoalId, goalData);
      
      if (result.success) {
        toast.success('Goal updated successfully');
      }
    } else {
      // Add new goal
      result = await firestoreService.addGoal(goalData);
      
      if (result.success) {
        toast.success('Goal added successfully');
      }
    }
    
    if (result.success) {
      closeGoalForm();
      await loadGoals();
    } else {
      toast.error(result.error || 'Failed to save goal');
    }
    
  } catch (error) {
    console.error('Error saving goal:', error);
    toast.error('Failed to save goal');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

// Open contribution modal
function openContributionModal(id) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  
  state.contributingGoalId = id;
  
  const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  
  contributionGoalName.textContent = goal.name;
  contributionGoalProgress.textContent = `${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)} (${percentage.toFixed(1)}%)`;
  
  contributionForm.reset();
  contributionDateInput.value = formatDateForInput(new Date());
  
  contributionModal.classList.add('show');
}

// Close contribution modal
function closeContributionModalFunc() {
  contributionModal.classList.remove('show');
  contributionForm.reset();
  state.contributingGoalId = null;
  document.getElementById('contributionAmountError').textContent = '';
  document.getElementById('contributionDateError').textContent = '';
}

// Handle contribution submit
async function handleContributionSubmit(e) {
  e.preventDefault();
  
  const amount = parseFloat(contributionAmountInput.value);
  
  // Validate
  if (!contributionAmountInput.value || isNaN(amount) || amount <= 0) {
    document.getElementById('contributionAmountError').textContent = 'Please enter a valid amount greater than 0';
    return;
  }
  
  if (!contributionDateInput.value) {
    document.getElementById('contributionDateError').textContent = 'Please select a date';
    return;
  }
  
  // Show loading state
  const originalText = saveContributionBtn.textContent;
  saveContributionBtn.disabled = true;
  saveContributionBtn.textContent = 'Saving...';
  
  try {
    const goal = state.goals.find(g => g.id === state.contributingGoalId);
    if (!goal) throw new Error('Goal not found');
    
    const newCurrentAmount = goal.currentAmount + amount;
    
    const result = await firestoreService.updateGoal(state.contributingGoalId, {
      currentAmount: newCurrentAmount
    });
    
    if (result.success) {
      toast.success(`Added ${formatCurrency(amount)} to ${goal.name}`);
      closeContributionModalFunc();
      await loadGoals();
    } else {
      toast.error(result.error || 'Failed to add contribution');
    }
    
  } catch (error) {
    console.error('Error adding contribution:', error);
    toast.error('Failed to add contribution');
  } finally {
    saveContributionBtn.disabled = false;
    saveContributionBtn.textContent = originalText;
  }
}

// Open delete modal
function openDeleteModal(id) {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) return;
  
  deleteGoalId = id;
  deleteGoalName.textContent = goal.name;
  deleteGoalTarget.textContent = `Target: ${formatCurrency(goal.targetAmount)}`;
  
  deleteModal.classList.add('show');
}

// Close delete modal
function closeDeleteConfirmModal() {
  deleteModal.classList.remove('show');
  deleteGoalId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteGoalId) return;
  
  // Show loading state
  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';
  
  try {
    const result = await firestoreService.deleteGoal(deleteGoalId);
    
    if (result.success) {
      toast.success('Goal deleted successfully');
      closeDeleteConfirmModal();
      await loadGoals();
    } else {
      toast.error(result.error || 'Failed to delete goal');
    }
    
  } catch (error) {
    console.error('Error deleting goal:', error);
    toast.error('Failed to delete goal');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}
