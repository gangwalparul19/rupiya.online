// Sample Data Service
// Generates realistic sample financial data for new users

import { db, auth } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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

    console.log('🔍 Starting sample data generation for userId:', userId);
    console.log('🔍 Current auth user:', auth.currentUser?.uid);

    try {
      // Check if sample data already exists
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', userId),
        where('isSampleData', '==', true),
        limit(1)
      );
      const existingData = await getDocs(expensesQuery);
      
      if (!existingData.empty) {
        console.log('⚠️ Sample data already exists. Skipping generation to avoid duplicates.');
        this.isSampleDataActive = true;
        this.saveState();
        return true;
      }

      // Generate sample data for all features
      console.log('📝 Generating expenses...');
      await this.generateSampleExpenses(userId);
      console.log('✅ Expenses generated');
      
      console.log('📝 Generating income...');
      await this.generateSampleIncome(userId);
      console.log('✅ Income generated');
      
      console.log('📝 Generating budgets...');
      await this.generateSampleBudget(userId);
      console.log('✅ Budgets generated');
      
      console.log('📝 Generating goals...');
      await this.generateSampleGoal(userId);
      console.log('✅ Goals generated');
      
      console.log('📝 Generating vehicles...');
      await this.generateSampleVehicles(userId);
      console.log('✅ Vehicles generated');
      
      console.log('📝 Generating houses...');
      await this.generateSampleHouses(userId);
      console.log('✅ Houses generated');
      
      console.log('📝 Generating house help...');
      await this.generateSampleHouseHelp(userId);
      console.log('✅ House help generated');
      
      console.log('📝 Generating healthcare insurance...');
      await this.generateSampleHealthcareInsurance(userId);
      console.log('✅ Healthcare insurance generated');
      
      console.log('📝 Generating investments...');
      await this.generateSampleInvestments(userId);
      console.log('✅ Investments generated');
      
      console.log('📝 Generating loans...');
      await this.generateSampleLoans(userId);
      console.log('✅ Loans generated');
      
      console.log('📝 Generating credit cards...');
      await this.generateSampleCreditCards(userId);
      console.log('✅ Credit cards generated');
      
      console.log('📝 Generating notes...');
      await this.generateSampleNotes(userId);
      console.log('✅ Notes generated');
      
      console.log('📝 Generating recurring transactions...');
      await this.generateSampleRecurring(userId);
      console.log('✅ Recurring transactions generated');
      
      console.log('📝 Generating trip groups...');
      await this.generateSampleTripGroups(userId);
      console.log('✅ Trip groups generated');

      // Mark sample data as active
      this.isSampleDataActive = true;
      this.saveState();

      console.log('🎉 All sample data generated successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error generating sample data:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      throw error;
    }
  }

  /**
   * Generate sample expenses
   */
  async generateSampleExpenses(userId) {
    const expenses = this.getSampleExpenses();
    const batch = writeBatch(db);

    expenses.forEach(expense => {
      const docRef = doc(collection(db, 'expenses'));
      // Remove any undefined fields
      const cleanExpense = Object.fromEntries(
        Object.entries(expense).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanExpense,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        date: Timestamp.fromDate(date),
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
    const batch = writeBatch(db);

    incomes.forEach(income => {
      const docRef = doc(collection(db, 'income'));
      // Remove any undefined fields
      const cleanIncome = Object.fromEntries(
        Object.entries(income).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanIncome,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        date: Timestamp.fromDate(date),
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
    const batch = writeBatch(db);

    budgets.forEach(budget => {
      const docRef = doc(collection(db, 'budgets'));
      // Remove any undefined fields
      const cleanBudget = Object.fromEntries(
        Object.entries(budget).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanBudget,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
    const goals = [
      {
        name: 'Emergency Fund',
        targetAmount: 100000,
        currentAmount: 45000,
        deadline: Timestamp.fromDate(
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months from now
        ),
        category: 'Savings',
        description: 'Build emergency fund for 6 months expenses',
        status: 'active'
      },
      {
        name: 'Vacation to Goa',
        targetAmount: 50000,
        currentAmount: 18000,
        deadline: Timestamp.fromDate(
          new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) // 4 months from now
        ),
        category: 'Travel',
        description: 'Family vacation to Goa',
        status: 'active'
      },
      {
        name: 'New Laptop',
        targetAmount: 80000,
        currentAmount: 25000,
        deadline: Timestamp.fromDate(
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months from now
        ),
        category: 'Shopping',
        description: 'Upgrade to new MacBook',
        status: 'active'
      }
    ];

    const batch = writeBatch(db);
    goals.forEach(goal => {
      const docRef = doc(collection(db, 'goals'));
      // Remove any undefined fields
      const cleanGoal = Object.fromEntries(
        Object.entries(goal).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanGoal,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
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
        fuelType: 'Petrol',
        registrationNumber: 'MH-02-AB-1234',
        currentMileage: 45000,
        purchaseDate: Timestamp.fromDate(new Date('2020-03-15')),
        purchasePrice: 1200000,
        currentValue: 850000,
        insuranceExpiry: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        insuranceProvider: 'HDFC ERGO',
        insurancePremium: 18500,
        notes: 'Family car, well maintained'
      },
      {
        name: 'Honda Activa',
        type: 'Two Wheeler',
        fuelType: 'Petrol',
        registrationNumber: 'MH-02-CD-5678',
        currentMileage: 12000,
        purchaseDate: Timestamp.fromDate(new Date('2021-06-20')),
        purchasePrice: 75000,
        currentValue: 55000,
        insuranceExpiry: Timestamp.fromDate(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)),
        insuranceProvider: 'ICICI Lombard',
        insurancePremium: 3500,
        notes: 'Daily commute'
      }
    ];

    const batch = writeBatch(db);
    const vehicleIds = [];
    
    vehicles.forEach(vehicle => {
      const docRef = doc(collection(db, 'vehicles'));
      vehicleIds.push(docRef.id);
      // Remove any undefined fields
      const cleanVehicle = Object.fromEntries(
        Object.entries(vehicle).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanVehicle,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();

    // Generate fuel logs for vehicles
    await this.generateSampleFuelLogs(userId, vehicleIds, vehicles);
  }

  /**
   * Generate sample fuel logs for vehicles
   */
  async generateSampleFuelLogs(userId, vehicleIds, vehicles) {
    const fuelLogs = [];
    const today = new Date();

    // Fuel logs for Honda City (vehicleIds[0])
    const cityLogs = [
      { daysAgo: 5, liters: 40, cost: 4200, odometer: 45000 },
      { daysAgo: 15, liters: 38, cost: 3990, odometer: 44550 },
      { daysAgo: 25, liters: 42, cost: 4410, odometer: 44100 },
      { daysAgo: 35, liters: 40, cost: 4200, odometer: 43650 }
    ];

    cityLogs.forEach(log => {
      const date = new Date(today);
      date.setDate(date.getDate() - log.daysAgo);
      fuelLogs.push({
        vehicleId: vehicleIds[0],
        vehicleName: vehicles[0].name,
        date: Timestamp.fromDate(date),
        liters: log.liters,
        costPerLiter: log.cost / log.liters,
        totalCost: log.cost,
        odometerReading: log.odometer,
        fuelType: 'Petrol',
        userId,
        isSampleData: true
      });
    });

    // Fuel logs for Honda Activa (vehicleIds[1])
    const activaLogs = [
      { daysAgo: 7, liters: 4, cost: 420, odometer: 12000 },
      { daysAgo: 17, liters: 4, cost: 420, odometer: 11850 },
      { daysAgo: 27, liters: 4, cost: 420, odometer: 11700 }
    ];

    activaLogs.forEach(log => {
      const date = new Date(today);
      date.setDate(date.getDate() - log.daysAgo);
      fuelLogs.push({
        vehicleId: vehicleIds[1],
        vehicleName: vehicles[1].name,
        date: Timestamp.fromDate(date),
        liters: log.liters,
        costPerLiter: log.cost / log.liters,
        totalCost: log.cost,
        odometerReading: log.odometer,
        fuelType: 'Petrol',
        userId,
        isSampleData: true
      });
    });

    // Save fuel logs
    const batch = writeBatch(db);
    fuelLogs.forEach(log => {
      const docRef = doc(collection(db, 'fuelLogs'));
      // Remove any undefined fields
      const cleanLog = Object.fromEntries(
        Object.entries(log).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanLog,
        createdAt: serverTimestamp()
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
        purchaseDate: Timestamp.fromDate(new Date('2018-01-15')),
        purchasePrice: 5500000,
        currentValue: 7200000,
        area: 1200,
        areaUnit: 'sqft',
        hasLoan: true,
        loanAmount: 2500000,
        monthlyEMI: 35000
      }
    ];

    const batch = writeBatch(db);
    houses.forEach(house => {
      const docRef = doc(collection(db, 'houses'));
      // Remove any undefined fields
      const cleanHouse = Object.fromEntries(
        Object.entries(house).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanHouse,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        startDate: Timestamp.fromDate(new Date('2022-06-01')),
        isActive: true
      },
      {
        name: 'Sunita Devi',
        role: 'Maid',
        salary: 5000,
        paymentFrequency: 'monthly',
        phoneNumber: '+91-9876543211',
        startDate: Timestamp.fromDate(new Date('2023-01-15')),
        isActive: true
      }
    ];

    const batch = writeBatch(db);
    houseHelp.forEach(help => {
      const docRef = doc(collection(db, 'houseHelp'));
      // Remove any undefined fields
      const cleanHelp = Object.fromEntries(
        Object.entries(help).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanHelp,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        premiumAmount: 25000,
        premiumFrequency: 'annual',
        startDate: Timestamp.fromDate(new Date('2023-04-01')),
        endDate: Timestamp.fromDate(new Date('2024-03-31')),
        renewalDate: Timestamp.fromDate(new Date('2024-03-31')),
        members: ['Self', 'Spouse', 'Child'],
        status: 'active',
        isActive: true
      },
      {
        policyName: 'Personal Accident Cover',
        provider: 'ICICI Lombard',
        policyNumber: 'IL-2023-789012',
        coverageAmount: 500000,
        premiumAmount: 5000,
        premiumFrequency: 'annual',
        startDate: Timestamp.fromDate(new Date('2023-06-15')),
        endDate: Timestamp.fromDate(new Date('2024-06-14')),
        renewalDate: Timestamp.fromDate(new Date('2024-06-14')),
        members: ['Self'],
        status: 'active',
        isActive: true
      }
    ];

    const batch = writeBatch(db);
    insurance.forEach(policy => {
      const docRef = doc(collection(db, 'insurancePolicies'));
      // Remove any undefined fields
      const cleanPolicy = Object.fromEntries(
        Object.entries(policy).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanPolicy,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        purchasePrice: 2450,
        currentPrice: 2680,
        investedAmount: 122500,
        currentValue: 134000,
        purchaseDate: Timestamp.fromDate(new Date('2023-01-15'))
      },
      {
        name: 'HDFC Bank',
        type: 'Stock',
        symbol: 'HDFCBANK',
        quantity: 100,
        purchasePrice: 1580,
        currentPrice: 1650,
        investedAmount: 158000,
        currentValue: 165000,
        purchaseDate: Timestamp.fromDate(new Date('2023-03-20'))
      },
      {
        name: 'SBI Bluechip Fund',
        type: 'Mutual Fund',
        symbol: 'SBI-BLUECHIP',
        quantity: 500,
        purchasePrice: 65,
        currentPrice: 72,
        investedAmount: 32500,
        currentValue: 36000,
        purchaseDate: Timestamp.fromDate(new Date('2022-06-10'))
      },
      {
        name: 'ICICI Prudential Equity Fund',
        type: 'Mutual Fund',
        symbol: 'ICICI-EQUITY',
        quantity: 300,
        purchasePrice: 120,
        currentPrice: 135,
        investedAmount: 36000,
        currentValue: 40500,
        purchaseDate: Timestamp.fromDate(new Date('2022-09-15'))
      },
      {
        name: 'Fixed Deposit - SBI',
        type: 'Fixed Deposit',
        symbol: 'FD-SBI',
        quantity: 1,
        purchasePrice: 200000,
        currentPrice: 215000,
        investedAmount: 200000,
        currentValue: 215000,
        interestRate: 7.5,
        maturityDate: Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
        purchaseDate: Timestamp.fromDate(new Date('2023-06-01'))
      }
    ];

    const batch = writeBatch(db);
    investments.forEach(investment => {
      const docRef = doc(collection(db, 'investments'));
      // Remove any undefined fields
      const cleanInvestment = Object.fromEntries(
        Object.entries(investment).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanInvestment,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        startDate: Timestamp.fromDate(new Date('2018-01-15')),
        endDate: Timestamp.fromDate(new Date('2038-01-15')),
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
        startDate: Timestamp.fromDate(new Date('2020-03-15')),
        endDate: Timestamp.fromDate(new Date('2025-03-15')),
        tenure: 60,
        remainingTenure: 18
      }
    ];

    const batch = writeBatch(db);
    loans.forEach(loan => {
      const docRef = doc(collection(db, 'loans'));
      // Remove any undefined fields
      const cleanLoan = Object.fromEntries(
        Object.entries(loan).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanLoan,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        cardName: 'HDFC Regalia',
        bankName: 'HDFC Bank',
        cardType: 'Visa',
        network: 'Visa',
        lastFourDigits: '4567',
        creditLimit: 300000,
        availableCredit: 245000,
        currentBalance: 55000,
        currentDue: 55000,
        dueDate: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
        billingCycle: 5,
        rewardPoints: 12500,
        rewardsProgram: 'HDFC Rewards',
        rewardsBalance: 12500,
        isActive: true
      },
      {
        cardName: 'SBI SimplyCLICK',
        bankName: 'State Bank of India',
        cardType: 'Mastercard',
        network: 'Mastercard',
        lastFourDigits: '8901',
        creditLimit: 150000,
        availableCredit: 135000,
        currentBalance: 15000,
        currentDue: 15000,
        dueDate: Timestamp.fromDate(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)),
        billingCycle: 10,
        rewardPoints: 5800,
        rewardsProgram: 'SBI Rewards',
        rewardsBalance: 5800,
        isActive: true
      }
    ];

    const batch = writeBatch(db);
    creditCards.forEach(card => {
      const docRef = doc(collection(db, 'creditCards'));
      // Remove any undefined fields
      const cleanCard = Object.fromEntries(
        Object.entries(card).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanCard,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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

    const batch = writeBatch(db);
    notes.forEach(note => {
      const docRef = doc(collection(db, 'notes'));
      // Remove any undefined fields
      const cleanNote = Object.fromEntries(
        Object.entries(note).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanNote,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
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
        paymentMethod: 'credit card',
        status: 'active',
        startDate: Timestamp.fromDate(new Date('2023-01-01')),
        nextDate: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
        isActive: true
      },
      {
        name: 'Gym Membership',
        amount: 2000,
        category: 'Healthcare',
        type: 'expense',
        frequency: 'monthly',
        paymentMethod: 'debit card',
        status: 'active',
        startDate: Timestamp.fromDate(new Date('2023-02-01')),
        nextDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
        isActive: true
      },
      {
        name: 'Salary',
        amount: 75000,
        category: 'Salary',
        type: 'income',
        frequency: 'monthly',
        paymentMethod: 'bank transfer',
        status: 'active',
        startDate: Timestamp.fromDate(new Date('2022-01-01')),
        nextDate: Timestamp.fromDate(new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)),
        isActive: true
      },
      {
        name: 'SIP - Mutual Fund',
        amount: 10000,
        category: 'Investments',
        type: 'expense',
        frequency: 'monthly',
        paymentMethod: 'bank transfer',
        status: 'active',
        startDate: Timestamp.fromDate(new Date('2022-06-01')),
        nextDate: Timestamp.fromDate(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)),
        isActive: true
      }
    ];

    const batch = writeBatch(db);
    recurring.forEach(item => {
      const docRef = doc(collection(db, 'recurringTransactions'));
      // Remove any undefined fields
      const cleanItem = Object.fromEntries(
        Object.entries(item).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanItem,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        startDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        endDate: Timestamp.fromDate(new Date(Date.now() + 33 * 24 * 60 * 60 * 1000)),
        budget: 50000,
        spent: 12000,
        members: [
          { name: 'You', email: auth.currentUser?.email || 'you@example.com', isAdmin: true },
          { name: 'Rahul', email: 'rahul@example.com', isAdmin: false },
          { name: 'Priya', email: 'priya@example.com', isAdmin: false }
        ],
        currency: 'INR',
        isActive: true
      }
    ];

    const batch = writeBatch(db);
    tripGroups.forEach(trip => {
      const docRef = doc(collection(db, 'tripGroups'));
      // Remove any undefined fields
      const cleanTrip = Object.fromEntries(
        Object.entries(trip).filter(([_, v]) => v !== undefined)
      );
      batch.set(docRef, {
        ...cleanTrip,
        userId,
        isSampleData: true,
        createdAt: serverTimestamp()
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
        'vehicles', 'houses', 'houseHelp', 'insurancePolicies',
        'investments', 'loans', 'creditCards', 'notes', 
        'recurringTransactions', 'tripGroups'
      ];
      
      let deletedCount = 0;
      let errorCount = 0;

      for (const collectionName of collections) {
        try {
          const q = query(
            collection(db, collectionName), 
            where('userId', '==', userId), 
            where('isSampleData', '==', true)
          );
          const snapshot = await getDocs(q);

          if (snapshot.empty) continue;

          // Delete in smaller batches to avoid permission issues
          const batchSize = 100;
          const docs = snapshot.docs;
          
          for (let i = 0; i < docs.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchDocs = docs.slice(i, i + batchSize);
            
            batchDocs.forEach(docSnapshot => {
              batch.delete(docSnapshot.ref);
            });

            await batch.commit();
            deletedCount += batchDocs.length;
          }

          console.log(`✅ Cleared ${docs.length} sample items from ${collectionName}`);
        } catch (error) {
          console.warn(`⚠️ Error clearing ${collectionName}:`, error.message);
          errorCount++;
          // Continue with other collections even if one fails
        }
      }

      console.log(`🎉 Sample data cleared: ${deletedCount} items deleted, ${errorCount} errors`);

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
        const user = auth.currentUser;
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
