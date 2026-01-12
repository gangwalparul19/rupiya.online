/**
 * Feature Details Page
 * Displays detailed information about each feature with benefits and use cases
 */

import { featureConfig, FEATURE_CATEGORIES } from '../config/feature-config.js';
import toast from '../components/toast.js';

// Detailed feature information with benefits and use cases
const FEATURE_DETAILS = {
  dashboard: {
    label: 'Dashboard',
    icon: '📊',
    category: 'core',
    shortDescription: 'Your financial overview at a glance',
    longDescription: 'The Dashboard is your command center for financial management. It provides a comprehensive overview of your financial health with key metrics, recent transactions, and important alerts.',
    benefits: [
      'Get a complete snapshot of your financial status in seconds',
      'Monitor key performance indicators (KPIs) that matter to you',
      'Identify spending patterns and trends quickly',
      'Receive alerts for important financial events',
      'Track progress towards your financial goals'
    ],
    useCases: [
      'Start your day by checking your financial health',
      'Monitor budget adherence in real-time',
      'Identify unusual spending patterns',
      'Track net worth changes over time',
      'Get quick insights into your financial performance'
    ],
    features: [
      'Real-time balance updates',
      'Customizable KPI widgets',
      'Transaction summary',
      'Goal progress tracking',
      'Financial alerts and notifications'
    ],
    whyEnable: 'Essential for anyone who wants to stay on top of their finances. The dashboard gives you immediate visibility into your financial situation without needing to navigate through multiple pages.'
  },
  predictiveAnalytics: {
    label: 'Predictive Analytics',
    icon: '🔮',
    category: 'analytics',
    shortDescription: 'AI-powered forecasting and trend analysis',
    longDescription: 'Predictive Analytics uses machine learning to forecast your future spending, income, and financial trends. It helps you anticipate financial needs and make proactive decisions.',
    benefits: [
      'Forecast future spending patterns with AI accuracy',
      'Predict income trends and seasonal variations',
      'Identify potential financial risks before they occur',
      'Plan ahead with confidence based on data-driven insights',
      'Optimize your budget based on predicted trends'
    ],
    useCases: [
      'Plan for seasonal expenses (holidays, vacations)',
      'Anticipate income fluctuations',
      'Prepare for upcoming financial obligations',
      'Identify unusual spending patterns early',
      'Make informed decisions about savings and investments'
    ],
    features: [
      'Spending forecasts for next 3-6 months',
      'Income trend analysis',
      'Seasonal pattern detection',
      'Risk alerts for unusual patterns',
      'Customizable prediction models'
    ],
    whyEnable: 'Perfect for proactive financial planning. Instead of reacting to your finances, you can anticipate changes and make informed decisions ahead of time.'
  },
  aiInsights: {
    label: 'AI Insights',
    icon: '💡',
    category: 'analytics',
    shortDescription: 'Personalized spending analysis and recommendations',
    longDescription: 'AI Insights analyzes your spending behavior and provides personalized recommendations to help you save money, optimize spending, and improve your financial habits.',
    benefits: [
      'Get personalized recommendations based on your spending patterns',
      'Discover opportunities to save money',
      'Understand your spending categories better',
      'Receive actionable advice tailored to your situation',
      'Learn about your financial habits and behaviors'
    ],
    useCases: [
      'Identify unnecessary subscriptions to cancel',
      'Find categories where you\'re overspending',
      'Get tips on how to reduce specific expenses',
      'Understand your spending compared to similar users',
      'Receive alerts when spending exceeds norms'
    ],
    features: [
      'Spending category analysis',
      'Personalized savings recommendations',
      'Subscription audit',
      'Spending comparison insights',
      'Behavioral analysis and tips'
    ],
    whyEnable: 'Great for anyone looking to optimize their spending. AI Insights acts like a personal financial advisor, helping you make smarter spending decisions.'
  },
  expenses: {
    label: 'Expenses',
    icon: '💸',
    category: 'transactions',
    shortDescription: 'Track all your spending in detail',
    longDescription: 'The Expenses module lets you record, categorize, and analyze all your spending. Track where your money goes and identify areas for improvement.',
    benefits: [
      'Complete visibility into your spending habits',
      'Categorize expenses for better organization',
      'Track recurring expenses automatically',
      'Generate detailed expense reports',
      'Identify spending trends and patterns'
    ],
    useCases: [
      'Log daily expenses and purchases',
      'Track business expenses for reimbursement',
      'Monitor subscription services',
      'Analyze spending by category',
      'Create expense reports for budgeting'
    ],
    features: [
      'Quick expense entry with photos',
      'Automatic categorization',
      'Receipt scanning and storage',
      'Expense reports and analytics',
      'Recurring expense tracking'
    ],
    whyEnable: 'Essential for understanding where your money goes. Without tracking expenses, you can\'t make informed financial decisions.'
  },
  income: {
    label: 'Income',
    icon: '💰',
    category: 'transactions',
    shortDescription: 'Track all your earnings and income sources',
    longDescription: 'The Income module helps you track all sources of income including salary, freelance work, investments, and other earnings. Monitor your total income and income trends.',
    benefits: [
      'Track multiple income sources in one place',
      'Monitor income trends and growth',
      'Calculate average monthly income',
      'Plan based on reliable income data',
      'Identify seasonal income variations'
    ],
    useCases: [
      'Record monthly salary deposits',
      'Track freelance or side income',
      'Monitor investment returns',
      'Calculate total household income',
      'Plan budgets based on income forecasts'
    ],
    features: [
      'Multiple income source tracking',
      'Income categorization',
      'Income trend analysis',
      'Tax-relevant income tracking',
      'Income forecasting'
    ],
    whyEnable: 'Crucial for accurate financial planning. Knowing your reliable income helps you set realistic budgets and financial goals.'
  },
  splitExpense: {
    label: 'Split Expenses',
    icon: '👥',
    category: 'transactions',
    shortDescription: 'Share and split expenses with friends and family',
    longDescription: 'Split Expenses makes it easy to share costs with others. Track who owes whom, settle debts, and manage group expenses effortlessly.',
    benefits: [
      'Easily split bills with friends and family',
      'Automatically calculate who owes what',
      'Settle debts quickly and fairly',
      'Reduce conflicts over shared expenses',
      'Keep track of group spending'
    ],
    useCases: [
      'Split rent with roommates',
      'Divide restaurant bills among friends',
      'Share vacation expenses',
      'Split household bills',
      'Manage group trip costs'
    ],
    features: [
      'Multiple split options (equal, custom, percentage)',
      'Automatic debt calculation',
      'Settlement tracking',
      'Group expense history',
      'Payment reminders'
    ],
    whyEnable: 'Perfect for anyone who shares expenses. Eliminates confusion and makes settling debts transparent and fair.'
  },
  recurring: {
    label: 'Recurring',
    icon: '🔄',
    category: 'transactions',
    shortDescription: 'Auto-track subscriptions and EMIs',
    longDescription: 'The Recurring module automatically tracks your subscriptions, EMIs, and other recurring payments. Never miss a payment and understand your fixed obligations.',
    benefits: [
      'Automatically track all subscriptions',
      'Monitor EMI and loan payments',
      'Get reminders before payments are due',
      'Identify subscriptions you\'ve forgotten about',
      'Calculate total monthly recurring expenses'
    ],
    useCases: [
      'Track Netflix, Spotify, and other subscriptions',
      'Monitor EMI payments',
      'Track insurance premiums',
      'Manage utility bill payments',
      'Plan for fixed monthly obligations'
    ],
    features: [
      'Automatic subscription detection',
      'Payment reminders',
      'Recurring expense dashboard',
      'Subscription audit and recommendations',
      'EMI tracking and payoff calculator'
    ],
    whyEnable: 'Essential for understanding your fixed expenses. Many people forget about subscriptions; this feature helps you audit and optimize them.'
  },
  budgets: {
    label: 'Budgets',
    icon: '📈',
    category: 'planning',
    shortDescription: 'Set and manage spending budgets',
    longDescription: 'Create budgets for different spending categories and track your progress. Stay in control of your spending and achieve your financial goals.',
    benefits: [
      'Set spending limits for different categories',
      'Get alerts when approaching budget limits',
      'Track budget vs. actual spending',
      'Adjust budgets based on actual spending',
      'Achieve financial goals through disciplined spending'
    ],
    useCases: [
      'Create monthly budgets for all categories',
      'Set limits on discretionary spending',
      'Track budget adherence',
      'Plan for seasonal spending variations',
      'Teach financial discipline'
    ],
    features: [
      'Category-based budgets',
      'Budget vs. actual tracking',
      'Spending alerts and notifications',
      'Budget templates for quick setup',
      'Historical budget analysis'
    ],
    whyEnable: 'Critical for financial control. Budgets help you spend intentionally and achieve your financial goals faster.'
  },
  goals: {
    label: 'Goals',
    icon: '🎯',
    category: 'planning',
    shortDescription: 'Set and track financial milestones',
    longDescription: 'Define your financial goals and track progress towards them. Whether it\'s saving for a vacation, down payment, or retirement, Goals keeps you motivated.',
    benefits: [
      'Set clear financial targets',
      'Track progress towards goals',
      'Get motivated by visual progress indicators',
      'Calculate required monthly savings',
      'Celebrate milestones and achievements'
    ],
    useCases: [
      'Save for a vacation or travel',
      'Build emergency fund',
      'Save for down payment on a house',
      'Plan for education expenses',
      'Prepare for retirement'
    ],
    features: [
      'Goal creation with target amounts',
      'Progress tracking and visualization',
      'Automatic savings calculation',
      'Goal categories and priorities',
      'Achievement notifications'
    ],
    whyEnable: 'Powerful for motivation and long-term planning. Having clear goals helps you stay focused and make better financial decisions.'
  },
  investments: {
    label: 'Investments',
    icon: '📊',
    category: 'planning',
    shortDescription: 'Track stocks, mutual funds, and portfolio',
    longDescription: 'Monitor your investment portfolio including stocks, mutual funds, bonds, and other investments. Track performance and make informed investment decisions.',
    benefits: [
      'Track all investments in one place',
      'Monitor portfolio performance',
      'Calculate returns and gains/losses',
      'Analyze asset allocation',
      'Get investment insights and recommendations'
    ],
    useCases: [
      'Track stock portfolio',
      'Monitor mutual fund investments',
      'Track cryptocurrency holdings',
      'Analyze portfolio diversification',
      'Calculate investment returns'
    ],
    features: [
      'Multi-asset portfolio tracking',
      'Real-time price updates',
      'Performance analytics',
      'Asset allocation visualization',
      'Investment recommendations'
    ],
    whyEnable: 'Essential for anyone investing. Centralized tracking helps you make informed decisions and optimize your portfolio.'
  },
  loans: {
    label: 'Loans & EMI',
    icon: '🏦',
    category: 'planning',
    shortDescription: 'Track loans and EMI payments',
    longDescription: 'Manage all your loans and EMI payments in one place. Track outstanding amounts, payment schedules, and interest costs.',
    benefits: [
      'Track all loans and EMIs',
      'Monitor payment schedules',
      'Calculate total interest paid',
      'Plan loan payoff strategies',
      'Get payment reminders'
    ],
    useCases: [
      'Track home loan EMI',
      'Monitor car loan payments',
      'Track personal loans',
      'Plan early loan payoff',
      'Calculate total debt'
    ],
    features: [
      'Loan tracking and management',
      'EMI calculation and tracking',
      'Payment schedule visualization',
      'Interest calculation',
      'Payoff strategy planning'
    ],
    whyEnable: 'Important for debt management. Understanding your loan obligations helps you plan payoff strategies and reduce interest costs.'
  },
  transfers: {
    label: 'Transfers',
    icon: '🔄',
    category: 'planning',
    shortDescription: 'Track money transfers between accounts',
    longDescription: 'Record and track all money transfers between your accounts, to other people, or between different financial institutions.',
    benefits: [
      'Track all account transfers',
      'Monitor money movement',
      'Reconcile accounts easily',
      'Track transfers to other people',
      'Maintain complete transaction history'
    ],
    useCases: [
      'Transfer between savings and checking',
      'Send money to family members',
      'Track inter-bank transfers',
      'Monitor investment transfers',
      'Reconcile account balances'
    ],
    features: [
      'Transfer tracking',
      'Account reconciliation',
      'Transfer history and reports',
      'Recurring transfer setup',
      'Transfer notifications'
    ],
    whyEnable: 'Useful for complete financial tracking. Transfers are often overlooked but important for accurate account reconciliation.'
  },
  netWorth: {
    label: 'Net Worth',
    icon: '💎',
    category: 'planning',
    shortDescription: 'Calculate and track total net worth',
    longDescription: 'Calculate your total net worth by tracking all assets and liabilities. Monitor how your net worth changes over time.',
    benefits: [
      'Get a complete picture of your financial health',
      'Track net worth growth over time',
      'Identify areas to improve',
      'Celebrate financial milestones',
      'Plan for long-term wealth building'
    ],
    useCases: [
      'Monitor overall financial progress',
      'Track wealth accumulation',
      'Plan for retirement',
      'Analyze asset allocation',
      'Set net worth goals'
    ],
    features: [
      'Automatic net worth calculation',
      'Asset and liability tracking',
      'Net worth trend analysis',
      'Historical net worth reports',
      'Goal-based net worth planning'
    ],
    whyEnable: 'Great for understanding your overall financial position. Net worth is the ultimate measure of financial health.'
  },
  houses: {
    label: 'Houses',
    icon: '🏠',
    category: 'assets',
    shortDescription: 'Track properties and real estate',
    longDescription: 'Manage your real estate portfolio. Track property values, maintenance costs, rental income, and property details.',
    benefits: [
      'Track property values and appreciation',
      'Monitor maintenance and repair costs',
      'Track rental income',
      'Calculate property ROI',
      'Maintain property documentation'
    ],
    useCases: [
      'Track home value appreciation',
      'Monitor rental property income',
      'Track maintenance expenses',
      'Calculate property ROI',
      'Plan property improvements'
    ],
    features: [
      'Property tracking and valuation',
      'Maintenance cost tracking',
      'Rental income monitoring',
      'Property documentation storage',
      'ROI calculation'
    ],
    whyEnable: 'Essential for real estate investors. Proper tracking helps you understand property performance and make better investment decisions.'
  },
  vehicles: {
    label: 'Vehicles',
    icon: '🚗',
    category: 'assets',
    shortDescription: 'Track vehicles and maintenance',
    longDescription: 'Manage your vehicle portfolio. Track purchase prices, maintenance costs, fuel expenses, and vehicle details.',
    benefits: [
      'Track vehicle maintenance schedules',
      'Monitor fuel and service costs',
      'Calculate cost per kilometer',
      'Plan maintenance ahead',
      'Track vehicle depreciation'
    ],
    useCases: [
      'Track car maintenance schedule',
      'Monitor fuel expenses',
      'Track insurance and registration',
      'Calculate vehicle running costs',
      'Plan for vehicle replacement'
    ],
    features: [
      'Vehicle tracking and details',
      'Maintenance schedule management',
      'Fuel and service cost tracking',
      'Cost per kilometer calculation',
      'Depreciation tracking'
    ],
    whyEnable: 'Helpful for understanding true vehicle costs. Many people underestimate vehicle expenses; this feature provides clarity.'
  },
  houseHelp: {
    label: 'House Help',
    icon: '👨‍💼',
    category: 'assets',
    shortDescription: 'Track staff and household payments',
    longDescription: 'Manage payments to household staff including maids, drivers, gardeners, and other household help.',
    benefits: [
      'Track staff salaries and payments',
      'Maintain payment records',
      'Calculate total household staff costs',
      'Plan household budget',
      'Maintain compliance records'
    ],
    useCases: [
      'Track maid salary payments',
      'Monitor driver payments',
      'Track gardener and other staff',
      'Calculate total household staff costs',
      'Maintain payment history'
    ],
    features: [
      'Staff payment tracking',
      'Salary management',
      'Payment history and records',
      'Staff details and contact info',
      'Payment reminders'
    ],
    whyEnable: 'Useful for households with staff. Organized tracking ensures timely payments and maintains good records.'
  },
  tripGroups: {
    label: 'Trip Groups',
    icon: '✈️',
    category: 'social',
    shortDescription: 'Manage group trips and expenses',
    longDescription: 'Organize group trips and manage shared expenses. Track who paid what and settle debts easily.',
    benefits: [
      'Organize group trips efficiently',
      'Track shared trip expenses',
      'Automatically calculate settlements',
      'Reduce conflicts over trip costs',
      'Keep trip memories and records'
    ],
    useCases: [
      'Plan vacation with friends',
      'Organize family trips',
      'Manage group travel expenses',
      'Track accommodation and transport costs',
      'Settle trip expenses fairly'
    ],
    features: [
      'Trip creation and management',
      'Shared expense tracking',
      'Automatic settlement calculation',
      'Trip budget planning',
      'Trip history and memories'
    ],
    whyEnable: 'Perfect for group travelers. Eliminates the hassle of tracking who paid what and makes settling expenses transparent.'
  },
  notes: {
    label: 'Notes',
    icon: '📝',
    category: 'organize',
    shortDescription: 'Keep notes and reminders',
    longDescription: 'Create and organize notes for financial reminders, ideas, and important information.',
    benefits: [
      'Keep financial reminders organized',
      'Store important financial information',
      'Create action items and to-dos',
      'Organize financial ideas',
      'Quick access to important notes'
    ],
    useCases: [
      'Store financial goals and plans',
      'Keep investment ideas',
      'Create financial reminders',
      'Store important account numbers',
      'Keep financial tips and learnings'
    ],
    features: [
      'Note creation and organization',
      'Categorized notes',
      'Search and filter',
      'Note reminders',
      'Note sharing'
    ],
    whyEnable: 'Useful for staying organized. Keep all your financial thoughts and reminders in one place.'
  },
  documents: {
    label: 'Documents',
    icon: '📁',
    category: 'organize',
    shortDescription: 'Store and organize documents',
    longDescription: 'Store important financial documents including statements, receipts, insurance policies, and other documents.',
    benefits: [
      'Centralized document storage',
      'Easy document retrieval',
      'Secure document backup',
      'Organized document management',
      'Quick access to important documents'
    ],
    useCases: [
      'Store bank statements',
      'Keep insurance policies',
      'Store investment documents',
      'Keep receipts and invoices',
      'Store property and vehicle documents'
    ],
    features: [
      'Document upload and storage',
      'Document categorization',
      'Document search',
      'Secure backup',
      'Document sharing'
    ],
    whyEnable: 'Essential for organization. Having all documents in one secure place saves time and provides peace of mind.'
  }
};

class FeatureDetailsPage {
  constructor() {
    this.initialized = false;
    this.allFeatures = FEATURE_DETAILS;
    this.filteredFeatures = FEATURE_DETAILS;
    this.categories = FEATURE_CATEGORIES;
  }

  async init() {
    if (this.initialized) return;

    console.log('[FeatureDetails] Initializing...');
    
    // Mark as initialized immediately to prevent concurrent calls
    this.initialized = true;
    
    // Wait for features to load from Firebase BEFORE rendering
    // This ensures we have the correct feature data
    try {
      await featureConfig.init();
      console.log('[FeatureDetails] Features loaded from Firebase');
    } catch (error) {
      console.error('[FeatureDetails] Error loading features:', error);
    }
    
    // Now render UI with actual feature data
    this.setupEventListeners();
    this.renderStats();
    this.renderFeatures();
    this.populateCategoryFilter();
  }

  renderStats() {
    const statsContainer = document.getElementById('featureStats');
    if (!statsContainer) return;

    // Get all features from featureConfig (the actual user's features from Firebase)
    const userFeatures = featureConfig.getAllFeatures();
    
    // Count enabled features from the actual user data
    const enabledCount = Object.values(userFeatures).filter(f => f.enabled === true).length;
    const totalCount = Object.keys(userFeatures).length;
    const categoryCount = Object.keys(this.categories).length;

    console.log('[FeatureDetails] Rendering stats - enabled:', enabledCount, 'total:', totalCount);
    console.log('[FeatureDetails] User features:', userFeatures);

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <span class="stat-value">${enabledCount}</span>
          <span class="stat-label">Features Enabled</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <span class="stat-value">${totalCount}</span>
          <span class="stat-label">Total Features</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📂</div>
        <div class="stat-info">
          <span class="stat-value">${categoryCount}</span>
          <span class="stat-label">Categories</span>
        </div>
      </div>
    `;
  }

  renderFeatures() {
    const grid = document.getElementById('featuresGrid');
    if (!grid) return;

    // Group features by category
    const groupedFeatures = {};
    Object.entries(this.filteredFeatures).forEach(([key, feature]) => {
      const category = feature.category;
      if (!groupedFeatures[category]) {
        groupedFeatures[category] = [];
      }
      groupedFeatures[category].push({ key, ...feature });
    });

    // Define category order
    const categoryOrder = ['core', 'analytics', 'transactions', 'planning', 'assets', 'social', 'organize'];
    
    // Build HTML string instead of creating DOM elements one by one
    let html = '';
    
    categoryOrder.forEach(categoryKey => {
      const features = groupedFeatures[categoryKey];
      if (!features || features.length === 0) return;

      const categoryInfo = this.categories[categoryKey] || { 
        label: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), 
        icon: '📁',
        description: ''
      };

      html += `
        <div class="feature-category-section">
          <div class="category-header">
            <div class="category-header-left">
              <span class="category-icon">${categoryInfo.icon}</span>
              <div class="category-info">
                <h2 class="category-title">${categoryInfo.label}</h2>
                <p class="category-description">${categoryInfo.description}</p>
              </div>
            </div>
            <span class="category-count">${features.length} feature${features.length > 1 ? 's' : ''}</span>
          </div>
          <div class="category-features-grid">
      `;

      // Render features in this category
      features.forEach(feature => {
        const isEnabled = featureConfig.isEnabled(feature.key);
        const isRequired = featureConfig.getFeatureInfo(feature.key)?.required;
        
        html += `
          <div class="feature-card ${isEnabled ? 'enabled' : ''} ${isRequired ? 'required' : ''}">
            <div class="feature-card-header">
              <span class="feature-icon">${feature.icon}</span>
              <div class="feature-status-badges">
                ${isRequired ? '<span class="badge badge-required">Required</span>' : ''}
                <span class="badge ${isEnabled ? 'badge-enabled' : 'badge-disabled'}">${isEnabled ? '✓ Enabled' : 'Disabled'}</span>
              </div>
            </div>
            <div class="feature-card-body">
              <h3>${feature.label}</h3>
              <p class="feature-short-desc">${feature.shortDescription}</p>
              <div class="feature-benefits-preview">
                <strong>Key Benefits:</strong>
                <ul>
                  ${feature.benefits.slice(0, 2).map(b => `<li>${b}</li>`).join('')}
                </ul>
              </div>
            </div>
            <div class="feature-card-footer">
              <button class="btn btn-sm btn-primary learn-more-btn" data-feature="${feature.key}">
                Learn More
              </button>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    // If no features found after filtering
    if (Object.keys(groupedFeatures).length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No features found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
    }

    // Set all HTML at once (much faster than appending elements one by one)
    grid.innerHTML = html;

    // Add event listeners after DOM is updated
    grid.querySelectorAll('.learn-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const featureKey = e.target.dataset.feature;
        this.showFeatureDetail(featureKey);
      });
    });
  }

  showFeatureDetail(featureKey) {
    const feature = this.allFeatures[featureKey];
    if (!feature) return;

    const modal = document.getElementById('featureDetailModal');
    const modalBody = document.getElementById('modalBody');

    const isEnabled = featureConfig.isEnabled(featureKey);

    modalBody.innerHTML = `
      <div class="feature-detail-content">
        <div class="detail-header">
          <div class="detail-header-top">
            <span class="detail-icon">${feature.icon}</span>
            <div class="detail-title-section">
              <h2>${feature.label}</h2>
              <p class="detail-short-desc">${feature.shortDescription}</p>
            </div>
          </div>
          <div class="detail-status">
            <span class="status-badge ${isEnabled ? 'enabled' : 'disabled'}">
              ${isEnabled ? '✓ Enabled' : '○ Disabled'}
            </span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Overview</h3>
          <p>${feature.longDescription}</p>
        </div>

        <div class="detail-section">
          <h3>Why Enable This Feature?</h3>
          <p class="why-enable-text">${feature.whyEnable}</p>
        </div>

        <div class="detail-section">
          <h3>Key Benefits</h3>
          <ul class="benefits-list">
            ${feature.benefits.map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>

        <div class="detail-section">
          <h3>Use Cases</h3>
          <ul class="use-cases-list">
            ${feature.useCases.map(u => `<li>${u}</li>`).join('')}
          </ul>
        </div>

        <div class="detail-section">
          <h3>Features Included</h3>
          <div class="features-included">
            ${feature.features.map(f => `<div class="feature-item-tag">${f}</div>`).join('')}
          </div>
        </div>

        <div class="detail-actions">
          <button class="btn btn-primary toggle-feature-btn" data-feature="${featureKey}">
            ${isEnabled ? 'Disable Feature' : 'Enable Feature'}
          </button>
          <button class="btn btn-secondary" id="closeDetailBtn">
            Close
          </button>
        </div>
      </div>
    `;

    // Setup toggle button
    modalBody.querySelector('.toggle-feature-btn').addEventListener('click', async (e) => {
      const btn = e.target;
      const featureKey = btn.dataset.feature;
      const featureLabel = feature.label;
      const newState = !featureConfig.isEnabled(featureKey);
      
      // Store original text and show loading state
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving...';
      
      try {
        await featureConfig.toggleFeature(featureKey, newState);
        btn.textContent = newState ? 'Disable Feature' : 'Enable Feature';
        btn.classList.toggle('btn-primary');
        btn.classList.toggle('btn-danger');
        
        const statusBadge = modalBody.querySelector('.status-badge');
        statusBadge.textContent = newState ? '✓ Enabled' : '○ Disabled';
        statusBadge.classList.toggle('enabled');
        statusBadge.classList.toggle('disabled');
        
        // Show success toast
        const action = newState ? 'enabled' : 'disabled';
        toast.success(`${featureLabel} has been ${action}`);
        
        // Refresh stats and feature cards
        this.renderStats();
        this.renderFeatures();
      } catch (error) {
        console.error('Error toggling feature:', error);
        // Restore original button text on error
        btn.textContent = originalText;
        toast.error('Error updating feature. Please try again.');
      } finally {
        btn.disabled = false;
      }
    });

    // Setup close button
    modalBody.querySelector('#closeDetailBtn').addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.classList.add('active');
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('featureSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterFeatures(e.target.value, this.getCurrentCategory());
      });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterFeatures(
          document.getElementById('featureSearchInput')?.value || '',
          e.target.value
        );
      });
    }

    // Modal close button
    const modal = document.getElementById('featureDetailModal');
    const closeBtn = modal?.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    // Close modal on outside click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    }
  }

  filterFeatures(searchTerm, category) {
    this.filteredFeatures = Object.entries(this.allFeatures)
      .filter(([_, feature]) => {
        const matchesSearch = !searchTerm || 
          feature.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feature.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feature.longDescription.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !category || feature.category === category;

        return matchesSearch && matchesCategory;
      })
      .reduce((acc, [key, feature]) => {
        acc[key] = feature;
        return acc;
      }, {});

    this.renderFeatures();
  }

  getCurrentCategory() {
    return document.getElementById('categoryFilter')?.value || '';
  }

  populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    const categories = new Set();
    Object.values(this.allFeatures).forEach(feature => {
      categories.add(feature.category);
    });

    Array.from(categories).sort().forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      categoryFilter.appendChild(option);
    });
  }
}

export { FeatureDetailsPage };