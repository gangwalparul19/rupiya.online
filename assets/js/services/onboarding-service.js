// Onboarding Service
// Manages first-time user experience and guided tours

class OnboardingService {
  constructor() {
    this.currentStep = 0;
    this.completedSteps = new Set();
    this.onboardingSteps = [];
    this.isOnboardingComplete = false;
    this.loadOnboardingState();
  }

  /**
   * Define onboarding steps
   */
  defineSteps() {
    this.onboardingSteps = [
      {
        id: 'welcome',
        title: 'Welcome to Rupiya',
        subtitle: 'Your Personal Finance Tracker',
        icon: '👋',
        description: 'Let\'s get you started with managing your finances effectively.',
        content: `
          <div class="onboarding-step-content">
            <p>Rupiya helps you track expenses, manage budgets, and achieve your financial goals.</p>
            <p>This quick tour will show you the key features.</p>
          </div>
        `,
        action: null
      },
      {
        id: 'dashboard',
        title: 'Dashboard Overview',
        subtitle: 'Your Financial Snapshot',
        icon: '📊',
        description: 'The dashboard shows your key financial metrics at a glance.',
        content: `
          <div class="onboarding-step-content">
            <div class="onboarding-checklist">
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Total Balance</p>
                  <p class="onboarding-checklist-hint">Your net worth across all accounts</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Monthly Income</p>
                  <p class="onboarding-checklist-hint">Total income this month</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Monthly Expenses</p>
                  <p class="onboarding-checklist-hint">Total spending this month</p>
                </div>
              </div>
            </div>
          </div>
        `,
        action: 'dashboard'
      },
      {
        id: 'expenses',
        title: 'Track Expenses',
        subtitle: 'Record Your Spending',
        icon: '💸',
        description: 'Easily add and categorize your expenses.',
        content: `
          <div class="onboarding-step-content">
            <p>Click the "Add Expense" button to record a new expense. You can:</p>
            <div class="onboarding-checklist">
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Set amount and category</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Add description and date</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Mark as recurring if needed</p>
                </div>
              </div>
            </div>
          </div>
        `,
        action: 'expenses'
      },
      {
        id: 'budgets',
        title: 'Set Budgets',
        subtitle: 'Control Your Spending',
        icon: '💰',
        description: 'Create budgets to manage your spending by category.',
        content: `
          <div class="onboarding-step-content">
            <p>Budgets help you stay on track with your financial goals.</p>
            <div class="onboarding-checklist">
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Create category budgets</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Get alerts when approaching limit</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Track progress visually</p>
                </div>
              </div>
            </div>
          </div>
        `,
        action: 'budgets'
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        subtitle: 'Understand Your Finances',
        icon: '📈',
        description: 'Get insights into your spending patterns and financial health.',
        content: `
          <div class="onboarding-step-content">
            <p>Analytics help you understand your financial behavior.</p>
            <div class="onboarding-checklist">
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">View spending by category</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Track trends over time</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Compare periods</p>
                </div>
              </div>
            </div>
          </div>
        `,
        action: 'analytics'
      },
      {
        id: 'complete',
        title: 'You\'re All Set!',
        subtitle: 'Ready to Manage Your Finances',
        icon: '🎉',
        description: 'You\'ve completed the onboarding tour.',
        content: `
          <div class="onboarding-step-content">
            <p>You now know the basics of Rupiya. Start by:</p>
            <div class="onboarding-checklist">
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Add your first expense</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Set up a budget</p>
                </div>
              </div>
              <div class="onboarding-checklist-item">
                <div class="onboarding-checklist-checkbox"></div>
                <div class="onboarding-checklist-text">
                  <p class="onboarding-checklist-label">Explore analytics</p>
                </div>
              </div>
            </div>
            <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
              You can always access this tour from Settings → Help & Tutorials
            </p>
          </div>
        `,
        action: null
      }
    ];
  }

  /**
   * Start onboarding flow
   */
  startOnboarding() {
    this.defineSteps();
    this.currentStep = 0; // Start from first step (index 0)
    this.completedSteps.clear();
    this.isOnboardingComplete = false;
    this.saveOnboardingState(); // Save the reset state
    this.showOnboardingModal();
  }

  /**
   * Show onboarding modal
   */
  showOnboardingModal() {
    const step = this.onboardingSteps[this.currentStep];
    if (!step) return;

    const modal = this.createOnboardingModal(step);
    document.body.appendChild(modal);

    // Bind events
    this.bindModalEvents(modal);
  }

  /**
   * Create onboarding modal element
   */
  createOnboardingModal(step) {
    const modal = document.createElement('div');
    modal.className = 'onboarding-overlay';
    modal.id = 'onboarding-modal';

    const isLastStep = this.currentStep === this.onboardingSteps.length - 1;
    const isFirstStep = this.currentStep === 0;

    modal.innerHTML = `
      <div class="onboarding-modal">
        <div class="onboarding-header">
          <div class="onboarding-icon">${step.icon}</div>
          <h2 class="onboarding-title">${step.title}</h2>
          <p class="onboarding-subtitle">${step.subtitle}</p>
        </div>

        <div class="onboarding-content">
          <div class="onboarding-progress">
            ${this.onboardingSteps.map((_, index) => `
              <div class="onboarding-progress-dot ${index === this.currentStep ? 'active' : ''} ${index < this.currentStep ? 'completed' : ''}"></div>
            `).join('')}
          </div>

          <div class="onboarding-step active">
            <h3 class="onboarding-step-title">${step.title}</h3>
            <p class="onboarding-step-description">${step.description}</p>
            ${step.content}
          </div>
        </div>

        <div class="onboarding-footer">
          <button class="onboarding-skip-btn" id="onboarding-skip">Skip Tour</button>
          <div class="onboarding-nav-buttons">
            ${!isFirstStep ? '<button class="onboarding-btn onboarding-btn-prev" id="onboarding-prev">← Back</button>' : ''}
            ${!isLastStep ? '<button class="onboarding-btn onboarding-btn-next" id="onboarding-next">Next →</button>' : ''}
            ${isLastStep ? '<button class="onboarding-btn onboarding-btn-finish" id="onboarding-finish">Get Started</button>' : ''}
          </div>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Bind modal events
   */
  bindModalEvents(modal) {
    const skipBtn = modal.querySelector('#onboarding-skip');
    const prevBtn = modal.querySelector('#onboarding-prev');
    const nextBtn = modal.querySelector('#onboarding-next');
    const finishBtn = modal.querySelector('#onboarding-finish');

    skipBtn?.addEventListener('click', () => this.skipOnboarding());
    prevBtn?.addEventListener('click', () => this.previousStep());
    nextBtn?.addEventListener('click', () => this.nextStep());
    finishBtn?.addEventListener('click', () => this.completeOnboarding());

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.skipOnboarding();
      }
    });
  }

  /**
   * Go to next step
   */
  nextStep() {
    if (this.currentStep < this.onboardingSteps.length - 1) {
      this.currentStep++;
      this.completedSteps.add(this.onboardingSteps[this.currentStep - 1].id);
      this.closeOnboardingModal();
      this.showOnboardingModal();
    }
  }

  /**
   * Go to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.closeOnboardingModal();
      this.showOnboardingModal();
    }
  }

  /**
   * Skip onboarding
   */
  skipOnboarding() {
    this.closeOnboardingModal();
    this.isOnboardingComplete = true;
    this.saveOnboardingState();
  }

  /**
   * Complete onboarding
   */
  completeOnboarding() {
    this.closeOnboardingModal();
    this.isOnboardingComplete = true;
    this.completedSteps.add(this.onboardingSteps[this.currentStep].id);
    this.saveOnboardingState();
    this.showAchievementBadge('Onboarding Complete! 🎉');
  }

  /**
   * Close onboarding modal
   */
  closeOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Show achievement badge
   */
  showAchievementBadge(text) {
    const badge = document.createElement('div');
    badge.className = 'achievement-badge';
    badge.innerHTML = `<span class="achievement-badge-icon">✨</span><span>${text}</span>`;
    document.body.appendChild(badge);

    setTimeout(() => {
      badge.remove();
    }, 3000);
  }

  /**
   * Check if onboarding should be shown
   */
  shouldShowOnboarding() {
    return !this.isOnboardingComplete;
  }

  /**
   * Save onboarding state to localStorage
   */
  saveOnboardingState() {
    try {
      localStorage.setItem('rupiya_onboarding_complete', JSON.stringify({
        isComplete: this.isOnboardingComplete,
        completedSteps: Array.from(this.completedSteps),
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
  }

  /**
   * Load onboarding state from localStorage
   */
  loadOnboardingState() {
    try {
      const saved = localStorage.getItem('rupiya_onboarding_complete');
      if (saved) {
        const state = JSON.parse(saved);
        this.isOnboardingComplete = state.isComplete;
        this.completedSteps = new Set(state.completedSteps);
        // Don't restore currentStep - always start from 0
        this.currentStep = 0;
      }
    } catch (e) {
      console.warn('Failed to load onboarding state:', e);
    }
  }

  /**
   * Reset onboarding (for testing or re-running)
   */
  resetOnboarding() {
    this.isOnboardingComplete = false;
    this.currentStep = 0;
    this.completedSteps.clear();
    localStorage.removeItem('rupiya_onboarding_complete');
    this.saveOnboardingState();
  }
  /**
   * Reset all onboarding and tour data (for complete testing reset)
   */
  resetAll() {
    // Reset onboarding
    this.resetOnboarding();
    
    // Reset product tours
    localStorage.removeItem('rupiya_product_tour');
    
    // Reset quick start checklist
    localStorage.removeItem('rupiya_quick_start_state');
    localStorage.removeItem('rupiya_checklist_celebration_shown');
    localStorage.removeItem('rupiya_visited_dashboard');
    
    // Reset sample data offer
    localStorage.removeItem('rupiya_sample_data_offered');
    
    // Reset tour offers
    const pages = ['dashboard', 'expenses', 'income', 'budgets', 'goals'];
    pages.forEach(page => {
      localStorage.removeItem(`rupiya_tour_${page}_offered`);
    });
    
  }
}

// Create and export singleton instance
const onboardingService = new OnboardingService();
export default onboardingService;
