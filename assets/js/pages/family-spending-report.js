// Family Spending Report Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import familyService from '../services/family-service.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';
import { formatCurrency, formatDate, exportToCSV, escapeHtml } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';

// State
const state = {
  currentFamilyGroup: null,
  selectedMonth: null,
  selectedCategory: '',
  expenses: [],
  reportData: null
};

// Category icons
const categoryIcons = {
  'Groceries': '🛒',
  'Transportation': '🚗',
  'Utilities': '💡',
  'Entertainment': '🎬',
  'Healthcare': '🏥',
  'Shopping': '🛍️',
  'Dining': '🍽️',
  'Education': '📚',
  'Other': '📦'
};

// Check authentication
async function checkAuth() {
  await authService.waitForAuth();
  if (!authService.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize page
async function init() {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  
  await initPage();
}

// Start initialization
init();

// Initialize page
async function initPage() {
  const user = authService.getCurrentUser();
  
  if (user) {
    // Update user profile
    const initials = user.displayName 
      ? user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : user.email[0].toUpperCase();
    
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = user.displayName || 'User';
    document.getElementById('userEmail').textContent = user.email;
    
    // Setup event listeners
    setupEventListeners();
    
    // Load family group
    await loadFamilyGroup();
    
    // Initialize month filter
    initializeMonthFilter();
    
    // Load report
    await loadReport();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  sidebarOpen?.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });

  sidebarClose?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const confirmed = await confirmationModal.show({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) return;

    const result = await authService.signOut();
    if (result.success) {
      window.location.href = 'index.html';
    }
  });
  
  // Month filter
  document.getElementById('monthFilter')?.addEventListener('change', async (e) => {
    state.selectedMonth = e.target.value;
    await loadReport();
  });
  
  // Category filter
  document.getElementById('categoryFilterReport')?.addEventListener('change', async (e) => {
    state.selectedCategory = e.target.value;
    await loadReport();
  });
  
  // Export button
  document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);
}

// Load family group
async function loadFamilyGroup() {
  try {
    const groups = await familyService.getUserFamilyGroups();
    
    if (groups.length === 0) {
      toast.error('No family group found. Please create or join a family group first.');
      setTimeout(() => {
        window.location.href = 'family.html';
      }, 2000);
      return;
    }
    
    // Use first family group (you can add a selector if user has multiple groups)
    state.currentFamilyGroup = groups[0];
    
    const subtitle = document.getElementById('reportSubtitle');
    if (subtitle) {
      subtitle.textContent = `Spending breakdown for ${state.currentFamilyGroup.name}`;
    }
  } catch (error) {
    console.error('Error loading family group:', error);
    toast.error('Failed to load family group');
  }
}

// Initialize month filter
function initializeMonthFilter() {
  const monthFilter = document.getElementById('monthFilter');
  if (!monthFilter) return;
  
  const now = new Date();
  const months = [];
  
  // Generate last 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  
  monthFilter.innerHTML = months.map(m => 
    `<option value="${m.value}">${m.label}</option>`
  ).join('');
  
  // Set current month as default
  state.selectedMonth = months[0].value;
}

// Load report
async function loadReport() {
  if (!state.currentFamilyGroup) return;
  
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const summaryCards = document.getElementById('summaryCards');
  const memberBreakdownList = document.getElementById('memberBreakdownList');
  const categoryBreakdownList = document.getElementById('categoryBreakdownList');
  
  try {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    summaryCards.innerHTML = '';
    memberBreakdownList.innerHTML = '';
    categoryBreakdownList.innerHTML = '';
    
    // Parse selected month
    const [year, month] = state.selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Load expenses with split details for the family group
    const allExpenses = await firestoreService.getExpenses();
    
    // Filter expenses
    state.expenses = allExpenses.filter(expense => {
      const expenseDate = timezoneService.toLocalDate(expense.date);
      const matchesFamily = expense.familyGroupId === state.currentFamilyGroup.id;
      const matchesDate = expenseDate >= startDate && expenseDate <= endDate;
      const hasSplit = expense.hasSplit && expense.splitDetails && expense.splitDetails.length > 0;
      const matchesCategory = !state.selectedCategory || expense.category === state.selectedCategory;
      
      return matchesFamily && matchesDate && hasSplit && matchesCategory;
    });
    
    loadingState.style.display = 'none';
    
    if (state.expenses.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }
    
    // Process report data
    state.reportData = processReportData();
    
    // Render report
    renderSummaryCards();
    renderMemberBreakdown();
    renderCategoryBreakdown();
    
    // Populate category filter
    populateCategoryFilter();
    
  } catch (error) {
    console.error('Error loading report:', error);
    toast.error('Failed to load report');
    loadingState.style.display = 'none';
  }
}

// Process report data
function processReportData() {
  const memberData = {};
  const categoryData = {};
  let totalSpending = 0;
  
  // Initialize member data
  state.currentFamilyGroup.members.forEach(member => {
    memberData[member.userId] = {
      memberId: member.userId,
      memberName: member.name,
      role: member.role,
      total: 0,
      categories: {}
    };
  });
  
  // Process each expense
  state.expenses.forEach(expense => {
    totalSpending += expense.amount;
    
    // Process split details
    expense.splitDetails.forEach(split => {
      // Update member data
      if (memberData[split.memberId]) {
        memberData[split.memberId].total += split.amount;
        
        if (!memberData[split.memberId].categories[expense.category]) {
          memberData[split.memberId].categories[expense.category] = 0;
        }
        memberData[split.memberId].categories[expense.category] += split.amount;
      }
      
      // Update category data
      if (!categoryData[expense.category]) {
        categoryData[expense.category] = {
          category: expense.category,
          total: 0,
          members: {}
        };
      }
      
      categoryData[expense.category].total += split.amount;
      
      if (!categoryData[expense.category].members[split.memberId]) {
        categoryData[expense.category].members[split.memberId] = {
          memberName: split.memberName,
          amount: 0
        };
      }
      categoryData[expense.category].members[split.memberId].amount += split.amount;
    });
  });
  
  return {
    totalSpending,
    totalExpenses: state.expenses.length,
    memberData: Object.values(memberData).sort((a, b) => b.total - a.total),
    categoryData: Object.values(categoryData).sort((a, b) => b.total - a.total)
  };
}

// Render summary cards
function renderSummaryCards() {
  const summaryCards = document.getElementById('summaryCards');
  const { totalSpending, totalExpenses, memberData } = state.reportData;
  
  summaryCards.innerHTML = `
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-icon">💰</div>
        <div>
          <h3 class="summary-card-title">Total Spending</h3>
        </div>
      </div>
      <p class="summary-card-value">${formatCurrency(totalSpending)}</p>
    </div>
    
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-icon">📊</div>
        <div>
          <h3 class="summary-card-title">Total Expenses</h3>
        </div>
      </div>
      <p class="summary-card-value">${totalExpenses}</p>
    </div>
    
    <div class="summary-card">
      <div class="summary-card-header">
        <div class="summary-card-icon">👥</div>
        <div>
          <h3 class="summary-card-title">Family Members</h3>
        </div>
      </div>
      <p class="summary-card-value">${memberData.length}</p>
    </div>
  `;
}

// Render member breakdown
function renderMemberBreakdown() {
  const memberBreakdownList = document.getElementById('memberBreakdownList');
  const { memberData } = state.reportData;
  
  memberBreakdownList.innerHTML = memberData.map(member => {
    const initials = member.memberName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const categories = Object.entries(member.categories).sort((a, b) => b[1] - a[1]);
    
    return `
      <div class="member-card">
        <div class="member-card-header">
          <div class="member-info">
            <div class="member-avatar">${initials}</div>
            <div class="member-details">
              <div class="member-name">${escapeHtml(member.memberName)}</div>
              <div class="member-role">${member.role || 'member'}</div>
            </div>
          </div>
          <div class="member-total">
            <div class="member-total-label">Total Spent</div>
            <div class="member-total-amount">${formatCurrency(member.total)}</div>
          </div>
        </div>
        
        ${categories.length > 0 ? `
          <div class="member-categories">
            ${categories.map(([category, amount]) => `
              <div class="category-item">
                <span class="category-name">${categoryIcons[category] || '📦'} ${category}</span>
                <span class="category-amount">${formatCurrency(amount)}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p style="text-align: center; color: var(--text-secondary); margin: 0;">No spending in this period</p>'}
      </div>
    `;
  }).join('');
}

// Render category breakdown
function renderCategoryBreakdown() {
  const categoryBreakdownList = document.getElementById('categoryBreakdownList');
  const { categoryData } = state.reportData;
  
  categoryBreakdownList.innerHTML = categoryData.map(category => {
    const members = Object.values(category.members).sort((a, b) => b.amount - a.amount);
    
    return `
      <div class="category-card">
        <div class="category-card-header">
          <div class="category-info">
            <div class="category-icon">${categoryIcons[category.category] || '📦'}</div>
            <div class="category-title">${category.category}</div>
          </div>
          <div class="category-total">
            <div class="category-total-label">Total</div>
            <div class="category-total-amount">${formatCurrency(category.total)}</div>
          </div>
        </div>
        
        <div class="category-members">
          ${members.map(member => `
            <div class="member-item">
              <span class="member-item-name">${escapeHtml(member.memberName)}</span>
              <span class="member-item-amount">${formatCurrency(member.amount)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Populate category filter
function populateCategoryFilter() {
  const categoryFilter = document.getElementById('categoryFilterReport');
  if (!categoryFilter) return;
  
  const categories = [...new Set(state.expenses.map(e => e.category))].sort();
  
  categoryFilter.innerHTML = '<option value="">All Categories</option>' +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// Export report
function exportReport() {
  if (!state.reportData) {
    toast.warning('No data to export');
    return;
  }
  
  const { memberData } = state.reportData;
  const [year, month] = state.selectedMonth.split('-');
  
  // Prepare export data
  const exportData = [];
  
  memberData.forEach(member => {
    Object.entries(member.categories).forEach(([category, amount]) => {
      exportData.push({
        'Member': member.memberName,
        'Role': member.role,
        'Category': category,
        'Amount': amount,
        'Month': `${year}-${month}`
      });
    });
  });
  
  const filename = `family-spending-report-${year}-${month}.csv`;
  exportToCSV(exportData, filename);
  toast.success('Report exported successfully');
}
