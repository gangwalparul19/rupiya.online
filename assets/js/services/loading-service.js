/**
 * Loading Service
 * Manages loading states, skeleton screens, and content transitions
 * Provides utilities for displaying loading indicators across the application
 */

import { SkeletonScreenModel, createLoadingState } from './analytics-models.js';

class LoadingService {
  constructor() {
    this.loadingStates = new Map();
    this.skeletonElements = new Map();
    this.transitionDuration = 300; // milliseconds
  }

  /**
   * Create a skeleton screen for a given content type
   * @param {string} contentType - Type of content ('dashboard' | 'list' | 'chart' | 'form')
   * @returns {HTMLElement} Skeleton screen element
   */
  createSkeletonScreen(contentType = 'dashboard') {
    const model = SkeletonScreenModel[contentType] || SkeletonScreenModel.dashboard;
    
    // Ensure shimmer animation is available
    this.ensureShimmerAnimation();

    // Route to specific template based on content type
    switch (contentType) {
      case 'dashboard':
        return this.createDashboardSkeleton(model);
      case 'list':
        return this.createListSkeleton(model);
      case 'chart':
        return this.createChartSkeleton(model);
      case 'form':
        return this.createFormSkeleton(model);
      default:
        return this.createGenericSkeleton(model);
    }
  }

  /**
   * Create a generic skeleton screen
   * @param {Object} model - Skeleton screen model
   * @returns {HTMLElement} Generic skeleton element
   */
  createGenericSkeleton(model) {
    const container = document.createElement('div');
    container.className = 'skeleton-screen';
    container.setAttribute('data-skeleton-type', 'generic');
    container.style.width = model.layout.width;
    container.style.height = model.layout.height;
    container.style.display = 'grid';
    container.style.gridTemplateRows = `repeat(${model.layout.rows}, 1fr)`;
    container.style.gridTemplateColumns = `repeat(${model.layout.columns}, 1fr)`;
    container.style.gap = '16px';
    container.style.padding = '16px';

    // Create skeleton items
    for (let i = 0; i < model.layout.rows * model.layout.columns; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-item';
      item.style.backgroundColor = '#e0e0e0';
      item.style.borderRadius = '8px';
      item.style.animation = `shimmer ${model.shimmerAnimation.duration}ms ${model.shimmerAnimation.easing} infinite`;
      item.style.backgroundImage = 'linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)';
      item.style.backgroundSize = '200% 100%';
      item.style.backgroundPosition = '0% 0%';
      
      container.appendChild(item);
    }

    return container;
  }

  /**
   * Create a dashboard skeleton screen
   * @param {Object} model - Skeleton screen model
   * @returns {HTMLElement} Dashboard skeleton element
   */
  createDashboardSkeleton(model) {
    const container = document.createElement('div');
    container.className = 'skeleton-screen skeleton-analytics-dashboard';
    container.setAttribute('data-skeleton-type', 'dashboard');
    container.style.width = model.layout.width;
    container.style.height = model.layout.height;
    container.style.padding = '16px';
    container.style.gap = '16px';

    // Create KPI cards
    for (let i = 0; i < 4; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton-kpi-card';

      // Label
      const label = document.createElement('div');
      label.className = 'skeleton-kpi-label';
      card.appendChild(label);

      // Value
      const value = document.createElement('div');
      value.className = 'skeleton-kpi-value';
      card.appendChild(value);

      // Subtitle
      const subtitle = document.createElement('div');
      subtitle.className = 'skeleton-kpi-subtitle';
      card.appendChild(subtitle);

      container.appendChild(card);
    }

    return container;
  }

  /**
   * Create a list skeleton screen
   * @param {Object} model - Skeleton screen model
   * @returns {HTMLElement} List skeleton element
   */
  createListSkeleton(model) {
    const container = document.createElement('div');
    container.className = 'skeleton-screen';
    container.setAttribute('data-skeleton-type', 'list');
    container.style.width = model.layout.width;
    container.style.height = model.layout.height;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.padding = '16px';

    // Create list items
    for (let i = 0; i < model.layout.rows; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-item';
      item.style.height = '60px';
      item.style.borderRadius = '8px';
      item.style.backgroundColor = '#e0e0e0';
      item.style.animation = `shimmer ${model.shimmerAnimation.duration}ms ${model.shimmerAnimation.easing} infinite`;
      item.style.backgroundImage = 'linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)';
      item.style.backgroundSize = '200% 100%';
      item.style.backgroundPosition = '0% 0%';
      
      container.appendChild(item);
    }

    return container;
  }

  /**
   * Create a chart skeleton screen
   * @param {Object} model - Skeleton screen model
   * @returns {HTMLElement} Chart skeleton element
   */
  createChartSkeleton(model) {
    const container = document.createElement('div');
    container.className = 'skeleton-screen skeleton-chart';
    container.setAttribute('data-skeleton-type', 'chart');
    container.style.width = model.layout.width;
    container.style.height = model.layout.height;
    container.style.padding = '16px';
    container.style.gap = '16px';

    // Title
    const title = document.createElement('div');
    title.className = 'skeleton-chart-title';
    container.appendChild(title);

    // Chart content
    const content = document.createElement('div');
    content.className = 'skeleton-chart-content';
    content.style.flex = '1';
    container.appendChild(content);

    return container;
  }

  /**
   * Create a form skeleton screen
   * @param {Object} model - Skeleton screen model
   * @returns {HTMLElement} Form skeleton element
   */
  createFormSkeleton(model) {
    const container = document.createElement('div');
    container.className = 'skeleton-screen';
    container.setAttribute('data-skeleton-type', 'form');
    container.style.width = model.layout.width;
    container.style.height = model.layout.height;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '16px';
    container.style.padding = '16px';

    // Create form fields
    for (let i = 0; i < model.layout.rows; i++) {
      // Label
      const label = document.createElement('div');
      label.className = 'skeleton-form-label';
      container.appendChild(label);

      // Input
      const input = document.createElement('div');
      input.className = 'skeleton-form-input';
      container.appendChild(input);
    }

    return container;
  }

  /**
   * Ensure shimmer animation is in the stylesheet
   */
  ensureShimmerAnimation() {
    if (document.getElementById('shimmer-animation-style')) {
      return; // Already added
    }

    const style = document.createElement('style');
    style.id = 'shimmer-animation-style';
    style.textContent = `
      @keyframes shimmer {
        0% {
          background-position: -200% 0%;
        }
        100% {
          background-position: 200% 0%;
        }
      }

      .skeleton-screen {
        animation: fadeIn 0.3s ease-in-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      .skeleton-to-content-transition {
        animation: fadeOut 0.3s ease-in-out forwards;
      }

      .content-fade-in {
        animation: fadeIn 0.3s ease-in-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Set loading state for a button
   * @param {HTMLElement} buttonElement - Button element
   * @param {boolean} isLoading - Whether button is loading
   */
  setButtonLoading(buttonElement, isLoading = true) {
    if (!buttonElement) return;

    if (isLoading) {
      // Store original content
      if (!buttonElement.dataset.originalContent) {
        buttonElement.dataset.originalContent = buttonElement.innerHTML;
      }

      // Disable button
      buttonElement.disabled = true;
      buttonElement.classList.add('loading');

      // Add spinner
      const spinner = document.createElement('span');
      spinner.className = 'button-spinner';
      spinner.innerHTML = '⏳';
      spinner.style.marginRight = '8px';
      spinner.style.display = 'inline-block';
      spinner.style.animation = 'spin 1s linear infinite';

      // Ensure spin animation exists
      this.ensureSpinAnimation();

      buttonElement.innerHTML = '';
      buttonElement.appendChild(spinner);
      buttonElement.appendChild(document.createTextNode('Loading...'));
    } else {
      // Restore original content
      buttonElement.disabled = false;
      buttonElement.classList.remove('loading');
      
      if (buttonElement.dataset.originalContent) {
        buttonElement.innerHTML = buttonElement.dataset.originalContent;
        delete buttonElement.dataset.originalContent;
      }
    }
  }

  /**
   * Ensure spin animation is in the stylesheet
   */
  ensureSpinAnimation() {
    if (document.getElementById('spin-animation-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'spin-animation-style';
    style.textContent = `
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .button-spinner {
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Set loading state for a form
   * @param {HTMLElement} formElement - Form element
   * @param {boolean} isLoading - Whether form is loading
   */
  setFormLoading(formElement, isLoading = true) {
    if (!formElement) return;

    const inputs = formElement.querySelectorAll('input, textarea, select, button');
    const submitButton = formElement.querySelector('button[type="submit"]');

    if (isLoading) {
      // Disable all inputs
      inputs.forEach(input => {
        input.disabled = true;
      });

      // Set loading state on submit button
      if (submitButton) {
        this.setButtonLoading(submitButton, true);
      }

      formElement.classList.add('form-loading');
    } else {
      // Enable all inputs
      inputs.forEach(input => {
        input.disabled = false;
      });

      // Remove loading state from submit button
      if (submitButton) {
        this.setButtonLoading(submitButton, false);
      }

      formElement.classList.remove('form-loading');
    }
  }

  /**
   * Transition from skeleton to actual content
   * @param {HTMLElement} skeletonElement - Skeleton screen element
   * @param {HTMLElement} contentElement - Actual content element
   * @returns {Promise<void>}
   */
  async transitionToContent(skeletonElement, contentElement) {
    return new Promise((resolve) => {
      if (!skeletonElement || !contentElement) {
        resolve();
        return;
      }

      // Add fade-out animation to skeleton
      skeletonElement.classList.add('skeleton-to-content-transition');

      // Add fade-in animation to content
      contentElement.classList.add('content-fade-in');
      contentElement.style.opacity = '0';

      // Replace skeleton with content after animation
      setTimeout(() => {
        if (skeletonElement.parentNode) {
          skeletonElement.parentNode.replaceChild(contentElement, skeletonElement);
        }
        contentElement.style.opacity = '1';
        contentElement.classList.remove('content-fade-in');
        resolve();
      }, this.transitionDuration);
    });
  }

  /**
   * Show loading state for a container
   * @param {HTMLElement} container - Container element
   * @param {string} contentType - Type of skeleton to show
   * @returns {HTMLElement} Skeleton element
   */
  showLoading(container, contentType = 'dashboard') {
    if (!container) return null;

    const skeleton = this.createSkeletonScreen(contentType);
    container.innerHTML = '';
    container.appendChild(skeleton);

    return skeleton;
  }

  /**
   * Hide loading state and show content
   * @param {HTMLElement} container - Container element
   * @param {HTMLElement} contentElement - Content to show
   * @returns {Promise<void>}
   */
  async hideLoading(container, contentElement) {
    if (!container) return;

    const skeleton = container.querySelector('.skeleton-screen');
    if (skeleton) {
      await this.transitionToContent(skeleton, contentElement);
    } else {
      container.innerHTML = '';
      container.appendChild(contentElement);
    }
  }

  /**
   * Create a loading state tracker
   * @param {string} id - Unique identifier for this loading state
   * @param {string} contentType - Type of content being loaded
   * @returns {Object} Loading state object
   */
  createLoadingState(id, contentType = 'dashboard') {
    const state = createLoadingState(contentType, true);
    this.loadingStates.set(id, state);
    return state;
  }

  /**
   * Update loading progress
   * @param {string} id - Loading state identifier
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Optional message
   */
  updateProgress(id, progress, message = null) {
    if (this.loadingStates.has(id)) {
      const state = this.loadingStates.get(id);
      state.progress = Math.min(100, Math.max(0, progress));
      if (message) {
        state.message = message;
      }
    }
  }

  /**
   * Complete loading state
   * @param {string} id - Loading state identifier
   */
  completeLoading(id) {
    if (this.loadingStates.has(id)) {
      const state = this.loadingStates.get(id);
      state.isLoading = false;
      state.progress = 100;
    }
  }

  /**
   * Get loading state
   * @param {string} id - Loading state identifier
   * @returns {Object|null} Loading state or null
   */
  getLoadingState(id) {
    return this.loadingStates.get(id) || null;
  }

  /**
   * Clear loading state
   * @param {string} id - Loading state identifier
   */
  clearLoadingState(id) {
    this.loadingStates.delete(id);
  }

  /**
   * Clear all loading states
   */
  clearAllLoadingStates() {
    this.loadingStates.clear();
  }
}

// Export singleton instance
const loadingService = new LoadingService();
export default loadingService;
