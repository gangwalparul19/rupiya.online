/**
 * Dashboard Page Loader Utility
 * Centralizes common CSS and JS loading for all dashboard/authorized pages
 * 
 * Usage:
 * <script src="assets/js/utils/dashboard-loader.js"></script>
 * <script>
 *   DashboardLoader.init({
 *     pageSpecificCSS: ['expenses.css', 'expenses-kpi-override.css'],
 *     pageSpecificJS: ['pages/expenses.js'],
 *     pageTitle: 'Expenses'
 *   });
 * </script>
 */

const DashboardLoader = {
  /**
   * Common CSS files loaded on all dashboard pages
   */
  commonCSS: [
    'assets/css/bundles/core.bundle.css',
    'assets/css/bundles/dashboard.bundle.css',
    'assets/css/sidebar.css'
  ],

  /**
   * Common JS files loaded on all dashboard pages
   */
  commonJS: [
    'assets/js/utils/auth-guard.js',
    'assets/js/utils/button-reset-fix.js'
  ],

  /**
   * Common module scripts loaded on all dashboard pages
   */
  commonModules: [
    'assets/js/init-error-handlers.js',
    'assets/js/components/sidebar.js',
    'assets/js/utils/ux-enhancements.js',
    'assets/js/utils/logout-handler.js'
  ],

  /**
   * Load a CSS file dynamically
   */
  loadCSS: (href) => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  },

  /**
   * Load a JS file dynamically
   */
  loadJS: (src, isModule = false) => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      if (isModule) {
        script.type = 'module';
      }
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  },

  /**
   * Initialize dashboard page with common and page-specific resources
   * @param {Object} config - Configuration object
   * @param {Array} config.pageSpecificCSS - Array of page-specific CSS files
   * @param {Array} config.pageSpecificJS - Array of page-specific JS files
   * @param {Array} config.pageSpecificModules - Array of page-specific module JS files
   * @param {string} config.pageTitle - Page title for dashboard header
   * @param {boolean} config.skipCommon - Skip loading common resources (default: false)
   */
  init: async (config = {}) => {
    const {
      pageSpecificCSS = [],
      pageSpecificJS = [],
      pageSpecificModules = [],
      pageTitle = 'Dashboard',
      skipCommon = false
    } = config;

    try {
      // Load common CSS (if not skipped)
      if (!skipCommon) {
        const cssPromises = DashboardLoader.commonCSS.map(href => 
          DashboardLoader.loadCSS(href)
        );
        await Promise.all(cssPromises);
      }

      // Load page-specific CSS
      const pageCSSpromises = pageSpecificCSS.map(file => {
        const href = file.startsWith('assets/') ? file : `assets/css/${file}`;
        return DashboardLoader.loadCSS(href);
      });
      await Promise.all(pageCSSpromises);

      // Load common JS (if not skipped)
      if (!skipCommon) {
        // Load non-module scripts first (auth-guard, button-reset-fix)
        for (const src of DashboardLoader.commonJS) {
          await DashboardLoader.loadJS(src, false);
        }

        // Load module scripts
        for (const src of DashboardLoader.commonModules) {
          await DashboardLoader.loadJS(src, true);
        }
      }

      // Load page-specific JS
      for (const file of pageSpecificJS) {
        const src = file.startsWith('assets/') ? file : `assets/js/${file}`;
        await DashboardLoader.loadJS(src, false);
      }

      // Load page-specific modules
      for (const file of pageSpecificModules) {
        const src = file.startsWith('assets/') ? file : `assets/js/${file}`;
        await DashboardLoader.loadJS(src, true);
      }

      console.log(`✅ Dashboard page loaded: ${pageTitle}`);
    } catch (error) {
      console.error('❌ Error loading dashboard resources:', error);
    }
  },

  /**
   * Get list of all common resources
   */
  getCommonResources: () => {
    return {
      css: DashboardLoader.commonCSS,
      js: DashboardLoader.commonJS,
      modules: DashboardLoader.commonModules
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardLoader;
}
