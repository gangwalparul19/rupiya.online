// Signup Page Logic
import '../services/services-init.js'; // Initialize services
import authService from '../services/auth-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import toast from '../components/toast.js';
import { validateForm, setupRealtimeValidation } from '../utils/validation.js';

// Get form elements
const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
const signupBtnText = document.getElementById('signupBtnText');
const signupBtnSpinner = document.getElementById('signupBtnSpinner');
const googleSignUpBtn = document.getElementById('googleSignUpBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

// Validation rules
const validationRules = {
  displayName: ['required', 'minLength:2'],
  email: ['required', 'email'],
  password: ['required', 'password:6'],
  confirmPassword: ['required', 'passwordMatch:password'],
  terms: ['required']
};

// Get redirect URL after signup (checks for pending invitations)
function getRedirectUrl() {
  try {
    // Check for pending invitation first
    const pendingInvitation = localStorage.getItem('rupiya_pending_invitation');
    if (pendingInvitation) {
      localStorage.removeItem('rupiya_pending_invitation');
      localStorage.removeItem('rupiya_redirect_url');
      return `family.html?invitation=${pendingInvitation}`;
    }
    
    // Check for stored redirect URL
    const redirectUrl = localStorage.getItem('rupiya_redirect_url');
    if (redirectUrl) {
      localStorage.removeItem('rupiya_redirect_url');
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
setupRealtimeValidation(signupForm, validationRules);

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  updatePasswordIcon(togglePasswordBtn, type);
});

toggleConfirmPasswordBtn.addEventListener('click', () => {
  const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
  confirmPasswordInput.type = type;
  updatePasswordIcon(toggleConfirmPasswordBtn, type);
});

function updatePasswordIcon(button, type) {
  const icon = type === 'password' 
    ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
        <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
      </svg>`
    : `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/>
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
      </svg>`;
  button.innerHTML = icon;
}

// Handle form submission
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate form
  const validation = validateForm(signupForm, validationRules);
  if (!validation.isValid) {
    toast.error('Please fix the errors in the form');
    return;
  }
  
  // Check terms checkbox
  if (!validation.data.terms) {
    toast.error('Please accept the Terms of Service and Privacy Policy');
    return;
  }
  
  // Show loading state
  signupBtn.disabled = true;
  signupBtnText.style.display = 'none';
  signupBtnSpinner.style.display = 'inline-block';
  
  try {
    const { email, password, displayName } = validation.data;
    const result = await authService.signUp(email, password, displayName);
    
    if (result.success) {
      // Initialize encryption with user's password
      const encryptionInitialized = await authEncryptionHelper.initializeAfterLogin(
        password, 
        result.user.uid
      );
      
      if (!encryptionInitialized) {
        console.warn('[Signup] Encryption initialization failed, data will not be encrypted');
      }
      
      toast.success('Account created successfully! Redirecting...');
      const redirectUrl = getRedirectUrl();
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      toast.error(result.error);
      signupBtn.disabled = false;
      signupBtnText.style.display = 'inline';
      signupBtnSpinner.style.display = 'none';
    }
  } catch (error) {
    console.error('Signup error:', error);
    toast.error('An unexpected error occurred. Please try again.');
    signupBtn.disabled = false;
    signupBtnText.style.display = 'inline';
    signupBtnSpinner.style.display = 'none';
  }
});

// Handle Google Sign Up
googleSignUpBtn.addEventListener('click', async () => {
  googleSignUpBtn.disabled = true;
  
  try {
    const result = await authService.signInWithGoogle();
    
    if (result.success) {
      // Note: Google sign-up doesn't provide a password, so encryption won't be initialized
      // Users who sign up with Google will need to set an encryption password separately
      console.warn('[Signup] Google sign-up: Encryption not available without password');
      
      toast.success('Account created successfully! Redirecting...');
      const redirectUrl = getRedirectUrl();
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      toast.error(result.error);
      googleSignUpBtn.disabled = false;
    }
  } catch (error) {
    console.error('Google sign up error:', error);
    toast.error('An unexpected error occurred. Please try again.');
    googleSignUpBtn.disabled = false;
  }
});

// Check if already logged in (on page load only)
(async () => {
  try {
    await authService.waitForAuth();
    if (authService.isAuthenticated()) {
      // User is already logged in, redirect
      const redirectUrl = getRedirectUrl();
      window.location.replace(redirectUrl);
    }
  } catch (error) {
    console.error('[Signup] Error checking auth state:', error);
    // Don't redirect on error, let user try to signup
  }
})();
