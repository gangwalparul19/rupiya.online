/**
 * User Guide Page - Interactive documentation for Rupiya
 */

// Guide sections content
const guideContent = {
  'getting-started': {
    title: '🚀 Getting Started',
    subtitle: 'Set up your Rupiya account in 5 easy steps',
    content: `
      <div class="guide-intro">
        <p>Welcome to Rupiya! Follow this guide to set up your account and start managing your finances like a pro.</p>
      </div>
      
      <div class="guide-steps">
        <div class="guide-step">
          <div class="guide-step-number">1</div>
          <div class="guide-step-content">
            <h4>Create Your Account</h4>
            <p>Sign up with your email or Google account. Your data is encrypted and secure.</p>
            <a href="signup.html" class="guide-action-link">Sign Up Now →</a>
          </div>
        </div>
        
        <div class="guide-step">
          <div class="guide-step-number">2</div>
          <div class="guide-step-content">
            <h4>Add Payment Methods</h4>
            <p>Add your credit/debit cards, UPI IDs, bank accounts, and wallets. This helps track where your money goes.</p>
            <a href="profile.html?tab=payment-methods" class="guide-action-link">Add Payment Methods →</a>
          </div>
        </div>
        
        <div class="guide-step">
          <div class="guide-step-number">3</div>
          <div class="guide-step-content">
            <h4>Customize Categories</h4>
            <p>Set up expense and income categories that match your lifestyle. Default categories are provided.</p>
            <a href="profile.html?tab=categories" class="guide-action-link">Manage Categories →</a>
          </div>
        </div>
        
        <div class="guide-step">
          <div class="guide-step-number">4</div>
          <div class="guide-step-content">
            <h4>Set Your Budgets</h4>
            <p>Create monthly budgets for different categories to control your spending.</p>
            <a href="budgets.html" class="guide-action-link">Create Budgets →</a>
          </div>
        </div>
        
        <div class="guide-step">
          <div class="guide-step-number">5</div>
          <div class="guide-step-content">
            <h4>Start Tracking!</h4>
            <p>Add your first expense or income. The more you track, the better insights you'll get.</p>
            <a href="expenses.html" class="guide-action-link">Add First Expense →</a>
          </div>
        </div>
      </div>
      
      <div class="guide-tip">
        <div class="guide-tip-icon">💡</div>
        <div class="guide-tip-content">
          <strong>Pro Tip:</strong> Enable weekly email reports in Settings to get a summary of your finances every Sunday!
        </div>
      </div>
    `
  },

  'payment-methods': {
    title: '💳 Payment Methods',
    subtitle: 'Manage your cards, UPI, wallets, and bank accounts',
    content: `
      <div class="guide-intro">
        <p>Adding your payment methods helps you track exactly where your money is coming from and going to.</p>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">💳</div>
          <h4>Credit & Debit Cards</h4>
          <p>Add your cards with last 4 digits for easy identification. Track card-wise spending.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📱</div>
          <h4>UPI IDs</h4>
          <p>Add Google Pay, PhonePe, Paytm UPI IDs. Most popular payment method in India!</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🏦</div>
          <h4>Bank Accounts</h4>
          <p>Track salary credits, transfers, and direct debits from your bank accounts.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">👛</div>
          <h4>Digital Wallets</h4>
          <p>Paytm, Amazon Pay, PhonePe wallets - track all your digital money.</p>
        </div>
      </div>
      
      <div class="guide-how-to">
        <h3>How to Add a Payment Method</h3>
        <ol>
          <li>Go to <strong>Settings</strong> → <strong>Payment Methods</strong> tab</li>
          <li>Click <strong>Add Payment Method</strong></li>
          <li>Select the type (Card, UPI, Bank, Wallet)</li>
          <li>Fill in the details (only last 4 digits for security)</li>
          <li>Click <strong>Save</strong></li>
        </ol>
      </div>
      
      <a href="profile.html?tab=payment-methods" class="guide-cta-btn">Manage Payment Methods →</a>
    `
  },
  
  'categories': {
    title: '🏷️ Categories',
    subtitle: 'Organize your expenses and income',
    content: `
      <div class="guide-intro">
        <p>Categories help you understand where your money goes. Rupiya comes with default categories, but you can customize them.</p>
      </div>
      
      <div class="guide-two-col">
        <div class="guide-col">
          <h4>📤 Default Expense Categories</h4>
          <ul class="guide-category-list">
            <li>🍔 Food & Groceries</li>
            <li>🚗 Transportation</li>
            <li>🏠 Housing & Rent</li>
            <li>💡 Utilities</li>
            <li>🎬 Entertainment</li>
            <li>🛍️ Shopping</li>
            <li>🏥 Healthcare</li>
            <li>📚 Education</li>
          </ul>
        </div>
        <div class="guide-col">
          <h4>📥 Default Income Categories</h4>
          <ul class="guide-category-list">
            <li>💼 Salary</li>
            <li>💻 Freelance</li>
            <li>📈 Investments</li>
            <li>🏠 Rental Income</li>
            <li>🎁 Gifts</li>
            <li>💰 Bonus</li>
            <li>📊 Dividends</li>
            <li>🔄 Refunds</li>
          </ul>
        </div>
      </div>
      
      <div class="guide-how-to">
        <h3>How to Add Custom Categories</h3>
        <ol>
          <li>Go to <strong>Settings</strong> → <strong>Categories</strong> tab</li>
          <li>Type your new category name</li>
          <li>Click <strong>Add</strong></li>
          <li>Your category is now available when adding expenses/income</li>
        </ol>
      </div>
      
      <a href="profile.html?tab=categories" class="guide-cta-btn">Manage Categories →</a>
    `
  },

  'expenses-income': {
    title: '💰 Expenses & Income',
    subtitle: 'Track every rupee coming in and going out',
    content: `
      <div class="guide-intro">
        <p>The core of Rupiya - track all your financial transactions to get insights and control your money.</p>
      </div>
      
      <div class="guide-two-col">
        <div class="guide-col">
          <h4>💸 Adding Expenses</h4>
          <ol>
            <li>Go to <strong>Expenses</strong> page</li>
            <li>Click <strong>Add Expense</strong></li>
            <li>Enter amount, category, date</li>
            <li>Select payment method</li>
            <li>Add description (optional)</li>
            <li>Click <strong>Save</strong></li>
          </ol>
        </div>
        <div class="guide-col">
          <h4>💰 Adding Income</h4>
          <ol>
            <li>Go to <strong>Income</strong> page</li>
            <li>Click <strong>Add Income</strong></li>
            <li>Enter amount, category, date</li>
            <li>Select payment method</li>
            <li>Add description (optional)</li>
            <li>Click <strong>Save</strong></li>
          </ol>
        </div>
      </div>
      
      <div class="guide-tip">
        <div class="guide-tip-icon">💡</div>
        <div class="guide-tip-content">
          <strong>Quick Add:</strong> Use the floating + button on mobile for quick expense entry!
        </div>
      </div>
      
      <div class="guide-actions-row">
        <a href="expenses.html" class="guide-cta-btn">Add Expense →</a>
        <a href="income.html" class="guide-cta-btn secondary">Add Income →</a>
      </div>
    `
  },
  
  'budgets': {
    title: '📊 Budgets',
    subtitle: 'Set spending limits and stay on track',
    content: `
      <div class="guide-intro">
        <p>Budgets help you control spending by setting limits for each category. Get alerts when you're close to your limit.</p>
      </div>
      
      <div class="guide-how-to">
        <h3>Creating a Budget</h3>
        <ol>
          <li>Go to <strong>Budgets</strong> page</li>
          <li>Click <strong>Add Budget</strong></li>
          <li>Select a category (e.g., Food, Entertainment)</li>
          <li>Set your monthly limit</li>
          <li>Click <strong>Save</strong></li>
        </ol>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📊</div>
          <h4>Visual Progress</h4>
          <p>See how much you've spent vs your limit with progress bars.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">⚠️</div>
          <h4>Alerts</h4>
          <p>Get notified when you reach 80% or exceed your budget.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📅</div>
          <h4>Monthly Reset</h4>
          <p>Budgets automatically reset each month.</p>
        </div>
      </div>
      
      <a href="budgets.html" class="guide-cta-btn">Manage Budgets →</a>
    `
  },
  
  'goals': {
    title: '🎯 Savings Goals',
    subtitle: 'Save for what matters most',
    content: `
      <div class="guide-intro">
        <p>Set financial goals and track your progress. Whether it's an emergency fund, vacation, or new gadget!</p>
      </div>
      
      <div class="guide-how-to">
        <h3>Creating a Goal</h3>
        <ol>
          <li>Go to <strong>Goals</strong> page</li>
          <li>Click <strong>Add Goal</strong></li>
          <li>Name your goal (e.g., "Emergency Fund")</li>
          <li>Set target amount</li>
          <li>Set target date (optional)</li>
          <li>Add initial amount saved</li>
          <li>Click <strong>Save</strong></li>
        </ol>
      </div>
      
      <div class="guide-tip">
        <div class="guide-tip-icon">💡</div>
        <div class="guide-tip-content">
          <strong>Recommended:</strong> Start with an Emergency Fund goal of 3-6 months of expenses!
        </div>
      </div>
      
      <a href="goals.html" class="guide-cta-btn">Create Goals →</a>
    `
  },

  'loans-emi': {
    title: '🏦 Loans & EMI',
    subtitle: 'Track all your loans and EMI payments',
    content: `
      <div class="guide-intro">
        <p>Keep track of all your loans - home loan, car loan, personal loan, or product EMIs. Never miss a payment!</p>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🏠</div>
          <h4>Home Loans</h4>
          <p>Track your home loan EMI, outstanding amount, and tenure.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🚗</div>
          <h4>Vehicle Loans</h4>
          <p>Car, bike, or any vehicle loan tracking.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">💳</div>
          <h4>Personal Loans</h4>
          <p>Track personal loans from banks or NBFCs.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📱</div>
          <h4>Product EMIs</h4>
          <p>Phone, laptop, appliance EMIs from Bajaj, etc.</p>
        </div>
      </div>
      
      <div class="guide-how-to">
        <h3>Adding a Loan</h3>
        <ol>
          <li>Go to <strong>Loans & EMI</strong> page</li>
          <li>Click <strong>Add Loan</strong></li>
          <li>Select loan type</li>
          <li>Enter loan amount, interest rate, tenure</li>
          <li>Set EMI amount and due date</li>
          <li>Click <strong>Save</strong></li>
        </ol>
      </div>
      
      <a href="loans.html" class="guide-cta-btn">Manage Loans →</a>
    `
  },
  
  'investments': {
    title: '📈 Investments',
    subtitle: 'Track your investment portfolio',
    content: `
      <div class="guide-intro">
        <p>Monitor all your investments in one place - stocks, mutual funds, FDs, and more.</p>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📊</div>
          <h4>Stocks</h4>
          <p>Track your stock holdings and returns.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📈</div>
          <h4>Mutual Funds</h4>
          <p>SIPs and lump sum MF investments.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🏦</div>
          <h4>Fixed Deposits</h4>
          <p>Bank FDs with maturity tracking.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🥇</div>
          <h4>Gold & Others</h4>
          <p>Gold, PPF, NPS, and other investments.</p>
        </div>
      </div>
      
      <a href="investments.html" class="guide-cta-btn">Track Investments →</a>
    `
  },
  
  'properties': {
    title: '🏠 Properties',
    subtitle: 'Manage your real estate assets',
    content: `
      <div class="guide-intro">
        <p>Track your properties, their values, and maintenance expenses all in one place.</p>
      </div>
      
      <div class="guide-how-to">
        <h3>Adding a Property</h3>
        <ol>
          <li>Go to <strong>Houses</strong> page</li>
          <li>Click <strong>Add Property</strong></li>
          <li>Enter property details (name, address, type)</li>
          <li>Add purchase price and current value</li>
          <li>Track maintenance, repairs, and improvements</li>
        </ol>
      </div>
      
      <div class="guide-tip">
        <div class="guide-tip-icon">💡</div>
        <div class="guide-tip-content">
          <strong>Track Everything:</strong> Log maintenance costs, property tax, insurance, and repairs to know your true property expenses.
        </div>
      </div>
      
      <a href="houses.html" class="guide-cta-btn">Manage Properties →</a>
    `
  },

  'vehicles': {
    title: '🚗 Vehicles',
    subtitle: 'Track vehicle expenses and maintenance',
    content: `
      <div class="guide-intro">
        <p>Keep track of all your vehicle expenses - fuel, service, insurance, and more. Calculate mileage and cost per km.</p>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">⛽</div>
          <h4>Fuel Tracking</h4>
          <p>Log fuel fills with price, quantity, and odometer reading.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🔧</div>
          <h4>Service Records</h4>
          <p>Track regular services, oil changes, and repairs.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📊</div>
          <h4>Mileage Calculator</h4>
          <p>Automatic mileage calculation from fuel logs.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📋</div>
          <h4>Insurance & Tax</h4>
          <p>Track insurance renewals and road tax.</p>
        </div>
      </div>
      
      <div class="guide-how-to">
        <h3>Adding a Vehicle</h3>
        <ol>
          <li>Go to <strong>Vehicles</strong> page</li>
          <li>Click <strong>Add Vehicle</strong></li>
          <li>Enter vehicle details (name, number, type)</li>
          <li>Add purchase details</li>
          <li>Start logging fuel and service records</li>
        </ol>
      </div>
      
      <a href="vehicles.html" class="guide-cta-btn">Manage Vehicles →</a>
    `
  },
  
  'house-help': {
    title: '🧹 House Help',
    subtitle: 'Manage domestic staff payments',
    content: `
      <div class="guide-intro">
        <p>Track payments to your domestic help - maid, cook, driver, gardener, and more. Never forget a payment!</p>
      </div>
      
      <div class="guide-how-to">
        <h3>Adding House Help</h3>
        <ol>
          <li>Go to <strong>House Help</strong> page</li>
          <li>Click <strong>Add Staff</strong></li>
          <li>Enter name and role (Maid, Cook, Driver, etc.)</li>
          <li>Set monthly salary</li>
          <li>Set payment schedule (monthly, weekly)</li>
          <li>Track attendance and payments</li>
        </ol>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📅</div>
          <h4>Payment Reminders</h4>
          <p>Get reminded when payments are due.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📊</div>
          <h4>Payment History</h4>
          <p>Complete history of all payments made.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📋</div>
          <h4>Attendance</h4>
          <p>Track attendance for accurate payments.</p>
        </div>
      </div>
      
      <a href="house-help.html" class="guide-cta-btn">Manage House Help →</a>
    `
  },
  
  'family': {
    title: '👨‍👩‍👧‍👦 Family Groups',
    subtitle: 'Share finances with family members',
    content: `
      <div class="guide-intro">
        <p>Create family groups to share expenses, track combined finances, and manage household budgets together.</p>
      </div>
      
      <div class="guide-how-to">
        <h3>Creating a Family Group</h3>
        <ol>
          <li>Go to <strong>Family Groups</strong> page</li>
          <li>Click <strong>Create Group</strong></li>
          <li>Name your group (e.g., "Home")</li>
          <li>Invite family members via email</li>
          <li>Members can add shared expenses</li>
        </ol>
      </div>
      
      <div class="guide-tip">
        <div class="guide-tip-icon">💡</div>
        <div class="guide-tip-content">
          <strong>Privacy:</strong> Personal expenses remain private. Only expenses marked as "Shared" are visible to family members.
        </div>
      </div>
      
      <a href="family.html" class="guide-cta-btn">Manage Family →</a>
    `
  },

  'ai-insights': {
    title: '🤖 AI Insights',
    subtitle: 'Get personalized financial advice',
    content: `
      <div class="guide-intro">
        <p>Rupiya's AI analyzes your spending patterns and provides personalized insights to help you save more.</p>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📊</div>
          <h4>Spending Analysis</h4>
          <p>Understand where your money goes with detailed breakdowns.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">💡</div>
          <h4>Saving Tips</h4>
          <p>Get personalized tips based on your spending habits.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">⚠️</div>
          <h4>Anomaly Detection</h4>
          <p>Get alerted about unusual spending patterns.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">🎯</div>
          <h4>Goal Recommendations</h4>
          <p>AI suggests realistic savings goals based on your income.</p>
        </div>
      </div>
      
      <a href="ai-insights.html" class="guide-cta-btn">View AI Insights →</a>
    `
  },
  
  'reports': {
    title: '📧 Reports & Export',
    subtitle: 'Get summaries and export your data',
    content: `
      <div class="guide-intro">
        <p>Receive weekly/monthly email reports and export your data anytime.</p>
      </div>
      
      <div class="guide-how-to">
        <h3>Enabling Email Reports</h3>
        <ol>
          <li>Go to <strong>Settings</strong> → <strong>Preferences</strong></li>
          <li>Enable <strong>Weekly Financial Report</strong></li>
          <li>Enable <strong>Monthly Financial Report</strong></li>
          <li>Reports will be sent to your registered email</li>
        </ol>
      </div>
      
      <div class="guide-feature-grid">
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📧</div>
          <h4>Weekly Reports</h4>
          <p>Every Sunday - summary of the week with CSV attachment.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📊</div>
          <h4>Monthly Reports</h4>
          <p>1st of each month - comprehensive monthly analysis.</p>
        </div>
        <div class="guide-feature-card">
          <div class="guide-feature-icon">📥</div>
          <h4>Export Data</h4>
          <p>Download all your data as CSV anytime.</p>
        </div>
      </div>
      
      <a href="profile.html?tab=preferences" class="guide-cta-btn">Configure Reports →</a>
    `
  }
};

// Render guide content
function renderGuideContent() {
  const container = document.getElementById('guideContent');
  if (!container) return;
  
  let html = '';
  
  Object.entries(guideContent).forEach(([id, section]) => {
    html += `
      <section class="guide-section" id="${id}">
        <div class="guide-section-header">
          <h2>${section.title}</h2>
          <p class="guide-section-subtitle">${section.subtitle}</p>
        </div>
        <div class="guide-section-body">
          ${section.content}
        </div>
      </section>
    `;
  });
  
  container.innerHTML = html;
}

// Handle TOC active state on scroll
function initScrollSpy() {
  const sections = document.querySelectorAll('.guide-section');
  const tocLinks = document.querySelectorAll('.guide-toc-link');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  
  sections.forEach(section => observer.observe(section));
}

// Smooth scroll for TOC links
function initSmoothScroll() {
  document.querySelectorAll('.guide-toc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderGuideContent();
  initScrollSpy();
  initSmoothScroll();
});

// Add styles dynamically
const styles = document.createElement('style');
styles.textContent = `

  .guide-content { padding-bottom: 100px; }
  .guide-section { background: var(--bg-card); border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid var(--border-color); }
  .guide-section-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--border-color); }
  .guide-section-header h2 { margin: 0 0 8px 0; font-size: 1.75rem; color: var(--text-primary); }
  .guide-section-subtitle { margin: 0; color: var(--text-secondary); font-size: 1rem; }
  .guide-intro { font-size: 1.05rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 24px; }
  .guide-intro p { margin: 0; }
  
  .guide-steps { display: flex; flex-direction: column; gap: 16px; }
  .guide-step { display: flex; gap: 16px; padding: 20px; background: var(--bg-secondary); border-radius: 12px; }
  .guide-step-number { width: 40px; height: 40px; background: linear-gradient(135deg, #4A90E2, #00CED1); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; flex-shrink: 0; }
  .guide-step-content h4 { margin: 0 0 8px 0; font-size: 1.1rem; color: var(--text-primary); }
  .guide-step-content p { margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.95rem; }
  .guide-action-link { color: var(--primary-color); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
  .guide-action-link:hover { text-decoration: underline; }
  
  .guide-tip { display: flex; gap: 16px; padding: 20px; background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(0, 206, 209, 0.1)); border-radius: 12px; margin-top: 24px; border-left: 4px solid var(--primary-color); }
  .guide-tip-icon { font-size: 1.5rem; }
  .guide-tip-content { flex: 1; }
  .guide-tip-content strong { color: var(--text-primary); }
  
  .guide-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
  .guide-feature-card { background: var(--bg-secondary); border-radius: 12px; padding: 20px; text-align: center; transition: all 0.3s ease; }
  .guide-feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .guide-feature-icon { font-size: 2rem; margin-bottom: 12px; }
  .guide-feature-card h4 { margin: 0 0 8px 0; font-size: 1rem; color: var(--text-primary); }
  .guide-feature-card p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); }
  
  .guide-how-to { background: var(--bg-secondary); border-radius: 12px; padding: 24px; margin: 24px 0; }
  .guide-how-to h3 { margin: 0 0 16px 0; font-size: 1.1rem; color: var(--text-primary); }
  .guide-how-to ol { margin: 0; padding-left: 24px; }
  .guide-how-to li { margin-bottom: 12px; color: var(--text-secondary); line-height: 1.6; }
  .guide-how-to li strong { color: var(--text-primary); }
  
  .guide-two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin: 24px 0; }
  .guide-col h4 { margin: 0 0 16px 0; font-size: 1rem; color: var(--text-primary); }
  .guide-category-list { list-style: none; padding: 0; margin: 0; }
  .guide-category-list li { padding: 8px 12px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 8px; font-size: 0.9rem; }
  
  .guide-cta-btn { display: inline-block; background: linear-gradient(135deg, #4A90E2, #00CED1); color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-top: 16px; transition: all 0.3s ease; }
  .guide-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4); }
  .guide-cta-btn.secondary { background: var(--bg-secondary); color: var(--text-primary); }
  .guide-actions-row { display: flex; gap: 12px; flex-wrap: wrap; }
  
  @media (max-width: 1024px) {
    .guide-container { grid-template-columns: 1fr; }
    .guide-sidebar { position: relative; top: 0; }
    .guide-toc { display: flex; flex-wrap: wrap; gap: 8px; }
    .guide-toc h3 { width: 100%; }
    .guide-toc-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .guide-toc-item { margin: 0; }
    .guide-toc-link { padding: 8px 12px; background: var(--bg-secondary); border-radius: 20px; }
  }
  
  @media (max-width: 768px) {
    .guide-section { padding: 20px; }
    .guide-feature-grid, .guide-two-col { grid-template-columns: 1fr; }
    .guide-header-content { flex-direction: column; gap: 16px; text-align: center; }
    .guide-nav { justify-content: center; }
  }
`;
document.head.appendChild(styles);