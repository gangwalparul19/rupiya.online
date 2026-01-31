// Authentication Service
import { auth } from '../config/firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Production-safe logging (only logs in development)
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const log = isDev ? console.log.bind(console, '[Auth]') : () => {};
const logError = console.error.bind(console, '[Auth]');

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.authInitialized = false;
    this.authInitPromise = null;
    this.userService = null;
    
    // Start listening immediately
    this.init();
  }

  // Initialize auth state listener
  init() {
    if (this.authInitPromise) {
      return this.authInitPromise;
    }

    this.authInitPromise = new Promise((resolve) => {
      log('Setting up auth state listener...');
      
      // The first onAuthStateChanged callback gives us the initial auth state
      // This fires once Firebase has checked for a persisted session
      onAuthStateChanged(auth, (user) => {
        log('Auth state changed:', user ? 'logged in' : 'not logged in');
        
        const wasInitialized = this.authInitialized;
        this.currentUser = user;
        
        // Keep the localStorage flag in sync with Firebase auth state
        // This ensures auth-guard.js works correctly on page refresh
        if (user) {
          localStorage.setItem('rupiya_user_logged_in', 'true');
        } else {
          localStorage.removeItem('rupiya_user_logged_in');
        }
        
        if (!wasInitialized) {
          this.authInitialized = true;
          log('Auth initialized');
          resolve(user);
        }
        
        // Notify all listeners
        this.authStateListeners.forEach(callback => callback(user));
      });
    });

    return this.authInitPromise;
  }

  // Wait for auth to be initialized - this is the key method
  async waitForAuth() {
    log('waitForAuth called');
    
    // Ensure init has been called
    if (!this.authInitPromise) {
      this.init();
    }
    
    // Wait for Firebase to determine the auth state
    // This promise resolves after onAuthStateChanged fires for the first time
    const user = await this.authInitPromise;
    
    log('waitForAuth complete');
    return user;
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    // If already initialized, call immediately with current state
    if (this.authInitialized) {
      callback(this.currentUser);
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      log('Email sign-in successful');
      
      // Check if email is verified (only for email/password users)
      if (!userCredential.user.emailVerified) {
        // Sign out the user since they haven't verified their email
        await signOut(auth);
        return { 
          success: false, 
          error: 'Please verify your email before signing in. Check your inbox for the verification link.',
          needsVerification: true,
          email: email
        };
      }
      
      // Set auth flag for quick check
      localStorage.setItem('rupiya_user_logged_in', 'true');
      
      if (this.userService) {
        await this.userService.getOrCreateUserProfile(userCredential.user);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      logError('Sign-in error:', error.code);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign up with email and password
  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
        await userCredential.user.reload();
      }
      
      // Create user profile in Firestore BEFORE signing out
      // This ensures the user profile exists when they verify their email
      if (this.userService) {
        try {
          await this.userService.getOrCreateUserProfile(userCredential.user);
          log('User profile created in Firestore');
        } catch (profileError) {
          logError('Error creating user profile:', profileError);
          // Continue anyway - user can still verify email
        }
      }
      
      // Send email verification
      const actionCodeSettings = {
        url: `${window.location.origin}/login.html?verified=true`,
        handleCodeInApp: false
      };
      
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      log('Verification email sent');
      
      // Sign out the user - they need to verify email first
      await signOut(auth);
      
      // Don't set auth flag since user needs to verify email
      // localStorage.setItem('rupiya_user_logged_in', 'true');
      
      return { 
        success: true, 
        user: userCredential.user,
        needsVerification: true,
        message: 'Account created! Please check your email to verify your account before signing in.'
      };
    } catch (error) {
      logError('Sign-up error:', error.code);
      
      // Check if email already exists via another provider
      if (error.code === 'auth/email-already-in-use') {
        return { 
          success: false, 
          error: 'This email is already registered. Please sign in instead.',
          emailExists: true,
          email: email
        };
      }
      
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      log('Google sign-in successful');
      
      // Set auth flag for quick check
      localStorage.setItem('rupiya_user_logged_in', 'true');
      
      if (this.userService) {
        const result = await this.userService.getOrCreateUserProfile(userCredential.user);
      } else {
        console.warn('[Auth Service] userService not available in signInWithGoogle');
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      logError('Google sign-in error:', error.code);
      console.error('[Auth Service] Google sign-in error details:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign out
  async signOut() {
    try {
      if (this.userService) {
        this.userService.clearCache();
      }
      
      // Clear auth flag
      localStorage.removeItem('rupiya_user_logged_in');
      
      // Clear encryption keys - import dynamically to avoid circular dependency
      try {
        const { default: authEncryptionHelper } = await import('../utils/auth-encryption-helper.js');
        authEncryptionHelper.clearEncryption();
      } catch (e) {
        console.warn('[Auth] Could not clear encryption:', e);
      }
      
      await signOut(auth);
      return { success: true };
    } catch (error) {
      logError('Sign-out error:', error.code);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Set user service
  setUserService(service) {
    this.userService = service;
  }

  // Send password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      logError('Password reset error:', error.code);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Resend verification email
  async resendVerificationEmail(email, password) {
    try {
      // Sign in temporarily to get the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user.emailVerified) {
        await signOut(auth);
        return { success: false, error: 'Email is already verified. Please sign in.' };
      }
      
      // Send verification email
      const actionCodeSettings = {
        url: `${window.location.origin}/login.html?verified=true`,
        handleCodeInApp: false
      };
      
      await sendEmailVerification(userCredential.user, actionCodeSettings);
      
      // Sign out again
      await signOut(auth);
      
      return { success: true, message: 'Verification email sent! Please check your inbox.' };
    } catch (error) {
      logError('Resend verification error:', error.code);
      if (error.code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many requests. Please wait a few minutes before trying again.' };
      }
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user-friendly error messages
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
      'auth/weak-password': 'Password should be at least 6 characters long.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Please sign up.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  }

  // ============================================
  // DUAL-AUTH SUPPORT: Account Linking Methods
  // ============================================

  /**
   * Check what auth methods are available for an email
   * Used during login to show appropriate auth options
   * Uses Firebase Auth API (works without authentication)
   */
  async getAuthMethodsForEmail(email) {
    try {
      const { fetchSignInMethodsForEmail } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
      
      // Use Firebase Auth API to check sign-in methods (works without authentication)
      const signInMethods = await fetchSignInMethodsForEmail(this.auth, email);
      
      if (!signInMethods || signInMethods.length === 0) {
        return { success: false, error: 'No account found with this email' };
      }

      // Convert Firebase Auth provider IDs to our format
      // Firebase returns: 'password', 'google.com', etc.
      return { 
        success: true, 
        authMethods: signInMethods,
        user: null // We don't have user data yet (not authenticated)
      };
    } catch (error) {
      logError('Error getting auth methods for email:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/invalid-email') {
        return { success: false, error: 'Invalid email address' };
      }
      
      // Return generic error - don't expose permission details
      return { success: false, error: 'Unable to check account. Please try again.' };
    }
  }

  /**
   * Link password authentication to existing Google account
   * User must be logged in with Google first
   */
  async linkPasswordToGoogleAccount(password) {
    try {
      const { EmailAuthProvider, linkWithCredential } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // Create credential from password
      const credential = EmailAuthProvider.credential(this.currentUser.email, password);
      
      // Link the credential to current user
      await linkWithCredential(this.currentUser, credential);
      
      log('Password linked to Google account');

      // Update user profile in Firestore
      if (this.userService) {
        await this.userService.addAuthMethod('password', this.currentUser.email);
      }

      return { success: true, message: 'Password added successfully' };
    } catch (error) {
      logError('Error linking password:', error.code);
      
      if (error.code === 'auth/credential-already-in-use') {
        return { 
          success: false, 
          error: 'This email is already associated with another account. Please use a different email or sign in with that account.'
        };
      }
      
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Link Google authentication to existing password account
   * User must be logged in with email/password first
   */
  async linkGoogleToPasswordAccount() {
    try {
      const { GoogleAuthProvider, linkWithPopup } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      const provider = new GoogleAuthProvider();
      
      // Link Google provider to current user
      await linkWithPopup(this.currentUser, provider);
      
      log('Google linked to password account');

      // Update user profile in Firestore
      if (this.userService) {
        await this.userService.addAuthMethod('google.com', this.currentUser.email);
      }

      return { success: true, message: 'Google account linked successfully' };
    } catch (error) {
      logError('Error linking Google:', error.code);
      
      if (error.code === 'auth/credential-already-in-use') {
        return { 
          success: false, 
          error: 'This Google account is already linked to another email. Please use a different Google account.'
        };
      }
      
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Unlink an authentication method from current user
   * Prevents unlinking the last auth method
   */
  async unlinkAuthMethod(providerId) {
    try {
      const { unlink } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
      
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // Check if this is the last auth method
      if (this.userService) {
        const result = await this.userService.getLinkedAuthMethods();
        if (result.success && result.authMethods.length <= 1) {
          return { success: false, error: 'Cannot remove the last authentication method' };
        }
      }

      // Unlink the provider
      await unlink(this.currentUser, providerId);
      
      log(`${providerId} unlinked from account`);

      // Update user profile in Firestore
      if (this.userService) {
        await this.userService.removeAuthMethod(providerId);
      }

      return { success: true, message: `${providerId} unlinked successfully` };
    } catch (error) {
      logError('Error unlinking auth method:', error.code);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  /**
   * Get all linked auth methods for current user
   */
  async getLinkedAuthMethods() {
    try {
      if (!this.userService) {
        throw new Error('User service not initialized');
      }

      const result = await this.userService.getLinkedAuthMethods();
      return result;
    } catch (error) {
      logError('Error getting linked auth methods:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const authService = new AuthService();

export default authService;
