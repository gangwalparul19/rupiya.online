// Vehicles Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let vehicles = [];
let editingVehicleId = null;

// DOM Elements
let addVehicleBtn, addVehicleSection, closeFormBtn, cancelFormBtn;
let vehicleForm, formTitle, saveFormBtn, saveFormBtnText, saveFormBtnSpinner;
let vehiclesList, emptyState, loadingState;
let totalVehiclesEl, totalValueEl, monthlyFuelEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteBtnText, deleteBtnSpinner, deleteVehicleName, deleteVehicleDetails;
let deleteVehicleId = null;

// Initialize page
async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  initDOMElements();
  setupEventListeners();
  loadUserProfile(user);
  await loadVehicles();
  document.getElementById('purchaseDate').valueAsDate = new Date();
}

function initDOMElements() {
  addVehicleBtn = document.getElementById('addVehicleBtn');
  addVehicleSection = document.getElementById('addVehicleSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  vehicleForm = document.getElementById('vehicleForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  saveFormBtnText = document.getElementById('saveFormBtnText');
  saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
  vehiclesList = document.getElementById('vehiclesList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalVehiclesEl = document.getElementById('totalVehicles');
  totalValueEl = document.getElementById('totalFuelCost');
  monthlyFuelEl = document.getElementById('totalMaintenanceCost');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteBtnText = document.getElementById('deleteBtnText');
  deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
  deleteVehicleName = document.getElementById('deleteVehicleName');
  deleteVehicleDetails = document.getElementById('deleteVehicleDetails');
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

  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  addVehicleBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  vehicleForm.addEventListener('submit', handleSubmit);
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
  editingVehicleId = null;
  formTitle.textContent = 'Add Vehicle';
  saveFormBtnText.textContent = 'Save Vehicle';
  vehicleForm.reset();
  addVehicleSection.classList.add('show');
  addVehicleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  addVehicleSection.classList.remove('show');
  vehicleForm.reset();
  editingVehicleId = null;
}

function showEditForm(vehicle) {
  editingVehicleId = vehicle.id;
  formTitle.textContent = 'Edit Vehicle';
  saveFormBtnText.textContent = 'Update Vehicle';

  document.getElementById('name').value = vehicle.name;
  document.getElementById('type').value = vehicle.type;
  document.getElementById('make').value = vehicle.make;
  document.getElementById('model').value = vehicle.model;
  document.getElementById('year').value = vehicle.year;
  document.getElementById('registrationNumber').value = vehicle.registrationNumber || '';
  document.getElementById('currentMileage').value = vehicle.currentMileage || 0;
  document.getElementById('fuelType').value = vehicle.fuelType || '';
  document.getElementById('insuranceExpiry').value = vehicle.insuranceExpiry ? formatDateForInput(vehicle.insuranceExpiry) : '';
  document.getElementById('color').value = vehicle.color || '';
  document.getElementById('notes').value = vehicle.notes || '';

  addVehicleSection.classList.add('show');
  addVehicleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(e) {
  e.preventDefault();

  const formData = {
    name: document.getElementById('name').value.trim(),
    type: document.getElementById('type').value,
    make: document.getElementById('make').value.trim(),
    model: document.getElementById('model').value.trim(),
    year: parseInt(document.getElementById('year').value),
    registrationNumber: document.getElementById('registrationNumber').value.trim(),
    currentMileage: parseFloat(document.getElementById('currentMileage').value) || 0,
    fuelType: document.getElementById('fuelType').value,
    insuranceExpiry: document.getElementById('insuranceExpiry').value ? new Date(document.getElementById('insuranceExpiry').value) : null,
    color: document.getElementById('color').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };

  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

  try {
    let result;
    if (editingVehicleId) {
      result = await firestoreService.update('vehicles', editingVehicleId, formData);
      if (result.success) showToast('Vehicle updated successfully', 'success');
    } else {
      result = await firestoreService.add('vehicles', formData);
      if (result.success) showToast('Vehicle added successfully', 'success');
    }

    if (result.success) {
      hideForm();
      await loadVehicles();
    } else {
      showToast(result.error || 'Failed to save vehicle', 'error');
    }
  } catch (error) {
    console.error('Error saving vehicle:', error);
    showToast('Failed to save vehicle', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
  }
}

async function loadVehicles() {
  loadingState.style.display = 'flex';
  vehiclesList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    vehicles = await firestoreService.getAll('vehicles', 'createdAt', 'desc');
    
    if (vehicles.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderVehicles();
      vehiclesList.style.display = 'grid';
    }

    updateSummary();
  } catch (error) {
    console.error('Error loading vehicles:', error);
    showToast('Failed to load vehicles', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

function renderVehicles() {
  vehiclesList.innerHTML = vehicles.map(vehicle => {
    // Check insurance expiry
    let insuranceStatus = '';
    if (vehicle.insuranceExpiry) {
      const expiryDate = vehicle.insuranceExpiry.toDate ? vehicle.insuranceExpiry.toDate() : new Date(vehicle.insuranceExpiry);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        insuranceStatus = '<span class="insurance-warning">⚠️ Insurance Expired</span>';
      } else if (daysUntilExpiry <= 30) {
        insuranceStatus = `<span class="insurance-warning">⚠️ Expires in ${daysUntilExpiry} days</span>`;
      } else {
        insuranceStatus = '<span class="insurance-valid">✓ Insurance Valid</span>';
      }
    }

    return `
      <div class="vehicle-card">
        <div class="vehicle-card-header">
          <div class="vehicle-info">
            <div class="vehicle-name">${vehicle.name}</div>
            <span class="vehicle-type">${vehicle.type}</span>
            <div class="vehicle-details">${vehicle.make} ${vehicle.model} (${vehicle.year})</div>
            ${vehicle.registrationNumber ? `<div class="vehicle-details">Reg: ${vehicle.registrationNumber}</div>` : ''}
            ${vehicle.color ? `<div class="vehicle-details">Color: ${vehicle.color}</div>` : ''}
            ${insuranceStatus}
          </div>
          <div class="vehicle-actions">
            <button class="btn-icon" onclick="window.editVehicle('${vehicle.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${vehicle.id}')" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="vehicle-card-body">
          <div class="vehicle-stat">
            <div class="vehicle-stat-label">Current Mileage</div>
            <div class="vehicle-stat-value">${vehicle.currentMileage ? vehicle.currentMileage.toLocaleString() : '0'} km</div>
          </div>
          <div class="vehicle-stat">
            <div class="vehicle-stat-label">Fuel Type</div>
            <div class="vehicle-stat-value">${vehicle.fuelType || 'N/A'}</div>
          </div>
          ${vehicle.insuranceExpiry ? `
            <div class="vehicle-stat">
              <div class="vehicle-stat-label">Insurance Expiry</div>
              <div class="vehicle-stat-value">${formatDate(vehicle.insuranceExpiry)}</div>
            </div>
          ` : ''}
        </div>

        <div class="vehicle-card-actions">
          <button class="btn btn-sm btn-outline" onclick="window.addVehicleExpense('${vehicle.id}', '${vehicle.name.replace(/'/g, "\\'")}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Expense
          </button>
          <button class="btn btn-sm btn-primary" onclick="window.addVehicleIncome('${vehicle.id}', '${vehicle.name.replace(/'/g, "\\'")}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Income
          </button>
        </div>

        ${vehicle.notes ? `
          <div class="vehicle-notes">
            <strong>Notes:</strong> ${vehicle.notes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function updateSummary() {
  const totalVehicles = vehicles.length;
  
  // Placeholders - will be updated with actual data
  totalVehiclesEl.textContent = totalVehicles;
  totalValueEl.textContent = '₹0';
  monthlyFuelEl.textContent = '₹0';
  
  // Load actual expense/income data
  loadVehicleSummaryData();
}

async function loadVehicleSummaryData() {
  try {
    const vehicleExpenses = await firestoreService.getTotalExpensesByLinkedType('vehicle');
    const vehicleIncome = await firestoreService.getTotalIncomeByLinkedType('vehicle');
    
    totalValueEl.textContent = formatCurrency(vehicleExpenses);
    monthlyFuelEl.textContent = formatCurrency(vehicleIncome);
  } catch (error) {
    console.error('Error loading vehicle summary data:', error);
  }
}

function showDeleteConfirmation(id) {
  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) return;

  deleteVehicleId = id;
  deleteVehicleName.textContent = vehicle.name;
  deleteVehicleDetails.textContent = `${vehicle.make} ${vehicle.model} (${vehicle.year})`;
  deleteModal.classList.add('show');
}

function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteVehicleId = null;
}

async function handleDelete() {
  if (!deleteVehicleId) return;

  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

  try {
    const result = await firestoreService.delete('vehicles', deleteVehicleId);
    
    if (result.success) {
      showToast('Vehicle deleted successfully', 'success');
      hideDeleteModal();
      await loadVehicles();
    } else {
      showToast(result.error || 'Failed to delete vehicle', 'error');
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    showToast('Failed to delete vehicle', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
  }
}

function editVehicle(id) {
  const vehicle = vehicles.find(v => v.id === id);
  if (vehicle) showEditForm(vehicle);
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

window.editVehicle = editVehicle;
window.showDeleteConfirmation = showDeleteConfirmation;
window.addVehicleExpense = addVehicleExpense;
window.addVehicleIncome = addVehicleIncome;

// Add vehicle expense
function addVehicleExpense(vehicleId, vehicleName) {
  // Redirect to expenses page with pre-filled data
  const params = new URLSearchParams({
    linkedType: 'vehicle',
    linkedId: vehicleId,
    linkedName: vehicleName,
    category: 'Vehicle Fuel'
  });
  window.location.href = `expenses.html?${params.toString()}`;
}

// Add vehicle income
function addVehicleIncome(vehicleId, vehicleName) {
  // Redirect to income page with pre-filled data
  const params = new URLSearchParams({
    linkedType: 'vehicle',
    linkedId: vehicleId,
    linkedName: vehicleName,
    source: 'Vehicle Earnings'
  });
  window.location.href = `income.html?${params.toString()}`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
