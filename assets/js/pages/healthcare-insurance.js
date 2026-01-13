// Healthcare & Insurance Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import storageService from '../services/storage-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State
let policies = [];
let expenses = [];
let currentUser = null;
let editingPolicyId = null;
let editingExpenseId = null;
let deleteItemId = null;
let deleteItemType = null;

// Initialize
async function init() {
  currentUser = await authService.waitForAuth();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  loadUserProfile();
  setupEventListeners();

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadData();
  });

  await loadData();
}

// Load user profile
function loadUserProfile() {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  if (userName) {
    userName.textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  }

  if (userEmail) {
    userEmail.textContent = currentUser.email || '';
  }

  if (userAvatar) {
    if (currentUser.photoURL) {
      userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="User Avatar">`;
    } else {
      const initial = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }
  }
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

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Policy form buttons
  document.getElementById('addPolicyBtn')?.addEventListener('click', () => openPolicyForm());
  document.getElementById('addPolicyBtnEmpty')?.addEventListener('click', () => openPolicyForm());
  document.getElementById('closePolicyFormBtn')?.addEventListener('click', closePolicyForm);
  document.getElementById('cancelPolicyBtn')?.addEventListener('click', closePolicyForm);
  document.getElementById('policyForm')?.addEventListener('submit', handlePolicySubmit);

  // Expense form buttons
  document.getElementById('addExpenseBtn')?.addEventListener('click', () => openExpenseForm());
  document.getElementById('addExpenseBtnEmpty')?.addEventListener('click', () => openExpenseForm());
  document.getElementById('closeExpenseFormBtn')?.addEventListener('click', closeExpenseForm);
  document.getElementById('cancelExpenseBtn')?.addEventListener('click', closeExpenseForm);
  document.getElementById('expenseForm')?.addEventListener('submit', handleExpenseSubmit);

  // Claimable checkbox
  document.getElementById('claimable')?.addEventListener('change', (e) => {
    document.getElementById('policySelectGroup').style.display = e.target.checked ? 'block' : 'none';
  });

  // Delete modal
  document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
}

// Switch tab
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Load data
async function loadData() {
  await Promise.all([loadPolicies(), loadExpenses()]);
}

// Load policies
async function loadPolicies() {
  try {
    const loadingState = document.getElementById('policiesLoadingState');
    const emptyState = document.getElementById('policiesEmptyState');
    const policiesGrid = document.getElementById('policiesGrid');

    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    policiesGrid.style.display = 'none';

    policies = await firestoreService.getAll('insurancePolicies', 'createdAt', 'desc');

    if (policies.length === 0) {
      loadingState.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      loadingState.style.display = 'none';
      policiesGrid.style.display = 'grid';
      renderPolicies();
    }

    updatePolicyKPIs();
  } catch (error) {
    console.error('Error loading policies:', error);
    toast.error('Failed to load insurance policies');
  }
}

// Render policies
function renderPolicies() {
  const policiesGrid = document.getElementById('policiesGrid');
  if (!policiesGrid) return;

  const now = new Date();

  policiesGrid.innerHTML = policies.map(policy => {
    const endDate = new Date(policy.endDate);
    const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry <= 0;
    
    let statusClass = 'active';
    let statusText = 'Active';
    if (isExpired) {
      statusClass = 'expired';
      statusText = 'Expired';
    } else if (isExpiringSoon) {
      statusClass = 'expiring';
      statusText = 'Expiring Soon';
    }

    // Document badge if file attached
    const documentBadge = policy.fileUrl ? `
      <div style="margin-top: 0.5rem;">
        <a href="${policy.fileUrl}" target="_blank" class="document-badge" onclick="event.stopPropagation()">
          📄 View Policy Document
        </a>
      </div>
    ` : '';

    return `
      <div class="policy-card ${isExpiringSoon ? 'expiring-soon' : ''}">
        <div class="policy-header">
          <div class="policy-info">
            <h3>${policy.policyName}</h3>
            <div class="policy-provider">${policy.provider}</div>
          </div>
          <span class="policy-status ${statusClass}">${statusText}</span>
        </div>

        <div class="policy-details">
          <div class="policy-detail">
            <div class="policy-detail-label">Coverage</div>
            <div class="policy-detail-value">${formatCurrency(policy.coverageAmount)}</div>
          </div>
          <div class="policy-detail">
            <div class="policy-detail-label">Premium</div>
            <div class="policy-detail-value">${formatCurrency(policy.premiumAmount)}</div>
          </div>
        </div>

        <div class="policy-dates">
          <div class="policy-date">
            <div class="policy-date-label">Start Date</div>
            <div class="policy-date-value">${formatDate(policy.startDate)}</div>
          </div>
          <div class="policy-date">
            <div class="policy-date-label">End Date</div>
            <div class="policy-date-value">${formatDate(policy.endDate)}</div>
          </div>
        </div>

        ${policy.coveredMembers ? `
          <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
            <strong>Covered:</strong> ${policy.coveredMembers}
          </div>
        ` : ''}

        ${documentBadge}

        <div class="policy-actions">
          <button class="btn btn-sm btn-outline" onclick="editPolicy('${policy.id}')">Edit</button>
          <button class="btn btn-sm btn-danger-outline" onclick="deletePolicy('${policy.id}', '${policy.policyName}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Update policy KPIs
function updatePolicyKPIs() {
  const now = new Date();
  const activePolicies = policies.filter(p => new Date(p.endDate) > now).length;
  const totalCoverage = policies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0);
  const policiesWithDocuments = policies.filter(p => p.fileUrl).length;

  const activePoliciesEl = document.getElementById('activePolicies');
  const totalCoverageEl = document.getElementById('totalCoverage');
  const policyDocumentsEl = document.getElementById('policyDocuments');

  if (activePoliciesEl) activePoliciesEl.textContent = activePolicies;
  if (totalCoverageEl) {
    totalCoverageEl.textContent = formatCurrencyCompact(totalCoverage);
    totalCoverageEl.title = formatCurrency(totalCoverage); // Tooltip with full amount
  }
  if (policyDocumentsEl) policyDocumentsEl.textContent = policiesWithDocuments;
}

// Load expenses
async function loadExpenses() {
  try {
    const loadingState = document.getElementById('expensesLoadingState');
    const emptyState = document.getElementById('expensesEmptyState');
    const expensesList = document.getElementById('expensesList');

    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    expensesList.style.display = 'none';

    expenses = await firestoreService.getAll('healthcareExpenses', 'date', 'desc');

    if (expenses.length === 0) {
      loadingState.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      loadingState.style.display = 'none';
      expensesList.style.display = 'block';
      renderExpenses();
    }

    updateExpenseKPIs();
  } catch (error) {
    console.error('Error loading expenses:', error);
    toast.error('Failed to load medical expenses');
  }
}

// Render expenses
function renderExpenses() {
  const expensesList = document.getElementById('expensesList');
  if (!expensesList) return;

  const categoryIcons = {
    'Doctor Visit': '👨‍⚕️',
    'Medicines': '💊',
    'Lab Tests': '🔬',
    'Hospital': '🏥',
    'Dental': '🦷',
    'Eye Care': '👁️',
    'Therapy': '🧘',
    'Other': '📋'
  };

  expensesList.innerHTML = expenses.map(expense => `
    <div class="expense-item">
      <div class="expense-info">
        <div class="expense-header">
          <span class="expense-icon">${categoryIcons[expense.category] || '📋'}</span>
          <span class="expense-title">${expense.description}</span>
          <span class="expense-category">${expense.category}</span>
          ${expense.claimable ? '<span class="claimable-badge">Claimable</span>' : ''}
        </div>
        <div class="expense-meta">
          <span>📅 ${formatDate(expense.date)}</span>
          ${expense.familyMember ? `<span>👤 ${expense.familyMember}</span>` : ''}
        </div>
      </div>
      <div class="expense-amount">${formatCurrency(expense.amount)}</div>
      <div class="expense-actions">
        <button class="btn btn-sm btn-outline" onclick="editExpense('${expense.id}')">Edit</button>
        <button class="btn btn-sm btn-danger-outline" onclick="deleteExpense('${expense.id}', '${expense.description}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Update expense KPIs
function updateExpenseKPIs() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + e.amount, 0);

  const lastMonth = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getMonth() === currentMonth - 1 && date.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + e.amount, 0);

  const thisYear = expenses.filter(e => {
    const date = new Date(e.date);
    return date.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + e.amount, 0);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthEl = document.getElementById('thisMonthExpenses');
  const lastMonthEl = document.getElementById('lastMonthExpenses');
  const thisYearEl = document.getElementById('thisYearExpenses');
  const totalEl = document.getElementById('totalExpenses');

  if (thisMonthEl) thisMonthEl.textContent = formatCurrencyCompact(thisMonth);
  if (lastMonthEl) lastMonthEl.textContent = formatCurrencyCompact(lastMonth);
  if (thisYearEl) thisYearEl.textContent = formatCurrencyCompact(thisYear);
  if (totalEl) {
    totalEl.textContent = formatCurrencyCompact(total);
    totalEl.title = formatCurrency(total); // Tooltip with full amount
  }
}

// Filter expenses
function filterExpenses() {
  const category = document.getElementById('categoryFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase();

  const filtered = expenses.filter(expense => {
    const matchesCategory = !category || expense.category === category;
    const matchesSearch = !search || 
      expense.description.toLowerCase().includes(search) ||
      expense.category.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  // Re-render with filtered expenses
  const expensesList = document.getElementById('expensesList');
  if (!expensesList) return;

  const categoryIcons = {
    'Doctor Visit': '👨‍⚕️',
    'Medicines': '💊',
    'Lab Tests': '🔬',
    'Hospital': '🏥',
    'Dental': '🦷',
    'Eye Care': '👁️',
    'Therapy': '🧘',
    'Other': '📋'
  };

  expensesList.innerHTML = filtered.map(expense => `
    <div class="expense-item">
      <div class="expense-info">
        <div class="expense-header">
          <span class="expense-icon">${categoryIcons[expense.category] || '📋'}</span>
          <span class="expense-title">${expense.description}</span>
          <span class="expense-category">${expense.category}</span>
          ${expense.claimable ? '<span class="claimable-badge">Claimable</span>' : ''}
        </div>
        <div class="expense-meta">
          <span>📅 ${formatDate(expense.date)}</span>
          ${expense.familyMember ? `<span>👤 ${expense.familyMember}</span>` : ''}
        </div>
      </div>
      <div class="expense-amount">${formatCurrency(expense.amount)}</div>
      <div class="expense-actions">
        <button class="btn btn-sm btn-outline" onclick="editExpense('${expense.id}')">Edit</button>
        <button class="btn btn-sm btn-danger-outline" onclick="deleteExpense('${expense.id}', '${expense.description}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Policy form functions
function openPolicyForm(policyId = null) {
  // Close expense form if open
  closeExpenseForm();

  const formSection = document.getElementById('addPolicySection');
  const formTitle = document.getElementById('policyFormTitle');
  const form = document.getElementById('policyForm');
  const policyUploadProgress = document.getElementById('policyUploadProgress');
  const currentPolicyFileGroup = document.getElementById('currentPolicyFileGroup');

  editingPolicyId = policyId;

  if (policyId) {
    const policy = policies.find(p => p.id === policyId);
    if (policy) {
      formTitle.textContent = 'Edit Insurance Policy';
      document.getElementById('policyName').value = policy.policyName || '';
      document.getElementById('policyType').value = policy.policyType || '';
      document.getElementById('provider').value = policy.provider || '';
      document.getElementById('policyNumber').value = policy.policyNumber || '';
      document.getElementById('coverageAmount').value = policy.coverageAmount || '';
      document.getElementById('premiumAmount').value = policy.premiumAmount || '';
      document.getElementById('startDate').value = policy.startDate || '';
      document.getElementById('endDate').value = policy.endDate || '';
      document.getElementById('coveredMembers').value = policy.coveredMembers || '';
      document.getElementById('policyNotes').value = policy.notes || '';
      
      // Show current file if exists
      if (policy.fileUrl) {
        currentPolicyFileGroup.style.display = 'block';
        document.getElementById('currentPolicyFileName').textContent = policy.fileName || 'View Document';
        document.getElementById('currentPolicyFileLink').href = policy.fileUrl;
      } else {
        currentPolicyFileGroup.style.display = 'none';
      }
    }
  } else {
    formTitle.textContent = 'Add Insurance Policy';
    form.reset();
    currentPolicyFileGroup.style.display = 'none';
  }

  policyUploadProgress.style.display = 'none';
  formSection.classList.add('show');
  formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closePolicyForm() {
  document.getElementById('addPolicySection').classList.remove('show');
  document.getElementById('policyForm').reset();
  document.getElementById('policyUploadProgress').style.display = 'none';
  document.getElementById('currentPolicyFileGroup').style.display = 'none';
  editingPolicyId = null;
}

async function handlePolicySubmit(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('savePolicyBtn');
  const originalText = saveBtn.textContent;

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    let fileUrl = null;
    let filePath = null;
    let fileName = null;
    let fileSize = null;
    let fileType = null;

    // Upload file if selected
    const fileInput = document.getElementById('policyFileInput');
    const file = fileInput.files[0];
    
    if (file) {
      const policyUploadProgress = document.getElementById('policyUploadProgress');
      const policyProgressFill = document.getElementById('policyProgressFill');
      const policyProgressText = document.getElementById('policyProgressText');
      
      policyUploadProgress.style.display = 'block';
      
      const uploadResult = await storageService.uploadFile(
        file,
        'insurance-policies',
        (progress) => {
          policyProgressFill.style.width = `${progress}%`;
          policyProgressText.textContent = `${Math.round(progress)}%`;
        }
      );

      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Failed to upload file');
        return;
      }

      fileUrl = uploadResult.url;
      filePath = uploadResult.path;
      fileName = uploadResult.name;
      fileSize = uploadResult.size;
      fileType = uploadResult.type;
    }

    const policyData = {
      policyName: document.getElementById('policyName').value,
      policyType: document.getElementById('policyType').value,
      provider: document.getElementById('provider').value,
      policyNumber: document.getElementById('policyNumber').value,
      coverageAmount: parseFloat(document.getElementById('coverageAmount').value),
      premiumAmount: parseFloat(document.getElementById('premiumAmount').value),
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      coveredMembers: document.getElementById('coveredMembers').value || null,
      notes: document.getElementById('policyNotes').value || null,
      userId: currentUser.uid
    };

    // Add file data if uploaded
    if (fileUrl) {
      policyData.fileUrl = fileUrl;
      policyData.filePath = filePath;
      policyData.fileName = fileName;
      policyData.fileSize = fileSize;
      policyData.fileType = fileType;
    }

    if (editingPolicyId) {
      // If editing and new file uploaded, delete old file
      if (fileUrl) {
        const oldPolicy = policies.find(p => p.id === editingPolicyId);
        if (oldPolicy && oldPolicy.filePath) {
          await storageService.deleteFile(oldPolicy.filePath);
        }
      }
      
      await firestoreService.update('insurancePolicies', editingPolicyId, policyData);
      toast.success('Policy updated successfully');
    } else {
      await firestoreService.add('insurancePolicies', policyData);
      toast.success('Policy added successfully');
    }

    closePolicyForm();
    await loadPolicies();
  } catch (error) {
    console.error('Error saving policy:', error);
    toast.error('Failed to save policy');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    document.getElementById('policyUploadProgress').style.display = 'none';
    document.getElementById('policyProgressFill').style.width = '0%';
    document.getElementById('policyProgressText').textContent = '0%';
  }
}

// Expense form functions
function openExpenseForm(expenseId = null) {
  // Close policy form if open
  closePolicyForm();

  const formSection = document.getElementById('addExpenseSection');
  const formTitle = document.getElementById('expenseFormTitle');
  const form = document.getElementById('expenseForm');

  // Populate policy select
  const policySelect = document.getElementById('policyId');
  policySelect.innerHTML = '<option value="">Select Policy</option>' +
    policies.map(p => `<option value="${p.id}">${p.policyName}</option>`).join('');

  editingExpenseId = expenseId;

  if (expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (expense) {
      formTitle.textContent = 'Edit Medical Expense';
      document.getElementById('expenseCategory').value = expense.category || '';
      document.getElementById('expenseDescription').value = expense.description || '';
      document.getElementById('expenseAmount').value = expense.amount || '';
      document.getElementById('expenseDate').value = expense.date || '';
      document.getElementById('provider').value = expense.provider || '';
      document.getElementById('claimable').checked = expense.claimable || false;
      document.getElementById('policyId').value = expense.policyId || '';
      document.getElementById('expenseNotes').value = expense.notes || '';
      document.getElementById('policySelectGroup').style.display = expense.claimable ? 'block' : 'none';
    }
  } else {
    formTitle.textContent = 'Add Medical Expense';
    form.reset();
    document.getElementById('expenseDate').valueAsDate = new Date();
  }

  formSection.classList.add('show');
  formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeExpenseForm() {
  document.getElementById('addExpenseSection').classList.remove('show');
  document.getElementById('expenseForm').reset();
  editingExpenseId = null;
}

async function handleExpenseSubmit(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('saveExpenseBtn');
  const btnText = saveBtn.querySelector('.btn-text');
  const btnSpinner = saveBtn.querySelector('.btn-spinner');

  try {
    saveBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';

    const expenseData = {
      category: document.getElementById('expenseCategory').value,
      description: document.getElementById('expenseDescription').value,
      amount: parseFloat(document.getElementById('expenseAmount').value),
      date: document.getElementById('expenseDate').value,
      familyMember: document.getElementById('familyMember').value || null,
      claimable: document.getElementById('claimable').checked,
      relatedPolicy: document.getElementById('relatedPolicy').value || null,
      notes: document.getElementById('expenseNotes').value || null,
      userId: currentUser.uid
    };

    if (editingExpenseId) {
      await firestoreService.update('healthcareExpenses', editingExpenseId, expenseData);
      toast.success('Expense updated successfully');
    } else {
      await firestoreService.add('healthcareExpenses', expenseData);
      toast.success('Expense added successfully');
    }

    closeExpenseForm();
    await loadExpenses();
  } catch (error) {
    console.error('Error saving expense:', error);
    toast.error('Failed to save expense');
  } finally {
    saveBtn.disabled = false;
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
  }
}

// Delete functions
window.editPolicy = function(policyId) {
  openPolicyForm(policyId);
};

window.deletePolicy = function(policyId, policyName) {
  deleteItemId = policyId;
  deleteItemType = 'policy';
  document.getElementById('deleteModalTitle').textContent = 'Delete Insurance Policy';
  document.getElementById('deleteMessage').textContent = 'Are you sure you want to delete this insurance policy?';
  document.getElementById('deleteItemName').textContent = policyName;
  document.getElementById('deleteModal').classList.add('show');
};

window.editExpense = function(expenseId) {
  openExpenseForm(expenseId);
};

window.deleteExpense = function(expenseId, description) {
  deleteItemId = expenseId;
  deleteItemType = 'expense';
  document.getElementById('deleteModalTitle').textContent = 'Delete Medical Expense';
  document.getElementById('deleteMessage').textContent = 'Are you sure you want to delete this medical expense?';
  document.getElementById('deleteItemName').textContent = description;
  document.getElementById('deleteModal').classList.add('show');
};

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  deleteItemId = null;
  deleteItemType = null;
}

async function confirmDelete() {
  if (!deleteItemId || !deleteItemType) return;

  try {
    if (deleteItemType === 'policy') {
      await firestoreService.delete('insurancePolicies', deleteItemId);
      toast.success('Policy deleted successfully');
      await loadPolicies();
    } else {
      await firestoreService.delete('healthcareExpenses', deleteItemId);
      toast.success('Expense deleted successfully');
      await loadExpenses();
    }
    closeDeleteModal();
  } catch (error) {
    console.error('Error deleting item:', error);
    toast.error('Failed to delete item');
  }
}

// Initialize on page load
init();
