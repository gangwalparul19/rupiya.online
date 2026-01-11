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
    }
    
    // Also try to add to dashboard header actions
    const dashboardHeaderActions = document.querySelector('.dashboard-header-actions');
    if (dashboardHeaderActions && !document.getElementById('privacyModeBtnDashboard')) {
        const button = createPrivacyButton();
        button.id = 'privacyModeBtnDashboard';
        dashboardHeaderActions.insertBefore(button, dashboardHeaderActions.firstChild);
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
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    `;
    
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        privacyMode.toggle();
        updatePrivacyButton();
    });
    
    return button;
}

/**
 * Update privacy button appearance
 * Hide button when privacy mode is ON (can only disable from settings)
 */
function updatePrivacyButton() {
    const btn = document.getElementById('privacyModeBtn');
    const dashboardBtn = document.getElementById('privacyModeBtnDashboard');
    
    const buttons = [btn, dashboardBtn].filter(b => b !== null);
    
    buttons.forEach(button => {
        if (privacyMode.isEnabled()) {
            // Hide the toggle button when privacy mode is ON
            // Users must go to settings to disable privacy mode
            button.style.display = 'none';
        } else {
            button.style.display = '';
            button.classList.remove('active');
            button.setAttribute('title', 'Privacy Mode: OFF - Click to enable');
            button.setAttribute('aria-pressed', 'false');
        }
    });
}

/**
 * Update privacy indicator
 */
function updatePrivacyIndicator(isPrivacyMode) {
    let indicator = document.querySelector('.privacy-mode-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'privacy-mode-indicator';
        document.body.appendChild(indicator);
    }
    
    if (isPrivacyMode) {
        indicator.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <span>Privacy Mode: ON</span>
        `;
        indicator.classList.add('show');
    } else {
        indicator.classList.remove('show');
    }
}

export default initPrivacyModeButton;
