/**
 * Auth Guard - Quick authentication check for protected pages
 * This script should be loaded early to prevent flash of protected content
 * 
 * Usage: Add this script in the <head> of protected pages:
 * <script src="assets/js/utils/auth-guard.js"></script>
 */

(function() {
  'use strict';
  
  // Immediately hide body until auth is verified
  document.documentElement.style.visibility = 'hidden';
  document.documentElement.style.opacity = '0';
  
  // Check for Firebase auth data in storage (quick check before Firebase SDK loads)
  const hasAuthData = () => {
    try {
      // Check all localStorage keys for Firebase auth data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('firebase:authUser')) {
          return true;
        }
      }
      // Also check IndexedDB indicator
      if (localStorage.getItem('rupiya_user_logged_in') === 'true') {
        return true;
      }
      return false;
    } catch (e) {
      // If storage access fails, let the page load and handle auth normally
      return true;
    }
  };
  
  // Store the intended destination URL before redirecting to login
  const storeRedirectUrl = () => {
    try {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check for invitation parameter specifically
      const invitationId = urlParams.get('invitation');
      if (invitationId) {
        localStorage.setItem('rupiya_pending_invitation', invitationId);
      }
      
      // Store the full redirect URL if it has query params
      if (window.location.search) {
        localStorage.setItem('rupiya_redirect_url', currentUrl);
      }
    } catch (e) {
      console.error('Error storing redirect URL:', e);
    }
  };
  
  if (!hasAuthData()) {
    // Store redirect info before redirecting
    storeRedirectUrl();
    // No auth data found, redirect immediately
    window.location.replace('login.html');
  } else {
    // Show body with transition
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    document.documentElement.style.transition = 'opacity 0.2s ease';
  }
  
  // Fallback: show content after timeout to prevent blank page
  setTimeout(function() {
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
  }, 1500);
})();