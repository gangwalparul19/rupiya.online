// Onboarding Initialization
// Initialize quick start checklist and sample data for new users

import quickStartChecklist from '../components/quick-start-checklist.js';
import sampleDataService from '../services/sample-data-service.js';
import onboardingService from '../services/onboarding-service.js';

class OnboardingInit {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize onboarding features
   */
  async init() {
    if (this.initialized) return;

    try {
      // Make services globally accessible for testing
      window.onboardingService = onboardingService;
      window.sampleDataService = sampleDataService;
      window.quickStartChecklist = quickStartChecklist;

      // Wait for Firebase auth
      await this.waitForAuth();

      const user = firebase.auth().currentUser;
      if (!user) return;

      // Check if user is new (first login)
      const isNewUser = await this.checkIfNewUser(user.uid);

      if (isNewUser) {
        // Offer sample data
        await this.offerSampleData(user.uid);
      }

      // Show sample data banner if active
      if (sampleDataService.isActive()) {
        sampleDataService.showSampleDataBanner();
      }

      // Initialize quick start checklist
      await quickStartChecklist.init();

      // Mark dashboard as visited if on dashboard page
      if (window.location.pathname.includes('dashboard.html')) {
        quickStartChecklist.constructor.markDashboardVisited();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing onboarding:', error);
    }
  }

  /**
   * Wait for Firebase auth to be ready
   */
  waitForAuth() {
    return new Promise((resolve) => {
      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  /**
   * Check if user is new (no data yet)
   */
  async checkIfNewUser(userId) {
    try {
      // Check if user has any expenses
      const expensesSnapshot = await firebase.firestore()
        .collection('expenses')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!expensesSnapshot.empty) return false;

      // Check if user has any income
      const incomeSnapshot = await firebase.firestore()
        .collection('income')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!incomeSnapshot.empty) return false;

      // Check user registration date
      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) return true;

      const userData = userDoc.data();
      const registrationDate = userData.createdAt?.toDate() || new Date();
      const hoursSinceRegistration = (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60);

      // Consider new if registered within last 24 hours and no data
      return hoursSinceRegistration <= 24;
    } catch (error) {
      console.error('Error checking if new user:', error);
      return false;
    }
  }

  /**
   * Offer sample data to new users
   */
  async offerSampleData(userId) {
    // Check if already offered
    const offered = localStorage.getItem('rupiya_sample_data_offered');
    if (offered === 'true') return;

    // Mark as offered
    localStorage.setItem('rupiya_sample_data_offered', 'true');

    // Show modal
    const modal = this.createSampleDataModal();
    document.body.appendChild(modal);

    // Bind events
    const acceptBtn = document.getElementById('acceptSampleDataBtn');
    const declineBtn = document.getElementById('declineSampleDataBtn');

    acceptBtn?.addEventListener('click', async () => {
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'Loading...';

      try {
        await sampleDataService.generateSampleData(userId);
        modal.remove();
        window.location.reload();
      } catch (error) {
        console.error('Error generating sample data:', error);
        alert('Failed to load sample data. Please try again.');
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'Yes, Show Me!';
      }
    });

    declineBtn?.addEventListener('click', () => {
      modal.remove();
    });
  }

  /**
   * Create sample data offer modal
   */
  createSampleDataModal() {
    const modal = document.createElement('div');
    modal.className = 'onboarding-overlay';
    modal.id = 'sampleDataModal';

    modal.innerHTML = `
      <div class="onboarding-modal" style="max-width: 600px;">
        <div class="onboarding-header">
          <div class="onboarding-icon">🎯</div>
          <h2 class="onboarding-title">Welcome to Rupiya!</h2>
          <p class="onboarding-subtitle">Start with sample data or create your own</p>
        </div>

        <div class="onboarding-content" style="padding: 30px;">
          <p style="margin-bottom: 20px; color: #64748b; line-height: 1.6; text-align: center;">
            Would you like to explore Rupiya with sample financial data? 
            This helps you understand all features before adding your own information.
          </p>

          <div class="onboarding-grid">
            <div class="onboarding-card">
              <div class="onboarding-card-icon">💸</div>
              <div class="onboarding-card-title">20 Expenses</div>
              <div class="onboarding-card-description">Last 30 days of spending</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">💰</div>
              <div class="onboarding-card-title">3 Income</div>
              <div class="onboarding-card-description">Salary & other sources</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">📊</div>
              <div class="onboarding-card-title">4 Budgets</div>
              <div class="onboarding-card-description">With progress tracking</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">🎯</div>
              <div class="onboarding-card-title">1 Goal</div>
              <div class="onboarding-card-description">Emergency fund target</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">🔄</div>
              <div class="onboarding-card-title">Realistic Data</div>
              <div class="onboarding-card-description">Indian financial context</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">🗑️</div>
              <div class="onboarding-card-title">Easy Clear</div>
              <div class="onboarding-card-description">Remove anytime</div>
            </div>
          </div>

          <p style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; text-align: center;">
            💡 You can clear sample data anytime and start fresh!
          </p>
        </div>

        <div class="onboarding-footer" style="padding: 20px 30px; display: flex; gap: 12px;">
          <button class="btn btn-outline" id="declineSampleDataBtn" style="flex: 1;">
            Start Fresh
          </button>
          <button class="btn btn-primary" id="acceptSampleDataBtn" style="flex: 1;">
            Yes, Show Me!
          </button>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Refresh checklist (call after user actions)
   */
  async refreshChecklist() {
    if (quickStartChecklist) {
      await quickStartChecklist.updateTaskStatus();
      quickStartChecklist.render();
    }
  }
}

// Create and export singleton instance
const onboardingInit = new OnboardingInit();
export default onboardingInit;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => onboardingInit.init());
} else {
  onboardingInit.init();
}
