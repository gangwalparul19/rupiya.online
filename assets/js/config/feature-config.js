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
    console.log('[FeatureConfig] Cache disabled - always loading from Firestore');
    return null;
  }

  /**
   * Save features to localStorage cache
   * DISABLED - Cache is causing stale data issues
   */
  _cacheFeatures(userId, features) {
    // Don't cache - always load from Firestore
    console.log('[FeatureConfig] Cache saving disabled - always loading from Firestore');
  }

  /**
   * Setup listener for encryption ready event
   */
  _setupEncryptionListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('encryptionReady', async () => {
        console.log('[FeatureConfig] Encryption ready event received');
        
        // If we have a user and features are loaded, try to reload with proper decryption
        if (this.currentUserId && this.userFeatures) {
          const enabledCount = Object.values(this.userFeatures).filter(f => {
            if (typeof f === 'object' && f !== null) {
              return f.enabled === true;
            }
            return f === true;
          }).length;
          
          console.log('[FeatureConfig] Current enabled features:', enabledCount);
          
          // If we only have 3 features (the defaults), we likely failed to decrypt
          // Try to reload now that encryption is ready
          if (enabledCount <= 3) {
            console.log('[FeatureConfig] Only', enabledCount, 'features loaded, reloading with encryption...');
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
      // Clear cache immediately
      try {
        localStorage.removeItem(this.CACHE_KEY);
      } catch (e) {
        // Ignore
      }

      // Try to get current user, or wait for auth if not ready
      let user = authService.getCurrentUser();
      
      if (!user) {
        try {
          user = await Promise.race([
            authService.waitForAuth(),
            new Promise(resolve => setTimeout(() => resolve(null), 3000))
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

      // ALWAYS load from Firestore first to ensure data is fresh
      console.log('[FeatureConfig] Loading from Firestore');

      // Check if encryption is already ready (might be initialized before this)
      let encryptionReady = encryptionService.isReady && encryptionService.isReady();
      console.log('[FeatureConfig] Initial encryption ready status:', encryptionReady);
      
      // If not ready, wait for it with aggressive retries
      if (!encryptionReady) {
        // Wait for encryption to be ready (with extended timeout and retries)
        const maxWaitTime = 30000; // 30 seconds max (increased from 15)
        const checkInterval = 200; // Check every 200ms (more frequent)
        const startTime = Date.now();
        let waitAttempts = 0;
        
        while (!encryptionReady && (Date.now() - startTime) < maxWaitTime) {
          try {
            // First wait for initialization to complete
            if (encryptionService.waitForInitialization) {
              await Promise.race([
                encryptionService.waitForInitialization(),
                new Promise(resolve => setTimeout(resolve, 500))
              ]);
            }
            
            // Then check if ready
            if (encryptionService.isReady && encryptionService.isReady()) {
              encryptionReady = true;
              console.log('[FeatureConfig] Encryption ready after', waitAttempts, 'attempts');
              break;
            }
            
            waitAttempts++;
            if (waitAttempts % 10 === 0) {
              console.log('[FeatureConfig] Still waiting for encryption... attempt', waitAttempts);
            }
          } catch (e) {
            console.warn('[FeatureConfig] Error checking encryption readiness:', e.message);
          }
          
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        if (!encryptionReady) {
          console.warn('[FeatureConfig] Encryption not ready after', maxWaitTime, 'ms, proceeding with fallback');
        }
      }

      // Load user's feature config from Firestore
      // Document ID is the userId
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        let savedData = docSnap.data();
        console.log('[FeatureConfig] Raw data from Firestore:', savedData);
        
        // Try to decrypt the data
        let decryptedData = savedData;
        const isEncryptionReady = encryptionService.isReady ? encryptionService.isReady() : false;
        
        console.log('[FeatureConfig] Encryption ready status:', isEncryptionReady);
        
        try {
          if (savedData._encrypted) {
            console.log('[FeatureConfig] Data is encrypted, attempting decryption...');
            
            // If encryption is ready, decrypt immediately
            if (isEncryptionReady) {
              console.log('[FeatureConfig] Encryption ready, decrypting immediately...');
              decryptedData = await encryptionService.decryptObject(savedData, FEATURES_COLLECTION);
              console.log('[FeatureConfig] Decryption successful');
            } else {
              // Encryption not ready yet - wait longer and try again
              console.log('[FeatureConfig] Encryption not ready, waiting for initialization...');
              
              // Wait up to 10 seconds for encryption to be ready with more frequent retries
              let decryptRetries = 0;
              const maxDecryptRetries = 100; // 100 * 100ms = 10 seconds (increased from 50)
              let decryptionSucceeded = false;
              
              while (decryptRetries < maxDecryptRetries && !decryptionSucceeded) {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (encryptionService.isReady && encryptionService.isReady()) {
                  try {
                    console.log('[FeatureConfig] Encryption now ready, attempting decryption...');
                    decryptedData = await encryptionService.decryptObject(savedData, FEATURES_COLLECTION);
                    decryptionSucceeded = true;
                    console.log('[FeatureConfig] Decryption successful after', decryptRetries, 'retries');
                  } catch (decryptErr) {
                    console.warn('[FeatureConfig] Decryption attempt failed:', decryptErr.message);
                    decryptRetries++;
                  }
                } else {
                  decryptRetries++;
                }
              }
              
              if (!decryptionSucceeded) {
                console.warn('[FeatureConfig] Decryption failed after', maxDecryptRetries, 'retries, using fallback...');
                // Try to extract features from the encrypted string if possible
                if (savedData._encrypted && savedData._encrypted.features) {
                  try {
                    console.log('[FeatureConfig] Attempting to decrypt _encrypted.features directly...');
                    const encryptedFeatures = savedData._encrypted.features;
                    const decryptedFeatures = await encryptionService.decryptValue(encryptedFeatures);
                    decryptedData = { features: decryptedFeatures };
                    console.log('[FeatureConfig] Successfully extracted features from _encrypted.features');
                  } catch (e) {
                    console.warn('[FeatureConfig] Failed to extract from _encrypted.features:', e.message);
                  }
                } else if (savedData.features && typeof savedData.features === 'string') {
                  try {
                    const parsed = JSON.parse(savedData.features);
                    decryptedData = { features: parsed };
                    console.log('[FeatureConfig] Extracted features from plain features field');
                  } catch (e) {
                    console.warn('[FeatureConfig] Failed to parse features string:', e.message);
                  }
                }
              }
            }
          } else {
            console.log('[FeatureConfig] Data is not encrypted');
          }
        } catch (decryptError) {
          console.error('[FeatureConfig] Decryption error:', decryptError);
          // Try to extract features from the encrypted string as fallback
          if (savedData.features && typeof savedData.features === 'string') {
            try {
              const parsed = JSON.parse(savedData.features);
              decryptedData = { features: parsed };
              console.log('[FeatureConfig] Recovered features from string after decryption error');
            } catch (e) {
              console.error('[FeatureConfig] Failed to recover features:', e.message);
              this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
              return;
            }
          } else {
            console.error('[FeatureConfig] No features to recover, using defaults');
            this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
            return;
          }
        }
        
        // Extract features from decrypted data
        // The features are stored in _encrypted.features after decryption
        let savedFeatures = null;
        
        console.log('[FeatureConfig] Decrypted data:', decryptedData);
        console.log('[FeatureConfig] Decrypted data keys:', decryptedData ? Object.keys(decryptedData) : 'none');
        
        // First try to get from decrypted data (after decryptObject)
        if (decryptedData && decryptedData.features) {
          savedFeatures = decryptedData.features;
          console.log('[FeatureConfig] Extracted features from decrypted data');
        }
        
        // If not found, check if it's still in _encrypted (decryption might have failed)
        if (!savedFeatures && savedData && savedData._encrypted && savedData._encrypted.features) {
          console.log('[FeatureConfig] Features still in _encrypted, attempting direct decryption...');
          try {
            const encryptedFeatures = savedData._encrypted.features;
            savedFeatures = await encryptionService.decryptValue(encryptedFeatures);
            console.log('[FeatureConfig] Successfully decrypted features from _encrypted.features');
          } catch (e) {
            console.error('[FeatureConfig] Failed to decrypt _encrypted.features:', e);
            savedFeatures = null;
          }
        }
        
        console.log('[FeatureConfig] Extracted features:', savedFeatures);
        
        if (savedFeatures) {
          // Parse features if it's a string (from encryption)
          if (typeof savedFeatures === 'string') {
            try {
              savedFeatures = JSON.parse(savedFeatures);
              console.log('[FeatureConfig] Parsed features from string');
            } catch (e) {
              console.error('[FeatureConfig] Failed to parse features string:', e);
              savedFeatures = null;
            }
          }
        }
        
        if (savedFeatures && typeof savedFeatures === 'object') {
          // Deep merge: start with defaults, then apply saved enabled states
          this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
          Object.keys(savedFeatures).forEach(key => {
            if (this.userFeatures[key] && savedFeatures[key] !== undefined) {
              // Handle both object format and boolean format
              if (typeof savedFeatures[key] === 'object' && savedFeatures[key] !== null) {
                this.userFeatures[key].enabled = savedFeatures[key].enabled;
              } else if (typeof savedFeatures[key] === 'boolean') {
                this.userFeatures[key].enabled = savedFeatures[key];
              }
            }
          });
          console.log('[FeatureConfig] Features loaded and merged with defaults');
        } else {
          console.log('[FeatureConfig] No valid saved features, using defaults');
          this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        }
      } else {
        // First time user - use all defaults and save
        console.log('[FeatureConfig] No existing features document, creating new one');
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        await this.saveFeatureConfig();
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
    if (!this.userFeatures) return DEFAULT_FEATURES[featureKey]?.enabled ?? false;
    return this.userFeatures[featureKey]?.enabled ?? false;
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
    console.log(`[FeatureConfig] Toggling feature "${featureKey}" to ${enabled}`);
    
    await this.saveFeatureConfig();
    
    // Clear cache to ensure fresh load on next page
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('[FeatureConfig] Cache cleared after feature toggle');
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

    console.log('[FeatureConfig] Updating features with:', updates);

    Object.entries(updates).forEach(([key, enabled]) => {
      if (this.userFeatures[key]) {
        // Allow updating non-required features, or enabling required features
        if (!this.userFeatures[key].required || enabled) {
          this.userFeatures[key].enabled = enabled;
        }
      }
    });

    console.log('[FeatureConfig] Features after update:', this.userFeatures);

    await this.saveFeatureConfig();
    
    // Clear cache to ensure fresh load on next page
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('[FeatureConfig] Cache cleared after features update');
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
      console.log('[FeatureConfig] Cache cleared after reset to defaults');
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    window.dispatchEvent(new CustomEvent('featuresReset'));
  }

  /**
   * Save feature config to Firestore with encryption
   * Document ID = userId (one document per user)
   */
  async saveFeatureConfig() {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.warn('[FeatureConfig] No user found, cannot save features');
        return;
      }

      console.log('[FeatureConfig] Saving features for user:', user.uid);
      console.log('[FeatureConfig] Features to save:', this.userFeatures);

      // Wait for encryption to be ready before saving
      await encryptionService.waitForInitialization();
      
      if (!encryptionService.isReady()) {
        console.warn('[FeatureConfig] Encryption not ready, waiting...');
        // Wait up to 3 seconds for encryption
        let retries = 0;
        while (!encryptionService.isReady() && retries < 30) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      }

      // Prepare data for encryption - store features as object, not string
      const dataToSave = {
        features: this.userFeatures,
        updatedAt: Timestamp.now()
      };

      console.log('[FeatureConfig] Data prepared for encryption:', dataToSave);

      // Encrypt the data (will work even if encryption not ready - stores unencrypted)
      const encryptedData = await encryptionService.encryptObject(dataToSave, FEATURES_COLLECTION);
      console.log('[FeatureConfig] Encrypted data prepared, encryption ready:', encryptionService.isReady());
      console.log('[FeatureConfig] Encrypted data:', encryptedData);

      // Use setDoc with the userId as document ID
      // This creates or updates the document
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      await setDoc(docRef, {
        ...encryptedData,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      console.log('[FeatureConfig] Features saved successfully to document:', user.uid);
      
      // Update local cache
      this._cacheFeatures(user.uid, this.userFeatures);
    } catch (error) {
      console.error('[FeatureConfig] Error saving feature config:', error);
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
   * Clear cache and reload features from Firestore
   * Useful when features are updated and need to be refreshed
   */
  async clearCacheAndReload() {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('[FeatureConfig] Cache cleared');
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
    console.log('[FeatureConfig] Reinitializing features...');
    this.initialized = false;
    this.userFeatures = null;
    this.currentUserId = null;
    
    // Clear the cache to force fresh load
    try {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('[FeatureConfig] Cache cleared, forcing fresh load');
    } catch (e) {
      console.warn('[FeatureConfig] Error clearing cache:', e);
    }
    
    await this.init();
    console.log('[FeatureConfig] Reinitialization complete');
  }

  /**
   * Reload features from Firestore (useful when encryption becomes ready)
   */
  async reloadFromFirestore() {
    console.log('[FeatureConfig] Reloading features from Firestore...');
    
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        console.warn('[FeatureConfig] No user found, cannot reload');
        return;
      }

      // Check if encryption is ready now
      const isEncryptionReady = encryptionService.isReady && encryptionService.isReady();
      console.log('[FeatureConfig] Encryption ready for reload:', isEncryptionReady);

      // Load fresh from Firestore
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        let savedData = docSnap.data();
        console.log('[FeatureConfig] Fresh data from Firestore:', savedData);
        
        let decryptedData = savedData;
        
        try {
          if (savedData._encrypted && isEncryptionReady) {
            console.log('[FeatureConfig] Attempting to decrypt fresh data...');
            decryptedData = await encryptionService.decryptObject(savedData, FEATURES_COLLECTION);
            console.log('[FeatureConfig] Decryption successful');
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
          console.log('[FeatureConfig] Extracted features from decrypted data');
        }
        
        // If not found, check if it's still in _encrypted (decryption might have failed)
        if (!savedFeatures && savedData && savedData._encrypted && savedData._encrypted.features) {
          console.log('[FeatureConfig] Features still in _encrypted, attempting direct decryption...');
          try {
            const encryptedFeatures = savedData._encrypted.features;
            savedFeatures = await encryptionService.decryptValue(encryptedFeatures);
            console.log('[FeatureConfig] Successfully decrypted features from _encrypted.features');
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
          
          console.log('[FeatureConfig] Features reloaded successfully');
          
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
