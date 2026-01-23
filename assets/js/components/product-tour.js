// Interactive Product Tour Component
// Guided walkthrough with tooltips and highlights

class ProductTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.tourSteps = [];
    this.overlay = null;
    this.tooltip = null;
    this.highlight = null;
    this.boundKeyHandler = null;
    this.loadState();
  }

  /**
   * Define tour steps for different pages
   */
  getTourSteps(page) {
    const tours = {
      dashboard: [
        {
          target: '.kpi-cards',
          title: '📊 Financial Overview',
          content: 'These cards show your key financial metrics at a glance. Track your income, expenses, and savings rate.',
          position: 'bottom',
          action: null
        },
        {
          target: '#addExpenseBtn',
          title: '💸 Add Expense',
          content: 'Click here to quickly add a new expense. You can categorize it and add notes.',
          position: 'left',
          action: null,
          pulse: true
        },
        {
          target: '.chart-container',
          title: '📈 Visual Analytics',
          content: 'View your spending patterns with interactive charts. Hover over sections for details.',
          position: 'top',
          action: null
        },
        {
          target: '.sidebar',
          title: '🧭 Navigation',
          content: 'Access all features from the sidebar. Explore expenses, budgets, goals, and more.',
          position: 'right',
          action: null
        },
        {
          target: '.user-profile',
          title: '⚙️ Settings & Profile',
          content: 'Manage your account, preferences, and view help resources here.',
          position: 'bottom',
          action: null
        }
      ],
      expenses: [
        {
          target: '#addExpenseBtn',
          title: '➕ Add New Expense',
          content: 'Start by adding your first expense. Click here to open the form.',
          position: 'bottom',
          action: null,
          pulse: true
        },
        {
          target: '.category-filter',
          title: '🏷️ Filter by Category',
          content: 'Filter your expenses by category to see where your money goes.',
          position: 'bottom',
          action: null
        },
        {
          target: '.date-range-picker',
          title: '📅 Date Range',
          content: 'Select a date range to view expenses for specific periods.',
          position: 'bottom',
          action: null
        },
        {
          target: '.expense-list',
          title: '📋 Expense List',
          content: 'All your expenses are listed here. Click any expense to edit or delete it.',
          position: 'top',
          action: null
        }
      ],
      budgets: [
        {
          target: '#createBudgetBtn',
          title: '🎯 Create Budget',
          content: 'Set spending limits for different categories to control your expenses.',
          position: 'bottom',
          action: null,
          pulse: true
        },
        {
          target: '.budget-card',
          title: '📊 Budget Progress',
          content: 'Track how much you\'ve spent against your budget. Green means you\'re on track!',
          position: 'top',
          action: null
        },
        {
          target: '.budget-alerts',
          title: '⚠️ Budget Alerts',
          content: 'Get notified when you\'re approaching or exceeding your budget limits.',
          position: 'bottom',
          action: null
        }
      ],
      goals: [
        {
          target: '#createGoalBtn',
          title: '🎯 Set Financial Goals',
          content: 'Create savings goals for things you want to achieve. Track your progress!',
          position: 'bottom',
          action: null,
          pulse: true
        },
        {
          target: '.goal-card',
          title: '📈 Goal Progress',
          content: 'See how close you are to reaching your goals. Add contributions regularly.',
          position: 'top',
          action: null
        }
      ]
    };

    return tours[page] || [];
  }

  /**
   * Start the tour for current page
   */
  startTour(page = 'dashboard') {
    // Always reset to beginning when starting tour
    this.currentStep = 0;
    
    // End any active tour first
    if (this.isActive) {
      this.cleanup();
    }

    this.tourSteps = this.getTourSteps(page);
    if (this.tourSteps.length === 0) return;

    this.isActive = true;
    this.createOverlay();
    this.showStep(0);
  }

  /**
   * Create dark overlay
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.id = 'tourOverlay';
    document.body.appendChild(this.overlay);

    // Click overlay to skip tour
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.skipTour();
      }
    });
  }

  /**
   * Show specific step
   */
  showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.tourSteps.length) {
      this.endTour();
      return;
    }

    this.currentStep = stepIndex;
    const step = this.tourSteps[stepIndex];

    // Find target element
    const target = document.querySelector(step.target);
    if (!target) {
      console.warn(`Tour target not found: ${step.target}`);
      
      // Try to find next valid step instead of auto-advancing
      const nextValidStep = this.findNextValidStep(stepIndex);
      if (nextValidStep !== -1 && nextValidStep !== stepIndex) {
        this.showStep(nextValidStep);
      } else {
        // No valid steps found, end tour
        console.warn('No valid tour targets found. Ending tour.');
        this.endTour();
      }
      return;
    }

    // Create highlight
    this.createHighlight(target);

    // Create tooltip
    this.createTooltip(step, target);

    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Find next valid step with existing target
   */
  findNextValidStep(fromIndex) {
    for (let i = fromIndex + 1; i < this.tourSteps.length; i++) {
      const target = document.querySelector(this.tourSteps[i].target);
      if (target) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Find previous valid step with existing target
   */
  findPreviousValidStep(fromIndex) {
    for (let i = fromIndex - 1; i >= 0; i--) {
      const target = document.querySelector(this.tourSteps[i].target);
      if (target) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Create highlight around target
   */
  createHighlight(target) {
    // Remove existing highlight
    if (this.highlight) {
      this.highlight.remove();
    }

    this.highlight = document.createElement('div');
    this.highlight.className = 'tour-highlight';
    this.highlight.id = 'tourHighlight';

    const rect = target.getBoundingClientRect();
    const padding = 8;

    this.highlight.style.top = (rect.top + window.scrollY - padding) + 'px';
    this.highlight.style.left = (rect.left + window.scrollX - padding) + 'px';
    this.highlight.style.width = (rect.width + padding * 2) + 'px';
    this.highlight.style.height = (rect.height + padding * 2) + 'px';

    document.body.appendChild(this.highlight);

    // Add pulse effect if specified
    const step = this.tourSteps[this.currentStep];
    if (step.pulse) {
      this.highlight.classList.add('pulse');
    }
  }

  /**
   * Create tooltip
   */
  createTooltip(step, target) {
    // Remove existing tooltip
    if (this.tooltip) {
      this.tooltip.remove();
    }

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tour-tooltip';
    this.tooltip.id = 'tourTooltip';

    const isLastStep = this.currentStep === this.tourSteps.length - 1;
    const isFirstStep = this.currentStep === 0;

    this.tooltip.innerHTML = `
      <div class="tour-tooltip-header">
        <h3 class="tour-tooltip-title">${step.title}</h3>
        <button class="tour-tooltip-close" id="tourClose" aria-label="Close tour">×</button>
      </div>
      <div class="tour-tooltip-content">
        <p class="tour-tooltip-text">${step.content}</p>
      </div>
      <div class="tour-tooltip-footer">
        <div class="tour-tooltip-progress">
          <span class="tour-tooltip-progress-text">${this.currentStep + 1} of ${this.tourSteps.length}</span>
          <div class="tour-tooltip-progress-dots">
            ${this.tourSteps.map((_, i) => `
              <div class="tour-tooltip-progress-dot ${i === this.currentStep ? 'active' : ''} ${i < this.currentStep ? 'completed' : ''}"></div>
            `).join('')}
          </div>
        </div>
        <div class="tour-tooltip-actions">
          ${!isFirstStep ? '<button class="btn btn-outline btn-sm" id="tourPrev">← Back</button>' : ''}
          <button class="btn btn-outline btn-sm" id="tourSkip">Skip Tour</button>
          ${!isLastStep ? '<button class="btn btn-primary btn-sm" id="tourNext">Next →</button>' : ''}
          ${isLastStep ? '<button class="btn btn-primary btn-sm" id="tourFinish">Finish</button>' : ''}
        </div>
      </div>
    `;

    document.body.appendChild(this.tooltip);

    // Position tooltip
    this.positionTooltip(target, step.position);

    // Bind events
    this.bindTooltipEvents();
  }

  /**
   * Position tooltip relative to target
   */
  positionTooltip(target, position) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const spacing = 16;

    let top, left;

    switch (position) {
      case 'top':
        top = rect.top + window.scrollY - tooltipRect.height - spacing;
        left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
        this.tooltip.classList.add('position-top');
        break;
      case 'bottom':
        top = rect.bottom + window.scrollY + spacing;
        left = rect.left + window.scrollX + (rect.width / 2) - (tooltipRect.width / 2);
        this.tooltip.classList.add('position-bottom');
        break;
      case 'left':
        top = rect.top + window.scrollY + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left + window.scrollX - tooltipRect.width - spacing;
        this.tooltip.classList.add('position-left');
        break;
      case 'right':
        top = rect.top + window.scrollY + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + window.scrollX + spacing;
        this.tooltip.classList.add('position-right');
        break;
      default:
        top = rect.bottom + window.scrollY + spacing;
        left = rect.left + window.scrollX;
    }

    // Keep tooltip within viewport
    const maxLeft = window.innerWidth - tooltipRect.width - 20;
    const maxTop = window.innerHeight + window.scrollY - tooltipRect.height - 20;

    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));

    this.tooltip.style.top = top + 'px';
    this.tooltip.style.left = left + 'px';
  }

  /**
   * Bind tooltip event listeners
   */
  bindTooltipEvents() {
    const closeBtn = document.getElementById('tourClose');
    const prevBtn = document.getElementById('tourPrev');
    const nextBtn = document.getElementById('tourNext');
    const skipBtn = document.getElementById('tourSkip');
    const finishBtn = document.getElementById('tourFinish');

    closeBtn?.addEventListener('click', () => this.skipTour());
    prevBtn?.addEventListener('click', () => this.previousStep());
    nextBtn?.addEventListener('click', () => this.nextStep());
    skipBtn?.addEventListener('click', () => this.skipTour());
    finishBtn?.addEventListener('click', () => this.endTour());

    // Keyboard navigation - store bound handler for proper cleanup
    if (!this.boundKeyHandler) {
      this.boundKeyHandler = this.handleKeyPress.bind(this);
    }
    document.addEventListener('keydown', this.boundKeyHandler);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyPress(e) {
    if (!this.isActive) return;

    switch (e.key) {
      case 'Escape':
        this.skipTour();
        break;
      case 'ArrowRight':
        this.nextStep();
        break;
      case 'ArrowLeft':
        this.previousStep();
        break;
    }
  }

  /**
   * Go to next step
   */
  nextStep() {
    this.showStep(this.currentStep + 1);
  }

  /**
   * Go to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      // Find the previous step with a valid target
      const prevValidStep = this.findPreviousValidStep(this.currentStep);
      if (prevValidStep !== -1) {
        this.showStep(prevValidStep);
      } else {
        // If no previous valid step, just go to previous index
        this.showStep(this.currentStep - 1);
      }
    }
  }

  /**
   * Skip tour
   */
  skipTour() {
    this.cleanup();
    this.markTourAsSkipped();
  }

  /**
   * End tour successfully
   */
  endTour() {
    this.cleanup();
    this.markTourAsCompleted();
    this.showCompletionMessage();
  }

  /**
   * Cleanup tour elements
   */
  cleanup() {
    this.isActive = false;

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }

    if (this.highlight) {
      this.highlight.remove();
      this.highlight = null;
    }

    // Remove keyboard listener using the bound reference
    if (this.boundKeyHandler) {
      document.removeEventListener('keydown', this.boundKeyHandler);
    }
  }

  /**
   * Show completion message
   */
  showCompletionMessage() {
    if (window.showToast) {
      window.showToast('🎉 Tour completed! You\'re ready to go!', 'success');
    }
  }

  /**
   * Check if tour should be shown
   */
  shouldShowTour(page) {
    const state = this.loadState();
    const tourKey = `tour_${page}_completed`;
    return !state[tourKey];
  }

  /**
   * Mark tour as completed
   */
  markTourAsCompleted() {
    const state = this.loadState();
    const page = this.getCurrentPage();
    state[`tour_${page}_completed`] = true;
    state[`tour_${page}_timestamp`] = Date.now();
    this.saveState(state);
  }

  /**
   * Mark tour as skipped
   */
  markTourAsSkipped() {
    const state = this.loadState();
    const page = this.getCurrentPage();
    state[`tour_${page}_skipped`] = true;
    state[`tour_${page}_timestamp`] = Date.now();
    this.saveState(state);
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
    return 'dashboard';
  }

  /**
   * Save state to localStorage
   */
  saveState(state) {
    try {
      localStorage.setItem('rupiya_product_tour', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving tour state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('rupiya_product_tour');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading tour state:', error);
      return {};
    }
  }

  /**
   * Reset tour for testing
   */
  reset() {
    localStorage.removeItem('rupiya_product_tour');
    this.cleanup();
    console.log('✅ Product tour reset complete.');
  }

  /**
   * Reset tour for specific page
   */
  resetPage(page) {
    const state = this.loadState();
    delete state[`tour_${page}_completed`];
    delete state[`tour_${page}_skipped`];
    delete state[`tour_${page}_timestamp`];
    this.saveState(state);
    localStorage.removeItem(`rupiya_tour_${page}_offered`);
    console.log(`✅ Tour reset for ${page} page.`);
  }
}

// Create and export singleton instance
const productTour = new ProductTour();
export default productTour;
