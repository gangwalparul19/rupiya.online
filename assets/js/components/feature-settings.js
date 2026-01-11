/**
 * Feature Settings Component
 * Allows users to enable/disable features they want to use
 * Integrated into the settings/profile page
 */

import { featureConfig, FEATURE_CATEGORIES } from '../config/feature-config.js';

class FeatureSettings {
  constructor() {
    this.container = null;
    this.initialized = false;
  }

  /**
   * Initialize and render feature settings
   */
  async init(containerId) {
    if (this.initialized) return;

    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`Feature settings container not found: ${containerId}`);
      return;
    }

    await featureConfig.init();
    this.render();
    this.setupEventListeners();
    this.initialized = true;
  }

  /**
   * Render feature settings UI
   */
  render() {
    const categories = featureConfig.getFeaturesByCategory();
    
    let html = `
      <div class="feature-settings-container">
        <div class="feature-settings-header">
          <h2>Customize Your Features</h2>
          <p>Choose which features you want to use. You can always change this later.</p>
          <button class="btn btn-sm btn-secondary" id="resetFeaturesBtn">
            Reset to Defaults
          </button>
        </div>

        <div class="feature-categories">
    `;

    Object.entries(categories).forEach(([catKey, category]) => {
      const features = Object.entries(category.features);
      if (features.length === 0) return;

      html += `
        <div class="feature-category">
          <div class="category-header">
            <span class="category-icon">${category.icon}</span>
            <div class="category-info">
              <h3>${category.label}</h3>
              <p>${category.description}</p>
            </div>
          </div>
          <div class="category-features">
      `;

      features.forEach(([featureKey, featureConfig]) => {
        const isRequired = featureConfig.required;
        const isEnabled = featureConfig.enabled;
        
        html += `
          <div class="feature-item ${isRequired ? 'required' : ''} ${isEnabled ? 'enabled' : 'disabled'}">
            <div class="feature-toggle">
              <input 
                type="checkbox" 
                id="feature-${featureKey}" 
                class="feature-checkbox"
                data-feature="${featureKey}"
                ${isEnabled ? 'checked' : ''}
                ${isRequired ? 'disabled' : ''}
              >
              <label for="feature-${featureKey}" class="feature-label">
                <div class="feature-name">${featureConfig.label}</div>
                <div class="feature-description">${featureConfig.description}</div>
                ${isRequired ? '<span class="feature-badge required-badge">Required</span>' : ''}
              </label>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="feature-settings-footer">
          <div class="feature-stats">
            <div class="stat">
              <span class="stat-label">Features Enabled:</span>
              <span class="stat-value" id="enabledCount">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Total Features:</span>
              <span class="stat-value" id="totalCount">0</span>
            </div>
          </div>
          <button class="btn btn-primary" id="saveFeatureSettingsBtn">
            Save Settings
          </button>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.updateStats();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Feature toggle checkboxes
    document.querySelectorAll('.feature-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateStats();
      });
    });

    // Save button
    document.getElementById('saveFeatureSettingsBtn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Reset button
    document.getElementById('resetFeaturesBtn')?.addEventListener('click', () => {
      if (confirm('Reset all features to default? This will enable all features.')) {
        this.resetToDefaults();
      }
    });

    // Listen for feature updates from other components
    window.addEventListener('featureToggled', () => {
      this.render();
    });
  }

  /**
   * Save feature settings
   */
  async saveSettings() {
    const saveBtn = document.getElementById('saveFeatureSettingsBtn');
    const originalText = saveBtn?.textContent;
    
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    
    const updates = {};
    document.querySelectorAll('.feature-checkbox').forEach(checkbox => {
      const featureKey = checkbox.dataset.feature;
      updates[featureKey] = checkbox.checked;
    });

    try {
      await featureConfig.updateFeatures(updates);
      this.showNotification('Settings saved successfully!', 'success');
      this.render();
      this.setupEventListeners(); // Re-attach event listeners after render
    } catch (error) {
      console.error('Error saving feature settings:', error);
      this.showNotification('Error saving settings. Please try again.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    }
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults() {
    try {
      await featureConfig.resetToDefaults();
      this.showNotification('Features reset to defaults!', 'success');
      this.render();
      this.setupEventListeners(); // Re-attach event listeners after render
    } catch (error) {
      console.error('Error resetting features:', error);
      this.showNotification('Error resetting features. Please try again.', 'error');
    }
  }

  /**
   * Update feature count stats
   */
  updateStats() {
    const total = document.querySelectorAll('.feature-checkbox').length;
    const enabled = document.querySelectorAll('.feature-checkbox:checked').length;
    
    document.getElementById('enabledCount').textContent = enabled;
    document.getElementById('totalCount').textContent = total;
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 6px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

export const featureSettings = new FeatureSettings();
