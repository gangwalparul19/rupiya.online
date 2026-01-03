// Onboarding Service - Interactive Tutorial, Demo Mode, Quick Setup
import { db } from '../config/firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

// Onboarding Steps
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Rupiya! 🎉',
    description: 'Your personal finance companion. Let\'s get you set up in just 2 minutes.',
    target: null,
    position: 'center'
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'This is your financial command center. See income, expenses, and savings at a glance.',
    target: '.kpi-grid',
    position: 'bottom'
  },
  {
    id: 'add_expense',
    title: 'Track Expenses',
    description: 'Click here to add your first expense. Categorize and track every rupee.',
    target: '[href="expenses.html"]',
    position: 'right'
  },
  {
    id: 'add_income',
    title: 'Record Income',
    description: 'Log your salary, freelance income, or any money coming in.',
    target: '[href="income.html"]',
    position: 'right'
  },
  {
    id: 'budgets',
    title: 'Set Budgets',
    description: 'Create monthly budgets to control your spending and save more.',
    target: '[href="budgets.html"]',
    position: 'right'
  },
  {
    id: 'goals',
    title: 'Financial Goals',
    description: 'Set savings goals and track your progress towards them.',
    target: '[href="goals.html"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'Start by adding your first expense or income. We\'ll help you along the way!',
    target: null,
    position: 'center'
  }
];

// Demo Data for exploration
const DEMO_DATA = {
  expenses: [
    { description: 'Grocery Shopping', amount: 2500, category: 'Food', date: new Date() },
    { description: 'Electricity Bill', amount: 1800, category: 'Utilities', date: new Date() },
    { description: 'Netflix Subscription', amount: 649, category: 'Entertainment', date: new Date() },
    { description: 'Petrol', amount: 3000, category: 'Transport', date: new Date() },
    { description: 'Restaurant Dinner', amount: 1200, category: 'Food', date: new Date() }
  ],
  income: [
    { description: 'Monthly Salary', amount: 75000, category: 'Salary', date: new Date() },
    { description: 'Freelance Project', amount: 15000, category: 'Freelance', date: new Date() }
  ],
  budgets: [
    { category: 'Food', limit: 8000, spent: 3700 },
    { category: 'Transport', limit: 5000, spent: 3000 },
    { category: 'Entertainment', limit: 3000, spent: 649 },
    { category: 'Utilities', limit: 4000, spent: 1800 }
  ],
  goals: [
    { name: 'Emergency Fund', target: 100000, current: 45000, deadline: '2026-06-30' },
    { name: 'New Laptop', target: 80000, current: 25000, deadline: '2026-03-31' }
  ]
};

// Quick Setup Templates
const BUDGET_TEMPLATES = {
  student: {
    name: 'Student Budget',
    icon: '🎓',
    budgets: [
      { category: 'Food', limit: 5000 },
      { category: 'Transport', limit: 2000 },
      { category: 'Education', limit: 3000 },
      { category: 'Entertainment', limit: 1500 }
    ]
  },
  professional: {
    name: 'Working Professional',
    icon: '💼',
    budgets: [
      { category: 'Food', limit: 8000 },
      { category: 'Transport', limit: 5000 },
      { category: 'Utilities', limit: 4000 },
      { category: 'Entertainment', limit: 3000 },
      { category: 'Shopping', limit: 5000 }
    ]
  },
  family: {
    name: 'Family Budget',
    icon: '👨‍👩‍👧‍👦',
    budgets: [
      { category: 'Food', limit: 15000 },
      { category: 'Utilities', limit: 6000 },
      { category: 'Education', limit: 10000 },
      { category: 'Healthcare', limit: 5000 },
      { category: 'Entertainment', limit: 4000 }
    ]
  },
  frugal: {
    name: 'Frugal Saver',
    icon: '💰',
    budgets: [
      { category: 'Food', limit: 4000 },
      { category: 'Transport', limit: 1500 },
      { category: 'Utilities', limit: 2500 },
      { category: 'Entertainment', limit: 1000 }
    ]
  }
};

class OnboardingService {
  constructor() {
    this.steps = ONBOARDING_STEPS;
    this.demoData = DEMO_DATA;
    this.budgetTemplates = BUDGET_TEMPLATES;
    this.currentStep = 0;
    this.overlay = null;
    this.tooltip = null;
  }

  getUserId() {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  // Check if user needs onboarding
  async needsOnboarding() {
    const userId = this.getUserId();
    if (!userId) return false;

    try {
      const docRef = doc(db, 'userPreferences', userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return true;
      
      const data = docSnap.data();
      return !data.onboardingCompleted;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  // Mark onboarding as complete
  async completeOnboarding() {
    const userId = this.getUserId();
    if (!userId) return;

    try {
      const docRef = doc(db, 'userPreferences', userId);
      await setDoc(docRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  // Start interactive tutorial
  startTutorial() {
    this.currentStep = 0;
    this.createOverlay();
    this.showStep(0);
  }

  createOverlay() {
    // Remove existing overlay
    this.removeOverlay();

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.innerHTML = `<div class="onboarding-backdrop"></div>`;
    document.body.appendChild(this.overlay);

    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'onboarding-tooltip';
    document.body.appendChild(this.tooltip);
  }

  removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }

  showStep(index) {
    if (index >= this.steps.length) {
      this.finishTutorial();
      return;
    }

    const step = this.steps[index];
    this.currentStep = index;

    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    // Find and highlight target
    let targetEl = null;
    if (step.target) {
      targetEl = document.querySelector(step.target);
      if (targetEl) {
        targetEl.classList.add('onboarding-highlight');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Update tooltip
    this.tooltip.innerHTML = `
      <div class="onboarding-tooltip-content">
        <div class="onboarding-step-indicator">Step ${index + 1} of ${this.steps.length}</div>
        <h3>${step.title}</h3>
        <p>${step.description}</p>
        <div class="onboarding-actions">
          ${index > 0 ? '<button class="btn btn-sm btn-outline" id="onboardingPrev">Back</button>' : ''}
          <button class="btn btn-sm btn-outline" id="onboardingSkip">Skip</button>
          <button class="btn btn-sm btn-primary" id="onboardingNext">
            ${index === this.steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    `;

    // Position tooltip
    this.positionTooltip(targetEl, step.position);

    // Add event listeners
    document.getElementById('onboardingNext')?.addEventListener('click', () => this.showStep(index + 1));
    document.getElementById('onboardingPrev')?.addEventListener('click', () => this.showStep(index - 1));
    document.getElementById('onboardingSkip')?.addEventListener('click', () => this.finishTutorial());
  }

  positionTooltip(targetEl, position) {
    if (!this.tooltip) return;

    if (!targetEl || position === 'center') {
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();

    this.tooltip.style.position = 'fixed';
    this.tooltip.style.transform = 'none';

    switch (position) {
      case 'bottom':
        this.tooltip.style.top = `${rect.bottom + 16}px`;
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        break;
      case 'top':
        this.tooltip.style.top = `${rect.top - tooltipRect.height - 16}px`;
        this.tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
        break;
      case 'right':
        this.tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        this.tooltip.style.left = `${rect.right + 16}px`;
        break;
      case 'left':
        this.tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
        this.tooltip.style.left = `${rect.left - tooltipRect.width - 16}px`;
        break;
    }
  }

  finishTutorial() {
    this.removeOverlay();
    this.completeOnboarding();
    
    // Show completion message
    if (typeof toast !== 'undefined') {
      toast.success('🎉 Tutorial complete! Start tracking your finances.');
    }
  }

  // Demo Mode
  isDemoMode() {
    return localStorage.getItem('rupiya_demo_mode') === 'true';
  }

  enableDemoMode() {
    localStorage.setItem('rupiya_demo_mode', 'true');
  }

  disableDemoMode() {
    localStorage.removeItem('rupiya_demo_mode');
  }

  getDemoData(type) {
    return this.demoData[type] || [];
  }

  // Quick Setup
  getBudgetTemplates() {
    return this.budgetTemplates;
  }

  async applyBudgetTemplate(templateId) {
    const template = this.budgetTemplates[templateId];
    if (!template) return { success: false, error: 'Template not found' };

    // This would integrate with the budget service to create budgets
    return { success: true, template };
  }
}

const onboardingService = new OnboardingService();
export default onboardingService;
