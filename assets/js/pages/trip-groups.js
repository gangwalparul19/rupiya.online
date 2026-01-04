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
    const user = await this.waitForAuth();
    if (!user) return;
    
    this.bindEvents();
    await this.loadGroups();
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
    // Create group button - toggle inline form
    const createBtn = document.getElementById('createGroupBtn');
    createBtn?.addEventListener('click', () => this.toggleCreateSection());
    
    // Inline form controls
    document.getElementById('closeCreateSectionBtn')?.addEventListener('click', () => this.hideCreateSection());
    document.getElementById('cancelCreateBtn')?.addEventListener('click', () => this.hideCreateSection());
    document.getElementById('inlineGroupForm')?.addEventListener('submit', (e) => this.handleInlineSubmit(e));
    
    // Add member button (inline form)
    document.getElementById('inlineAddMemberBtn')?.addEventListener('click', () => this.addPendingMember());
    
    // Allow Enter key to add members (prevent form submission)
    const memberInputs = ['inlineMemberName', 'inlineMemberEmail', 'inlineMemberPhone'];
    memberInputs.forEach(inputId => {
      document.getElementById(inputId)?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addPendingMember();
        }
      });
    });
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
    
    // Delete modal controls
    document.getElementById('closeDeleteModalBtn')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.confirmDelete());
    
    // Close delete modal on overlay click
    document.getElementById('deleteGroupModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'deleteGroupModal') this.closeDeleteModal();
    });
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
    
    // Reset form
    const form = document.getElementById('inlineGroupForm');
    const membersList = document.getElementById('inlineMembersList');
    const title = document.getElementById('inlineGroupTitle');
    const btnText = document.getElementById('inlineSaveGroupBtnText');
    
    form?.reset();
    if (membersList) membersList.innerHTML = '';
    if (title) title.textContent = 'Create Trip Group';
    if (btnText) btnText.textContent = 'Create Group';
    
    // Show section
    document.getElementById('createGroupSection')?.classList.add('show');
    
    // Scroll to form
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
    
    console.log('Adding pending member:', { name, email, phone });
    
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
    
    const newMember = { name, email, phone };
    this.pendingMembers.push(newMember);
    console.log('Pending members array:', this.pendingMembers);
    
    this.renderPendingMembers();
    this.showToast(`${name} added to the group`, 'success');
    
    // Clear inputs
    nameInput.value = '';
    emailInput.value = '';
    phoneInput.value = '';
    nameInput.focus();
  }

  renderPendingMembers() {
    const container = document.getElementById('inlineMembersList');
    
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

  async handleInlineSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('inlineGroupName').value.trim();
    const description = document.getElementById('inlineGroupDescription').value.trim();
    const startDate = document.getElementById('inlineStartDate').value;
    const endDate = document.getElementById('inlineEndDate').value;
    const destination = document.getElementById('inlineDestination').value.trim();
    const budget = parseFloat(document.getElementById('inlineTripBudget').value) || 0;
    
    if (!name) {
      this.showToast('Group name is required', 'error');
      return;
    }
    
    this.setInlineLoading(true);
    
    try {
      // Get current user info
      const currentUser = await authService.waitForAuth();
      
      // Create group
      const result = await tripGroupsService.createGroup({
        name,
        description,
        startDate,
        endDate,
        destination,
        budget: { total: budget, categories: {} }
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('Group created:', result.groupId);
      console.log('Pending members to add:', this.pendingMembers);
      
      // Add pending members
      const addedMembers = [];
      for (const member of this.pendingMembers) {
        console.log('Adding member:', member);
        const addResult = await tripGroupsService.addMember(result.groupId, member);
        console.log('Add member result:', addResult);
        if (addResult.success) {
          addedMembers.push(member);
        } else {
          console.error('Failed to add member:', member.name, addResult.error);
          this.showToast(`Failed to add ${member.name}: ${addResult.error}`, 'warning');
        }
      }
      
      console.log('Successfully added members:', addedMembers.length);
      
      // Send invitation emails to members with valid emails
      const membersWithEmail = addedMembers.filter(m => m.email && m.email.trim() !== '');
      console.log('Members with email:', membersWithEmail);
      
      if (membersWithEmail.length > 0) {
        try {
          console.log('Sending invitation emails...');
          const emailPayload = {
            members: membersWithEmail,
            tripName: name,
            destination: destination,
            description: description,
            startDate: startDate,
            endDate: endDate,
            creatorName: currentUser.displayName || currentUser.email,
            creatorEmail: currentUser.email,
            groupId: result.groupId
          };
          console.log('Email payload:', emailPayload);
          
          const emailResponse = await fetch('/api/send-trip-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
          });
          
          if (!emailResponse.ok) {
            throw new Error(`HTTP error! status: ${emailResponse.status}`);
          }
          
          const emailResult = await emailResponse.json();
          console.log('Email API response:', emailResult);
          
          if (emailResult.success) {
            if (emailResult.sent > 0) {
              this.showToast(`✅ Invitations sent to ${emailResult.sent} member(s)!`, 'success');
            } else if (emailResult.sent === 0) {
              this.showToast('⚠️ No valid emails to send invitations', 'info');
            }
          } else {
            console.error('Email API error:', emailResult.error);
            this.showToast(`⚠️ Failed to send emails: ${emailResult.error}`, 'warning');
          }
        } catch (emailError) {
          console.error('Error sending invitation emails:', emailError);
          this.showToast(`⚠️ Email sending failed: ${emailError.message}`, 'warning');
        }
      } else {
        console.log('No members with email addresses to send invitations');
      }
      
      this.showToast('✅ Group created successfully!', 'success');
      this.hideCreateSection();
      await this.loadGroups();
      
      // Navigate to the new group
      setTimeout(() => {
        window.location.href = `trip-group-detail.html?id=${result.groupId}`;
      }, 1000);
    } catch (error) {
      console.error('Error creating group:', error);
      this.showToast(error.message || 'Failed to create group', 'error');
    } finally {
      this.setInlineLoading(false);
    }
  }

  setInlineLoading(loading) {
    const btn = document.getElementById('inlineSaveGroupBtn');
    const text = document.getElementById('inlineSaveGroupBtnText');
    const spinner = document.getElementById('inlineSaveGroupBtnSpinner');
    
    if (btn) btn.disabled = loading;
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
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
    const btn = document.getElementById('inlineSaveGroupBtn');
    const text = document.getElementById('inlineSaveGroupBtnText');
    const spinner = document.getElementById('inlineSaveGroupBtnSpinner');
    
    if (btn) btn.disabled = loading;
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
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
  new TripGroupsPage();
});
