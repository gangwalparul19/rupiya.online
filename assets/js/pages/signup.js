// Signup Page Logic - Dual Auth Support
import '../services/services-init.js'; // Initialize services
import authService from '../services/auth-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import toast from '../components/toast.js';
import { validateForm, setupRealtimeValidation } from '../utils/validation.js';

// Get form elements
const signupForm = document.getElementById('signupForm');
const signupBtn = document.getElementById('signupBtn');
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
    // Check for stored redirect URL first (trip invitation links)
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
    
    // Check for pending invitation (legacy family invitations)
    const pendingInvitation = localStorage.getItem('rupiya_pending_invitation');
    if (pendingInvitation) {
      localStorage.removeItem('rupiya_pending_invitation');
      return 'dashboard.html';
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
  const originalText = signupBtn.textContent;
  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating Account...';
  
  try {
    const { email, password, displayName } = validation.data;
    
    // Proceed directly with account creation
    // Firebase will handle duplicate email errors
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
      
      // Show verification message
      showVerificationMessage(email);
    } else if (result.emailExists) {
      // Email already exists - show helpful message
      toast.show('This email is already registered. Please sign in instead.', 'info');
      
      // Redirect to login with email pre-filled
      setTimeout(() => {
        window.location.href = `login.html?email=${encodeURIComponent(email)}`;
      }, 2000);
    } else {
      toast.error(result.error);
      signupBtn.disabled = false;
      signupBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Signup error:', error);
    toast.error('An unexpected error occurred. Please try again.');
    signupBtn.disabled = false;
    signupBtn.textContent = originalText;
  }
});

// Show verification pending message
function showVerificationMessage(email) {
  const formContainer = document.querySelector('.auth-form');
  if (formContainer) {
    formContainer.innerHTML = `
      <div class="verification-message">
        <div class="verification-icon">📧</div>
        <h2>Verify Your Email</h2>
        <p>We've sent a verification link to:</p>
        <p class="verification-email"><strong>${email}</strong></p>
        <p>Please check your inbox and click the verification link to activate your account.</p>
        <div class="verification-actions">
          <a href="login.html" class="btn btn-primary">Go to Login</a>
        </div>
        <p class="verification-help">
          Didn't receive the email? Check your spam folder or 
          <a href="login.html">try signing in</a> to resend the verification email.
        </p>
      </div>
    `;
  }
}

// Handle Google Sign Up
googleSignUpBtn.addEventListener('click', async () => {
  googleSignUpBtn.disabled = true;
  const originalText = googleSignUpBtn.textContent;
  googleSignUpBtn.textContent = 'Creating Account...';
  
  try {
    const result = await authService.signInWithGoogle();
    
    if (result.success) {
      toast.show('Account created successfully! Redirecting...', 'success');
      const redirectUrl = getRedirectUrl();
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } else {
      toast.error(result.error);
      googleSignUpBtn.disabled = false;
      googleSignUpBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Google sign up error:', error);
    toast.error('An unexpected error occurred. Please try again.');
    googleSignUpBtn.disabled = false;
    googleSignUpBtn.textContent = originalText;
  }
});

// Check if already logged in (on page load only)
(async () => {
  try {
    // Pre-fill email if provided in URL
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.value = decodeURIComponent(emailParam);
      }
    }

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
