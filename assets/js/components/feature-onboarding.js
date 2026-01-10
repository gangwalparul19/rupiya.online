/**
 * Feature Onboarding Component
 * Guides new users through feature selection on first login
 */

import { featureConfig, FEATURE_CATEGORIES } from '../config/feature-config.js';

class FeatureOnboarding {
  constructor() {
    this.container = null;
    this.currentStep = 0;
    this.selectedFeatures = {};
  }

  /**
   * Check if user should see onboarding
   */
  async shouldShowOnboarding() {
    try {
      await featureConfig.init();
      
      // Check if user has completed feature onboarding
      const completed = localStorage.getItem('rupiya_feature_onboarding_completed');
      return !completed;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Initialize and show onboarding
   */
  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`Feature onboarding container not found: ${containerId}`);
      return;
    }

    const shouldShow = await this.shouldShowOnboarding();
    if (!shouldShow) {
      this.container.style.display = 'none';
      return;
    }

    // Initialize selected features with defaults
    const allFeatures = featureConfig.getAllFeatures();
    Object.entries(allFeatures).forEach(([key, config]) => {
      this.selectedFeatures[key] = config.enabled;
    });

    this.render();
    this.setupEventListeners();
  }

  /**
   * Render onboarding UI
   */
  render() {
    const categories = featureConfig.getFeaturesByCategory();
    
    let html = `
      <div class="feature-onboarding-overlay">
        <div class="feature-onboarding-modal">
          <div class="onboarding-header">
            <h1>Customize Your Rupiya Experience</h1>
            <p>Choose the features you want to use. You can always change this later in Settings.</p>
          </div>

          <div class="onboarding-content">
            <div class="feature-categories-grid">
    `;

    Object.entries(categories).forEach(([catKey, category]) => {
      const features = Object.entries(category.features);
      if (features.length === 0) return;

      html += `
        <div class="onboarding-category">
          <div class="category-header-compact">
            <span class="category-icon">${category.icon}</span>
            <h3>${category.label}</h3>
          </div>
          <div class="category-features-compact">
      `;

      features.forEach(([featureKey, featureConfig]) => {
        const isRequired = featureConfig.required;
        const isSelected = this.selectedFeatures[featureKey];
        
        html += `
          <label class="feature-checkbox-compact ${isRequired ? 'required' : ''} ${isSelected ? 'selected' : ''}">
            <input 
              type="checkbox" 
              class="feature-checkbox-input"
              data-feature="${featureKey}"
              ${isSelected ? 'checked' : ''}
              ${isRequired ? 'disabled' : ''}
            >
            <div class="checkbox-visual"></div>
            <div class="feature-info-compact">
              <div class="feature-name-compact">${featureConfig.label}</div>
              <div class="feature-description-compact">${featureConfig.description}</div>
              ${isRequired ? '<span class="feature-badge-compact">Required</span>' : ''}
            </div>
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
            </div>
          </div>

          <div class="onboarding-footer">
            <div class="onboarding-stats">
              <span>Features enabled: <strong id="onboardingEnabledCount">0</strong></span>
            </div>
            <div class="onboarding-actions">
              <button class="btn btn-secondary" id="skipOnboardingBtn">Skip for Now</button>
              <button class="btn btn-primary" id="completeOnboardingBtn">Get Started</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.updateOnboardingStats();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Feature checkboxes
    document.querySelectorAll('.feature-checkbox-input').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const featureKey = e.target.dataset.feature;
        this.selectedFeatures[featureKey] = e.target.checked;
        this.updateOnboardingStats();
      });
    });

    // Complete button
    document.getElementById('completeOnboardingBtn')?.addEventListener('click', () => {
      this.completeOnboarding();
    });

    // Skip button
    document.getElementById('skipOnboardingBtn')?.addEventListener('click', () => {
      this.skipOnboarding();
    });
  }

  /**
   * Update stats display
   */
  updateOnboardingStats() {
    const enabled = Object.values(this.selectedFeatures).filter(v => v).length;
    document.getElementById('onboardingEnabledCount').textContent = enabled;
  }

  /**
   * Complete onboarding and save selections
   */
  async completeOnboarding() {
    try {
      await featureConfig.updateFeatures(this.selectedFeatures);
      localStorage.setItem('rupiya_feature_onboarding_completed', 'true');
      
      // Hide onboarding
      this.container.style.display = 'none';
      
      // Dispatch event for app to handle
      window.dispatchEvent(new CustomEvent('featureOnboardingCompleted'));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Error saving your preferences. Please try again.');
    }
  }

  /**
   * Skip onboarding
   */
  skipOnboarding() {
    localStorage.setItem('rupiya_feature_onboarding_completed', 'true');
    this.container.style.display = 'none';
    window.dispatchEvent(new CustomEvent('featureOnboardingSkipped'));
  }
}

export const featureOnboarding = new FeatureOnboarding();
