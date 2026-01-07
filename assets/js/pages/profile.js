// Profile & Settings Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import categoriesService from '../services/categories-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { db, auth } from '../config/firebase-config.js';
import paymentMethodsService from '../services/payment-methods-service.js';
import { escapeHtml } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let currentUser = null;
let userPreferences = {};
let expenseCategories = [];
let incomeCategories = [];
let isGoogleUser = false;

// DOM Elements
let profileForm, passwordForm, preferencesForm;
let displayNameInput, emailInput, phoneInput, cityInput, countryInput;
let currentPasswordInput, newPasswordInput, confirmPasswordInput;
let weeklyReportEnabledCheckbox, monthlyReportEnabledCheckbox;
let exportDataBtn, deleteAccountBtn;
let deleteAccountModal, closeDeleteAccountModalBtn, cancelDeleteAccountBtn, confirmDeleteAccountBtn;
let confirmDeleteText;
let googleAuthNotice, emailAuthSection, sendResetEmailBtn;

async function init() {
  currentUser = await authService.waitForAuth();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Detect if user signed in with Google
  isGoogleUser = currentUser.providerData.some(provider => provider.providerId === 'google.com');

  initDOMElements();
  
  // Initialize family switcher
  await familySwitcher.init();
  
  setupEventListeners();
  loadUserProfile(currentUser);
  setupSecuritySection();
  
  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadUserPreferences();
    await loadCategories();
  });
}

function initDOMElements() {
  profileForm = document.getElementById('profileForm');
  passwordForm = document.getElementById('passwordForm');
  preferencesForm = document.getElementById('preferencesForm');
  
  displayNameInput = document.getElementById('displayName');
  emailInput = document.getElementById('email');
  phoneInput = document.getElementById('phone');
  cityInput = document.getElementById('city');
  countryInput = document.getElementById('country');
  
  currentPasswordInput = document.getElementById('currentPassword');
  newPasswordInput = document.getElementById('newPassword');
  confirmPasswordInput = document.getElementById('confirmPassword');
  
  weeklyReportEnabledCheckbox = document.getElementById('weeklyReportEnabled');
  monthlyReportEnabledCheckbox = document.getElementById('monthlyReportEnabled');
  
  // Initialize theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.checked = themeManager.getCurrentTheme() === 'dark';
    themeToggle.addEventListener('change', () => {
      themeManager.toggleTheme();
      toast.success(`Switched to ${themeManager.getCurrentTheme()} mode`);
    });
  }
  
  exportDataBtn = document.getElementById('exportDataBtn');
  deleteAccountBtn = document.getElementById('deleteAccountBtn');
  
  deleteAccountModal = document.getElementById('deleteAccountModal');
  closeDeleteAccountModalBtn = document.getElementById('closeDeleteAccountModalBtn');
  cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');
  confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
  confirmDeleteText = document.getElementById('confirmDeleteText');

  // Security section elements
  googleAuthNotice = document.getElementById('googleAuthNotice');
  emailAuthSection = document.getElementById('emailAuthSection');
  sendResetEmailBtn = document.getElementById('sendResetEmailBtn');
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
  profileForm?.addEventListener('submit', handleProfileUpdate);
  passwordForm?.addEventListener('submit', handlePasswordChange);
  preferencesForm?.addEventListener('submit', handlePreferencesUpdate);

  // Data actions
  exportDataBtn?.addEventListener('click', handleExportData);
  deleteAccountBtn?.addEventListener('click', showDeleteAccountModal);

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
  closeDeleteAccountModalBtn?.addEventListener('click', hideDeleteAccountModal);
  cancelDeleteAccountBtn?.addEventListener('click', hideDeleteAccountModal);
  confirmDeleteAccountBtn?.addEventListener('click', handleDeleteAccount);
  confirmDeleteText?.addEventListener('input', (e) => {
    confirmDeleteAccountBtn.disabled = e.target.value !== 'DELETE';
  });

  // Password reset email
  sendResetEmailBtn?.addEventListener('click', handleSendResetEmail);
}

// Setup security section based on auth provider
function setupSecuritySection() {
  if (isGoogleUser) {
    // Show Google notice, hide email/password form
    if (googleAuthNotice) googleAuthNotice.style.display = 'block';
    if (emailAuthSection) emailAuthSection.style.display = 'none';
  } else {
    // Show email/password form, hide Google notice
    if (googleAuthNotice) googleAuthNotice.style.display = 'none';
    if (emailAuthSection) emailAuthSection.style.display = 'block';
  }
}

// Handle sending password reset email
async function handleSendResetEmail() {
  const btn = sendResetEmailBtn;

  if (!btn) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    // Configure action code settings for password reset
    const actionCodeSettings = {
      url: `${window.location.origin}/login.html?passwordReset=success`,
      handleCodeInApp: false
    };

    await sendPasswordResetEmail(auth, currentUser.email, actionCodeSettings);
    showToast(`Password reset email sent to ${currentUser.email}. Please check your inbox.`, 'success');
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if (error.code === 'auth/too-many-requests') {
      showToast('Too many requests. Please try again later.', 'error');
    } else {
      showToast('Failed to send password reset email. Please try again.', 'error');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
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
  
  // Load phone number from Firestore
  loadPhoneNumber();
}

async function loadPhoneNumber() {
  try {
    const result = await firestoreService.get('users', currentUser.uid);
    if (result.success && result.data) {
      if (result.data.phoneNumber) {
        phoneInput.value = result.data.phoneNumber;
      }
      if (result.data.city && cityInput) {
        cityInput.value = result.data.city;
      }
      if (result.data.country && countryInput) {
        countryInput.value = result.data.country;
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

async function loadUserPreferences() {
  try {
    const prefs = await firestoreService.get('userPreferences', currentUser.uid);
    if (prefs.success && prefs.data) {
      userPreferences = prefs.data;
      
      if (weeklyReportEnabledCheckbox) {
        weeklyReportEnabledCheckbox.checked = userPreferences.weeklyReportEnabled === true;
      }
      if (monthlyReportEnabledCheckbox) {
        monthlyReportEnabledCheckbox.checked = userPreferences.monthlyReportEnabled === true;
      }
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
  const originalText = saveBtn.textContent;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const displayName = displayNameInput.value.trim();
    const phoneNumber = phoneInput.value.trim();
    const city = cityInput?.value.trim() || '';
    const country = countryInput?.value.trim() || '';

    // Update Firebase Auth profile
    await updateProfile(currentUser, { displayName });

    // Save profile data to Firestore
    const userProfileData = {
      displayName: displayName,
      email: currentUser.email,
      phoneNumber: phoneNumber,
      city: city,
      country: country,
      userId: currentUser.uid,
      updatedAt: Timestamp.now()
    };

    // Use setDoc to create or update the document with the user's UID as the document ID
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, userProfileData, { merge: true });

    // Update UI
    document.getElementById('userName').textContent = displayName || 'User';
    document.getElementById('userAvatar').textContent = (displayName || currentUser.email || 'U')[0].toUpperCase();

    showToast('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Failed to update profile', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
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
  const originalText = changeBtn.textContent;

  changeBtn.disabled = true;
  changeBtn.textContent = 'Changing...';

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
    changeBtn.textContent = originalText;
  }
}

async function handlePreferencesUpdate(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('savePreferencesBtn');

  if (!saveBtn) {
    showToast('UI elements not found', 'error');
    return;
  }

  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const preferences = {
      weeklyReportEnabled: weeklyReportEnabledCheckbox?.checked || false,
      monthlyReportEnabled: monthlyReportEnabledCheckbox?.checked || false,
      userId: currentUser.uid,
      updatedAt: Timestamp.now()
    };

    // Use setDoc with merge to create or update the document
    const docRef = doc(db, 'userPreferences', currentUser.uid);
    await setDoc(docRef, preferences, { merge: true });

    userPreferences = preferences;
    showToast('Preferences saved successfully', 'success');
  } catch (error) {
    console.error('Error saving preferences:', error);
    showToast('Failed to save preferences: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Helper function to escape CSV field values
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the field contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
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
      const date = item.date?.toDate ? item.date.toDate().toISOString().split('T')[0] : '';
      csv += `Expense,${escapeCsvField(date)},${escapeCsvField(item.category)},${escapeCsvField(item.amount)},${escapeCsvField(item.description)}\n`;
    });

    income.forEach(item => {
      const date = item.date?.toDate ? item.date.toDate().toISOString().split('T')[0] : '';
      csv += `Income,${escapeCsvField(date)},${escapeCsvField(item.category)},${escapeCsvField(item.amount)},${escapeCsvField(item.description)}\n`;
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
  const originalText = deleteBtn.textContent;

  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

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
    deleteBtn.textContent = originalText;
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
  
  const protectedCategories = categoriesService.getProtectedExpenseCategories();
  
  list.innerHTML = expenseCategories.map(category => {
    const isProtected = protectedCategories.includes(category);
    const escapedCategory = escapeHtml(category);
    // Escape for use in onclick handlers
    const safeCategoryForJs = category.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `
      <div class="category-item ${isProtected ? 'protected' : ''}">
        <span class="category-name">
          ${isProtected ? '🔒 ' : ''}${escapedCategory}
          ${isProtected ? '<span class="category-badge">System</span>' : ''}
        </span>
        ${!isProtected ? `
          <button class="category-delete" onclick="window.deleteExpenseCategory('${safeCategoryForJs}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderIncomeCategories() {
  const list = document.getElementById('incomeCategoriesList');
  if (!list) return;
  
  const protectedCategories = categoriesService.getProtectedIncomeCategories();
  
  list.innerHTML = incomeCategories.map(category => {
    const isProtected = protectedCategories.includes(category);
    const escapedCategory = escapeHtml(category);
    // Escape for use in onclick handlers
    const safeCategoryForJs = category.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `
      <div class="category-item ${isProtected ? 'protected' : ''}">
        <span class="category-name">
          ${isProtected ? '🔒 ' : ''}${escapedCategory}
          ${isProtected ? '<span class="category-badge">System</span>' : ''}
        </span>
        ${!isProtected ? `
          <button class="category-delete" onclick="window.deleteIncomeCategory('${safeCategoryForJs}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
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


// ============================================
// PAYMENT METHODS MANAGEMENT
// ============================================

let paymentMethods = [];
let editingPaymentMethodId = null;
let deletePaymentMethodId = null;

// Payment Methods DOM Elements
let paymentTypeSelect, paymentMethodNameInput;
let cardFields, upiFields, walletFields, bankFields;
let cardNumberInput, cardTypeSelect, cardBankNameInput;
let upiIdInput, upiProviderSelect;
let walletProviderSelect, walletNumberInput;
let bankAccountNumberInput, bankNameInput, ifscCodeInput, accountTypeSelect;
let addPaymentMethodForm, addPaymentMethodBtn;
let paymentMethodsList;
let deletePaymentMethodModal, closeDeletePaymentMethodModalBtn, cancelDeletePaymentMethodBtn, confirmDeletePaymentMethodBtn;
let deletePaymentMethodName;

// Initialize Payment Methods DOM Elements
function initPaymentMethodsDOM() {
  paymentTypeSelect = document.getElementById('paymentType');
  paymentMethodNameInput = document.getElementById('paymentMethodName');
  
  cardFields = document.getElementById('cardFields');
  upiFields = document.getElementById('upiFields');
  walletFields = document.getElementById('walletFields');
  bankFields = document.getElementById('bankFields');
  
  cardNumberInput = document.getElementById('cardNumber');
  cardTypeSelect = document.getElementById('cardType');
  cardBankNameInput = document.getElementById('cardBankName');
  
  upiIdInput = document.getElementById('upiId');
  upiProviderSelect = document.getElementById('upiProvider');
  
  walletProviderSelect = document.getElementById('walletProvider');
  walletNumberInput = document.getElementById('walletNumber');
  
  bankAccountNumberInput = document.getElementById('bankAccountNumber');
  bankNameInput = document.getElementById('bankName');
  ifscCodeInput = document.getElementById('ifscCode');
  accountTypeSelect = document.getElementById('accountType');
  
  addPaymentMethodForm = document.getElementById('addPaymentMethodForm');
  addPaymentMethodBtn = document.getElementById('addPaymentMethodBtn');
  
  paymentMethodsList = document.getElementById('paymentMethodsList');
  
  deletePaymentMethodModal = document.getElementById('deletePaymentMethodModal');
  closeDeletePaymentMethodModalBtn = document.getElementById('closeDeletePaymentMethodModalBtn');
  cancelDeletePaymentMethodBtn = document.getElementById('cancelDeletePaymentMethodBtn');
  confirmDeletePaymentMethodBtn = document.getElementById('confirmDeletePaymentMethodBtn');
  deletePaymentMethodName = document.getElementById('deletePaymentMethodName');
}

// Setup Payment Methods Event Listeners
function setupPaymentMethodsListeners() {
  if (paymentTypeSelect) {
    paymentTypeSelect.addEventListener('change', handlePaymentTypeChange);
  }
  
  if (addPaymentMethodForm) {
    addPaymentMethodForm.addEventListener('submit', handleAddPaymentMethod);
  }
  
  if (closeDeletePaymentMethodModalBtn) {
    closeDeletePaymentMethodModalBtn.addEventListener('click', hideDeletePaymentMethodModal);
  }
  
  if (cancelDeletePaymentMethodBtn) {
    cancelDeletePaymentMethodBtn.addEventListener('click', hideDeletePaymentMethodModal);
  }
  
  if (confirmDeletePaymentMethodBtn) {
    confirmDeletePaymentMethodBtn.addEventListener('click', handleDeletePaymentMethod);
  }
}

// Handle payment type change
function handlePaymentTypeChange() {
  const type = paymentTypeSelect.value;
  
  // Hide all fields
  cardFields.style.display = 'none';
  upiFields.style.display = 'none';
  walletFields.style.display = 'none';
  bankFields.style.display = 'none';
  
  // Show relevant fields
  switch (type) {
    case 'card':
      cardFields.style.display = 'block';
      break;
    case 'upi':
      upiFields.style.display = 'block';
      break;
    case 'wallet':
      walletFields.style.display = 'block';
      break;
    case 'bank':
      bankFields.style.display = 'block';
      break;
  }
}

// Load payment methods
async function loadPaymentMethods() {
  try {
    paymentMethods = await paymentMethodsService.getPaymentMethods();
    renderPaymentMethods();
  } catch (error) {
    console.error('Error loading payment methods:', error);
    showToast('Failed to load payment methods', 'error');
  }
}

// Render payment methods list
function renderPaymentMethods() {
  if (!paymentMethodsList) return;
  
  if (paymentMethods.length === 0) {
    paymentMethodsList.innerHTML = `
      <div class="empty-state">
        <p>No payment methods added yet.</p>
        <p class="text-muted">Add your first payment method above.</p>
      </div>
    `;
    return;
  }
  
  // Group payment methods by type
  const grouped = {
    cash: [],
    card: [],
    upi: [],
    wallet: [],
    bank: []
  };
  
  paymentMethods.forEach(method => {
    if (grouped[method.type]) {
      grouped[method.type].push(method);
    }
  });
  
  // Category labels
  const categoryLabels = {
    cash: '💵 Cash',
    card: '💳 Cards',
    upi: '📱 UPI',
    wallet: '👛 Digital Wallets',
    bank: '🏦 Bank Accounts'
  };
  
  let html = '';
  
  // Render each category
  Object.keys(grouped).forEach(type => {
    if (grouped[type].length > 0) {
      html += `
        <div class="payment-category">
          <h3 class="payment-category-title">${categoryLabels[type]}</h3>
          <div class="payment-methods-grid">
            ${grouped[type].map(method => {
              const icon = paymentMethodsService.getPaymentMethodIcon(method.type);
              const displayName = paymentMethodsService.getPaymentMethodDisplayName(method);
              const defaultBadge = method.isDefault ? '<span class="badge badge-primary">Default</span>' : '';
              const escapedName = escapeHtml(method.name);
              const escapedDetails = escapeHtml(getPaymentMethodDetails(method));
              
              return `
                <div class="payment-method-card">
                  <div class="payment-method-header">
                    <div class="payment-method-icon">${icon}</div>
                    <div class="payment-method-actions">
                      ${!method.isDefault ? `<button class="btn-icon" onclick="setDefaultPaymentMethod('${method.id}')" title="Set as default">⭐</button>` : ''}
                      <button class="btn-icon" onclick="showDeletePaymentMethodModal('${method.id}')" title="Delete">🗑️</button>
                    </div>
                  </div>
                  <div class="payment-method-info">
                    <div class="payment-method-name">${escapedName} ${defaultBadge}</div>
                    <div class="payment-method-details">${escapedDetails}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  });
  
  paymentMethodsList.innerHTML = html;
}

// Get payment method details for display
function getPaymentMethodDetails(method) {
  switch (method.type) {
    case 'card':
      return `${method.cardType === 'credit' ? 'Credit' : 'Debit'} • ${method.bankName || ''} • **** ${method.cardNumber || ''}`;
    case 'upi':
      return `${method.upiId || ''} • ${method.provider || ''}`;
    case 'wallet':
      return `${method.walletProvider || ''} • ${method.walletNumber || ''}`;
    case 'bank':
      return `${method.bankName || ''} • ${method.accountType || ''} • **** ${method.accountNumber || ''}`;
    case 'cash':
      return 'Cash payments';
    default:
      return '';
  }
}

// Handle add payment method
async function handleAddPaymentMethod(e) {
  e.preventDefault();
  
  const type = paymentTypeSelect.value;
  if (!type) {
    showToast('Please select a payment type', 'error');
    return;
  }
  
  const name = paymentMethodNameInput.value.trim();
  if (!name) {
    showToast('Please enter a name for the payment method', 'error');
    return;
  }
  
  // Show loading state - just disable and change text
  addPaymentMethodBtn.disabled = true;
  addPaymentMethodBtn.textContent = 'Adding...';
  
  try {
    const methodData = {
      type: type,
      name: name
    };
    
    // Add type-specific fields
    switch (type) {
      case 'card':
        methodData.cardNumber = cardNumberInput.value.trim();
        methodData.cardType = cardTypeSelect.value;
        methodData.bankName = cardBankNameInput.value.trim();
        break;
      case 'upi':
        methodData.upiId = upiIdInput.value.trim();
        methodData.provider = upiProviderSelect.value;
        break;
      case 'wallet':
        methodData.walletProvider = walletProviderSelect.value;
        methodData.walletNumber = walletNumberInput.value.trim();
        break;
      case 'bank':
        methodData.accountNumber = bankAccountNumberInput.value.trim();
        methodData.bankName = bankNameInput.value.trim();
        methodData.ifscCode = ifscCodeInput.value.trim().toUpperCase();
        methodData.accountType = accountTypeSelect.value;
        break;
    }
    
    const result = await paymentMethodsService.addPaymentMethod(methodData);
    
    if (result.success) {
      showToast('Payment method added successfully', 'success');
      addPaymentMethodForm.reset();
      handlePaymentTypeChange(); // Hide all fields
      await loadPaymentMethods();
    } else {
      showToast(result.error || 'Failed to add payment method', 'error');
    }
  } catch (error) {
    console.error('Error adding payment method:', error);
    showToast('Failed to add payment method', 'error');
  } finally {
    // Reset button state
    addPaymentMethodBtn.disabled = false;
    addPaymentMethodBtn.textContent = 'Add Payment Method';
  }
}

// Set default payment method
window.setDefaultPaymentMethod = async function(methodId) {
  try {
    const result = await paymentMethodsService.setDefaultPaymentMethod(methodId);
    if (result.success) {
      showToast('Default payment method updated', 'success');
      await loadPaymentMethods();
    } else {
      showToast(result.error || 'Failed to set default', 'error');
    }
  } catch (error) {
    console.error('Error setting default payment method:', error);
    showToast('Failed to set default payment method', 'error');
  }
};

// Show delete payment method modal
window.showDeletePaymentMethodModal = function(methodId) {
  const method = paymentMethods.find(m => m.id === methodId);
  if (!method) return;
  
  deletePaymentMethodId = methodId;
  deletePaymentMethodName.textContent = paymentMethodsService.getPaymentMethodDisplayName(method);
  deletePaymentMethodModal.classList.add('show');
};

// Hide delete payment method modal
function hideDeletePaymentMethodModal() {
  deletePaymentMethodModal.classList.remove('show');
  deletePaymentMethodId = null;
}

// Handle delete payment method
async function handleDeletePaymentMethod() {
  if (!deletePaymentMethodId) return;
  
  // Show loading state - just disable and change text
  confirmDeletePaymentMethodBtn.disabled = true;
  confirmDeletePaymentMethodBtn.textContent = 'Deleting...';
  
  try {
    const result = await paymentMethodsService.deletePaymentMethod(deletePaymentMethodId);
    
    if (result.success) {
      showToast('Payment method deleted successfully', 'success');
      hideDeletePaymentMethodModal();
      await loadPaymentMethods();
    } else {
      showToast(result.error || 'Failed to delete payment method', 'error');
    }
  } catch (error) {
    console.error('Error deleting payment method:', error);
    showToast('Failed to delete payment method', 'error');
  } finally {
    // Reset button state
    confirmDeletePaymentMethodBtn.disabled = false;
    confirmDeletePaymentMethodBtn.textContent = 'Delete';
  }
}

// Initialize payment methods when tab is clicked
document.addEventListener('DOMContentLoaded', () => {
  const paymentMethodsTab = document.querySelector('[data-tab="payment-methods"]');
  if (paymentMethodsTab) {
    paymentMethodsTab.addEventListener('click', async () => {
      if (!paymentMethodsList) {
        initPaymentMethodsDOM();
        setupPaymentMethodsListeners();
      }
      await loadPaymentMethods();
    });
  }
});
