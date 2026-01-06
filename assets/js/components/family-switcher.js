// Family Switcher Component
import familyService from '../services/family-service.js';
import userService from '../services/user-service.js';
import toast from './toast.js';

class FamilySwitcher {
  constructor() {
    this.currentContext = 'personal'; // 'personal' or 'family'
    this.currentGroupId = null;
    this.familyGroups = [];
    this.pendingInvitations = [];
    this.initialized = false;
    this.preferencesUnsubscribe = null; // Real-time listener
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Load family groups and invitations
      await Promise.all([
        this.loadFamilyGroups(),
        this.loadPendingInvitations()
      ]);

      // Restore saved context from Firestore (with localStorage fallback)
      await this.restoreContext();

      // Setup real-time listener for multi-tab sync
      this.setupPreferencesListener();

      // Render the switcher
      this.render();

      // Setup event listeners
      this.setupEventListeners();

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing family switcher:', error);
    }
  }

  async loadFamilyGroups() {
    try {
      this.familyGroups = await familyService.getUserFamilyGroups();
    } catch (error) {
      console.error('Error loading family groups:', error);
      this.familyGroups = [];
    }
  }

  async loadPendingInvitations() {
    try {
      this.pendingInvitations = await familyService.getUserInvitations();
    } catch (error) {
      console.error('Error loading invitations:', error);
      this.pendingInvitations = [];
    }
  }

  async restoreContext() {
    try {
      // Try to load from Firestore first
      const prefs = await userService.getUserPreferences();
      if (prefs.success && prefs.data) {
        const context = prefs.data.currentContext || 'personal';
        const groupId = prefs.data.currentGroupId || null;

        if (context === 'family' && groupId) {
          // Verify the group still exists
          const group = this.familyGroups.find(g => g.id === groupId);
          if (group) {
            this.currentContext = 'family';
            this.currentGroupId = groupId;
            // Update localStorage for offline access
            localStorage.setItem('currentContext', 'family');
            localStorage.setItem('currentGroupId', groupId);
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Could not load preferences from Firestore, falling back to localStorage:', error);
    }

    // Fallback to localStorage if Firestore fails
    const savedContext = localStorage.getItem('currentContext');
    const savedGroupId = localStorage.getItem('currentGroupId');

    if (savedContext === 'family' && savedGroupId) {
      // Verify the group still exists
      const group = this.familyGroups.find(g => g.id === savedGroupId);
      if (group) {
        this.currentContext = 'family';
        this.currentGroupId = savedGroupId;
      } else {
        // Group no longer exists, reset to personal
        await this.switchToPersonal();
      }
    }
  }

  setupPreferencesListener() {
    try {
      // Setup real-time listener for multi-tab sync
      this.preferencesUnsubscribe = userService.setupPreferencesListener((prefs) => {
        const newContext = prefs.currentContext || 'personal';
        const newGroupId = prefs.currentGroupId || null;

        // Check if context changed
        if (newContext !== this.currentContext || newGroupId !== this.currentGroupId) {
          console.log('[Family Switcher] Context changed from another tab:', { newContext, newGroupId });
          this.currentContext = newContext;
          this.currentGroupId = newGroupId;
          
          // Re-render the switcher
          this.render();
          this.setupEventListeners();
          
          // Dispatch event
          this.dispatchContextChange();
        }
      });
    } catch (error) {
      console.warn('Could not setup preferences listener:', error);
    }
  }

  render() {
    const container = document.getElementById('familySwitcherContainer');
    const desktopContainer = document.getElementById('familySwitcherContainerDesktop');
    
    const currentGroup = this.getCurrentGroup();
    const currentName = currentGroup ? currentGroup.name : 'Personal';
    const currentIcon = currentGroup ? '👨‍👩‍👧‍👦' : '👤';

    const switcherHTML = `
      <div class="family-switcher">
        ${this.pendingInvitations.length > 0 ? `
          <span class="invitations-badge">${this.pendingInvitations.length}</span>
        ` : ''}
        
        <button class="family-switcher-btn" id="familySwitcherBtn">
          <span class="current-context-icon">${currentIcon}</span>
          <span class="current-context-name">${currentName}</span>
          <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        
        <div class="family-switcher-dropdown" id="familySwitcherDropdown">
          ${this.renderDropdownContent()}
        </div>
      </div>
    `;

    // Render to mobile container
    if (container) {
      container.innerHTML = switcherHTML;
    }
    
    // Render to desktop container (with different IDs to avoid conflicts)
    if (desktopContainer) {
      desktopContainer.style.display = 'block';
      desktopContainer.innerHTML = `
        <div class="family-switcher family-switcher-desktop">
          ${this.pendingInvitations.length > 0 ? `
            <span class="invitations-badge">${this.pendingInvitations.length}</span>
          ` : ''}
          
          <button class="family-switcher-btn" id="familySwitcherBtnDesktop">
            <span class="current-context-icon">${currentIcon}</span>
            <span class="current-context-name">${currentName}</span>
            <svg class="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          
          <div class="family-switcher-dropdown" id="familySwitcherDropdownDesktop">
            ${this.renderDropdownContent()}
          </div>
        </div>
      `;
    }
  }

  renderDropdownContent() {
    let html = '';

    // Personal account option
    html += `
      <button class="switcher-option ${this.currentContext === 'personal' ? 'active' : ''}" 
              data-context="personal">
        <span class="option-icon">👤</span>
        <div class="option-details">
          <span class="option-name">Personal Account</span>
        </div>
      </button>
    `;

    // Family groups
    if (this.familyGroups.length > 0) {
      html += '<div class="switcher-divider"></div>';

      this.familyGroups.forEach(group => {
        const isActive = this.currentContext === 'family' && this.currentGroupId === group.id;
        const userMember = group.members.find(m => m.userId === familyService.getUserId());
        const role = userMember ? userMember.role : 'member';

        html += `
          <button class="switcher-option ${isActive ? 'active' : ''}" 
                  data-context="family" 
                  data-group-id="${group.id}">
            <span class="option-icon">👨‍👩‍👧‍👦</span>
            <div class="option-details">
              <span class="option-name">${group.name}</span>
              <span class="option-role">${role}</span>
            </div>
          </button>
        `;
      });
    }

    // Pending invitations
    if (this.pendingInvitations.length > 0) {
      html += '<div class="switcher-divider"></div>';
      html += `
        <button class="switcher-action" id="viewInvitationsBtn">
          <span class="action-icon">📨</span>
          <span class="action-text">Pending Invitations (${this.pendingInvitations.length})</span>
        </button>
      `;
    }

    // Actions
    html += '<div class="switcher-divider"></div>';
    html += `
      <button class="switcher-action" id="createFamilyBtn">
        <span class="action-icon">➕</span>
        <span class="action-text">Create Family Group</span>
      </button>
      <button class="switcher-action" id="manageFamilyBtn">
        <span class="action-icon">⚙️</span>
        <span class="action-text">Manage Families</span>
      </button>
    `;

    return html;
  }

  setupEventListeners() {
    // Setup for both mobile and desktop switchers
    this.setupSwitcherEvents('familySwitcherBtn', 'familySwitcherDropdown', 'familySwitcherContainer');
    this.setupSwitcherEvents('familySwitcherBtnDesktop', 'familySwitcherDropdownDesktop', 'familySwitcherContainerDesktop');
  }

  setupSwitcherEvents(btnId, dropdownId, containerId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    const container = document.getElementById(containerId);

    if (btn && dropdown) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        btn.classList.toggle('open');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.family-switcher')) {
          dropdown.classList.remove('show');
          btn.classList.remove('open');
        }
      });
    }

    // Use event delegation for dynamically created elements
    if (container) {
      container.addEventListener('click', (e) => {
        // Context switching
        const switcherOption = e.target.closest('.switcher-option');
        if (switcherOption) {
          const context = switcherOption.dataset.context;
          const groupId = switcherOption.dataset.groupId;

          if (context === 'personal') {
            this.switchToPersonal();
          } else if (context === 'family' && groupId) {
            this.switchToFamily(groupId);
          }

          if (dropdown) {
            dropdown.classList.remove('show');
          }
          if (btn) {
            btn.classList.remove('open');
          }
          return;
        }

        // Create family button
        if (e.target.closest('#createFamilyBtn') || e.target.closest('.create-family-btn')) {
          this.showCreateFamilyModal();
          if (dropdown) {
            dropdown.classList.remove('show');
          }
          if (btn) {
            btn.classList.remove('open');
          }
          return;
        }

        // Manage family button
        if (e.target.closest('#manageFamilyBtn') || e.target.closest('.manage-family-btn')) {
          window.location.href = 'family.html';
          return;
        }

        // View invitations button
        if (e.target.closest('#viewInvitationsBtn') || e.target.closest('.view-invitations-btn')) {
          window.location.href = 'family.html#invitations';
          return;
        }
      });
    }
  }

  switchToPersonal() {
    this.currentContext = 'personal';
    this.currentGroupId = null;

    // Save to Firestore
    userService.setCurrentContext('personal').catch(error => {
      console.error('Failed to save context to Firestore:', error);
      toast.error('Failed to save preference');
    });

    // Also update localStorage for offline access
    localStorage.setItem('currentContext', 'personal');
    localStorage.removeItem('currentGroupId');

    // Dispatch event
    this.dispatchContextChange();

    // Reload page
    window.location.reload();
  }

  switchToFamily(groupId) {
    const group = this.familyGroups.find(g => g.id === groupId);
    if (!group) {
      toast.error('Family group not found');
      return;
    }

    this.currentContext = 'family';
    this.currentGroupId = groupId;

    // Save to Firestore
    userService.setCurrentContext('family', groupId).catch(error => {
      console.error('Failed to save context to Firestore:', error);
      toast.error('Failed to save preference');
    });

    // Also update localStorage for offline access
    localStorage.setItem('currentContext', 'family');
    localStorage.setItem('currentGroupId', groupId);

    // Dispatch event
    this.dispatchContextChange();

    // Reload page
    window.location.reload();
  }

  dispatchContextChange() {
    window.dispatchEvent(new CustomEvent('contextChanged', {
      detail: {
        context: this.currentContext,
        groupId: this.currentGroupId,
        group: this.getCurrentGroup()
      }
    }));
  }

  getCurrentGroup() {
    if (this.currentContext === 'family' && this.currentGroupId) {
      return this.familyGroups.find(g => g.id === this.currentGroupId);
    }
    return null;
  }

  getCurrentContext() {
    return {
      context: this.currentContext,
      groupId: this.currentGroupId,
      group: this.getCurrentGroup()
    };
  }

  showCreateFamilyModal() {
    // Redirect to family page to create a new group
    window.location.href = 'family.html?action=create';
  }

  async refresh() {
    await this.loadFamilyGroups();
    await this.loadPendingInvitations();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Cleanup method to unsubscribe from listeners
   */
  destroy() {
    if (this.preferencesUnsubscribe) {
      this.preferencesUnsubscribe();
      this.preferencesUnsubscribe = null;
    }
  }
}

// Create singleton instance
const familySwitcher = new FamilySwitcher();

// Export for use in other modules
export default familySwitcher;
