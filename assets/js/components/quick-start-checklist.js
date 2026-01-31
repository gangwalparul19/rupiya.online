// Quick Start Checklist Component
// Guides new users through essential first steps

import { auth, db } from '../config/firebase-config.js';
import { collection, query, where, limit, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class QuickStartChecklist {
  constructor() {
    this.tasks = [
      {
        id: 'add-expense',
        title: 'Add Your First Expense',
        description: 'Track where your money goes',
        icon: '💸',
        action: 'expenses.html',
        checkFunction: () => this.hasExpenses()
      },
      {
        id: 'add-income',
        title: 'Record Your Income',
        description: 'Log your earnings and salary',
        icon: '💰',
        action: 'income.html',
        checkFunction: () => this.hasIncome()
      },
      {
        id: 'create-budget',
        title: 'Set Up a Budget',
        description: 'Control your spending with limits',
        icon: '📊',
        action: 'budgets.html',
        checkFunction: () => this.hasBudgets()
      },
      {
        id: 'create-goal',
        title: 'Create a Savings Goal',
        description: 'Set a target to work towards',
        icon: '🎯',
        action: 'goals.html',
        checkFunction: () => this.hasGoals()
      },
      {
        id: 'explore-dashboard',
        title: 'Explore Your Dashboard',
        description: 'See your financial overview',
        icon: '📈',
        action: 'dashboard.html',
        checkFunction: () => this.hasVisitedDashboard()
      }
    ];

    this.completedTasks = new Set();
    this.isMinimized = true; // Start minimized by default
    this.isDismissed = false;
    this.loadState();
  }

  /**
   * Initialize the checklist widget
   */
  async init() {
    // Don't show if dismissed or all tasks completed
    if (this.isDismissed || this.isAllComplete()) {
      return;
    }

    // Check if user is new (registered within last 7 days)
    const isNewUser = await this.isNewUser();
    if (!isNewUser) {
      return;
    }

    // Update task completion status
    await this.updateTaskStatus();

    // Render the widget (will be minimized by default from constructor)
    this.render();

    // Check for completion
    if (this.isAllComplete() && !this.hasShownCelebration()) {
      this.showCelebration();
    }
  }

  /**
   * Check if user is new (within 7 days of registration)
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

      return daysSinceRegistration <= 7;
    } catch (error) {
      console.error('Error checking user age:', error);
      return true; // Show by default if error
    }
  }

  /**
   * Update task completion status
   */
  async updateTaskStatus() {
    for (const task of this.tasks) {
      const isComplete = await task.checkFunction();
      if (isComplete) {
        this.completedTasks.add(task.id);
      }
    }
    this.saveState();
  }

  /**
   * Check if user has expenses
   */
  async hasExpenses() {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        limit(1)
      );
      const snapshot = await getDocs(expensesQuery);

      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has income
   */
  async hasIncome() {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const incomeQuery = query(
        collection(db, 'income'),
        where('userId', '==', user.uid),
        limit(1)
      );
      const snapshot = await getDocs(incomeQuery);

      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has budgets
   */
  async hasBudgets() {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const budgetsQuery = query(
        collection(db, 'budgets'),
        where('userId', '==', user.uid),
        limit(1)
      );
      const snapshot = await getDocs(budgetsQuery);

      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has goals
   */
  async hasGoals() {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const goalsQuery = query(
        collection(db, 'goals'),
        where('userId', '==', user.uid),
        limit(1)
      );
      const snapshot = await getDocs(goalsQuery);

      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if user has visited dashboard
   */
  hasVisitedDashboard() {
    const visited = localStorage.getItem('rupiya_visited_dashboard');
    return visited === 'true';
  }

  /**
   * Mark dashboard as visited
   */
  static markDashboardVisited() {
    localStorage.setItem('rupiya_visited_dashboard', 'true');
  }

  /**
   * Calculate progress percentage
   */
  getProgress() {
    return Math.round((this.completedTasks.size / this.tasks.length) * 100);
  }

  /**
   * Check if all tasks are complete
   */
  isAllComplete() {
    return this.completedTasks.size === this.tasks.length;
  }

  /**
   * Render the widget
   */
  render() {
    // Remove existing widget
    const existing = document.getElementById('quickStartWidget');
    if (existing) {
      existing.remove();
    }

    const widget = document.createElement('div');
    widget.id = 'quickStartWidget';
    widget.className = `quick-start-widget ${this.isMinimized ? 'minimized' : ''}`;

    const progress = this.getProgress();

    widget.innerHTML = `
      <div class="quick-start-header">
        <h3>
          <span>🚀</span>
          <span>Quick Start</span>
        </h3>
        <p>${this.completedTasks.size} of ${this.tasks.length} completed</p>
        <button class="quick-start-toggle" id="quickStartToggle" aria-label="Toggle checklist">
          ${this.isMinimized ? '📋' : '−'}
        </button>
        <button class="quick-start-close" id="quickStartClose" aria-label="Close checklist">×</button>
      </div>

      <div class="quick-start-progress">
        <div class="quick-start-progress-bar">
          <div class="quick-start-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="quick-start-progress-text">${progress}% Complete</div>
      </div>

      <div class="quick-start-content">
        <div class="quick-start-tasks">
          ${this.tasks.map(task => this.renderTask(task)).join('')}
        </div>
      </div>

      <div class="quick-start-footer">
        <div class="quick-start-footer-text">
          Complete all tasks to unlock your achievement! 🏆
        </div>
      </div>
    `;

    document.body.appendChild(widget);
    this.bindEvents();
  }

  /**
   * Render a single task
   */
  renderTask(task) {
    const isComplete = this.completedTasks.has(task.id);

    return `
      <div class="quick-start-task ${isComplete ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="quick-start-task-checkbox"></div>
        <div class="quick-start-task-info">
          <div class="quick-start-task-title">${task.icon} ${task.title}</div>
          <div class="quick-start-task-description">${task.description}</div>
          ${!isComplete ? `
            <div class="quick-start-task-action">
              <a href="${task.action}" class="btn btn-primary btn-sm">Start</a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    const toggleBtn = document.getElementById('quickStartToggle');
    const closeBtn = document.getElementById('quickStartClose');

    toggleBtn?.addEventListener('click', () => this.toggle());
    closeBtn?.addEventListener('click', () => this.dismiss());

    // Click on minimized widget to expand
    const widget = document.getElementById('quickStartWidget');
    if (this.isMinimized) {
      widget?.addEventListener('click', () => {
        if (this.isMinimized) {
          this.toggle();
        }
      });
    }
  }

  /**
   * Toggle minimize/expand
   */
  toggle() {
    this.isMinimized = !this.isMinimized;
    this.saveState();
    this.render();
  }

  /**
   * Dismiss the widget
   */
  dismiss() {
    this.isDismissed = true;
    this.saveState();

    const widget = document.getElementById('quickStartWidget');
    if (widget) {
      widget.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => widget.remove(), 300);
    }
  }

  /**
   * Show celebration animation
   */
  showCelebration() {
    // Mark as shown
    localStorage.setItem('rupiya_checklist_celebration_shown', 'true');

    // Create confetti
    const celebration = document.createElement('div');
    celebration.className = 'quick-start-celebration';

    const colors = ['#667eea', '#764ba2', '#fbbf24', '#f59e0b', '#22c55e', '#ef4444'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      celebration.appendChild(confetti);
    }

    document.body.appendChild(celebration);

    // Show achievement toast
    this.showToast('🎉 Congratulations! You\'ve completed the Quick Start guide!');

    // Remove after animation
    setTimeout(() => celebration.remove(), 3000);
  }

  /**
   * Check if celebration has been shown
   */
  hasShownCelebration() {
    return localStorage.getItem('rupiya_checklist_celebration_shown') === 'true';
  }

  /**
   * Show toast notification
   */
  showToast(message) {
    // Use existing toast system if available
    if (window.showToast) {
      window.showToast(message, 'success');
    } else {
      alert(message);
    }
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      localStorage.setItem('rupiya_quick_start_state', JSON.stringify({
        completedTasks: Array.from(this.completedTasks),
        isMinimized: this.isMinimized,
        isDismissed: this.isDismissed,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Error saving checklist state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('rupiya_quick_start_state');
      if (saved) {
        const state = JSON.parse(saved);
        this.completedTasks = new Set(state.completedTasks || []);
        this.isMinimized = state.isMinimized || false;
        this.isDismissed = state.isDismissed || false;
      }
    } catch (error) {
      console.error('Error loading checklist state:', error);
    }
  }

  /**
   * Reset checklist (for testing)
   */
  reset() {
    this.completedTasks.clear();
    this.isMinimized = false;
    this.isDismissed = false;
    localStorage.removeItem('rupiya_quick_start_state');
    localStorage.removeItem('rupiya_checklist_celebration_shown');
    localStorage.removeItem('rupiya_visited_dashboard');
    
    // Remove widget if exists
    const widget = document.getElementById('quickStartWidget');
    if (widget) {
      widget.remove();
    }
  }

  /**
   * Force show checklist (for testing)
   */
  forceShow() {
    this.isDismissed = false;
    this.saveState();
    this.render();
  }
}

// Create and export singleton instance
const quickStartChecklist = new QuickStartChecklist();
export default quickStartChecklist;
