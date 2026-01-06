/**
 * Global Logout Handler
 * Ensures logout button works consistently across all pages
 */

import authService from '../services/auth-service.js';

// Initialize logout handler
export function initLogoutHandler() {
  // Use event delegation on document to catch logout button clicks
  document.addEventListener('click', async (e) => {
    // Check if clicked element or its parent is the logout button
    const logoutBtn = e.target.closest('#logoutBtn');
    
    if (logoutBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      // Confirm logout
      const confirmed = confirm('Are you sure you want to logout?');
      if (!confirmed) return;
      
      try {
        // Disable button to prevent double clicks
        logoutBtn.disabled = true;
        logoutBtn.style.opacity = '0.6';
        logoutBtn.style.cursor = 'not-allowed';
        
        // Perform logout
        const result = await authService.signOut();
        
        if (result.success) {
          // Show success message if toast is available
          if (window.toast) {
            window.toast.success('Logged out successfully');
          }
          
          // Clear any cached data
          try {
            localStorage.removeItem('rupiya_user_logged_in');
            sessionStorage.clear();
          } catch (err) {
            console.warn('Error clearing storage:', err);
          }
          
          // Redirect to login page
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 500);
        } else {
          // Re-enable button on failure
          logoutBtn.disabled = false;
          logoutBtn.style.opacity = '1';
          logoutBtn.style.cursor = 'pointer';
          
          if (window.toast) {
            window.toast.error('Failed to logout. Please try again.');
          } else {
            alert('Failed to logout. Please try again.');
          }
        }
      } catch (error) {
        console.error('Logout error:', error);
        
        // Re-enable button on error
        logoutBtn.disabled = false;
        logoutBtn.style.opacity = '1';
        logoutBtn.style.cursor = 'pointer';
        
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
