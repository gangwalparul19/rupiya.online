// Profile & Settings Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import toast from '../components/toast.js';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let currentUser = null;
let userPreferences = {};
let expenseCategories = [];
let incomeCategories = [];

// DOM Elements
let profileForm, passwordForm, preferencesForm;
let displayNameInput, emailInput, phoneInput;
let currentPasswordInput, newPasswordInput, confirmPasswordInput;
let currencySelect, dateFormatSelect, languageSelect, emailNotificationsCheckbox;
let exportDataBtn, deleteAccountBtn;
let deleteAccountModal, closeDeleteAccountModalBtn, cancelDeleteAccountBtn, confirmDeleteAccountBtn;
let confirmDeleteText;

async function init() {
  currentUser = await authService.waitForAuth();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  initDOMElements();
  setupEventListeners();
  loadUserProfile(currentUser);
  await loadUserPreferences();
  await loadCategories();
}

function initDOMElements() {
  profileForm = document.getElementById('profileForm');
  passwordForm = document.getElementById('passwordForm');
  preferencesForm = document.getElementById('preferencesForm');
  
  displayNameInput = document.getElementById('displayName');
  emailInput = document.getElementById('email');
  phoneInput = document.getElementById('phone');
  
  currentPasswordInput = document.getElementById('currentPassword');
  newPasswordInput = document.getElementById('newPassword');
  confirmPasswordInput = document.getElementById('confirmPassword');
  
  currencySelect = document.getElementById('currency');
  dateFormatSelect = document.getElementById('dateFormat');
  languageSelect = document.getElementById('language');
  emailNotificationsCheckbox = document.getElementById('emailNotifications');
  
  exportDataBtn = document.getElementById('exportDataBtn');
  deleteAccountBtn = document.getElementById('deleteAccountBtn');
  
  deleteAccountModal = document.getElementById('deleteAccountModal');
  closeDeleteAccountModalBtn = document.getElementById('closeDeleteAccountModalBtn');
  cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');
  confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
  confirmDeleteText = document.getElementById('confirmDeleteText');
}

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

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Forms
  profileForm.addEventListener('submit', handleProfileUpdate);
  passwordForm.addEventListener('submit', handlePasswordChange);
  preferencesForm.addEventListener('submit', handlePreferencesUpdate);

  // Data actions
  exportDataBtn.addEventListener('click', handleExportData);
  deleteAccountBtn.addEventListener('click', showDeleteAccountModal);

  // Categories
  document.getElementById('addExpenseCategoryBtn')?.addEventListener('click', handleAddExpenseCategory);
  document.getElementById('addIncomeCategoryBtn')?.addEventListener('click', handleAddIncomeCategory);
  document.getElementById('resetCategoriesBtn')?.addEventListener('click', handleResetCategories);
  
  // Allow Enter key to add categories
  document.getElementById('newExpenseCategory')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddExpenseCategory();
    }
  });
  
  document.getElementById('newIncomeCategory')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIncomeCategory();
    }
  });

  // Delete account modal
  closeDeleteAccountModalBtn.addEventListener('click', hideDeleteAccountModal);
  cancelDeleteAccountBtn.addEventListener('click', hideDeleteAccountModal);
  confirmDeleteAccountBtn.addEventListener('click', handleDeleteAccount);
  confirmDeleteText.addEventListener('input', (e) => {
    confirmDeleteAccountBtn.disabled = e.target.value !== 'DELETE';
  });
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

  // Fill profile form
  displayNameInput.value = user.displayName || '';
  emailInput.value = user.email || '';
  phoneInput.value = user.phoneNumber || '';
}

async function loadUserPreferences() {
  try {
    const prefs = await firestoreService.get('userPreferences', currentUser.uid);
    if (prefs.success && prefs.data) {
      userPreferences = prefs.data;
      
      currencySelect.value = userPreferences.currency || 'INR';
      dateFormatSelect.value = userPreferences.dateFormat || 'DD/MM/YYYY';
      languageSelect.value = userPreferences.language || 'en';
      emailNotificationsCheckbox.checked = userPreferences.emailNotifications !== false;
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('saveProfileBtn');
  const saveBtnText = document.getElementById('saveProfileBtnText');
  const saveBtnSpinner = document.getElementById('saveProfileBtnSpinner');

  saveBtn.disabled = true;
  saveBtnText.style.display = 'none';
  saveBtnSpinner.style.display = 'inline-block';

  try {
    const displayName = displayNameInput.value.trim();

    // Update Firebase Auth profile
    await updateProfile(currentUser, { displayName });

    // Update UI
    document.getElementById('userName').textContent = displayName || 'User';
    document.getElementById('userAvatar').textContent = (displayName || currentUser.email || 'U')[0].toUpperCase();

    showToast('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Failed to update profile', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.style.display = 'inline';
    saveBtnSpinner.style.display = 'none';
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();

  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Validate passwords
  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const changeBtn = document.getElementById('changePasswordBtn');
  const changeBtnText = document.getElementById('changePasswordBtnText');
  const changeBtnSpinner = document.getElementById('changePasswordBtnSpinner');

  changeBtn.disabled = true;
  changeBtnText.style.display = 'none';
  changeBtnSpinner.style.display = 'inline-block';

  try {
    // Re-authenticate user
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);

    // Update password
    await updatePassword(currentUser, newPassword);

    showToast('Password changed successfully', 'success');
    passwordForm.reset();
  } catch (error) {
    console.error('Error changing password:', error);
    if (error.code === 'auth/wrong-password') {
      showToast('Current password is incorrect', 'error');
    } else {
      showToast('Failed to change password', 'error');
    }
  } finally {
    changeBtn.disabled = false;
    changeBtnText.style.display = 'inline';
    changeBtnSpinner.style.display = 'none';
  }
}

async function handlePreferencesUpdate(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('savePreferencesBtn');
  const saveBtnText = document.getElementById('savePreferencesBtnText');
  const saveBtnSpinner = document.getElementById('savePreferencesBtnSpinner');

  saveBtn.disabled = true;
  saveBtnText.style.display = 'none';
  saveBtnSpinner.style.display = 'inline-block';

  try {
    const preferences = {
      currency: currencySelect.value,
      dateFormat: dateFormatSelect.value,
      language: languageSelect.value,
      emailNotifications: emailNotificationsCheckbox.checked
    };

    // Save to Firestore using document ID as user ID
    const result = await firestoreService.update('userPreferences', currentUser.uid, preferences);
    
    if (!result.success) {
      // If document doesn't exist, create it
      await firestoreService.add('userPreferences', { ...preferences, userId: currentUser.uid });
    }

    userPreferences = preferences;
    showToast('Preferences saved successfully', 'success');
  } catch (error) {
    console.error('Error saving preferences:', error);
    showToast('Failed to save preferences', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.style.display = 'inline';
    saveBtnSpinner.style.display = 'none';
  }
}

async function handleExportData() {
  try {
    showToast('Preparing data export...', 'info');

    // Load all data
    const expenses = await firestoreService.getExpenses();
    const income = await firestoreService.getIncome();
    const budgets = await firestoreService.getBudgets();
    const goals = await firestoreService.getGoals();
    const investments = await firestoreService.getInvestments();

    // Create CSV content
    let csv = 'Type,Date,Category,Amount,Description\n';

    expenses.forEach(item => {
      const date = item.date.toDate ? item.date.toDate().toISOString().split('T')[0] : '';
      csv += `Expense,${date},${item.category},${item.amount},"${item.description || ''}"\n`;
    });

    income.forEach(item => {
      const date = item.date.toDate ? item.date.toDate().toISOString().split('T')[0] : '';
      csv += `Income,${date},${item.category},${item.amount},"${item.description || ''}"\n`;
    });

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rupiya-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Data exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showToast('Failed to export data', 'error');
  }
}

function showDeleteAccountModal() {
  deleteAccountModal.classList.add('show');
  confirmDeleteText.value = '';
  confirmDeleteAccountBtn.disabled = true;
}

function hideDeleteAccountModal() {
  deleteAccountModal.classList.remove('show');
  confirmDeleteText.value = '';
}

async function handleDeleteAccount() {
  const deleteBtn = confirmDeleteAccountBtn;
  const deleteBtnText = document.getElementById('deleteAccountBtnText');
  const deleteBtnSpinner = document.getElementById('deleteAccountBtnSpinner');

  deleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

  try {
    // Delete all user data from Firestore
    const collections = ['expenses', 'income', 'budgets', 'goals', 'investments', 
                        'houses', 'vehicles', 'houseHelps', 'notes', 'documents', 'userPreferences'];
    
    for (const collection of collections) {
      const items = await firestoreService.getAll(collection);
      for (const item of items) {
        await firestoreService.delete(collection, item.id);
      }
    }

    // Delete user account
    await deleteUser(currentUser);

    showToast('Account deleted successfully', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  } catch (error) {
    console.error('Error deleting account:', error);
    showToast('Failed to delete account. You may need to re-login and try again.', 'error');
  } finally {
    deleteBtn.disabled = false;
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
  }
}

async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    showToast('Failed to logout', 'error');
  }
}

// Categories Management
async function loadCategories() {
  try {
    // Initialize categories if needed
    await categoriesService.initializeCategories();
    
    // Load categories
    expenseCategories = await categoriesService.getExpenseCategories();
    incomeCategories = await categoriesService.getIncomeCategories();
    
    // Render categories
    renderExpenseCategories();
    renderIncomeCategories();
  } catch (error) {
    console.error('Error loading categories:', error);
    showToast('Failed to load categories', 'error');
  }
}

function renderExpenseCategories() {
  const list = document.getElementById('expenseCategoriesList');
  if (!list) return;
  
  list.innerHTML = expenseCategories.map(category => `
    <div class="category-item">
      <span class="category-name">${category}</span>
      <button class="category-delete" onclick="window.deleteExpenseCategory('${category.replace(/'/g, "\\'")}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function renderIncomeCategories() {
  const list = document.getElementById('incomeCategoriesList');
  if (!list) return;
  
  list.innerHTML = incomeCategories.map(category => `
    <div class="category-item">
      <span class="category-name">${category}</span>
      <button class="category-delete" onclick="window.deleteIncomeCategory('${category.replace(/'/g, "\\'")}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');
}

async function handleAddExpenseCategory() {
  const input = document.getElementById('newExpenseCategory');
  const category = input.value.trim();
  
  if (!category) {
    showToast('Please enter a category name', 'error');
    return;
  }
  
  const result = await categoriesService.addExpenseCategory(category);
  
  if (result.success) {
    showToast('Category added successfully', 'success');
    input.value = '';
    await loadCategories();
  } else {
    showToast(result.error || 'Failed to add category', 'error');
  }
}

async function handleAddIncomeCategory() {
  const input = document.getElementById('newIncomeCategory');
  const category = input.value.trim();
  
  if (!category) {
    showToast('Please enter a category name', 'error');
    return;
  }
  
  const result = await categoriesService.addIncomeCategory(category);
  
  if (result.success) {
    showToast('Category added successfully', 'success');
    input.value = '';
    await loadCategories();
  } else {
    showToast(result.error || 'Failed to add category', 'error');
  }
}

async function deleteExpenseCategory(category) {
  if (!confirm(`Delete category "${category}"?`)) return;
  
  const result = await categoriesService.deleteExpenseCategory(category);
  
  if (result.success) {
    showToast('Category deleted successfully', 'success');
    await loadCategories();
  } else {
    showToast(result.error || 'Failed to delete category', 'error');
  }
}

async function deleteIncomeCategory(category) {
  if (!confirm(`Delete category "${category}"?`)) return;
  
  const result = await categoriesService.deleteIncomeCategory(category);
  
  if (result.success) {
    showToast('Category deleted successfully', 'success');
    await loadCategories();
  } else {
    showToast(result.error || 'Failed to delete category', 'error');
  }
}

async function handleResetCategories() {
  if (!confirm('Reset all categories to defaults? Your custom categories will be removed.')) return;
  
  const result = await categoriesService.resetToDefaults();
  
  if (result.success) {
    showToast('Categories reset successfully', 'success');
    await loadCategories();
  } else {
    showToast('Failed to reset categories', 'error');
  }
}

// Expose functions to window
window.deleteExpenseCategory = deleteExpenseCategory;
window.deleteIncomeCategory = deleteIncomeCategory;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
