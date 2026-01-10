/**
 * Privacy Mode Button Component
 * Provides UI control for privacy mode toggle
 */

import privacyMode from '../utils/privacy-mode.js';

export function initPrivacyModeButton() {
    // Create privacy mode button if it doesn't exist
    const existingBtn = document.getElementById('privacyModeBtn');
    if (!existingBtn) {
        createPrivacyModeButton();
    }
    
    // Attach event listeners
    attachEventListeners();
    
    // Listen for privacy mode changes
    window.addEventListener('privacyModeChanged', (e) => {
        updatePrivacyIndicator(e.detail.isPrivacyMode);
    });
}

/**
 * Create privacy mode button
 */
function createPrivacyModeButton() {
    const mobileHeaderActions = document.querySelector('.mobile-header-actions');
    const dashboardHeaderActions = document.querySelector('.dashboard-header-actions');
    
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
    
    button.addEventListener('click', () => {
        privacyMode.toggle();
    });
    
    // Add to mobile header if available
    if (mobileHeaderActions) {
        mobileHeaderActions.insertBefore(button, mobileHeaderActions.firstChild);
    }
    
    // Also add to dashboard header if available
    if (dashboardHeaderActions) {
        const dashboardBtn = button.cloneNode(true);
        dashboardBtn.id = 'privacyModeBtnDashboard';
        dashboardBtn.addEventListener('click', () => {
            privacyMode.toggle();
        });
        dashboardHeaderActions.insertBefore(dashboardBtn, dashboardHeaderActions.firstChild);
    }
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
    const btn = document.getElementById('privacyModeBtn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            privacyMode.toggle();
        });
    }
    
    const dashboardBtn = document.getElementById('privacyModeBtnDashboard');
    if (dashboardBtn) {
        dashboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            privacyMode.toggle();
        });
    }
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
