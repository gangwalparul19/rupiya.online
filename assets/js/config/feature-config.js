/**
 * Feature Configuration System
 * Allows users to enable/disable features they want to use
 * 
 * Features are organized by category and can be toggled on/off
 * Configuration is stored encrypted in Firestore 'features' collection
 * Document ID = userId (each user has exactly one document)
 */

import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';
import encryptionService from '../services/encryption-service.js';

// Collection name for features
const FEATURES_COLLECTION = 'features';

// Default feature configuration - all features available
const DEFAULT_FEATURES = {
  dashboard: {
    enabled: true,
    label: 'Dashboard',
    description: 'Main dashboard with overview',
    category: 'core',
    required: true // Cannot be disabled
  },
  predictiveAnalytics: {
    enabled: false,
    label: 'Predictive Analytics',
    description: 'AI-powered forecasting and trends',
    category: 'analytics'
  },
  aiInsights: {
    enabled: false,
    label: 'AI Insights',
    description: 'Personalized spending analysis',
    category: 'analytics'
  },
  expenses: {
    enabled: true,
    label: 'Expenses',
    description: 'Track your spending',
    category: 'transactions',
    required: true
  },
  income: {
    enabled: false,
    label: 'Income',
    description: 'Track your earnings',
    category: 'transactions'
  },
  splitExpense: {
    enabled: false,
    label: 'Split Expenses',
    description: 'Share expenses with friends',
    category: 'transactions'
  },
  recurring: {
    enabled: false,
    label: 'Recurring',
    description: 'Auto-track subscriptions & EMIs',
    category: 'transactions'
  },
  budgets: {
    enabled: false,
    label: 'Budgets',
    description: 'Set and manage budgets',
    category: 'planning'
  },
  goals: {
    enabled: false,
    label: 'Goals',
    description: 'Set financial milestones',
    category: 'planning'
  },
  investments: {
    enabled: false,
    label: 'Investments',
    description: 'Track stocks, MFs & portfolio',
    category: 'planning'
  },
  loans: {
    enabled: false,
    label: 'Loans & EMI',
    description: 'Track loans and EMIs',
    category: 'planning'
  },
  transfers: {
    enabled: false,
    label: 'Transfers',
    description: 'Track money transfers',
    category: 'planning'
  },
  netWorth: {
    enabled: false,
    label: 'Net Worth',
    description: 'Calculate total net worth',
    category: 'planning'
  },
  houses: {
    enabled: false,
    label: 'Houses',
    description: 'Track properties',
    category: 'assets'
  },
  vehicles: {
    enabled: false,
    label: 'Vehicles',
    description: 'Track vehicles & maintenance',
    category: 'assets'
  },
  houseHelp: {
    enabled: false,
    label: 'House Help',
    description: 'Track staff payments',
    category: 'assets'
  },
  creditCards: {
    enabled: false,
    label: 'Credit Cards',
    description: 'Manage cards & track rewards',
    category: 'planning'
  },
  healthcareInsurance: {
    enabled: false,
    label: 'Healthcare & Insurance',
    description: 'Track medical expenses & policies',
    category: 'planning'
  },
  spendingPatterns: {
    enabled: false,
    label: 'Spending Patterns',
    description: 'Visualize spending with heatmaps',
    category: 'analytics'
  },
  tripGroups: {
    enabled: false,
    label: 'Trip Groups',
    description: 'Manage group trips',
    category: 'social'
  },
  notes: {
    enabled: true,
    label: 'Notes',
    description: 'Keep notes and reminders',
    category: 'organize',
    required: true
  },
  documents: {
    enabled: false,
    label: 'Documents',
    description: 'Store and organize documents',
    category: 'organize'
  }
};

// Feature categories for UI organization
const FEATURE_CATEGORIES = {
  core: { label: 'Core', icon: '⭐', description: 'Essential features' },
  analytics: { label: 'Analytics & Insights', icon: '📊', description: 'Data analysis and predictions' },
  transactions: { label: 'Transactions', icon: '💰', description: 'Income and expense tracking' },
  planning: { label: 'Planning & Goals', icon: '🎯', description: 'Budgets, goals, and investments' },
  assets: { label: 'Assets & Property', icon: '🏠', description: 'Property and vehicle tracking' },
  social: { label: 'Social & Groups', icon: '👥', description: 'Group activities and sharing' },
  organize: { label: 'Organization', icon: '📁', description: 'Notes and documents' }
};

class FeatureConfigManager {
  constructor() {
    this.userFeatures = null;
    this.initialized = false;
    this.currentUserId = null;
    this.CACHE_KEY = 'rupiya_feature_config';
    this._setupEncryptionListener();
  }

  /**
   * Get cached features from localStorage for instant loading
   * DISABLED - Always load from Firestore to prevent stale cache issues
   */
  _getCachedFeatures(userId) {
    // ALWAYS return null to force Firestore load
    // Cache is causing issues with stale data
    return null;
  }

  /**
   * Save features to localStorage cache
   * DISABLED - Cache is causing stale data issues
   */
  _cacheFeatures(userId, features) {
    // Don't cache - always load from Firestore
  }

  /**
   * Setup listener for encryption ready event
   */
  _setupEncryptionListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('encryptionReady', async () => {
        // If we have a user and features are loaded, try to reload with proper decryption
        if (this.currentUserId && this.userFeatures) {
          const enabledCount = Object.values(this.userFeatures).filter(f => {
            if (typeof f === 'object' && f !== null) {
              return f.enabled === true;
            }
            return f === true;
          }).length;
          
          // If we only have 3 features (the defaults), we likely failed to decrypt
          // Try to reload now that encryption is ready
          if (enabledCount <= 3) {
            await this.reloadFromFirestore();
          }
        }
      });
    }
  }

  async init() {
    if (this.initialized) return;

    // Mark as initialized immediately to prevent concurrent calls
    this.initialized = true;

    try {
      // Try to get current user quickly
      let user = authService.getCurrentUser();
      
      if (!user) {
        try {
          user = await Promise.race([
            authService.waitForAuth(),
            new Promise(resolve => setTimeout(() => resolve(null), 1000))
          ]);
        } catch (e) {
          // Ignore
        }
      }
      
      if (!user) {
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        return;
      }

      this.currentUserId = user.uid;

      // OPTIMIZATION: Load features with timeout, but wait for encryption if needed
      try {
        const docRef = doc(db, FEATURES_COLLECTION, user.uid);
        
        // Add timeout to Firestore call
        const docPromise = getDoc(docRef);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firestore timeout')), 3000) // 3 second timeout
        );
        
        const docSnap = await Promise.race([docPromise, timeoutPromise]);
        
        if (docSnap.exists()) {
          let savedData = docSnap.data();
          
          // Check if data is encrypted
          if (savedData._encrypted) {
            // ENCRYPTION SAFETY: Wait for encryption if data is encrypted
            console.log('[FeatureConfig] Data is encrypted, waiting for encryption service...');
            
            // Wait for encryption with reasonable timeout
            const encryptionReady = await Promise.race([
              encryptionService.waitForInitialization(),
              new Promise(resolve => setTimeout(() => resolve(false), 5000))
            ]).catch(() => false);
            
            if (!encryptionReady || !encryptionService.isReady()) {
              console.warn('[FeatureConfig] Encryption not ready, using defaults (will reload when ready)');
              this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
              return;
            }
            
            // Decrypt the data
            try {
              const decryptedData = await Promise.race([
                encryptionService.decryptObject(savedData, FEATURES_COLLECTION),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Decrypt timeout')), 2000))
              ]);
              console.log('[FeatureConfig] ✅ Features decrypted successfully');
              
              // Extract features
              let savedFeatures = decryptedData?.features || null;
              
              if (savedFeatures && typeof savedFeatures === 'string') {
                try {
                  savedFeatures = JSON.parse(savedFeatures);
                } catch (e) {
                  savedFeatures = null;
                }
              }
              
              if (savedFeatures && typeof savedFeatures === 'object') {
                // Merge with defaults
                this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
                Object.keys(savedFeatures).forEach(key => {
                  if (this.userFeatures[key] && savedFeatures[key] !== undefined) {
                    if (typeof savedFeatures[key] === 'object' && savedFeatures[key] !== null) {
                      this.userFeatures[key].enabled = savedFeatures[key].enabled;
                    } else if (typeof savedFeatures[key] === 'boolean') {
                      this.userFeatures[key].enabled = savedFeatures[key];
                    }
                  }
                });
                console.log('[FeatureConfig] ✅ Features loaded successfully:', this.getEnabledCount(), 'enabled');
              } else {
                this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
              }
            } catch (decryptErr) {
              console.warn('[FeatureConfig] Decryption failed, using defaults:', decryptErr.message);
              this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
              return;
            }
          } else {
            // Data is not encrypted, use as-is
            console.log('[FeatureConfig] Data is not encrypted, loading directly');
            let savedFeatures = savedData?.features || null;
            
            if (savedFeatures && typeof savedFeatures === 'string') {
              try {
                savedFeatures = JSON.parse(savedFeatures);
              } catch (e) {
                savedFeatures = null;
              }
            }
            
            if (savedFeatures && typeof savedFeatures === 'object') {
              this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
              Object.keys(savedFeatures).forEach(key => {
                if (this.userFeatures[key] && savedFeatures[key] !== undefined) {
                  if (typeof savedFeatures[key] === 'object' && savedFeatures[key] !== null) {
                    this.userFeatures[key].enabled = savedFeatures[key].enabled;
                  } else if (typeof savedFeatures[key] === 'boolean') {
                    this.userFeatures[key].enabled = savedFeatures[key];
                  }
                }
              });
              console.log('[FeatureConfig] ✅ Features loaded successfully:', this.getEnabledCount(), 'enabled');
            } else {
              this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
            }
          }
        } else {
          // First time user - use defaults
          console.log('[FeatureConfig] No saved features found, using defaults');
          this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
          // Save in background (don't wait)
          this.saveFeatureConfig().catch(console.error);
        }
      } catch (error) {
        console.warn('[FeatureConfig] Init failed:', error.message);
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
      }
    } catch (error) {
      console.error('[FeatureConfig] Error initializing feature config:', error);
      this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureKey) {
    if (!this.userFeatures) {
      console.warn('[FeatureConfig] userFeatures not loaded, returning default for', featureKey);
      return DEFAULT_FEATURES[featureKey]?.enabled ?? false;
    }
    
    const isEnabled = this.userFeatures[featureKey]?.enabled ?? false;
    
    // Log if feature is not found (might indicate a mismatch between sidebar and config)
    if (!this.userFeatures[featureKey]) {
      console.warn('[FeatureConfig] Feature not found:', featureKey, 'Available features:', Object.keys(this.userFeatures));
    }
    
    return isEnabled;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures() {
    if (!this.userFeatures) return DEFAULT_FEATURES;
    return Object.entries(this.userFeatures)
      .filter(([_, config]) => config.enabled)
      .reduce((acc, [key, config]) => {
        acc[key] = config;
        return acc;
      }, {});
  }

  /**
   * Get all features grouped by category
   */
  getFeaturesByCategory() {
    if (!this.userFeatures) return this._groupByCategory(DEFAULT_FEATURES);
    return this._groupByCategory(this.userFeatures);
  }

  _groupByCategory(features) {
    const grouped = {};
    Object.entries(FEATURE_CATEGORIES).forEach(([catKey, catData]) => {
      grouped[catKey] = {
        ...catData,
        features: Object.entries(features)
          .filter(([_, config]) => config.category === catKey)
          .reduce((acc, [key, config]) => {
            acc[key] = config;
            return acc;
          }, {})
      };
    });
    return grouped;
  }

  /**
   * Toggle a feature on/off
   */
  async toggleFeature(featureKey, enabled) {
    if (!this.userFeatures) await this.init();

    // Prevent disabling required features
    if (!enabled && this.userFeatures[featureKey]?.required) {
      console.warn(`Cannot disable required feature: ${featureKey}`);
      return false;
    }

    this.userFeatures[featureKey].enabled = enabled;
    
    await this.saveFeatureConfig();
    
    // Clear cache to ensure fresh load on next page
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('featureToggled', {
      detail: { featureKey, enabled }
    }));

    return true;
  }

  /**
   * Update multiple features at once
   */
  async updateFeatures(updates) {
    if (!this.userFeatures) await this.init();

    Object.entries(updates).forEach(([key, enabled]) => {
      if (this.userFeatures[key]) {
        // Allow updating non-required features, or enabling required features
        if (!this.userFeatures[key].required || enabled) {
          this.userFeatures[key].enabled = enabled;
        }
      }
    });

    await this.saveFeatureConfig();
    
    // Clear cache to ensure fresh load on next page
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    window.dispatchEvent(new CustomEvent('featuresUpdated', {
      detail: { updates }
    }));
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults() {
    this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
    await this.saveFeatureConfig();
    
    // Clear cache to ensure fresh load on next page
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    window.dispatchEvent(new CustomEvent('featuresReset'));
  }

  /**
   * Save feature config to Firestore with encryption
   * Document ID = userId (one document per user)
   * ENCRYPTION SAFETY: Validates encryption is ready before saving
   */
  async saveFeatureConfig() {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.warn('[FeatureConfig] No user found, cannot save features');
        return;
      }

      // ENCRYPTION SAFETY: Wait for encryption to be ready before saving
      console.log('[FeatureConfig] Waiting for encryption before saving...');
      await encryptionService.waitForInitialization();
      
      // Verify encryption is actually ready
      if (!encryptionService.isReady()) {
        console.warn('[FeatureConfig] Encryption not ready, waiting longer...');
        // Wait up to 5 seconds for encryption
        let retries = 0;
        while (!encryptionService.isReady() && retries < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        if (!encryptionService.isReady()) {
          console.error('[FeatureConfig] ❌ Cannot save - encryption not ready after timeout');
          throw new Error('Encryption not ready - cannot save features securely');
        }
      }

      console.log('[FeatureConfig] ✅ Encryption ready, proceeding with save');

      // Prepare data for encryption - store features as object, not string
      const dataToSave = {
        features: this.userFeatures,
        updatedAt: Timestamp.now()
      };

      // ENCRYPTION SAFETY: Encrypt with validation
      let encryptedData;
      try {
        encryptedData = await encryptionService.encryptObject(dataToSave, FEATURES_COLLECTION);
        
        // Validate encryption worked
        if (!encryptedData._encrypted) {
          console.warn('[FeatureConfig] ⚠️ Data was not encrypted, encryption may have failed');
        } else {
          console.log('[FeatureConfig] ✅ Data encrypted successfully');
        }
      } catch (encryptError) {
        console.error('[FeatureConfig] ❌ Encryption failed:', encryptError);
        throw new Error('Failed to encrypt features - data not saved');
      }

      // Use setDoc with the userId as document ID
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      await setDoc(docRef, {
        ...encryptedData,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      console.log('[FeatureConfig] ✅ Features saved to Firestore');
      
      // Update local cache
      this._cacheFeatures(user.uid, this.userFeatures);
    } catch (error) {
      console.error('[FeatureConfig] ❌ Error saving feature config:', error);
      throw error;
    }
  }

  /**
   * Get feature info
   */
  getFeatureInfo(featureKey) {
    return this.userFeatures?.[featureKey] || DEFAULT_FEATURES[featureKey];
  }

  /**
   * Get all features (enabled and disabled)
   */
  getAllFeatures() {
    if (!this.userFeatures) {
      return DEFAULT_FEATURES;
    }
    
    return this.userFeatures;
  }

  /**
   * Get count of enabled features (for debugging)
   */
  getEnabledCount() {
    if (!this.userFeatures) {
      return Object.values(DEFAULT_FEATURES).filter(f => f.enabled).length;
    }
    
    return Object.values(this.userFeatures).filter(f => f.enabled).length;
  }
  
  /**
   * Clear cache and reload features from Firestore
   * Useful when features are updated and need to be refreshed
   */
  async clearCacheAndReload() {
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    // Reinitialize to load fresh from Firestore
    await this.reinitialize();
  }

  /**
   * Force re-initialization (useful after login)
   */
  async reinitialize() {
    this.initialized = false;
    this.userFeatures = null;
    this.currentUserId = null;
    
    // Clear the cache to force fresh load
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    await this.init();
  }

  /**
   * Reload features from Firestore (useful when encryption becomes ready)
   */
  async reloadFromFirestore() {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.warn('[FeatureConfig] No user found, cannot reload');
        return;
      }

      // Check if encryption is ready now
      const isEncryptionReady = encryptionService.isReady && encryptionService.isReady();

      // Load fresh from Firestore
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        let savedData = docSnap.data();
        
        let decryptedData = savedData;
        
        try {
          if (savedData._encrypted && isEncryptionReady) {
            decryptedData = await encryptionService.decryptObject(savedData, FEATURES_COLLECTION);
          }
        } catch (decryptError) {
          console.error('[FeatureConfig] Decryption error during reload:', decryptError);
        }
        
        // Extract and merge features
        // The features are stored in _encrypted.features after decryption
        let savedFeatures = null;
        
        // First try to get from decrypted data
        if (decryptedData && decryptedData.features) {
          savedFeatures = decryptedData.features;
        }
        
        // If not found, check if it's still in _encrypted (decryption might have failed)
        if (!savedFeatures && savedData && savedData._encrypted && savedData._encrypted.features) {
          try {
            const encryptedFeatures = savedData._encrypted.features;
            savedFeatures = await encryptionService.decryptValue(encryptedFeatures);
          } catch (e) {
            console.error('[FeatureConfig] Failed to decrypt _encrypted.features:', e);
            savedFeatures = null;
          }
        }
        
        if (savedFeatures) {
          if (typeof savedFeatures === 'string') {
            try {
              savedFeatures = JSON.parse(savedFeatures);
            } catch (e) {
              console.warn('[FeatureConfig] Failed to parse features string:', e);
              return;
            }
          }
        }
        
        if (savedFeatures && typeof savedFeatures === 'object') {
          // Deep merge with defaults
          this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
          Object.keys(savedFeatures).forEach(key => {
            if (this.userFeatures[key] && savedFeatures[key] !== undefined) {
              if (typeof savedFeatures[key] === 'object' && savedFeatures[key] !== null) {
                this.userFeatures[key].enabled = savedFeatures[key].enabled;
              } else if (typeof savedFeatures[key] === 'boolean') {
                this.userFeatures[key].enabled = savedFeatures[key];
              }
            }
          });
          
          
          // Dispatch event to notify UI
          window.dispatchEvent(new CustomEvent('featuresReloaded', {
            detail: { features: this.userFeatures }
          }));
        }
      }
    } catch (error) {
      console.error('[FeatureConfig] Error reloading features:', error);
    }
  }
}

// Export singleton instance
export const featureConfig = new FeatureConfigManager();
export { DEFAULT_FEATURES, FEATURE_CATEGORIES };
