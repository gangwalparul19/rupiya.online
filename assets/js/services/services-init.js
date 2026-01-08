/**
 * Services Initialization
 * This file initializes all services and sets up their dependencies
 * Import this file in your main app files to ensure proper initialization
 * 
 * ENCRYPTION CROSS-DEVICE SYNC:
 * - Google users: Fully automatic - deterministic key derived from userId
 * - Email/password users: Encrypted key stored in Firestore, decrypted on login
 */

import authService from './auth-service.js';
import userService from './user-service.js';
import encryptionService from './encryption-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import logger from '../utils/logger.js';

const log = logger.create('Services');

// Connect auth service with user service (avoid circular dependency)
authService.setUserService(userService);

// Track if we've seen a logged-in user to avoid clearing encryption prematurely
let hasSeenLoggedInUser = false;

// Initialize auth state listener that creates/updates user profile
authService.onAuthStateChanged(async (user) => {
  if (user) {
    hasSeenLoggedInUser = true;
    // User is signed in, ensure profile exists in Firestore
    try {
      const result = await userService.getOrCreateUserProfile(user);
      if (result.success) {
        if (result.isNewUser) {
          log.log('✅ New user profile created');
        } else if (result.fromCache) {
          log.log('✅ User profile loaded from cache');
        } else {
          log.log('✅ User profile loaded from Firestore');
        }
      }
      
      // Wait for any session restoration to complete first
      await encryptionService.waitForRestore();
      
      // Check current encryption status
      const encryptionStatus = encryptionService.getStatus();
      
      if (encryptionStatus.enabled && !encryptionStatus.ready) {
        // Encryption not ready - initialize based on user type
        if (authEncryptionHelper.isGoogleUser()) {
          // Google users: Fully automatic initialization
          log.log('🔐 Initializing encryption for Google user (automatic cross-device sync)...');
          const success = await authEncryptionHelper.initializeForGoogleUser(user.uid);
          if (success) {
            log.log('✅ Encryption initialized for Google user - same key on all devices');
          } else {
            log.warn('⚠️ Failed to initialize encryption for Google user');
          }
        } else {
          // Email/password user - check if we need re-authentication
          // On fresh login, encryption is initialized in auth-service with the password
          // On page refresh, we try to restore from session first
          const needsReauth = await authEncryptionHelper.needsReinitialization();
          if (needsReauth) {
            log.log('🔐 Email/password user session expired - password needed for encryption');
            // Dispatch event for UI to show re-auth prompt
            authEncryptionHelper.showReauthPrompt();
          }
        }
      } else if (encryptionStatus.ready) {
        log.log('✅ Encryption already ready (restored from session)');
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
