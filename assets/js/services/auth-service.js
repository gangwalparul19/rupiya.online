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
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

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
      console.log('[Auth Service] Setting up auth state listener...');
      
      // The first onAuthStateChanged callback gives us the initial auth state
      // This fires once Firebase has checked for a persisted session
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('[Auth Service] Auth state changed:', user ? user.email : 'Not logged in');
        
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
          console.log('[Auth Service] Auth initialized with user:', user ? user.email : 'null');
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
    console.log('[Auth Service] waitForAuth called');
    
    // Ensure init has been called
    if (!this.authInitPromise) {
      this.init();
    }
    
    // Wait for Firebase to determine the auth state
    // This promise resolves after onAuthStateChanged fires for the first time
    const user = await this.authInitPromise;
    
    console.log('[Auth Service] waitForAuth complete, user:', user ? user.email : 'null');
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
      console.log('[Auth Service] Email sign-in successful');
      
      // Set auth flag for quick check
      localStorage.setItem('rupiya_user_logged_in', 'true');
      
      if (this.userService) {
        await this.userService.getOrCreateUserProfile(userCredential.user);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth Service] Sign-in error:', error);
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
      
      // Set auth flag for quick check
      localStorage.setItem('rupiya_user_logged_in', 'true');
      
      if (this.userService) {
        await this.userService.getOrCreateUserProfile(
          displayName ? auth.currentUser : userCredential.user
        );
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      console.log('[Auth Service] Google sign-in successful');
      
      // Set auth flag for quick check
      localStorage.setItem('rupiya_user_logged_in', 'true');
      
      if (this.userService) {
        await this.userService.getOrCreateUserProfile(userCredential.user);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth Service] Google sign-in error:', error);
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
      
      await signOut(auth);
      return { success: true };
    } catch (error) {
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
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const isAuth = this.currentUser !== null;
    console.log('[Auth Service] isAuthenticated:', isAuth);
    return isAuth;
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
}

// Create and export singleton instance
const authService = new AuthService();

export default authService;
