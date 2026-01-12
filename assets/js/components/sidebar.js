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
 * - Collapsible sections (state saved in localStorage)
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

// Check if current user is admin (non-blocking)
async function checkIsAdmin() {
  try {
    // First check if user is already available (fast path)
    let user = authService.getCurrentUser();
    
    // If not, wait briefly for auth to initialize
    if (!user) {
      // Use a timeout to avoid blocking on public pages
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 500));
      const authPromise = authService.waitForAuth();
      user = await Promise.race([authPromise, timeoutPromise]);
    }
    
    if (!user) return false;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return userDoc.data().isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
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
        { href: 'ai-insights.html', icon: '🤖', label: 'AI Insights', featureKey: 'aiInsights' }
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
        { href: 'net-worth.html', icon: '💎', label: 'Net Worth', featureKey: 'netWorth' }
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
        { href: 'user-guide.html', icon: '📖', label: 'User Guide', featureKey: null },
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
  try {
    const saved = localStorage.getItem('rupiya_nav_sections');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveSectionState(sectionId, expanded) {
  try {
    const state = getSectionState();
    state[sectionId] = expanded;
    localStorage.setItem('rupiya_nav_sections', JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// Generate sidebar HTML
function generateSidebarHTML(isAdmin = false) {
  const currentPage = getCurrentPage();
  const sectionState = getSectionState();
  
  // Find which section contains the current page and expand it
  let currentSection = null;
  navigationConfig.sections.forEach(section => {
    if (section.items.some(item => item.href === currentPage)) {
      currentSection = section.id;
    }
  });

  let navHTML = '';
  let sectionCount = 0;
  
  navigationConfig.sections.forEach(section => {
    // Skip admin-only sections for non-admin users
    if (section.adminOnly && !isAdmin) {
      console.log(`[Sidebar] Skipping admin section "${section.title}"`);
      return;
    }
    
    // Filter items based on enabled features
    const visibleItems = section.items.filter(item => {
      // Always show items without feature keys (like Settings, Feedback)
      if (!item.featureKey) {
        console.log(`[Sidebar] Including item "${item.label}" (no feature key)`);
        return true;
      }
      // Show items if their feature is enabled
      const isEnabled = featureConfig.isEnabled(item.featureKey);
      console.log(`[Sidebar] Item "${item.label}" (${item.featureKey}): ${isEnabled ? 'enabled' : 'disabled'}`);
      return isEnabled;
    });

    // Skip section if no visible items
    if (visibleItems.length === 0) {
      console.log(`[Sidebar] Skipping section "${section.title}" - no visible items`);
      return;
    }
    
    sectionCount++;
    console.log(`[Sidebar] Rendering section "${section.title}" with ${visibleItems.length} items`);
    
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
  
  console.log(`[Sidebar] Generated ${sectionCount} sections total`);

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

// Initialize sidebar
export async function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Find the sidebar-nav element
  const sidebarNav = sidebar.querySelector('.sidebar-nav');
  if (!sidebarNav) return;

  console.log('[Sidebar] Initializing sidebar...');

  // Wait for auth to be ready first
  let user = null;
  try {
    user = await authService.waitForAuth();
  } catch (e) {
    console.log('[Sidebar] Auth not ready, using defaults');
  }

  console.log('[Sidebar] Auth ready, initializing feature config...');

  // Initialize feature config (will always load from Firestore now)
  await featureConfig.init();
  
  // Add a small delay to ensure features are fully loaded and cached
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('[Sidebar] Feature config initialized, checking admin status...');

  // Check if user is admin
  const isAdmin = await checkIsAdmin();

  console.log('[Sidebar] Admin status:', isAdmin, '- Generating sidebar HTML...');

  // Generate and inject navigation
  sidebarNav.innerHTML = generateQuickSearchHTML() + generateSidebarHTML(isAdmin);

  console.log('[Sidebar] Sidebar HTML generated, setting up handlers...');

  // Setup section toggle handlers
  setupSectionToggles();
  
  // Setup quick search
  setupQuickSearch(isAdmin);
  
  // Setup sidebar toggle for mobile
  setupMobileSidebar();
  
  // Initialize global logout handler
  initLogoutHandler();

  // Helper function to refresh sidebar
  const refreshSidebar = async () => {
    console.log('[Sidebar] Refreshing sidebar due to feature changes...');
    // Re-check admin status in case it changed
    const currentIsAdmin = await checkIsAdmin();
    sidebarNav.innerHTML = generateQuickSearchHTML() + generateSidebarHTML(currentIsAdmin);
    setupSectionToggles();
    setupQuickSearch(currentIsAdmin);
  };

  // Listen for feature changes and update navigation
  window.addEventListener('featuresUpdated', refreshSidebar);
  
  // Listen for features reset
  window.addEventListener('featuresReset', refreshSidebar);
  
  // Listen for feature toggle events
  window.addEventListener('featureToggled', refreshSidebar);
  
  // Re-initialize features after encryption is ready (for page refresh scenarios)
  // This handles the case where sidebar loads before encryption is initialized
  window.addEventListener('encryptionReady', async () => {
    console.log('[Sidebar] Encryption ready, re-initializing features');
    await featureConfig.reinitialize();
    await refreshSidebar();
  });
}

// Setup collapsible section toggles
function setupSectionToggles() {
  document.querySelectorAll('[data-section-toggle]').forEach(header => {
    header.addEventListener('click', (e) => {
      e.preventDefault();
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
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already initialized
    if (!window._sidebarInitialized) {
      window._sidebarInitialized = true;
      initSidebar();
    }
  });
} else {
  // DOM is already loaded
  if (!window._sidebarInitialized) {
    window._sidebarInitialized = true;
    initSidebar();
  }
}

export { navigationConfig };
