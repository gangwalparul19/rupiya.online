/**
 * User Guide (Authenticated) Page
 * Handles user guide page for authenticated users
 */

import '../services/services-init.js';
import authService from '../services/auth-service.js';
import themeManager from '../utils/theme-manager.js';
import toast from '../components/toast.js';

let currentUser = null;

// Initialize
async function init() {
  try {
    // Wait for auth
    currentUser = await authService.waitForAuth();
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }
    
    // Initialize page
    initPage();
    
  } catch (error) {
    console.error('[User Guide Auth] Init error:', error);
    window.location.href = 'login.html';
  }
}

// Initialize page after auth
async function initPage() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  // Update user profile
  loadUserProfile(user);
  
  // Setup theme toggle
  setupThemeToggle();
  
  // Setup accordion
  setupAccordion();
  
  // Setup smooth scrolling
  setupSmoothScrolling();
}

// Update user profile
function loadUserProfile(user) {
  if (!user) return;
  
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userName) {
    userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
  }
  
  if (userEmail) {
    userEmail.textContent = user.email || '';
  }
  
  if (userAvatar) {
    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
    } else {
      const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }
  }
}

// Setup theme toggle
function setupThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = themeManager.toggleTheme();
      toast.success(`Switched to ${newTheme} mode`);
    });
  }
}

// Setup accordion functionality
function setupAccordion() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close all accordions
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('active');
      });
      
      // Open clicked accordion if it wasn't active
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// Setup smooth scrolling for TOC links
function setupSmoothScrolling() {
  document.querySelectorAll('.toc-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.classList.add('active');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
