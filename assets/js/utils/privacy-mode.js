/**
 * Privacy Mode Manager
 * Allows users to hide sensitive financial data while keeping UI visible
 * Perfect for sharing device with others or demo purposes
 * 
 * AUTO-DETECTION: Automatically finds and hides financial data without HTML changes
 */

class PrivacyModeManager {
    constructor() {
        this.isPrivacyMode = false;
        this.storageKey = 'rupiya_privacy_mode';
        this.originalValues = new Map();
        this.init();
    }

    /**
     * Initialize privacy mode from localStorage
     */
    init() {
        const saved = localStorage.getItem(this.storageKey);
        this.isPrivacyMode = saved === 'true';
        
        // Start watching for DOM changes
        this.watchForChanges();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applyPrivacyMode();
            });
        } else {
            this.applyPrivacyMode();
        }
    }

    /**
     * Toggle privacy mode on/off
     */
    toggle() {
        this.isPrivacyMode = !this.isPrivacyMode;
        localStorage.setItem(this.storageKey, this.isPrivacyMode);
        this.applyPrivacyMode();
        this.showNotification();
        return this.isPrivacyMode;
    }

    /**
     * Enable privacy mode
     */
    enable() {
        this.isPrivacyMode = true;
        localStorage.setItem(this.storageKey, 'true');
        this.applyPrivacyMode();
        this.showNotification('Privacy Mode Enabled');
    }

    /**
     * Disable privacy mode
     */
    disable() {
        this.isPrivacyMode = false;
        localStorage.setItem(this.storageKey, 'false');
        this.applyPrivacyMode();
        this.showNotification('Privacy Mode Disabled');
    }

    /**
     * Apply privacy mode to all sensitive elements
     * AUTO-DETECTS financial data without requiring HTML changes
     */
    applyPrivacyMode() {
        // Auto-detect and hide KPI values (numbers with ₹ or currency)
        this.autoHideAmounts();
        
        // Auto-detect and hide percentages
        this.autoHidePercentages();
        
        // Auto-detect and hide emails
        this.autoHideEmails();
        
        // Auto-detect and hide charts
        this.autoHideCharts();
        
        // Hide elements with data-privacy attributes (if any)
        this.toggleElements('[data-privacy="amount"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="value"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="number"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="transaction"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="email"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="name"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="chart"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="budget"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="investment"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="goal"]', this.isPrivacyMode);
        this.toggleElements('[data-privacy="networth"]', this.isPrivacyMode);
        
        // Update privacy button state
        this.updatePrivacyButton();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('privacyModeChanged', {
            detail: { isPrivacyMode: this.isPrivacyMode }
        }));
        
        console.log('Privacy Mode Applied:', this.isPrivacyMode);
    }

    /**
     * Watch for DOM changes and reapply privacy mode
     */
    watchForChanges() {
        const observer = new MutationObserver(() => {
            if (this.isPrivacyMode) {
                // Reapply privacy mode to newly added elements
                this.autoHideAmounts();
                this.autoHidePercentages();
                this.autoHideEmails();
                this.autoHideCharts();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * Auto-detect and hide amounts (₹ or currency values)
     */
    autoHideAmounts() {
        // Specifically target KPI values
        const kpiValues = document.querySelectorAll('.kpi-value');
        kpiValues.forEach(element => {
            if (this.isPrivacyMode) {
                if (!this.originalValues.has(element)) {
                    this.originalValues.set(element, element.textContent);
                }
                element.textContent = '₹ ••••••';
                element.classList.add('privacy-hidden');
            } else {
                if (this.originalValues.has(element)) {
                    element.textContent = this.originalValues.get(element);
                }
                element.classList.remove('privacy-hidden');
            }
        });

        // Target transaction amounts
        const transactionAmounts = document.querySelectorAll('.transaction-amount, [class*="amount"]');
        transactionAmounts.forEach(element => {
            if (this.isPrivacyMode) {
                if (!this.originalValues.has(element)) {
                    this.originalValues.set(element, element.textContent);
                }
                element.textContent = '₹ ••••••';
                element.classList.add('privacy-hidden');
            } else {
                if (this.originalValues.has(element)) {
                    element.textContent = this.originalValues.get(element);
                }
                element.classList.remove('privacy-hidden');
            }
        });

        // Find all elements containing currency amounts via TreeWalker
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            // Match patterns like ₹50,000 or ₹0 or currency amounts
            if (/₹[\d,]+|₹\d+/.test(node.textContent)) {
                nodesToProcess.push(node);
            }
        }

        nodesToProcess.forEach(node => {
            const parent = node.parentElement;
            if (parent && !parent.classList.contains('privacy-hidden')) {
                if (this.isPrivacyMode) {
                    // Store original value
                    if (!this.originalValues.has(parent)) {
                        this.originalValues.set(parent, node.textContent);
                    }
                    node.textContent = '₹ ••••••';
                    parent.classList.add('privacy-hidden');
                } else {
                    // Restore original value
                    if (this.originalValues.has(parent)) {
                        node.textContent = this.originalValues.get(parent);
                    }
                    parent.classList.remove('privacy-hidden');
                }
            }
        });
    }

    /**
     * Auto-detect and hide percentages
     */
    autoHidePercentages() {
        // Target specific percentage elements
        const percentageElements = document.querySelectorAll(
            '.savings-rate-value, .goal-progress-percent, [class*="percent"], [class*="rate"]'
        );
        
        percentageElements.forEach(element => {
            const text = element.textContent;
            if (/\d+(\.\d+)?%/.test(text)) {
                if (this.isPrivacyMode) {
                    if (!this.originalValues.has(element)) {
                        this.originalValues.set(element, text);
                    }
                    element.textContent = '••%';
                    element.classList.add('privacy-hidden-percent');
                } else {
                    if (this.originalValues.has(element)) {
                        element.textContent = this.originalValues.get(element);
                    }
                    element.classList.remove('privacy-hidden-percent');
                }
            }
        });

        // TreeWalker for other percentage patterns
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            // Match patterns like 25% or 0%
            if (/\d+(\.\d+)?%/.test(node.textContent)) {
                nodesToProcess.push(node);
            }
        }

        nodesToProcess.forEach(node => {
            const parent = node.parentElement;
            if (parent && !parent.classList.contains('privacy-hidden-percent')) {
                if (this.isPrivacyMode) {
                    if (!this.originalValues.has(parent)) {
                        this.originalValues.set(parent, node.textContent);
                    }
                    node.textContent = '••%';
                    parent.classList.add('privacy-hidden-percent');
                } else {
                    if (this.originalValues.has(parent)) {
                        node.textContent = this.originalValues.get(parent);
                    }
                    parent.classList.remove('privacy-hidden-percent');
                }
            }
        });
    }

    /**
     * Auto-detect and hide emails
     */
    autoHideEmails() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            // Match email pattern
            if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(node.textContent)) {
                nodesToProcess.push(node);
            }
        }

        nodesToProcess.forEach(node => {
            const parent = node.parentElement;
            if (parent && !parent.classList.contains('privacy-hidden-email')) {
                if (this.isPrivacyMode) {
                    if (!this.originalValues.has(parent)) {
                        this.originalValues.set(parent, node.textContent);
                    }
                    node.textContent = '••••••••@••••••';
                    parent.classList.add('privacy-hidden-email');
                } else {
                    if (this.originalValues.has(parent)) {
                        node.textContent = this.originalValues.get(parent);
                    }
                    parent.classList.remove('privacy-hidden-email');
                }
            }
        });
    }

    /**
     * Auto-detect and hide charts
     */
    autoHideCharts() {
        const charts = document.querySelectorAll('canvas');
        charts.forEach(canvas => {
            const parent = canvas.parentElement;
            if (parent) {
                if (this.isPrivacyMode) {
                    parent.classList.add('privacy-hidden-chart');
                    canvas.style.opacity = '0.1';
                } else {
                    parent.classList.remove('privacy-hidden-chart');
                    canvas.style.opacity = '1';
                }
            }
        });
    }

    /**
     * Toggle visibility of elements
     */
    toggleElements(selector, hide) {
        document.querySelectorAll(selector).forEach(element => {
            if (hide) {
                element.classList.add('privacy-hidden');
                element.setAttribute('aria-label', 'Hidden for privacy');
            } else {
                element.classList.remove('privacy-hidden');
                element.removeAttribute('aria-label');
            }
        });
    }

    /**
     * Update privacy button appearance
     */
    updatePrivacyButton() {
        const btn = document.getElementById('privacyModeBtn');
        if (btn) {
            if (this.isPrivacyMode) {
                btn.classList.add('active');
                btn.setAttribute('title', 'Privacy Mode: ON - Data Hidden');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('title', 'Privacy Mode: OFF - Data Visible');
                btn.setAttribute('aria-pressed', 'false');
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message = null) {
        const status = this.isPrivacyMode ? 'enabled' : 'disabled';
        const msg = message || `Privacy Mode ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        
        // Try to use existing toast system
        if (window.showToast) {
            window.showToast(msg, this.isPrivacyMode ? 'success' : 'info');
        } else {
            console.log(msg);
        }
    }

    /**
     * Get privacy mode status
     */
    isEnabled() {
        return this.isPrivacyMode;
    }

    /**
     * Format amount for display (respects privacy mode)
     */
    formatAmount(amount) {
        if (this.isPrivacyMode) {
            return '••••••';
        }
        return amount;
    }

    /**
     * Format percentage for display (respects privacy mode)
     */
    formatPercentage(percentage) {
        if (this.isPrivacyMode) {
            return '••%';
        }
        return percentage;
    }

    /**
     * Format email for display (respects privacy mode)
     */
    formatEmail(email) {
        if (this.isPrivacyMode) {
            return '••••••••@••••••';
        }
        return email;
    }

    /**
     * Format name for display (respects privacy mode)
     */
    formatName(name) {
        if (this.isPrivacyMode) {
            return '••••••';
        }
        return name;
    }
}

// Create global instance
const privacyMode = new PrivacyModeManager();

// Export for module usage
export default privacyMode;
