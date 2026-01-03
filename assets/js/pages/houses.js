// Houses Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let houses = [];
let editingHouseId = null;

// DOM Elements
let addHouseBtn, addHouseSection, closeFormBtn, cancelFormBtn;
let houseForm, formTitle, saveFormBtn, saveFormBtnText, saveFormBtnSpinner;
let housesList, emptyState, loadingState;
let totalHousesEl, totalValueEl, monthlyExpensesEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteBtnText, deleteBtnSpinner, deleteHouseName, deleteHouseAddress;
let deleteHouseId = null;

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

  // Load houses
  await loadHouses();

  // Set default date to today if element exists
  const purchaseDateInput = document.getElementById('purchaseDate');
  if (purchaseDateInput) {
    purchaseDateInput.valueAsDate = new Date();
  }
}

// Initialize DOM elements
function initDOMElements() {
  addHouseBtn = document.getElementById('addHouseBtn');
  addHouseSection = document.getElementById('addHouseSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  houseForm = document.getElementById('houseForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  saveFormBtnText = document.getElementById('saveFormBtnText');
  saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
  housesList = document.getElementById('housesList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalHousesEl = document.getElementById('totalHouses');
  totalValueEl = document.getElementById('totalIncome');
  monthlyExpensesEl = document.getElementById('totalExpenses');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteBtnText = document.getElementById('deleteBtnText');
  deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
  deleteHouseName = document.getElementById('deleteHouseName');
  deleteHouseAddress = document.getElementById('deleteHouseAddress');
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

  // Add house
  addHouseBtn?.addEventListener('click', showAddForm);
  closeFormBtn?.addEventListener('click', hideForm);
  cancelFormBtn?.addEventListener('click', hideForm);
  houseForm?.addEventListener('submit', handleSubmit);

  // Delete modal
  closeDeleteModalBtn?.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn?.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn?.addEventListener('click', handleDelete);
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
  editingHouseId = null;
  formTitle.textContent = 'Add House';
  saveFormBtnText.textContent = 'Save House';
  houseForm.reset();
  addHouseSection.classList.add('show');
  addHouseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Hide form
function hideForm() {
  addHouseSection.classList.remove('show');
  houseForm.reset();
  editingHouseId = null;
}

// Show edit form
function showEditForm(house) {
  editingHouseId = house.id;
  formTitle.textContent = 'Edit House';
  saveFormBtnText.textContent = 'Update House';

  // Fill form
  document.getElementById('name').value = house.name;
  document.getElementById('type').value = house.type;
  document.getElementById('address').value = house.address;
  document.getElementById('area').value = house.area || '';
  document.getElementById('ownership').value = house.ownership || 'Owned';
  document.getElementById('notes').value = house.notes || '';

  addHouseSection.classList.add('show');
  addHouseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();

  // Get form data
  const formData = {
    name: document.getElementById('name').value.trim(),
    type: document.getElementById('type').value,
    address: document.getElementById('address').value.trim(),
    area: parseFloat(document.getElementById('area').value) || 0,
    ownership: document.getElementById('ownership').value,
    notes: document.getElementById('notes').value.trim()
  };

  // Show loading
  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

  try {
    let result;
    if (editingHouseId) {
      // Update existing house
      result = await firestoreService.update('houses', editingHouseId, formData);
      if (result.success) {
        showToast('Property updated successfully', 'success');
      }
    } else {
      // Add new house
      result = await firestoreService.add('houses', formData);
      if (result.success) {
        showToast('Property added successfully', 'success');
      }
    }

    if (result.success) {
      hideForm();
      await loadHouses();
    } else {
      showToast(result.error || 'Failed to save property', 'error');
    }
  } catch (error) {
    console.error('Error saving house:', error);
    showToast('Failed to save property', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
  }
}

// Load houses
async function loadHouses() {
  loadingState.style.display = 'flex';
  housesList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    houses = await firestoreService.getAll('houses', 'createdAt', 'desc');
    
    if (houses.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderHouses();
      housesList.style.display = 'grid';
    }

    updateSummary();
  } catch (error) {
    console.error('Error loading houses:', error);
    showToast('Failed to load properties', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// Render houses
function renderHouses() {
  housesList.innerHTML = houses.map(house => {
    return `
      <div class="house-card">
        <div class="house-card-header">
          <div class="house-info">
            <div class="house-name">${house.name}</div>
            <span class="house-type">${house.type}</span>
            <div class="house-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              ${house.address}
            </div>
            ${house.ownership ? `<div class="house-ownership">Status: ${house.ownership}</div>` : ''}
          </div>
          <div class="house-actions">
            <button class="btn-icon" onclick="window.editHouse('${house.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${house.id}')" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="house-card-body">
          ${house.area ? `
            <div class="house-stat">
              <div class="house-stat-label">Area</div>
              <div class="house-stat-value">${house.area.toLocaleString()} sq ft</div>
            </div>
          ` : ''}
        </div>

        <div class="house-card-actions">
          <button class="btn btn-sm btn-outline" onclick="window.addHouseExpense('${house.id}', '${house.name.replace(/'/g, "\\'")}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Expense
          </button>
          <button class="btn btn-sm btn-primary" onclick="window.addHouseIncome('${house.id}', '${house.name.replace(/'/g, "\\'")}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Income
          </button>
        </div>

        ${house.notes ? `
          <div class="house-notes">
            <strong>Notes:</strong> ${house.notes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Update summary
async function updateSummary() {
  const totalHouses = houses.length;
  
  // Get house-related expenses and income
  const houseExpenses = await firestoreService.getTotalExpensesByLinkedType('house');
  const houseIncome = await firestoreService.getTotalIncomeByLinkedType('house');

  totalHousesEl.textContent = totalHouses;
  totalValueEl.textContent = formatCurrency(houseIncome);
  monthlyExpensesEl.textContent = formatCurrency(houseExpenses);
}

// Show delete confirmation
function showDeleteConfirmation(id) {
  const house = houses.find(h => h.id === id);
  if (!house) return;

  deleteHouseId = id;
  deleteHouseName.textContent = house.name;
  deleteHouseAddress.textContent = house.address;
  deleteModal.classList.add('show');
}

// Hide delete modal
function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteHouseId = null;
}

// Handle delete
async function handleDelete() {
  if (!deleteHouseId) return;

  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

  try {
    const result = await firestoreService.delete('houses', deleteHouseId);
    
    if (result.success) {
      showToast('Property deleted successfully', 'success');
      hideDeleteModal();
      await loadHouses();
    } else {
      showToast(result.error || 'Failed to delete property', 'error');
    }
  } catch (error) {
    console.error('Error deleting house:', error);
    showToast('Failed to delete property', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
  }
}

// Edit house
function editHouse(id) {
  const house = houses.find(h => h.id === id);
  if (house) {
    showEditForm(house);
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
window.editHouse = editHouse;
window.showDeleteConfirmation = showDeleteConfirmation;
window.addHouseExpense = addHouseExpense;
window.addHouseIncome = addHouseIncome;

// Add house expense
function addHouseExpense(houseId, houseName) {
  // Redirect to expenses page with pre-filled data
  const params = new URLSearchParams({
    linkedType: 'house',
    linkedId: houseId,
    linkedName: houseName,
    category: 'House Maintenance'
  });
  window.location.href = `expenses.html?${params.toString()}`;
}

// Add house income
function addHouseIncome(houseId, houseName) {
  // Redirect to income page with pre-filled data
  const params = new URLSearchParams({
    linkedType: 'house',
    linkedId: houseId,
    linkedName: houseName,
    source: 'House Rent'
  });
  window.location.href = `income.html?${params.toString()}`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
