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
                setTimeout(() => this.applyPrivacyMode(), 100);
            });
        } else {
            setTimeout(() => this.applyPrivacyMode(), 100);
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
        console.log('Applying Privacy Mode:', this.isPrivacyMode);
        
        // Skip applying privacy mode effects on privacy-settings page
        // Users need to be able to interact with this page to disable privacy mode
        const isPrivacySettingsPage = window.location.pathname.includes('privacy-settings');
        if (isPrivacySettingsPage && this.isPrivacyMode) {
            // Only update the button state and dispatch event, don't hide content
            this.updatePrivacyButton();
            window.dispatchEvent(new CustomEvent('privacyModeChanged', {
                detail: { isPrivacyMode: this.isPrivacyMode }
            }));
            console.log('Privacy Mode: Skipping content hiding on privacy-settings page');
            return;
        }
        
        // Auto-detect and hide KPI values (numbers with ₹ or currency)
        this.autoHideAmounts();
        
        // Auto-detect and hide percentages
        this.autoHidePercentages();
        
        // Auto-detect and hide emails
        this.autoHideEmails();
        
        // Auto-detect and hide charts
        this.autoHideCharts();
        
        // Hide transaction descriptions
        this.hideTransactionDescriptions();
        
        // Hide tooltips with financial data
        this.hideTooltips();
        
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
     * Hide transaction descriptions
     */
    hideTransactionDescriptions() {
        // Hide income descriptions
        const incomeDescriptions = document.querySelectorAll('.income-description');
        incomeDescriptions.forEach(element => {
            if (this.isPrivacyMode) {
                if (!this.originalValues.has(element)) {
                    this.originalValues.set(element, element.textContent);
                }
                element.textContent = '••••••••••';
                element.classList.add('privacy-hidden');
            } else {
                if (this.originalValues.has(element)) {
                    element.textContent = this.originalValues.get(element);
                }
                element.classList.remove('privacy-hidden');
            }
        });

        // Hide expense descriptions
        const expenseDescriptions = document.querySelectorAll('.expense-description');
        expenseDescriptions.forEach(element => {
            if (this.isPrivacyMode) {
                if (!this.originalValues.has(element)) {
                    this.originalValues.set(element, element.textContent);
                }
                element.textContent = '••••••••••';
                element.classList.add('privacy-hidden');
            } else {
                if (this.originalValues.has(element)) {
                    element.textContent = this.originalValues.get(element);
                }
                element.classList.remove('privacy-hidden');
            }
        });
    }

    /**
     * Auto-detect and hide amounts (₹ or currency values)
     */
    autoHideAmounts() {
        // Specifically target KPI values
        const kpiValues = document.querySelectorAll('.kpi-value');
        kpiValues.forEach(element => {
            this.hideElement(element, 'amount');
        });

        // Target transaction amounts (income and expense cards)
        const transactionAmounts = document.querySelectorAll(
            '.income-amount, .expense-amount, .transaction-amount, .bill-amount, .detail-value'
        );
        transactionAmounts.forEach(element => {
            this.hideElement(element, 'amount');
        });

        // Find text nodes containing currency amounts (limited scope)
        this.hideTextNodesWithPattern(/₹[\d,]+|₹\d+/, 'amount');
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
            const text = element.textContent.trim();
            if (/\d+(\.\d+)?%/.test(text)) {
                this.hideElement(element, 'percent');
            }
        });

        // Find all text nodes containing percentages
        this.hideTextNodesWithPattern(/\d+(\.\d+)?%/, 'percent');
    }

    /**
     * Auto-detect and hide emails
     */
    autoHideEmails() {
        // Find all text nodes containing emails
        this.hideTextNodesWithPattern(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
            'email'
        );
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
                    // Disable pointer events to prevent hover tooltips
                    canvas.style.pointerEvents = 'none';
                } else {
                    parent.classList.remove('privacy-hidden-chart');
                    canvas.style.opacity = '1';
                    canvas.style.pointerEvents = 'auto';
                }
            }
        });
        
        // Disable Chart.js tooltips when privacy mode is enabled
        this.disableChartTooltips();
    }

    /**
     * Disable Chart.js tooltips when privacy mode is enabled
     */
    disableChartTooltips() {
        // Check if Chart.js is available
        if (typeof Chart !== 'undefined') {
            // Get all Chart.js instances
            const chartInstances = Object.values(Chart.instances || {});
            chartInstances.forEach(chart => {
                if (chart && chart.options && chart.options.plugins) {
                    if (this.isPrivacyMode) {
                        // Store original tooltip state
                        if (!chart._privacyOriginalTooltip) {
                            chart._privacyOriginalTooltip = chart.options.plugins.tooltip?.enabled !== false;
                        }
                        // Disable tooltips
                        if (chart.options.plugins.tooltip) {
                            chart.options.plugins.tooltip.enabled = false;
                        }
                    } else {
                        // Restore original tooltip state
                        if (chart.options.plugins.tooltip && chart._privacyOriginalTooltip !== undefined) {
                            chart.options.plugins.tooltip.enabled = chart._privacyOriginalTooltip;
                        }
                    }
                    // Update the chart to apply changes
                    chart.update('none');
                }
            });
        }
    }

    /**
     * Hide tooltips containing financial data
     */
    hideTooltips() {
        // Create a unique key for storing tooltip values
        const tooltipKey = 'tooltip_';
        
        // Hide title attributes (browser tooltips)
        const elementsWithTitle = document.querySelectorAll('[title]');
        elementsWithTitle.forEach(element => {
            const title = element.getAttribute('title');
            if (title && /₹[\d,]+|₹\d+|\d+%|\d+,\d+/.test(title)) {
                const key = tooltipKey + 'title_' + Math.random();
                if (this.isPrivacyMode) {
                    if (!this.originalValues.has(key)) {
                        this.originalValues.set(key, title);
                        element.dataset.privacyTooltipKey = key;
                    }
                    element.setAttribute('title', 'Hidden for privacy');
                } else {
                    const storedKey = element.dataset.privacyTooltipKey;
                    if (storedKey && this.originalValues.has(storedKey)) {
                        element.setAttribute('title', this.originalValues.get(storedKey));
                    }
                }
            }
        });

        // Hide data-tooltip attributes
        const elementsWithDataTooltip = document.querySelectorAll('[data-tooltip]');
        elementsWithDataTooltip.forEach(element => {
            const tooltip = element.getAttribute('data-tooltip');
            if (tooltip && /₹[\d,]+|₹\d+|\d+%|\d+,\d+/.test(tooltip)) {
                const key = tooltipKey + 'data_' + Math.random();
                if (this.isPrivacyMode) {
                    if (!this.originalValues.has(key)) {
                        this.originalValues.set(key, tooltip);
                        element.dataset.privacyDataTooltipKey = key;
                    }
                    element.setAttribute('data-tooltip', 'Hidden for privacy');
                } else {
                    const storedKey = element.dataset.privacyDataTooltipKey;
                    if (storedKey && this.originalValues.has(storedKey)) {
                        element.setAttribute('data-tooltip', this.originalValues.get(storedKey));
                    }
                }
            }
        });

        // Hide aria-label attributes with financial data
        const elementsWithAriaLabel = document.querySelectorAll('[aria-label]');
        elementsWithAriaLabel.forEach(element => {
            const label = element.getAttribute('aria-label');
            if (label && /₹[\d,]+|₹\d+|\d+%|\d+,\d+/.test(label)) {
                const key = tooltipKey + 'aria_' + Math.random();
                if (this.isPrivacyMode) {
                    if (!this.originalValues.has(key)) {
                        this.originalValues.set(key, label);
                        element.dataset.privacyAriaLabelKey = key;
                    }
                    element.setAttribute('aria-label', 'Hidden for privacy');
                } else {
                    const storedKey = element.dataset.privacyAriaLabelKey;
                    if (storedKey && this.originalValues.has(storedKey)) {
                        element.setAttribute('aria-label', this.originalValues.get(storedKey));
                    }
                }
            }
        });
    }

    /**
     * Hide element by replacing its content
     */
    hideElement(element, type = 'amount') {
        if (!element) return;

        if (this.isPrivacyMode) {
            // Store original value
            if (!this.originalValues.has(element)) {
                this.originalValues.set(element, element.textContent);
            }
            
            // Replace with masked value
            let maskedValue = '••••••';
            if (type === 'percent') {
                maskedValue = '••%';
            } else if (type === 'email') {
                maskedValue = '••••••••@••••••';
            } else if (type === 'amount') {
                maskedValue = '₹ ••••••';
            }
            
            element.textContent = maskedValue;
            element.classList.add('privacy-hidden');
        } else {
            // Restore original value
            if (this.originalValues.has(element)) {
                element.textContent = this.originalValues.get(element);
            }
            element.classList.remove('privacy-hidden');
        }
    }

    /**
     * Hide text nodes matching a pattern
     */
    hideTextNodesWithPattern(pattern, type = 'amount') {
        // Limit to specific containers to avoid scanning entire DOM
        const containers = document.querySelectorAll(
            '.kpi-card, .transaction-item, .card-body, .dashboard-header, .widgets-row'
        );
        
        containers.forEach(container => {
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const nodesToProcess = [];
            let node;
            while (node = walker.nextNode()) {
                if (pattern.test(node.textContent)) {
                    nodesToProcess.push(node);
                }
            }

            nodesToProcess.forEach(node => {
                const parent = node.parentElement;
                if (!parent) return;

                if (this.isPrivacyMode) {
                    // Store original value
                    if (!this.originalValues.has(parent)) {
                        this.originalValues.set(parent, node.textContent);
                    }
                    
                    // Replace with masked value
                    let maskedValue = '••••••';
                    if (type === 'percent') {
                        maskedValue = '••%';
                    } else if (type === 'email') {
                        maskedValue = '••••••••@••••••';
                    } else if (type === 'amount') {
                        maskedValue = '₹ ••••••';
                    }
                    
                    node.textContent = maskedValue;
                    parent.classList.add('privacy-hidden');
                } else {
                    // Restore original value
                    if (this.originalValues.has(parent)) {
                        node.textContent = this.originalValues.get(parent);
                    }
                    parent.classList.remove('privacy-hidden');
                }
            });
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
     * When privacy mode is ON, hide the toggle button (can only disable from settings)
     */
    updatePrivacyButton() {
        const btn = document.getElementById('privacyModeBtn');
        const dashboardBtn = document.getElementById('privacyModeBtnDashboard');
        
        const buttons = [btn, dashboardBtn].filter(b => b !== null);
        
        buttons.forEach(button => {
            if (this.isPrivacyMode) {
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
     * Watch for DOM changes and reapply privacy mode
     */
    watchForChanges() {
        // Debounce to avoid excessive reapplication
        let debounceTimer;
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Skip on privacy-settings page
                const isPrivacySettingsPage = window.location.pathname.includes('privacy-settings');
                if (isPrivacySettingsPage) return;
                
                if (this.isPrivacyMode) {
                    // Reapply privacy mode to newly added elements
                    this.autoHideAmounts();
                    this.autoHidePercentages();
                    this.autoHideEmails();
                    this.autoHideCharts();
                    this.hideTooltips();
                }
            }, 500);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false,
            attributes: true,
            attributeFilter: ['title', 'data-tooltip', 'aria-label']
        });
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
            return '₹ ••••••';
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
