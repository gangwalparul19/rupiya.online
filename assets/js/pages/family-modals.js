// Family Modals Logic
import familyService from '../services/family-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModals);
} else {
  initModals();
}

function initModals() {
  setupCreateFamilyModal();
  setupInviteMemberModal();
  setupRemoveMemberModal();
  setupDeleteGroupModal();
  setupModalCloseHandlers();
}

// Setup Create Family Modal
function setupCreateFamilyModal() {
  const createFamilyForm = document.getElementById('createFamilyForm');
  const createFamilyModal = document.getElementById('createFamilyModal');
  
  if (createFamilyForm) {
    createFamilyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('createFamilySubmit');
      const groupName = document.getElementById('familyGroupName').value.trim();
      
      if (!groupName) {
        toast.error('Please enter a group name');
        return;
      }
      
      // Show loading
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';
      
      try {
        const result = await familyService.createFamilyGroup(groupName);
        
        if (result.success) {
          toast.success('Family group created successfully!');
          createFamilyModal.classList.remove('show');
          createFamilyForm.reset();
          
          // Reload the page to show the new group
          window.location.reload();
        } else {
          toast.error(result.error || 'Failed to create family group');
        }
      } catch (error) {
        console.error('Error creating family group:', error);
        toast.error('Failed to create family group');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}

// Setup Invite Member Modal
function setupInviteMemberModal() {
  const inviteMemberForm = document.getElementById('inviteMemberForm');
  
  if (inviteMemberForm) {
    inviteMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('inviteMemberSubmit');
      const groupId = document.getElementById('inviteGroupId').value;
      const email = document.getElementById('inviteEmail').value.trim();
      const role = document.getElementById('inviteRole').value;
      
      if (!email) {
        toast.error('Please enter an email address');
        return;
      }
      
      // Show loading
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      
      try {
        const result = await familyService.inviteMember(groupId, email, role);
        
        if (result.success) {
          toast.success('Invitation sent successfully!');
          document.getElementById('inviteMemberModal').classList.remove('show');
          inviteMemberForm.reset();
        } else {
          toast.error(result.error || 'Failed to send invitation');
        }
      } catch (error) {
        console.error('Error sending invitation:', error);
        toast.error('Failed to send invitation');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}

// Setup Remove Member Modal
function setupRemoveMemberModal() {
  const confirmRemoveBtn = document.getElementById('confirmRemoveMember');
  
  if (confirmRemoveBtn) {
    confirmRemoveBtn.addEventListener('click', async () => {
      const groupId = document.getElementById('removeGroupId').value;
      const memberId = document.getElementById('removeMemberId').value;
      
      // Show loading
      const originalText = confirmRemoveBtn.textContent;
      confirmRemoveBtn.disabled = true;
      confirmRemoveBtn.textContent = 'Removing...';
      
      try {
        const result = await familyService.removeMember(groupId, memberId);
        
        if (result.success) {
          toast.success('Member removed successfully');
          document.getElementById('removeMemberModal').classList.remove('show');
          
          // Reload the page to update the member list
          window.location.reload();
        } else {
          toast.error(result.error || 'Failed to remove member');
        }
      } catch (error) {
        console.error('Error removing member:', error);
        toast.error('Failed to remove member');
      } finally {
        confirmRemoveBtn.disabled = false;
        confirmRemoveBtn.textContent = originalText;
      }
    });
  }
}

// Setup Delete Group Modal
function setupDeleteGroupModal() {
  const confirmDeleteBtn = document.getElementById('confirmDeleteGroup');
  
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      const groupId = document.getElementById('deleteGroupId').value;
      
      // Show loading
      const originalText = confirmDeleteBtn.textContent;
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = 'Deleting...';
      
      try {
        const result = await familyService.deleteFamilyGroup(groupId);
        
        if (result.success) {
          toast.success('Family group deleted successfully');
          document.getElementById('deleteGroupModal').classList.remove('show');
          
          // Reload the page
          window.location.reload();
        } else {
          toast.error(result.error || 'Failed to delete group');
        }
      } catch (error) {
        console.error('Error deleting group:', error);
        toast.error('Failed to delete group');
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = originalText;
      }
    });
  }
}

// Setup Modal Close Handlers
function setupModalCloseHandlers() {
  // Close buttons
  document.getElementById('closeCreateFamilyModal')?.addEventListener('click', () => {
    document.getElementById('createFamilyModal')?.classList.remove('show');
  });

  document.getElementById('cancelCreateFamily')?.addEventListener('click', () => {
    document.getElementById('createFamilyModal')?.classList.remove('show');
  });

  document.getElementById('closeInviteMemberModal')?.addEventListener('click', () => {
    document.getElementById('inviteMemberModal')?.classList.remove('show');
  });

  document.getElementById('cancelInviteMember')?.addEventListener('click', () => {
    document.getElementById('inviteMemberModal')?.classList.remove('show');
  });

  document.getElementById('closeRemoveMemberModal')?.addEventListener('click', () => {
    document.getElementById('removeMemberModal')?.classList.remove('show');
  });

  document.getElementById('cancelRemoveMember')?.addEventListener('click', () => {
    document.getElementById('removeMemberModal')?.classList.remove('show');
  });

  document.getElementById('closeDeleteGroupModal')?.addEventListener('click', () => {
    document.getElementById('deleteGroupModal')?.classList.remove('show');
  });

  document.getElementById('cancelDeleteGroup')?.addEventListener('click', () => {
    document.getElementById('deleteGroupModal')?.classList.remove('show');
  });

  // Close modals when clicking outside
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
}
