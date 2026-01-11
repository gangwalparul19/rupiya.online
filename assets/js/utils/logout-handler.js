/**
 * Global Logout Handler
 * Ensures logout button works consistently across all pages
 */

import authService from '../services/auth-service.js';
import logoutModal from '../components/logout-modal.js';
import logger from '../utils/logger.js';

const log = logger.create('LogoutHandler');

// Track if logout is in progress to prevent double-clicks
let isLoggingOut = false;

// Helper to restore button state
function restoreButtonState(logoutBtn) {
  if (logoutBtn) {
    logoutBtn.disabled = false;
    logoutBtn.style.opacity = '1';
    logoutBtn.style.cursor = 'pointer';
  }
}

// Initialize logout handler
export function initLogoutHandler() {
  // Use event delegation on document to catch logout button clicks
  document.addEventListener('click', async (e) => {
    // Check if clicked element or its parent is the logout button
    const logoutBtn = e.target.closest('#logoutBtn');
    
    if (logoutBtn && !isLoggingOut) {
      e.preventDefault();
      e.stopPropagation();
      
      log.log('Logout button clicked - showing modal');
      
      // Show beautiful logout modal
      let confirmed = false;
      try {
        confirmed = await logoutModal.show();
      } catch (error) {
        log.error('Modal error:', error);
        if (window.toast) {
          window.toast.error('An error occurred. Please try again.');
        }
        return;
      }
      
      log.log('Modal result:', confirmed);
      
      if (!confirmed) {
        log.log('User cancelled logout');
        return;
      }
      
      log.log('User confirmed logout - proceeding with logout');
      
      try {
        // Set flag to prevent double-clicks
        isLoggingOut = true;
        
        // Disable button to prevent double clicks
        logoutBtn.disabled = true;
        logoutBtn.style.opacity = '0.6';
        logoutBtn.style.cursor = 'not-allowed';
        
        // Perform logout
        log.log('Calling authService.signOut()');
        const result = await authService.signOut();
        log.log('SignOut result:', result);
        
        if (result && result.success) {
          // Show success message if toast is available
          if (window.toast) {
            window.toast.success('Logged out successfully. See you soon!');
          }
          
          // Clear any cached data
          try {
            localStorage.removeItem('rupiya_user_logged_in');
            sessionStorage.clear();
          } catch (err) {
            log.warn('Error clearing storage:', err);
          }
          
          // Redirect to login page
          log.log('Redirecting to login page');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 500);
        } else {
          // Re-enable button on failure
          isLoggingOut = false;
          restoreButtonState(logoutBtn);
          
          log.error('Logout failed:', result);
          if (window.toast) {
            window.toast.error('Failed to logout. Please try again.');
          } else {
            alert('Failed to logout. Please try again.');
          }
        }
      } catch (error) {
        log.error('Logout error:', error);
        
        // Re-enable button on error - ensure this always happens
        isLoggingOut = false;
        restoreButtonState(logoutBtn);
        
        if (window.toast) {
          window.toast.error('An error occurred during logout');
        } else {
          alert('An error occurred during logout');
        }
      }
    }
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogoutHandler);
} else {
  initLogoutHandler();
}

export default { initLogoutHandler };
