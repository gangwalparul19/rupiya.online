// Family Management Page Logic
import authService from '../services/auth-service.js';
import familyService from '../services/family-service.js';
import toast from '../components/toast.js';

let currentUser = null;
let familyGroups = [];
let pendingInvitations = [];

console.log('[Family Page] Loading...');

// Initialize page
async function init() {
  console.log('[Family Page] Initializing...');
  
  try {
    // Wait for auth
    currentUser = await authService.waitForAuth();
    
    console.log('[Family Page] Auth result:', currentUser ? currentUser.email : 'Not logged in');
    
    if (!currentUser) {
      console.log('[Family Page] Not authenticated, redirecting...');
      toast.error('Please login to access Family Management');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      return;
    }
    
    console.log('[Family Page] User authenticated, loading page...');
    await initPage();
    
  } catch (error) {
    console.error('[Family Page] Error:', error);
    toast.error('Failed to load page');
  }
}

// Initialize page
async function initPage() {
  // Update user profile
  updateUserProfile();
  
  // Setup event listeners
  setupEventListeners();
  
  // Check for invitation link in URL
  await checkInvitationLink();
  
  // Load data
  await loadData();
  
  // Check for hash navigation
  checkHashNavigation();
}

// Update user profile
function updateUserProfile() {
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  if (userAvatar) {
    const initials = currentUser.displayName 
      ? currentUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : currentUser.email[0].toUpperCase();
    userAvatar.textContent = initials;
  }

  if (userName) userName.textContent = currentUser.displayName || 'User';
  if (userEmail) userEmail.textContent = currentUser.email;
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
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Create family button
  document.getElementById('createFamilyBtnTop')?.addEventListener('click', () => {
    showCreateFamilyModal();
  });
}

// Load data
async function loadData() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const familyGroupsList = document.getElementById('familyGroupsList');

  try {
    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    familyGroupsList.innerHTML = '';

    // Load family groups and invitations
    [familyGroups, pendingInvitations] = await Promise.all([
      familyService.getUserFamilyGroups(),
      familyService.getUserInvitations()
    ]);

    loadingState.style.display = 'none';

    // Render invitations
    renderInvitations();

    // Render family groups
    if (familyGroups.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderFamilyGroups();
    }
  } catch (error) {
    console.error('Error loading data:', error);
    loadingState.style.display = 'none';
    toast.error('Failed to load family groups');
  }
}

// Render invitations
function renderInvitations() {
  const invitationsSection = document.getElementById('invitationsSection');
  const invitationsList = document.getElementById('invitationsList');

  if (pendingInvitations.length === 0) {
    invitationsSection.style.display = 'none';
    return;
  }

  invitationsSection.style.display = 'block';

  invitationsList.innerHTML = pendingInvitations.map(invitation => `
    <div class="invitation-item">
      <div class="invitation-info">
        <div class="invitation-group-name">${invitation.groupName}</div>
        <div class="invitation-from">Invited by ${invitation.invitedByName}</div>
      </div>
      <div class="invitation-actions">
        <button class="btn btn-sm btn-outline" onclick="declineInvitation('${invitation.id}')">
          Decline
        </button>
        <button class="btn btn-sm btn-primary" onclick="acceptInvitation('${invitation.id}')">
          Accept
        </button>
      </div>
    </div>
  `).join('');
}

// Render family groups
function renderFamilyGroups() {
  const familyGroupsList = document.getElementById('familyGroupsList');

  familyGroupsList.innerHTML = familyGroups.map(group => {
    const userMember = group.members.find(m => m.userId === currentUser.uid);
    const role = userMember ? userMember.role : 'member';
    const isAdmin = role === 'admin';
    const isCreator = group.createdBy === currentUser.uid;

    return `
      <div class="family-group-card">
        <div class="family-group-header">
          <div class="family-group-icon">👨‍👩‍👧‍👦</div>
          <div class="family-group-actions">
            ${isAdmin ? `
              <button class="btn-icon" onclick="showInviteMemberModal('${group.id}')" title="Invite member">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
              </button>
            ` : ''}
            ${isCreator ? `
              <button class="btn-icon btn-danger" onclick="showDeleteGroupModal('${group.id}', '${group.name}')" title="Delete group">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            ` : `
              <button class="btn-icon btn-danger" onclick="leaveGroup('${group.id}', '${group.name}')" title="Leave group">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            `}
          </div>
        </div>
        
        <div class="family-group-name">${group.name}</div>
        <span class="family-group-role">${role}</span>
        
        <div class="family-group-stats">
          <div class="family-stat">
            <span class="family-stat-label">Members</span>
            <span class="family-stat-value">${group.members.length}</span>
          </div>
          <div class="family-stat">
            <span class="family-stat-label">Created</span>
            <span class="family-stat-value">${formatDate(group.createdAt)}</span>
          </div>
        </div>
        
        <div class="members-list mt-3">
          ${group.members.map(member => `
            <div class="member-item">
              <div class="member-info">
                <div class="member-avatar">${getInitials(member.name)}</div>
                <div class="member-details">
                  <div class="member-name">${member.name}${member.userId === currentUser.uid ? ' (You)' : ''}</div>
                  <div class="member-email">${member.email}</div>
                </div>
              </div>
              <div class="member-actions">
                <span class="member-role-badge">${member.role}</span>
                ${isAdmin && member.userId !== currentUser.uid ? `
                  <button class="btn-icon btn-sm btn-danger" onclick="showRemoveMemberModal('${group.id}', '${member.userId}', '${member.name}')" title="Remove member">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Helper functions
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Modal functions
function showCreateFamilyModal() {
  const modal = document.getElementById('createFamilyModal');
  if (modal) {
    modal.classList.add('show');
  }
}

function showInviteMemberModal(groupId) {
  const modal = document.getElementById('inviteMemberModal');
  const groupIdInput = document.getElementById('inviteGroupId');
  
  if (modal && groupIdInput) {
    groupIdInput.value = groupId;
    modal.classList.add('show');
  }
}

window.showInviteMemberModal = showInviteMemberModal;

function showRemoveMemberModal(groupId, memberId, memberName) {
  const modal = document.getElementById('removeMemberModal');
  const groupIdInput = document.getElementById('removeGroupId');
  const memberIdInput = document.getElementById('removeMemberId');
  const memberNameSpan = document.getElementById('removeMemberName');
  
  if (modal && groupIdInput && memberIdInput && memberNameSpan) {
    groupIdInput.value = groupId;
    memberIdInput.value = memberId;
    memberNameSpan.textContent = memberName;
    modal.classList.add('show');
  }
}

window.showRemoveMemberModal = showRemoveMemberModal;

function showDeleteGroupModal(groupId, groupName) {
  const modal = document.getElementById('deleteGroupModal');
  const groupIdInput = document.getElementById('deleteGroupId');
  const groupNameSpan = document.getElementById('deleteGroupName');
  
  if (modal && groupIdInput && groupNameSpan) {
    groupIdInput.value = groupId;
    groupNameSpan.textContent = groupName;
    modal.classList.add('show');
  }
}

window.showDeleteGroupModal = showDeleteGroupModal;

// Accept invitation
async function acceptInvitation(invitationId) {
  try {
    const result = await familyService.acceptInvitation(invitationId);
    
    if (result.success) {
      toast.success('Invitation accepted! Welcome to the family group.');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to accept invitation');
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    toast.error('Failed to accept invitation');
  }
}

window.acceptInvitation = acceptInvitation;

// Decline invitation
async function declineInvitation(invitationId) {
  try {
    const result = await familyService.declineInvitation(invitationId);
    
    if (result.success) {
      toast.info('Invitation declined');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to decline invitation');
    }
  } catch (error) {
    console.error('Error declining invitation:', error);
    toast.error('Failed to decline invitation');
  }
}

window.declineInvitation = declineInvitation;

// Leave group
async function leaveGroup(groupId, groupName) {
  if (!confirm(`Are you sure you want to leave "${groupName}"?`)) {
    return;
  }

  try {
    const result = await familyService.leaveFamilyGroup(groupId);
    
    if (result.success) {
      toast.success('You have left the family group');
      await loadData();
    } else {
      toast.error(result.error || 'Failed to leave group');
    }
  } catch (error) {
    console.error('Error leaving group:', error);
    toast.error('Failed to leave group');
  }
}

window.leaveGroup = leaveGroup;

// Check hash navigation
function checkHashNavigation() {
  const hash = window.location.hash;
  if (hash === '#invitations') {
    const invitationsSection = document.getElementById('invitationsSection');
    if (invitationsSection) {
      invitationsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// Check for invitation link in URL
async function checkInvitationLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const invitationId = urlParams.get('invitation');
  
  if (invitationId) {
    // Show loading toast
    toast.info('Processing invitation...');
    
    try {
      // Try to accept the invitation
      const result = await familyService.acceptInvitation(invitationId);
      
      if (result.success) {
        toast.success('Invitation accepted! Welcome to the family group.');
        // Remove invitation parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        toast.error(result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      toast.error('Failed to process invitation');
    }
  }
}

// Logout
async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    toast.error('Failed to logout');
  }
}

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
