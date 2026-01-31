// Flat Group Detail Page
import '../services/services-init.js'; // Initialize services first
import flatGroupsService from '../services/flat-groups-service.js';
import authService from '../services/auth-service.js';
import confirmationModal from '../components/confirmation-modal.js';

class FlatGroupDetailPage {
  constructor() {
    this.groupId = null;
    this.group = null;
    this.members = [];
    this.expenses = [];
    this.settlements = [];
    this.balances = {};
    this.currentTab = 'expenses';
    this.currentUserId = null;

    this.init();
  }

  async init() {
    // Get group ID from URL
    const params = new URLSearchParams(window.location.search);
    this.groupId = params.get('id');

    if (!this.groupId) {
      console.error('No group ID provided');
      window.location.href = 'flat-groups.html';
      return;
    }

    const user = await this.waitForAuth();
    if (!user) return; // Redirecting to login

    this.currentUserId = authService.getCurrentUser()?.uid;

    this.bindEvents();
    await this.loadGroupData();
  }

  async waitForAuth() {
    // Wait for auth service to initialize
    let user;
    try {
      user = await authService.waitForAuth();
    } catch (error) {
      // Handle auth initialization errors (e.g., sessionStorage issues in restricted browsers)
      if (error.message && error.message.includes('sessionStorage')) {
        this.showBrowserCompatibilityError();
        return null;
      }
      throw error;
    }

    if (!user) {
      // Not logged in, redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `login.html?redirect=${returnUrl}`;
      return null;
    }

    // Load user profile in sidebar
    this.loadUserProfile(user);

    return user;
  }

  showBrowserCompatibilityError() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 2rem; text-align: center;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="color: #f59e0b; margin-bottom: 1rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 style="font-size: 1.5rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">Browser Compatibility Issue</h2>
          <p style="color: #6b7280; margin-bottom: 1.5rem; max-width: 500px;">
            This link needs to be opened in your default browser (Chrome, Safari, Firefox, etc.) instead of the in-app browser.
          </p>
          <p style="color: #6b7280; margin-bottom: 1.5rem; max-width: 500px; font-size: 0.9rem;">
            <strong>How to fix:</strong><br>
            1. Tap the three dots (⋮) or share icon<br>
            2. Select "Open in Browser" or "Open in Chrome/Safari"<br>
            3. Or copy the link and paste it in your browser
          </p>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button onclick="navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied! Now paste it in your browser.'))" class="btn btn-primary">Copy Link</button>
            <a href="flat-groups.html" class="btn btn-outline">Go to Flats</a>
          </div>
        </div>
      `;
    }
  }

  loadUserProfile(user) {
    if (!user) return;
    
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
      userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
    }
    
    if (userEmail) {
      userEmail.textContent = user.email || '';
    }
    
    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
      } else {
        const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
        userAvatar.textContent = initial;
      }
    }
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.detail-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Add expense button (from quick actions and FAB)
    document.getElementById('quickAddExpenseBtn')?.addEventListener('click', () => this.toggleExpenseSection());
    document.getElementById('flatFab')?.addEventListener('click', () => this.toggleExpenseSection());
    document.getElementById('closeExpenseFormBtn')?.addEventListener('click', () => this.closeExpenseModal());
    document.getElementById('cancelExpenseBtn')?.addEventListener('click', () => this.closeExpenseModal());
    document.getElementById('expenseForm')?.addEventListener('submit', (e) => this.handleExpenseSubmit(e));

    // Settings/Archive button
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.handleArchiveGroup());

    // Settle up button
    // Settle up button
    document.getElementById('settleUpBtn')?.addEventListener('click', () => this.toggleSettlementSection());
    document.getElementById('closeSettlementFormBtn')?.addEventListener('click', () => this.closeSettlementSection());
    document.getElementById('cancelSettlementBtn')?.addEventListener('click', () => this.closeSettlementSection());
    document.getElementById('settlementForm')?.addEventListener('submit', (e) => this.handleSettlementSubmit(e));

    // Add member button
    document.getElementById('addMemberBtn')?.addEventListener('click', () => this.toggleMemberSection());
    document.getElementById('closeMemberFormBtn')?.addEventListener('click', () => this.closeMemberSection());
    document.getElementById('cancelMemberBtn')?.addEventListener('click', () => this.closeMemberSection());
    document.getElementById('memberForm')?.addEventListener('submit', (e) => this.handleMemberSubmit(e));

    // Split type change - use event delegation
    document.addEventListener('change', (e) => {
      if (e.target.name === 'splitType') {
        this.updateSplitInputs();
      }
    });

    // Amount change for split calculation - use event delegation
    document.addEventListener('input', (e) => {
      if (e.target.id === 'expenseAmount') {
        this.updateSplitAmounts();
      }
    });

    // Filters
    document.getElementById('categoryFilter')?.addEventListener('change', () => this.filterExpenses());
    document.getElementById('memberFilter')?.addEventListener('change', () => this.filterExpenses());

    // Close modals on overlay click - use event delegation
    document.addEventListener('click', (e) => {
      // Check if clicked element is a modal overlay
      if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'addExpenseModal') this.closeExpenseModal();
        else if (e.target.id === 'settlementModal') this.closeSettlementSection();
        else if (e.target.id === 'addMemberModal') this.closeMemberSection();
      }
    });
  }

  async loadGroupData() {
    this.showLoading(true);

    try {
      // Load group details
      const groupResult = await flatGroupsService.getGroup(this.groupId);

      if (!groupResult.success) {
        // Check if it's an access issue
        if (groupResult.error?.includes('permission') || groupResult.error?.includes('access')) {
          this.showError('You don\'t have access to this flat group. Please check your invitation link or contact the group organizer.');
        } else {
          this.showError(`Failed to load flat group: ${groupResult.error}`);
        }
        return;
      }
      this.group = groupResult.data;

      // Check if current user is a member
      // This will also automatically accept any pending invitations for this user's email
      const isMember = await flatGroupsService.isGroupMember(this.groupId, this.currentUserId);
      
      if (!isMember) {
        this.showError('You are not a member of this flat group. Please check your invitation or contact the group organizer.');
        return;
      }
      
      // Reload members after potential invitation acceptance
      const members = await flatGroupsService.getGroupMembers(this.groupId);
      this.members = members;

      // Load expenses and settlements in parallel
      [this.expenses, this.settlements] = await Promise.all([
        flatGroupsService.getGroupExpenses(this.groupId),
        flatGroupsService.getSettlements(this.groupId)
      ]);

      // Fix totalExpenses if it's out of sync
      const actualTotal = this.expenses.reduce((sum, e) => sum + e.amount, 0);
      if (Math.abs(actualTotal - (this.group.totalExpenses || 0)) > 0.01) {
        this.group.totalExpenses = actualTotal;
        // Update in background, don't wait
        flatGroupsService.updateGroup(this.groupId, { totalExpenses: actualTotal }).catch(err => {
          console.warn('Could not update totalExpenses:', err);
        });
      }

      // Calculate balances
      this.balances = await flatGroupsService.calculateBalances(this.groupId);

      // Render everything
      this.renderHeader();
      this.renderBudget();
      this.renderBalances();
      this.renderExpenses();
      this.renderSettlements();
      this.renderMembers();
      this.renderAnalytics();
      this.populateFilters();
      this.populateModalSelects();

      // Initialize UX enhancements
      this.initializeFAB();
      this.initializeTemplates();
      this.initializeSearch();
      this.initializeFilters();
      this.initializeQuickActions();
      this.initializeKeyboardShortcuts();
    } catch (error) {
      console.error('Error loading group data:', error);
      this.showError(`Failed to load flat group details: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  showError(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 2rem; text-align: center;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="color: #dc2626; margin-bottom: 1rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 style="font-size: 1.5rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">Unable to Load Flat Group</h2>
          <p style="color: #6b7280; margin-bottom: 1.5rem; max-width: 500px;">${message}</p>
          <div style="display: flex; gap: 1rem;">
            <a href="flat-groups.html" class="btn btn-primary">Back to Flats</a>
            <button onclick="window.location.reload()" class="btn btn-outline">Retry</button>
          </div>
        </div>
      `;
    }
    this.showToast(message, 'error');
  }

  renderHeader() {
    document.getElementById('groupName').textContent = this.group.name;
    document.title = `${this.group.name} - Rupiya`;

    let addressText = this.group.address || 'No address set';
    
    if (this.group.monthlyRent && this.group.monthlyRent > 0) {
      addressText += ` • Rent: ₹${this.group.monthlyRent.toLocaleString('en-IN')}/month`;
    }

    // Add status badge if archived
    const isArchived = this.group.status === 'archived';
    if (isArchived) {
      addressText += ' • Archived';
    }

    document.getElementById('groupAddress').textContent = addressText;

    // Show settings button only for admins
    const currentUserMember = this.members.find(m => m.userId === this.currentUserId);
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn && currentUserMember && currentUserMember.isAdmin) {
      settingsBtn.style.display = 'inline-flex';
    }

    // Disable add member buttons for archived groups
    const addMemberBtn = document.getElementById('addMemberBtn');
    const quickAddMemberBtn = document.getElementById('quickAddMemberBtn');
    
    if (isArchived) {
      if (addMemberBtn) {
        addMemberBtn.disabled = true;
        addMemberBtn.title = 'Cannot add members to archived groups';
      }
      if (quickAddMemberBtn) {
        quickAddMemberBtn.disabled = true;
        quickAddMemberBtn.title = 'Cannot add members to archived groups';
      }
    }
  }

  renderBudget() {
    const budgetSection = document.getElementById('budgetSection');
    
    // Budget section is optional for flat groups
    if (!budgetSection) {
      return;
    }
    
    const budget = this.group.budget?.total || 0;

    if (budget <= 0) {
      budgetSection.style.display = 'none';
      return;
    }

    budgetSection.style.display = 'block';

    const spent = this.group.totalExpenses || 0;
    const remaining = budget - spent;
    const progress = Math.min(100, (spent / budget) * 100);

    document.getElementById('budgetAmount').textContent = `₹${spent.toLocaleString('en-IN')} / ₹${budget.toLocaleString('en-IN')}`;
    document.getElementById('budgetRemaining').textContent = remaining >= 0
      ? `₹${remaining.toLocaleString('en-IN')} remaining`
      : `₹${Math.abs(remaining).toLocaleString('en-IN')} over budget`;
    document.getElementById('budgetPercent').textContent = `${progress.toFixed(0)}%`;

    const fill = document.getElementById('budgetFill');
    fill.style.width = `${progress}%`;
    fill.className = 'budget-progress-fill ' + (progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : 'safe');
  }


  async renderBalances() {
    const grid = document.getElementById('balancesGrid');
    const debtsList = document.getElementById('debtsList');

    // Render balance cards
    grid.innerHTML = this.members.map(member => {
      const balance = this.balances[member.id] || 0;
      const balanceClass = balance > 0.01 ? 'positive' : balance < -0.01 ? 'negative' : 'settled';
      const balanceLabel = balance > 0.01 ? 'gets back' : balance < -0.01 ? 'owes' : 'settled';

      return `
        <div class="balance-card">
          <div class="balance-avatar">${member.name.charAt(0).toUpperCase()}</div>
          <div class="balance-name">${this.escapeHtml(member.name)}</div>
          <div class="balance-amount ${balanceClass}">₹${Math.abs(balance).toLocaleString('en-IN')}</div>
          <div class="balance-label">${balanceLabel}</div>
        </div>
      `;
    }).join('');

    // Render simplified debts
    const simplifiedDebts = await flatGroupsService.simplifyDebts(this.groupId);

    if (simplifiedDebts.length === 0) {
      debtsList.innerHTML = '<div class="debts-settled">✅ All settled up!</div>';
    } else {
      debtsList.innerHTML = simplifiedDebts.map(debt => `
        <div class="debt-item">
          <span class="debt-from">${this.escapeHtml(debt.fromName)}</span>
          <span class="debt-arrow">→</span>
          <span class="debt-to">${this.escapeHtml(debt.toName)}</span>
          <span class="debt-amount">₹${debt.amount.toLocaleString('en-IN')}</span>
        </div>
      `).join('');
    }
  }

  renderExpenses() {
    const list = document.getElementById('expensesList');
    const empty = document.getElementById('expensesEmpty');

    if (this.expenses.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    // Get member lookup
    const memberLookup = {};
    this.members.forEach(m => memberLookup[m.id] = m);

    // Filter out expenses with invalid data (corrupted encrypted data)
    const validExpenses = this.expenses.filter(expense => {
      return expense.amount && expense.description && expense.paidBy;
    });

    list.innerHTML = validExpenses.map(expense => {
      const paidByMember = memberLookup[expense.paidBy];
      const date = expense.date?.toDate ? expense.date.toDate() : new Date();

      return `
        <div class="expense-item" data-expense-id="${expense.id}">
          <div class="expense-main">
            <div class="expense-description">${this.escapeHtml(expense.description || 'Unknown')}</div>
            <div class="expense-meta">
              <span class="expense-category">${expense.category || 'Other'}</span>
              <span>${this.formatDate(date)}</span>
            </div>
          </div>
          <div class="expense-right">
            <div class="expense-amount">₹${(expense.amount || 0).toLocaleString('en-IN')}</div>
            <div class="expense-paid-by">Paid by ${paidByMember?.name || 'Unknown'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSettlements() {
    const list = document.getElementById('settlementsList');
    const empty = document.getElementById('settlementsEmpty');

    if (this.settlements.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    // Get member lookup
    const memberLookup = {};
    this.members.forEach(m => memberLookup[m.id] = m);

    list.innerHTML = this.settlements.map(settlement => {
      const fromMember = memberLookup[settlement.fromMemberId];
      const toMember = memberLookup[settlement.toMemberId];
      const date = settlement.date?.toDate ? settlement.date.toDate() : new Date();

      return `
        <div class="settlement-item">
          <div class="settlement-parties">
            <span class="settlement-from">${fromMember?.name || 'Unknown'}</span>
            <span class="settlement-arrow">→</span>
            <span class="settlement-to">${toMember?.name || 'Unknown'}</span>
          </div>
          <div class="settlement-amount">₹${settlement.amount.toLocaleString('en-IN')}</div>
          <div class="settlement-date">${this.formatDate(date)}</div>
        </div>
      `;
    }).join('');
  }

  renderMembers() {
    const grid = document.getElementById('membersGrid');

    grid.innerHTML = this.members.map(member => {
      const balance = this.balances[member.id] || 0;
      const balanceClass = balance > 0.01 ? 'positive' : balance < -0.01 ? 'negative' : 'settled';
      const isCurrentUser = member.userId === this.currentUserId;

      // Calculate member stats
      const memberExpenses = this.expenses.filter(e => e.paidBy === member.id);
      const totalPaid = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
      const expenseCount = memberExpenses.length;

      return `
        <div class="member-card">
          <div class="member-card-header">
            <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
            <div class="member-info">
              <div class="member-name">
                ${this.escapeHtml(member.name)}
                ${member.isAdmin ? '<span class="member-crown" title="Admin">👑</span>' : ''}
                ${isCurrentUser ? '<span class="member-badge">You</span>' : ''}
              </div>
              <div class="member-role">${member.email || member.phone || 'No contact'}</div>
            </div>
          </div>
          <div class="member-kpi-grid">
            <div class="member-kpi">
              <div class="member-kpi-label">Balance</div>
              <div class="member-kpi-value ${balanceClass}">
                ${balance > 0.01 ? '+' : ''}₹${Math.abs(balance).toLocaleString('en-IN')}
              </div>
            </div>
            <div class="member-kpi">
              <div class="member-kpi-label">Paid</div>
              <div class="member-kpi-value">₹${totalPaid.toLocaleString('en-IN')}</div>
            </div>
            <div class="member-kpi">
              <div class="member-kpi-label">Expenses</div>
              <div class="member-kpi-value">${expenseCount}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAnalytics() {
    // Calculate category breakdown
    const categoryTotals = {};
    let totalExpenses = 0;

    this.expenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
      totalExpenses += expense.amount;
    });

    // Sort categories by amount
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1]);

    // Render category breakdown
    const breakdownContainer = document.getElementById('categoryBreakdown');
    if (sortedCategories.length === 0) {
      breakdownContainer.innerHTML = '<p class="empty-text">No expenses yet</p>';
    } else {
      breakdownContainer.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
        const categoryClass = category.toLowerCase().replace(/[^a-z]/g, '-');

        return `
          <div class="category-bar-item">
            <div class="category-bar-header">
              <span class="category-bar-name">${category}</span>
              <span class="category-bar-amount">₹${amount.toLocaleString('en-IN')} (${percentage.toFixed(0)}%)</span>
            </div>
            <div class="category-bar-track">
              <div class="category-bar-fill ${categoryClass}" style="width: ${percentage}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Calculate flat group statistics
    const expenseCount = this.expenses.length;
    const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

    // Calculate monthly average based on flat duration
    let dailyAvg = 0;
    if (this.group.startDate && this.group.endDate) {
      const start = this.group.startDate.toDate ? this.group.startDate.toDate() : new Date(this.group.startDate);
      const end = this.group.endDate.toDate ? this.group.endDate.toDate() : new Date(this.group.endDate);
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      dailyAvg = totalExpenses / days;
    } else if (expenseCount > 0) {
      // Use expense date range
      const dates = this.expenses.map(e => e.date?.toDate ? e.date.toDate() : new Date());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const days = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
      dailyAvg = totalExpenses / days;
    }

    const perPerson = this.members.length > 0 ? totalExpenses / this.members.length : 0;
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : '-';

    // Update stats
    document.getElementById('statTotalExpenses').textContent = `₹${totalExpenses.toLocaleString('en-IN')}`;
    document.getElementById('statExpenseCount').textContent = expenseCount;
    document.getElementById('statAvgExpense').textContent = `₹${avgExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('statDailyAvg').textContent = `₹${dailyAvg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('statPerPerson').textContent = `₹${perPerson.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    document.getElementById('statTopCategory').textContent = topCategory;
  }

  populateFilters() {
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = this.group.categories || flatGroupsService.getDefaultCategories();

    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    // Member filter
    const memberFilter = document.getElementById('memberFilter');
    memberFilter.innerHTML = '<option value="">All Members</option>' +
      this.members.map(m => `<option value="${m.id}">${this.escapeHtml(m.name)}</option>`).join('');
  }

  populateModalSelects() {
    // Expense category
    const expenseCategory = document.getElementById('expenseCategory');
    const categories = this.group.categories || flatGroupsService.getDefaultCategories();
    expenseCategory.innerHTML = '<option value="">Select category</option>' +
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    // Paid by select
    const paidBySelect = document.getElementById('expensePaidBy');
    paidBySelect.innerHTML = '<option value="">Select member</option>' +
      this.members.map(m => `<option value="${m.id}">${this.escapeHtml(m.name)}</option>`).join('');

    // Set default to current user
    const currentUserMember = this.members.find(m => m.userId === this.currentUserId);
    if (currentUserMember) {
      paidBySelect.value = currentUserMember.id;
    }

    // Settlement selects
    const settlementFrom = document.getElementById('settlementFrom');
    const settlementTo = document.getElementById('settlementTo');
    const memberOptions = '<option value="">Select member</option>' +
      this.members.map(m => `<option value="${m.id}">${this.escapeHtml(m.name)}</option>`).join('');

    settlementFrom.innerHTML = memberOptions;
    settlementTo.innerHTML = memberOptions;

    // Set default date
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];

    // Populate split members
    this.renderSplitMembers();
  }

  renderSplitMembers() {
    const container = document.getElementById('splitMembers');
    const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';

    container.innerHTML = this.members.map(member => `
      <div class="split-member-row">
        <input type="checkbox" id="split_${member.id}" value="${member.id}" checked>
        <label class="split-member-name" for="split_${member.id}">${this.escapeHtml(member.name)}</label>
        ${splitType !== 'equal' ? `
          <input type="number" class="split-member-amount" data-member-id="${member.id}" 
                 step="0.01" min="0" placeholder="${splitType === 'percentage' ? '%' : '₹'}">
        ` : ''}
      </div>
    `).join('');

    // Bind checkbox changes
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => this.updateSplitAmounts());
    });

    // Bind amount changes
    container.querySelectorAll('.split-member-amount').forEach(input => {
      input.addEventListener('input', () => this.updateSplitTotal());
    });

    this.updateSplitAmounts();
  }

  updateSplitInputs() {
    this.renderSplitMembers();
  }

  updateSplitAmounts() {
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
    const checkedMembers = document.querySelectorAll('#splitMembers input[type="checkbox"]:checked');

    if (splitType === 'equal' && checkedMembers.length > 0) {
      const splitAmount = amount / checkedMembers.length;
      document.getElementById('splitTotal').textContent = amount.toFixed(2);
    }

    this.updateSplitTotal();
  }

  updateSplitTotal() {
    const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;

    if (splitType === 'equal') {
      document.getElementById('splitTotal').textContent = amount.toFixed(2);
      return;
    }

    const inputs = document.querySelectorAll('.split-member-amount');
    let total = 0;

    inputs.forEach(input => {
      const row = input.closest('.split-member-row');
      const checkbox = row.querySelector('input[type="checkbox"]');
      if (checkbox.checked) {
        const value = parseFloat(input.value) || 0;
        if (splitType === 'percentage') {
          total += (amount * value / 100);
        } else {
          total += value;
        }
      }
    });

    document.getElementById('splitTotal').textContent = total.toFixed(2);
  }

  filterExpenses() {
    const category = document.getElementById('categoryFilter').value;
    const memberId = document.getElementById('memberFilter').value;

    let filtered = [...this.expenses];

    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }

    if (memberId) {
      filtered = filtered.filter(e =>
        e.paidBy === memberId ||
        e.splits.some(s => s.memberId === memberId)
      );
    }

    // Re-render with filtered expenses
    const originalExpenses = this.expenses;
    this.expenses = filtered;
    this.renderExpenses();
    this.expenses = originalExpenses;
  }

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.detail-tabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    document.getElementById(`${tab}Tab`)?.classList.add('active');
  }


  // Modal handlers
  // Form handlers
  toggleExpenseSection() {
    const section = document.getElementById('addExpenseSection');
    const isVisible = section.classList.contains('show');

    if (isVisible) {
      this.closeExpenseModal();
    } else {
      this.openExpenseModal();
    }
  }

  openExpenseModal() {
    // Check if section is already open
    const section = document.getElementById('addExpenseSection');
    if (section.classList.contains('show')) return;

    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];

    // Set default paid by to current user
    const currentUserMember = this.members.find(m => m.userId === this.currentUserId);
    if (currentUserMember) {
      document.getElementById('expensePaidBy').value = currentUserMember.id;
    }

    // Render split members after modal is about to open
    this.renderSplitMembers();

    // Show inline section
    section.classList.add('show');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeExpenseModal() {
    const section = document.getElementById('addExpenseSection');
    section.classList.remove('show');
  }

  openSettlementSection() {
    // Check if section is already open
    const section = document.getElementById('addSettlementSection');
    if (section.style.display === 'block' || section.classList.contains('show')) return;

    document.getElementById('settlementForm').reset();

    // Close other sections
    this.closeExpenseModal();
    this.closeMemberSection();

    section.style.display = 'block';
    section.classList.add('show');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeSettlementSection() {
    const section = document.getElementById('addSettlementSection');
    section.style.display = 'none';
    section.classList.remove('show');
  }

  toggleSettlementSection() {
    const section = document.getElementById('addSettlementSection');
    const isVisible = section.style.display === 'block' || section.classList.contains('show');

    if (isVisible) {
      this.closeSettlementSection();
    } else {
      this.openSettlementSection();
    }
  }

  openMemberSection() {
    const section = document.getElementById('addMemberSection');
    if (section.style.display === 'block' || section.classList.contains('show')) return;

    document.getElementById('memberForm').reset();

    // Close other sections
    this.closeExpenseModal();
    this.closeSettlementSection();

    section.style.display = 'block';
    section.classList.add('show');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeMemberSection() {
    const section = document.getElementById('addMemberSection');
    section.style.display = 'none';
    section.classList.remove('show');
  }

  toggleMemberSection() {
    // Don't allow adding members to archived groups
    if (this.group.status === 'archived') {
      this.showToast('Cannot add members to archived groups', 'error');
      return;
    }

    const section = document.getElementById('addMemberSection');
    const isVisible = section.style.display === 'block' || section.classList.contains('show');

    if (isVisible) {
      this.closeMemberSection();
    } else {
      this.openMemberSection();
    }
  }

  async handleExpenseSubmit(e) {
    e.preventDefault();

    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value.trim();
    const date = document.getElementById('expenseDate').value;
    const paidBy = document.getElementById('expensePaidBy').value;
    const splitType = document.querySelector('input[name="splitType"]:checked')?.value || 'equal';

    // Get selected members and their splits
    const checkedMembers = document.querySelectorAll('#splitMembers input[type="checkbox"]:checked');
    const splits = [];

    if (splitType === 'equal') {
      const splitAmount = amount / checkedMembers.length;
      const roundedSplitAmount = Math.round(splitAmount * 100) / 100;
      
      checkedMembers.forEach((cb, index) => {
        if (index === checkedMembers.length - 1) {
          // Last member gets the remainder to avoid rounding errors
          const sumSoFar = splits.reduce((sum, s) => sum + s.amount, 0);
          splits.push({
            memberId: cb.value,
            amount: Math.round((amount - sumSoFar) * 100) / 100
          });
        } else {
          splits.push({
            memberId: cb.value,
            amount: roundedSplitAmount
          });
        }
      });
    } else {
      checkedMembers.forEach(cb => {
        const row = cb.closest('.split-member-row');
        const input = row.querySelector('.split-member-amount');
        const value = parseFloat(input?.value) || 0;

        splits.push({
          memberId: cb.value,
          amount: splitType === 'percentage' ? Math.round((amount * value / 100) * 100) / 100 : value,
          percentage: splitType === 'percentage' ? value : undefined
        });
      });
    }

    // Validate splits sum
    const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
    
    if (Math.abs(splitSum - amount) > 0.01) {
      console.error('Split validation failed');
      this.showToast('Split amounts must equal total expense', 'error');
      return;
    }

    this.setExpenseLoading(true);

    try {
      const result = await flatGroupsService.addGroupExpense(this.groupId, {
        amount,
        category,
        description,
        date,
        paidBy,
        splitType,
        splits
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Expense added successfully!', 'success');
      this.closeExpenseModal();
      await this.loadGroupData();
    } catch (error) {
      console.error('Error adding expense:', error);
      this.showToast(error.message || 'Failed to add expense', 'error');
    } finally {
      this.setExpenseLoading(false);
    }
  }

  async handleSettlementSubmit(e) {
    e.preventDefault();

    const fromMemberId = document.getElementById('settlementFrom').value;
    const toMemberId = document.getElementById('settlementTo').value;
    const amount = parseFloat(document.getElementById('settlementAmount').value);
    const notes = document.getElementById('settlementNotes').value.trim();

    if (fromMemberId === toMemberId) {
      this.showToast('Payer and receiver cannot be the same', 'error');
      return;
    }

    this.setSettlementLoading(true);

    try {
      const result = await flatGroupsService.addSettlement(this.groupId, {
        fromMemberId,
        toMemberId,
        amount,
        notes
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Settlement recorded!', 'success');
      this.closeSettlementSection();
      await this.loadGroupData();
    } catch (error) {
      console.error('Error recording settlement:', error);
      this.showToast(error.message || 'Failed to record settlement', 'error');
    } finally {
      this.setSettlementLoading(false);
    }
  }

  async handleMemberSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('newMemberName').value.trim();
    const email = document.getElementById('newMemberEmail').value.trim();
    const phone = document.getElementById('newMemberPhone').value.trim();

    this.setMemberLoading(true);

    try {
      const result = await flatGroupsService.addMember(this.groupId, {
        name,
        email,
        phone
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Send invitation email if email is provided
      if (email && email.trim() !== '') {
        try {
          const currentUser = authService.getCurrentUser();
          const emailPayload = {
            members: [{ name, email, phone }],
            flatName: this.group.name,
            address: this.group.address,
            description: this.group.description,
            monthlyRent: this.group.monthlyRent,
            creatorName: currentUser.displayName || currentUser.email,
            creatorEmail: currentUser.email,
            groupId: this.groupId
          };

          const emailResponse = await fetch('/api/send-flat-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
          });

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json();
            if (emailResult.success && emailResult.sent > 0) {
              this.showToast(`✅ Member added and invitation sent to ${email}!`, 'success');
            } else {
              this.showToast('✅ Member added!', 'success');
            }
          } else {
            this.showToast('✅ Member added (email sending failed)', 'success');
          }
        } catch (emailError) {
          console.error('Error sending invitation email:', emailError);
          this.showToast('✅ Member added (email sending failed)', 'success');
        }
      } else {
        this.showToast('✅ Member added!', 'success');
      }

      this.closeMemberSection();
      await this.loadGroupData();
    } catch (error) {
      console.error('Error adding member:', error);
      this.showToast(error.message || 'Failed to add member', 'error');
    } finally {
      this.setMemberLoading(false);
    }
  }

  // Utility methods
  showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.style.display = show ? 'block' : 'none';
    }
  }

  setExpenseLoading(loading) {
    const btn = document.getElementById('saveExpenseBtn');
    if (!btn) return;

    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Saving...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || 'Add Expense';
    }
  }

  setSettlementLoading(loading) {
    const btn = document.getElementById('saveSettlementBtn');
    if (!btn) return;

    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Recording...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || 'Record Settlement';
    }
  }

  setMemberLoading(loading) {
    const btn = document.getElementById('saveMemberBtn');
    if (!btn) return;

    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Adding...';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || 'Add Member';
    }
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async handleArchiveGroup() {
    if (!this.group) return;

    if (this.group.status === 'archived') {
      this.showToast('This group is already archived', 'info');
      return;
    }

    const confirmed = await confirmationModal.show({
      title: 'Archive Group',
      message: `Are you sure you want to archive "${this.group.name}"?\n\nArchived groups cannot have new expenses added, but you can still view history and record settlements.`,
      confirmText: 'Archive',
      type: 'warning',
      icon: '📦'
    });
    if (!confirmed) return;

    try {
      const result = await flatGroupsService.archiveGroup(this.groupId);

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Group archived successfully', 'success');
      await this.loadGroupData();
    } catch (error) {
      console.error('Error archiving group:', error);
      this.showToast(error.message || 'Failed to archive group', 'error');
    }
  }

  // ============================================
  // UX ENHANCEMENTS
  // ============================================

  /**
   * Initialize Floating Action Button
   */
  initializeFAB() {
    const fab = document.getElementById('flatFab');
    if (!fab) return;

    // Click handler
    fab.addEventListener('click', () => {
      this.openExpenseModal();
    });

    // Show/hide based on scroll
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Hide FAB when scrolling down, show when scrolling up
      if (scrollTop > lastScrollTop && scrollTop > 100) {
        fab.classList.add('hidden');
      } else {
        fab.classList.remove('hidden');
      }
      
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    // Hide FAB when expense form is open
    const expenseSection = document.getElementById('addExpenseSection');
    if (expenseSection) {
      const observer = new MutationObserver(() => {
        if (expenseSection.classList.contains('show')) {
          fab.classList.add('hidden');
        } else if (this.group && this.group.status !== 'archived') {
          fab.classList.remove('hidden');
        }
      });

      observer.observe(expenseSection, { attributes: true, attributeFilter: ['class'] });
    }

    // Hide FAB if group is archived
    if (this.group && this.group.status === 'archived') {
      fab.classList.add('hidden');
    }
  }

  /**
   * Initialize Expense Templates
   */
  async initializeTemplates() {
    const { default: expenseTemplatesService } = await import('../services/expense-templates-service.js');
    
    const templatesGrid = document.getElementById('expenseTemplatesGrid');
    if (!templatesGrid) return;

    const templates = expenseTemplatesService.getDefaultTemplates();

    templatesGrid.innerHTML = templates.map(template => `
      <div class="template-chip" data-template-id="${template.id}">
        <span class="template-chip-icon">${template.icon}</span>
        <span class="template-chip-name">${template.name}</span>
      </div>
    `).join('');

    // Add click handlers
    templatesGrid.querySelectorAll('.template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const templateId = chip.dataset.templateId;
        this.applyTemplate(templateId);
        
        // Visual feedback
        templatesGrid.querySelectorAll('.template-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });
  }

  /**
   * Apply expense template
   */
  async applyTemplate(templateId) {
    const { default: expenseTemplatesService } = await import('../services/expense-templates-service.js');
    
    const template = expenseTemplatesService.getTemplate(templateId);
    if (!template) return;

    // Apply template values to form
    const categorySelect = document.getElementById('expenseCategory');
    const descriptionInput = document.getElementById('expenseDescription');
    const splitTypeRadios = document.querySelectorAll('input[name="splitType"]');

    if (categorySelect) {
      categorySelect.value = template.category;
    }

    if (descriptionInput) {
      // Only set prefix if description is empty
      if (!descriptionInput.value.trim()) {
        descriptionInput.value = template.descriptionPrefix;
      }
      descriptionInput.focus();
      // Move cursor to end
      descriptionInput.setSelectionRange(descriptionInput.value.length, descriptionInput.value.length);
    }

    if (splitTypeRadios) {
      splitTypeRadios.forEach(radio => {
        if (radio.value === template.splitType) {
          radio.checked = true;
          // Trigger change event to update split inputs
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }

    this.showToast(`Applied "${template.name}" template`, 'success');
  }

  /**
   * Initialize Search functionality
   */
  initializeSearch() {
    const searchBar = document.getElementById('expenseSearchBar');
    const searchClear = document.getElementById('expenseSearchClear');
    const searchCount = document.getElementById('expenseSearchCount');

    if (!searchBar) return;

    let searchTimeout;

    searchBar.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      // Show/hide clear button
      if (query) {
        searchClear.classList.add('visible');
      } else {
        searchClear.classList.remove('visible');
      }

      // Debounce search
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.handleSearch(query);
      }, 300);
    });

    searchClear.addEventListener('click', () => {
      searchBar.value = '';
      searchClear.classList.remove('visible');
      this.handleSearch('');
    });
  }

  /**
   * Handle search query
   */
  handleSearch(query) {
    const searchCount = document.getElementById('expenseSearchCount');
    
    if (!query) {
      // Reset to show all expenses (with current filters)
      this.applyFiltersAndSearch();
      if (searchCount) searchCount.style.display = 'none';
      return;
    }

    // Filter expenses by description
    const filtered = this.expenses.filter(expense => 
      expense.description.toLowerCase().includes(query.toLowerCase())
    );

    // Apply any active filters on top of search
    const finalFiltered = this.applyActiveFilters(filtered);

    // Update display
    this.displayFilteredExpenses(finalFiltered);

    // Show count
    if (searchCount) {
      searchCount.textContent = `${finalFiltered.length} expense${finalFiltered.length !== 1 ? 's' : ''} found`;
      searchCount.style.display = 'block';
    }
  }

  /**
   * Initialize Filter Chips
   */
  initializeFilters() {
    const filterChips = document.querySelectorAll('.filter-chip');
    const clearBtn = document.getElementById('filterClearBtn');

    this.activeFilters = new Set();

    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filterType = chip.dataset.filter;
        
        if (chip.classList.contains('active')) {
          chip.classList.remove('active');
          this.activeFilters.delete(filterType);
        } else {
          chip.classList.add('active');
          this.activeFilters.add(filterType);
        }

        this.applyFiltersAndSearch();
        this.updateClearButton();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    // Add category filter chips dynamically
    this.addCategoryFilterChips();
  }

  /**
   * Add category filter chips
   */
  addCategoryFilterChips() {
    const filterContainer = document.getElementById('expenseFilterChips');
    if (!filterContainer || !this.group) return;

    const categories = this.group.categories || [];
    const clearBtn = document.getElementById('filterClearBtn');

    // Add category chips before clear button
    categories.forEach(category => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.dataset.filter = `category:${category}`;
      chip.innerHTML = `<span>${category}</span>`;
      
      chip.addEventListener('click', () => {
        if (chip.classList.contains('active')) {
          chip.classList.remove('active');
          this.activeFilters.delete(`category:${category}`);
        } else {
          chip.classList.add('active');
          this.activeFilters.add(`category:${category}`);
        }

        this.applyFiltersAndSearch();
        this.updateClearButton();
      });

      if (clearBtn) {
        filterContainer.insertBefore(chip, clearBtn);
      } else {
        filterContainer.appendChild(chip);
      }
    });
  }

  /**
   * Apply all active filters and search
   */
  applyFiltersAndSearch() {
    const searchBar = document.getElementById('expenseSearchBar');
    const query = searchBar ? searchBar.value.trim() : '';

    let filtered = [...this.expenses];

    // Apply search first
    if (query) {
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply filters
    filtered = this.applyActiveFilters(filtered);

    // Display
    this.displayFilteredExpenses(filtered);
  }

  /**
   * Apply active filters to expense list
   */
  applyActiveFilters(expenses) {
    let filtered = [...expenses];

    this.activeFilters.forEach(filter => {
      if (filter === 'my-expenses') {
        const currentUserMember = this.members.find(m => m.userId === this.currentUserId);
        if (currentUserMember) {
          filtered = filtered.filter(e => 
            e.paidBy === currentUserMember.id ||
            e.splits.some(s => s.memberId === currentUserMember.id)
          );
        }
      } else if (filter === 'last-7-days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter(e => {
          const expenseDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
          return expenseDate >= sevenDaysAgo;
        });
      } else if (filter === 'last-30-days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(e => {
          const expenseDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
          return expenseDate >= thirtyDaysAgo;
        });
      } else if (filter.startsWith('category:')) {
        const category = filter.replace('category:', '');
        filtered = filtered.filter(e => e.category === category);
      }
    });

    return filtered;
  }

  /**
   * Display filtered expenses
   */
  displayFilteredExpenses(expenses) {
    const list = document.getElementById('expensesList');
    const empty = document.getElementById('expensesEmpty');
    const filterEmpty = document.getElementById('expensesFilterEmpty');

    if (expenses.length === 0) {
      list.innerHTML = '';
      
      // Show appropriate empty state
      if (this.expenses.length === 0) {
        empty.style.display = 'block';
        filterEmpty.style.display = 'none';
      } else {
        empty.style.display = 'none';
        filterEmpty.style.display = 'block';
      }
      return;
    }

    empty.style.display = 'none';
    filterEmpty.style.display = 'none';

    // Get member lookup
    const memberLookup = {};
    this.members.forEach(m => memberLookup[m.id] = m);

    list.innerHTML = expenses.map(expense => {
      const paidByMember = memberLookup[expense.paidBy];
      const date = expense.date?.toDate ? expense.date.toDate() : new Date();

      return `
        <div class="expense-item" data-expense-id="${expense.id}">
          <div class="expense-main">
            <div class="expense-description">${this.escapeHtml(expense.description)}</div>
            <div class="expense-meta">
              <span class="expense-category">${expense.category}</span>
              <span>${this.formatDate(date)}</span>
            </div>
          </div>
          <div class="expense-right">
            <div class="expense-amount">₹${expense.amount.toLocaleString('en-IN')}</div>
            <div class="expense-paid-by">Paid by ${paidByMember?.name || 'Unknown'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.activeFilters.clear();
    
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });

    this.applyFiltersAndSearch();
    this.updateClearButton();
  }

  /**
   * Update clear button visibility
   */
  updateClearButton() {
    const clearBtn = document.getElementById('filterClearBtn');
    if (!clearBtn) return;

    if (this.activeFilters.size > 0) {
      clearBtn.style.display = 'inline-block';
    } else {
      clearBtn.style.display = 'none';
    }
  }

  /**
   * Initialize Quick Actions
   */
  initializeQuickActions() {
    const quickAddExpense = document.getElementById('quickAddExpenseBtn');
    const quickSettleUp = document.getElementById('quickSettleUpBtn');
    const quickAddMember = document.getElementById('quickAddMemberBtn');

    if (quickAddExpense) {
      quickAddExpense.addEventListener('click', () => this.openExpenseModal());
    }

    if (quickSettleUp) {
      quickSettleUp.addEventListener('click', () => this.openSettlementSection());
    }

    if (quickAddMember) {
      quickAddMember.addEventListener('click', () => this.openMemberSection());
    }

    // Update button states based on group status
    this.updateQuickActionStates();
  }

  /**
   * Update quick action button states
   */
  updateQuickActionStates() {
    const quickAddExpense = document.getElementById('quickAddExpenseBtn');
    const quickSettleUp = document.getElementById('quickSettleUpBtn');

    if (!this.group) return;

    // Disable add expense if archived
    if (quickAddExpense) {
      if (this.group.status === 'archived') {
        quickAddExpense.disabled = true;
        quickAddExpense.title = 'Cannot add expenses to archived groups';
      } else {
        quickAddExpense.disabled = false;
        quickAddExpense.title = '';
      }
    }

    // Show "Settled" badge if fully settled
    if (quickSettleUp && this.balances) {
      const isSettled = Object.values(this.balances).every(b => Math.abs(b) < 0.01);
      if (isSettled) {
        quickSettleUp.classList.add('success');
        quickSettleUp.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Settled</span>
        `;
        quickSettleUp.disabled = true;
      }
    }
  }

  /**
   * Initialize Keyboard Shortcuts
   */
  initializeKeyboardShortcuts() {
    const shortcutsBtn = document.getElementById('shortcutsHelpBtn');
    const shortcutsModal = document.getElementById('shortcutsModal');
    const shortcutsClose = document.getElementById('shortcutsModalClose');

    // Show shortcuts modal
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => {
        shortcutsModal.classList.add('visible');
      });
    }

    // Close shortcuts modal
    if (shortcutsClose) {
      shortcutsClose.addEventListener('click', () => {
        shortcutsModal.classList.remove('visible');
      });
    }

    // Close on overlay click
    if (shortcutsModal) {
      shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
          shortcutsModal.classList.remove('visible');
        }
      });
    }

    // Keyboard event handler
    document.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      // Ignore if modal is open
      if (shortcutsModal && shortcutsModal.classList.contains('visible')) {
        if (e.key === 'Escape') {
          shortcutsModal.classList.remove('visible');
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'e':
          e.preventDefault();
          if (this.group && this.group.status !== 'archived') {
            this.openExpenseModal();
          }
          break;
        case 's':
          e.preventDefault();
          this.openSettlementSection();
          break;
        case 'm':
          e.preventDefault();
          // Don't allow adding members to archived groups
          if (this.group && this.group.status === 'archived') {
            this.showToast('Cannot add members to archived groups', 'error');
          } else {
            this.openMemberSection();
          }
          break;
        case '?':
          e.preventDefault();
          if (shortcutsModal) {
            shortcutsModal.classList.add('visible');
          }
          break;
        case 'escape':
          e.preventDefault();
          this.closeExpenseModal();
          this.closeSettlementSection();
          this.closeMemberSection();
          break;
      }
    });
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.flatGroupDetailPage = new FlatGroupDetailPage();

    // Safety check: specific fix for blank page issue
    // Ensure document is visible even if auth-guard failed to reveal it
    setTimeout(() => {
      // Force document visibility
      if (document.documentElement.style.visibility === 'hidden') {
        console.warn('Recovering from blank page state (Auth Guard timeout)');
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
      }

      // Force hide loading state just in case
      const loadingState = document.getElementById('loadingState');
      if (loadingState) {
        loadingState.style.display = 'none';
      }

      // Force main content visibility
      document.body.style.display = 'block';
      document.body.style.opacity = '1';

    }, 1000);
  } catch (error) {
    console.error('Critical initialization error:', error);
    // ... error handling code ...
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    document.getElementById('loadingState').style.display = 'none'; // Hide loading on error
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; background: #fff; text-align: center; margin-top: 50px;">
        <h1>Something went wrong</h1>
        <p>Failed to initialize page: ${error.message}</p>
        <pre style="text-align: left; background: #f0f0f0; padding: 10px; overflow: auto; max-width: 800px; margin: 20px auto;">${error.stack}</pre>
        <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Reload Page</button>
        <a href="flat-groups.html" style="display: block; margin-top: 10px;">Back to Flats</a>
      </div>
    `;
  }
});
