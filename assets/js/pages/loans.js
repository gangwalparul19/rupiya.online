// Loans & EMI Tracker Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/helpers.js';

// Loan type icons
const loanTypeIcons = {
  'home': '🏠',
  'car': '🚗',
  'personal': '💳',
  'education': '🎓',
  'gold': '🥇',
  'business': '💼',
  'two-wheeler': '🏍️',
  'credit-card': '💳',
  'other': '📋'
};

// State
let loans = [];
let currentCalendarDate = new Date();
let editingLoanId = null;

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
    console.error('[Loans] Auth check error:', error);
    window.location.href = 'login.html';
    return false;
  }
}

// Initialize
async function init() {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await initLoansPage();
  }
}

init();

// Initialize page
async function initLoansPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Update user profile in sidebar
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = user.displayName || 'User';
    document.getElementById('userEmail').textContent = user.email;
    
    // Setup event listeners
    setupEventListeners();
    
    // Load loans data
    await loadLoans();
    
    // Render calendar
    renderCalendar();
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
  
  // Theme toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    themeManager.toggleTheme();
  });
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
      await authService.signOut();
      window.location.href = 'index.html';
    }
  });
  
  // Add loan buttons - now opens inline form
  document.getElementById('addLoanBtn')?.addEventListener('click', () => showAddForm());
  document.getElementById('addFirstLoanBtn')?.addEventListener('click', () => showAddForm());
  
  // Inline form controls
  document.getElementById('closeFormBtn')?.addEventListener('click', hideForm);
  document.getElementById('cancelFormBtn')?.addEventListener('click', hideForm);
  document.getElementById('loanForm')?.addEventListener('submit', saveLoan);
  
  // Payment modal
  document.getElementById('closePaymentModal')?.addEventListener('click', closePaymentModal);
  document.getElementById('cancelPaymentBtn')?.addEventListener('click', closePaymentModal);
  document.getElementById('savePaymentBtn')?.addEventListener('click', savePayment);
  
  // Calendar navigation
  document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });
  
  document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });
  
  // Loan filter
  document.getElementById('loanFilter')?.addEventListener('change', renderLoans);
  
  // EMI Calculator inputs
  const principalInput = document.getElementById('principalAmount');
  const rateInput = document.getElementById('interestRate');
  const tenureInput = document.getElementById('tenure');
  
  [principalInput, rateInput, tenureInput].forEach(input => {
    input?.addEventListener('input', calculateEMI);
  });
  
  // Prepayment calculator
  document.getElementById('calculatePrepayment')?.addEventListener('click', calculatePrepayment);
  
  // Close alert
  document.getElementById('closeEmiAlert')?.addEventListener('click', () => {
    document.getElementById('upcomingEmiAlert').style.display = 'none';
  });
}

// Load loans from Firestore
async function loadLoans() {
  try {
    loans = await firestoreService.getLoans() || [];
    updateSummary();
    renderLoans();
    updateCalculatorDropdown();
    checkUpcomingEMIs();
  } catch (error) {
    console.error('Error loading loans:', error);
    toast.error('Failed to load loans');
  }
}

// Update summary cards
function updateSummary() {
  const activeLoans = loans.filter(l => l.status !== 'closed');
  
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
  const totalMonthlyEmi = activeLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
  const totalPaid = loans.reduce((sum, l) => sum + ((l.emisPaid || 0) * (l.emiAmount || 0)), 0);
  
  document.getElementById('totalOutstanding').textContent = formatCurrency(totalOutstanding);
  document.getElementById('totalMonthlyEmi').textContent = formatCurrency(totalMonthlyEmi);
  document.getElementById('totalPaid').textContent = formatCurrency(totalPaid);
  document.getElementById('activeLoansCount').textContent = activeLoans.length;
}

// Render loans grid
function renderLoans() {
  const container = document.getElementById('loansGrid');
  const filter = document.getElementById('loanFilter')?.value || 'all';
  const emptyState = document.getElementById('emptyState');
  
  let filteredLoans = loans;
  if (filter === 'active') {
    filteredLoans = loans.filter(l => l.status !== 'closed');
  } else if (filter === 'closed') {
    filteredLoans = loans.filter(l => l.status === 'closed');
  }
  
  if (filteredLoans.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  container.innerHTML = filteredLoans.map(loan => {
    const icon = loanTypeIcons[loan.loanType] || '📋';
    const progress = loan.tenure > 0 ? ((loan.emisPaid || 0) / loan.tenure) * 100 : 0;
    const remainingEmis = loan.tenure - (loan.emisPaid || 0);
    const endDate = calculateEndDate(loan);
    
    return `
      <div class="loan-card ${loan.status === 'closed' ? 'closed' : ''}" data-id="${loan.id}">
        <div class="loan-card-header">
          <div class="loan-info">
            <div class="loan-type-icon">${icon}</div>
            <div class="loan-details">
              <h4>${escapeHtml(loan.loanName)}</h4>
              <span class="lender">${escapeHtml(loan.lender)}</span>
            </div>
          </div>
          <span class="loan-status ${loan.status || 'active'}">${loan.status || 'Active'}</span>
        </div>
        
        <div class="loan-progress">
          <div class="progress-header">
            <span class="progress-label">EMIs Paid</span>
            <span class="progress-value">${loan.emisPaid || 0} / ${loan.tenure}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        
        <div class="loan-stats">
          <div class="stat-item">
            <div class="stat-label">EMI Amount</div>
            <div class="stat-value">${formatCurrency(loan.emiAmount)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Outstanding</div>
            <div class="stat-value">${formatCurrency(loan.outstandingAmount)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Interest Rate</div>
            <div class="stat-value">${loan.interestRate}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">EMI Date</div>
            <div class="stat-value">${loan.emiDate || '-'}th</div>
          </div>
        </div>
        
        <div class="loan-card-footer">
          <button class="btn btn-sm btn-outline" onclick="window.loansPage.recordPayment('${loan.id}')">
            💰 Pay EMI
          </button>
          <button class="btn btn-sm btn-outline" onclick="window.loansPage.editLoan('${loan.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-outline" onclick="window.loansPage.deleteLoan('${loan.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Render EMI Calendar
function renderCalendar() {
  const container = document.getElementById('emiCalendar');
  const monthLabel = document.getElementById('calendarMonth');
  
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  monthLabel.textContent = new Date(year, month).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  
  // Get EMI dates for this month
  const emiDates = {};
  loans.filter(l => l.status !== 'closed').forEach(loan => {
    const emiDay = loan.emiDate || 1;
    if (!emiDates[emiDay]) {
      emiDates[emiDay] = [];
    }
    emiDates[emiDay].push(loan);
  });
  
  let html = `
    <div class="calendar-header">Sun</div>
    <div class="calendar-header">Mon</div>
    <div class="calendar-header">Tue</div>
    <div class="calendar-header">Wed</div>
    <div class="calendar-header">Thu</div>
    <div class="calendar-header">Fri</div>
    <div class="calendar-header">Sat</div>
  `;
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getDate() === day && 
                    today.getMonth() === month && 
                    today.getFullYear() === year;
    const hasEmi = emiDates[day];
    const emiCount = hasEmi ? hasEmi.length : 0;
    
    let classes = 'calendar-day';
    if (isToday) classes += ' today';
    if (hasEmi) classes += ' has-emi';
    
    html += `
      <div class="${classes}" ${hasEmi ? `title="${emiCount} EMI(s) due"` : ''}>
        <span class="day-number">${day}</span>
        ${hasEmi ? `<span class="emi-indicator">💰</span>` : ''}
        ${emiCount > 1 ? `<span class="emi-count">${emiCount}</span>` : ''}
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// Check for upcoming EMIs
function checkUpcomingEMIs() {
  const today = new Date();
  const upcoming = [];
  
  loans.filter(l => l.status !== 'closed').forEach(loan => {
    const emiDay = loan.emiDate || 1;
    const daysUntil = emiDay - today.getDate();
    
    if (daysUntil >= 0 && daysUntil <= 7) {
      upcoming.push({ loan, daysUntil });
    }
  });
  
  if (upcoming.length > 0) {
    const alertEl = document.getElementById('upcomingEmiAlert');
    const textEl = document.getElementById('upcomingEmiText');
    
    const totalAmount = upcoming.reduce((sum, u) => sum + u.loan.emiAmount, 0);
    const nearestDays = Math.min(...upcoming.map(u => u.daysUntil));
    
    let text = `You have ${upcoming.length} EMI payment(s) totaling ${formatCurrency(totalAmount)} `;
    if (nearestDays === 0) {
      text += 'due today!';
    } else if (nearestDays === 1) {
      text += 'due tomorrow!';
    } else {
      text += `due within ${nearestDays} days.`;
    }
    
    textEl.textContent = text;
    alertEl.style.display = 'flex';
  }
}

// Calculate EMI
function calculateEMI() {
  const principal = parseFloat(document.getElementById('principalAmount').value) || 0;
  const rate = parseFloat(document.getElementById('interestRate').value) || 0;
  const tenure = parseInt(document.getElementById('tenure').value) || 0;
  
  if (principal > 0 && rate > 0 && tenure > 0) {
    const monthlyRate = rate / 12 / 100;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) / 
                (Math.pow(1 + monthlyRate, tenure) - 1);
    
    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - principal;
    
    // Update EMI field
    document.getElementById('emiAmount').value = Math.round(emi);
    
    // Update preview
    const preview = document.getElementById('emiPreview');
    preview.style.display = 'block';
    
    document.getElementById('previewEmi').textContent = formatCurrency(Math.round(emi));
    document.getElementById('previewInterest').textContent = formatCurrency(Math.round(totalInterest));
    document.getElementById('previewTotal').textContent = formatCurrency(Math.round(totalPayment));
    
    // Calculate end date
    const startDate = document.getElementById('startDate').value;
    if (startDate) {
      const end = new Date(startDate);
      end.setMonth(end.getMonth() + tenure);
      document.getElementById('previewEndDate').textContent = formatDate(end);
    }
  }
}

// Calculate end date
function calculateEndDate(loan) {
  if (!loan.startDate) return '-';
  const start = loan.startDate.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
  const remainingMonths = loan.tenure - (loan.emisPaid || 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + loan.tenure);
  return formatDate(end);
}

// Show add form (inline)
function showAddForm(loanId = null) {
  const addLoanSection = document.getElementById('addLoanSection');
  const title = document.getElementById('formTitle');
  const form = document.getElementById('loanForm');
  
  editingLoanId = loanId;
  
  if (loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      title.textContent = 'Edit Loan';
      populateLoanForm(loan);
    }
  } else {
    title.textContent = 'Add New Loan';
    form.reset();
    document.getElementById('startDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('emiPreview').style.display = 'none';
  }
  
  addLoanSection.classList.add('show');
  addLoanSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Hide form (inline)
function hideForm() {
  const addLoanSection = document.getElementById('addLoanSection');
  addLoanSection.classList.remove('show');
  document.getElementById('loanForm').reset();
  editingLoanId = null;
}

// Populate loan form for editing
function populateLoanForm(loan) {
  document.getElementById('loanName').value = loan.loanName || '';
  document.getElementById('loanType').value = loan.loanType || '';
  document.getElementById('lender').value = loan.lender || '';
  document.getElementById('accountNumber').value = loan.accountNumber || '';
  document.getElementById('principalAmount').value = loan.principalAmount || '';
  document.getElementById('interestRate').value = loan.interestRate || '';
  document.getElementById('tenure').value = loan.tenure || '';
  document.getElementById('emiAmount').value = loan.emiAmount || '';
  document.getElementById('emiDate').value = loan.emiDate || '';
  document.getElementById('emisPaid').value = loan.emisPaid || 0;
  document.getElementById('outstandingAmount').value = loan.outstandingAmount || '';
  document.getElementById('notes').value = loan.notes || '';
  
  if (loan.startDate) {
    const date = loan.startDate.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
    document.getElementById('startDate').value = date.toISOString().split('T')[0];
  }
  
  calculateEMI();
}

// Save loan
async function saveLoan(e) {
  e.preventDefault();
  
  const saveFormBtn = document.getElementById('saveFormBtn');
  const saveFormBtnText = document.getElementById('saveFormBtnText');
  const saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
  
  // Show loading state
  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';
  
  const loanData = {
    loanName: document.getElementById('loanName').value.trim(),
    loanType: document.getElementById('loanType').value,
    lender: document.getElementById('lender').value.trim(),
    accountNumber: document.getElementById('accountNumber').value.trim(),
    principalAmount: parseFloat(document.getElementById('principalAmount').value) || 0,
    interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
    tenure: parseInt(document.getElementById('tenure').value) || 0,
    emiAmount: parseFloat(document.getElementById('emiAmount').value) || 0,
    startDate: new Date(document.getElementById('startDate').value),
    emiDate: parseInt(document.getElementById('emiDate').value) || 1,
    emisPaid: parseInt(document.getElementById('emisPaid').value) || 0,
    outstandingAmount: parseFloat(document.getElementById('outstandingAmount').value) || 0,
    notes: document.getElementById('notes').value.trim(),
    status: 'active'
  };
  
  // Calculate outstanding if not provided
  if (!loanData.outstandingAmount && loanData.principalAmount) {
    const paidPrincipal = calculatePaidPrincipal(loanData);
    loanData.outstandingAmount = loanData.principalAmount - paidPrincipal;
  }
  
  // Check if loan is closed
  if (loanData.emisPaid >= loanData.tenure) {
    loanData.status = 'closed';
    loanData.outstandingAmount = 0;
  }
  
  try {
    if (editingLoanId) {
      await firestoreService.updateLoan(editingLoanId, loanData);
      toast.success('Loan updated successfully');
    } else {
      await firestoreService.addLoan(loanData);
      toast.success('Loan added successfully');
    }
    
    hideForm();
    await loadLoans();
    renderCalendar();
  } catch (error) {
    console.error('Error saving loan:', error);
    toast.error('Failed to save loan');
  } finally {
    // Reset loading state
    saveFormBtn.disabled = false;
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
  }
}

// Calculate paid principal (simplified)
function calculatePaidPrincipal(loan) {
  const monthlyRate = loan.interestRate / 12 / 100;
  let balance = loan.principalAmount;
  
  for (let i = 0; i < loan.emisPaid; i++) {
    const interest = balance * monthlyRate;
    const principal = loan.emiAmount - interest;
    balance -= principal;
  }
  
  return loan.principalAmount - Math.max(0, balance);
}

// Record payment modal
function recordPayment(loanId) {
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  
  document.getElementById('paymentLoanId').value = loanId;
  document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('paymentAmount').value = loan.emiAmount;
  document.getElementById('paymentType').value = 'emi';
  document.getElementById('paymentNotes').value = '';
  
  document.getElementById('paymentModal').classList.add('show');
}

// Close payment modal
function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('show');
}

// Save payment
async function savePayment(e) {
  e.preventDefault();
  
  const loanId = document.getElementById('paymentLoanId').value;
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  
  const paymentType = document.getElementById('paymentType').value;
  const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
  
  try {
    // Update loan
    const updates = {};
    
    if (paymentType === 'emi') {
      updates.emisPaid = (loan.emisPaid || 0) + 1;
    }
    
    // Recalculate outstanding
    const monthlyRate = loan.interestRate / 12 / 100;
    const interest = (loan.outstandingAmount || 0) * monthlyRate;
    const principalPaid = paymentAmount - interest;
    updates.outstandingAmount = Math.max(0, (loan.outstandingAmount || 0) - principalPaid);
    
    // Check if loan is closed
    if (updates.emisPaid >= loan.tenure || updates.outstandingAmount <= 0) {
      updates.status = 'closed';
      updates.outstandingAmount = 0;
    }
    
    await firestoreService.updateLoan(loanId, updates);
    
    // Also add as expense
    await firestoreService.addExpense({
      amount: paymentAmount,
      category: 'EMI Payment',
      description: `${loan.loanName} - ${paymentType === 'emi' ? 'EMI' : 'Prepayment'}`,
      date: new Date(document.getElementById('paymentDate').value)
    });
    
    toast.success('Payment recorded successfully');
    closePaymentModal();
    await loadLoans();
    renderCalendar();
  } catch (error) {
    console.error('Error recording payment:', error);
    toast.error('Failed to record payment');
  }
}

// Edit loan
function editLoan(loanId) {
  showAddForm(loanId);
}

// Delete loan
async function deleteLoan(loanId) {
  if (!confirm('Are you sure you want to delete this loan?')) return;
  
  try {
    await firestoreService.deleteLoan(loanId);
    toast.success('Loan deleted successfully');
    await loadLoans();
    renderCalendar();
  } catch (error) {
    console.error('Error deleting loan:', error);
    toast.error('Failed to delete loan');
  }
}

// Update calculator dropdown
function updateCalculatorDropdown() {
  const select = document.getElementById('calcLoanSelect');
  select.innerHTML = '<option value="">Choose a loan</option>' +
    loans.filter(l => l.status !== 'closed').map(loan => 
      `<option value="${loan.id}">${escapeHtml(loan.loanName)} - ${formatCurrency(loan.outstandingAmount)}</option>`
    ).join('');
}

// Calculate prepayment savings
function calculatePrepayment() {
  const loanId = document.getElementById('calcLoanSelect').value;
  const prepayAmount = parseFloat(document.getElementById('prepaymentAmount').value) || 0;
  
  if (!loanId || !prepayAmount) {
    toast.error('Please select a loan and enter prepayment amount');
    return;
  }
  
  const loan = loans.find(l => l.id === loanId);
  if (!loan) return;
  
  const monthlyRate = loan.interestRate / 12 / 100;
  const remainingMonths = loan.tenure - (loan.emisPaid || 0);
  
  // Calculate interest without prepayment
  let balanceWithout = loan.outstandingAmount;
  let interestWithout = 0;
  for (let i = 0; i < remainingMonths && balanceWithout > 0; i++) {
    const interest = balanceWithout * monthlyRate;
    interestWithout += interest;
    balanceWithout -= (loan.emiAmount - interest);
  }
  
  // Calculate interest with prepayment
  let balanceWith = loan.outstandingAmount - prepayAmount;
  let interestWith = 0;
  let monthsWith = 0;
  while (balanceWith > 0 && monthsWith < remainingMonths * 2) {
    const interest = balanceWith * monthlyRate;
    interestWith += interest;
    balanceWith -= (loan.emiAmount - interest);
    monthsWith++;
  }
  
  const interestSaved = Math.max(0, interestWithout - interestWith);
  const tenureReduced = Math.max(0, remainingMonths - monthsWith);
  
  // New closure date
  const startDate = loan.startDate?.toDate ? loan.startDate.toDate() : new Date(loan.startDate);
  const newEndDate = new Date(startDate);
  newEndDate.setMonth(newEndDate.getMonth() + (loan.emisPaid || 0) + monthsWith);
  
  // Show results
  document.getElementById('interestSaved').textContent = formatCurrency(Math.round(interestSaved));
  document.getElementById('tenureReduced').textContent = `${tenureReduced} months`;
  document.getElementById('newClosureDate').textContent = formatDate(newEndDate);
  document.getElementById('calculatorResult').style.display = 'block';
}

// Expose functions globally for onclick handlers
window.loansPage = {
  recordPayment,
  editLoan,
  deleteLoan
};
