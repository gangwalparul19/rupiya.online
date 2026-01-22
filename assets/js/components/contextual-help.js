// Contextual Help System
// Inline help tooltips and help panel

class ContextualHelp {
  constructor() {
    this.helpContent = {};
    this.activeTooltip = null;
    this.helpPanel = null;
    this.isPanelOpen = false;
    this.loadHelpContent();
  }

  /**
   * Initialize contextual help
   */
  init() {
    this.loadHelpContent();
    this.attachHelpIcons();
    this.createHelpButton();
    this.bindKeyboardShortcut();
  }

  /**
   * Load help content
   */
  loadHelpContent() {
    this.helpContent = {
      // Form field help
      'expense-amount': {
        title: 'Expense Amount',
        content: 'Enter the amount you spent. Use numbers only (e.g., 1500 for ₹1,500).',
        example: 'Example: 1500'
      },
      'expense-category': {
        title: 'Category',
        content: 'Choose the category that best describes this expense. This helps track spending patterns.',
        example: 'Common: Food, Transport, Shopping'
      },
      'expense-date': {
        title: 'Date',
        content: 'When did this expense occur? Defaults to today.',
        example: 'Format: DD/MM/YYYY'
      },
      'expense-description': {
        title: 'Description',
        content: 'Add a brief note about this expense (optional but recommended).',
        example: 'Example: Grocery shopping at Big Bazaar'
      },
      'expense-payment-method': {
        title: 'Payment Method',
        content: 'How did you pay? This helps track which accounts you\'re using.',
        example: 'Cash, Credit Card, UPI, etc.'
      },
      'budget-limit': {
        title: 'Budget Limit',
        content: 'Set a monthly spending limit for this category. You\'ll get alerts when approaching this limit.',
        example: 'Example: 10000 for ₹10,000/month'
      },
      'budget-period': {
        title: 'Budget Period',
        content: 'Choose how often this budget resets. Monthly is most common.',
        example: 'Options: Monthly, Weekly, Yearly'
      },
      'goal-target': {
        title: 'Target Amount',
        content: 'How much do you want to save? Set a realistic goal.',
        example: 'Example: 100000 for ₹1 lakh'
      },
      'goal-deadline': {
        title: 'Target Date',
        content: 'When do you want to achieve this goal? Having a deadline helps stay motivated.',
        example: 'Example: 6 months from now'
      },
      'income-source': {
        title: 'Income Source',
        content: 'Where did this money come from? Track different income streams.',
        example: 'Salary, Freelance, Investment, etc.'
      },

      // Feature help
      'dashboard': {
        title: 'Dashboard Overview',
        content: 'Your financial snapshot showing income, expenses, savings rate, and trends. Check this daily to stay on track.',
        tips: [
          'Green numbers mean you\'re doing well',
          'Red numbers need attention',
          'Click charts for detailed breakdowns'
        ]
      },
      'expenses': {
        title: 'Expense Tracking',
        content: 'Record every expense to understand where your money goes. The more detailed, the better insights you\'ll get.',
        tips: [
          'Add expenses as soon as you spend',
          'Use categories consistently',
          'Add notes for future reference'
        ]
      },
      'budgets': {
        title: 'Budget Management',
        content: 'Set spending limits for different categories. Budgets help control expenses and save more.',
        tips: [
          'Start with major categories',
          'Review and adjust monthly',
          'Use alerts to stay on track'
        ]
      },
      'goals': {
        title: 'Financial Goals',
        content: 'Set savings targets for things you want to achieve. Track progress and stay motivated.',
        tips: [
          'Make goals specific and measurable',
          'Set realistic deadlines',
          'Celebrate milestones'
        ]
      },
      'analytics': {
        title: 'Analytics & Reports',
        content: 'Visualize your spending patterns, trends, and financial health with interactive charts.',
        tips: [
          'Compare different time periods',
          'Identify spending patterns',
          'Export reports for records'
        ]
      }
    };
  }

  /**
   * Attach help icons to form fields
   */
  attachHelpIcons() {
    // Find all form fields with data-help attribute
    const fields = document.querySelectorAll('[data-help]');

    fields.forEach(field => {
      const helpKey = field.getAttribute('data-help');
      if (!this.helpContent[helpKey]) return;

      // Create help icon
      const helpIcon = document.createElement('span');
      helpIcon.className = 'help-icon';
      helpIcon.innerHTML = '?';
      helpIcon.setAttribute('data-help-key', helpKey);
      helpIcon.setAttribute('role', 'button');
      helpIcon.setAttribute('aria-label', 'Show help');
      helpIcon.setAttribute('tabindex', '0');

      // Insert after field or label
      const label = field.closest('.form-group')?.querySelector('label');
      if (label) {
        label.appendChild(helpIcon);
      } else {
        field.parentNode.insertBefore(helpIcon, field.nextSibling);
      }

      // Bind events
      helpIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showTooltip(helpKey, helpIcon);
      });

      helpIcon.addEventListener('mouseenter', () => {
        this.showTooltip(helpKey, helpIcon);
      });

      helpIcon.addEventListener('mouseleave', () => {
        setTimeout(() => this.hideTooltip(), 300);
      });

      // Keyboard support
      helpIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.showTooltip(helpKey, helpIcon);
        }
      });
    });
  }

  /**
   * Show tooltip for help content
   */
  showTooltip(helpKey, anchor) {
    const content = this.helpContent[helpKey];
    if (!content) return;

    // Remove existing tooltip
    this.hideTooltip();

    // Create tooltip
    this.activeTooltip = document.createElement('div');
    this.activeTooltip.className = 'help-tooltip';
    this.activeTooltip.innerHTML = `
      <div class="help-tooltip-header">
        <h4 class="help-tooltip-title">${content.title}</h4>
        <button class="help-tooltip-close" aria-label="Close">×</button>
      </div>
      <div class="help-tooltip-content">
        <p>${content.content}</p>
        ${content.example ? `<div class="help-tooltip-example">💡 ${content.example}</div>` : ''}
        ${content.tips ? `
          <div class="help-tooltip-tips">
            <strong>Tips:</strong>
            <ul>
              ${content.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(this.activeTooltip);

    // Position tooltip
    this.positionTooltip(anchor);

    // Bind close button
    const closeBtn = this.activeTooltip.querySelector('.help-tooltip-close');
    closeBtn.addEventListener('click', () => this.hideTooltip());

    // Keep tooltip open on hover
    this.activeTooltip.addEventListener('mouseenter', () => {
      clearTimeout(this.hideTimeout);
    });

    this.activeTooltip.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  /**
   * Position tooltip near anchor
   */
  positionTooltip(anchor) {
    const rect = anchor.getBoundingClientRect();
    const tooltipRect = this.activeTooltip.getBoundingClientRect();
    const spacing = 8;

    let top = rect.bottom + window.scrollY + spacing;
    let left = rect.left + window.scrollX - (tooltipRect.width / 2) + (rect.width / 2);

    // Keep within viewport
    const maxLeft = window.innerWidth - tooltipRect.width - 20;
    const maxTop = window.innerHeight + window.scrollY - tooltipRect.height - 20;

    left = Math.max(20, Math.min(left, maxLeft));

    // If tooltip goes below viewport, show above
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - tooltipRect.height - spacing;
      this.activeTooltip.classList.add('position-top');
    }

    this.activeTooltip.style.top = top + 'px';
    this.activeTooltip.style.left = left + 'px';
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
  }

  /**
   * Create floating help button
   */
  createHelpButton() {
    const helpBtn = document.createElement('button');
    helpBtn.className = 'help-button';
    helpBtn.id = 'helpButton';
    helpBtn.innerHTML = '?';
    helpBtn.setAttribute('aria-label', 'Open help panel');
    helpBtn.setAttribute('title', 'Help (Shift + ?)');

    document.body.appendChild(helpBtn);

    helpBtn.addEventListener('click', () => this.toggleHelpPanel());
  }

  /**
   * Toggle help panel
   */
  toggleHelpPanel() {
    if (this.isPanelOpen) {
      this.closeHelpPanel();
    } else {
      this.openHelpPanel();
    }
  }

  /**
   * Open help panel
   */
  openHelpPanel() {
    if (this.isPanelOpen) return;

    const page = this.getCurrentPage();
    const pageHelp = this.helpContent[page] || {};

    this.helpPanel = document.createElement('div');
    this.helpPanel.className = 'help-panel';
    this.helpPanel.id = 'helpPanel';

    this.helpPanel.innerHTML = `
      <div class="help-panel-header">
        <h3 class="help-panel-title">📚 Help & Guide</h3>
        <button class="help-panel-close" id="helpPanelClose" aria-label="Close help panel">×</button>
      </div>
      <div class="help-panel-content">
        ${pageHelp.title ? `
          <div class="help-panel-section">
            <h4>${pageHelp.title}</h4>
            <p>${pageHelp.content}</p>
            ${pageHelp.tips ? `
              <div class="help-panel-tips">
                <strong>💡 Quick Tips:</strong>
                <ul>
                  ${pageHelp.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="help-panel-section">
          <h4>🔍 Quick Actions</h4>
          <div class="help-panel-actions">
            <button class="help-panel-action-btn" id="startTourBtn">
              <span class="help-panel-action-icon">🎯</span>
              <span class="help-panel-action-text">
                <strong>Start Interactive Tour</strong>
                <small>Guided walkthrough of features</small>
              </span>
            </button>
            <button class="help-panel-action-btn" id="viewGuideBtn">
              <span class="help-panel-action-icon">📖</span>
              <span class="help-panel-action-text">
                <strong>View User Guide</strong>
                <small>Complete documentation</small>
              </span>
            </button>
            <button class="help-panel-action-btn" id="contactSupportBtn">
              <span class="help-panel-action-icon">💬</span>
              <span class="help-panel-action-text">
                <strong>Contact Support</strong>
                <small>Get help from our team</small>
              </span>
            </button>
          </div>
        </div>

        <div class="help-panel-section">
          <h4>⌨️ Keyboard Shortcuts</h4>
          <div class="help-panel-shortcuts">
            <div class="help-panel-shortcut">
              <kbd>Shift</kbd> + <kbd>?</kbd>
              <span>Toggle help panel</span>
            </div>
            <div class="help-panel-shortcut">
              <kbd>Esc</kbd>
              <span>Close dialogs</span>
            </div>
            <div class="help-panel-shortcut">
              <kbd>Ctrl</kbd> + <kbd>N</kbd>
              <span>New expense (on expenses page)</span>
            </div>
          </div>
        </div>

        <div class="help-panel-section">
          <h4>🔗 Helpful Links</h4>
          <ul class="help-panel-links">
            <li><a href="user-guide.html" target="_blank">Complete User Guide</a></li>
            <li><a href="features.html" target="_blank">All Features</a></li>
            <li><a href="feedback.html" target="_blank">Send Feedback</a></li>
            <li><a href="privacy-policy.html" target="_blank">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(this.helpPanel);
    this.isPanelOpen = true;

    // Animate in
    setTimeout(() => this.helpPanel.classList.add('open'), 10);

    // Bind events
    this.bindHelpPanelEvents();
  }

  /**
   * Close help panel
   */
  closeHelpPanel() {
    if (!this.isPanelOpen || !this.helpPanel) return;

    this.helpPanel.classList.remove('open');
    setTimeout(() => {
      if (this.helpPanel) {
        this.helpPanel.remove();
        this.helpPanel = null;
      }
    }, 300);

    this.isPanelOpen = false;
  }

  /**
   * Bind help panel events
   */
  bindHelpPanelEvents() {
    const closeBtn = document.getElementById('helpPanelClose');
    const startTourBtn = document.getElementById('startTourBtn');
    const viewGuideBtn = document.getElementById('viewGuideBtn');
    const contactSupportBtn = document.getElementById('contactSupportBtn');

    closeBtn?.addEventListener('click', () => this.closeHelpPanel());

    startTourBtn?.addEventListener('click', () => {
      this.closeHelpPanel();
      // Start product tour
      if (window.productTour) {
        const page = this.getCurrentPage();
        window.productTour.startTour(page);
      }
    });

    viewGuideBtn?.addEventListener('click', () => {
      window.open('user-guide.html', '_blank');
    });

    contactSupportBtn?.addEventListener('click', () => {
      window.location.href = 'feedback.html';
    });

    // Close on overlay click
    this.helpPanel.addEventListener('click', (e) => {
      if (e.target === this.helpPanel) {
        this.closeHelpPanel();
      }
    });
  }

  /**
   * Bind keyboard shortcut (Shift + ?)
   */
  bindKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      // Shift + ? (Shift + /)
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        this.toggleHelpPanel();
      }

      // Escape to close
      if (e.key === 'Escape') {
        this.closeHelpPanel();
        this.hideTooltip();
      }
    });
  }

  /**
   * Get current page name
   */
  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('expenses')) return 'expenses';
    if (path.includes('income')) return 'income';
    if (path.includes('budgets')) return 'budgets';
    if (path.includes('goals')) return 'goals';
    if (path.includes('analytics')) return 'analytics';
    return 'dashboard';
  }

  /**
   * Add help to specific element
   */
  addHelp(element, helpKey) {
    element.setAttribute('data-help', helpKey);
    this.attachHelpIcons();
  }
}

// Create and export singleton instance
const contextualHelp = new ContextualHelp();
export default contextualHelp;
