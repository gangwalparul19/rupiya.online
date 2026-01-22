// Sample Data Service
// Generates realistic sample financial data for new users

class SampleDataService {
  constructor() {
    this.isSampleDataActive = false;
    this.loadState();
  }

  /**
   * Check if sample data is active
   */
  isActive() {
    return this.isSampleDataActive;
  }

  /**
   * Generate and load sample data for new user
   */
  async generateSampleData(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Generate sample expenses
      await this.generateSampleExpenses(userId);

      // Generate sample income
      await this.generateSampleIncome(userId);

      // Generate sample budget
      await this.generateSampleBudget(userId);

      // Generate sample goal
      await this.generateSampleGoal(userId);

      // Mark sample data as active
      this.isSampleDataActive = true;
      this.saveState();

      return true;
    } catch (error) {
      console.error('Error generating sample data:', error);
      throw error;
    }
  }

  /**
   * Generate sample expenses
   */
  async generateSampleExpenses(userId) {
    const expenses = this.getSampleExpenses();
    const batch = firebase.firestore().batch();

    expenses.forEach(expense => {
      const docRef = firebase.firestore().collection('expenses').doc();
      batch.set(docRef, {
        ...expense,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Get sample expense data
   */
  getSampleExpenses() {
    const today = new Date();
    const expenses = [];

    // Last 30 days of expenses
    const expenseTemplates = [
      { amount: 2450, category: 'Food & Groceries', description: 'Grocery Shopping', icon: '🛒', daysAgo: 0 },
      { amount: 1800, category: 'Transportation', description: 'Petrol', icon: '⛽', daysAgo: 1 },
      { amount: 1250, category: 'Dining Out', description: 'Dinner at Restaurant', icon: '🍕', daysAgo: 2 },
      { amount: 599, category: 'Utilities', description: 'Mobile Recharge', icon: '📱', daysAgo: 3 },
      { amount: 25000, category: 'Housing', description: 'Rent Payment', icon: '🏠', daysAgo: 5 },
      { amount: 3200, category: 'Food & Groceries', description: 'Weekly Groceries', icon: '🛒', daysAgo: 7 },
      { amount: 850, category: 'Entertainment', description: 'Movie Tickets', icon: '🎬', daysAgo: 8 },
      { amount: 1500, category: 'Transportation', description: 'Uber Rides', icon: '🚗', daysAgo: 9 },
      { amount: 2100, category: 'Shopping', description: 'Clothing', icon: '👕', daysAgo: 10 },
      { amount: 450, category: 'Dining Out', description: 'Lunch', icon: '🍔', daysAgo: 11 },
      { amount: 1200, category: 'Healthcare', description: 'Pharmacy', icon: '💊', daysAgo: 12 },
      { amount: 999, category: 'Utilities', description: 'Internet Bill', icon: '🌐', daysAgo: 14 },
      { amount: 2800, category: 'Food & Groceries', description: 'Monthly Groceries', icon: '🛒', daysAgo: 15 },
      { amount: 750, category: 'Entertainment', description: 'Streaming Subscriptions', icon: '📺', daysAgo: 16 },
      { amount: 1650, category: 'Transportation', description: 'Petrol', icon: '⛽', daysAgo: 18 },
      { amount: 3500, category: 'Shopping', description: 'Electronics', icon: '💻', daysAgo: 20 },
      { amount: 890, category: 'Dining Out', description: 'Weekend Brunch', icon: '🥞', daysAgo: 21 },
      { amount: 1200, category: 'Personal Care', description: 'Salon', icon: '💇', daysAgo: 22 },
      { amount: 2500, category: 'Education', description: 'Online Course', icon: '📚', daysAgo: 25 },
      { amount: 650, category: 'Entertainment', description: 'Concert Tickets', icon: '🎵', daysAgo: 28 }
    ];

    expenseTemplates.forEach(template => {
      const date = new Date(today);
      date.setDate(date.getDate() - template.daysAgo);

      expenses.push({
        amount: template.amount,
        category: template.category,
        description: template.description,
        date: firebase.firestore.Timestamp.fromDate(date),
        paymentMethod: this.getRandomPaymentMethod(),
        notes: ''
      });
    });

    return expenses;
  }

  /**
   * Generate sample income
   */
  async generateSampleIncome(userId) {
    const incomes = this.getSampleIncome();
    const batch = firebase.firestore().batch();

    incomes.forEach(income => {
      const docRef = firebase.firestore().collection('income').doc();
      batch.set(docRef, {
        ...income,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Get sample income data
   */
  getSampleIncome() {
    const today = new Date();
    const incomes = [];

    const incomeTemplates = [
      { amount: 75000, source: 'Salary', description: 'Monthly Salary', daysAgo: 5 },
      { amount: 8000, source: 'Freelance', description: 'Freelance Project', daysAgo: 10 },
      { amount: 2000, source: 'Investments', description: 'Dividend Income', daysAgo: 15 }
    ];

    incomeTemplates.forEach(template => {
      const date = new Date(today);
      date.setDate(date.getDate() - template.daysAgo);

      incomes.push({
        amount: template.amount,
        source: template.source,
        description: template.description,
        date: firebase.firestore.Timestamp.fromDate(date),
        notes: ''
      });
    });

    return incomes;
  }

  /**
   * Generate sample budget
   */
  async generateSampleBudget(userId) {
    const budgets = this.getSampleBudgets();
    const batch = firebase.firestore().batch();

    budgets.forEach(budget => {
      const docRef = firebase.firestore().collection('budgets').doc();
      batch.set(docRef, {
        ...budget,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Get sample budget data
   */
  getSampleBudgets() {
    return [
      { category: 'Food & Groceries', limit: 12000, period: 'monthly' },
      { category: 'Transportation', limit: 5000, period: 'monthly' },
      { category: 'Entertainment', limit: 3000, period: 'monthly' },
      { category: 'Shopping', limit: 5000, period: 'monthly' }
    ];
  }

  /**
   * Generate sample goal
   */
  async generateSampleGoal(userId) {
    const goal = {
      name: 'Emergency Fund',
      targetAmount: 100000,
      currentAmount: 45000,
      deadline: firebase.firestore.Timestamp.fromDate(
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months from now
      ),
      category: 'Savings',
      userId,
      isSampleData: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await firebase.firestore().collection('goals').add(goal);
  }

  /**
   * Get random payment method
   */
  getRandomPaymentMethod() {
    const methods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking'];
    return methods[Math.floor(Math.random() * methods.length)];
  }

  /**
   * Clear all sample data
   */
  async clearSampleData(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const collections = ['expenses', 'income', 'budgets', 'goals'];
      
      for (const collectionName of collections) {
        const snapshot = await firebase.firestore()
          .collection(collectionName)
          .where('userId', '==', userId)
          .where('isSampleData', '==', true)
          .get();

        const batch = firebase.firestore().batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }

      this.isSampleDataActive = false;
      this.saveState();

      return true;
    } catch (error) {
      console.error('Error clearing sample data:', error);
      throw error;
    }
  }

  /**
   * Show sample data banner
   */
  showSampleDataBanner() {
    // Remove existing banner
    const existing = document.getElementById('sampleDataBanner');
    if (existing) {
      existing.remove();
    }

    const banner = document.createElement('div');
    banner.id = 'sampleDataBanner';
    banner.className = 'sample-data-banner';

    banner.innerHTML = `
      <div class="sample-data-banner-text">
        <span class="sample-data-banner-icon">🎮</span>
        <span><strong>Exploring with sample data</strong> - Clear anytime or start adding your own!</span>
      </div>
      <div class="sample-data-banner-actions">
        <button class="btn btn-clear" id="clearSampleDataBtn">Clear Sample Data</button>
        <button class="btn btn-keep" id="keepSampleDataBtn">Got it</button>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // Adjust body padding for fixed header
    const existingPadding = parseInt(getComputedStyle(document.body).paddingTop) || 0;
    document.body.style.paddingTop = (existingPadding + 60) + 'px';

    // Bind events
    document.getElementById('clearSampleDataBtn')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all sample data?')) {
        const user = firebase.auth().currentUser;
        if (user) {
          await this.clearSampleData(user.uid);
          banner.remove();
          document.body.style.paddingTop = existingPadding + 'px';
          window.location.reload();
        }
      }
    });

    document.getElementById('keepSampleDataBtn')?.addEventListener('click', () => {
      banner.remove();
      document.body.style.paddingTop = existingPadding + 'px';
    });
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      localStorage.setItem('rupiya_sample_data_active', JSON.stringify({
        isActive: this.isSampleDataActive,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving sample data state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('rupiya_sample_data_active');
      if (saved) {
        const state = JSON.parse(saved);
        this.isSampleDataActive = state.isActive || false;
      }
    } catch (error) {
      console.error('Error loading sample data state:', error);
    }
  }
}

// Create and export singleton instance
const sampleDataService = new SampleDataService();
export default sampleDataService;
