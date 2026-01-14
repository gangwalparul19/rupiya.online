// User Service - Manages user profiles with caching and optimization
import { db } from '../config/firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import locationService from './location-service.js';

class UserService {
  constructor() {
    // In-memory cache for user data
    this.userCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    this.pendingRequests = new Map(); // Prevent duplicate requests
    
    // Collection name
    this.collectionName = 'users';
    
    // Listen to auth state changes to clear cache on logout
    authService.onAuthStateChanged((user) => {
      if (!user) {
        this.clearCache();
      }
    });
  }

  /**
   * Get or create user profile
   * This is called after signup/login to ensure user exists in Firestore
   * Uses caching to minimize Firestore reads
   * Race condition fixed: ensures only one request per user at a time
   */
  async getOrCreateUserProfile(user) {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userId = user.uid;

    // Check cache first
    const cachedUser = this.getCachedUser(userId);
    if (cachedUser) {
      return { success: true, user: cachedUser, fromCache: true };
    }

    // Check if there's already a pending request for this user
    // If so, wait for it to complete and return its result
    if (this.pendingRequests.has(userId)) {
      try {
        const result = await this.pendingRequests.get(userId);
        // After the pending request completes, check cache again
        // This ensures we return the cached result from the completed request
        const nowCachedUser = this.getCachedUser(userId);
        if (nowCachedUser) {
          return { success: true, user: nowCachedUser, fromCache: true };
        }
        return result;
      } catch (error) {
        // If the pending request failed, we'll try again below
        console.warn('[User Service] Pending request failed, retrying:', error);
      }
    }

    // Create new request promise and store it BEFORE awaiting
    // This prevents race condition where multiple calls reach this point
    const requestPromise = this._fetchOrCreateUser(user);
    this.pendingRequests.set(userId, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } catch (error) {
      console.error('[User Service] Error in getOrCreateUserProfile:', error);
      throw error;
    } finally {
      // Clean up pending request after completion
      this.pendingRequests.delete(userId);
    }
  }

  /**
   * Internal method to fetch or create user
   */
  async _fetchOrCreateUser(user) {
    const userId = user.uid;
    const userRef = doc(db, this.collectionName, userId);

    try {
      console.log('[User Service] Fetching user document for:', userId);
      // Try to get existing user document
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        console.log('[User Service] User document exists in Firestore');
        // User exists, update cache and return
        const userData = { id: userId, ...userDoc.data() };
        this.setCachedUser(userId, userData);
        
        // Update last login time and location if missing (fire and forget)
        this._updateLastLoginAndLocation(userId, userData).catch(err => 
          console.warn('Failed to update last login:', err)
        );
        
        return { success: true, user: userData, isNewUser: false };
      } else {
        console.log('[User Service] User document does NOT exist, creating new profile...');
        // User doesn't exist, create new profile with location
        const newUserData = await this._createUserData(user);
        console.log('[User Service] New user data prepared:', {
          email: newUserData.email,
          displayName: newUserData.displayName,
          hasLocation: !!newUserData.city
        });
        
        console.log('[User Service] Writing to Firestore collection:', this.collectionName, 'document:', userId);
        await setDoc(userRef, newUserData);
        console.log('[User Service] ✅ User document created successfully in Firestore');
        
        const userData = { id: userId, ...newUserData };
        this.setCachedUser(userId, userData);
        
        return { success: true, user: userData, isNewUser: true };
      }
    } catch (error) {
      console.error('[User Service] ❌ Error in _fetchOrCreateUser:', error);
      console.error('[User Service] Error code:', error.code);
      console.error('[User Service] Error message:', error.message);
      console.error('[User Service] Full error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create user data object from Firebase Auth user
   * Includes automatic location detection
   */
  async _createUserData(user) {
    console.log('[User Service] Creating user data for:', user.email);
    
    // Validate user object
    if (!user || typeof user !== 'object') {
      throw new Error('Invalid user object provided');
    }
    
    if (!user.email || typeof user.email !== 'string') {
      throw new Error('User email is required');
    }
    
    // Fetch location in parallel (don't block user creation)
    let location = null;
    try {
      console.log('[User Service] Attempting to fetch location...');
      if (locationService && typeof locationService.getUserLocation === 'function') {
        location = await locationService.getUserLocation();
        
        // Validate location structure
        if (location && typeof location !== 'object') {
          console.warn('[User Service] Invalid location data type:', typeof location);
          location = null;
        }
        
        console.log('[User Service] Location detected:', location);
      } else {
        console.log('[User Service] Location service not available');
      }
    } catch (error) {
      console.warn('[User Service] Could not detect location (non-blocking):', error);
      location = null;
    }

    // Extract auth methods from provider data with validation
    // Note: Cannot use serverTimestamp() inside arrays, so we use Date.now()
    const authMethods = [];
    const now = Date.now();
    
    if (user.providerData && Array.isArray(user.providerData)) {
      for (const provider of user.providerData) {
        if (provider && provider.providerId) {
          authMethods.push({
            providerId: provider.providerId,
            linkedAt: now,
            email: provider.email || user.email
          });
        }
      }
    }
    
    // Fallback if no provider data
    if (authMethods.length === 0) {
      authMethods.push({
        providerId: 'password',
        linkedAt: now,
        email: user.email
      });
    }

    console.log('[User Service] Auth methods:', authMethods.map(m => m.providerId).join(', '));

    const userData = {
      email: user.email,
      displayName: user.displayName || this._extractNameFromEmail(user.email),
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified || false,
      phoneNumber: user.phoneNumber || null,
      
      // Location data (auto-detected from IP) with null checks
      city: location?.city || null,
      region: location?.region || null,
      country: location?.country || null,
      countryCode: location?.countryCode || null,
      locationSource: location?.source || null,
      locationDetectedAt: location ? serverTimestamp() : null,
      
      // Provider information - DEPRECATED (kept for backward compatibility)
      providerId: user.providerData?.[0]?.providerId || 'password',
      
      // Auth methods - NEW: Track all linked authentication methods
      authMethods: authMethods,
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      
      // User preferences (can be customized later)
      preferences: {
        currency: 'INR',
        language: 'en',
        theme: 'light',
        notifications: true
      },
      
      // Profile completion status
      profileComplete: false,
      
      // Account status
      isActive: true
    };

    console.log('[User Service] User data object created successfully');
    return userData;
  }

  /**
   * Extract name from email (fallback for display name)
   */
  _extractNameFromEmail(email) {
    if (!email) return 'User';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Update last login timestamp and location if missing (fire and forget)
   */
  async _updateLastLoginAndLocation(userId, existingData) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const updateData = {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // If user doesn't have location data, try to fetch it
      if (!existingData.city && !existingData.country) {
        try {
          const location = await locationService.getUserLocation();
          if (location) {
            updateData.city = location.city;
            updateData.region = location.region;
            updateData.country = location.country;
            updateData.countryCode = location.countryCode;
            updateData.locationSource = location.source;
            updateData.locationDetectedAt = serverTimestamp();
            console.log('[User Service] Location updated for existing user:', location);
          }
        } catch (locError) {
          console.warn('[User Service] Could not fetch location for existing user:', locError);
        }
      }

      await updateDoc(userRef, updateData);
    } catch (error) {
      // Silently fail - not critical
      console.warn('Could not update last login:', error);
    }
  }

  /**
   * Update last login timestamp (fire and forget)
   * @deprecated Use _updateLastLoginAndLocation instead
   */
  async _updateLastLogin(userId) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Silently fail - not critical
      console.warn('Could not update last login:', error);
    }
  }

  /**
   * Get user profile from cache or Firestore
   */
  async getUserProfile(userId = null) {
    const uid = userId || authService.getCurrentUser()?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }

    // Check cache first
    const cachedUser = this.getCachedUser(uid);
    if (cachedUser) {
      return { success: true, user: cachedUser, fromCache: true };
    }

    // Fetch from Firestore
    try {
      const userRef = doc(db, this.collectionName, uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = { id: uid, ...userDoc.data() };
        this.setCachedUser(uid, userData);
        return { success: true, user: userData, fromCache: false };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const userRef = doc(db, this.collectionName, userId);
      
      // Add updatedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);

      // Update cache
      const cachedUser = this.getCachedUser(userId);
      if (cachedUser) {
        this.setCachedUser(userId, { ...cachedUser, ...updates });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const userRef = doc(db, this.collectionName, userId);
      await updateDoc(userRef, {
        preferences: preferences,
        updatedAt: serverTimestamp()
      });

      // Update cache
      const cachedUser = this.getCachedUser(userId);
      if (cachedUser) {
        cachedUser.preferences = preferences;
        this.setCachedUser(userId, cachedUser);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark profile as complete
   */
  async markProfileComplete() {
    return await this.updateUserProfile({ profileComplete: true });
  }

  /**
   * Cache management methods
   */
  getCachedUser(userId) {
    const cached = this.userCache.get(userId);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.userCache.delete(userId);
      return null;
    }

    return cached.data;
  }

  setCachedUser(userId, userData) {
    this.userCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.userCache.clear();
    this.pendingRequests.clear();
  }

  invalidateCache(userId = null) {
    if (userId) {
      this.userCache.delete(userId);
    } else {
      this.clearCache();
    }
  }

  /**
   * Get current user's ID (helper method)
   */
  getCurrentUserId() {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  /**
   * Check if user profile exists
   */
  async userExists(userId) {
    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  /**
   * Find user by email address
   * Returns user data if found, null otherwise
   * Note: This requires authenticated user or will fail gracefully
   */
  async getUserByEmail(email) {
    if (!email) {
      return null;
    }

    try {
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      
      const normalizedEmail = email.toLowerCase().trim();
      const usersRef = collection(db, this.collectionName);
      const q = query(usersRef, where('email', '==', normalizedEmail));
      
      try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          return null;
        }

        // Return first matching user
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
      } catch (firestoreError) {
        // If permission denied, it might be because user is not authenticated
        // This is expected during signup/login flow
        if (firestoreError.code === 'permission-denied') {
          console.warn('[User Service] Permission denied querying users by email - user may not be authenticated');
          return null;
        }
        throw firestoreError;
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  // ============================================
  // USER PREFERENCES MANAGEMENT (Firestore)
  // ============================================

  /**
   * Get user preferences from Firestore
   * Includes: currentContext, currentGroupId, isDemoMode, pendingInvitationId
   */
  async getUserPreferences(userId = null) {
    const uid = userId || authService.getCurrentUser()?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }

    try {
      const prefsRef = doc(db, 'userPreferences', uid);
      const prefsDoc = await getDoc(prefsRef);

      if (prefsDoc.exists()) {
        return { success: true, data: { id: uid, ...prefsDoc.data() } };
      } else {
        // Return default preferences if document doesn't exist
        return { 
          success: true, 
          data: {
            id: uid,
            currentContext: 'personal',
            currentGroupId: null,
            isDemoMode: false,
            pendingInvitationId: null
          }
        };
      }
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user preferences in Firestore
   * Supports partial updates
   */
  async updateUserPreferences(updates) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const prefsRef = doc(db, 'userPreferences', userId);
      
      // Add updatedAt timestamp
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Use setDoc with merge to create if doesn't exist
      await setDoc(prefsRef, updateData, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**

   * Get current context
   */
  async getCurrentContext() {
    const result = await this.getUserPreferences();
    if (result.success) {
      return {
        context: result.data.currentContext || 'personal',
        groupId: result.data.currentGroupId || null
      };
    }
    return { context: 'personal', groupId: null };
  }

  /**
   * Set demo mode
   */
  async setDemoMode(enabled) {
    return await this.updateUserPreferences({
      isDemoMode: enabled,
      demoModeEnabledAt: enabled ? serverTimestamp() : null
    });
  }

  /**
   * Check if demo mode is enabled
   */
  async isDemoMode() {
    const result = await this.getUserPreferences();
    if (result.success) {
      return result.data.isDemoMode || false;
    }
    return false;
  }

  /**
   * Set pending invitation
   */
  async setPendingInvitation(invitationId) {
    return await this.updateUserPreferences({
      pendingInvitationId: invitationId
    });
  }

  /**
   * Get pending invitation
   */
  async getPendingInvitation() {
    const result = await this.getUserPreferences();
    if (result.success) {
      return result.data.pendingInvitationId || null;
    }
    return null;
  }

  /**
   * Clear pending invitation
   */
  async clearPendingInvitation() {
    return await this.updateUserPreferences({
      pendingInvitationId: null,
      pendingInvitationAcceptedAt: serverTimestamp()
    });
  }

  /**
   * Get all linked auth methods for current user
   * Returns array of auth methods (e.g., ['password', 'google.com'])
   */
  async getLinkedAuthMethods(userId = null) {
    const uid = userId || authService.getCurrentUser()?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }

    try {
      const userRef = doc(db, this.collectionName, uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const authMethods = userDoc.data().authMethods || [];
        return { success: true, authMethods };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error) {
      console.error('Error getting auth methods:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has a specific auth method linked
   */
  async hasAuthMethod(providerId, userId = null) {
    const uid = userId || authService.getCurrentUser()?.uid;
    if (!uid) {
      throw new Error('User not authenticated');
    }

    try {
      const result = await this.getLinkedAuthMethods(uid);
      if (result.success) {
        return result.authMethods.some(method => method.providerId === providerId);
      }
      return false;
    } catch (error) {
      console.error('Error checking auth method:', error);
      return false;
    }
  }

  /**
   * Add a new auth method to user's linked methods
   * Called when user links a new provider (e.g., adds password to Google account)
   */
  async addAuthMethod(providerId, email) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'User profile not found' };
      }

      const authMethods = userDoc.data().authMethods || [];
      
      // Check if method already exists
      if (authMethods.some(method => method.providerId === providerId)) {
        return { success: false, error: `${providerId} is already linked to this account` };
      }

      // Add new method (use Date.now() instead of serverTimestamp() - not allowed in arrays)
      authMethods.push({
        providerId,
        linkedAt: Date.now(),
        email
      });

      await updateDoc(userRef, {
        authMethods,
        updatedAt: serverTimestamp()
      });

      // Invalidate cache
      this.invalidateCache(userId);

      return { success: true, message: `${providerId} linked successfully` };
    } catch (error) {
      console.error('Error adding auth method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove an auth method from user's linked methods
   * Prevents removing the last auth method
   */
  async removeAuthMethod(providerId) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const userRef = doc(db, this.collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'User profile not found' };
      }

      let authMethods = userDoc.data().authMethods || [];

      // Prevent removing the last auth method
      if (authMethods.length <= 1) {
        return { success: false, error: 'Cannot remove the last authentication method' };
      }

      // Remove the method
      authMethods = authMethods.filter(method => method.providerId !== providerId);

      await updateDoc(userRef, {
        authMethods,
        updatedAt: serverTimestamp()
      });

      // Invalidate cache
      this.invalidateCache(userId);

      return { success: true, message: `${providerId} unlinked successfully` };
    } catch (error) {
      console.error('Error removing auth method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup real-time listener for user preferences
   * Useful for multi-tab sync
   */
  setupPreferencesListener(callback) {
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    try {
      const prefsRef = doc(db, 'userPreferences', userId);
      
      const unsubscribe = onSnapshot(prefsRef, (docSnap) => {
        if (docSnap.exists()) {
          const prefs = { id: userId, ...docSnap.data() };
          
          // Update localStorage for offline access
          try {
            localStorage.setItem('userPreferences', JSON.stringify(prefs));
          } catch (e) {
            console.warn('Could not update localStorage:', e);
          }
          
          // Call callback with updated preferences
          callback(prefs);
        }
      }, (error) => {
        console.error('Error listening to preferences:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up preferences listener:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const userService = new UserService();
export default userService;
