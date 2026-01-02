// User Service - Manages user profiles with caching and optimization
import { db } from '../config/firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

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
    if (this.pendingRequests.has(userId)) {
      return await this.pendingRequests.get(userId);
    }

    // Create new request promise
    const requestPromise = this._fetchOrCreateUser(user);
    this.pendingRequests.set(userId, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
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
      // Try to get existing user document
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // User exists, update cache and return
        const userData = { id: userId, ...userDoc.data() };
        this.setCachedUser(userId, userData);
        
        // Update last login time (fire and forget - don't wait)
        this._updateLastLogin(userId).catch(err => 
          console.warn('Failed to update last login:', err)
        );
        
        return { success: true, user: userData, isNewUser: false };
      } else {
        // User doesn't exist, create new profile
        const newUserData = this._createUserData(user);
        await setDoc(userRef, newUserData);
        
        const userData = { id: userId, ...newUserData };
        this.setCachedUser(userId, userData);
        
        return { success: true, user: userData, isNewUser: true };
      }
    } catch (error) {
      console.error('Error in getOrCreateUserProfile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create user data object from Firebase Auth user
   */
  _createUserData(user) {
    return {
      email: user.email,
      displayName: user.displayName || this._extractNameFromEmail(user.email),
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber || null,
      
      // Provider information
      providerId: user.providerData[0]?.providerId || 'password',
      
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
   * Update last login timestamp (fire and forget)
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
}

// Create and export singleton instance
const userService = new UserService();
export default userService;
