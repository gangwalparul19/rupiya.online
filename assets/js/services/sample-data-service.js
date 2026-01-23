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
      // Generate sample data for all features
      await this.generateSampleExpenses(userId);
      await this.generateSampleIncome(userId);
      await this.generateSampleBudget(userId);
      await this.generateSampleGoal(userId);
      await this.generateSampleVehicles(userId);
      await this.generateSampleHouses(userId);
      await this.generateSampleHouseHelp(userId);
      await this.generateSampleHealthcareInsurance(userId);
      await this.generateSampleInvestments(userId);
      await this.generateSampleLoans(userId);
      await this.generateSampleCreditCards(userId);
      await this.generateSampleNotes(userId);
      await this.generateSampleRecurring(userId);
      await this.generateSampleTripGroups(userId);

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
   * Generate sample vehicles
   */
  async generateSampleVehicles(userId) {
    const vehicles = [
      {
        name: 'Honda City',
        type: 'Car',
        registrationNumber: 'MH-02-AB-1234',
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2020-03-15')),
        purchasePrice: 1200000,
        currentValue: 850000,
        insuranceExpiry: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        insuranceProvider: 'HDFC ERGO',
        insurancePremium: 18500
      },
      {
        name: 'Honda Activa',
        type: 'Two Wheeler',
        registrationNumber: 'MH-02-CD-5678',
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2021-06-20')),
        purchasePrice: 75000,
        currentValue: 55000,
        insuranceExpiry: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)),
        insuranceProvider: 'ICICI Lombard',
        insurancePremium: 3500
      }
    ];

    const batch = firebase.firestore().batch();
    vehicles.forEach(vehicle => {
      const docRef = firebase.firestore().collection('vehicles').doc();
      batch.set(docRef, {
        ...vehicle,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample houses
   */
  async generateSampleHouses(userId) {
    const houses = [
      {
        name: 'Primary Residence',
        type: 'Apartment',
        address: '123, Green Valley Society, Pune',
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2018-01-15')),
        purchasePrice: 5500000,
        currentValue: 7200000,
        area: 1200,
        areaUnit: 'sqft',
        hasLoan: true,
        loanAmount: 2500000,
        monthlyEMI: 35000
      }
    ];

    const batch = firebase.firestore().batch();
    houses.forEach(house => {
      const docRef = firebase.firestore().collection('houses').doc();
      batch.set(docRef, {
        ...house,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample house help
   */
  async generateSampleHouseHelp(userId) {
    const houseHelp = [
      {
        name: 'Ramesh Kumar',
        role: 'Cook',
        salary: 8000,
        paymentFrequency: 'monthly',
        phoneNumber: '+91-9876543210',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2022-06-01')),
        isActive: true
      },
      {
        name: 'Sunita Devi',
        role: 'Maid',
        salary: 5000,
        paymentFrequency: 'monthly',
        phoneNumber: '+91-9876543211',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2023-01-15')),
        isActive: true
      }
    ];

    const batch = firebase.firestore().batch();
    houseHelp.forEach(help => {
      const docRef = firebase.firestore().collection('houseHelp').doc();
      batch.set(docRef, {
        ...help,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample healthcare insurance
   */
  async generateSampleHealthcareInsurance(userId) {
    const insurance = [
      {
        policyName: 'Family Health Shield',
        provider: 'Star Health Insurance',
        policyNumber: 'SH-2023-456789',
        coverageAmount: 1000000,
        premium: 25000,
        premiumFrequency: 'annual',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2023-04-01')),
        endDate: firebase.firestore.Timestamp.fromDate(new Date('2024-03-31')),
        members: ['Self', 'Spouse', 'Child'],
        isActive: true
      }
    ];

    const batch = firebase.firestore().batch();
    insurance.forEach(policy => {
      const docRef = firebase.firestore().collection('healthcareInsurance').doc();
      batch.set(docRef, {
        ...policy,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample investments
   */
  async generateSampleInvestments(userId) {
    const investments = [
      {
        name: 'Reliance Industries',
        type: 'Stock',
        symbol: 'RELIANCE',
        quantity: 50,
        buyPrice: 2450,
        currentPrice: 2680,
        investedAmount: 122500,
        currentValue: 134000,
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2023-01-15'))
      },
      {
        name: 'HDFC Bank',
        type: 'Stock',
        symbol: 'HDFCBANK',
        quantity: 100,
        buyPrice: 1580,
        currentPrice: 1650,
        investedAmount: 158000,
        currentValue: 165000,
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2023-03-20'))
      },
      {
        name: 'SBI Bluechip Fund',
        type: 'Mutual Fund',
        symbol: 'SBI-BLUECHIP',
        units: 500,
        buyPrice: 65,
        currentPrice: 72,
        investedAmount: 32500,
        currentValue: 36000,
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2022-06-10'))
      },
      {
        name: 'ICICI Prudential Equity Fund',
        type: 'Mutual Fund',
        symbol: 'ICICI-EQUITY',
        units: 300,
        buyPrice: 120,
        currentPrice: 135,
        investedAmount: 36000,
        currentValue: 40500,
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2022-09-15'))
      },
      {
        name: 'Fixed Deposit - SBI',
        type: 'Fixed Deposit',
        symbol: 'FD-SBI',
        investedAmount: 200000,
        currentValue: 215000,
        interestRate: 7.5,
        maturityDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
        purchaseDate: firebase.firestore.Timestamp.fromDate(new Date('2023-06-01'))
      }
    ];

    const batch = firebase.firestore().batch();
    investments.forEach(investment => {
      const docRef = firebase.firestore().collection('investments').doc();
      batch.set(docRef, {
        ...investment,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample loans
   */
  async generateSampleLoans(userId) {
    const loans = [
      {
        name: 'Home Loan',
        type: 'Home Loan',
        lender: 'HDFC Bank',
        principalAmount: 4000000,
        outstandingAmount: 2500000,
        interestRate: 8.5,
        emi: 35000,
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2018-01-15')),
        endDate: firebase.firestore.Timestamp.fromDate(new Date('2038-01-15')),
        tenure: 240,
        remainingTenure: 168
      },
      {
        name: 'Car Loan',
        type: 'Vehicle Loan',
        lender: 'ICICI Bank',
        principalAmount: 800000,
        outstandingAmount: 350000,
        interestRate: 9.5,
        emi: 18500,
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2020-03-15')),
        endDate: firebase.firestore.Timestamp.fromDate(new Date('2025-03-15')),
        tenure: 60,
        remainingTenure: 18
      }
    ];

    const batch = firebase.firestore().batch();
    loans.forEach(loan => {
      const docRef = firebase.firestore().collection('loans').doc();
      batch.set(docRef, {
        ...loan,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample credit cards
   */
  async generateSampleCreditCards(userId) {
    const creditCards = [
      {
        name: 'HDFC Regalia',
        bank: 'HDFC Bank',
        lastFourDigits: '4567',
        creditLimit: 300000,
        availableCredit: 245000,
        currentDue: 55000,
        dueDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
        billingCycle: 5,
        rewardPoints: 12500,
        isActive: true
      },
      {
        name: 'SBI SimplyCLICK',
        bank: 'State Bank of India',
        lastFourDigits: '8901',
        creditLimit: 150000,
        availableCredit: 135000,
        currentDue: 15000,
        dueDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)),
        billingCycle: 10,
        rewardPoints: 5800,
        isActive: true
      }
    ];

    const batch = firebase.firestore().batch();
    creditCards.forEach(card => {
      const docRef = firebase.firestore().collection('creditCards').doc();
      batch.set(docRef, {
        ...card,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample notes
   */
  async generateSampleNotes(userId) {
    const notes = [
      {
        title: 'Investment Strategy 2024',
        content: 'Focus on bluechip stocks and diversified mutual funds. Target: 15% annual returns. Review portfolio quarterly.',
        category: 'Investment',
        isPinned: true
      },
      {
        title: 'Tax Planning Checklist',
        content: '1. Max out 80C deductions\n2. Invest in ELSS\n3. Review HRA claims\n4. Check for additional deductions',
        category: 'Tax',
        isPinned: false
      },
      {
        title: 'Financial Goals',
        content: 'Short-term: Emergency fund ₹1L\nMid-term: Car upgrade ₹5L\nLong-term: Retirement corpus ₹2Cr',
        category: 'Goals',
        isPinned: true
      }
    ];

    const batch = firebase.firestore().batch();
    notes.forEach(note => {
      const docRef = firebase.firestore().collection('notes').doc();
      batch.set(docRef, {
        ...note,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample recurring transactions
   */
  async generateSampleRecurring(userId) {
    const recurring = [
      {
        name: 'Netflix Subscription',
        amount: 649,
        category: 'Entertainment',
        type: 'expense',
        frequency: 'monthly',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2023-01-01')),
        nextDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
        isActive: true
      },
      {
        name: 'Gym Membership',
        amount: 2000,
        category: 'Healthcare',
        type: 'expense',
        frequency: 'monthly',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2023-02-01')),
        nextDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
        isActive: true
      },
      {
        name: 'Salary',
        amount: 75000,
        category: 'Salary',
        type: 'income',
        frequency: 'monthly',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2022-01-01')),
        nextDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)),
        isActive: true
      },
      {
        name: 'SIP - Mutual Fund',
        amount: 10000,
        category: 'Investments',
        type: 'expense',
        frequency: 'monthly',
        startDate: firebase.firestore.Timestamp.fromDate(new Date('2022-06-01')),
        nextDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)),
        isActive: true
      }
    ];

    const batch = firebase.firestore().batch();
    recurring.forEach(item => {
      const docRef = firebase.firestore().collection('recurring').doc();
      batch.set(docRef, {
        ...item,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Generate sample trip groups
   */
  async generateSampleTripGroups(userId) {
    const tripGroups = [
      {
        name: 'Goa Beach Trip',
        description: 'Weekend getaway with friends',
        startDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        endDate: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 33 * 24 * 60 * 60 * 1000)),
        budget: 50000,
        spent: 12000,
        members: [
          { name: 'You', email: firebase.auth().currentUser?.email || 'you@example.com', isAdmin: true },
          { name: 'Rahul', email: 'rahul@example.com', isAdmin: false },
          { name: 'Priya', email: 'priya@example.com', isAdmin: false }
        ],
        currency: 'INR',
        isActive: true
      }
    ];

    const batch = firebase.firestore().batch();
    tripGroups.forEach(trip => {
      const docRef = firebase.firestore().collection('tripGroups').doc();
      batch.set(docRef, {
        ...trip,
        userId,
        isSampleData: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  /**
   * Clear all sample data
   */
  async clearSampleData(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const collections = [
        'expenses', 'income', 'budgets', 'goals', 
        'vehicles', 'houses', 'houseHelp', 'healthcareInsurance',
        'investments', 'loans', 'creditCards', 'notes', 
        'recurring', 'tripGroups'
      ];
      
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
