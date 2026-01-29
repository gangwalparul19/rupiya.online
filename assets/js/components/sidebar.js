/**
 * Centralized Sidebar Navigation Component
 * Provides a single source of truth for navigation across all pages
 * 
 * HOW TO MODIFY NAVIGATION:
 * ========================
 * 1. Edit the `navigationConfig` object below to add/remove/modify nav items
 * 2. Each section has: id, title, icon, expanded (default state), and items array
 * 3. Each item has: href (page URL), icon (emoji), label (display text)
 * 4. Changes here automatically apply to ALL pages
 * 
 * FEATURES:
 * - Collapsible sections (state NOT cached - always fresh)
 * - Quick search with Cmd/Ctrl+K shortcut
 * - Auto-expands section containing current page
 * - Mobile responsive with hamburger menu
 * - Admin-only sections (hidden for non-admin users)
 */

import { db } from '../config/firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';
import { initLogoutHandler } from '../utils/logout-handler.js';
import { featureConfig } from '../config/feature-config.js';

// Check if current user is admin (optimized with caching)
let adminStatusCache = null;
let adminStatusPromise = null;

async function checkIsAdmin() {
  // Return cached value if available
  if (adminStatusCache !== null) {
    return adminStatusCache;
  }

  // If already checking, return the existing promise
  if (adminStatusPromise) {
    return adminStatusPromise;
  }

  // Start new check
  adminStatusPromise = (async () => {
    try {
      let user = authService.getCurrentUser();
      
      if (!user) {
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 500));
        const authPromise = authService.waitForAuth();
        user = await Promise.race([authPromise, timeoutPromise]);
      }
      
      if (!user) {
        adminStatusCache = false;
        return false;
      }
      
      // Add timeout to Firestore call
      const docPromise = getDoc(doc(db, 'users', user.uid));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Admin check timeout')), 1000)
      );
      
      const userDoc = await Promise.race([docPromise, timeoutPromise]);
      const isAdmin = userDoc.exists() ? userDoc.data().isAdmin === true : false;
      
      adminStatusCache = isAdmin;
      return isAdmin;
    } catch (error) {
      console.warn('[Sidebar] Admin check failed:', error.message);
      adminStatusCache = false;
      return false;
    } finally {
      adminStatusPromise = null;
    }
  })();

  return adminStatusPromise;
}

// Clear admin cache on logout
function clearAdminCache() {
  adminStatusCache = null;
  adminStatusPromise = null;
}

// Navigation configuration - edit this to update nav across all pages
// Maps to feature keys in feature-config.js
const navigationConfig = {
  sections: [
    {
      id: 'main',
      title: 'Dashboard',
      icon: '📊',
      expanded: true,
      items: [
        { href: 'dashboard.html', icon: '📊', label: 'Dashboard', featureKey: 'dashboard' },
        { href: 'predictive-analytics.html', icon: '🔮', label: 'Predictive Analytics', featureKey: 'predictiveAnalytics' },
        { href: 'ai-insights.html', icon: '🤖', label: 'AI Insights', featureKey: 'aiInsights' },
        { href: 'spending-patterns.html', icon: '📊', label: 'Spending Patterns', featureKey: 'spendingPatterns' }
      ]
    },
    {
      id: 'transactions',
      title: 'Transactions',
      icon: '💰',
      expanded: false,
      items: [
        { href: 'expenses.html', icon: '💸', label: 'Expenses', featureKey: 'expenses' },
        { href: 'income.html', icon: '💰', label: 'Income', featureKey: 'income' },
        { href: 'split-expense.html', icon: '🤝', label: 'Split Expenses', featureKey: 'splitExpense' },
        { href: 'recurring.html', icon: '🔄', label: 'Recurring', featureKey: 'recurring' }
      ]
    },
    {
      id: 'planning',
      title: 'Planning',
      icon: '🎯',
      expanded: false,
      items: [
        { href: 'budgets.html', icon: '💳', label: 'Budgets', featureKey: 'budgets' },
        { href: 'goals.html', icon: '🎯', label: 'Goals', featureKey: 'goals' },
        { href: 'investments.html', icon: '📈', label: 'Investments', featureKey: 'investments' },
        { href: 'loans.html', icon: '🏦', label: 'Loans & EMI', featureKey: 'loans' },
        { href: 'transfers.html', icon: '🔄', label: 'Transfers', featureKey: 'transfers' },
        { href: 'net-worth.html', icon: '💎', label: 'Net Worth', featureKey: 'netWorth' },
        { href: 'credit-cards.html', icon: '💳', label: 'Credit Cards', featureKey: 'creditCards' },
        { href: 'healthcare-insurance.html', icon: '🏥', label: 'Healthcare & Insurance', featureKey: 'healthcareInsurance' }
      ]
    },
    {
      id: 'assets',
      title: 'Assets & Property',
      icon: '🏠',
      expanded: false,
      items: [
        { href: 'houses.html', icon: '🏠', label: 'Houses', featureKey: 'houses' },
        { href: 'vehicles.html', icon: '🚗', label: 'Vehicles', featureKey: 'vehicles' },
        { href: 'house-help.html', icon: '🧹', label: 'House Help', featureKey: 'houseHelp' }
      ]
    },
    {
      id: 'social',
      title: 'Social & Groups',
      icon: '👥',
      expanded: false,
      items: [
        { href: 'trip-groups.html', icon: '✈️', label: 'Trip Groups', featureKey: 'tripGroups' }
      ]
    },
    {
      id: 'organize',
      title: 'Organization',
      icon: '📁',
      expanded: false,
      items: [
        { href: 'notes.html', icon: '📝', label: 'Notes', featureKey: 'notes' },
        { href: 'documents.html', icon: '📄', label: 'Documents', featureKey: 'documents' }
      ]
    },
    {
      id: 'account',
      title: 'Account & Support',
      icon: '⚙️',
      expanded: false,
      items: [
        { href: 'profile.html', icon: '⚙️', label: 'Settings', featureKey: null },
        { href: 'privacy-settings.html', icon: '🔒', label: 'Privacy Settings', featureKey: null },
        { href: 'feature-details.html', icon: '✨', label: 'Feature Details', featureKey: null },
        { href: 'user-guide-auth.html', icon: '📖', label: 'User Guide', featureKey: null },
        { href: 'feedback.html', icon: '💬', label: 'Feedback', featureKey: null }
      ]
    },
    {
      id: 'admin',
      title: 'Admin',
      icon: '🔐',
      expanded: false,
      adminOnly: true,
      items: [
        { href: 'admin.html', icon: '📊', label: 'Admin Dashboard', featureKey: null }
      ]
    }
  ]
};

// Get current page filename
function getCurrentPage() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf('/') + 1) || 'dashboard.html';
}

// Save/load expanded sections state
function getSectionState() {
  // CACHING DISABLED - Always use default state
  return {};
}

function saveSectionState(sectionId, expanded) {
  // CACHING DISABLED - Don't save section state
}

// Generate sidebar HTML with optional loading state
function generateSidebarHTML(isAdmin = false, isLoading = false) {
  const currentPage = getCurrentPage();
  const sectionState = getSectionState();
  
  // Show loading skeleton if data is still loading
  if (isLoading) {
    return `
      <div class="sidebar-loading">
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
        <div class="skeleton-item"></div>
      </div>
    `;
  }
  
  // Find which section contains the current page and expand it
  let currentSection = null;
  navigationConfig.sections.forEach(section => {
    if (section.items.some(item => item.href === currentPage)) {
      currentSection = section.id;
    }
  });

  let navHTML = '';
  let sectionCount = 0;
  let totalItems = 0;
  let visibleItemsCount = 0;
  
  navigationConfig.sections.forEach(section => {
    // Skip admin-only sections for non-admin users
    if (section.adminOnly && !isAdmin) {
      return;
    }
    
    // Filter items based on enabled features
    const visibleItems = section.items.filter(item => {
      // Always show items without feature keys (like Settings, Feedback)
      if (!item.featureKey) {
        return true;
      }
      // Show items if their feature is enabled
      const isEnabled = featureConfig.isEnabled(item.featureKey);
      return isEnabled;
    });

    // Count items for debugging
    totalItems += section.items.length;
    visibleItemsCount += visibleItems.length;

    // Skip section if no visible items
    if (visibleItems.length === 0) {
      return;
    }
    
    sectionCount++;
    
    // Determine if section should be expanded
    const isCurrentSection = section.id === currentSection;
    const savedState = sectionState[section.id];
    const isExpanded = savedState !== undefined ? savedState : (section.expanded || isCurrentSection);
    
    navHTML += `
      <div class="nav-section ${isExpanded ? 'expanded' : 'collapsed'}" data-section="${section.id}">
        <div class="nav-section-header" data-section-toggle="${section.id}">
          <div class="nav-section-title">
            <span class="nav-section-icon">${section.icon}</span>
            <span>${section.title}</span>
          </div>
          <svg class="nav-section-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <div class="nav-section-items">
    `;
    
    visibleItems.forEach(item => {
      const isActive = item.href === currentPage;
      navHTML += `
          <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
      `;
    });
    
    navHTML += `
        </div>
      </div>
    `;
  });
  
  return navHTML;
}

// Generate quick search HTML
function generateQuickSearchHTML() {
  return `
    <div class="nav-quick-search">
      <div class="quick-search-input-wrapper">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" class="quick-search-input" placeholder="Quick search..." id="navQuickSearch">
        <kbd class="quick-search-kbd">⌘K</kbd>
      </div>
      <div class="quick-search-results" id="quickSearchResults"></div>
    </div>
  `;
}

// Initialize sidebar with optimized loading strategy
export async function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Find the sidebar-nav element
  const sidebarNav = sidebar.querySelector('.sidebar-nav');
  if (!sidebarNav) return;

  // OPTIMIZATION: Show sidebar immediately with defaults, then update when data loads
  // This prevents the UI from being blocked by slow async operations
  
  // Step 1: Render immediately with defaults (no waiting)
  sidebarNav.innerHTML = generateQuickSearchHTML() + generateSidebarHTML(false);
  setupSectionToggles();
  setupQuickSearch(false);
  setupMobileSidebar();
  initLogoutHandler();

  // Step 2: Load data in background and update when ready
  loadSidebarDataAsync(sidebarNav);
}

// Load sidebar data asynchronously without blocking UI
// ENCRYPTION SAFETY: This function ensures encryption is properly initialized
// before loading features, preventing any data corruption or decryption failures
async function loadSidebarDataAsync(sidebarNav) {
  try {
    // STEP 1: Wait for auth first (required for encryption)
    const userPromise = authService.waitForAuth().catch(() => null);
    const user = await userPromise;
    
    if (!user) {
      console.log('[Sidebar] No user found, using defaults');
      return; // Stay with defaults if no user
    }

    // STEP 2: Start loading features (it will wait for encryption internally if needed)
    console.log('[Sidebar] Loading features...');
    
    // Start admin check in parallel
    const adminPromise = checkIsAdmin().catch(() => false);
    
    // Load features with extended timeout
    const featurePromise = Promise.race([
      featureConfig.init(),
      new Promise(resolve => setTimeout(() => {
        console.warn('[Sidebar] Feature loading timeout');
        resolve(false);
      }, 8000)) // 8 second timeout (increased to allow for encryption wait)
    ]).catch(() => false);

    const [isAdmin] = await Promise.all([
      adminPromise,
      featurePromise
    ]);

    // STEP 3: Update sidebar with loaded data
    console.log('[Sidebar] Updating sidebar with loaded features');
    sidebarNav.innerHTML = generateQuickSearchHTML() + generateSidebarHTML(isAdmin);
    setupSectionToggles();
    setupQuickSearch(isAdmin);

    // STEP 4: Setup refresh handler
    const refreshSidebar = async () => {
      console.log('[Sidebar] Refreshing sidebar');
      const currentIsAdmin = await checkIsAdmin().catch(() => false);
      sidebarNav.innerHTML = generateQuickSearchHTML() + generateSidebarHTML(currentIsAdmin);
      setupSectionToggles();
      setupQuickSearch(currentIsAdmin);
    };

    // Listen for feature changes
    window.addEventListener('featuresUpdated', refreshSidebar);
    window.addEventListener('featuresReset', refreshSidebar);
    window.addEventListener('featureToggled', refreshSidebar);
    
    // CRITICAL: Handle encryption ready event
    // This ensures features are reloaded with proper decryption
    window.addEventListener('encryptionReady', async () => {
      console.log('[Sidebar] Encryption ready event received, reloading features');
      
      // Force re-initialization of features
      featureConfig.initialized = false;
      featureConfig.userFeatures = null;
      
      if (featureConfig.init) {
        await featureConfig.init().catch(console.error);
      }
      
      await refreshSidebar().catch(console.error);
    });
  } catch (error) {
    console.error('[Sidebar] Error loading sidebar data:', error);
    // Sidebar is already rendered with defaults, so errors don't break UI
  }
}

// Setup collapsible section toggles
function setupSectionToggles() {
  document.querySelectorAll('[data-section-toggle]').forEach(header => {
    header.addEventListener('click', (e) => {
      // Only handle clicks on the header itself, not on nav items
      if (e.target.closest('.nav-item')) {
        return; // Let nav item clicks through
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const sectionId = header.dataset.sectionToggle;
      const section = document.querySelector(`[data-section="${sectionId}"]`);
      
      if (section) {
        const isExpanded = section.classList.contains('expanded');
        section.classList.toggle('expanded', !isExpanded);
        section.classList.toggle('collapsed', isExpanded);
        saveSectionState(sectionId, !isExpanded);
      }
    });
  });
  
  // Ensure nav items are clickable
  document.querySelectorAll('.nav-item').forEach(navItem => {
    navItem.addEventListener('click', (e) => {
      // Allow default navigation behavior
      // Don't prevent default or stop propagation
    });
  });
}

// Setup quick search functionality
function setupQuickSearch(isAdmin = false) {
  const searchInput = document.getElementById('navQuickSearch');
  const resultsContainer = document.getElementById('quickSearchResults');
  
  if (!searchInput || !resultsContainer) return;

  // Flatten all nav items for search (excluding admin-only for non-admins)
  const allItems = [];
  navigationConfig.sections.forEach(section => {
    if (section.adminOnly && !isAdmin) return;
    
    section.items.forEach(item => {
      allItems.push({
        ...item,
        section: section.title,
        searchText: `${item.label} ${section.title}`.toLowerCase()
      });
    });
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      resultsContainer.innerHTML = '';
      resultsContainer.classList.remove('visible');
      return;
    }

    const matches = allItems.filter(item => 
      item.searchText.includes(query)
    ).slice(0, 5);

    if (matches.length > 0) {
      resultsContainer.innerHTML = matches.map(item => `
        <a href="${item.href}" class="quick-search-result">
          <span class="quick-search-result-icon">${item.icon}</span>
          <span class="quick-search-result-label">${item.label}</span>
          <span class="quick-search-result-section">${item.section}</span>
        </a>
      `).join('');
      resultsContainer.classList.add('visible');
    } else {
      resultsContainer.innerHTML = '<div class="quick-search-no-results">No results found</div>';
      resultsContainer.classList.add('visible');
    }
  });

  // Keyboard shortcut (Cmd/Ctrl + K)
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    
    // Escape to close search
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.blur();
      searchInput.value = '';
      resultsContainer.innerHTML = '';
      resultsContainer.classList.remove('visible');
    }
  });

  // Close results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-quick-search')) {
      resultsContainer.classList.remove('visible');
    }
  });
}

// Setup mobile sidebar toggle
function setupMobileSidebar() {
  // Use a small delay to ensure DOM elements are fully rendered
  setTimeout(() => {
    const sidebarOpen = document.getElementById('sidebarOpen');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // Only log if we're on a page that should have these elements
    if (!sidebarOpen || !sidebar || !overlay) {
      // Silently retry once - some pages may not have sidebar
      setTimeout(() => {
        const retryOpen = document.getElementById('sidebarOpen');
        const retryClose = document.getElementById('sidebarClose');
        const retrySidebar = document.getElementById('sidebar');
        const retryOverlay = document.getElementById('sidebarOverlay');
        
        if (retryOpen && retrySidebar && retryOverlay) {
          attachSidebarListeners(retryOpen, retryClose, retrySidebar, retryOverlay);
        }
      }, 500);
      return;
    }

    attachSidebarListeners(sidebarOpen, sidebarClose, sidebar, overlay);
  }, 100);
}

// Helper function to attach sidebar event listeners
function attachSidebarListeners(sidebarOpen, sidebarClose, sidebar, overlay) {
  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  sidebarOpen?.addEventListener('click', openSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);
}

// Auto-initialize sidebar when DOM is ready
// This ensures sidebar works on all pages, even if initSidebar() is not explicitly called
function autoInitSidebar() {
  // Only initialize if not already initialized
  if (window._sidebarInitialized) {
    return;
  }
  
  window._sidebarInitialized = true;
  
  // Initialize sidebar - it will internally wait for features to load
  initSidebar().catch(error => {
    console.error('[Sidebar] Error during auto-initialization:', error);
  });
}

// Listen for logout to clear caches
window.addEventListener('userLoggedOut', () => {
  clearAdminCache();
  window._sidebarInitialized = false;
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInitSidebar);
} else {
  // DOM is already loaded
  autoInitSidebar();
}

export { navigationConfig };
