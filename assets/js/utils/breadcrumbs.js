// Breadcrumb Navigation Utility
// Manages breadcrumb trails across the application

class BreadcrumbManager {
  constructor() {
    this.breadcrumbs = [];
    this.recentlyViewed = [];
    this.maxRecentlyViewed = 5;
    this.loadRecentlyViewed();
  }

  /**
   * Set breadcrumb trail
   * @param {Array} breadcrumbs - Array of {label, href} objects
   */
  setBreadcrumbs(breadcrumbs) {
    this.breadcrumbs = breadcrumbs;
    this.render();
  }

  /**
   * Add a breadcrumb item
   * @param {string} label - Display label
   * @param {string} href - URL or null for current page
   */
  addBreadcrumb(label, href = null) {
    this.breadcrumbs.push({ label, href });
    this.render();
  }

  /**
   * Clear all breadcrumbs
   */
  clearBreadcrumbs() {
    this.breadcrumbs = [];
    this.render();
  }

  /**
   * Add to recently viewed
   * @param {string} label - Page label
   * @param {string} href - Page URL
   */
  addRecentlyViewed(label, href) {
    // Remove if already exists
    this.recentlyViewed = this.recentlyViewed.filter(item => item.href !== href);

    // Add to front
    this.recentlyViewed.unshift({ label, href, timestamp: Date.now() });

    // Keep only max items
    this.recentlyViewed = this.recentlyViewed.slice(0, this.maxRecentlyViewed);

    this.saveRecentlyViewed();
    this.renderRecentlyViewed();
  }

  /**
   * Get recently viewed items
   * @returns {Array} Recently viewed items
   */
  getRecentlyViewed() {
    return [...this.recentlyViewed];
  }

  /**
   * Clear recently viewed
   */
  clearRecentlyViewed() {
    this.recentlyViewed = [];
    this.saveRecentlyViewed();
    this.renderRecentlyViewed();
  }

  /**
   * Render breadcrumbs to DOM
   */
  render() {
    const container = document.querySelector('.breadcrumb-container');
    if (!container) return;

    if (this.breadcrumbs.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = this.breadcrumbs.map((crumb, index) => {
      const isLast = index === this.breadcrumbs.length - 1;
      const separator = index < this.breadcrumbs.length - 1 
        ? `<span class="breadcrumb-separator">/</span>` 
        : '';

      if (isLast) {
        return `
          <div class="breadcrumb-item active">
            <span>${this.escapeHtml(crumb.label)}</span>
          </div>
        `;
      }

      return `
        <div class="breadcrumb-item">
          <a href="${this.escapeHtml(crumb.href)}">${this.escapeHtml(crumb.label)}</a>
          ${separator}
        </div>
      `;
    }).join('');
  }

  /**
   * Render recently viewed items
   */
  renderRecentlyViewed() {
    const container = document.querySelector('.sidebar-recently-viewed-list');
    if (!container) return;

    if (this.recentlyViewed.length === 0) {
      container.innerHTML = '<p style="padding: 0.5rem 1rem; color: var(--text-secondary); font-size: 0.875rem;">No recent pages</p>';
      return;
    }

    container.innerHTML = this.recentlyViewed.map(item => `
      <a href="${this.escapeHtml(item.href)}" class="sidebar-recently-viewed-item">
        ${this.escapeHtml(item.label)}
      </a>
    `).join('');
  }

  /**
   * Save recently viewed to localStorage
   */
  saveRecentlyViewed() {
    try {
      localStorage.setItem('rupiya_recently_viewed', JSON.stringify(this.recentlyViewed));
    } catch (e) {
      console.warn('Failed to save recently viewed:', e);
    }
  }

  /**
   * Load recently viewed from localStorage
   */
  loadRecentlyViewed() {
    try {
      const saved = localStorage.getItem('rupiya_recently_viewed');
      if (saved) {
        this.recentlyViewed = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load recently viewed:', e);
      this.recentlyViewed = [];
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create and export singleton instance
const breadcrumbManager = new BreadcrumbManager();
export default breadcrumbManager;
