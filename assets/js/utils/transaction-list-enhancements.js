/**
 * Transaction List Enhancements
 * Adds filtering, sorting, and interactive features to transaction lists
 */

class TransactionListEnhancer {
  constructor() {
    this.transactions = [];
    this.filteredTransactions = [];
    this.filters = {
      type: 'all', // all, expense, income, split
      category: 'all',
      dateRange: 'all', // all, today, week, month
      searchTerm: ''
    };
  }

  /**
   * Initialize transaction list with enhancements
   * @param {string} containerId - ID of the container element
   * @param {array} transactions - Array of transaction objects
   */
  init(containerId, transactions = []) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.transactions = transactions;
    this.filteredTransactions = [...transactions];

    this.setupFilters();
    this.render();
  }

  /**
   * Setup filter UI
   */
  setupFilters() {
    if (!this.container) return;

    // Create filter container if not exists
    let filterContainer = this.container.querySelector('.transaction-filters');
    if (!filterContainer) {
      filterContainer = document.createElement('div');
      filterContainer.className = 'transaction-filters';
      this.container.insertBefore(filterContainer, this.container.firstChild);
    }

    // Clear existing filters
    filterContainer.innerHTML = '';

    // Add filter buttons
    const filterOptions = [
      { label: 'All', value: 'all', type: 'type' },
      { label: 'Expenses', value: 'expense', type: 'type' },
      { label: 'Income', value: 'income', type: 'type' },
      { label: 'Splits', value: 'split', type: 'type' },
      { label: 'This Month', value: 'month', type: 'dateRange' },
      { label: 'This Week', value: 'week', type: 'dateRange' }
    ];

    filterOptions.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'transaction-filter-btn';
      btn.textContent = option.label;
      btn.dataset.filterType = option.type;
      btn.dataset.filterValue = option.value;

      if (this.filters[option.type] === option.value) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', () => {
        this.setFilter(option.type, option.value);
        this.updateFilterButtons();
        this.applyFilters();
        this.render();
      });

      filterContainer.appendChild(btn);
    });
  }

  /**
   * Update filter button states
   */
  updateFilterButtons() {
    const buttons = this.container.querySelectorAll('.transaction-filter-btn');
    buttons.forEach(btn => {
      const filterType = btn.dataset.filterType;
      const filterValue = btn.dataset.filterValue;
      
      if (this.filters[filterType] === filterValue) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Set filter value
   */
  setFilter(filterType, value) {
    this.filters[filterType] = value;
  }

  /**
   * Apply all active filters
   */
  applyFilters() {
    this.filteredTransactions = this.transactions.filter(transaction => {
      // Type filter
      if (this.filters.type !== 'all' && transaction.type !== this.filters.type) {
        return false;
      }

      // Category filter
      if (this.filters.category !== 'all' && transaction.category !== this.filters.category) {
        return false;
      }

      // Date range filter
      if (this.filters.dateRange !== 'all') {
        const transactionDate = new Date(transaction.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (this.filters.dateRange === 'today') {
          const transDate = new Date(transactionDate);
          transDate.setHours(0, 0, 0, 0);
          if (transDate.getTime() !== today.getTime()) return false;
        } else if (this.filters.dateRange === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (transactionDate < weekAgo) return false;
        } else if (this.filters.dateRange === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (transactionDate < monthAgo) return false;
        }
      }

      // Search filter
      if (this.filters.searchTerm) {
        const searchLower = this.filters.searchTerm.toLowerCase();
        const description = (transaction.description || '').toLowerCase();
        const category = (transaction.category || '').toLowerCase();
        
        if (!description.includes(searchLower) && !category.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Search transactions
   */
  search(searchTerm) {
    this.filters.searchTerm = searchTerm;
    this.applyFilters();
    this.render();
  }

  /**
   * Render transaction list
   */
  render() {
    if (!this.container) return;

    const listContainer = this.container.querySelector('.transaction-list') || this.container;

    if (this.filteredTransactions.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state transactions-empty">
          <div class="empty-state-icon">📊</div>
          <h3 class="empty-state-title">No transactions found</h3>
          <p class="empty-state-text">Try adjusting your filters or add a new transaction.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.filteredTransactions
      .map(transaction => this.renderTransaction(transaction))
      .join('');

    // Add event listeners
    this.attachEventListeners();
  }

  /**
   * Render single transaction item
   */
  renderTransaction(transaction) {
    const date = new Date(transaction.date);
    const dateStr = this.formatDate(date);
    const amountClass = transaction.type === 'income' ? 'income' : 'expense';
    const amountPrefix = transaction.type === 'income' ? '+' : '-';
    const icon = this.getTransactionIcon(transaction.type);

    const statusBadge = transaction.status 
      ? `<span class="transaction-status ${transaction.status}">${transaction.status}</span>`
      : '';

    const categoryBadge = transaction.category
      ? `<span class="transaction-category">${transaction.category}</span>`
      : '';

    return `
      <div class="transaction-item ${transaction.type}" data-id="${transaction.id || ''}">
        <div class="transaction-icon">${icon}</div>
        <div class="transaction-details">
          <div class="transaction-title">${this.escapeHtml(transaction.description || 'Transaction')}</div>
          <div class="transaction-meta">
            <span class="transaction-meta-item">${categoryBadge}</span>
            <span class="transaction-meta-item">•</span>
            <span class="transaction-meta-item">${dateStr}</span>
            ${statusBadge ? `<span class="transaction-meta-item">${statusBadge}</span>` : ''}
          </div>
        </div>
        <div class="transaction-amount ${amountClass}">
          ${amountPrefix}${this.formatCurrency(transaction.amount)}
        </div>
        <div class="transaction-actions">
          <button class="transaction-action-btn edit" title="Edit" data-action="edit">✎</button>
          <button class="transaction-action-btn delete" title="Delete" data-action="delete">🗑</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to transaction items
   */
  attachEventListeners() {
    const items = this.container.querySelectorAll('.transaction-item');
    
    items.forEach(item => {
      // Edit button
      const editBtn = item.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const transactionId = item.dataset.id;
          this.onEdit(transactionId);
        });
      }

      // Delete button
      const deleteBtn = item.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const transactionId = item.dataset.id;
          this.onDelete(transactionId);
        });
      }

      // Click to expand details
      item.addEventListener('click', () => {
        item.classList.toggle('expanded');
      });
    });
  }

  /**
   * Get transaction icon
   */
  getTransactionIcon(type) {
    const icons = {
      expense: '💸',
      income: '💰',
      split: '🤝'
    };
    return icons[type] || '📊';
  }

  /**
   * Format date
   */
  formatDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const transDate = new Date(date);
    transDate.setHours(0, 0, 0, 0);

    if (transDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (transDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    const options = { month: 'short', day: 'numeric' };
    return transDate.toLocaleDateString('en-IN', options);
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle edit action (override in implementation)
   */
  onEdit(transactionId) {
    console.log('Edit transaction:', transactionId);
  }

  /**
   * Handle delete action (override in implementation)
   */
  onDelete(transactionId) {
    console.log('Delete transaction:', transactionId);
  }

  /**
   * Add transaction to list
   */
  addTransaction(transaction) {
    this.transactions.unshift(transaction);
    this.applyFilters();
    this.render();
  }

  /**
   * Remove transaction from list
   */
  removeTransaction(transactionId) {
    this.transactions = this.transactions.filter(t => t.id !== transactionId);
    this.applyFilters();
    this.render();
  }

  /**
   * Update transaction in list
   */
  updateTransaction(transactionId, updates) {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (transaction) {
      Object.assign(transaction, updates);
      this.applyFilters();
      this.render();
    }
  }
}

export default TransactionListEnhancer;
