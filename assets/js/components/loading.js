// Loading Component
// Manages loading states, overlays, and skeleton screens

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
  }

  /**
   * Show page loading overlay
   * @param {string} message - Loading message
   */
  showPageLoader(message = 'Loading...') {
    // Remove existing overlay if any
    this.hidePageLoader();

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-overlay-content">
        <div class="spinner-xl"></div>
        <p class="loading-overlay-text">${message}</p>
      </div>
    `;

    document.body.appendChild(overlay);
    this.activeLoaders.add('page');
  }

  /**
   * Hide page loading overlay
   */
  hidePageLoader() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 300);
      this.activeLoaders.delete('page');
    }
  }

  /**
   * Show button loading state
   * @param {HTMLElement} button - Button element
   * @param {string} originalText - Original button text (optional)
   */
  showButtonLoader(button, originalText = null) {
    if (!button) return;

    // Store original text
    if (originalText) {
      button.dataset.originalText = originalText;
    } else if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    // Add loading class
    button.classList.add('loading');
    button.disabled = true;
  }

  /**
   * Hide button loading state
   * @param {HTMLElement} button - Button element
   */
  hideButtonLoader(button) {
    if (!button) return;

    button.classList.remove('loading');
    button.disabled = false;

    // Restore original text
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }

  /**
   * Show skeleton screen
   * @param {HTMLElement} container - Container element
   * @param {string} type - Skeleton type (card, table, kpi, etc.)
   * @param {number} count - Number of skeleton items
   */
  showSkeleton(container, type = 'card', count = 3) {
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const skeleton = this.createSkeleton(type);
      container.appendChild(skeleton);
    }
  }

  /**
   * Create skeleton element
   * @param {string} type - Skeleton type
   * @returns {HTMLElement} Skeleton element
   */
  createSkeleton(type) {
    const skeleton = document.createElement('div');

    switch (type) {
      case 'kpi':
        skeleton.className = 'skeleton-kpi-card';
        skeleton.innerHTML = `
          <div class="skeleton skeleton-kpi-label"></div>
          <div class="skeleton skeleton-kpi-value"></div>
          <div class="skeleton skeleton-kpi-subtitle"></div>
        `;
        break;

      case 'table':
        skeleton.className = 'skeleton-table-row';
        skeleton.innerHTML = `
          <div class="skeleton skeleton-table-cell"></div>
          <div class="skeleton skeleton-table-cell"></div>
          <div class="skeleton skeleton-table-cell"></div>
          <div class="skeleton skeleton-table-cell"></div>
        `;
        break;

      case 'card':
      default:
        skeleton.className = 'card';
        skeleton.innerHTML = `
          <div class="card-body">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
          </div>
        `;
        break;
    }

    return skeleton;
  }

  /**
   * Show loading state for element
   * @param {HTMLElement} element - Element to show loading state
   */
  showElementLoader(element) {
    if (!element) return;

    element.classList.add('loading-state');
    element.setAttribute('aria-busy', 'true');
  }

  /**
   * Hide loading state for element
   * @param {HTMLElement} element - Element to hide loading state
   */
  hideElementLoader(element) {
    if (!element) return;

    element.classList.remove('loading-state');
    element.setAttribute('aria-busy', 'false');
  }

  /**
   * Show progress bar
   * @param {HTMLElement} container - Container element
   * @param {number} progress - Progress percentage (0-100)
   * @returns {HTMLElement} Progress bar element
   */
  showProgressBar(container, progress = 0) {
    if (!container) return null;

    let progressBar = container.querySelector('.progress-bar-container');
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar-container';
      progressBar.innerHTML = `
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      `;
      container.appendChild(progressBar);
    }

    return progressBar;
  }

  /**
   * Update progress bar
   * @param {HTMLElement} progressBar - Progress bar element
   * @param {number} progress - Progress percentage (0-100)
   */
  updateProgressBar(progressBar, progress) {
    if (!progressBar) return;

    const fill = progressBar.querySelector('.progress-bar-fill');
    if (fill) {
      fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  }

  /**
   * Hide progress bar
   * @param {HTMLElement} progressBar - Progress bar element
   */
  hideProgressBar(progressBar) {
    if (progressBar) {
      progressBar.remove();
    }
  }

  /**
   * Show indeterminate progress
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement} Progress bar element
   */
  showIndeterminateProgress(container) {
    if (!container) return null;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar-container';
    progressBar.innerHTML = `
      <div class="progress-bar-fill progress-bar-indeterminate"></div>
    `;
    container.appendChild(progressBar);

    return progressBar;
  }

  /**
   * Show loading dots
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement} Loading dots element
   */
  showLoadingDots(container) {
    if (!container) return null;

    const dots = document.createElement('div');
    dots.className = 'loading-dots';
    dots.innerHTML = `
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
    `;
    container.appendChild(dots);

    return dots;
  }

  /**
   * Show content loading state
   * @param {HTMLElement} container - Container element
   * @param {string} message - Loading message
   */
  showContentLoader(container, message = 'Loading...') {
    if (!container) return;

    container.innerHTML = `
      <div class="content-loading">
        <div class="spinner-lg"></div>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Show empty state
   * @param {HTMLElement} container - Container element
   * @param {string} title - Empty state title
   * @param {string} message - Empty state message
   * @param {string} icon - Empty state icon
   */
  showEmptyState(container, title, message, icon = '📭') {
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-text">${message}</p>
      </div>
    `;
  }

  /**
   * Check if any loaders are active
   * @returns {boolean} True if loaders are active
   */
  hasActiveLoaders() {
    return this.activeLoaders.size > 0;
  }

  /**
   * Clear all loaders
   */
  clearAllLoaders() {
    this.hidePageLoader();
    
    // Remove all button loaders
    document.querySelectorAll('.btn.loading').forEach(btn => {
      this.hideButtonLoader(btn);
    });

    // Remove all element loaders
    document.querySelectorAll('[aria-busy="true"]').forEach(el => {
      this.hideElementLoader(el);
    });

    this.activeLoaders.clear();
  }

  /**
   * Wrap async operation with loading state
   * @param {Function} operation - Async operation
   * @param {Object} options - Loading options
   * @returns {Promise} Operation result
   */
  async withLoading(operation, options = {}) {
    const {
      showPage = false,
      button = null,
      element = null,
      message = 'Loading...'
    } = options;

    try {
      // Show loading states
      if (showPage) {
        this.showPageLoader(message);
      }
      if (button) {
        this.showButtonLoader(button);
      }
      if (element) {
        this.showElementLoader(element);
      }

      // Execute operation
      const result = await operation();

      return result;
    } finally {
      // Hide loading states
      if (showPage) {
        this.hidePageLoader();
      }
      if (button) {
        this.hideButtonLoader(button);
      }
      if (element) {
        this.hideElementLoader(element);
      }
    }
  }
}

// Create and export singleton instance
const loadingManager = new LoadingManager();

// Export for use in other modules
export default loadingManager;

// Also make available globally
window.loadingManager = loadingManager;

