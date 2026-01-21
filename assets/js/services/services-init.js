/**
 * Services Initialization
 * This file initializes all services and sets up their dependencies
 * Import this file in your main app files to ensure proper initialization
 * 
 * SEAMLESS CROSS-DEVICE ENCRYPTION (V5):
 * - Both email and Google users: Automatic deterministic key from userId
 * - NO password re-entry required - completely automatic
 * - Works seamlessly across all devices
 */

import authService from './auth-service.js';
import userService from './user-service.js';
import encryptionService from './encryption-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import logger from '../utils/logger.js';
import initPrivacyModeButton from '../components/privacy-mode-button.js';

const log = logger.create('Services');

// Connect auth service with user service using lazy initialization
// This avoids circular dependency issues by deferring the connection
let servicesConnected = false;
function ensureServicesConnected() {
  if (!servicesConnected) {
    authService.setUserService(userService);
    servicesConnected = true;
  }
}

// Track if we've seen a logged-in user to avoid clearing encryption prematurely
let hasSeenLoggedInUser = false;

// Initialize auth state listener that creates/updates user profile
authService.onAuthStateChanged(async (user) => {
  // Ensure services are connected before processing
  ensureServicesConnected();
  
  if (user) {
    hasSeenLoggedInUser = true;
    // User is signed in, ensure profile exists in Firestore
    try {
      log.log('🔄 Creating/loading user profile for:', user.uid);
      const result = await userService.getOrCreateUserProfile(user);
      log.log('📊 User profile result:', result);
      
      if (result.success) {
        if (result.isNewUser) {
          log.log('✅ New user profile created in users collection');
        } else if (result.fromCache) {
          log.log('✅ User profile loaded from cache');
        } else {
          log.log('✅ User profile loaded from Firestore');
        }
      } else {
        log.error('❌ Failed to create/load user profile:', result.error);
      }
      
      // Wait for any ongoing initialization to complete
      await encryptionService.waitForInitialization();
      
      // Check current encryption status
      const encryptionStatus = encryptionService.getStatus();
      
      if (encryptionStatus.enabled && !encryptionStatus.ready) {
        // Encryption not ready - initialize automatically (works for both user types)
        log.log('🔐 Initializing encryption automatically...');
        const success = await authEncryptionHelper.initializeAfterLogin(null, user.uid);
        if (success) {
          log.log('✅ Encryption initialized - seamless cross-device sync enabled');
          // Dispatch event so other components can re-initialize with encryption
          window.dispatchEvent(new CustomEvent('encryptionReady'));
        } else {
          log.warn('⚠️ Failed to initialize encryption');
        }
      } else if (encryptionStatus.ready) {
        log.log('✅ Encryption already ready');
        // Dispatch event in case components are waiting
        window.dispatchEvent(new CustomEvent('encryptionReady'));
      }
      
      // Log final encryption status
      const finalStatus = encryptionService.getStatus();
      if (finalStatus.enabled) {
        if (finalStatus.ready) {
          log.log('🔐 Encryption: READY - data is encrypted/decrypted automatically');
        } else {
          log.log('🔐 Encryption: PENDING - waiting for user authentication');
        }
      }
    } catch (error) {
      log.error('❌ Error initializing user profile:', error);
    }
  } else {
    // Only clear encryption if we've previously seen a logged-in user
    // This prevents clearing on initial page load before auth state is restored
    if (hasSeenLoggedInUser) {
      log.log('🔐 User signed out - clearing encryption');
      authEncryptionHelper.clearEncryption();
      hasSeenLoggedInUser = false;
    }
  }
});

// Export services for convenience
export { authService, userService, encryptionService, authEncryptionHelper };

// Export default object with all services
export default {
  auth: authService,
  user: userService,
  encryption: encryptionService,
  authEncryption: authEncryptionHelper
};

// Initialize privacy mode button globally (works on all pages)
// This single button controls privacy mode across the entire application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initPrivacyModeButton();
  });
} else {
  initPrivacyModeButton();
}
