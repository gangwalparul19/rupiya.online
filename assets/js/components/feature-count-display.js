/**
 * Feature Count Display Component
 * Displays the count of enabled features from the database
 * Syncs across all pages in real-time
 */

import { featureConfig } from '../config/feature-config.js';

class FeatureCountDisplay {
  constructor() {
    this.displayElements = [];
    this.init();
  }

  /**
   * Initialize feature count display
   */
  async init() {
    console.log('[FeatureCountDisplay] Initializing...');
    
    // Wait for feature config to be initialized
    await featureConfig.init();
    
    // Find all elements that should display feature count
    this.findDisplayElements();
    
    // Update display with current count
    this.updateDisplay();
    
    // Listen for feature changes
    window.addEventListener('featuresUpdated', () => this.updateDisplay());
    window.addEventListener('featureToggled', () => this.updateDisplay());
    window.addEventListener('featuresReset', () => this.updateDisplay());
    
    console.log('[FeatureCountDisplay] Initialized');
  }

  /**
   * Find all elements that should display feature count
   */
  findDisplayElements() {
    // Look for elements with data-feature-count attribute
    const elements = document.querySelectorAll('[data-feature-count]');
    this.displayElements = Array.from(elements);
    
    console.log('[FeatureCountDisplay] Found', this.displayElements.length, 'display elements');
  }

  /**
   * Get count of enabled features
   */
  getEnabledFeatureCount() {
    if (!featureConfig.userFeatures) {
      return 0;
    }
    
    let count = 0;
    Object.values(featureConfig.userFeatures).forEach(f => {
      // Handle both object format and boolean format
      if (typeof f === 'object' && f !== null) {
        if (f.enabled === true) {
          count++;
        }
      } else if (typeof f === 'boolean' && f === true) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Get total feature count
   */
  getTotalFeatureCount() {
    if (!featureConfig.userFeatures) {
      return 0;
    }
    
    return Object.keys(featureConfig.userFeatures).length;
  }

  /**
   * Update all display elements with current feature count
   */
  updateDisplay() {
    const enabledCount = this.getEnabledFeatureCount();
    const totalCount = this.getTotalFeatureCount();
    
    console.log('[FeatureCountDisplay] Updating display - Enabled:', enabledCount, 'Total:', totalCount);
    
    this.displayElements.forEach(element => {
      const displayType = element.getAttribute('data-feature-count');
      
      if (displayType === 'enabled') {
        element.textContent = enabledCount;
      } else if (displayType === 'total') {
        element.textContent = totalCount;
      } else if (displayType === 'disabled') {
        element.textContent = totalCount - enabledCount;
      } else if (displayType === 'all') {
        element.textContent = `${enabledCount}/${totalCount}`;
      }
      
      // Add animation class
      element.classList.add('feature-count-updated');
      setTimeout(() => {
        element.classList.remove('feature-count-updated');
      }, 300);
    });
  }

  /**
   * Get feature count as object
   */
  getFeatureCounts() {
    return {
      enabled: this.getEnabledFeatureCount(),
      total: this.getTotalFeatureCount(),
      disabled: this.getTotalFeatureCount() - this.getEnabledFeatureCount()
    };
  }
}

// Create and export singleton instance
const featureCountDisplay = new FeatureCountDisplay();

export default featureCountDisplay;
