// Generate Sample Data Page
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import sampleDataService from '../services/sample-data-service.js';
import { auth } from '../config/firebase-config.js';
import toast from '../components/toast.js';

// Make globally accessible for console testing
window.sampleDataService = sampleDataService;
window.auth = auth;
window.authService = authService;
window.showToast = toast.show.bind(toast);

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const statusDescription = document.getElementById('statusDescription');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const loading = document.getElementById('loading');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const alertInfo = document.getElementById('alertInfo');

// Show alert
function showAlert(type, message) {
  // Use toast if available, otherwise use alert boxes
  if (window.showToast) {
    window.showToast(message, type);
  } else {
    const alert = type === 'success' ? alertSuccess : 
                  type === 'error' ? alertError : alertInfo;
    
    // Hide all alerts
    alertSuccess.classList.remove('show');
    alertError.classList.remove('show');
    alertInfo.classList.remove('show');
    
    // Show selected alert
    alert.textContent = message;
    alert.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      alert.classList.remove('show');
    }, 5000);
  }
}

// Show loading
function showLoading(show) {
  if (show) {
    loading.classList.add('show');
    generateBtn.disabled = true;
    clearBtn.disabled = true;
  } else {
    loading.classList.remove('show');
  }
}

// Update status
function updateStatus(isActive, user) {
  if (isActive) {
    statusIndicator.classList.remove('inactive');
    statusIndicator.classList.add('active');
    statusText.textContent = 'Sample Data Active';
    statusDescription.textContent = 'You are currently exploring with sample data. You can clear it and start fresh anytime.';
    generateBtn.disabled = true;
    clearBtn.disabled = false; // Always enabled
  } else {
    statusIndicator.classList.remove('active');
    statusIndicator.classList.add('inactive');
    statusText.textContent = 'No Sample Data';
    statusDescription.textContent = user ? 
      'Generate sample data to explore all features with realistic dummy data.' :
      'Please login to generate sample data.';
    generateBtn.disabled = !user;
    clearBtn.disabled = false; // Always enabled
  }
}

// Check status
async function checkStatus() {
  try {
    const user = authService.getCurrentUser();
    
    if (!user) {
      updateStatus(false, null);
      showAlert('info', '⚠️ Please login first. Redirecting to login page...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }
    
    // Check if sample data actually exists in Firestore
    const isActive = await sampleDataService.isActiveAsync(user.uid);
    updateStatus(isActive, user);
    
    if (isActive) {
      showAlert('info', '✅ Sample data is currently active');
    } else {
      showAlert('info', '💡 Ready to generate sample data');
    }
  } catch (error) {
    console.error('Error checking status:', error);
    showAlert('error', '❌ Error checking status: ' + error.message);
  }
}

// Generate sample data
async function generateSampleData() {
  const user = authService.getCurrentUser();
  
  if (!user) {
    showAlert('error', '❌ Please login first');
    return;
  }
  
  console.log('🔍 User from authService:', user);
  console.log('🔍 User UID:', user.uid);
  console.log('🔍 Auth object:', auth);
  console.log('🔍 Auth currentUser:', auth.currentUser);
  console.log('🔍 Auth currentUser UID:', auth.currentUser?.uid);
  
  if (!confirm('Generate sample data? This will add comprehensive test data across all features including expenses, income, budgets, goals, vehicles, houses, investments, loans, credit cards, and more.')) {
    return;
  }
  
  try {
    showLoading(true);
    showAlert('info', '⏳ Generating sample data...');
    
    console.log('🚀 Calling generateSampleData with userId:', user.uid);
    await sampleDataService.generateSampleData(user.uid);
    
    showLoading(false);
    showAlert('success', '✅ Sample data generated successfully! Redirecting to dashboard...');
    
    updateStatus(true, user);
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 2000);
  } catch (error) {
    showLoading(false);
    console.error('Error generating sample data:', error);
    showAlert('error', '❌ Error: ' + error.message);
  }
}

// Clear sample data
async function clearSampleData() {
  console.log('🔴 Clear Sample Data button clicked!');
  
  const user = authService.getCurrentUser();
  console.log('👤 Current user:', user);
  
  if (!user) {
    console.error('❌ No user found');
    showAlert('error', '❌ Please login first');
    return;
  }
  
  try {
    // First check if there's any sample data to clear
    showLoading(true);
    showAlert('info', '⏳ Checking for sample data...');
    
    const hasSampleData = await sampleDataService.isActiveAsync(user.uid);
    console.log('📊 Has sample data:', hasSampleData);
    
    showLoading(false);
    
    console.log('📝 Showing confirmation dialog...');
    const confirmed = confirm('Clear all sample data? This will remove all sample expenses, income, budgets, goals, and more.\n\nNote: This only clears data marked as sample data. If you have legacy data without the sample flag, use the console command: clearAllUserData()');
    console.log('✅ User confirmed:', confirmed);
    
    if (!confirmed) {
      console.log('❌ User cancelled');
      return;
    }
    
    showLoading(true);
    showAlert('info', '⏳ Clearing sample data...');
    
    console.log('🗑️ Starting to clear sample data for user:', user.uid);
    const result = await sampleDataService.clearSampleData(user.uid, false);
    console.log('🗑️ Clear result:', result);
    
    showLoading(false);
    
    if (result) {
      showAlert('success', '✅ Sample data cleared successfully! Refreshing page...');
      updateStatus(false, user);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        console.log('🔄 Reloading page...');
        window.location.reload();
      }, 1500);
    } else {
      showAlert('error', '❌ Failed to clear sample data');
    }
  } catch (error) {
    showLoading(false);
    console.error('❌ Error clearing sample data:', error);
    console.error('Error stack:', error.stack);
    showAlert('error', '❌ Error: ' + error.message);
  }
}

// Helper function to clear ALL user data (including legacy data without isSampleData flag)
// This is exposed globally for console access
window.clearAllUserData = async function() {
  const user = authService.getCurrentUser();
  
  if (!user) {
    console.error('❌ No user found. Please login first.');
    return false;
  }
  
  console.warn('⚠️ WARNING: This will delete ALL your data, not just sample data!');
  console.log('🗑️ Clearing ALL data for user:', user.uid);
  
  try {
    const result = await sampleDataService.clearSampleData(user.uid, true);
    console.log('✅ All data cleared successfully!');
    console.log('🔄 Please refresh the page.');
    return result;
  } catch (error) {
    console.error('❌ Error clearing all data:', error);
    return false;
  }
};

console.log('💡 TIP: To clear ALL data (including legacy data), open console and run: clearAllUserData()');

// Event listeners
generateBtn?.addEventListener('click', generateSampleData);
clearBtn?.addEventListener('click', clearSampleData);
dashboardBtn?.addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

// Wait for auth
authService.onAuthStateChanged((user) => {
  checkStatus();
});
