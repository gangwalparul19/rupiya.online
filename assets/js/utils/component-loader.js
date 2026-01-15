/**
 * Component Loader Utility
 * Loads reusable HTML components into pages
 * 
 * Usage:
 * <div data-component="landing-header"></div>
 * <script src="assets/js/utils/component-loader.js"></script>
 */

const ComponentLoader = {
  /**
   * Load a component from the components directory
   * @param {string} componentName - Name of the component file (without .html)
   * @param {string} targetSelector - CSS selector for target element
   */
  load: async (componentName, targetSelector) => {
    try {
      const response = await fetch(`/components/${componentName}.html`);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${componentName}`);
      }
      
      const html = await response.text();
      const target = document.querySelector(targetSelector);
      
      if (target) {
        target.innerHTML = html;
        
        // Execute any scripts in the loaded component
        const scripts = target.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        });
      } else {
        console.error(`Target element not found: ${targetSelector}`);
      }
    } catch (error) {
      console.error('Component loading error:', error);
    }
  },

  /**
   * Load all components marked with data-component attribute
   */
  loadAll: async () => {
    const components = document.querySelectorAll('[data-component]');
    const promises = [];
    
    components.forEach(element => {
      const componentName = element.getAttribute('data-component');
      const promise = ComponentLoader.load(componentName, `[data-component="${componentName}"]`);
      promises.push(promise);
    });
    
    await Promise.all(promises);
  },

  /**
   * Initialize component loader on page load
   */
  init: () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ComponentLoader.loadAll);
    } else {
      ComponentLoader.loadAll();
    }
  }
};

// Auto-initialize if script is loaded
ComponentLoader.init();

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentLoader;
}
