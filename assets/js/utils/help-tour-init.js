// Help & Tour Initialization
// Initialize product tour and contextual help system

import productTour from '../components/product-tour.js';
import contextualHelp from '../components/contextual-help.js';
import { auth, db } from '../config/firebase-config.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class HelpTourInit {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize help and tour features
   */
  async init() {
    if (this.initialized) return;

    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize contextual help
      contextualHelp.init();

      // Check if user should see tour
      const page = this.getCurrentPage();
      const shouldShowTour = await this.shouldShowTour(page);

      if (shouldShowTour) {
        // Show tour after a short delay
        setTimeout(() => {
          this.offerTour(page);
        }, 2000);
      }

      // Make tour and help globally accessible
      window.productTour = productTour;
      window.contextualHelp = contextualHelp;

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing help & tour:', error);
    }
  }

  /**
   * Check if tour should be shown
   */
  async shouldShowTour(page) {
    // Don't show on auth pages
    if (page === 'login' || page === 'signup') {
      return false;
    }

    // Check if tour already completed
    if (!productTour.shouldShowTour(page)) {
      return false;
    }

    // Check if user is new (within 3 days)
    const isNewUser = await this.isNewUser();
    if (!isNewUser) {
      return false;
    }

    // Check if tour was offered recently
    const lastOffered = localStorage.getItem(`rupiya_tour_${page}_offered`);
    if (lastOffered) {
      const daysSinceOffered = (Date.now() - parseInt(lastOffered)) / (1000 * 60 * 60 * 24);
      if (daysSinceOffered < 1) {
        return false; // Don't offer again within 24 hours
      }
    }

    return true;
  }

  /**
   * Check if user is new
   */
  async isNewUser() {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) return true;

      const userData = userDoc.data();
      const registrationDate = userData.createdAt?.toDate() || new Date();
      const daysSinceRegistration = (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);

      return daysSinceRegistration <= 3;
    } catch (error) {
      console.error('Error checking user age:', error);
      return false;
    }
  }

  /**
   * Offer tour to user
   */
  offerTour(page) {
    // Mark as offered
    localStorage.setItem(`rupiya_tour_${page}_offered`, Date.now().toString());

    // Create offer modal
    const modal = this.createTourOfferModal(page);
    document.body.appendChild(modal);

    // Bind events
    const acceptBtn = document.getElementById('acceptTourBtn');
    const declineBtn = document.getElementById('declineTourBtn');

    acceptBtn?.addEventListener('click', () => {
      modal.remove();
      productTour.startTour(page);
    });

    declineBtn?.addEventListener('click', () => {
      modal.remove();
      productTour.markTourAsSkipped();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Create tour offer modal
   */
  createTourOfferModal(page) {
    const modal = document.createElement('div');
    modal.className = 'onboarding-overlay';
    modal.id = 'tourOfferModal';

    const pageNames = {
      dashboard: 'Dashboard',
      expenses: 'Expenses',
      income: 'Income',
      budgets: 'Budgets',
      goals: 'Goals'
    };

    const pageName = pageNames[page] || 'this page';

    modal.innerHTML = `
      <div class="onboarding-modal" style="max-width: 500px;">
        <div class="onboarding-header">
          <div class="onboarding-icon">🎯</div>
          <h2 class="onboarding-title">Take a Quick Tour?</h2>
          <p class="onboarding-subtitle">Learn how to use ${pageName} features</p>
        </div>

        <div class="onboarding-content" style="padding: 30px;">
          <p style="margin-bottom: 20px; color: #64748b; line-height: 1.6; text-align: center;">
            We'll show you around with an interactive tour. It only takes 2 minutes!
          </p>

          <div class="onboarding-grid" style="grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div class="onboarding-card">
              <div class="onboarding-card-icon">⚡</div>
              <div class="onboarding-card-title">Quick</div>
              <div class="onboarding-card-description">2 minutes</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">🎯</div>
              <div class="onboarding-card-title">Interactive</div>
              <div class="onboarding-card-description">Hands-on guide</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">⏭️</div>
              <div class="onboarding-card-title">Skippable</div>
              <div class="onboarding-card-description">Skip anytime</div>
            </div>
            <div class="onboarding-card">
              <div class="onboarding-card-icon">🔄</div>
              <div class="onboarding-card-title">Repeatable</div>
              <div class="onboarding-card-description">Restart later</div>
            </div>
          </div>

          <p style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; text-align: center;">
            💡 You can also access the tour anytime from the help menu (Shift + ?)
          </p>
        </div>

        <div class="onboarding-footer" style="padding: 20px 30px; display: flex; gap: 12px;">
          <button class="btn btn-outline" id="declineTourBtn" style="flex: 1;">
            Maybe Later
          </button>
          <button class="btn btn-primary" id="acceptTourBtn" style="flex: 1;">
            Start Tour
          </button>
        </div>
      </div>
    `;

    return modal;
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
    if (path.includes('login')) return 'login';
    if (path.includes('signup')) return 'signup';
    return 'dashboard';
  }
}

// Create and export singleton instance
const helpTourInit = new HelpTourInit();
export default helpTourInit;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => helpTourInit.init());
} else {
  helpTourInit.init();
}
