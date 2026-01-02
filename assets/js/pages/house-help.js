// House Help Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let staff = [];
let editingHelpId = null;

let addHelpBtn, addHelpSection, closeFormBtn, cancelFormBtn;
let helpForm, formTitle, saveFormBtn, saveFormBtnText, saveFormBtnSpinner;
let helpList, emptyState, loadingState;
let totalStaffEl, monthlySalaryEl, monthlyPaidEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteBtnText, deleteBtnSpinner, deleteHelpName, deleteHelpRole;
let deleteHelpId = null;

async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  initDOMElements();
  setupEventListeners();
  loadUserProfile(user);
  await loadStaff();
  
  // Set default date if element exists
  const joinDateInput = document.getElementById('joinDate');
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
  saveFormBtnText = document.getElementById('saveFormBtnText');
  saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
  helpList = document.getElementById('helpList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalStaffEl = document.getElementById('totalStaff');
  monthlySalaryEl = document.getElementById('monthlySalary');
  monthlyPaidEl = document.getElementById('monthlyPaid');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteBtnText = document.getElementById('deleteBtnText');
  deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
  deleteHelpName = document.getElementById('deleteHelpName');
  deleteHelpRole = document.getElementById('deleteHelpRole');
}

function setupEventListeners() {
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

  sidebarOpen?.addEventListener('click', () => {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
  });

  sidebarClose?.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  addHelpBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  helpForm.addEventListener('submit', handleSubmit);
  closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);
}

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

function showAddForm() {
  editingHelpId = null;
  formTitle.textContent = 'Add Staff';
  saveFormBtnText.textContent = 'Save Staff';
  helpForm.reset();
  
  // Set default date if element exists
  const joinDateInput = document.getElementById('joinDate');
  if (joinDateInput) {
    joinDateInput.valueAsDate = new Date();
  }
  
  document.getElementById('status').value = 'Active';
  addHelpSection.classList.add('active');
  addHelpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  addHelpSection.classList.remove('active');
  helpForm.reset();
  editingHelpId = null;
}

function showEditForm(help) {
  editingHelpId = help.id;
  formTitle.textContent = 'Edit Staff';
  saveFormBtnText.textContent = 'Update Staff';

  document.getElementById('name').value = help.name;
  document.getElementById('role').value = help.role;
  document.getElementById('phone').value = help.phone || '';
  document.getElementById('monthlySalary').value = parseFloat(help.monthlySalary) || 0;
  document.getElementById('joinDate').value = formatDateForInput(help.joinDate);
  document.getElementById('status').value = help.status;
  document.getElementById('notes').value = help.notes || '';

  addHelpSection.classList.add('active');
  addHelpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(e) {
  e.preventDefault();

  const salaryValue = document.getElementById('monthlySalary').value;
  const monthlySalary = parseFloat(salaryValue);
  
  // Validate salary
  if (isNaN(monthlySalary) || monthlySalary < 0) {
    showToast('Please enter a valid salary amount', 'error');
    return;
  }

  const formData = {
    name: document.getElementById('name').value.trim(),
    role: document.getElementById('role').value,
    phone: document.getElementById('phone').value.trim(),
    monthlySalary: monthlySalary,
    joinDate: new Date(document.getElementById('joinDate').value),
    status: document.getElementById('status').value,
    notes: document.getElementById('notes').value.trim()
  };

  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

  try {
    let result;
    if (editingHelpId) {
      result = await firestoreService.update('houseHelps', editingHelpId, formData);
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
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
  }
}

async function loadStaff() {
  loadingState.style.display = 'flex';
  helpList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    staff = await firestoreService.getAll('houseHelps', 'createdAt', 'desc');
    
    if (staff.length === 0) {
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

function renderStaff() {
  helpList.innerHTML = staff.map(help => {
    const statusClass = help.status === 'Active' ? 'active' : 'inactive';
    const joinDuration = calculateDuration(help.joinDate);

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
            <div class="help-salary-value">${formatCurrency(parseFloat(help.monthlySalary) || 0)}</div>
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
}

function updateSummary() {
  const totalStaff = staff.filter(h => h.status === 'Active').length;
  const monthlySalary = staff
    .filter(h => h.status === 'Active')
    .reduce((sum, help) => {
      const salary = parseFloat(help.monthlySalary) || 0;
      return sum + salary;
    }, 0);

  totalStaffEl.textContent = totalStaff;
  monthlySalaryEl.textContent = formatCurrency(monthlySalary);
  monthlyPaidEl.textContent = '₹0'; // Placeholder for future payment tracking
}

function calculateDuration(joinDate) {
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
  const help = staff.find(h => h.id === id);
  if (!help) return;

  deleteHelpId = id;
  deleteHelpName.textContent = help.name;
  deleteHelpRole.textContent = help.role;
  deleteModal.classList.add('active');
}

function hideDeleteModal() {
  deleteModal.classList.remove('active');
  deleteHelpId = null;
}

async function handleDelete() {
  if (!deleteHelpId) return;

  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

  try {
    const result = await firestoreService.delete('houseHelps', deleteHelpId);
    
    if (result.success) {
      showToast('Staff deleted successfully', 'success');
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
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
  }
}

function editHelp(id) {
  const help = staff.find(h => h.id === id);
  if (help) showEditForm(help);
}

async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    showToast('Failed to logout', 'error');
  }
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
