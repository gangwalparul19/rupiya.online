// Vehicles Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import crossFeatureIntegrationService from '../services/cross-feature-integration-service.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import { formatCurrency, formatCurrencyCompact, formatDate, escapeHtml, formatDateForInput } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

// State
let vehicles = [];
let fuelLogs = [];
let editingVehicleId = null;

// DOM Elements
let addVehicleBtn, addVehicleSection, closeFormBtn, cancelFormBtn;
let vehicleForm, formTitle, saveFormBtn;
let vehiclesList, emptyState, loadingState;
let totalVehiclesEl, avgMileageEl;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteVehicleName, deleteVehicleDetails;
let deleteVehicleId = null;

// Fuel Log Modal Elements
let fuelLogModal, closeFuelLogModalBtn, cancelFuelLogBtn, saveFuelLogBtn;
let fuelLogForm, fuelLogVehicleId, fuelLogVehicleName;

// Mileage History Modal Elements
let mileageHistoryModal, closeMileageHistoryBtn, closeMileageHistoryFooterBtn;
let mileageVehicleName, fuelLogList;
let vehicleAvgMileage, vehicleTotalDistance, vehicleTotalFuelCost, vehicleCostPerKm;

// Initialize page
async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadVehicles();
  });

  initDOMElements();
  setupEventListeners();
  loadUserProfile(user);
  await loadVehicles();
  
  // Set default date if element exists
  const purchaseDateInput = document.getElementById('purchaseDate');
  if (purchaseDateInput) {
    purchaseDateInput.valueAsDate = new Date();
  }
}

function initDOMElements() {
  addVehicleBtn = document.getElementById('addVehicleBtn');
  addVehicleSection = document.getElementById('addVehicleSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  vehicleForm = document.getElementById('vehicleForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  vehiclesList = document.getElementById('vehiclesList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalVehiclesEl = document.getElementById('totalVehicles');
  avgMileageEl = document.getElementById('avgMileage');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteVehicleName = document.getElementById('deleteVehicleName');
  deleteVehicleDetails = document.getElementById('deleteVehicleDetails');
  
  // Fuel Log Modal Elements
  fuelLogModal = document.getElementById('fuelLogModal');
  closeFuelLogModalBtn = document.getElementById('closeFuelLogModalBtn');
  cancelFuelLogBtn = document.getElementById('cancelFuelLogBtn');
  saveFuelLogBtn = document.getElementById('saveFuelLogBtn');
  fuelLogForm = document.getElementById('fuelLogForm');
  fuelLogVehicleId = document.getElementById('fuelLogVehicleId');
  fuelLogVehicleName = document.getElementById('fuelLogVehicleName');
  
  // Mileage History Modal Elements
  mileageHistoryModal = document.getElementById('mileageHistoryModal');
  closeMileageHistoryBtn = document.getElementById('closeMileageHistoryBtn');
  closeMileageHistoryFooterBtn = document.getElementById('closeMileageHistoryFooterBtn');
  mileageVehicleName = document.getElementById('mileageVehicleName');
  fuelLogList = document.getElementById('fuelLogList');
  vehicleAvgMileage = document.getElementById('vehicleAvgMileage');
  vehicleTotalDistance = document.getElementById('vehicleTotalDistance');
  vehicleTotalFuelCost = document.getElementById('vehicleTotalFuelCost');
  vehicleCostPerKm = document.getElementById('vehicleCostPerKm');
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
  addVehicleBtn?.addEventListener('click', showAddForm);
  closeFormBtn?.addEventListener('click', hideForm);
  cancelFormBtn?.addEventListener('click', hideForm);
  vehicleForm?.addEventListener('submit', handleSubmit);
  closeDeleteModalBtn?.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn?.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn?.addEventListener('click', handleDelete);
  
  // Fuel Log Modal Events
  closeFuelLogModalBtn?.addEventListener('click', hideFuelLogModal);
  cancelFuelLogBtn?.addEventListener('click', hideFuelLogModal);
  saveFuelLogBtn?.addEventListener('click', handleSaveFuelLog);
  
  // Auto-calculate total cost
  document.getElementById('fuelQuantity')?.addEventListener('input', calculateTotalCost);
  document.getElementById('fuelPrice')?.addEventListener('input', calculateTotalCost);
  
  // Mileage History Modal Events
  closeMileageHistoryBtn?.addEventListener('click', hideMileageHistoryModal);
  closeMileageHistoryFooterBtn?.addEventListener('click', hideMileageHistoryModal);
  
  // Maintenance Modal Events
  document.getElementById('closeMaintenanceModalBtn')?.addEventListener('click', hideMaintenanceModal);
  document.getElementById('cancelMaintenanceBtn')?.addEventListener('click', hideMaintenanceModal);
  document.getElementById('saveMaintenanceBtn')?.addEventListener('click', handleSaveMaintenance);
  
  // Vehicle Income Modal Events
  document.getElementById('closeVehicleIncomeModalBtn')?.addEventListener('click', hideVehicleIncomeModal);
  document.getElementById('cancelVehicleIncomeBtn')?.addEventListener('click', hideVehicleIncomeModal);
  document.getElementById('saveVehicleIncomeBtn')?.addEventListener('click', handleSaveVehicleIncome);
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
  saveFormBtn.textContent = 'Save Vehicle';
  vehicleForm.reset();
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  addVehicleSection.classList.add('show');
  addVehicleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  addVehicleSection.classList.remove('show');
  vehicleForm.reset();
  editingVehicleId = null;
  // Reset button state
  saveFormBtn.disabled = false;
  saveFormBtn.textContent = 'Save Vehicle';
}

function showEditForm(vehicle) {
  editingVehicleId = vehicle.id;
  formTitle.textContent = 'Edit Vehicle';
  saveFormBtn.textContent = 'Update Vehicle';

  // Reset button state
  saveFormBtn.disabled = false;

  document.getElementById('name').value = vehicle.name;
  document.getElementById('type').value = vehicle.type;
  document.getElementById('registrationNumber').value = vehicle.registrationNumber || '';
  document.getElementById('currentMileage').value = vehicle.currentMileage || 0;
  document.getElementById('fuelType').value = vehicle.fuelType || '';
  document.getElementById('insuranceExpiry').value = vehicle.insuranceExpiry ? formatDateForInput(vehicle.insuranceExpiry) : '';
  document.getElementById('notes').value = vehicle.notes || '';

  addVehicleSection.classList.add('show');
  addVehicleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(e) {
  e.preventDefault();

  const formData = {
    name: document.getElementById('name').value.trim(),
    type: document.getElementById('type').value,
    registrationNumber: document.getElementById('registrationNumber').value.trim(),
    currentMileage: parseFloat(document.getElementById('currentMileage').value) || 0,
    fuelType: document.getElementById('fuelType').value,
    insuranceExpiry: document.getElementById('insuranceExpiry').value ? timezoneService.parseInputDate(document.getElementById('insuranceExpiry').value) : null,
    notes: document.getElementById('notes').value.trim()
  };

  // Show loading
  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = editingVehicleId ? 'Updating...' : 'Saving...';

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
    // Reset button
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
  }
}

async function loadVehicles() {
  loadingState.style.display = 'flex';
  vehiclesList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    // Load both vehicles and fuel logs
    await loadFuelLogs();
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

    // Get vehicle mileage stats
    const vehicleFuelLogs = fuelLogs.filter(log => log.vehicleId === vehicle.id);
    const mileageStats = calculateVehicleMileage(vehicleFuelLogs);

    // Escape user-provided data (handle undefined/null values from decryption failures)
    const vehicleName = vehicle.name || 'Unnamed Vehicle';
    const escapedName = escapeHtml(vehicleName);
    const escapedType = escapeHtml(vehicle.type || 'Unknown');
    const escapedRegNumber = vehicle.registrationNumber ? escapeHtml(vehicle.registrationNumber) : '';
    const escapedNotes = vehicle.notes ? escapeHtml(vehicle.notes) : '';
    // Escape name for use in onclick handlers
    const safeNameForJs = vehicleName.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

    return `
      <div class="vehicle-card">
        <div class="vehicle-card-header">
          <div class="vehicle-info">
            <div class="vehicle-name">${escapedName}</div>
            <span class="vehicle-type">${escapedType}</span>
            ${escapedRegNumber ? `<div class="vehicle-details">Reg: ${escapedRegNumber}</div>` : ''}
            ${insuranceStatus}
          </div>
          <div class="vehicle-actions">
            <button type="button" class="btn-icon" onclick="window.editVehicle('${vehicle.id}')" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button type="button" class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${vehicle.id}')" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="vehicle-card-body">
          <div class="vehicle-stat">
            <div class="vehicle-stat-label">Odometer</div>
            <div class="vehicle-stat-value">${vehicle.currentMileage ? vehicle.currentMileage.toLocaleString() : '0'} km</div>
          </div>
          <div class="vehicle-stat">
            <div class="vehicle-stat-label">Fuel Type</div>
            <div class="vehicle-stat-value">${vehicle.fuelType ? escapeHtml(vehicle.fuelType) : 'N/A'}</div>
          </div>
          <div class="vehicle-stat mileage-highlight">
            <div class="vehicle-stat-label">Avg Mileage</div>
            <div class="vehicle-stat-value ${mileageStats.avgMileage > 0 ? 'text-success' : ''}">${mileageStats.avgMileage > 0 ? mileageStats.avgMileage.toFixed(2) + ' km/l' : '-- km/l'}</div>
          </div>
          ${vehicle.insuranceExpiry ? `
            <div class="vehicle-stat">
              <div class="vehicle-stat-label">Insurance Expiry</div>
              <div class="vehicle-stat-value">${formatDate(vehicle.insuranceExpiry)}</div>
            </div>
          ` : ''}
        </div>

        <div class="vehicle-card-actions">
          <button type="button" class="btn btn-sm btn-primary" onclick="window.showFuelLogModal('${vehicle.id}', '${safeNameForJs}', ${vehicle.currentMileage || 0})">
            ⛽ Add Fuel
          </button>
          <button type="button" class="btn btn-sm btn-outline" onclick="window.showMaintenanceModal('${vehicle.id}', '${safeNameForJs}')">
            🔧 Maintenance
          </button>
          <button type="button" class="btn btn-sm btn-success" onclick="window.showVehicleIncomeModal('${vehicle.id}', '${safeNameForJs}')">
            💰 Income
          </button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="window.showMileageHistory('${vehicle.id}', '${safeNameForJs}')">
            📊 History
          </button>
        </div>

        ${escapedNotes ? `
          <div class="vehicle-notes">
            <strong>Notes:</strong> ${escapedNotes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function updateSummary() {
  const totalVehicles = vehicles.length;
  totalVehiclesEl.textContent = totalVehicles;
  
  // Calculate overall stats from fuel logs
  const overallStats = calculateOverallMileageStats();
  
  avgMileageEl.textContent = overallStats.avgMileage > 0 ? overallStats.avgMileage.toFixed(2) + ' km/l' : '-- km/l';
  
  // Load expense data
  loadVehicleKPIData();
}

// Load all vehicle KPI data
async function loadVehicleKPIData() {
  try {
    // Get total expenses linked to vehicles (optimized - uses server-side aggregation)
    const totalExpenses = await firestoreService.getTotalExpensesByLinkedType('vehicle');
    
    // Update UI with compact format
    document.getElementById('totalVehicleExpenses').textContent = formatCurrencyCompact(totalExpenses);
    
  } catch (error) {
    console.error('Error loading vehicle KPI data:', error);
  }
}

// Calculate mileage for a specific vehicle
function calculateVehicleMileage(vehicleFuelLogs) {
  if (!vehicleFuelLogs || vehicleFuelLogs.length === 0) {
    return { avgMileage: 0, totalDistance: 0, totalFuelCost: 0, totalFuel: 0 };
  }

  // Sort by odometer reading
  const sortedLogs = [...vehicleFuelLogs].sort((a, b) => {
    const odomA = parseFloat(a.odometerReading) || 0;
    const odomB = parseFloat(b.odometerReading) || 0;
    return odomA - odomB;
  });
  
  let totalDistance = 0;
  let totalFuel = 0;
  let totalFuelCost = 0;
  let fuelForMileage = 0;

  // Calculate total fuel cost for all entries
  sortedLogs.forEach(log => {
    const fuelQty = parseFloat(log.fuelQuantity) || 0;
    const fuelPrc = parseFloat(log.fuelPrice) || 0;
    const cost = parseFloat(log.totalCost) || (fuelQty * fuelPrc);
    totalFuelCost += cost;
    totalFuel += fuelQty;
  });

  // Calculate mileage between consecutive entries (need at least 2)
  // For each segment, the fuel used is the fuel added at the END of that segment
  if (sortedLogs.length >= 2) {
    for (let i = 1; i < sortedLogs.length; i++) {
      const prevLog = sortedLogs[i - 1];
      const currLog = sortedLogs[i];
      
      const prevOdometer = parseFloat(prevLog.odometerReading) || 0;
      const currOdometer = parseFloat(currLog.odometerReading) || 0;
      const distance = currOdometer - prevOdometer;
      const fuelUsed = parseFloat(currLog.fuelQuantity) || 0;
      
      // Only count segments with positive distance and fuel
      if (distance > 0 && fuelUsed > 0) {
        totalDistance += distance;
        fuelForMileage += fuelUsed;
      }
    }
  }
  
  const avgMileage = fuelForMileage > 0 ? totalDistance / fuelForMileage : 0;

  return {
    avgMileage,
    totalDistance,
    totalFuelCost,
    totalFuel
  };
}

// Calculate overall mileage stats for all vehicles
function calculateOverallMileageStats() {
  let totalFuelCost = 0;
  let totalDistance = 0;
  let totalFuel = 0;

  vehicles.forEach(vehicle => {
    const vehicleLogs = fuelLogs.filter(log => log.vehicleId === vehicle.id);
    const stats = calculateVehicleMileage(vehicleLogs);
    totalFuelCost += stats.totalFuelCost;
    totalDistance += stats.totalDistance;
    totalFuel += stats.totalFuel;
  });

  const avgMileage = totalFuel > 0 ? totalDistance / totalFuel : 0;

  return {
    totalFuelCost,
    totalDistance,
    totalFuel,
    avgMileage
  };
}

// Load fuel logs from Firestore
async function loadFuelLogs() {
  try {
    // Use createdAt for ordering as it's more reliable
    fuelLogs = await firestoreService.getAll('fuelLogs', 'createdAt', 'desc');
  } catch (error) {
    console.error('Error loading fuel logs:', error);
    fuelLogs = [];
  }
}

// Calculate total cost when quantity or price changes
function calculateTotalCost() {
  const quantity = parseFloat(document.getElementById('fuelQuantity')?.value) || 0;
  const price = parseFloat(document.getElementById('fuelPrice')?.value) || 0;
  const totalCostInput = document.getElementById('totalCost');
  if (totalCostInput) {
    totalCostInput.value = (quantity * price).toFixed(2);
  }
}

// Show Fuel Log Modal
function showFuelLogModal(vehicleId, vehicleName, currentOdometer) {
  fuelLogVehicleId.value = vehicleId;
  fuelLogVehicleName.textContent = vehicleName;
  
  // Reset form
  fuelLogForm.reset();
  
  // Set default date to today
  document.getElementById('fuelDate').valueAsDate = new Date();
  
  // Set minimum odometer to current reading
  const odometerInput = document.getElementById('odometerReading');
  odometerInput.min = currentOdometer;
  odometerInput.placeholder = `Min: ${currentOdometer} km`;
  
  fuelLogModal.classList.add('show');
}

// Hide Fuel Log Modal
function hideFuelLogModal() {
  fuelLogModal.classList.remove('show');
  fuelLogForm.reset();
}

// Save Fuel Log
async function handleSaveFuelLog() {
  const vehicleId = fuelLogVehicleId.value;
  const fuelDate = document.getElementById('fuelDate').value;
  const odometerReading = parseFloat(document.getElementById('odometerReading').value);
  const fuelQuantity = parseFloat(document.getElementById('fuelQuantity').value);
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value);
  const totalCost = parseFloat(document.getElementById('totalCost').value) || (fuelQuantity * fuelPrice);
  const fuelStation = document.getElementById('fuelStation').value.trim();
  const fullTank = document.getElementById('fullTank').checked;
  const notes = document.getElementById('fuelNotes').value.trim();

  // Validation
  if (!fuelDate || !odometerReading || !fuelQuantity || !fuelPrice) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  // Check odometer is greater than vehicle's current reading
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (vehicle && odometerReading < vehicle.currentMileage) {
    showToast('Odometer reading must be greater than current reading', 'error');
    return;
  }

  saveFuelLogBtn.disabled = true;
  saveFuelLogBtn.textContent = 'Saving...';

  try {
    const fuelLogData = {
      vehicleId,
      date: new Date(fuelDate),
      odometerReading,
      fuelQuantity,
      fuelPrice,
      totalCost,
      fuelStation,
      fullTank,
      notes
    };

    // Save fuel log
    const result = await firestoreService.add('fuelLogs', fuelLogData);

    if (result.success) {
      // Update vehicle's current mileage
      await firestoreService.update('vehicles', vehicleId, {
        currentMileage: odometerReading
      });

      // Use cross-feature integration to create expense
      await crossFeatureIntegrationService.createFuelExpense(
        vehicleId,
        vehicle?.name || 'Vehicle',
        {
          fuelQuantity,
          fuelPrice,
          totalCost,
          fuelStation,
          date: new Date(fuelDate),
          fuelLogId: result.id
        }
      );

      showToast('Fuel entry saved successfully', 'success');
      hideFuelLogModal();
      
      // Reload data
      await loadFuelLogs();
      await loadVehicles();
    } else {
      showToast(result.error || 'Failed to save fuel entry', 'error');
    }
  } catch (error) {
    console.error('Error saving fuel log:', error);
    showToast('Failed to save fuel entry', 'error');
  } finally {
    // Reset button
    saveFuelLogBtn.disabled = false;
    saveFuelLogBtn.textContent = 'Save Fuel Entry';
  }
}

// Show Mileage History Modal
async function showMileageHistory(vehicleId, vehicleName) {
  mileageVehicleName.textContent = vehicleName;
  mileageHistoryModal.classList.add('show');
  
  // Show loading
  fuelLogList.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading fuel logs...</p></div>';
  
  // Reset stats while loading
  vehicleAvgMileage.textContent = '-- km/l';
  vehicleTotalDistance.textContent = '0 km';
  vehicleTotalFuelCost.textContent = '₹0';
  vehicleCostPerKm.textContent = '₹0/km';
  
  // Refresh fuel logs to ensure we have latest data
  await loadFuelLogs();
  
  // Get fuel logs for this vehicle
  const vehicleFuelLogs = fuelLogs.filter(log => log.vehicleId === vehicleId);
  const stats = calculateVehicleMileage(vehicleFuelLogs);
  
  // Update stats
  vehicleAvgMileage.textContent = stats.avgMileage > 0 ? stats.avgMileage.toFixed(2) + ' km/l' : '-- km/l';
  vehicleTotalDistance.textContent = stats.totalDistance.toLocaleString() + ' km';
  vehicleTotalFuelCost.textContent = formatCurrency(stats.totalFuelCost);
  vehicleCostPerKm.textContent = stats.totalDistance > 0 ? '₹' + (stats.totalFuelCost / stats.totalDistance).toFixed(2) + '/km' : '₹0/km';
  
  // Render fuel logs
  if (vehicleFuelLogs.length === 0) {
    fuelLogList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⛽</div>
        <h3>No fuel entries yet</h3>
        <p>Add your first fuel entry to start tracking mileage.</p>
      </div>
    `;
  } else {
    // Sort by odometer reading descending (most recent first)
    const sortedLogs = [...vehicleFuelLogs].sort((a, b) => {
      const odomA = a.odometerReading || 0;
      const odomB = b.odometerReading || 0;
      return odomB - odomA;
    });
    
    fuelLogList.innerHTML = `
      <table class="fuel-log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Odometer</th>
            <th>Fuel (L)</th>
            <th>Price/L</th>
            <th>Total</th>
            <th>Mileage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${sortedLogs.map((log, index) => {
            // Calculate mileage for this entry
            let mileage = '--';
            if (index < sortedLogs.length - 1) {
              const prevLog = sortedLogs[index + 1];
              const distance = (log.odometerReading || 0) - (prevLog.odometerReading || 0);
              const fuelQty = log.fuelQuantity || 0;
              if (distance > 0 && fuelQty > 0) {
                mileage = (distance / fuelQty).toFixed(2) + ' km/l';
              }
            }
            
            const logDate = log.date;
            const fuelQty = log.fuelQuantity || 0;
            const fuelPrc = log.fuelPrice || 0;
            const totalCst = log.totalCost || (fuelQty * fuelPrc);
            
            return `
              <tr>
                <td>${formatDate(logDate)}</td>
                <td>${(log.odometerReading || 0).toLocaleString()} km</td>
                <td>${fuelQty.toFixed(2)} L</td>
                <td>₹${fuelPrc.toFixed(2)}</td>
                <td>₹${totalCst.toFixed(2)}</td>
                <td class="${mileage !== '--' ? 'text-success' : ''}">${mileage}</td>
                <td>
                  <button type="button" class="btn-icon btn-danger btn-sm" onclick="window.deleteFuelLog('${log.id}')" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }
}

// Hide Mileage History Modal
function hideMileageHistoryModal() {
  mileageHistoryModal.classList.remove('show');
}

// Delete Fuel Log
async function deleteFuelLog(logId) {
  const confirmed = await confirmationModal.show({
    title: 'Delete Fuel Entry',
    message: 'Are you sure you want to delete this fuel entry?',
    confirmText: 'Delete',
    type: 'danger'
  });
  if (!confirmed) return;
  
  try {
    // Find the log before deleting to get vehicleId
    const logToDelete = fuelLogs.find(l => l.id === logId);
    const vehicleId = logToDelete?.vehicleId;
    
    const result = await firestoreService.delete('fuelLogs', logId);
    if (result.success) {
      showToast('Fuel entry deleted', 'success');
      await loadFuelLogs();
      await loadVehicles();
      
      // Refresh the modal if it's open
      if (mileageHistoryModal.classList.contains('show') && vehicleId) {
        const vehicleName = mileageVehicleName.textContent;
        await showMileageHistory(vehicleId, vehicleName);
      }
    } else {
      showToast('Failed to delete fuel entry', 'error');
    }
  } catch (error) {
    console.error('Error deleting fuel log:', error);
    showToast('Failed to delete fuel entry', 'error');
  }
}

// Show Maintenance Modal
function showMaintenanceModal(vehicleId, vehicleName) {
  document.getElementById('maintenanceVehicleId').value = vehicleId;
  document.getElementById('maintenanceVehicleName').textContent = vehicleName;
  document.getElementById('maintenanceForm').reset();
  document.getElementById('maintenanceDate').valueAsDate = new Date();
  document.getElementById('maintenanceModal').classList.add('show');
}

// Hide Maintenance Modal
function hideMaintenanceModal() {
  document.getElementById('maintenanceModal').classList.remove('show');
}

// Save Maintenance Expense
async function handleSaveMaintenance() {
  const vehicleId = document.getElementById('maintenanceVehicleId').value;
  const maintenanceDate = document.getElementById('maintenanceDate').value;
  const maintenanceType = document.getElementById('maintenanceType').value;
  const maintenanceAmount = parseFloat(document.getElementById('maintenanceAmount').value);
  const maintenanceDescription = document.getElementById('maintenanceDescription').value.trim();
  const serviceCenter = document.getElementById('serviceCenter').value.trim();

  if (!maintenanceDate || !maintenanceType || !maintenanceAmount) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveMaintenanceBtn');
  const originalText = saveBtn.textContent;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    // Use cross-feature integration to create expense
    const result = await crossFeatureIntegrationService.createVehicleMaintenanceExpense(
      vehicleId,
      vehicle?.name || 'Vehicle',
      {
        amount: maintenanceAmount,
        description: `${maintenanceType}${maintenanceDescription ? ': ' + maintenanceDescription : ''}${serviceCenter ? ' at ' + serviceCenter : ''}`,
        date: new Date(maintenanceDate),
        maintenanceType: maintenanceType
      }
    );

    if (result.success) {
      showToast('Maintenance expense added', 'success');
      hideMaintenanceModal();
      await loadVehicleKPIData();
    } else {
      showToast(result.error || 'Failed to save maintenance', 'error');
    }
  } catch (error) {
    console.error('Error saving maintenance:', error);
    showToast('Failed to save maintenance', 'error');
  } finally {
    // Reset button
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Show Vehicle Income Modal
function showVehicleIncomeModal(vehicleId, vehicleName) {
  document.getElementById('vehicleIncomeVehicleId').value = vehicleId;
  document.getElementById('vehicleIncomeVehicleName').textContent = vehicleName;
  document.getElementById('vehicleIncomeForm').reset();
  document.getElementById('vehicleIncomeDate').valueAsDate = new Date();
  document.getElementById('vehicleIncomeModal').classList.add('show');
}

// Hide Vehicle Income Modal
function hideVehicleIncomeModal() {
  document.getElementById('vehicleIncomeModal').classList.remove('show');
}

// Save Vehicle Income
async function handleSaveVehicleIncome() {
  const vehicleId = document.getElementById('vehicleIncomeVehicleId').value;
  const incomeDate = document.getElementById('vehicleIncomeDate').value;
  const incomeSource = document.getElementById('vehicleIncomeSource').value;
  const incomeAmount = parseFloat(document.getElementById('vehicleIncomeAmount').value);
  const incomeDescription = document.getElementById('vehicleIncomeDescription').value.trim();

  if (!incomeDate || !incomeSource || !incomeAmount) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveVehicleIncomeBtn');
  const originalText = saveBtn.textContent;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    // Use cross-feature integration to create income
    const result = await crossFeatureIntegrationService.createVehicleIncome(
      vehicleId,
      vehicle?.name || 'Vehicle',
      {
        amount: incomeAmount,
        type: incomeSource.toLowerCase(),
        description: incomeDescription || `${incomeSource} from ${vehicle?.name || 'Vehicle'}`,
        date: new Date(incomeDate)
      }
    );

    if (result.success) {
      showToast('Vehicle income added', 'success');
      hideVehicleIncomeModal();
      await loadVehicleKPIData();
    } else {
      showToast(result.error || 'Failed to save income', 'error');
    }
  } catch (error) {
    console.error('Error saving vehicle income:', error);
    showToast('Failed to save income', 'error');
  } finally {
    // Reset button
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

function showDeleteConfirmation(id) {
  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) return;

  deleteVehicleId = id;
  deleteVehicleName.textContent = vehicle.name;
  deleteVehicleDetails.textContent = vehicle.type;
  deleteModal.classList.add('show');
}

function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteVehicleId = null;
}

async function handleDelete() {
  if (!deleteVehicleId) return;

  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

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
    // Reset button
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
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

window.editVehicle = editVehicle;
window.showDeleteConfirmation = showDeleteConfirmation;
window.showFuelLogModal = showFuelLogModal;
window.showMileageHistory = showMileageHistory;
window.deleteFuelLog = deleteFuelLog;
window.showMaintenanceModal = showMaintenanceModal;
window.showVehicleIncomeModal = showVehicleIncomeModal;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
