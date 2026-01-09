// Contextual Help Service
// Manages tooltips, help center, and contextual assistance

class ContextualHelpService {
  constructor() {
    this.tooltips = new Map();
    this.helpArticles = [];
    this.faqItems = [];
    this.init();
  }

  /**
   * Initialize contextual help service
   */
  init() {
    this.setupTooltips();
    this.setupHelpCenter();
    this.setupFAQ();
  }

  /**
   * Setup tooltips on page
   */
  setupTooltips() {
    const helpIcons = document.querySelectorAll('.help-icon');
    helpIcons.forEach(icon => {
      const tooltipText = icon.getAttribute('data-tooltip');
      const tooltipTitle = icon.getAttribute('data-tooltip-title');
      const position = icon.getAttribute('data-tooltip-position') || 'top';

      if (tooltipText) {
        this.createTooltip(icon, tooltipText, tooltipTitle, position);
      }
    });
  }

  /**
   * Create tooltip for element
   */
  createTooltip(element, content, title = '', position = 'top') {
    const container = document.createElement('div');
    container.className = 'tooltip-container';

    const tooltip = document.createElement('div');
    tooltip.className = `tooltip ${position}`;

    let tooltipHTML = '';
    if (title) {
      tooltipHTML += `<div class="tooltip-title">${this.escapeHtml(title)}</div>`;
    }
    tooltipHTML += `<p class="tooltip-content">${this.escapeHtml(content)}</p>`;

    tooltip.innerHTML = tooltipHTML;

    element.addEventListener('mouseenter', () => {
      tooltip.classList.add('show');
    });

    element.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });

    element.addEventListener('focus', () => {
      tooltip.classList.add('show');
    });

    element.addEventListener('blur', () => {
      tooltip.classList.remove('show');
    });

    element.parentElement.insertBefore(tooltip, element.nextSibling);
    this.tooltips.set(element, tooltip);
  }

  /**
   * Show tooltip programmatically
   */
  showTooltip(element) {
    const tooltip = this.tooltips.get(element);
    if (tooltip) {
      tooltip.classList.add('show');
    }
  }

  /**
   * Hide tooltip programmatically
   */
  hideTooltip(element) {
    const tooltip = this.tooltips.get(element);
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  /**
   * Setup help center
   */
  setupHelpCenter() {
    this.helpArticles = [
      {
        id: 'getting-started',
        icon: '🚀',
        title: 'Getting Started',
        description: 'Learn the basics of using Rupiya',
        content: 'Rupiya is a personal finance tracker that helps you manage expenses, budgets, and investments.'
      },
      {
        id: 'adding-expenses',
        icon: '💸',
        title: 'Adding Expenses',
        description: 'How to record your spending',
        content: 'Click the Add Expense button, fill in the amount, category, and description, then save.'
      },
      {
        id: 'managing-budgets',
        icon: '💰',
        title: 'Managing Budgets',
        description: 'Set and track your budgets',
        content: 'Create budgets by category to control your spending and get alerts when approaching limits.'
      },
      {
        id: 'viewing-analytics',
        icon: '📊',
        title: 'Viewing Analytics',
        description: 'Understand your financial patterns',
        content: 'View detailed charts and reports to understand your spending habits and trends.'
      },
      {
        id: 'managing-accounts',
        icon: '🏦',
        title: 'Managing Accounts',
        description: 'Add and manage your financial accounts',
        content: 'Add your bank accounts, credit cards, and investment accounts to track all your finances.'
      },
      {
        id: 'security-privacy',
        icon: '🔒',
        title: 'Security & Privacy',
        description: 'Keep your data safe',
        content: 'Your data is encrypted and secure. Learn about our privacy practices and security measures.'
      }
    ];
  }

  /**
   * Setup FAQ items
   */
  setupFAQ() {
    this.faqItems = [
      {
        question: 'How do I add a new expense?',
        answer: 'Click the "Add Expense" button on the dashboard, fill in the amount, category, date, and description, then click save.'
      },
      {
        question: 'Can I edit or delete expenses?',
        answer: 'Yes, click on any expense to view details, then use the edit or delete buttons to modify or remove it.'
      },
      {
        question: 'How do I set a budget?',
        answer: 'Go to the Budgets section, click "Create Budget", select a category, set your limit, and save.'
      },
      {
        question: 'What happens when I exceed my budget?',
        answer: 'You\'ll receive a notification when you reach 80% of your budget, and another when you exceed it.'
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes, go to Settings > Export to download your data in CSV or PDF format.'
      },
      {
        question: 'Is my data secure?',
        answer: 'Yes, all your data is encrypted using industry-standard encryption and stored securely.'
      },
      {
        question: 'Can I use Rupiya offline?',
        answer: 'Yes, Rupiya works offline and syncs your data when you\'re back online.'
      },
      {
        question: 'How do I reset my password?',
        answer: 'Click "Forgot Password" on the login page and follow the instructions sent to your email.'
      }
    ];
  }

  /**
   * Render help center
   */
  renderHelpCenter(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const helpCenter = document.createElement('div');
    helpCenter.className = 'help-center';

    helpCenter.innerHTML = `
      <div class="help-center-header">
        <h2 class="help-center-title">Help Center</h2>
        <p class="help-center-subtitle">Find answers to common questions</p>
      </div>

      <div class="help-search-container">
        <input type="text" class="help-search-input" id="help-search" placeholder="Search help articles...">
      </div>

      <div class="help-articles" id="help-articles">
        ${this.helpArticles.map(article => `
          <a href="#" class="help-article" data-article-id="${article.id}">
            <div class="help-article-icon">${article.icon}</div>
            <h3 class="help-article-title">${this.escapeHtml(article.title)}</h3>
            <p class="help-article-description">${this.escapeHtml(article.description)}</p>
          </a>
        `).join('')}
      </div>

      <div class="faq-section">
        <h3 class="faq-title">Frequently Asked Questions</h3>
        <div class="faq-items">
          ${this.faqItems.map((item, index) => `
            <div class="faq-item" data-faq-index="${index}">
              <div class="faq-question">
                <span>${this.escapeHtml(item.question)}</span>
                <span class="faq-question-icon">▼</span>
              </div>
              <div class="faq-answer">
                <div class="faq-answer-content">
                  ${this.escapeHtml(item.answer)}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.appendChild(helpCenter);

    // Bind events
    this.bindHelpCenterEvents(helpCenter);
  }

  /**
   * Bind help center events
   */
  bindHelpCenterEvents(helpCenter) {
    // Search functionality
    const searchInput = helpCenter.querySelector('#help-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterHelpArticles(e.target.value, helpCenter);
      });
    }

    // FAQ toggle
    const faqItems = helpCenter.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      question.addEventListener('click', () => {
        item.classList.toggle('open');
      });
    });

    // Article click
    const articles = helpCenter.querySelectorAll('.help-article');
    articles.forEach(article => {
      article.addEventListener('click', (e) => {
        e.preventDefault();
        const articleId = article.getAttribute('data-article-id');
        this.showArticleDetail(articleId);
      });
    });
  }

  /**
   * Filter help articles by search term
   */
  filterHelpArticles(searchTerm, container) {
    const articles = container.querySelectorAll('.help-article');
    const term = searchTerm.toLowerCase();

    articles.forEach(article => {
      const title = article.querySelector('.help-article-title').textContent.toLowerCase();
      const description = article.querySelector('.help-article-description').textContent.toLowerCase();

      if (title.includes(term) || description.includes(term)) {
        article.style.display = '';
      } else {
        article.style.display = 'none';
      }
    });
  }

  /**
   * Show article detail
   */
  showArticleDetail(articleId) {
    const article = this.helpArticles.find(a => a.id === articleId);
    if (!article) return;

    const modal = document.createElement('div');
    modal.className = 'contextual-help-overlay';
    modal.innerHTML = `
      <div class="contextual-help-box">
        <button class="contextual-help-close">×</button>
        <h3 class="contextual-help-title">${this.escapeHtml(article.title)}</h3>
        <p class="contextual-help-content">${this.escapeHtml(article.content)}</p>
        <div class="contextual-help-actions">
          <button class="contextual-help-btn contextual-help-btn-secondary" id="close-help">Close</button>
          <button class="contextual-help-btn contextual-help-btn-primary" id="learn-more">Learn More</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-help');
    const closeIcon = modal.querySelector('.contextual-help-close');
    closeBtn.addEventListener('click', () => modal.remove());
    closeIcon.addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  /**
   * Show contextual help for specific page
   */
  showContextualHelp(title, content, actions = []) {
    const overlay = document.createElement('div');
    overlay.className = 'contextual-help-overlay';

    let actionsHTML = '';
    if (actions.length > 0) {
      actionsHTML = actions.map(action => `
        <button class="contextual-help-btn contextual-help-btn-${action.type || 'secondary'}" 
                data-action="${action.id}">
          ${this.escapeHtml(action.label)}
        </button>
      `).join('');
    } else {
      actionsHTML = '<button class="contextual-help-btn contextual-help-btn-secondary" id="close-help">Close</button>';
    }

    overlay.innerHTML = `
      <div class="contextual-help-box">
        <button class="contextual-help-close">×</button>
        <h3 class="contextual-help-title">${this.escapeHtml(title)}</h3>
        <p class="contextual-help-content">${this.escapeHtml(content)}</p>
        <div class="contextual-help-actions">
          ${actionsHTML}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bind close events
    const closeBtn = overlay.querySelector('.contextual-help-close');
    closeBtn.addEventListener('click', () => overlay.remove());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Bind action events
    const actionBtns = overlay.querySelectorAll('[data-action]');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = actions.find(a => a.id === btn.getAttribute('data-action'));
        if (action && action.callback) {
          action.callback();
        }
        overlay.remove();
      });
    });
  }

  /**
   * Add help icon to element
   */
  addHelpIcon(element, tooltipText, tooltipTitle = '', position = 'top') {
    const helpIcon = document.createElement('span');
    helpIcon.className = 'help-icon';
    helpIcon.setAttribute('data-tooltip', tooltipText);
    if (tooltipTitle) {
      helpIcon.setAttribute('data-tooltip-title', tooltipTitle);
    }
    helpIcon.setAttribute('data-tooltip-position', position);
    helpIcon.textContent = '?';

    element.appendChild(helpIcon);
    this.createTooltip(helpIcon, tooltipText, tooltipTitle, position);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create and export singleton instance
const contextualHelpService = new ContextualHelpService();
export default contextualHelpService;
