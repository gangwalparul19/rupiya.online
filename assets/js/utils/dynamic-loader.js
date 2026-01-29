/**
 * Dynamic Module Loader
 * Implements code splitting for better performance
 */

// Cache for loaded modules
const moduleCache = new Map();

// Loading states
const loadingStates = new Map();

/**
 * Dynamically import a module with caching
 * @param {string} modulePath - Path to the module
 * @returns {Promise<any>} Loaded module
 */
export async function loadModule(modulePath) {
  // Check cache first
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath);
  }
  
  // Check if already loading
  if (loadingStates.has(modulePath)) {
    return loadingStates.get(modulePath);
  }
  
  // Start loading
  const loadPromise = import(modulePath)
    .then(module => {
      moduleCache.set(modulePath, module);
      loadingStates.delete(modulePath);
      return module;
    })
    .catch(error => {
      loadingStates.delete(modulePath);
      console.error(`Failed to load module: ${modulePath}`, error);
      throw error;
    });
  
  loadingStates.set(modulePath, loadPromise);
  return loadPromise;
}

/**
 * Preload a module without executing it
 * @param {string} modulePath - Path to the module
 */
export function preloadModule(modulePath) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = modulePath;
  document.head.appendChild(link);
}

/**
 * Load multiple modules in parallel
 * @param {string[]} modulePaths - Array of module paths
 * @returns {Promise<any[]>} Array of loaded modules
 */
export async function loadModules(modulePaths) {
  return Promise.all(modulePaths.map(path => loadModule(path)));
}

/**
 * Lazy load a feature module
 * @param {string} featureName - Name of the feature
 * @returns {Promise<any>} Loaded feature module
 */
export async function loadFeature(featureName) {
  const featureMap = {
    // Pages
    'investments': '/assets/js/pages/investments.js',
    'analytics': '/assets/js/pages/predictive-analytics.js',
    'ai-insights': '/assets/js/pages/ai-insights.js',
    'trip-groups': '/assets/js/pages/trip-groups.js',
    'trip-detail': '/assets/js/pages/trip-group-detail.js',
    'budgets': '/assets/js/pages/budgets.js',
    'goals': '/assets/js/pages/goals.js',
    'vehicles': '/assets/js/pages/vehicles.js',
    'houses': '/assets/js/pages/houses.js',
    'loans': '/assets/js/pages/loans.js',
    'credit-cards': '/assets/js/pages/credit-cards.js',
    'documents': '/assets/js/pages/documents.js',
    'notes': '/assets/js/pages/notes.js',
    
    // Services
    'investment-service': '/assets/js/services/investment-analytics-service.js',
    'analytics-service': '/assets/js/services/analytics-service.js',
    'prediction-service': '/assets/js/services/prediction-service.js',
    'trip-service': '/assets/js/services/trip-groups-service.js',
    'backup-service': '/assets/js/services/backup-service.js',
    
    // Utils
    'chart-utils': '/assets/js/utils/chart-enhancements.js',
    'ai-engine': '/assets/js/utils/ai-insights-engine.js'
  };
  
  const modulePath = featureMap[featureName];
  if (!modulePath) {
    throw new Error(`Unknown feature: ${featureName}`);
  }
  
  return loadModule(modulePath);
}

/**
 * Load feature with loading indicator
 * @param {string} featureName - Name of the feature
 * @param {HTMLElement} container - Container to show loading state
 * @returns {Promise<any>} Loaded feature module
 */
export async function loadFeatureWithUI(featureName, container) {
  // Show loading state
  if (container) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading ${featureName}...</p>
      </div>
    `;
  }
  
  try {
    const module = await loadFeature(featureName);
    
    // Clear loading state
    if (container) {
      container.innerHTML = '';
    }
    
    return module;
  } catch (error) {
    // Show error state
    if (container) {
      container.innerHTML = `
        <div class="error-container">
          <p>Failed to load ${featureName}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
    throw error;
  }
}

/**
 * Prefetch modules for faster loading
 * Call this during idle time
 */
export function prefetchFeatures(features) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      features.forEach(feature => {
        const featureMap = {
          'investments': '/assets/js/pages/investments.js',
          'analytics': '/assets/js/pages/predictive-analytics.js',
          'trip-groups': '/assets/js/pages/trip-groups.js'
        };
        
        const path = featureMap[feature];
        if (path) {
          preloadModule(path);
        }
      });
    });
  }
}

/**
 * Load critical features immediately, defer others
 */
export async function loadCriticalFeatures() {
  const critical = [
    '/assets/js/services/auth-service.js',
    '/assets/js/services/firestore-service.js',
    '/assets/js/services/user-service.js'
  ];
  
  return loadModules(critical);
}

/**
 * Load non-critical features after page load
 */
export function loadNonCriticalFeatures() {
  if (document.readyState === 'complete') {
    prefetchFeatures(['investments', 'analytics', 'trip-groups']);
  } else {
    window.addEventListener('load', () => {
      prefetchFeatures(['investments', 'analytics', 'trip-groups']);
    });
  }
}

/**
 * Clear module cache (useful for development)
 */
export function clearCache() {
  moduleCache.clear();
  loadingStates.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cached: moduleCache.size,
    loading: loadingStates.size,
    modules: Array.from(moduleCache.keys())
  };
}

// Auto-load non-critical features
loadNonCriticalFeatures();
