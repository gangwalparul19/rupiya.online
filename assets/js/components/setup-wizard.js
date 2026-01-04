/**
 * Setup Wizard Component
 * Interactive step-by-step account setup for first-time users
 */

import { db } from '../config/firebase-config.js';
import { doc, getDoc, setDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';

// Setup wizard steps
const SETUP_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Rupiya! 🎉',
    subtitle: 'Let\'s set up your account in just a few minutes',
    icon: '👋'
  },
  {
    id: 'payment-methods',
    title: 'Add Payment Methods',
    subtitle: 'Add your cards, UPI, and bank accounts',
    icon: '💳'
  },
  {
    id: 'categories',
    title: 'Customize Categories',
    subtitle: 'Set up expense and income categories',
    icon: '🏷️'
  },
  {
    id: 'budget-template',
    title: 'Choose Budget Style',
    subtitle: 'Select a template that matches your lifestyle',
    icon: '📊'
  },
  {
    id: 'assets',
    title: 'Add Your Assets',
    subtitle: 'Properties, vehicles, and house help (optional)',
    icon: '🏠'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    subtitle: 'Start tracking your finances',
    icon: '✅'
  }
];

class SetupWizard {
  constructor() {
    this.currentStep = 0;
    this.wizardEl = null;
    this.userData = {};
  }

  async needsSetup() {
    const user = authService.getCurrentUser();
    if (!user) return false;

    try {
      const docRef = doc(db, 'userPreferences', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return true;
      return !docSnap.data().setupCompleted;
    } catch (error) {
      console.error('Error checking setup status:', error);
      return false;
    }
  }

  async markSetupComplete() {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      const docRef = doc(db, 'userPreferences', user.uid);
      await setDoc(docRef, {
        setupCompleted: true,
        setupCompletedAt: Timestamp.now(),
        onboardingCompleted: true
      }, { merge: true });
    } catch (error) {
      console.error('Error marking setup complete:', error);
    }
  }

  show() {
    this.currentStep = 0;
    this.createWizard();
    this.renderStep();
  }

  createWizard() {
    // Remove existing wizard
    document.getElementById('setupWizardOverlay')?.remove();

    this.wizardEl = document.createElement('div');
    this.wizardEl.id = 'setupWizardOverlay';
    this.wizardEl.className = 'setup-wizard-overlay';
    this.wizardEl.innerHTML = `
      <div class="setup-wizard-container">
        <div class="setup-wizard-progress">
          ${SETUP_STEPS.map((step, i) => `
            <div class="setup-progress-step ${i === 0 ? 'active' : ''}" data-step="${i}">
              <div class="setup-progress-dot">${step.icon}</div>
              <span class="setup-progress-label">${step.title.split(' ')[0]}</span>
            </div>
          `).join('')}
        </div>
        <div class="setup-wizard-content" id="setupWizardContent"></div>
        <div class="setup-wizard-footer">
          <button class="btn btn-outline" id="setupSkipBtn">Skip Setup</button>
          <div class="setup-wizard-nav">
            <button class="btn btn-outline" id="setupPrevBtn" style="display: none;">Back</button>
            <button class="btn btn-primary" id="setupNextBtn">Next</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.wizardEl);
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('setupNextBtn')?.addEventListener('click', () => this.nextStep());
    document.getElementById('setupPrevBtn')?.addEventListener('click', () => this.prevStep());
    document.getElementById('setupSkipBtn')?.addEventListener('click', () => this.skipSetup());
  }

  renderStep() {
    const step = SETUP_STEPS[this.currentStep];
    const content = document.getElementById('setupWizardContent');
    const prevBtn = document.getElementById('setupPrevBtn');
    const nextBtn = document.getElementById('setupNextBtn');
    const skipBtn = document.getElementById('setupSkipBtn');

    // Update progress
    document.querySelectorAll('.setup-progress-step').forEach((el, i) => {
      el.classList.toggle('active', i === this.currentStep);
      el.classList.toggle('completed', i < this.currentStep);
    });

    // Update buttons
    prevBtn.style.display = this.currentStep > 0 ? 'block' : 'none';
    nextBtn.textContent = this.currentStep === SETUP_STEPS.length - 1 ? 'Get Started' : 'Next';
    skipBtn.style.display = this.currentStep === SETUP_STEPS.length - 1 ? 'none' : 'block';

    // Render step content
    content.innerHTML = this.getStepContent(step.id);
    this.bindStepEvents(step.id);
  }

  getStepContent(stepId) {
    switch (stepId) {
      case 'welcome':
        return `
          <div class="setup-step-welcome">
            <div class="setup-welcome-icon">🎉</div>
            <h2>Welcome to Rupiya!</h2>
            <p>Your personal finance journey starts here. Let's set up your account to get the most out of Rupiya.</p>
            <div class="setup-welcome-features">
              <div class="setup-welcome-feature"><span>💳</span> Track expenses & income</div>
              <div class="setup-welcome-feature"><span>📊</span> Set budgets & goals</div>
              <div class="setup-welcome-feature"><span>🏠</span> Manage properties & vehicles</div>
              <div class="setup-welcome-feature"><span>🤖</span> Get AI-powered insights</div>
            </div>
            <p class="setup-time-estimate">⏱️ This will take about 3-5 minutes</p>
          </div>
        `;

      case 'payment-methods':
        return `
          <div class="setup-step-content">
            <div class="setup-step-header">
              <span class="setup-step-icon">💳</span>
              <div>
                <h2>Add Payment Methods</h2>
                <p>Add your cards, UPI IDs, and bank accounts to track where your money goes.</p>
              </div>
            </div>
            <div class="setup-payment-types">
              <div class="setup-payment-type" data-type="card">
                <div class="setup-payment-icon">💳</div>
                <div class="setup-payment-info">
                  <h4>Credit/Debit Cards</h4>
                  <p>HDFC, ICICI, SBI, etc.</p>
                </div>
                <button class="btn btn-sm btn-outline setup-add-btn">+ Add</button>
              </div>
              <div class="setup-payment-type" data-type="upi">
                <div class="setup-payment-icon">📱</div>
                <div class="setup-payment-info">
                  <h4>UPI IDs</h4>
                  <p>GPay, PhonePe, Paytm</p>
                </div>
                <button class="btn btn-sm btn-outline setup-add-btn">+ Add</button>
              </div>
              <div class="setup-payment-type" data-type="bank">
                <div class="setup-payment-icon">🏦</div>
                <div class="setup-payment-info">
                  <h4>Bank Accounts</h4>
                  <p>Savings, Current</p>
                </div>
                <button class="btn btn-sm btn-outline setup-add-btn">+ Add</button>
              </div>
              <div class="setup-payment-type" data-type="wallet">
                <div class="setup-payment-icon">👛</div>
                <div class="setup-payment-info">
                  <h4>Digital Wallets</h4>
                  <p>Paytm, Amazon Pay</p>
                </div>
                <button class="btn btn-sm btn-outline setup-add-btn">+ Add</button>
              </div>
            </div>
            <div class="setup-added-items" id="addedPaymentMethods"></div>
            <p class="setup-skip-hint">💡 You can add more payment methods later in Settings</p>
          </div>
        `;

      case 'categories':
        return `
          <div class="setup-step-content">
            <div class="setup-step-header">
              <span class="setup-step-icon">🏷️</span>
              <div>
                <h2>Your Categories</h2>
                <p>We've set up default categories. You can customize them anytime.</p>
              </div>
            </div>
            <div class="setup-categories-grid">
              <div class="setup-category-col">
                <h4>📤 Expense Categories</h4>
                <div class="setup-category-list">
                  <span class="setup-category-tag">🍔 Food</span>
                  <span class="setup-category-tag">🚗 Transport</span>
                  <span class="setup-category-tag">🏠 Housing</span>
                  <span class="setup-category-tag">💡 Utilities</span>
                  <span class="setup-category-tag">🎬 Entertainment</span>
                  <span class="setup-category-tag">🛍️ Shopping</span>
                  <span class="setup-category-tag">🏥 Healthcare</span>
                  <span class="setup-category-tag">📚 Education</span>
                </div>
              </div>
              <div class="setup-category-col">
                <h4>📥 Income Categories</h4>
                <div class="setup-category-list">
                  <span class="setup-category-tag">💼 Salary</span>
                  <span class="setup-category-tag">💻 Freelance</span>
                  <span class="setup-category-tag">📈 Investments</span>
                  <span class="setup-category-tag">🏠 Rental</span>
                  <span class="setup-category-tag">🎁 Gifts</span>
                  <span class="setup-category-tag">💰 Bonus</span>
                </div>
              </div>
            </div>
            <p class="setup-skip-hint">💡 Customize categories in Settings → Categories</p>
          </div>
        `;

      case 'budget-template':
        return `
          <div class="setup-step-content">
            <div class="setup-step-header">
              <span class="setup-step-icon">📊</span>
              <div>
                <h2>Choose Your Budget Style</h2>
                <p>Select a template that matches your lifestyle. You can customize later.</p>
              </div>
            </div>
            <div class="setup-budget-templates">
              <div class="setup-budget-template" data-template="student">
                <div class="setup-template-icon">🎓</div>
                <div class="setup-template-info">
                  <h4>Student</h4>
                  <p>Limited income, focus on essentials</p>
                </div>
              </div>
              <div class="setup-budget-template" data-template="professional">
                <div class="setup-template-icon">💼</div>
                <div class="setup-template-info">
                  <h4>Working Professional</h4>
                  <p>Balanced spending across categories</p>
                </div>
              </div>
              <div class="setup-budget-template" data-template="family">
                <div class="setup-template-icon">👨‍👩‍👧‍👦</div>
                <div class="setup-template-info">
                  <h4>Family</h4>
                  <p>Higher budgets for household needs</p>
                </div>
              </div>
              <div class="setup-budget-template" data-template="frugal">
                <div class="setup-template-icon">💰</div>
                <div class="setup-template-info">
                  <h4>Frugal Saver</h4>
                  <p>Minimize spending, maximize savings</p>
                </div>
              </div>
            </div>
          </div>
        `;

      case 'assets':
        return `
          <div class="setup-step-content">
            <div class="setup-step-header">
              <span class="setup-step-icon">🏠</span>
              <div>
                <h2>Add Your Assets (Optional)</h2>
                <p>Track properties, vehicles, and house help. Skip if not applicable.</p>
              </div>
            </div>
            <div class="setup-assets-grid">
              <div class="setup-asset-card" data-asset="property">
                <div class="setup-asset-icon">🏠</div>
                <h4>Properties</h4>
                <p>Houses, apartments, land</p>
                <a href="houses.html" class="btn btn-sm btn-outline" target="_blank">Add Later →</a>
              </div>
              <div class="setup-asset-card" data-asset="vehicle">
                <div class="setup-asset-icon">🚗</div>
                <h4>Vehicles</h4>
                <p>Cars, bikes, scooters</p>
                <a href="vehicles.html" class="btn btn-sm btn-outline" target="_blank">Add Later →</a>
              </div>
              <div class="setup-asset-card" data-asset="househelp">
                <div class="setup-asset-icon">🧹</div>
                <h4>House Help</h4>
                <p>Maid, cook, driver</p>
                <a href="house-help.html" class="btn btn-sm btn-outline" target="_blank">Add Later →</a>
              </div>
              <div class="setup-asset-card" data-asset="loans">
                <div class="setup-asset-icon">🏦</div>
                <h4>Loans & EMI</h4>
                <p>Home, car, personal loans</p>
                <a href="loans.html" class="btn btn-sm btn-outline" target="_blank">Add Later →</a>
              </div>
            </div>
            <p class="setup-skip-hint">💡 You can add these anytime from the sidebar menu</p>
          </div>
        `;

      case 'complete':
        return `
          <div class="setup-step-complete">
            <div class="setup-complete-icon">🎉</div>
            <h2>You're All Set!</h2>
            <p>Your Rupiya account is ready. Here's what to do next:</p>
            <div class="setup-next-steps">
              <a href="expenses.html" class="setup-next-step">
                <span class="setup-next-icon">💸</span>
                <span>Add your first expense</span>
              </a>
              <a href="income.html" class="setup-next-step">
                <span class="setup-next-icon">💰</span>
                <span>Record your income</span>
              </a>
              <a href="budgets.html" class="setup-next-step">
                <span class="setup-next-icon">📊</span>
                <span>Set up budgets</span>
              </a>
              <a href="user-guide.html" class="setup-next-step">
                <span class="setup-next-icon">📖</span>
                <span>Read the user guide</span>
              </a>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  bindStepEvents(stepId) {
    if (stepId === 'budget-template') {
      document.querySelectorAll('.setup-budget-template').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.setup-budget-template').forEach(t => t.classList.remove('selected'));
          el.classList.add('selected');
          this.userData.budgetTemplate = el.dataset.template;
        });
      });
    }

    if (stepId === 'payment-methods') {
      document.querySelectorAll('.setup-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const type = e.target.closest('.setup-payment-type').dataset.type;
          // Open payment method modal or redirect
          window.open('profile.html?tab=payment-methods', '_blank');
        });
      });
    }
  }

  nextStep() {
    if (this.currentStep < SETUP_STEPS.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.completeSetup();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  skipSetup() {
    if (confirm('Are you sure you want to skip setup? You can always access the User Guide later.')) {
      this.completeSetup();
    }
  }

  async completeSetup() {
    await this.markSetupComplete();
    this.wizardEl?.remove();
    
    // Show success toast if available
    if (typeof window.showToast === 'function') {
      window.showToast('🎉 Setup complete! Start tracking your finances.', 'success');
    }
  }
}

// Export singleton
const setupWizard = new SetupWizard();
export default setupWizard;