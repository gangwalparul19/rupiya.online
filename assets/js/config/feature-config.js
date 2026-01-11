/**
 * Feature Configuration System
 * Allows users to enable/disable features they want to use
 * 
 * Features are organized by category and can be toggled on/off
 * Configuration is stored in Firestore per user
 */

import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';

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
  }

  /**
   * Initialize feature config for current user
   */
  async init() {
    if (this.initialized) return;

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        // Use defaults for non-authenticated users
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        this.initialized = true;
        return;
      }

      // Load user's feature config from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists() && userDoc.data().features) {
        // Merge saved config with defaults (in case new features were added)
        this.userFeatures = {
          ...DEFAULT_FEATURES,
          ...userDoc.data().features
        };
      } else {
        // First time user - use all defaults
        this.userFeatures = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
        // Save defaults to Firestore
        await this.saveFeatureConfig();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing feature config:', error);
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

    Object.entries(updates).forEach(([key, enabled]) => {
      if (this.userFeatures[key] && !this.userFeatures[key].required) {
        this.userFeatures[key].enabled = enabled;
      }
    });

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
   * Save feature config to Firestore
   */
  async saveFeatureConfig() {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      // Use setDoc with merge to create or update the document
      await setDoc(userRef, {
        features: this.userFeatures,
        featureConfigUpdatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving feature config:', error);
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
}

// Export singleton instance
export const featureConfig = new FeatureConfigManager();
export { DEFAULT_FEATURES, FEATURE_CATEGORIES };
