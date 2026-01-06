// Trip Group Detail Page
import tripGroupsService from '../services/trip-groups-service.js';
import authService from '../services/auth-service.js';

class TripGroupDetailPage {
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
    console.log('Initializing Trip Group Detail Page');

    // Get group ID from URL
    const params = new URLSearchParams(window.location.search);
    this.groupId = params.get('id');

    console.log('Group ID from URL:', this.groupId);

    if (!this.groupId) {
      console.error('No group ID provided');
      window.location.href = 'trip-groups.html';
      return;
    }

    const user = await this.waitForAuth();
    if (!user) return; // Redirecting to login

    this.currentUserId = authService.getCurrentUser()?.uid;
    console.log('Current user ID:', this.currentUserId);

    this.bindEvents();
    await this.loadGroupData();
  }

  async waitForAuth() {
    // Wait for auth service to initialize
    const user = await authService.waitForAuth();

    if (!user) {
      // Not logged in, redirect to login
      window.location.href = 'login.html';
      return null;
    }

    return user;
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.detail-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Add expense button
    // Add expense button
    document.getElementById('addExpenseBtn')?.addEventListener('click', () => this.toggleExpenseSection());
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
        else if (e.target.id === 'settlementModal') this.closeSettlementModal();
        else if (e.target.id === 'addMemberModal') this.closeMemberModal();
      }
    });
  }

  async loadGroupData() {
    this.showLoading(true);

    try {
      console.log('Loading group data for group:', this.groupId);

      // Load group details
      console.log('Fetching group details...');
      const groupResult = await tripGroupsService.getGroup(this.groupId);
      console.log('Group result:', groupResult);

      if (!groupResult.success) {
        throw new Error(groupResult.error);
      }
      this.group = groupResult.data;
      console.log('Group loaded:', this.group.name);

      // Load members, expenses, settlements in parallel
      console.log('Loading members, expenses, and settlements...');
      [this.members, this.expenses, this.settlements] = await Promise.all([
        tripGroupsService.getGroupMembers(this.groupId),
        tripGroupsService.getGroupExpenses(this.groupId),
        tripGroupsService.getSettlements(this.groupId)
      ]);

      console.log('Members loaded:', this.members.length);
      console.log('Expenses loaded:', this.expenses.length);
      console.log('Settlements loaded:', this.settlements.length);

      // Calculate balances
      console.log('Calculating balances...');
      this.balances = await tripGroupsService.calculateBalances(this.groupId);
      console.log('Balances calculated:', this.balances);

      // Render everything
      console.log('Rendering UI...');
      this.renderHeader();
      this.renderBudget();
      this.renderBalances();
      this.renderExpenses();
      this.renderSettlements();
      this.renderMembers();
      this.renderAnalytics();
      this.populateFilters();
      this.populateModalSelects();

      console.log('UI rendered successfully');
    } catch (error) {
      console.error('Error loading group data:', error);
      this.showToast('Failed to load group data', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  renderHeader() {
    document.getElementById('groupName').textContent = this.group.name;
    document.title = `${this.group.name} - Rupiya`;

    const startDate = this.group.startDate?.toDate ? this.group.startDate.toDate() : null;
    const endDate = this.group.endDate?.toDate ? this.group.endDate.toDate() : null;

    let dateText = 'No dates set';
    if (startDate && endDate) {
      dateText = `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    } else if (startDate) {
      dateText = `From ${this.formatDate(startDate)}`;
    }

    // Add status badge if archived
    if (this.group.status === 'archived') {
      dateText += ' • Archived';
    }

    document.getElementById('groupDates').textContent = dateText;

    // Disable add expense button for archived groups
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
      if (this.group.status === 'archived') {
        addExpenseBtn.disabled = true;
        addExpenseBtn.title = 'Cannot add expenses to archived groups';
      } else {
        addExpenseBtn.disabled = false;
        addExpenseBtn.title = '';
      }
    }
  }

  renderBudget() {
    const budgetSection = document.getElementById('budgetSection');
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
    const simplifiedDebts = await tripGroupsService.simplifyDebts(this.groupId);

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

    list.innerHTML = this.expenses.map(expense => {
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

    // Calculate trip statistics
    const expenseCount = this.expenses.length;
    const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

    // Calculate trip duration for daily average
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
    const categories = this.group.categories || tripGroupsService.getDefaultCategories();

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
    const categories = this.group.categories || tripGroupsService.getDefaultCategories();
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
    if (section.classList.contains('show')) return;

    document.getElementById('settlementForm').reset();

    // Close other sections
    this.closeExpenseModal();
    this.closeMemberSection();

    section.classList.add('show');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeSettlementSection() {
    const section = document.getElementById('addSettlementSection');
    section.classList.remove('show');
  }

  toggleSettlementSection() {
    const section = document.getElementById('addSettlementSection');
    const isVisible = section.classList.contains('show');

    if (isVisible) {
      this.closeSettlementSection();
    } else {
      this.openSettlementSection();
    }
  }

  openMemberSection() {
    const section = document.getElementById('addMemberSection');
    if (section.classList.contains('show')) return;

    document.getElementById('memberForm').reset();

    // Close other sections
    this.closeExpenseModal();
    this.closeSettlementSection();

    section.classList.add('show');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeMemberSection() {
    const section = document.getElementById('addMemberSection');
    section.classList.remove('show');
  }

  toggleMemberSection() {
    const section = document.getElementById('addMemberSection');
    const isVisible = section.classList.contains('show');

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
      checkedMembers.forEach(cb => {
        splits.push({
          memberId: cb.value,
          amount: Math.round(splitAmount * 100) / 100
        });
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
      this.showToast('Split amounts must equal total expense', 'error');
      return;
    }

    this.setExpenseLoading(true);

    try {
      const result = await tripGroupsService.addGroupExpense(this.groupId, {
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
      const result = await tripGroupsService.recordSettlement(this.groupId, {
        fromMemberId,
        toMemberId,
        amount,
        notes
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Settlement recorded!', 'success');
      this.closeSettlementModal();
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
      const result = await tripGroupsService.addMember(this.groupId, {
        name,
        email,
        phone
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      this.showToast('Member added!', 'success');
      this.closeMemberModal();
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
    loadingState.style.display = show ? 'block' : 'none';
  }

  setExpenseLoading(loading) {
    const btn = document.getElementById('saveExpenseBtn');

    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner"></span>
        <span style="margin-left: 8px;">Saving...</span>
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = 'Save Expense';
    }
  }

  setSettlementLoading(loading) {
    const btn = document.getElementById('saveSettlementBtn');

    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner"></span>
        <span style="margin-left: 8px;">Recording...</span>
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = 'Record Settlement';
    }
  }

  setMemberLoading(loading) {
    const btn = document.getElementById('saveMemberBtn');

    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner"></span>
        <span style="margin-left: 8px;">Adding...</span>
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = 'Add Member';
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

    const confirmed = confirm(`Are you sure you want to archive "${this.group.name}"?\n\nArchived groups cannot have new expenses added, but you can still view history and record settlements.`);
    if (!confirmed) return;

    try {
      const result = await tripGroupsService.archiveGroup(this.groupId);

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
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.tripGroupDetailPage = new TripGroupDetailPage();

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
        <a href="trip-groups.html" style="display: block; margin-top: 10px;">Back to Trips</a>
      </div>
    `;
  }
});
