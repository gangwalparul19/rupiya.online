// Login Page Logic - Dual Auth Support
import '../services/services-init.js'; // Initialize services
import authService from '../services/auth-service.js';
import dualAuthHelper from '../utils/dual-auth-helper.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import { validateForm, setupRealtimeValidation } from '../utils/validation.js';
import FormValidator from '../utils/form-validation.js';

// Get form elements
const emailInput = document.getElementById('emailInput');
const continueEmailBtn = document.getElementById('continueEmailBtn');
const emailStep = document.getElementById('emailStep');
const authMethodsStep = document.getElementById('authMethodsStep');
const passwordMethod = document.getElementById('passwordMethod');
const googleMethod = document.getElementById('googleMethod');
const methodsMessage = document.getElementById('methodsMessage');
const backToEmailBtn = document.getElementById('backToEmailBtn');

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const quickGoogleSignInBtn = document.getElementById('quickGoogleSignInBtn');
const togglePasswordBtn = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Track current email
let currentEmail = null;

// Validation rules
const validationRules = {
  email: ['required', 'email'],
  password: ['required', 'password:6']
};

// Get redirect URL after login (checks for pending invitations)
function getRedirectUrl() {
  try {
    // Check for stored redirect URL first (trip invitation links)
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

// Handle email submission
continueEmailBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  
  if (!email) {
    toast.show('Please enter your email', 'error');
    return;
  }
  
  if (!email.includes('@')) {
    toast.show('Please enter a valid email', 'error');
    return;
  }
  
  continueEmailBtn.disabled = true;
  continueEmailBtn.textContent = 'Checking...';
  
  currentEmail = email;
  
  // Check what auth methods are available
  const check = await dualAuthHelper.checkEmailAuthMethods(email);
  
  continueEmailBtn.disabled = false;
  continueEmailBtn.textContent = 'Continue';
  
  if (check.error) {
    // No account found - offer signup
    toast.show('No account found with this email. Would you like to sign up?', 'info');
    setTimeout(() => {
      window.location.href = `signup.html?email=${encodeURIComponent(email)}`;
    }, 1500);
    return;
  }
  
  // Show appropriate auth methods
  showAuthMethods(check.method);
});

function showAuthMethods(method) {
  emailStep.style.display = 'none';
  authMethodsStep.style.display = 'block';
  passwordMethod.style.display = 'none';
  googleMethod.style.display = 'none';
  
  if (method === 'password') {
    passwordMethod.style.display = 'block';
    methodsMessage.textContent = 'Sign in with your password';
  } else if (method === 'google') {
    googleMethod.style.display = 'block';
    methodsMessage.textContent = 'Sign in with your Google account';
  } else if (method === 'both') {
    passwordMethod.style.display = 'block';
    googleMethod.style.display = 'block';
    methodsMessage.textContent = 'You can sign in with either method';
  }
  
  // Setup real-time validation for password form if visible
  if (passwordMethod.style.display !== 'none' && loginForm) {
    setupRealtimeValidation(loginForm, validationRules);
  }
}

// Back to email button
backToEmailBtn.addEventListener('click', () => {
  emailStep.style.display = 'block';
  authMethodsStep.style.display = 'none';
  emailInput.value = '';
  currentEmail = null;
  if (passwordInput) {
    passwordInput.value = '';
  }
});

// Quick Google sign-in button (for existing Google users)
if (quickGoogleSignInBtn) {
  quickGoogleSignInBtn.addEventListener('click', async () => {
    quickGoogleSignInBtn.disabled = true;
    const originalText = quickGoogleSignInBtn.textContent;
    quickGoogleSignInBtn.textContent = 'Signing in...';
    
    try {
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        toast.show('Signed in successfully', 'success');
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 500);
      } else {
        toast.show(result.error, 'error');
        quickGoogleSignInBtn.disabled = false;
        quickGoogleSignInBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.show('An unexpected error occurred. Please try again.', 'error');
      quickGoogleSignInBtn.disabled = false;
      quickGoogleSignInBtn.textContent = originalText;
    }
  });
}

// Toggle password visibility
if (togglePasswordBtn && passwordInput) {
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
}

// Handle password login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentEmail) {
      toast.show('Please enter your email first', 'error');
      return;
    }
    
    const password = passwordInput.value;
    
    if (!password) {
      toast.show('Please enter your password', 'error');
      return;
    }
    
    loginBtn.disabled = true;
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    
    try {
      const result = await authService.signIn(currentEmail, password);
      
      if (result.success) {
        // Initialize encryption with user's password
        const encryptionInitialized = await authEncryptionHelper.initializeAfterLogin(
          password, 
          result.user.uid
        );
        
        if (!encryptionInitialized) {
          console.warn('[Login] Encryption initialization failed, data will not be encrypted');
        }
        
        toast.show('Signed in successfully', 'success');
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 500);
      } else if (result.needsVerification) {
        toast.show(result.error, 'warning');
        // Show resend verification option
        setTimeout(() => {
          window.location.href = `login.html?email=${encodeURIComponent(currentEmail)}&needsVerification=true`;
        }, 2000);
      } else {
        toast.show(result.error, 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.show('An unexpected error occurred. Please try again.', 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = originalText;
    }
  });
}

// Handle Google sign-in
if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    googleSignInBtn.disabled = true;
    const originalText = googleSignInBtn.textContent;
    googleSignInBtn.textContent = 'Signing in...';
    
    try {
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        toast.show('Signed in successfully', 'success');
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 500);
      } else {
        toast.show(result.error, 'error');
        googleSignInBtn.disabled = false;
        googleSignInBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.show('An unexpected error occurred. Please try again.', 'error');
      googleSignInBtn.disabled = false;
      googleSignInBtn.textContent = originalText;
    }
  });
}

// Handle forgot password
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!currentEmail) {
      toast.show('Please enter your email first', 'error');
      return;
    }
    
    try {
      const result = await authService.resetPassword(currentEmail);
      
      if (result.success) {
        toast.show('Password reset email sent! Check your inbox.', 'success');
      } else {
        toast.show(result.error, 'error');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.show('An unexpected error occurred. Please try again.', 'error');
    }
  });
}

// Check if already logged in (on page load only)
(async () => {
  try {
    // Check for password reset success message
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('passwordReset') === 'success') {
      toast.show('Password reset successful! Please sign in with your new password.', 'success');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for email verification success
    if (urlParams.get('verified') === 'true') {
      toast.show('Email verified successfully! You can now sign in.', 'success');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Pre-fill email if provided in URL
    const emailParam = urlParams.get('email');
    if (emailParam) {
      emailInput.value = decodeURIComponent(emailParam);
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
