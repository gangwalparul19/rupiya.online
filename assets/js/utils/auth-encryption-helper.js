// Auth Encryption Helper
// Manages encryption initialization during authentication
// 
// SEAMLESS CROSS-DEVICE ENCRYPTION (V5 - SIMPLIFIED):
// - Both email and Google users: Same deterministic key derivation
// - Keys automatically generated on EVERY page load from userId
// - NO password re-entry EVER - completely automatic
// - NO Firestore lookups needed - faster and more reliable
// - Works identically across ALL devices instantly
// - User experience: Encryption is completely invisible

import encryptionService from '../services/encryption-service.js';
import authService from '../services/auth-service.js';

class AuthEncryptionHelper {
  constructor() {
    this._initializationPromise = null;
    this._reauthAttempts = 0;
    this.MAX_REAUTH_ATTEMPTS = 3;
  }

  // Initialize encryption after login with email/password
  // For password users, this stores an encrypted version of the key in Firestore
  async initializeAfterLogin(password, userId) {
    if (!userId) {
      console.warn('[AuthEncryption] Cannot initialize without userId');
      return false;
    }

    // Prevent duplicate initialization
    if (this._initializationPromise) {
      return await this._initializationPromise;
    }

    this._initializationPromise = this._doInitialize(password, userId);
    
    try {
      const result = await this._initializationPromise;
      return result;
    } finally {
      this._initializationPromise = null;
    }
  }

  async _doInitialize(password, userId) {
    try {
      const success = await encryptionService.initialize(password, userId);
      
      if (success) {
        // Validate that encryption is working correctly
        const isValid = await encryptionService.validateKeyIntegrity();
        if (!isValid) {
          console.error('[AuthEncryption] Encryption validation failed!');
          return false;
        }
      }
      
      return success;
    } catch (error) {
      console.error('[AuthEncryption] Failed to initialize encryption:', error);
      return false;
    }
  }

  // Initialize encryption for Google users (no password needed)
  // This is fully automatic and works identically on all devices
  async initializeForGoogleUser(userId) {
    return await this.initializeAfterLogin(null, userId);
  }

  // Check if encryption needs re-initialization (after page refresh)
  async needsReinitialization() {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    // Wait for any ongoing initialization to complete
    await encryptionService.waitForInitialization();
    
    // If encryption is ready, validate and we're done
    if (encryptionService.isReady()) {
      const isValid = await encryptionService.validateKeyIntegrity();
      if (isValid) {
        return false; // All good, no reauth needed
      }
    }
    
    // For BOTH Google and email users, we can auto-reinitialize
    // No password needed - deterministic key from userId
    const success = await this.initializeAfterLogin(null, user.uid);
    
    // Return false if successful (no manual reauth needed)
    // Return true only if auto-init completely failed (rare)
    return !success;
  }

  // Check if user logged in with Google (no password available)
  isGoogleUser() {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    return user.providerData.some(provider => provider.providerId === 'google.com');
  }

  // Clear encryption on logout
  clearEncryption() {
    encryptionService.clear();
    this._initializationPromise = null;
    this._reauthAttempts = 0;
  }

  // Get encryption status
  getStatus() {
    const baseStatus = encryptionService.getStatus();
    return {
      ...baseStatus,
      isGoogleUser: this.isGoogleUser(),
      crossDeviceEnabled: true // Always enabled in new system
    };
  }

  // Check if this is a new user (no existing encryption data)
  async isNewUser(userId) {
    try {
      const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
      
      const db = getFirestore(getApp());
      const userEncryptionRef = doc(db, 'userEncryption', userId);
      const encryptionDoc = await getDoc(userEncryptionRef);
      
      return !encryptionDoc.exists();
    } catch (error) {
      console.warn('[AuthEncryption] Could not check if new user:', error);
      return true; // Assume new user on error
    }
  }

  // Prompt user to re-enter password for encryption (only for password users)
  showReauthPrompt() {
    if (this._reauthAttempts >= this.MAX_REAUTH_ATTEMPTS) {
      const event = new CustomEvent('encryption-reauth-failed', {
        detail: { 
          message: 'Too many failed attempts. Please sign in again.',
          reason: 'max_attempts_exceeded'
        }
      });
      window.dispatchEvent(event);
      return;
    }
    
    this._reauthAttempts++;
    const event = new CustomEvent('encryption-reauth-needed', {
      detail: { 
        message: 'Please enter your password to decrypt your data',
        reason: 'session_expired',
        attempt: this._reauthAttempts,
        maxAttempts: this.MAX_REAUTH_ATTEMPTS
      }
    });
    window.dispatchEvent(event);
  }

  // Reset reauth attempts after successful authentication
  resetReauthAttempts() {
    this._reauthAttempts = 0;
  }
}

// Create and export singleton instance
const authEncryptionHelper = new AuthEncryptionHelper();
export default authEncryptionHelper;
