// Trip Groups Page
import tripGroupsService from '../services/trip-groups-service.js';
import authService from '../services/auth-service.js';

class TripGroupsPage {
  constructor() {
    this.groups = [];
    this.currentTab = 'active';
    this.pendingMembers = [];
    this.editingGroupId = null;
    
    this.init();
  }

  async init() {
    console.log('[Trip Groups] init() called');
    const user = await this.waitForAuth();
    console.log('[Trip Groups] waitForAuth returned:', user ? user.email : 'null');
    if (!user) return; // Redirecting to login
    
    console.log('[Trip Groups] Binding events...');
    this.bindEvents();
    console.log('[Trip Groups] Loading groups...');
    await this.loadGroups();
    console.log('[Trip Groups] Initialization complete');
  }

  async waitForAuth() {
    // Wait for auth service to initialize
    const user = await authService.waitForAuth();
    
    if (!user) {
      // Not logged in, redirect to login
      window.location.href = 'login.html';
      return;
    }
    
    return user;
  }

  bindEvents() {
    console.log('[Trip Groups] bindEvents() called');
    
    // Create group button
    const createBtn = document.getElementById('createGroupBtn');
    console.log('[Trip Groups] createGroupBtn element:', createBtn);
    createBtn?.addEventListener('click', () => {
      console.log('[Trip Groups] Create button clicked');
      this.openCreateModal();
    });
    
    // Modal controls
    document.getElementById('closeGroupModalBtn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('cancelGroupBtn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('groupForm')?.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Add member button
    document.getElementById('addMemberBtn')?.addEventListener('click', () => this.addPendingMember());
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
    
    // Delete modal controls
    document.getElementById('closeDeleteModalBtn')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.confirmDelete());
    
    // Close modals on overlay click
    document.getElementById('createGroupModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'createGroupModal') this.closeModal();
    });
    document.getElementById('deleteGroupModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'deleteGroupModal') this.closeDeleteModal();
    });
    
    console.log('[Trip Groups] Events bound successfully');
  }

  async loadGroups() {
    this.showLoading(true);
    
    try {
      this.groups = await tripGroupsService.getUserGroups();
      this.updateSummary();
      this.renderGroups();
    } catch (error) {
      console.error('Error loading groups:', error);
      this.showToast('Failed to load groups', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  updateSummary() {
    const activeGroups = this.groups.filter(g => g.status === 'active');
    const totalExpenses = this.groups.reduce((sum, g) => sum + (g.totalExpenses || 0), 0);
    
    document.getElementById('activeTrips').textContent = activeGroups.length;
    document.getElementById('totalTripExpenses').textContent = `₹${totalExpenses.toLocaleString('en-IN')}`;
    
    // Calculate user's total balance across all groups
    // This would need async calculation, so we'll show a placeholder for now
    document.getElementById('yourBalance').textContent = '₹0';
  }

  renderGroups() {
    const container = document.getElementById('groupsList');
    const emptyState = document.getElementById('emptyState');
    
    // Filter groups by current tab
    let filteredGroups = this.groups;
    if (this.currentTab === 'active') {
      filteredGroups = this.groups.filter(g => g.status === 'active');
    } else if (this.currentTab === 'archived') {
      filteredGroups = this.groups.filter(g => g.status === 'archived' || g.status === 'completed');
    }
    
    if (filteredGroups.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    container.innerHTML = filteredGroups.map(group => this.renderGroupCard(group)).join('');
    
    // Bind card click events
    container.querySelectorAll('.group-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.group-actions')) {
          window.location.href = `trip-group-detail.html?id=${card.dataset.groupId}`;
        }
      });
    });
  }


  renderGroupCard(group) {
    const startDate = group.startDate?.toDate ? group.startDate.toDate() : null;
    const endDate = group.endDate?.toDate ? group.endDate.toDate() : null;
    
    const dateRange = startDate && endDate 
      ? `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
      : startDate 
        ? `From ${this.formatDate(startDate)}`
        : 'No dates set';
    
    const statusClass = group.status || 'active';
    const statusLabel = group.status === 'completed' ? 'Completed' : 
                        group.status === 'archived' ? 'Archived' : 'Active';
    
    // Budget progress
    let budgetHtml = '';
    if (group.budget?.total > 0) {
      const progress = Math.min(100, (group.totalExpenses / group.budget.total) * 100);
      const progressClass = progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : 'safe';
      
      budgetHtml = `
        <div class="budget-progress">
          <div class="budget-progress-header">
            <span class="budget-progress-label">Budget</span>
            <span class="budget-progress-value">₹${group.totalExpenses.toLocaleString('en-IN')} / ₹${group.budget.total.toLocaleString('en-IN')}</span>
          </div>
          <div class="budget-progress-bar">
            <div class="budget-progress-fill ${progressClass}" style="width: ${progress}%"></div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="group-card ${statusClass}" data-group-id="${group.id}">
        <div class="group-card-header">
          <h3 class="group-name">${this.escapeHtml(group.name)}</h3>
          <span class="group-status ${statusClass}">${statusLabel}</span>
        </div>
        
        <div class="group-dates">${dateRange}</div>
        
        <div class="group-stats">
          <div class="group-stat">
            <div class="group-stat-value">${group.memberCount || 1}</div>
            <div class="group-stat-label">Members</div>
          </div>
          <div class="group-stat">
            <div class="group-stat-value">₹${(group.totalExpenses || 0).toLocaleString('en-IN')}</div>
            <div class="group-stat-label">Total</div>
          </div>
          <div class="group-stat">
            <div class="group-stat-value">${group.categories?.length || 7}</div>
            <div class="group-stat-label">Categories</div>
          </div>
        </div>
        
        ${budgetHtml}
      </div>
    `;
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    this.renderGroups();
  }

  openCreateModal() {
    console.log('[Trip Groups] openCreateModal() called');
    this.editingGroupId = null;
    this.pendingMembers = [];
    
    // Reset form
    const form = document.getElementById('groupForm');
    const membersList = document.getElementById('membersList');
    const modalTitle = document.getElementById('groupModalTitle');
    const btnText = document.getElementById('saveGroupBtnText');
    const modal = document.getElementById('createGroupModal');
    
    console.log('[Trip Groups] Modal elements:', { form, membersList, modalTitle, btnText, modal });
    
    form?.reset();
    if (membersList) membersList.innerHTML = '';
    if (modalTitle) modalTitle.textContent = 'Create Trip Group';
    if (btnText) btnText.textContent = 'Create Group';
    
    // Show modal (use 'show' class, not 'active')
    if (modal) {
      modal.classList.add('show');
      console.log('[Trip Groups] Modal should now be visible');
    } else {
      console.error('[Trip Groups] Modal element not found!');
    }
  }

  closeModal() {
    document.getElementById('createGroupModal')?.classList.remove('show');
    this.pendingMembers = [];
  }

  addPendingMember() {
    const nameInput = document.getElementById('memberName');
    const emailInput = document.getElementById('memberEmail');
    const phoneInput = document.getElementById('memberPhone');
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    
    if (!name) {
      this.showToast('Member name is required', 'error');
      nameInput.focus();
      return;
    }
    
    // Check for duplicates
    if (this.pendingMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      this.showToast('Member already added', 'error');
      return;
    }
    
    this.pendingMembers.push({ name, email, phone });
    this.renderPendingMembers();
    
    // Clear inputs
    nameInput.value = '';
    emailInput.value = '';
    phoneInput.value = '';
    nameInput.focus();
  }

  renderPendingMembers() {
    const container = document.getElementById('membersList');
    
    container.innerHTML = this.pendingMembers.map((member, index) => `
      <div class="member-item">
        <div class="member-info">
          <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
          <div class="member-details">
            <span class="member-name">${this.escapeHtml(member.name)}</span>
            <span class="member-contact">${member.email || member.phone || 'No contact info'}</span>
          </div>
        </div>
        <button type="button" class="remove-member-btn" data-index="${index}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');
    
    // Bind remove buttons
    container.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.pendingMembers.splice(index, 1);
        this.renderPendingMembers();
      });
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('groupName').value.trim();
    const description = document.getElementById('groupDescription').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const budget = parseFloat(document.getElementById('tripBudget').value) || 0;
    
    if (!name) {
      this.showToast('Group name is required', 'error');
      return;
    }
    
    this.setLoading(true);
    
    try {
      // Create group
      const result = await tripGroupsService.createGroup({
        name,
        description,
        startDate,
        endDate,
        budget: { total: budget, categories: {} }
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Add pending members
      for (const member of this.pendingMembers) {
        await tripGroupsService.addMember(result.groupId, member);
      }
      
      this.showToast('Group created successfully!', 'success');
      this.closeModal();
      await this.loadGroups();
      
      // Navigate to the new group
      window.location.href = `trip-group-detail.html?id=${result.groupId}`;
    } catch (error) {
      console.error('Error creating group:', error);
      this.showToast(error.message || 'Failed to create group', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  openDeleteModal(groupId, groupName) {
    this.deletingGroupId = groupId;
    document.getElementById('deleteGroupName').textContent = groupName;
    document.getElementById('deleteGroupModal')?.classList.add('show');
  }

  closeDeleteModal() {
    document.getElementById('deleteGroupModal')?.classList.remove('show');
    this.deletingGroupId = null;
  }

  async confirmDelete() {
    if (!this.deletingGroupId) return;
    
    // Note: Delete functionality would need to be implemented in the service
    this.showToast('Delete functionality coming soon', 'info');
    this.closeDeleteModal();
  }

  // Utility methods
  showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const groupsList = document.getElementById('groupsList');
    
    if (show) {
      loadingState.style.display = 'block';
      groupsList.style.display = 'none';
    } else {
      loadingState.style.display = 'none';
      groupsList.style.display = 'grid';
    }
  }

  setLoading(loading) {
    const btn = document.getElementById('saveGroupBtn');
    const text = document.getElementById('saveGroupBtnText');
    const spinner = document.getElementById('saveGroupBtnSpinner');
    
    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline';
    spinner.style.display = loading ? 'inline-block' : 'none';
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
    // Check if toast container exists
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
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Trip Groups] DOMContentLoaded - initializing page');
  new TripGroupsPage();
});
