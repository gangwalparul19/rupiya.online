/**
 * Services Initialization
 * This file initializes all services and sets up their dependencies
 * Import this file in your main app files to ensure proper initialization
 */

import authService from './auth-service.js';
import userService from './user-service.js';
import encryptionService from './encryption-service.js';

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
          console.log('✅ New user profile created');
        } else if (result.fromCache) {
          console.log('✅ User profile loaded from cache');
        } else {
          console.log('✅ User profile loaded from Firestore');
        }
      }
      
      // Check encryption status
      const encryptionStatus = encryptionService.getStatus();
      if (encryptionStatus.enabled && !encryptionStatus.ready) {
        console.log('🔐 Encryption enabled but not initialized - waiting for session restore or re-auth');
      }
    } catch (error) {
      console.error('❌ Error initializing user profile:', error);
    }
  } else {
    // Only clear encryption if we've previously seen a logged-in user
    // This prevents clearing on initial page load before auth state is restored
    if (hasSeenLoggedInUser) {
      console.log('🔐 User signed out - clearing encryption');
      encryptionService.clear();
      hasSeenLoggedInUser = false;
    }
  }
});

// Export services for convenience
export { authService, userService, encryptionService };

// Export default object with all services
export default {
  auth: authService,
  user: userService,
  encryption: encryptionService
};
