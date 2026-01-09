// Transfers Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import transfersService from '../services/transfers-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate, formatDateForInput, escapeHtml } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State
const state = {
  transfers: [],
  filteredTransfers: [],
  editingTransferId: null,
  filters: {
    type: '',
    dateFrom: '',
    dateTo: ''
  },
  linkedEntities: {
    investments: [],
    loans: [],
    goals: []
  }
};

let deleteTransferId = null;

// Check authentication
async function checkAuth() {
  try {
    const user = await authService.waitForAuth();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Transfers] Auth error:', error);
    window.location.href = 'login.html';
    return false;
  }
}

// Initialize
async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadTransfers();
  });
  
  await initPage();
}

init();

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Update user profile
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = user.displayName || 'User';
    document.getElementById('userEmail').textContent = user.email;
    
    // Set default date
    document.getElementById('transferDate').valueAsDate = new Date();
    
    setupEventListeners();
    await loadLinkedEntities();
    await loadTransfers();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  
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
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await authService.logout();
    window.location.href = 'login.html';
  });
  
  // Add transfer button
  document.getElementById('addTransferBtn')?.addEventListener('click', openForm);
  document.getElementById('closeFormBtn')?.addEventListener('click', closeForm);
  document.getElementById('cancelFormBtn')?.addEventListener('click', closeForm);
  
  // Form submission
  document.getElementById('transferForm')?.addEventListener('submit', handleSubmit);
  
  // Transfer type change
  document.getElementById('transferType')?.addEventListener('change', handleTypeChange);
  
  // Linked type change
  document.getElementById('linkedType')?.addEventListener('change', handleLinkedTypeChange);
  
  // EMI amount calculation
  document.getElementById('principalAmount')?.addEventListener('input', calculateEMITotal);
  document.getElementById('interestAmount')?.addEventListener('input', calculateEMITotal);
  
  // Filters
  document.getElementById('filtersToggle')?.addEventListener('click', toggleFilters);
  document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
  document.getElementById('dateFromFilter')?.addEventListener('change', applyFilters);
  document.getElementById('dateToFilter')?.addEventListener('change', applyFilters);
  document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
  
  // Delete modal
  document.getElementById('closeDeleteModalBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
}

// Load linked entities (investments, loans, goals)
async function loadLinkedEntities() {
  try {
    const userId = authService.getCurrentUser()?.uid;
    
    const [investments, loans, goals] = await Promise.all([
      firestoreService.getAll('investments'),
      firestoreService.getAll('loans'),
      firestoreService.getAll('goals')
    ]);
    
    state.linkedEntities.investments = investments.filter(i => i.userId === userId);
    state.linkedEntities.loans = loans.filter(l => l.userId === userId);
    state.linkedEntities.goals = goals.filter(g => g.userId === userId);
  } catch (error) {
    console.error('[Transfers] Error loading linked entities:', error);
  }
}

// Load transfers
async function loadTransfers() {
  try {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('transfersList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    
    state.transfers = await transfersService.getTransfers();
    applyFilters();
    updateSummary();
    
  } catch (error) {
    console.error('[Transfers] Error loading transfers:', error);
    toast.error('Failed to load transfers');
  } finally {
    document.getElementById('loadingState').style.display = 'none';
  }
}

// Apply filters
function applyFilters() {
  state.filters.type = document.getElementById('typeFilter')?.value || '';
  state.filters.dateFrom = document.getElementById('dateFromFilter')?.value || '';
  state.filters.dateTo = document.getElementById('dateToFilter')?.value || '';
  
  state.filteredTransfers = state.transfers.filter(t => {
    if (state.filters.type && t.type !== state.filters.type) return false;
    
    if (state.filters.dateFrom) {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (tDate < new Date(state.filters.dateFrom)) return false;
    }
    
    if (state.filters.dateTo) {
      const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const toDate = new Date(state.filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (tDate > toDate) return false;
    }
    
    return true;
  });
  
  renderTransfers();
}

// Clear filters
function clearFilters() {
  document.getElementById('typeFilter').value = '';
  document.getElementById('dateFromFilter').value = '';
  document.getElementById('dateToFilter').value = '';
  applyFilters();
}

// Toggle filters
function toggleFilters() {
  const content = document.getElementById('filtersContent');
  const toggle = document.getElementById('filtersToggle');
  content.classList.toggle('show');
  toggle.classList.toggle('active');
}

// Update summary
function updateSummary() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthlyTransfers = state.transfers.filter(t => {
    const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
    return tDate >= startOfMonth;
  });
  
  let totalInvestments = 0;
  let totalEMIs = 0;
  let totalSavings = 0;
  
  monthlyTransfers.forEach(t => {
    switch (t.type) {
      case 'investment_purchase':
        totalInvestments += t.amount || 0;
        break;
      case 'loan_emi':
      case 'loan_prepayment':
        totalEMIs += t.amount || 0;
        break;
      case 'savings_deposit':
      case 'emergency_fund':
        totalSavings += t.amount || 0;
        break;
    }
  });
  
  document.getElementById('totalInvestments').textContent = formatCurrency(totalInvestments);
  document.getElementById('totalEMIs').textContent = formatCurrency(totalEMIs);
  document.getElementById('totalSavings').textContent = formatCurrency(totalSavings);
}

// Render transfers
function renderTransfers() {
  const container = document.getElementById('transfersList');
  const emptyState = document.getElementById('emptyState');
  
  if (state.filteredTransfers.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  
  container.style.display = 'grid';
  emptyState.style.display = 'none';
  
  container.innerHTML = state.filteredTransfers.map(transfer => {
    const categoryInfo = transfersService.getCategoryInfo(transfer.type);
    const date = transfer.date?.toDate ? transfer.date.toDate() : new Date(transfer.date);
    
    let detailsHtml = '';
    if (transfer.type === 'loan_emi' && (transfer.principalAmount || transfer.interestAmount)) {
      detailsHtml = `
        <div class="transfer-emi-split">
          <span class="emi-principal">Principal: ${formatCurrency(transfer.principalAmount || 0)}</span>
          <span class="emi-interest">Interest: ${formatCurrency(transfer.interestAmount || 0)}</span>
        </div>
      `;
    }
    
    if (transfer.linkedName) {
      detailsHtml += `<div class="transfer-linked">Linked: ${escapeHtml(transfer.linkedName)}</div>`;
    }
    
    return `
      <div class="transfer-card" data-id="${transfer.id}">
        <div class="transfer-header">
          <div class="transfer-icon" style="background: ${categoryInfo.color}">${categoryInfo.icon}</div>
          <div class="transfer-info">
            <div class="transfer-type">${categoryInfo.name}</div>
            <div class="transfer-date">${formatDate(date)}</div>
          </div>
          <div class="transfer-amount">${formatCurrency(transfer.amount)}</div>
        </div>
        ${transfer.description ? `<div class="transfer-description">${escapeHtml(transfer.description)}</div>` : ''}
        ${detailsHtml}
        <div class="transfer-actions">
          <button class="btn-icon btn-edit" data-id="${transfer.id}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete" data-id="${transfer.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editTransfer(btn.dataset.id));
  });
  
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
}

// Open form
function openForm() {
  state.editingTransferId = null;
  document.getElementById('formTitle').textContent = 'Add Transfer';
  document.getElementById('transferForm').reset();
  document.getElementById('transferDate').valueAsDate = new Date();
  document.getElementById('addTransferSection').classList.add('show');
  handleTypeChange();
}

// Close form
function closeForm() {
  document.getElementById('addTransferSection').classList.remove('show');
  document.getElementById('transferForm').reset();
  state.editingTransferId = null;
}

// Handle type change
function handleTypeChange() {
  const type = document.getElementById('transferType').value;
  const emiSplitGroup = document.getElementById('emiSplitGroup');
  const interestGroup = document.getElementById('interestGroup');
  
  // Show EMI split for loan payments
  if (type === 'loan_emi' || type === 'loan_prepayment') {
    emiSplitGroup.style.display = 'block';
    interestGroup.style.display = 'block';
  } else {
    emiSplitGroup.style.display = 'none';
    interestGroup.style.display = 'none';
  }
  
  // Auto-select linked type based on transfer type
  const linkedType = document.getElementById('linkedType');
  if (type === 'investment_purchase' || type === 'investment_sale') {
    linkedType.value = 'investment';
  } else if (type === 'loan_emi' || type === 'loan_prepayment') {
    linkedType.value = 'loan';
  } else if (type === 'savings_deposit' || type === 'savings_withdrawal' || type === 'emergency_fund') {
    linkedType.value = 'goal';
  } else {
    linkedType.value = '';
  }
  
  handleLinkedTypeChange();
}

// Handle linked type change
function handleLinkedTypeChange() {
  const linkedType = document.getElementById('linkedType').value;
  const linkedEntityGroup = document.getElementById('linkedEntityGroup');
  const linkedEntitySelect = document.getElementById('linkedEntity');
  
  if (!linkedType) {
    linkedEntityGroup.style.display = 'none';
    return;
  }
  
  linkedEntityGroup.style.display = 'block';
  linkedEntitySelect.innerHTML = '<option value="">Select...</option>';
  
  let entities = [];
  switch (linkedType) {
    case 'investment':
      entities = state.linkedEntities.investments;
      break;
    case 'loan':
      entities = state.linkedEntities.loans;
      break;
    case 'goal':
      entities = state.linkedEntities.goals;
      break;
  }
  
  entities.forEach(entity => {
    const name = entity.name || entity.lender || entity.title || 'Unnamed';
    linkedEntitySelect.innerHTML += `<option value="${entity.id}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
  });
}

// Calculate EMI total
function calculateEMITotal() {
  const principal = parseFloat(document.getElementById('principalAmount').value) || 0;
  const interest = parseFloat(document.getElementById('interestAmount').value) || 0;
  document.getElementById('amount').value = (principal + interest).toFixed(2);
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  const saveBtn = document.getElementById('saveFormBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
  
  try {
    const linkedEntitySelect = document.getElementById('linkedEntity');
    const selectedOption = linkedEntitySelect.options[linkedEntitySelect.selectedIndex];
    
    const transferData = {
      type: document.getElementById('transferType').value,
      amount: parseFloat(document.getElementById('amount').value),
      date: document.getElementById('transferDate').value,
      description: document.getElementById('description').value,
      notes: document.getElementById('notes').value,
      principalAmount: parseFloat(document.getElementById('principalAmount').value) || null,
      interestAmount: parseFloat(document.getElementById('interestAmount').value) || null,
      linkedType: document.getElementById('linkedType').value || null,
      linkedId: linkedEntitySelect.value || null,
      linkedName: selectedOption?.dataset?.name || null
    };
    
    if (state.editingTransferId) {
      await transfersService.updateTransfer(state.editingTransferId, transferData);
      toast.success('Transfer updated successfully');
    } else {
      await transfersService.createTransfer(transferData);
      toast.success('Transfer added successfully');
    }
    
    closeForm();
    await loadTransfers();
    
  } catch (error) {
    console.error('[Transfers] Error saving transfer:', error);
    toast.error('Failed to save transfer');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Transfer';
  }
}

// Edit transfer
async function editTransfer(id) {
  const transfer = state.transfers.find(t => t.id === id);
  if (!transfer) return;
  
  state.editingTransferId = id;
  document.getElementById('formTitle').textContent = 'Edit Transfer';
  
  document.getElementById('transferType').value = transfer.type || '';
  document.getElementById('amount').value = transfer.amount || '';
  
  const date = transfer.date?.toDate ? transfer.date.toDate() : new Date(transfer.date);
  document.getElementById('transferDate').value = formatDateForInput(date);
  
  document.getElementById('description').value = transfer.description || '';
  document.getElementById('notes').value = transfer.notes || '';
  document.getElementById('principalAmount').value = transfer.principalAmount || '';
  document.getElementById('interestAmount').value = transfer.interestAmount || '';
  document.getElementById('linkedType').value = transfer.linkedType || '';
  
  handleTypeChange();
  
  if (transfer.linkedId) {
    setTimeout(() => {
      document.getElementById('linkedEntity').value = transfer.linkedId;
    }, 100);
  }
  
  document.getElementById('addTransferSection').classList.add('show');
}

// Open delete modal
function openDeleteModal(id) {
  const transfer = state.transfers.find(t => t.id === id);
  if (!transfer) return;
  
  deleteTransferId = id;
  document.getElementById('deleteTransferAmount').textContent = formatCurrency(transfer.amount);
  document.getElementById('deleteTransferDesc').textContent = transfer.description || transfersService.getCategoryInfo(transfer.type).name;
  document.getElementById('deleteModal').classList.add('show');
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  deleteTransferId = null;
}

// Confirm delete
async function confirmDelete() {
  if (!deleteTransferId) return;
  
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="spinner"></span> Deleting...';
  
  try {
    await transfersService.deleteTransfer(deleteTransferId);
    toast.success('Transfer deleted successfully');
    closeDeleteModal();
    await loadTransfers();
  } catch (error) {
    console.error('[Transfers] Error deleting transfer:', error);
    toast.error('Failed to delete transfer');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = 'Delete';
  }
}
