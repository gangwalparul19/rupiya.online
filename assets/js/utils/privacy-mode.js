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
        
        // ADD BODY CLASS IMMEDIATELY - BEFORE ANYTHING ELSE
        this._addPrivacySettingsPageClass();
        
        this.init();
    }

    /**
     * Add privacy-settings-page class to body IMMEDIATELY
     * This must happen before any CSS is applied
     */
    _addPrivacySettingsPageClass() {
        const pathname = window.location.pathname.toLowerCase();
        const href = window.location.href.toLowerCase();
        const isPrivacyPage = pathname.includes('privacy-settings') || 
                              href.includes('privacy-settings');
        
        if (isPrivacyPage) {
            document.body.classList.add('privacy-settings-page');
        }
    }

    /**
     * Initialize privacy mode from localStorage
     */
    init() {
        const saved = localStorage.getItem(this.storageKey);
        this.isPrivacyMode = saved === 'true';
        
        // Check if on privacy-settings page early and add body class
        const isPrivacyPage = this._isPrivacySettingsPage();
        
        // Start watching for DOM changes (but not on privacy-settings page)
        if (!isPrivacyPage) {
            this.watchForChanges();
        }
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Re-check and add body class after DOM is ready
                this._isPrivacySettingsPage();
                // Add small delay to ensure all elements are rendered
                setTimeout(() => this.applyPrivacyMode(), 200);
            });
        } else {
            // Re-check and add body class
            this._isPrivacySettingsPage();
            // Add small delay to ensure all elements are rendered
            setTimeout(() => this.applyPrivacyMode(), 200);
        }
    }

    /**
     * Check if current page is privacy-settings page
     * More robust check for mobile and different URL formats
     */
    _isPrivacySettingsPage() {
        const pathname = window.location.pathname.toLowerCase();
        const href = window.location.href.toLowerCase();
        const isPrivacyPage = pathname.includes('privacy-settings') || 
                              href.includes('privacy-settings') ||
                              document.body.classList.contains('privacy-settings-page');
        
        // Add body class for CSS targeting if on privacy settings page
        if (isPrivacyPage && !document.body.classList.contains('privacy-settings-page')) {
            document.body.classList.add('privacy-settings-page');
        }
        
        // Remove privacy-settings-page class if NOT on privacy settings page
        if (!isPrivacyPage && document.body.classList.contains('privacy-settings-page')) {
            document.body.classList.remove('privacy-settings-page');
        }
        
        return isPrivacyPage;
    }

    /**
     * Remove all privacy mode effects from the page
     * Used on privacy-settings page to ensure users can interact
     */
    _removeAllPrivacyEffects() {
        // Remove privacy-hidden class from all elements
        document.querySelectorAll('.privacy-hidden').forEach(el => {
            el.classList.remove('privacy-hidden');
        });
        
        document.querySelectorAll('.privacy-hidden-chart').forEach(el => {
            el.classList.remove('privacy-hidden-chart');
        });
        
        document.querySelectorAll('.privacy-blur').forEach(el => {
            el.classList.remove('privacy-blur');
        });
        
        // Restore canvas elements
        document.querySelectorAll('canvas').forEach(canvas => {
            canvas.style.opacity = '1';
            canvas.style.pointerEvents = 'auto';
        });
        
        // Ensure all interactive elements are clickable
        document.querySelectorAll('button, input, select, textarea, a, .privacy-toggle, .btn').forEach(el => {
            el.style.pointerEvents = 'auto';
        });
    }

    /**
     * Ensure privacy settings page is fully interactive
     * Removes any CSS or JS blocks that might prevent interaction
     */
    _ensurePrivacySettingsPageInteractive() {
        // Force pointer-events on all interactive elements
        const interactiveSelectors = [
            'button', 'input', 'select', 'textarea', 'a',
            '.privacy-toggle', '.btn', '.privacy-setting-item',
            '.privacy-settings-panel', '.main-content', '.page-container',
            '.sidebar', '.sidebar-overlay', '.mobile-header', '.dashboard-layout'
        ];
        
        interactiveSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.pointerEvents = 'auto !important';
                el.style.opacity = '1 !important';
                el.style.filter = 'none !important';
            });
        });
        
        // Ensure body and main content are not blocked
        document.body.style.pointerEvents = 'auto !important';
        document.body.style.opacity = '1 !important';
        document.body.style.filter = 'none !important';
        
        // Ensure sidebar overlay doesn't block interaction
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.style.pointerEvents = 'auto !important';
            sidebarOverlay.style.opacity = '1 !important';
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
        // Skip privacy mode on admin.html and privacy-settings page
        const pathname = window.location.pathname.toLowerCase();
        const href = window.location.href.toLowerCase();
        const isAdminPage = pathname.includes('admin') || href.includes('admin');
        
        if (isAdminPage) {
            return;
        }
        
        // Skip applying privacy mode effects on privacy-settings page
        // Users need to be able to interact with this page to disable privacy mode
        if (this._isPrivacySettingsPage()) {
            // Remove any privacy mode effects that might have been applied
            this._removeAllPrivacyEffects();
            
            // Ensure all interactive elements are clickable
            this._ensurePrivacySettingsPageInteractive();
            
            // Only update the button state and dispatch event, don't hide content
            this.updatePrivacyButton();
            window.dispatchEvent(new CustomEvent('privacyModeChanged', {
                detail: { isPrivacyMode: this.isPrivacyMode }
            }));
            return;
        }
        
        // Hide KPI cards and their values
        this.hideKPICards();
        
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
        
        // Ensure sidebar and mobile elements remain interactive
        this._ensureUIElementsInteractive();
        
        // Update privacy button state
        this.updatePrivacyButton();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('privacyModeChanged', {
            detail: { isPrivacyMode: this.isPrivacyMode }
        }));
    }

    /**
     * Ensure UI elements (sidebar, buttons, etc.) remain interactive
     * This prevents the page from becoming unresponsive on mobile
     */
    _ensureUIElementsInteractive() {
        // Ensure sidebar and overlay remain interactive
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const mobileHeader = document.querySelector('.mobile-header');
        
        if (sidebar) {
            sidebar.style.pointerEvents = 'auto';
            sidebar.style.opacity = '1';
        }
        
        if (sidebarOverlay) {
            sidebarOverlay.style.pointerEvents = 'auto';
            sidebarOverlay.style.opacity = '1';
        }
        
        if (mobileHeader) {
            mobileHeader.style.pointerEvents = 'auto';
            mobileHeader.style.opacity = '1';
        }
        
        // Ensure all buttons are clickable
        document.querySelectorAll('button, .btn, .sidebar-toggle').forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        });
    }

    /**
     * Hide KPI cards and their values
     */
    hideKPICards() {
        // Hide all KPI card values
        const kpiCards = document.querySelectorAll('.kpi-card, [class*="kpi"]');
        kpiCards.forEach(card => {
            // Find all value elements within the card
            const values = card.querySelectorAll(
                '.kpi-value, .value, .amount, .balance, .total, ' +
                '[class*="value"], [class*="amount"], [class*="balance"], [class*="total"]'
            );
            
            values.forEach(element => {
                if (this.isPrivacyMode) {
                    // Store original value
                    if (!this.originalValues.has(element)) {
                        this.originalValues.set(element, element.textContent);
                    }
                    
                    // Replace with masked value
                    const text = element.textContent.trim();
                    let maskedValue = '₹ ••••••';
                    
                    // Check if it's a percentage
                    if (/\d+(\.\d+)?%/.test(text)) {
                        maskedValue = '••%';
                    }
                    // Check if it's an email
                    else if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
                        maskedValue = '••••••••@••••••';
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
            });
            
            // Also hide card labels/titles that might contain sensitive info
            const labels = card.querySelectorAll('.kpi-label, .label, .title, [class*="label"]');
            labels.forEach(label => {
                const text = label.textContent.trim();
                // Only hide if it contains financial keywords
                if (/balance|total|amount|income|expense|savings|net worth|portfolio/i.test(text)) {
                    if (this.isPrivacyMode) {
                        if (!this.originalValues.has(label)) {
                            this.originalValues.set(label, label.textContent);
                        }
                        label.classList.add('privacy-hidden-label');
                    } else {
                        label.classList.remove('privacy-hidden-label');
                    }
                }
            });
        });
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

        // Specifically target summary values (budget cards, etc.)
        const summaryValues = document.querySelectorAll('.summary-value');
        summaryValues.forEach(element => {
            this.hideElement(element, 'amount');
        });

        // Specifically target AI insights stat values
        const aiStatValues = document.querySelectorAll('.ai-stat-value');
        aiStatValues.forEach(element => {
            this.hideElement(element, 'amount');
        });

        // Specifically target AI insights score numbers
        const scoreNumbers = document.querySelectorAll('.score-number');
        scoreNumbers.forEach(element => {
            if (this.isPrivacyMode) {
                if (!this.originalValues.has(element)) {
                    this.originalValues.set(element, element.textContent);
                }
                element.textContent = '••';
                element.classList.add('privacy-hidden');
            } else {
                if (this.originalValues.has(element)) {
                    element.textContent = this.originalValues.get(element);
                }
                element.classList.remove('privacy-hidden');
            }
        });

        // Target transaction amounts (income and expense cards)
        const transactionAmounts = document.querySelectorAll(
            '.income-amount, .expense-amount, .transaction-amount, .bill-amount, .detail-value, ' +
            '.amount, .price, .balance, .total, .value, ' +
            '[class*="amount"], [class*="price"], [class*="balance"], [class*="total"], [class*="value"]'
        );
        transactionAmounts.forEach(element => {
            // Skip if already processed
            if (element.dataset.privacyProcessed === 'true') return;
            
            const text = element.textContent.trim();
            // Check if element contains currency symbol or numbers that look like amounts
            if (/₹[\d,]+|₹\d+|\$[\d,]+|\$\d+|[\d,]+\.\d{2}/.test(text)) {
                this.hideElement(element, 'amount');
                element.dataset.privacyProcessed = 'true';
            }
        });

        // Find text nodes containing currency amounts in common containers
        this.hideTextNodesWithPattern(/₹[\d,]+|₹\d+/, 'amount');
    }

    /**
     * Auto-detect and hide percentages
     */
    autoHidePercentages() {
        // Target specific percentage elements
        const percentageElements = document.querySelectorAll(
            '.savings-rate-value, .goal-progress-percent, .factor-value, [class*="percent"], [class*="rate"]'
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
                    // DO NOT disable pointer-events on canvas - it blocks the entire page on mobile
                    // canvas.style.pointerEvents = 'none';
                } else {
                    parent.classList.remove('privacy-hidden-chart');
                    canvas.style.opacity = '1';
                    // canvas.style.pointerEvents = 'auto';
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
            
            // Make element visible after masking
            element.style.visibility = 'visible';
            element.style.opacity = '1';
        } else {
            // Restore original value
            if (this.originalValues.has(element)) {
                element.textContent = this.originalValues.get(element);
            }
            element.classList.remove('privacy-hidden');
            
            // Ensure element is visible
            element.style.visibility = 'visible';
            element.style.opacity = '1';
        }
    }

    /**
     * Hide text nodes matching a pattern
     */
    hideTextNodesWithPattern(pattern, type = 'amount') {
        // Expand containers to include all common financial data containers
        const containers = document.querySelectorAll(
            '.kpi-card, .transaction-item, .card-body, .dashboard-header, .widgets-row, ' +
            '.card, .transaction, .expense-card, .income-card, .bill-card, ' +
            '[class*="card"], [class*="transaction"], [class*="expense"], [class*="income"], ' +
            '.main-content, .page-container'
        );
        
        if (containers.length === 0) {
            // If no specific containers found, scan the entire body
            containers.push(document.body);
        }
        
        containers.forEach(container => {
            if (!container) return;
            
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const nodesToProcess = [];
            let node;
            while (node = walker.nextNode()) {
                // Skip if already processed
                if (node.parentElement?.dataset.privacyProcessed === 'true') continue;
                
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
                    parent.dataset.privacyProcessed = 'true';
                } else {
                    // Restore original value
                    if (this.originalValues.has(parent)) {
                        node.textContent = this.originalValues.get(parent);
                    }
                    parent.classList.remove('privacy-hidden');
                    parent.dataset.privacyProcessed = 'false';
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
                // Skip on privacy-settings page and admin page
                const pathname = window.location.pathname.toLowerCase();
                const href = window.location.href.toLowerCase();
                const isAdminPage = pathname.includes('admin') || href.includes('admin');
                const isPrivacySettingsPage = pathname.includes('privacy-settings');
                
                if (isAdminPage || isPrivacySettingsPage) return;
                
                if (this.isPrivacyMode) {
                    // Reapply privacy mode to newly added elements
                    this.hideKPICards();
                    this.autoHideAmounts();
                    this.autoHidePercentages();
                    this.autoHideEmails();
                    this.autoHideCharts();
                    this.hideTooltips();
                    this.hideTransactionDescriptions();
                }
            }, 300); // Reduced debounce time for faster response
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true, // Also watch for text changes
            attributes: true,
            attributeFilter: ['title', 'data-tooltip', 'aria-label', 'class']
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
