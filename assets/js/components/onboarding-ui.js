// Onboarding UI Components - Welcome Modal, Tutorial, Setup Wizard
import onboardingService from '../services/onboarding-service.js';

class OnboardingUI {
  constructor() {
    this.wizardStep = 0;
  }

  // Show welcome modal for new users
  showWelcomeModal() {
    const modal = document.createElement('div');
    modal.className = 'welcome-modal';
    modal.id = 'welcomeModal';
    modal.innerHTML = `
      <div class="welcome-modal-card">
        <div class="welcome-modal-icon">🎉</div>
        <h2>Welcome to Rupiya!</h2>
        <p>Your personal finance journey starts here. Let's get you set up in just 2 minutes!</p>
        <div class="welcome-modal-actions">
          <button class="btn btn-primary" id="startTutorialBtn">
            Start Quick Tour
          </button>
          <button class="btn btn-outline" id="skipTutorialBtn">
            Skip for now
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('startTutorialBtn').addEventListener('click', () => {
      modal.remove();
      onboardingService.startTutorial();
    });
    
    document.getElementById('skipTutorialBtn').addEventListener('click', () => {
      modal.remove();
      onboardingService.completeOnboarding();
    });
  }

  // Show setup wizard
  showSetupWizard() {
    const wizard = document.createElement('div');
    wizard.className = 'setup-wizard';
    wizard.id = 'setupWizard';
    wizard.innerHTML = `
      <div class="setup-wizard-card">
        <div class="setup-wizard-header">
          <h2>⚡ Quick Setup</h2>
          <p>Let's personalize your experience</p>
        </div>
        <div class="setup-wizard-progress">
          <div class="setup-wizard-progress-dot active"></div>
          <div class="setup-wizard-progress-dot"></div>
          <div class="setup-wizard-progress-dot"></div>
        </div>
        <div class="setup-wizard-content" id="wizardContent">
          ${this.getWizardStepContent(0)}
        </div>
        <div class="setup-wizard-footer">
          <button class="btn btn-outline" id="wizardSkip">Skip</button>
          <button class="btn btn-primary" id="wizardNext">Next</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(wizard);
    this.initWizardEvents();
  }

  getWizardStepContent(step) {
    const templates = onboardingService.getBudgetTemplates();
    
    switch(step) {
      case 0:
        return `
          <h3>Choose your budget style</h3>
          <p>Select a template that matches your lifestyle</p>
          <div class="budget-templates">
            ${Object.entries(templates).map(([id, template]) => `
              <div class="budget-template-card" data-template="${id}">
                <div class="budget-template-icon">${template.icon}</div>
                <div class="budget-template-name">${template.name}</div>
                <div class="budget-template-budgets">${template.budgets.length} categories</div>
              </div>
            `).join('')}
          </div>
        `;
      case 1:
        return `
          <h3>Set your first goal</h3>
          <p>What are you saving for?</p>
          <div class="form-group">
            <label class="form-label">Goal Name</label>
            <input type="text" class="form-control" id="goalName" placeholder="e.g., Emergency Fund">
          </div>
          <div class="form-group">
            <label class="form-label">Target Amount (₹)</label>
            <input type="number" class="form-control" id="goalAmount" placeholder="e.g., 100000">
          </div>
        `;
      case 2:
        return `
          <h3>You're all set! 🎉</h3>
          <p>Here's what you can do next:</p>
          <div class="setup-checklist">
            <div class="setup-checklist-item">
              <div class="setup-checklist-check">1</div>
              <div class="setup-checklist-text">Add your first expense</div>
            </div>
            <div class="setup-checklist-item">
              <div class="setup-checklist-check">2</div>
              <div class="setup-checklist-text">Record your income</div>
            </div>
            <div class="setup-checklist-item">
              <div class="setup-checklist-check">3</div>
              <div class="setup-checklist-text">Invite family members</div>
            </div>
          </div>
        `;
      default:
        return '';
    }
  }

  initWizardEvents() {
    const wizard = document.getElementById('setupWizard');
    const content = document.getElementById('wizardContent');
    const nextBtn = document.getElementById('wizardNext');
    const skipBtn = document.getElementById('wizardSkip');
    const dots = wizard.querySelectorAll('.setup-wizard-progress-dot');
    
    // Template selection
    content.addEventListener('click', (e) => {
      const card = e.target.closest('.budget-template-card');
      if (card) {
        content.querySelectorAll('.budget-template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      }
    });
    
    nextBtn.addEventListener('click', () => {
      this.wizardStep++;
      
      if (this.wizardStep >= 3) {
        wizard.remove();
        onboardingService.completeOnboarding();
        return;
      }
      
      content.innerHTML = this.getWizardStepContent(this.wizardStep);
      
      // Update progress dots
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.wizardStep);
        dot.classList.toggle('completed', i < this.wizardStep);
      });
      
      // Update button text
      if (this.wizardStep === 2) {
        nextBtn.textContent = 'Get Started';
      }
    });
    
    skipBtn.addEventListener('click', () => {
      wizard.remove();
      onboardingService.completeOnboarding();
    });
  }

  // Show demo mode banner
  showDemoModeBanner() {
    if (!onboardingService.isDemoMode()) return;
    
    const banner = document.createElement('div');
    banner.className = 'demo-mode-banner';
    banner.innerHTML = `
      <div class="demo-mode-banner-text">
        <span class="demo-mode-banner-icon">🎮</span>
        <span>You're in Demo Mode - Explore with sample data!</span>
      </div>
      <div class="demo-mode-banner-actions">
        <button class="btn" id="exitDemoBtn">Exit Demo</button>
        <button class="btn btn-signup" id="signupFromDemoBtn">Sign Up Free</button>
      </div>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Adjust body padding
    document.body.style.paddingTop = '60px';
    
    document.getElementById('exitDemoBtn').addEventListener('click', () => {
      onboardingService.disableDemoMode();
      window.location.href = 'index.html';
    });
    
    document.getElementById('signupFromDemoBtn').addEventListener('click', () => {
      onboardingService.disableDemoMode();
      window.location.href = 'signup.html';
    });
  }

  // Check and show onboarding if needed
  async checkAndShowOnboarding() {
    // Check demo mode first
    if (onboardingService.isDemoMode()) {
      this.showDemoModeBanner();
      return;
    }
    
    // Check if user needs onboarding
    const needsOnboarding = await onboardingService.needsOnboarding();
    if (needsOnboarding) {
      this.showWelcomeModal();
    }
  }
}

const onboardingUI = new OnboardingUI();
export default onboardingUI;
