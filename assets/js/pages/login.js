// Login Page Logic
import '../services/services-init.js'; // Initialize services
import authService from '../services/auth-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import { validateForm, setupRealtimeValidation } from '../utils/validation.js';

// Get form elements
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Track if user needs verification (for resend functionality)
let pendingVerificationEmail = null;

// Validation rules
const validationRules = {
  email: ['required', 'email'],
  password: ['required', 'password:6']
};

// Get redirect URL after login (checks for pending invitations)
function getRedirectUrl() {
  try {
    // Check for pending invitation first
    const pendingInvitation = localStorage.getItem('rupiya_pending_invitation');
    if (pendingInvitation) {
      localStorage.removeItem('rupiya_pending_invitation');
      localStorage.removeItem('rupiya_redirect_url');
      return 'dashboard.html';
    }
    
    // Check for stored redirect URL
    const redirectUrl = localStorage.getItem('rupiya_redirect_url');
    if (redirectUrl) {
      localStorage.removeItem('rupiya_redirect_url');
      // Extract just the path and query from the full URL
      try {
        const url = new URL(redirectUrl);
        return url.pathname.replace(/^\//, '') + url.search;
      } catch (e) {
        return 'dashboard.html';
      }
    }
    
    return 'dashboard.html';
  } catch (e) {
    return 'dashboard.html';
  }
}

// Setup real-time validation
setupRealtimeValidation(loginForm, validationRules);

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  
  // Update icon
  const icon = type === 'password' 
    ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
      </svg>`
    : `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
      </svg>`;
  togglePasswordBtn.innerHTML = icon;
});

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate form
  const validation = validateForm(loginForm, validationRules);
  if (!validation.isValid) {
    toast.error('Please fix the errors in the form');
    return;
  }
  
  // Show loading state
  const originalText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing In...';
  
  // Hide any existing verification banner
  hideVerificationBanner();
  
  try {
    const { email, password } = validation.data;
    const result = await authService.signIn(email, password);
    
    if (result.success) {
      // Initialize encryption with user's password
      const encryptionInitialized = await authEncryptionHelper.initializeAfterLogin(
        password, 
        result.user.uid
      );
      
      if (!encryptionInitialized) {
        console.warn('[Login] Encryption initialization failed, data will not be encrypted');
      }
      
      toast.success('Login successful! Redirecting...');
      const redirectUrl = getRedirectUrl();
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      // Check if user needs to verify email
      if (result.needsVerification) {
        pendingVerificationEmail = result.email;
        showVerificationBanner(email, password);
      }
      toast.error(result.error);
      loginBtn.disabled = false;
      loginBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Login error:', error);
    toast.error('An unexpected error occurred. Please try again.');
    loginBtn.disabled = false;
    loginBtn.textContent = originalText;
  }
});

// Show verification required banner
function showVerificationBanner(email, password) {
  // Remove existing banner if any
  hideVerificationBanner();
  
  const banner = document.createElement('div');
  banner.id = 'verificationBanner';
  banner.className = 'verification-banner';
  banner.innerHTML = `
    <div class="verification-banner-content">
      <span class="verification-banner-icon">📧</span>
      <div class="verification-banner-text">
        <strong>Email not verified</strong>
        <p>Please check your inbox for the verification link.</p>
      </div>
      <button type="button" class="btn btn-sm btn-outline" id="resendVerificationBtn">Resend Email</button>
    </div>
  `;
  
  // Insert before the form
  loginForm.parentNode.insertBefore(banner, loginForm);
  
  // Add resend handler
  document.getElementById('resendVerificationBtn').addEventListener('click', async () => {
    const btn = document.getElementById('resendVerificationBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    const result = await authService.resendVerificationEmail(email, password);
    
    if (result.success) {
      toast.success(result.message);
      btn.textContent = 'Email Sent!';
      setTimeout(() => {
        btn.textContent = 'Resend Email';
        btn.disabled = false;
      }, 30000); // Allow resend after 30 seconds
    } else {
      toast.error(result.error);
      btn.textContent = 'Resend Email';
      btn.disabled = false;
    }
  });
}

// Hide verification banner
function hideVerificationBanner() {
  const existingBanner = document.getElementById('verificationBanner');
  if (existingBanner) {
    existingBanner.remove();
  }
}

// Handle Google Sign In
googleSignInBtn.addEventListener('click', async () => {
  googleSignInBtn.disabled = true;
  
  try {
    const result = await authService.signInWithGoogle();
    
    if (result.success) {
      // Encryption for Google users is automatically initialized in services-init.js
      // No need to initialize here as it doesn't require a password
      
      toast.success('Login successful! Redirecting...');
      const redirectUrl = getRedirectUrl();
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      toast.error(result.error);
      googleSignInBtn.disabled = false;
    }
  } catch (error) {
    console.error('Google sign in error:', error);
    toast.error('An unexpected error occurred. Please try again.');
    googleSignInBtn.disabled = false;
  }
});

// Handle forgot password
forgotPasswordLink.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  
  if (!email) {
    toast.warning('Please enter your email address first');
    document.getElementById('email').focus();
    return;
  }
  
  const confirmed = await confirmationModal.show({
    title: 'Reset Password',
    message: `Send password reset email to ${email}?`,
    confirmText: 'Send Email',
    type: 'info',
    icon: '📧'
  });
  if (!confirmed) return;
  
  try {
    const result = await authService.resetPassword(email);
    
    if (result.success) {
      toast.success('Password reset email sent! Check your inbox.');
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    console.error('Password reset error:', error);
    toast.error('An unexpected error occurred. Please try again.');
  }
});

// Check if already logged in (on page load only)
(async () => {
  try {
    // Check for password reset success message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('passwordReset') === 'success') {
      toast.success('Password reset successful! Please sign in with your new password.');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for email verification success
    if (urlParams.get('verified') === 'true') {
      toast.success('Email verified successfully! You can now sign in.');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    await authService.waitForAuth();
    if (authService.isAuthenticated()) {
      // User is already logged in, redirect to dashboard
      const redirectUrl = getRedirectUrl();
      window.location.replace(redirectUrl);
    }
  } catch (error) {
    console.error('[Login] Error checking auth state:', error);
    // Don't redirect on error, let user try to login
  }
})();
