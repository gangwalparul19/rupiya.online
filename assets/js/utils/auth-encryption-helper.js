// Auth Encryption Helper
// Manages encryption initialization during authentication
// 
// CROSS-DEVICE ENCRYPTION:
// - Google users: Encryption is fully automatic - same key on all devices
// - Email/password users: Key is stored encrypted in Firestore, decrypted with password on login

import encryptionService from '../services/encryption-service.js';
import authService from '../services/auth-service.js';

class AuthEncryptionHelper {
  constructor() {
    this.ENCRYPTION_READY_KEY = 'rupiya_encryption_ready';
    this._initializationPromise = null;
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
      console.log('[AuthEncryption] Initialization already in progress, waiting...');
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
        sessionStorage.setItem(this.ENCRYPTION_READY_KEY, 'true');
        
        const userType = password ? 'email/password' : 'Google';
        console.log(`[AuthEncryption] Encryption initialized successfully for ${userType} user`);
        console.log('[AuthEncryption] Cross-device sync: ENABLED - same encryption key on all devices');
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
    
    // Wait for session restoration to complete
    await encryptionService.waitForRestore();
    
    // If encryption is ready from session, no re-init needed
    if (encryptionService.isReady()) {
      return false;
    }
    
    // For Google users, we can auto-reinitialize
    if (this.isGoogleUser()) {
      console.log('[AuthEncryption] Google user needs auto-reinitialization');
      const success = await this.initializeForGoogleUser(user.uid);
      return !success; // Return true only if auto-init failed
    }
    
    // For password users, they need to re-enter password
    return true;
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
    sessionStorage.removeItem(this.ENCRYPTION_READY_KEY);
    this._initializationPromise = null;
    console.log('[AuthEncryption] Encryption cleared');
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
    const event = new CustomEvent('encryption-reauth-needed', {
      detail: { 
        message: 'Please enter your password to decrypt your data',
        reason: 'session_expired'
      }
    });
    window.dispatchEvent(event);
  }
}

// Create and export singleton instance
const authEncryptionHelper = new AuthEncryptionHelper();
export default authEncryptionHelper;
