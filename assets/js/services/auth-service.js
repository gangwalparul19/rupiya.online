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
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.authInitialized = false;
    this.authInitPromise = null;
    this.resolved = false;
    this.userService = null; // Will be set after import to avoid circular dependency
  }

  // Initialize auth state listener
  init() {
    if (this.authInitPromise) {
      return this.authInitPromise;
    }

    this.authInitPromise = new Promise((resolve) => {
      // Add a small delay to ensure persistence is set in firebase-config.js
      setTimeout(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          console.log('[Auth Service] Auth state changed:', user ? user.email : 'null');
          this.currentUser = user;
          this.authInitialized = true;
          this.authStateListeners.forEach(callback => callback(user));
          
          // Only resolve once
          if (!this.resolved) {
            this.resolved = true;
            resolve(user);
          }
        });
      }, 100); // Small delay to let persistence be set
    });

    return this.authInitPromise;
  }

  // Wait for auth to be initialized
  async waitForAuth() {
    if (this.authInitialized) {
      return this.currentUser;
    }
    if (!this.authInitPromise) {
      await this.init();
    }
    return await this.authInitPromise;
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    // Call immediately with current state if initialized
    if (this.authInitialized) {
      callback(this.currentUser);
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      // Ensure persistence is set to LOCAL
      await setPersistence(auth, browserLocalPersistence);
      console.log('[Auth Service] Persistence set for email sign-in');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('[Auth Service] Email sign-in successful:', userCredential.user.email);
      
      // Create/update user profile in Firestore
      if (this.userService) {
        await this.userService.getOrCreateUserProfile(userCredential.user);
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth Service] Email sign-in error:', error);
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Sign up with email and password
  async signUp(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
        // Refresh user to get updated displayName
        await userCredential.user.reload();
      }
      
      // Create user profile in Firestore
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
      // Ensure persistence is set to LOCAL
      await setPersistence(auth, browserLocalPersistence);
      console.log('[Auth Service] Persistence set for Google sign-in');
      
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      console.log('[Auth Service] Google sign-in successful:', userCredential.user.email);
      
      // Create/update user profile in Firestore
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
      // Clear user service cache
      if (this.userService) {
        this.userService.clearCache();
      }
      
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  // Set user service (called after import to avoid circular dependency)
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
}

// Create and export singleton instance
const authService = new AuthService();
authService.init();

export default authService;
