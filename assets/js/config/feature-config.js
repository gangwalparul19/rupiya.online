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
  }

  /**
   * Initialize feature config for current user
   */
  async init() {
    if (this.initialized) return;

    try {
      const user = authService.getCurrentUser();
      console.log('[FeatureConfig] Initializing for user:', user?.uid || 'no user');
      
      if (!user) {
        // Use defaults for non-authenticated users
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        this.initialized = true;
        return;
      }

      this.currentUserId = user.uid;

      // Wait for encryption to be ready (with timeout)
      try {
        if (encryptionService.waitForInitialization) {
          await Promise.race([
            encryptionService.waitForInitialization(),
            new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
          ]);
        }
      } catch (e) {
        console.warn('[FeatureConfig] Encryption wait failed:', e);
      }

      // Load user's feature config from Firestore
      // Document ID is the userId
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('[FeatureConfig] Found existing feature document for user:', user.uid);
        let savedData = docSnap.data();
        console.log('[FeatureConfig] Raw saved data:', savedData);
        
        // Try to decrypt the data
        let decryptedData = savedData;
        const isEncryptionReady = encryptionService.isReady ? encryptionService.isReady() : false;
        console.log('[FeatureConfig] Encryption ready:', isEncryptionReady);
        
        try {
          if (isEncryptionReady && savedData._encrypted) {
            decryptedData = await encryptionService.decryptObject(savedData, FEATURES_COLLECTION);
            console.log('[FeatureConfig] Decrypted data:', decryptedData);
          } else if (savedData._encrypted) {
            console.log('[FeatureConfig] Data is encrypted but encryption not ready, using defaults');
            this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
            this.initialized = true;
            return;
          } else {
            console.log('[FeatureConfig] Data is not encrypted, using raw data');
          }
        } catch (decryptError) {
          console.warn('[FeatureConfig] Decryption failed:', decryptError);
          // If decryption fails, use defaults
          this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
          this.initialized = true;
          return;
        }
        
        // Extract features from decrypted data
        let savedFeatures = null;
        
        if (decryptedData && decryptedData.features) {
          savedFeatures = decryptedData.features;
        }
        
        if (savedFeatures) {
          // Parse features if it's a string (from encryption)
          if (typeof savedFeatures === 'string') {
            try {
              savedFeatures = JSON.parse(savedFeatures);
              console.log('[FeatureConfig] Parsed features from string');
            } catch (e) {
              console.warn('[FeatureConfig] Could not parse features string:', e);
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
          
          console.log('[FeatureConfig] Loaded user features successfully');
        } else {
          console.log('[FeatureConfig] No valid features found, using defaults');
          this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        }
      } else {
        // First time user - use all defaults and save
        console.log('[FeatureConfig] No saved features, creating new document with defaults for user:', user.uid);
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        await this.saveFeatureConfig();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[FeatureConfig] Error initializing feature config:', error);
      this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
      this.initialized = true;
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
    await this.saveFeatureConfig();
    
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

      // Prepare data for encryption
      const dataToSave = {
        features: JSON.stringify(this.userFeatures),
        updatedAt: Timestamp.now()
      };

      // Encrypt the data
      const encryptedData = await encryptionService.encryptObject(dataToSave, FEATURES_COLLECTION);
      console.log('[FeatureConfig] Encrypted data prepared');

      // Use setDoc with the userId as document ID
      // This creates or updates the document
      const docRef = doc(db, FEATURES_COLLECTION, user.uid);
      await setDoc(docRef, {
        ...encryptedData,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      console.log('[FeatureConfig] Features saved successfully to document:', user.uid);
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
    return this.userFeatures || DEFAULT_FEATURES;
  }
  
  /**
   * Force re-initialization (useful after login)
   */
  async reinitialize() {
    this.initialized = false;
    this.userFeatures = null;
    this.currentUserId = null;
    await this.init();
  }
}

// Export singleton instance
export const featureConfig = new FeatureConfigManager();
export { DEFAULT_FEATURES, FEATURE_CATEGORIES };
