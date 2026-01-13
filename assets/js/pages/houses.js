// Houses Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import crossFeatureIntegrationService from '../services/cross-feature-integration-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import confirmationModal from '../components/confirmation-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
const state = {
  houses: [],
  filteredHouses: [],
  editingHouseId: null,
  currentPage: 1,
  itemsPerPage: 10,
  totalCount: 0,
  allDataKPI: {
    totalHouses: 0,
    totalValue: 0
  }
};

// DOM Elements
let addHouseBtn, addHouseSection, closeFormBtn, cancelFormBtn;
let houseForm, formTitle, saveFormBtn;
let housesList, emptyState, loadingState;
let totalHousesEl, totalValueEl, monthlyExpensesEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteHouseName, deleteHouseAddress;
let deleteHouseId = null;

// Initialize page
async function init() {
  // Check authentication
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize DOM elements FIRST (before any function that uses them)
  initDOMElements();

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadHouses();
  });

  // Set up event listeners
  setupEventListeners();

  // Load user profile
  loadUserProfile(user);

  // Load houses again after encryption is ready (fixes race condition)
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

  // Logout handled by global logout-handler.js via sidebar.js

  // Add house
  addHouseBtn?.addEventListener('click', showAddForm);
  closeFormBtn?.addEventListener('click', hideForm);
  cancelFormBtn?.addEventListener('click', hideForm);
  houseForm?.addEventListener('submit', handleSubmit);

  // Delete modal
  closeDeleteModalBtn?.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn?.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn?.addEventListener('click', handleDelete);
  
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
      const totalRecords = state.filteredHouses.length;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
  }
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
  saveFormBtn.textContent = 'Save House';
  houseForm.reset();
  
  // Reset button state
  saveFormBtn.disabled = false;
  
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
  saveFormBtn.textContent = 'Update House';

  // Reset button state
  saveFormBtn.disabled = false;

  // Fill form
  document.getElementById('name').value = house.name;
  document.getElementById('type').value = house.type;
  document.getElementById('address').value = house.address;
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
    ownership: document.getElementById('ownership').value,
    notes: document.getElementById('notes').value.trim()
  };

  // Validate required fields
  if (!formData.name) {
    showToast('Property name is required', 'error');
    return;
  }
  if (!formData.type) {
    showToast('Property type is required', 'error');
    return;
  }
  if (!formData.address) {
    showToast('Address is required', 'error');
    return;
  }
  if (!formData.ownership) {
    showToast('Ownership status is required', 'error');
    return;
  }

  // Show loading
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';

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
    saveFormBtn.textContent = originalText;
  }
}

// Load houses
async function loadHouses() {
  loadingState.style.display = 'flex';
  housesList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    const allHouses = await firestoreService.getAll('houses', 'createdAt', 'desc');
    
    state.houses = allHouses;
    state.filteredHouses = [...allHouses];
    state.totalCount = allHouses.length;
    
    calculateKPISummary();
    
    state.currentPage = 1;
    
    if (state.filteredHouses.length === 0) {
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

// Calculate KPI summary
function calculateKPISummary() {
  const totalValue = state.houses.reduce((sum, h) => sum + (h.currentValue || 0), 0);
  
  state.allDataKPI = {
    totalHouses: state.houses.length,
    totalValue: totalValue
  };
}

// Render houses
function renderHouses() {
  const paginationContainer = document.getElementById('paginationContainer');
  
  if (state.filteredHouses.length === 0) {
    housesList.style.display = 'none';
    emptyState.style.display = 'block';
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  housesList.style.display = 'grid';
  emptyState.style.display = 'none';
  
  // Calculate pagination
  const totalRecords = state.filteredHouses.length;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageHouses = state.filteredHouses.slice(startIndex, endIndex);
  
  housesList.innerHTML = pageHouses.map(house => {
    const escapedName = escapeHtml(house.name);
    const escapedAddress = escapeHtml(house.address);
    const escapedOwnership = house.ownership ? escapeHtml(house.ownership) : '';
    const escapedNotes = house.notes ? escapeHtml(house.notes) : '';
    // Escape name for use in onclick handlers
    const safeNameForJs = house.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    return `
      <div class="house-card">
        <div class="house-card-header">
          <div class="house-info">
            <div class="house-name">${escapedName}</div>
            <span class="house-type">${escapeHtml(house.type)}</span>
            <div class="house-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              ${escapedAddress}
            </div>
            ${house.ownership ? `<div class="house-ownership">Status: ${escapedOwnership}</div>` : ''}
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

        <div class="house-card-actions">
          <button class="btn btn-sm btn-outline" onclick="window.addHouseExpense('${house.id}', '${safeNameForJs}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Expense
          </button>
          <button class="btn btn-sm btn-primary" onclick="window.addHouseIncome('${house.id}', '${safeNameForJs}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Income
          </button>
        </div>

        ${house.notes ? `
          <div class="house-notes">
            <strong>Notes:</strong> ${escapedNotes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  // Render pagination
  renderPagination(totalPages);
}

// Render pagination with numbered pages
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

// Generate page numbers with ellipsis
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

// Go to specific page
function goToPage(page) {
  state.currentPage = page;
  renderHouses();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update summary
async function updateSummary() {
  const totalHouses = state.houses.length;
  
  // Get house-related expenses and income
  const houseExpenses = await firestoreService.getTotalExpensesByLinkedType('house');
  const houseIncome = await firestoreService.getTotalIncomeByLinkedType('house');

  totalHousesEl.textContent = totalHouses;
  totalValueEl.textContent = formatCurrency(houseIncome);
  monthlyExpensesEl.textContent = formatCurrency(houseExpenses);
}

// Show delete confirmation
function showDeleteConfirmation(id) {
  const house = state.houses.find(h => h.id === id);
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

  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

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
    confirmDeleteBtn.textContent = originalText;
  }
}

// Edit house
function editHouse(id) {
  const house = state.houses.find(h => h.id === id);
  if (house) {
    showEditForm(house);
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
