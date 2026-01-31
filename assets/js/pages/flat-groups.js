// Flat Groups Page
import '../services/services-init.js';
import flatGroupsService from '../services/flat-groups-service.js';
import authService from '../services/auth-service.js';

class FlatGroupsPage {
  constructor() {
    this.groups = [];
    this.filteredGroups = [];
    this.currentTab = 'active';
    this.pendingMembers = [];
    this.editingGroupId = null;
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalCount = 0;
    this.allDataKPI = {
      activeGroups: 0,
      monthlyExpenses: 0
    };

    this.init();
  }

  async init() {
    const user = await this.waitForAuth();
    if (!user) return;

    this.bindEvents();
    await this.loadGroups();
  }

  async waitForAuth() {
    const user = await authService.waitForAuth();

    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    return user;
  }

  bindEvents() {
    const createBtn = document.getElementById('createGroupBtn');
    createBtn?.addEventListener('click', () => this.toggleCreateSection());

    document.getElementById('closeCreateSectionBtn')?.addEventListener('click', () => this.hideCreateSection());
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => this.hideCreateSection());
    document.getElementById('inlineGroupForm')?.addEventListener('submit', (e) => this.handleInlineSubmit(e));

    document.getElementById('inlineAddMemberBtn')?.addEventListener('click', () => this.addPendingMember());

    const memberInputs = ['inlineMemberName', 'inlineMemberEmail', 'inlineMemberPhone'];
    memberInputs.forEach(inputId => {
      document.getElementById(inputId)?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addPendingMember();
        }
      });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
    
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.goToPage(this.currentPage - 1);
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const totalRecords = this.filteredGroups.length;
        const totalPages = Math.ceil(totalRecords / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
          this.goToPage(this.currentPage + 1);
        }
      });
    }
  }

  async loadGroups() {
    this.showLoading(true);

    try {
      this.groups = await flatGroupsService.getUserGroups();
      this.totalCount = this.groups.length;
      
      this.calculateKPISummary();
      this.filterGroups();
      this.currentPage = 1;
      
      this.updateSummary();
      this.renderGroups();
    } catch (error) {
      console.error('Error loading groups:', error);
      this.showToast('Failed to load groups', 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  calculateKPISummary() {
    const activeGroups = this.groups.filter(g => g.status === 'active');
    
    // Calculate this month's expenses
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthlyExpenses = 0;
    activeGroups.forEach(group => {
      // For now, just use totalExpenses as a proxy
      // In a real implementation, you'd filter expenses by date
      monthlyExpenses += (group.totalExpenses || 0);
    });
    
    this.allDataKPI = {
      activeGroups: activeGroups.length,
      monthlyExpenses
    };
  }
  
  filterGroups() {
    if (this.currentTab === 'active') {
      this.filteredGroups = this.groups.filter(g => g.status === 'active');
    } else if (this.currentTab === 'archived') {
      this.filteredGroups = this.groups.filter(g => g.status === 'archived' || g.status === 'completed');
    } else {
      this.filteredGroups = this.groups;
    }
  }

  updateSummary() {
    document.getElementById('activeFlats').textContent = this.allDataKPI.activeGroups;
    document.getElementById('monthlyExpenses').textContent = `₹${this.allDataKPI.monthlyExpenses.toLocaleString('en-IN')}`;
    document.getElementById('yourBalance').textContent = '₹0';
  }

  renderGroups() {
    const container = document.getElementById('groupsList');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');

    if (this.filteredGroups.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      if (paginationContainer) paginationContainer.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    
    const totalRecords = this.filteredGroups.length;
    const totalPages = Math.ceil(totalRecords / this.itemsPerPage);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageGroups = this.filteredGroups.slice(startIndex, endIndex);
    
    container.innerHTML = pageGroups.map(group => this.renderGroupCard(group)).join('');

    container.querySelectorAll('.group-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.group-actions')) {
          window.location.href = `flat-group-detail.html?id=${card.dataset.groupId}`;
        }
      });
    });
    
    this.renderPagination(totalPages);
  }
  
  renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (!paginationContainer || !paginationNumbers) return;
    
    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'flex';
    
    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
    
    const pageNumbers = this.generatePageNumbers(this.currentPage, totalPages);
    
    paginationNumbers.innerHTML = pageNumbers.map(page => {
      if (page === '...') {
        return '<span class="ellipsis">...</span>';
      }
      
      const isActive = page === this.currentPage;
      return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
    }).join('');
    
    paginationNumbers.querySelectorAll('.page-number').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.goToPage(page);
      });
    });
  }
  
  generatePageNumbers(currentPage, totalPages) {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  }
  
  goToPage(page) {
    this.currentPage = page;
    this.renderGroups();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderGroupCard(group) {
    const statusClass = group.status || 'active';
    const statusLabel = group.status === 'completed' ? 'Completed' :
      group.status === 'archived' ? 'Archived' : 'Active';

    return `
      <div class="group-card ${statusClass}" data-group-id="${group.id}">
        <div class="group-card-header">
          <h3 class="group-name">${this.escapeHtml(group.name)}</h3>
          <span class="group-status ${statusClass}">${statusLabel}</span>
        </div>
        
        ${group.address ? `<div class="group-dates">${this.escapeHtml(group.address)}</div>` : ''}
        
        <div class="group-stats">
          <div class="group-stat">
            <div class="group-stat-value">${group.memberCount || 1}</div>
            <div class="group-stat-label">Flatmates</div>
          </div>
          <div class="group-stat">
            <div class="group-stat-value">₹${(group.totalExpenses || 0).toLocaleString('en-IN')}</div>
            <div class="group-stat-label">Total</div>
          </div>
          <div class="group-stat">
            <div class="group-stat-value">${group.categories?.length || 9}</div>
            <div class="group-stat-label">Categories</div>
          </div>
        </div>
        
        ${group.monthlyRent > 0 ? `
          <div class="budget-progress">
            <div class="budget-progress-header">
              <span class="budget-progress-label">Monthly Rent</span>
              <span class="budget-progress-value">₹${group.monthlyRent.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    this.filterGroups();
    this.currentPage = 1;
    this.renderGroups();
  }

  toggleCreateSection() {
    const section = document.getElementById('createGroupSection');
    const isVisible = section.classList.contains('show');

    if (isVisible) {
      this.hideCreateSection();
    } else {
      this.showCreateSection();
    }
  }

  showCreateSection() {
    this.editingGroupId = null;
    this.pendingMembers = [];

    const form = document.getElementById('inlineGroupForm');
    const membersList = document.getElementById('inlineMembersList');
    const title = document.getElementById('inlineGroupTitle');
    const saveBtn = document.getElementById('inlineSaveGroupBtn');

    form?.reset();
    if (title) title.textContent = 'Create Flat Group';
    if (saveBtn) saveBtn.textContent = 'Create Flat Group';

    const user = authService.getCurrentUser();
    if (user && membersList) {
      membersList.innerHTML = `
        <div class="members-list-header">
          <h4>Flatmates</h4>
        </div>
        <div class="member-item creator-member">
          <div class="member-info">
            <div class="member-avatar">${(user.displayName || user.email || 'U')[0].toUpperCase()}</div>
            <div class="member-details">
              <div class="member-name">${user.displayName || user.email}</div>
              <div class="member-role">Admin (You)</div>
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById('createGroupSection')?.classList.add('show');
    document.getElementById('createGroupSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  hideCreateSection() {
    document.getElementById('createGroupSection')?.classList.remove('show');
    this.pendingMembers = [];
  }

  addPendingMember() {
    const nameInput = document.getElementById('inlineMemberName');
    const emailInput = document.getElementById('inlineMemberEmail');
    const phoneInput = document.getElementById('inlineMemberPhone');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
      this.showToast('Member name is required', 'error');
      nameInput.focus();
      return;
    }

    if (this.pendingMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      this.showToast('Member already added', 'error');
      return;
    }

    const newMember = { name, email, phone };
    this.pendingMembers.push(newMember);

    this.renderPendingMembers();
    this.showToast(`${name} added to the group`, 'success');

    nameInput.value = '';
    emailInput.value = '';
    phoneInput.value = '';
    nameInput.focus();
  }

  renderPendingMembers() {
    const container = document.getElementById('inlineMembersList');
    const user = authService.getCurrentUser();

    let html = `
      <div class="members-list-header">
        <h4>Flatmates</h4>
      </div>
      <div class="member-item creator-member">
        <div class="member-info">
          <div class="member-avatar">${(user.displayName || user.email || 'U')[0].toUpperCase()}</div>
          <div class="member-details">
            <div class="member-name">${user.displayName || user.email}</div>
            <div class="member-role">Admin (You)</div>
          </div>
        </div>
      </div>
    `;

    if (this.pendingMembers.length > 0) {
      html += this.pendingMembers.map((member, index) => `
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
    }

    container.innerHTML = html;

    container.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.pendingMembers.splice(index, 1);
        this.renderPendingMembers();
      });
    });
  }

  async handleInlineSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('inlineGroupName').value.trim();
    const description = document.getElementById('inlineGroupDescription').value.trim();
    const address = document.getElementById('inlineAddress').value.trim();
    const monthlyRent = parseFloat(document.getElementById('inlineMonthlyRent').value) || 0;

    if (!name) {
      this.showToast('Group name is required', 'error');
      return;
    }

    this.setInlineLoading(true);

    try {
      const result = await flatGroupsService.createGroup({
        name,
        description,
        address,
        monthlyRent
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Add pending members
      for (const member of this.pendingMembers) {
        const addResult = await flatGroupsService.addMember(result.groupId, member);
        if (!addResult.success) {
          console.error('Failed to add member:', member.name, addResult.error);
          this.showToast(`Failed to add ${member.name}: ${addResult.error}`, 'warning');
        }
      }

      this.showToast('✅ Flat group created successfully!', 'success');
      this.hideCreateSection();

      await this.loadGroups();

      setTimeout(() => {
        window.location.href = `flat-group-detail.html?id=${result.groupId}`;
      }, 1500);

    } catch (error) {
      console.error('Error creating group:', error);
      this.showToast(error.message || 'Failed to create group', 'error');
    } finally {
      this.setInlineLoading(false);
    }
  }

  setInlineLoading(loading) {
    const btn = document.getElementById('inlineSaveGroupBtn');

    if (btn) btn.disabled = loading;
    if (loading) {
      btn.textContent = 'Creating...';
    } else {
      btn.textContent = 'Create Flat Group';
    }
  }

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
}

document.addEventListener('DOMContentLoaded', () => {
  new FlatGroupsPage();
});
