/**
 * Privacy Settings Page
 * Manages privacy mode and data visibility settings
 */

import '../services/services-init.js'; // Initialize services first (includes encryption)
import authService from '../services/auth-service.js';
import privacyMode from '../utils/privacy-mode.js';
import initPrivacyModeButton from '../components/privacy-mode-button.js';

// Load user profile
async function loadUserProfile() {
  try {
    const user = await authService.waitForAuth();
    if (user) {
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const userEmail = document.getElementById('userEmail');
      
      if (userAvatar) {
        const initials = user.displayName 
          ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
          : user.email[0].toUpperCase();
        userAvatar.textContent = initials;
      }
      if (userName) userName.textContent = user.displayName || 'User';
      if (userEmail) userEmail.textContent = user.email;
    } else {
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

// Initialize page
async function init() {
  await loadUserProfile();
  initPrivacyModeButton();
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
