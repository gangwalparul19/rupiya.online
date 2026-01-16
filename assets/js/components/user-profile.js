/**
 * User Profile Component
 * Automatically loads and displays user profile in sidebar
 */

import authService from '../services/auth-service.js';

/**
 * Load and display user profile in sidebar
 */
export async function loadUserProfile() {
  try {
    // Wait for auth to be ready
    const user = await authService.waitForAuth();
    
    if (!user) {
      return;
    }

    // Get DOM elements
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');

    // Update user name
    if (userName) {
      const displayName = user.displayName || user.email?.split('@')[0] || 'User';
      userName.textContent = displayName;
    }

    // Update user email
    if (userEmail) {
      userEmail.textContent = user.email || '';
    }

    // Update user avatar with photo or initials
    if (userAvatar) {
      if (user.photoURL) {
        // Display user's profile photo
        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
      } else {
        // Display initials as fallback
        const displayName = user.displayName || user.email || 'User';
        const initials = displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';
        
        userAvatar.textContent = initials;
      }
    }
  } catch (error) {
    console.error('[UserProfile] Error loading profile:', error);
    
    // Set default initials on error
    const userAvatar = document.getElementById('userAvatar');
    
    if (userAvatar) {
      userAvatar.textContent = 'U';
    }
  }
}

/**
 * Auto-initialize user profile when DOM is ready
 */
function autoInitUserProfile() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUserProfile);
  } else {
    // DOM is already loaded
    loadUserProfile();
  }
}

// Auto-initialize
autoInitUserProfile();

export default { loadUserProfile };
