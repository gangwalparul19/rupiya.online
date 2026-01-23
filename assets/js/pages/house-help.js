// House Help Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import crossFeatureIntegrationService from '../services/cross-feature-integration-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import confirmationModal from '../components/confirmation-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

const state = {
  staff: [],
  filteredStaff: [],
  staffPayments: {},
  editingHelpId: null,
  currentPage: 1,
  itemsPerPage: 10,
  totalCount: 0,
  allDataKPI: {
    totalStaff: 0,
    activeStaff: 0
  }
};

let addHelpBtn, addHelpSection, closeFormBtn, cancelFormBtn;
let helpForm, formTitle, saveFormBtn;
let helpList, emptyState, loadingState;
let totalStaffEl, monthlySalaryEl, monthlyPaidEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteHelpName, deleteHelpRole;
let deleteHelpId = null;

// Payment modal elements
let paymentModal, closePaymentModalBtn, cancelPaymentBtn, savePaymentBtn;
let paymentStaffName, paymentStaffRole, paymentMonthlySalary;
let paymentPaidThisMonth, paymentRemaining;
let paymentForm, paymentAmount, paymentDate, paymentNote;
let paymentHistoryList, noPaymentHistory;
let currentPaymentStaffId = null;

// Delete payment modal elements
let deletePaymentModal, closeDeletePaymentModalBtn, cancelDeletePaymentBtn, confirmDeletePaymentBtn;
let deletePaymentAmount, deletePaymentDate;
let deletePaymentId = null;

async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize DOM elements FIRST (before any function that uses them)
  initDOMElements();

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadStaff();
  });

  setupEventListeners();
  loadUserProfile(user);
  
  // Load data again after encryption is ready (fixes race condition)
  await loadStaff();
  
  // Set default date if element exists
  const joinDateInput = document.querySelector('#helpForm #joinDate');
  if (joinDateInput) {
    joinDateInput.valueAsDate = new Date();
  }
}

function initDOMElements() {
  addHelpBtn = document.getElementById('addHelpBtn');
  addHelpSection = document.getElementById('addHelpSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  helpForm = document.getElementById('helpForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  helpList = document.getElementById('helpList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalStaffEl = document.getElementById('totalStaff');
  monthlySalaryEl = document.getElementById('totalMonthlySalary');
  monthlyPaidEl = document.getElementById('monthlyPaid');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteHelpName = document.getElementById('deleteHelpName');
  deleteHelpRole = document.getElementById('deleteHelpRole');

  // Payment modal elements
  paymentModal = document.getElementById('paymentModal');
  closePaymentModalBtn = document.getElementById('closePaymentModalBtn');
  cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  savePaymentBtn = document.getElementById('savePaymentBtn');
  paymentStaffName = document.getElementById('paymentStaffName');
  paymentStaffRole = document.getElementById('paymentStaffRole');
  paymentMonthlySalary = document.getElementById('paymentMonthlySalary');
  paymentPaidThisMonth = document.getElementById('paymentPaidThisMonth');
  paymentRemaining = document.getElementById('paymentRemaining');
  paymentForm = document.getElementById('paymentForm');
  paymentAmount = document.getElementById('paymentAmount');
  paymentDate = document.getElementById('paymentDate');
  paymentNote = document.getElementById('paymentNote');
  paymentHistoryList = document.getElementById('paymentHistoryList');
  noPaymentHistory = document.getElementById('noPaymentHistory');

  // Delete payment modal elements
  deletePaymentModal = document.getElementById('deletePaymentModal');
  closeDeletePaymentModalBtn = document.getElementById('closeDeletePaymentModalBtn');
  cancelDeletePaymentBtn = document.getElementById('cancelDeletePaymentBtn');
  confirmDeletePaymentBtn = document.getElementById('confirmDeletePaymentBtn');
  deletePaymentAmount = document.getElementById('deletePaymentAmount');
  deletePaymentDate = document.getElementById('deletePaymentDate');
}

function setupEventListeners() {
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
  addHelpBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  helpForm.addEventListener('submit', handleSubmit);
  closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);

  // Payment modal event listeners
  closePaymentModalBtn?.addEventListener('click', hidePaymentModal);
  cancelPaymentBtn?.addEventListener('click', hidePaymentModal);
  savePaymentBtn?.addEventListener('click', handleSavePayment);

  // Delete payment modal event listeners
  closeDeletePaymentModalBtn?.addEventListener('click', hideDeletePaymentModal);
  cancelDeletePaymentBtn?.addEventListener('click', hideDeletePaymentModal);
  confirmDeletePaymentBtn?.addEventListener('click', handleDeletePayment);
  
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
      const totalRecords = state.filteredStaff.length;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
  }
}

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

function showAddForm() {
  state.editingHelpId = null;
  formTitle.textContent = 'Add Staff';
  saveFormBtn.textContent = 'Save Staff';
  helpForm.reset();
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Set default date if element exists
  const joinDateInput = document.querySelector('#helpForm #joinDate');
  if (joinDateInput) {
    joinDateInput.valueAsDate = new Date();
  }
  
  document.querySelector('#helpForm #status').value = 'Active';
  addHelpSection.classList.add('show');
  addHelpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  addHelpSection.classList.remove('show');
  helpForm.reset();
  state.editingHelpId = null;
}

function showEditForm(help) {
  state.editingHelpId = help.id;
  formTitle.textContent = 'Edit Staff';
  saveFormBtn.textContent = 'Update Staff';

  // Reset button state
  saveFormBtn.disabled = false;

  const nameInput = document.querySelector('#helpForm #name');
  const roleInput = document.querySelector('#helpForm #role');
  const phoneInput = document.querySelector('#helpForm #phone');
  const salaryInput = document.querySelector('#helpForm #monthlySalary');
  const joinDateInput = document.querySelector('#helpForm #joinDate');
  const statusInput = document.querySelector('#helpForm #status');
  const notesInput = document.querySelector('#helpForm #notes');

  if (nameInput) nameInput.value = help.name;
  if (roleInput) roleInput.value = help.role;
  if (phoneInput) phoneInput.value = help.phone || '';
  if (salaryInput) salaryInput.value = parseFloat(help.monthlySalary) || 0;
  if (joinDateInput) joinDateInput.value = formatDateForInput(help.joinDate);
  if (statusInput) statusInput.value = help.status;
  if (notesInput) notesInput.value = help.notes || '';

  addHelpSection.classList.add('show');
  addHelpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(e) {
  e.preventDefault();

  const salaryInput = document.querySelector('#helpForm #monthlySalary');
  const nameInput = document.querySelector('#helpForm #name');
  const roleInput = document.querySelector('#helpForm #role');
  const phoneInput = document.querySelector('#helpForm #phone');
  const joinDateInput = document.querySelector('#helpForm #joinDate');
  const statusInput = document.querySelector('#helpForm #status');
  const notesInput = document.querySelector('#helpForm #notes');
  
  // Validate required elements exist
  if (!salaryInput || !nameInput || !roleInput || !joinDateInput || !statusInput) {
    showToast('Form error: Missing required fields', 'error');
    return;
  }
  
  const salaryValue = salaryInput.value;
  const monthlySalary = parseFloat(salaryValue);
  
  // Validate salary
  if (salaryValue === '' || isNaN(monthlySalary) || monthlySalary < 0) {
    showToast('Please enter a valid salary amount', 'error');
    return;
  }

  const formData = {
    name: nameInput.value.trim(),
    role: roleInput.value,
    phone: phoneInput ? phoneInput.value.trim() : '',
    monthlySalary: monthlySalary,
    joinDate: new Date(joinDateInput.value),
    status: statusInput.value,
    notes: notesInput ? notesInput.value.trim() : ''
  };

  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';

  try {
    let result;
    if (state.editingHelpId) {
      result = await firestoreService.update('houseHelps', state.editingHelpId, formData);
      if (result.success) showToast('Staff updated successfully', 'success');
    } else {
      result = await firestoreService.add('houseHelps', formData);
      if (result.success) showToast('Staff added successfully', 'success');
    }

    if (result.success) {
      hideForm();
      await loadStaff();
    } else {
      showToast(result.error || 'Failed to save staff', 'error');
    }
  } catch (error) {
    console.error('Error saving staff:', error);
    showToast('Failed to save staff', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

async function loadStaff() {
  loadingState.style.display = 'flex';
  helpList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    // Load staff and payments in parallel
    const [staffData] = await Promise.all([
      firestoreService.getAll('houseHelps', 'createdAt', 'desc'),
      loadAllPayments()
    ]);
    
    state.staff = staffData;
    state.filteredStaff = [...staffData];
    state.totalCount = staffData.length;
    
    calculateKPISummary();
    state.currentPage = 1;
    
    if (state.filteredStaff.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderStaff();
      helpList.style.display = 'grid';
    }

    updateSummary();
  } catch (error) {
    console.error('Error loading staff:', error);
    showToast('Failed to load staff', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

function calculateKPISummary() {
  const activeStaff = state.staff.filter(s => s.status === 'Active').length;
  
  state.allDataKPI = {
    totalStaff: state.staff.length,
    activeStaff: activeStaff
  };
}

function renderStaff() {
  const paginationContainer = document.getElementById('paginationContainer');
  
  if (state.filteredStaff.length === 0) {
    helpList.style.display = 'none';
    emptyState.style.display = 'block';
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  helpList.style.display = 'grid';
  emptyState.style.display = 'none';
  
  const totalRecords = state.filteredStaff.length;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageStaff = state.filteredStaff.slice(startIndex, endIndex);
  
  helpList.innerHTML = pageStaff.map(help => {
    const statusClass = help.status === 'Active' ? 'active' : 'inactive';
    const joinDuration = calculateDuration(help.joinDate);
    const payments = state.staffPayments[help.id] || [];
    const paidThisMonth = calculatePaidThisMonth(payments);
    const monthlySalary = parseFloat(help.monthlySalary) || 0;
    const remaining = Math.max(0, monthlySalary - paidThisMonth);

    return `
      <div class="help-card">
        <div class="help-card-header">
          <div class="help-info">
            <div class="help-name">${help.name}</div>
            <span class="help-role">${help.role}</span>
            <span class="help-status ${statusClass}">${help.status}</span>
            ${help.phone ? `
              <div class="help-phone">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                ${help.phone}
              </div>
            ` : ''}
          </div>
          <div class="help-actions">
            <button class="btn-icon btn-payment" onclick="window.showPaymentModal('${help.id}')" title="Record Payment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="window.editHelp('${help.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${help.id}')" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="help-card-body">
          <div class="help-stat">
            <div class="help-stat-label">Duration</div>
            <div class="help-stat-value">${joinDuration}</div>
          </div>
          <div class="help-stat">
            <div class="help-stat-label">Join Date</div>
            <div class="help-stat-value">${formatDate(help.joinDate)}</div>
          </div>
        </div>

        <div class="help-card-footer">
          <div class="help-salary">
            <div class="help-salary-label">Monthly Salary</div>
            <div class="help-salary-value">${formatCurrency(monthlySalary)}</div>
          </div>
        </div>

        <div class="help-payment-status">
          <div class="payment-progress-bar">
            <div class="payment-progress-fill" style="width: ${monthlySalary > 0 ? Math.min(100, (paidThisMonth / monthlySalary) * 100) : 0}%"></div>
          </div>
          <div class="payment-status-info">
            <span class="payment-paid">Paid: ${formatCurrency(paidThisMonth)}</span>
            <span class="payment-remaining ${remaining > 0 ? 'has-remaining' : 'fully-paid'}">
              ${remaining > 0 ? `Remaining: ${formatCurrency(remaining)}` : '✓ Fully Paid'}
            </span>
          </div>
        </div>

        ${help.notes ? `
          <div class="help-notes">
            ${help.notes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  renderPagination(totalPages);
}

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

function goToPage(page) {
  state.currentPage = page;
  renderStaff();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateSummary() {
  const totalStaff = state.staff.filter(h => h.status === 'Active').length;
  const monthlySalary = state.staff
    .filter(h => h.status === 'Active')
    .reduce((sum, help) => {
      const salary = parseFloat(help.monthlySalary) || 0;
      return sum + salary;
    }, 0);

  // Calculate total paid this month across all staff
  let totalPaidThisMonth = 0;
  state.staff.forEach(help => {
    const payments = state.staffPayments[help.id] || [];
    totalPaidThisMonth += calculatePaidThisMonth(payments);
  });

  totalStaffEl.textContent = totalStaff;
  monthlySalaryEl.textContent = formatCurrency(monthlySalary);
  monthlyPaidEl.textContent = formatCurrency(totalPaidThisMonth);
}

function calculatePaidThisMonth(payments) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return payments
    .filter(payment => {
      const paymentDate = payment.date?.toDate ? payment.date.toDate() : new Date(payment.date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
}

function getThisMonthPayments(payments) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return payments.filter(payment => {
    const paymentDate = payment.date?.toDate ? payment.date.toDate() : new Date(payment.date);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  });
}

async function loadPaymentsForStaff(staffId) {
  try {
    const payments = await firestoreService.getAll('houseHelpPayments', 'date', 'desc');
    return payments.filter(p => p.staffId === staffId);
  } catch (error) {
    console.error('Error loading payments:', error);
    return [];
  }
}

async function loadAllPayments() {
  try {
    const payments = await firestoreService.getAll('houseHelpPayments', 'date', 'desc');
    // Group payments by staff ID
    state.staffPayments = {};
    payments.forEach(payment => {
      if (!state.staffPayments[payment.staffId]) {
        state.staffPayments[payment.staffId] = [];
      }
      state.staffPayments[payment.staffId].push(payment);
    });
  } catch (error) {
    console.error('Error loading all payments:', error);
    state.staffPayments = {};
  }
}

async function showPaymentModal(staffId) {
  const help = state.staff.find(h => h.id === staffId);
  if (!help) return;

  currentPaymentStaffId = staffId;
  
  // Set staff info
  paymentStaffName.textContent = help.name;
  paymentStaffRole.textContent = help.role;
  
  const monthlySalary = parseFloat(help.monthlySalary) || 0;
  paymentMonthlySalary.textContent = formatCurrency(monthlySalary);
  
  // Load payments for this staff
  const payments = await loadPaymentsForStaff(staffId);
  state.staffPayments[staffId] = payments;
  
  const paidThisMonth = calculatePaidThisMonth(payments);
  const remaining = Math.max(0, monthlySalary - paidThisMonth);
  
  paymentPaidThisMonth.textContent = formatCurrency(paidThisMonth);
  paymentRemaining.textContent = formatCurrency(remaining);
  
  // Set default values
  paymentAmount.value = remaining > 0 ? remaining : '';
  paymentDate.valueAsDate = new Date();
  paymentNote.value = '';
  
  // Render payment history
  renderPaymentHistory(payments);
  
  paymentModal.classList.add('show');
}

function hidePaymentModal() {
  paymentModal.classList.remove('show');
  currentPaymentStaffId = null;
  paymentForm.reset();
}

function renderPaymentHistory(payments) {
  const thisMonthPayments = getThisMonthPayments(payments);
  
  if (thisMonthPayments.length === 0) {
    paymentHistoryList.innerHTML = '';
    noPaymentHistory.style.display = 'block';
    return;
  }
  
  noPaymentHistory.style.display = 'none';
  paymentHistoryList.innerHTML = thisMonthPayments.map(payment => {
    const paymentDate = payment.date?.toDate ? payment.date.toDate() : new Date(payment.date);
    return `
      <div class="payment-history-item">
        <div class="payment-history-info">
          <span class="payment-history-amount">${formatCurrency(parseFloat(payment.amount) || 0)}</span>
          <span class="payment-history-date">${formatDate(paymentDate)}</span>
          ${payment.note ? `<span class="payment-history-note">${payment.note}</span>` : ''}
        </div>
        <button class="btn-icon btn-danger btn-sm" onclick="window.showDeletePaymentConfirmation('${payment.id}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

async function handleSavePayment() {
  if (!currentPaymentStaffId) return;
  
  const amount = parseFloat(paymentAmount.value);
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  
  if (!paymentDate.value) {
    showToast('Please select a date', 'error');
    return;
  }
  
  const originalText = savePaymentBtn.textContent;
  savePaymentBtn.disabled = true;
  savePaymentBtn.textContent = 'Saving...';
  
  try {
    // Get staff details for expense description
    const help = state.staff.find(h => h.id === currentPaymentStaffId);
    const staffName = help ? help.name : 'House Help';
    const staffRole = help ? help.role : 'Staff';
    
    const paymentData = {
      staffId: currentPaymentStaffId,
      amount: amount,
      date: new Date(paymentDate.value),
      note: paymentNote.value.trim()
    };
    
    // Save payment record
    const result = await firestoreService.add('houseHelpPayments', paymentData);
    
    if (result.success) {
      // Use cross-feature integration to create expense
      await crossFeatureIntegrationService.createHouseHelpSalaryExpense(
        currentPaymentStaffId,
        staffName,
        staffRole,
        {
          amount: amount,
          date: new Date(paymentDate.value),
          note: paymentNote.value.trim(),
          paymentId: result.id
        }
      );
      
      showToast('Payment recorded successfully', 'success');
      
      // Reload payments and refresh UI
      await loadAllPayments();
      
      // Update the modal with new data
      if (help) {
        const payments = state.staffPayments[currentPaymentStaffId] || [];
        const monthlySalary = parseFloat(help.monthlySalary) || 0;
        const paidThisMonth = calculatePaidThisMonth(payments);
        const remaining = Math.max(0, monthlySalary - paidThisMonth);
        
        paymentPaidThisMonth.textContent = formatCurrency(paidThisMonth);
        paymentRemaining.textContent = formatCurrency(remaining);
        
        renderPaymentHistory(payments);
      }
      
      // Clear form
      paymentAmount.value = '';
      paymentNote.value = '';
      
      // Refresh staff list
      renderStaff();
      updateSummary();
    } else {
      showToast(result.error || 'Failed to record payment', 'error');
    }
  } catch (error) {
    console.error('Error saving payment:', error);
    showToast('Failed to record payment', 'error');
  } finally {
    savePaymentBtn.disabled = false;
    savePaymentBtn.textContent = originalText;
  }
}

function showDeletePaymentConfirmation(paymentId) {
  // Find the payment
  let payment = null;
  for (const staffId in state.staffPayments) {
    const found = state.staffPayments[staffId].find(p => p.id === paymentId);
    if (found) {
      payment = found;
      break;
    }
  }
  
  if (!payment) return;
  
  deletePaymentId = paymentId;
  deletePaymentAmount.textContent = formatCurrency(parseFloat(payment.amount) || 0);
  const paymentDateVal = payment.date?.toDate ? payment.date.toDate() : new Date(payment.date);
  deletePaymentDate.textContent = formatDate(paymentDateVal);
  deletePaymentModal.classList.add('show');
}

function hideDeletePaymentModal() {
  deletePaymentModal.classList.remove('show');
  deletePaymentId = null;
}

async function handleDeletePayment() {
  if (!deletePaymentId) return;
  
  const originalText = confirmDeletePaymentBtn.textContent;
  confirmDeletePaymentBtn.disabled = true;
  confirmDeletePaymentBtn.textContent = 'Deleting...';
  
  try {
    // Find and delete the corresponding expense (optimized - single query)
    const linkedExpense = await firestoreService.findExpenseByField('houseHelpPaymentId', deletePaymentId);
    
    if (linkedExpense) {
      await firestoreService.deleteExpense(linkedExpense.id);
    }
    
    // Then delete the payment record
    const result = await firestoreService.delete('houseHelpPayments', deletePaymentId);
    
    if (result.success) {
      showToast('Payment deleted successfully', 'success');
      hideDeletePaymentModal();
      
      // Reload payments and refresh UI
      await loadAllPayments();
      
      // Update the payment modal if it's open
      if (currentPaymentStaffId) {
        const help = state.staff.find(h => h.id === currentPaymentStaffId);
        if (help) {
          const payments = state.staffPayments[currentPaymentStaffId] || [];
          const monthlySalary = parseFloat(help.monthlySalary) || 0;
          const paidThisMonth = calculatePaidThisMonth(payments);
          const remaining = Math.max(0, monthlySalary - paidThisMonth);
          
          paymentPaidThisMonth.textContent = formatCurrency(paidThisMonth);
          paymentRemaining.textContent = formatCurrency(remaining);
          
          renderPaymentHistory(payments);
        }
      }
      
      // Refresh staff list
      renderStaff();
      updateSummary();
    } else {
      showToast(result.error || 'Failed to delete payment', 'error');
    }
  } catch (error) {
    console.error('Error deleting payment:', error);
    showToast('Failed to delete payment', 'error');
  } finally {
    confirmDeletePaymentBtn.disabled = false;
    confirmDeletePaymentBtn.textContent = originalText;
  }
}

function calculateDuration(joinDate) {
  if (!joinDate) return 'N/A';
  const start = joinDate.toDate ? joinDate.toDate() : new Date(joinDate);
  const now = new Date();
  const months = Math.floor((now - start) / (1000 * 60 * 60 * 24 * 30));
  
  if (months < 1) return 'Less than a month';
  if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}

function showDeleteConfirmation(id) {
  const help = state.staff.find(h => h.id === id);
  if (!help) return;

  deleteHelpId = id;
  deleteHelpName.textContent = help.name;
  deleteHelpRole.textContent = help.role;
  deleteModal.classList.add('show');
}

function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteHelpId = null;
}

async function handleDelete() {
  if (!deleteHelpId) return;

  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    // First, delete all payments for this staff member
    const staffPayments = state.staffPayments[deleteHelpId] || [];
    for (const payment of staffPayments) {
      // Find and delete the corresponding expense
      const linkedExpense = await firestoreService.findExpenseByField('houseHelpPaymentId', payment.id);
      if (linkedExpense) {
        await firestoreService.delete('expenses', linkedExpense.id);
      }
      // Delete the payment record
      await firestoreService.delete('houseHelpPayments', payment.id);
    }
    
    // Delete all expenses linked to this staff member
    const allExpenses = await firestoreService.getAll('expenses', 'createdAt', 'desc');
    const staffExpenses = allExpenses.filter(exp => exp.linkedType === 'houseHelp' && exp.linkedId === deleteHelpId);
    for (const expense of staffExpenses) {
      await firestoreService.delete('expenses', expense.id);
    }
    
    // Finally, delete the staff member
    const result = await firestoreService.delete('houseHelps', deleteHelpId);
    
    if (result.success) {
      showToast('Staff and all related data deleted successfully', 'success');
      hideDeleteModal();
      await loadStaff();
    } else {
      showToast(result.error || 'Failed to delete staff', 'error');
    }
  } catch (error) {
    console.error('Error deleting staff:', error);
    showToast('Failed to delete staff', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}

function editHelp(id) {
  const help = state.staff.find(h => h.id === id);
  if (help) showEditForm(help);
}


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

window.editHelp = editHelp;
window.showDeleteConfirmation = showDeleteConfirmation;
window.showPaymentModal = showPaymentModal;
window.showDeletePaymentConfirmation = showDeletePaymentConfirmation;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
