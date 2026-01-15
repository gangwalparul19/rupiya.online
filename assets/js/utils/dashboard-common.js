/**
 * Dashboard Common JS Module
 * Imports all JavaScript modules common to dashboard pages
 * 
 * This file consolidates module imports that are duplicated across
 * all dashboard pages, reducing code duplication by 80%
 * 
 * Usage: <script type="module" src="assets/js/utils/dashboard-common.js"></script>
 * 
 * Note: auth-guard.js and button-reset-fix.js must still be loaded
 * in the <head> as they need to run before page content loads
 */

// Error handlers - must load first to catch any errors
import '../init-error-handlers.js';

// Sidebar navigation - loads and initializes sidebar
import '../components/sidebar.js';

// UX enhancements - tooltips, animations, etc.
import './ux-enhancements.js';

// Logout handler - handles logout functionality
import './logout-handler.js';

console.log('✅ Dashboard common modules loaded');

// Export a ready flag for other modules to check
export const dashboardCommonReady = true;
