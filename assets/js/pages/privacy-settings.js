/**
 * Privacy Settings Page
 * Manages privacy mode and data visibility settings
 */

import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import privacyMode from '../utils/privacy-mode.js';

let currentUser = null;

// Initialize
async function init() {
  
  try {
    // Add a small delay to ensure Firebase is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    currentUser = await authService.waitForAuth();
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }
    
    // User is authenticated, initialize page
    initPage();
    
  } catch (error) {
    console.error('[Privacy Settings] Init error:', error);
    window.location.href = 'login.html';
  }
}

// Initialize page after auth
function initPage() {
  // Update user profile in sidebar
  updateUserProfile();
  
  // Setup event listeners
  setupEventListeners();
  
}

// Update user profile
function updateUserProfile() {
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  if (userAvatar) {
    const initials = currentUser.displayName 
      ? currentUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : currentUser.email[0].toUpperCase();
    userAvatar.textContent = initials;
  }

  if (userName) userName.textContent = currentUser.displayName || 'User';
  if (userEmail) userEmail.textContent = currentUser.email;
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

  // Privacy mode controls
  const mainToggle = document.getElementById('mainPrivacyToggle');
  const enableBtn = document.getElementById('enablePrivacyBtn');
  const disableBtn = document.getElementById('disablePrivacyBtn');

  function updateToggleState() {
    if (privacyMode.isEnabled()) {
      mainToggle?.classList.add('active');
    } else {
      mainToggle?.classList.remove('active');
    }
  }

  mainToggle?.addEventListener('click', () => {
    privacyMode.toggle();
    updateToggleState();
  });

  enableBtn?.addEventListener('click', () => {
    privacyMode.enable();
    updateToggleState();
  });

  disableBtn?.addEventListener('click', () => {
    privacyMode.disable();
    updateToggleState();
  });

  // Initialize toggle state
  updateToggleState();

  // Listen for privacy mode changes
  window.addEventListener('privacyModeChanged', () => {
    updateToggleState();
  });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
