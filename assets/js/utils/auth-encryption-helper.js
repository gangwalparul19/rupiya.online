// Auth Encryption Helper
// Manages encryption initialization during authentication

import encryptionService from '../services/encryption-service.js';
import authService from '../services/auth-service.js';

class AuthEncryptionHelper {
  constructor() {
    this.PASSWORD_HASH_KEY = 'rupiya_pwd_hash';
    this.ENCRYPTION_READY_KEY = 'rupiya_encryption_ready';
  }

  // Initialize encryption after login with email/password
  async initializeAfterLogin(password, userId) {
    if (!password || !userId) {
      console.warn('[AuthEncryption] Cannot initialize without password and userId');
      return false;
    }

    try {
      const success = await encryptionService.initialize(password, userId);
      
      if (success) {
        // Store a hash to verify password on page refresh
        // Note: This is NOT the encryption key, just a verification hash
        const verificationHash = await this.createVerificationHash(password, userId);
        sessionStorage.setItem(this.PASSWORD_HASH_KEY, verificationHash);
        sessionStorage.setItem(this.ENCRYPTION_READY_KEY, 'true');
        
        console.log('[AuthEncryption] Encryption initialized successfully');
      }
      
      return success;
    } catch (error) {
      console.error('[AuthEncryption] Failed to initialize encryption:', error);
      return false;
    }
  }

  // Create a verification hash (not the encryption key)
  async createVerificationHash(password, userId) {
    const data = new TextEncoder().encode(password + userId + 'verification');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Check if encryption needs re-initialization (after page refresh)
  needsReinitialization() {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    // If user is logged in but encryption is not ready
    return !encryptionService.isReady();
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
    sessionStorage.removeItem(this.PASSWORD_HASH_KEY);
    sessionStorage.removeItem(this.ENCRYPTION_READY_KEY);
    console.log('[AuthEncryption] Encryption cleared');
  }

  // Get encryption status
  getStatus() {
    return {
      ...encryptionService.getStatus(),
      isGoogleUser: this.isGoogleUser(),
      needsReinitialization: this.needsReinitialization()
    };
  }

  // Prompt user to re-enter password for encryption
  // This is needed after page refresh since we don't store the password
  showReauthPrompt() {
    // This will be called by the UI to show a modal asking for password
    const event = new CustomEvent('encryption-reauth-needed', {
      detail: { message: 'Please enter your password to decrypt your data' }
    });
    window.dispatchEvent(event);
  }
}

// Create and export singleton instance
const authEncryptionHelper = new AuthEncryptionHelper();
export default authEncryptionHelper;
