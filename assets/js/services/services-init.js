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

// Initialize auth state listener that creates/updates user profile
authService.onAuthStateChanged(async (user) => {
  if (user) {
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
        console.log('🔐 Encryption enabled but not initialized - user may need to re-authenticate');
      }
    } catch (error) {
      console.error('❌ Error initializing user profile:', error);
    }
  } else {
    // User signed out - clear encryption
    encryptionService.clear();
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
