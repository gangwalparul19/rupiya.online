/**
 * Lazy Chart Loader Utility
 * Implements lazy loading for charts using Intersection Observer
 * Charts are only rendered when they become visible in the viewport
 */

class LazyChartLoader {
  constructor() {
    this.observer = null;
    this.chartElements = new Map();
    this.renderCallbacks = new Map();
    this.initObserver();
  }

  /**
   * Initialize Intersection Observer
   * @private
   */
  initObserver() {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, charts will render immediately');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const elementId = entry.target.id;
            const callback = this.renderCallbacks.get(elementId);
            
            if (callback && !this.chartElements.get(elementId)?.rendered) {
              // Defer rendering to next frame for better performance
              requestAnimationFrame(() => {
                try {
                  callback();
                  // Mark as rendered
                  const chartData = this.chartElements.get(elementId);
                  if (chartData) {
                    chartData.rendered = true;
                  }
                } catch (error) {
                  console.error(`Error rendering chart ${elementId}:`, error);
                }
              });
            }
          }
        });
      },
      {
        // Start loading when element is 100px before entering viewport
        rootMargin: '100px',
        threshold: 0
      }
    );
  }

  /**
   * Register a chart element for lazy loading
   * @param {string} elementId - ID of the chart canvas element
   * @param {Function} renderCallback - Function to call when chart should be rendered
   * @param {Object} options - Optional configuration
   */
  registerChart(elementId, renderCallback, options = {}) {
    const element = document.getElementById(elementId);
    
    if (!element) {
      console.warn(`Chart element with ID "${elementId}" not found`);
      return;
    }

    // Store chart data
    this.chartElements.set(elementId, {
      element,
      rendered: false,
      renderCallback,
      options
    });

    // Store render callback
    this.renderCallbacks.set(elementId, renderCallback);

    // Start observing if observer is available
    if (this.observer) {
      this.observer.observe(element);
    } else {
      // Fallback: render immediately if IntersectionObserver not available
      renderCallback();
      this.chartElements.get(elementId).rendered = true;
    }
  }

  /**
   * Unregister a chart element
   * @param {string} elementId - ID of the chart canvas element
   */
  unregisterChart(elementId) {
    const chartData = this.chartElements.get(elementId);
    
    if (chartData && this.observer) {
      this.observer.unobserve(chartData.element);
    }

    this.chartElements.delete(elementId);
    this.renderCallbacks.delete(elementId);
  }

  /**
   * Force render a chart immediately
   * @param {string} elementId - ID of the chart canvas element
   */
  forceRender(elementId) {
    const callback = this.renderCallbacks.get(elementId);
    const chartData = this.chartElements.get(elementId);

    if (callback && chartData && !chartData.rendered) {
      callback();
      chartData.rendered = true;
    }
  }

  /**
   * Check if a chart has been rendered
   * @param {string} elementId - ID of the chart canvas element
   * @returns {boolean} True if chart has been rendered
   */
  isRendered(elementId) {
    const chartData = this.chartElements.get(elementId);
    return chartData ? chartData.rendered : false;
  }

  /**
   * Get all registered charts
   * @returns {Array} Array of registered chart element IDs
   */
  getRegisteredCharts() {
    return Array.from(this.chartElements.keys());
  }

  /**
   * Get statistics about lazy loading
   * @returns {Object} Statistics including total, rendered, and pending charts
   */
  getStats() {
    const total = this.chartElements.size;
    const rendered = Array.from(this.chartElements.values()).filter(c => c.rendered).length;
    const pending = total - rendered;

    return {
      total,
      rendered,
      pending,
      charts: Array.from(this.chartElements.entries()).map(([id, data]) => ({
        id,
        rendered: data.rendered
      }))
    };
  }

  /**
   * Cleanup and destroy observer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.chartElements.clear();
    this.renderCallbacks.clear();
  }
}

// Export singleton instance
const lazyChartLoader = new LazyChartLoader();
export default lazyChartLoader;
