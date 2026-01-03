// Split Expense Page Logic
import authService from '../services/auth-service.js';
import splitService from '../services/split-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency, formatDate, formatDateForInput } from '../utils/helpers.js';

// State management
const state = {
  splits: [],
  filteredSplits: [],
  currentTab: 'active',
  editingSplitId: null,
  participants: [{ name: 'Me', amount: 0 }]
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
const createSplitBtn = document.getElementById('createSplitBtn');
const splitsList = document.getElementById('splitsList');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');

// Summary elements
const totalOwedEl = document.getElementById('totalOwed');
const totalOwedToYouEl = document.getElementById('totalOwedToYou');
const activeSplitsEl = document.getElementById('activeSplits');

// Form elements
const createSplitSection = document.getElementById('createSplitSection');
const splitForm = document.getElementById('splitForm');
const closeSplitFormBtn = document.getElementById('closeSplitFormBtn');
const cancelSplitBtn = document.getElementById('cancelSplitBtn');
const saveSplitBtn = document.getElementById('saveSplitBtn');
const saveSplitBtnText = document.getElementById('saveSplitBtnText');
const saveSplitBtnSpinner = document.getElementById('saveSplitBtnSpinner');

// Form fields
const splitDescription = document.getElementById('splitDescription');
const splitAmount = document.getElementById('splitAmount');
const splitDate = document.getElementById('splitDate');
const splitCategory = document.getElementById('splitCategory');
const paidBy = document.getElementById('paidBy');
const paidByName = document.getElementById('paidByName');
const paidByNameGroup = document.getElementById('paidByNameGroup');
const participantsList = document.getElementById('participantsList');
const addParticipantBtn = document.getElementById('addParticipantBtn');
const splitSummaryBox = document.getElementById('splitSummaryBox');
const splitSummaryContent = document.getElementById('splitSummaryContent');

// Settle modal elements
const settleModal = document.getElementById('settleModal');
const closeSettleModalBtn = document.getElementById('closeSettleModalBtn');
const cancelSettleBtn = document.getElementById('cancelSettleBtn');
const confirmSettleBtn = document.getElementById('confirmSettleBtn');
const settleBtnText = document.getElementById('settleBtnText');
const settleBtnSpinner = document.getElementById('settleBtnSpinner');
const settleDescription = document.getElementById('settleDescription');
const settleAmount = document.getElementById('settleAmount');
const settleDate = document.getElementById('settleDate');
const settleNotes = document.getElementById('settleNotes');

let currentSettleSplitId = null;

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
    
    // Set default date
    splitDate.value = formatDateForInput(new Date());
    settleDate.value = formatDateForInput(new Date());
    
    // Load splits
    await loadSplits();
    
    // Setup event listeners
    setupEventListeners();
  }
}

// Load splits from Firestore
async function loadSplits() {
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    splitsList.style.display = 'none';
    
    state.splits = await splitService.getSplits();
    filterSplits();
    renderSplits();
    updateSummary();
    
  } catch (error) {
    console.error('Error loading splits:', error);
    toast.error('Failed to load splits');
    loadingState.style.display = 'none';
  }
}

// Filter splits by tab
function filterSplits() {
  if (state.currentTab === 'active') {
    state.filteredSplits = state.splits.filter(s => s.status === 'active');
  } else if (state.currentTab === 'settled') {
    state.filteredSplits = state.splits.filter(s => s.status === 'settled');
  } else {
    state.filteredSplits = state.splits;
  }
}

// Render splits
function renderSplits() {
  loadingState.style.display = 'none';
  
  if (state.filteredSplits.length === 0) {
    emptyState.style.display = 'flex';
    splitsList.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  splitsList.style.display = 'grid';
  
  splitsList.innerHTML = state.filteredSplits.map(split => createSplitCard(split)).join('');
  attachCardEventListeners();
}

// Create split card HTML
function createSplitCard(split) {
  const date = split.date.toDate ? split.date.toDate() : new Date(split.date);
  
  return `
    <div class="split-card ${split.status}">
      <div class="split-card-header">
        <div>
          <div class="split-card-title">${split.description}</div>
          <div class="split-card-amount">${formatCurrency(split.totalAmount)}</div>
        </div>
        <span class="split-card-status ${split.status}">${split.status}</span>
      </div>
      <div class="split-card-meta">
        <div class="split-card-meta-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          ${formatDate(date)}
        </div>
        <div class="split-card-meta-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          ${split.paidBy === 'me' ? 'You paid' : split.paidByName + ' paid'}
        </div>
      </div>
      <div class="split-participants">
        <div class="split-participants-title">Participants</div>
        ${split.participants.map(p => `
          <div class="split-participant-item">
            <span class="split-participant-name">${p.name}</span>
            <span class="split-participant-amount ${p.name === 'Me' ? (split.paidBy === 'me' ? 'owed' : 'owes') : (split.paidBy === 'me' ? 'owes' : 'owed')}">${formatCurrency(p.amount)}</span>
          </div>
        `).join('')}
      </div>
      ${split.status === 'settled' && split.settleNotes ? `
        <div class="split-card-meta">
          <div class="split-card-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            ${split.settleNotes}
          </div>
        </div>
      ` : ''}
      <div class="split-card-actions">
        ${split.status === 'active' ? `
          <button class="btn btn-sm btn-success btn-settle" data-id="${split.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Settle
          </button>
        ` : ''}
        <button class="btn btn-sm btn-outline btn-delete-split" data-id="${split.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `;
}

// Attach event listeners to cards
function attachCardEventListeners() {
  // Settle buttons
  document.querySelectorAll('.btn-settle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openSettleModal(id);
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.btn-delete-split').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this split?')) {
        await deleteSplit(id);
      }
    });
  });
}

// Update summary cards
function updateSummary() {
  const activeSplits = state.splits.filter(s => s.status === 'active');
  
  let totalOwed = 0;
  let totalOwedToYou = 0;
  
  activeSplits.forEach(split => {
    if (split.paidBy === 'me') {
      // You paid, others owe you
      const othersTotal = split.participants
        .filter(p => p.name !== 'Me')
        .reduce((sum, p) => sum + p.amount, 0);
      totalOwedToYou += othersTotal;
    } else {
      // Someone else paid, you owe them
      const yourAmount = split.participants
        .find(p => p.name === 'Me')?.amount || 0;
      totalOwed += yourAmount;
    }
  });
  
  totalOwedEl.textContent = formatCurrency(totalOwed);
  totalOwedToYouEl.textContent = formatCurrency(totalOwedToYou);
  activeSplitsEl.textContent = activeSplits.length;
}

// Calculate split amounts
function calculateSplit() {
  const totalAmount = parseFloat(splitAmount.value) || 0;
  const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  
  if (totalAmount === 0 || state.participants.length === 0) {
    splitSummaryBox.style.display = 'none';
    return;
  }
  
  if (splitType === 'equal') {
    const perPerson = totalAmount / state.participants.length;
    state.participants.forEach(p => p.amount = perPerson);
  } else if (splitType === 'percentage') {
    state.participants.forEach(p => {
      p.amount = (totalAmount * (parseFloat(p.percentage) || 0)) / 100;
    });
  }
  // Custom: amounts are entered manually
  
  updateSplitPreview();
}

// Update split preview
function updateSplitPreview() {
  const total = state.participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  
  splitSummaryContent.innerHTML = state.participants.map(p => `
    <div class="split-summary-item">
      <span>${p.name || 'Unnamed'}</span>
      <span>${formatCurrency(parseFloat(p.amount) || 0)}</span>
    </div>
  `).join('') + `
    <div class="split-summary-item" style="font-weight: 700; border-top: 2px solid var(--border-color); margin-top: 0.5rem; padding-top: 0.5rem;">
      <span>Total</span>
      <span>${formatCurrency(total)}</span>
    </div>
  `;
  
  // Show warning if totals don't match
  const expectedTotal = parseFloat(splitAmount.value) || 0;
  if (splitType !== 'equal' && Math.abs(total - expectedTotal) > 0.01) {
    splitSummaryContent.innerHTML += `
      <div class="split-summary-item" style="color: var(--accent-red); font-size: 0.875rem;">
        <span>⚠️ Total doesn't match split amount</span>
        <span>Difference: ${formatCurrency(Math.abs(total - expectedTotal))}</span>
      </div>
    `;
  }
  
  splitSummaryBox.style.display = 'block';
}

// Add participant
function addParticipant() {
  state.participants.push({ name: '', amount: 0, percentage: 0 });
  renderParticipants();
  calculateSplit();
}

// Remove participant
function removeParticipant(index) {
  if (state.participants.length <= 1) {
    toast.warning('At least one participant is required');
    return;
  }
  state.participants.splice(index, 1);
  renderParticipants();
  calculateSplit();
}

// Render participants
function renderParticipants() {
  const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
  
  participantsList.innerHTML = state.participants.map((p, i) => `
    <div class="participant-row">
      <input type="text" class="form-control" placeholder="Name" value="${p.name || ''}" 
        data-index="${i}" data-field="name">
      ${splitType === 'percentage' ? `
        <input type="number" class="form-control" placeholder="%" value="${p.percentage || ''}" 
          data-index="${i}" data-field="percentage" min="0" max="100" step="0.01">
      ` : `
        <input type="number" class="form-control" placeholder="Amount" value="${p.amount || ''}" 
          data-index="${i}" data-field="amount" min="0" step="0.01"
          ${splitType === 'equal' ? 'disabled' : ''}>
      `}
      <button type="button" class="btn-remove-participant" data-index="${i}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');
  
  // Attach event listeners
  participantsList.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      const value = e.target.value;
      
      if (field === 'name') {
        state.participants[index][field] = value;
      } else {
        state.participants[index][field] = parseFloat(value) || 0;
      }
      
      calculateSplit();
    });
  });
  
  participantsList.querySelectorAll('.btn-remove-participant').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      removeParticipant(index);
    });
  });
}

// Open split form
function openSplitForm() {
  state.participants = [{ name: 'Me', amount: 0, percentage: 0 }];
  splitForm.reset();
  splitDate.value = formatDateForInput(new Date());
  paidByNameGroup.style.display = 'none';
  splitSummaryBox.style.display = 'none';
  renderParticipants();
  createSplitSection.classList.add('show');
  createSplitSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Close split form
function closeSplitForm() {
  createSplitSection.classList.remove('show');
  splitForm.reset();
  state.participants = [{ name: 'Me', amount: 0 }];
}

// Validate split form
function validateSplitForm() {
  const totalAmount = parseFloat(splitAmount.value) || 0;
  const splitType = document.querySelector('input[name="splitType"]:checked')?.value;
  
  if (!splitDescription.value.trim()) {
    toast.error('Please enter a description');
    return false;
  }
  
  if (totalAmount <= 0) {
    toast.error('Please enter a valid amount');
    return false;
  }
  
  if (!splitDate.value) {
    toast.error('Please select a date');
    return false;
  }
  
  if (paidBy.value === 'other' && !paidByName.value.trim()) {
    toast.error('Please enter who paid');
    return false;
  }
  
  if (state.participants.length === 0) {
    toast.error('Please add at least one participant');
    return false;
  }
  
  // Validate participant names
  const hasEmptyNames = state.participants.some(p => !p.name || !p.name.trim());
  if (hasEmptyNames) {
    toast.error('Please enter names for all participants');
    return false;
  }
  
  // Validate totals for custom and percentage splits
  if (splitType !== 'equal') {
    const total = state.participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(total - totalAmount) > 0.01) {
      toast.error('Participant amounts must equal total amount');
      return false;
    }
  }
  
  if (splitType === 'percentage') {
    const totalPercentage = state.participants.reduce((sum, p) => sum + (parseFloat(p.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error('Percentages must total 100%');
      return false;
    }
  }
  
  return true;
}

// Submit split form
async function submitSplitForm(e) {
  e.preventDefault();
  
  if (!validateSplitForm()) {
    return;
  }
  
  // Show loading
  saveSplitBtn.disabled = true;
  saveSplitBtnText.style.display = 'none';
  saveSplitBtnSpinner.style.display = 'inline-block';
  
  try {
    const splitData = {
      description: splitDescription.value.trim(),
      totalAmount: parseFloat(splitAmount.value),
      category: splitCategory.value,
      date: new Date(splitDate.value),
      paidBy: paidBy.value,
      paidByName: paidBy.value === 'me' ? 'Me' : paidByName.value.trim(),
      splitType: document.querySelector('input[name="splitType"]:checked').value,
      participants: state.participants.map(p => ({
        name: p.name.trim(),
        amount: parseFloat(p.amount) || 0,
        percentage: parseFloat(p.percentage) || 0
      })),
      status: 'active'
    };
    
    const result = await splitService.addSplit(splitData);
    
    if (result.success) {
      toast.success('Split created successfully');
      closeSplitForm();
      await loadSplits();
    } else {
      toast.error(result.error || 'Failed to create split');
    }
    
  } catch (error) {
    console.error('Error creating split:', error);
    toast.error('Failed to create split');
  } finally {
    saveSplitBtn.disabled = false;
    saveSplitBtnText.style.display = 'inline';
    saveSplitBtnSpinner.style.display = 'none';
  }
}

// Open settle modal
function openSettleModal(id) {
  const split = state.splits.find(s => s.id === id);
  if (!split) return;
  
  currentSettleSplitId = id;
  settleDescription.textContent = split.description;
  settleAmount.textContent = formatCurrency(split.totalAmount);
  settleDate.value = formatDateForInput(new Date());
  settleNotes.value = '';
  
  settleModal.classList.add('show');
}

// Close settle modal
function closeSettleModal() {
  settleModal.classList.remove('show');
  currentSettleSplitId = null;
}

// Confirm settle
async function confirmSettle() {
  if (!currentSettleSplitId) return;
  
  // Show loading
  confirmSettleBtn.disabled = true;
  settleBtnText.style.display = 'none';
  settleBtnSpinner.style.display = 'inline-block';
  
  try {
    const result = await splitService.settleSplit(currentSettleSplitId, {
      settledDate: new Date(settleDate.value),
      settleNotes: settleNotes.value.trim()
    });
    
    if (result.success) {
      toast.success('Split settled successfully');
      closeSettleModal();
      await loadSplits();
    } else {
      toast.error(result.error || 'Failed to settle split');
    }
    
  } catch (error) {
    console.error('Error settling split:', error);
    toast.error('Failed to settle split');
  } finally {
    confirmSettleBtn.disabled = false;
    settleBtnText.style.display = 'inline';
    settleBtnSpinner.style.display = 'none';
  }
}

// Delete split
async function deleteSplit(id) {
  try {
    const result = await splitService.deleteSplit(id);
    
    if (result.success) {
      toast.success('Split deleted successfully');
      await loadSplits();
    } else {
      toast.error(result.error || 'Failed to delete split');
    }
    
  } catch (error) {
    console.error('Error deleting split:', error);
    toast.error('Failed to delete split');
  }
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
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterSplits();
      renderSplits();
    });
  });
  
  // Create split button
  createSplitBtn.addEventListener('click', openSplitForm);
  
  // Form buttons
  closeSplitFormBtn.addEventListener('click', closeSplitForm);
  cancelSplitBtn.addEventListener('click', closeSplitForm);
  splitForm.addEventListener('submit', submitSplitForm);
  
  // Add participant
  addParticipantBtn.addEventListener('click', addParticipant);
  
  // Split type change
  document.querySelectorAll('input[name="splitType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      renderParticipants();
      calculateSplit();
    });
  });
  
  // Amount change
  splitAmount.addEventListener('input', calculateSplit);
  
  // Paid by change
  paidBy.addEventListener('change', (e) => {
    paidByNameGroup.style.display = e.target.value === 'other' ? 'block' : 'none';
  });
  
  // Settle modal
  closeSettleModalBtn.addEventListener('click', closeSettleModal);
  cancelSettleBtn.addEventListener('click', closeSettleModal);
  confirmSettleBtn.addEventListener('click', confirmSettle);
  
  // Close settle modal on overlay click
  settleModal.addEventListener('click', (e) => {
    if (e.target === settleModal) {
      closeSettleModal();
    }
  });
}
