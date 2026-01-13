/**
 * Privacy Mode Button Component
 * Provides UI control for privacy mode toggle
 * Automatically adds button to mobile header and dashboard header
 */

import privacyMode from '../utils/privacy-mode.js';

export function initPrivacyModeButton() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createAndAttachPrivacyButton();
        });
    } else {
        createAndAttachPrivacyButton();
    }
    
    // Listen for privacy mode changes
    window.addEventListener('privacyModeChanged', (e) => {
        updatePrivacyIndicator(e.detail.isPrivacyMode);
    });
}

/**
 * Create and attach privacy button to header
 */
function createAndAttachPrivacyButton() {
    // Add privacy button to dashboard, privacy-settings, and ai-insights pages
    const pathname = window.location.pathname.toLowerCase();
    const href = window.location.href.toLowerCase();
    
    // Check if we're on dashboard, privacy-settings, or ai-insights
    const isDashboard = pathname.includes('dashboard') || href.includes('dashboard');
    const isPrivacySettings = pathname.includes('privacy-settings') || href.includes('privacy-settings');
    const isAIInsights = pathname.includes('ai-insights') || href.includes('ai-insights');
    
    // Skip adding button if not on these pages
    if (!isDashboard && !isPrivacySettings && !isAIInsights) {
        console.log('[PrivacyModeButton] Skipping privacy button on:', pathname);
        return;
    }
    
    console.log('[PrivacyModeButton] Adding privacy button to:', 
        isDashboard ? 'dashboard' : isPrivacySettings ? 'privacy-settings' : 'ai-insights');
    
    // Try to add to mobile header first
    const mobileHeaderActions = document.querySelector('.mobile-header-actions');
    if (mobileHeaderActions && !document.getElementById('privacyModeBtn')) {
        const button = createPrivacyButton();
        // Insert after install button, before theme toggle
        const themeToggle = mobileHeaderActions.querySelector('.theme-toggle-btn');
        if (themeToggle) {
            themeToggle.parentNode.insertBefore(button, themeToggle);
        } else {
            mobileHeaderActions.insertBefore(button, mobileHeaderActions.firstChild);
        }
        console.log('[PrivacyModeButton] Added to mobile header');
    }
    
    // Also try to add to dashboard header actions
    const dashboardHeaderActions = document.querySelector('.dashboard-header-actions');
    if (dashboardHeaderActions && !document.getElementById('privacyModeBtnDashboard')) {
        const button = createPrivacyButton();
        button.id = 'privacyModeBtnDashboard';
        dashboardHeaderActions.insertBefore(button, dashboardHeaderActions.firstChild);
        console.log('[PrivacyModeButton] Added to dashboard header');
    }
    
    // Update button state
    updatePrivacyButton();
}

/**
 * Create privacy button element
 */
function createPrivacyButton() {
    const button = document.createElement('button');
    button.id = 'privacyModeBtn';
    button.className = 'privacy-mode-btn';
    button.setAttribute('title', 'Toggle Privacy Mode');
    button.setAttribute('aria-label', 'Privacy Mode');
    button.setAttribute('aria-pressed', 'false');
    button.style.pointerEvents = 'auto';
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; display: block;">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        privacyMode.toggle();
        updatePrivacyButton();
    });
    
    // Add touch event for better mobile support
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        privacyMode.toggle();
        updatePrivacyButton();
    });
    
    return button;
}

/**
 * Update privacy button appearance
 * When privacy mode is ON, show button as indicator but make it non-clickable
 * Users must go to settings page to disable privacy mode
 */
function updatePrivacyButton() {
    const btn = document.getElementById('privacyModeBtn');
    const dashboardBtn = document.getElementById('privacyModeBtnDashboard');
    
    const buttons = [btn, dashboardBtn].filter(b => b !== null);
    
    buttons.forEach(button => {
        if (privacyMode.isEnabled()) {
            // Show button as indicator but make it non-clickable
            button.style.display = '';
            button.classList.add('active', 'privacy-mode-locked');
            button.setAttribute('title', 'Privacy Mode: ON - Go to Settings to disable');
            button.setAttribute('aria-pressed', 'true');
            button.style.pointerEvents = 'none';
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.7';
        } else {
            button.style.display = '';
            button.classList.remove('active', 'privacy-mode-locked');
            button.setAttribute('title', 'Privacy Mode: OFF - Click to enable');
            button.setAttribute('aria-pressed', 'false');
            button.style.pointerEvents = 'auto';
            button.style.cursor = 'pointer';
            button.style.opacity = '1';
        }
    });
}

/**
 * Update privacy indicator
 * Shows a temporary notification that auto-dismisses after 3 seconds
 */
function updatePrivacyIndicator(isPrivacyMode) {
    let indicator = document.querySelector('.privacy-mode-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'privacy-mode-indicator';
        document.body.appendChild(indicator);
    }
    
    // Clear any existing timeout
    if (indicator._dismissTimeout) {
        clearTimeout(indicator._dismissTimeout);
    }
    
    if (isPrivacyMode) {
        indicator.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px; flex-shrink: 0;">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Privacy Mode: ON</span>
        `;
        indicator.classList.add('show');
        
        // Auto-dismiss after 3 seconds
        indicator._dismissTimeout = setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    } else {
        indicator.classList.remove('show');
    }
}

export default initPrivacyModeButton;
