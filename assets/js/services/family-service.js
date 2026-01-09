// Family Account Service
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import familyEncryptionService from './family-encryption-service.js';

class FamilyService {
  constructor() {
    this.familyGroupsCollection = 'familyGroups';
    this.invitationsCollection = 'familyInvitations';
    this.usersCollection = 'users';
  }

  // Get current user ID
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Create a new family group
  async createFamilyGroup(groupName) {
    try {
      const userId = this.getUserId();
      const user = authService.getCurrentUser();

      const groupData = {
        name: groupName,
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        members: [{
          userId: userId,
          email: user.email,
          name: user.displayName || user.email,
          role: 'admin',
          joinedAt: Timestamp.now()
        }],
        settings: {
          currency: 'INR',
          allowMemberInvites: true,
          shareAllTransactions: false
        }
      };

      // Create the family group
      const docRef = await addDoc(collection(db, this.familyGroupsCollection), groupData);

      // Create shared encryption key for the family group
      try {
        await familyEncryptionService.createFamilyKey(docRef.id);
        console.log('[FamilyService] Created shared encryption key for family group');
      } catch (keyError) {
        console.error('[FamilyService] Failed to create family encryption key:', keyError);
        // Continue anyway - key can be created later
      }

      // Update user's familyGroups array
      await this.updateUserFamilyGroups(userId, docRef.id, 'add');

      return { success: true, groupId: docRef.id, data: groupData };
    } catch (error) {
      console.error('Error creating family group:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's family groups
  async getUserFamilyGroups() {
    try {
      const userId = this.getUserId();

      // Get all family groups (not encrypted since they're shared)
      const groupsSnapshot = await getDocs(collection(db, this.familyGroupsCollection));
      const groups = [];

      console.log('[FamilyService] Found', groupsSnapshot.docs.length, 'total groups');

      for (const docSnap of groupsSnapshot.docs) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
        
        // Family groups are NOT encrypted - they are shared across users
        // Each user has a different encryption key, so shared data cannot be encrypted
        
        // Ensure members is an array
        if (!Array.isArray(groupData.members)) {
          console.error('[FamilyService] Members is not an array:', groupData.members);
          groupData.members = [];
        }
        
        const isMember = groupData.members.some(member => member.userId === userId);
        if (isMember) {
          groups.push(groupData);
        }
      }

      console.log('[FamilyService] Returning', groups.length, 'groups for user');
      return groups;
    } catch (error) {
      console.error('Error getting family groups:', error);
      return [];
    }
  }

  // Get specific family group
  async getFamilyGroup(groupId) {
    try {
      const docRef = doc(db, this.familyGroupsCollection, groupId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        
        // Family groups are NOT encrypted - shared data across users
        return { success: true, data: data };
      } else {
        return { success: false, error: 'Group not found' };
      }
    } catch (error) {
      console.error('Error getting family group:', error);
      return { success: false, error: error.message };
    }
  }

  // Invite member to family group
  async inviteMember(groupId, email, role = 'member') {
    try {
      const userId = this.getUserId();
      const user = authService.getCurrentUser();

      // Get group details
      const groupResult = await this.getFamilyGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }

      const group = groupResult.data;

      // Check if user is admin
      const isAdmin = group.members.some(m => m.userId === userId && m.role === 'admin');
      if (!isAdmin && !group.settings.allowMemberInvites) {
        return { success: false, error: 'Only admins can invite members' };
      }

      // Check if email is already a member
      const isAlreadyMember = group.members.some(m => m.email === email);
      if (isAlreadyMember) {
        return { success: false, error: 'User is already a member' };
      }

      // Check for existing pending invitation
      const existingInvite = await this.getPendingInvitation(groupId, email);
      if (existingInvite) {
        return { success: false, error: 'Invitation already sent' };
      }

      // Create invitation
      const invitationData = {
        groupId: groupId,
        groupName: group.name,
        invitedBy: userId,
        invitedByName: user.displayName || user.email,
        invitedEmail: email.toLowerCase(),
        role: role,
        status: 'pending',
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // 7 days
      };

      // Family invitations are NOT encrypted - shared data across users
      const docRef = await addDoc(collection(db, this.invitationsCollection), invitationData);

      // Send email notification
      await this.sendInvitationEmail({
        ...invitationData,
        invitationId: docRef.id
      });

      return { success: true, invitationId: docRef.id, data: invitationData };
    } catch (error) {
      console.error('Error inviting member:', error);
      return { success: false, error: error.message };
    }
  }

  // Get pending invitation
  async getPendingInvitation(groupId, email) {
    try {
      const q = query(
        collection(db, this.invitationsCollection),
        where('groupId', '==', groupId),
        where('invitedEmail', '==', email.toLowerCase()),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() };
        
        // Family invitations are NOT encrypted - shared data
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error getting pending invitation:', error);
      return null;
    }
  }

  // Get user's pending invitations
  async getUserInvitations() {
    try {
      const user = authService.getCurrentUser();
      if (!user || !user.email) return [];

      const q = query(
        collection(db, this.invitationsCollection),
        where('invitedEmail', '==', user.email.toLowerCase()),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      const invitations = [];

      for (const docSnap of snapshot.docs) {
        const invitationData = { id: docSnap.id, ...docSnap.data() };
        
        // Family invitations are NOT encrypted - shared data
        
        // Check if not expired (with null safety)
        const expiresAt = invitationData.expiresAt?.toDate ? invitationData.expiresAt.toDate() : null;
        if (!expiresAt || expiresAt > new Date()) {
          invitations.push(invitationData);
        }
      }

      return invitations;
    } catch (error) {
      console.error('Error getting user invitations:', error);
      return [];
    }
  }

  // Accept invitation
  async acceptInvitation(invitationId) {
    try {
      const userId = this.getUserId();
      const user = authService.getCurrentUser();

      if (!user || !user.email) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get invitation
      const inviteRef = doc(db, this.invitationsCollection, invitationId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      const invitationData = { id: inviteSnap.id, ...inviteSnap.data() };
      
      // Family invitations are NOT encrypted - shared data
      const invitation = invitationData;

      // Check if invitation is for this user
      if (!invitation.invitedEmail || invitation.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
        return { success: false, error: 'Invitation not for this user' };
      }

      // Check if expired (with null safety)
      const expiresAt = invitation.expiresAt?.toDate ? invitation.expiresAt.toDate() : null;
      if (expiresAt && expiresAt < new Date()) {
        await updateDoc(inviteRef, { status: 'expired' });
        return { success: false, error: 'Invitation expired' };
      }

      // Get current group data
      const groupRef = doc(db, this.familyGroupsCollection, invitation.groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        return { success: false, error: 'Family group not found' };
      }

      // Get and decrypt group data
      const encryptedGroupData = { id: groupSnap.id, ...groupSnap.data() };
      // Family groups are NOT encrypted - shared data
      const groupData = encryptedGroupData;

      // Ensure members is an array
      if (!Array.isArray(groupData.members)) {
        console.error('Members is not an array:', groupData.members);
        groupData.members = [];
      }

      // Check if user is already a member
      const isAlreadyMember = groupData.members.some(m => m.userId === userId);
      if (isAlreadyMember) {
        return { success: false, error: 'You are already a member of this group' };
      }

      // Add new member to the members array
      const memberData = {
        userId: userId,
        email: user.email,
        name: user.displayName || user.email,
        role: invitation.role,
        joinedAt: Timestamp.now()
      };

      const updatedMembers = [...(groupData.members || []), memberData];

      // Update group with new member - family groups are NOT encrypted
      await updateDoc(groupRef, {
        members: updatedMembers,
        updatedAt: Timestamp.now()
      });

      // Update invitation status
      await updateDoc(inviteRef, {
        status: 'accepted',
        acceptedAt: Timestamp.now()
      });

      // Update user's familyGroups array
      await this.updateUserFamilyGroups(userId, invitation.groupId, 'add');

      // Add user's encrypted family key
      try {
        await familyEncryptionService.addMemberToFamilyKey(invitation.groupId, userId);
        console.log('[FamilyService] Added family encryption key for new member');
      } catch (keyError) {
        console.error('[FamilyService] Failed to add family encryption key:', keyError);
        // Continue anyway - key can be added later
      }

      return { success: true, groupId: invitation.groupId };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: error.message };
    }
  }

  // Decline invitation
  async declineInvitation(invitationId) {
    try {
      const inviteRef = doc(db, this.invitationsCollection, invitationId);
      await updateDoc(inviteRef, {
        status: 'declined',
        declinedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error declining invitation:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove member from family group
  async removeMember(groupId, memberUserId) {
    try {
      const userId = this.getUserId();

      // Get group
      const groupResult = await this.getFamilyGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }

      const group = groupResult.data;

      // Check if user is admin
      const isAdmin = group.members.some(m => m.userId === userId && m.role === 'admin');
      if (!isAdmin) {
        return { success: false, error: 'Only admins can remove members' };
      }

      // Cannot remove yourself if you're the only admin
      const adminCount = group.members.filter(m => m.role === 'admin').length;
      if (userId === memberUserId && adminCount === 1) {
        return { success: false, error: 'Cannot remove the only admin' };
      }

      // Find and remove member
      const memberToRemove = group.members.find(m => m.userId === memberUserId);
      if (!memberToRemove) {
        return { success: false, error: 'Member not found' };
      }

      // Remove member from the members array
      const updatedMembers = group.members.filter(m => m.userId !== memberUserId);

      // Update group with removed member - family groups are NOT encrypted
      const groupRef = doc(db, this.familyGroupsCollection, groupId);
      await updateDoc(groupRef, {
        members: updatedMembers,
        updatedAt: Timestamp.now()
      });

      // Update user's familyGroups array
      await this.updateUserFamilyGroups(memberUserId, groupId, 'remove');

      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message };
    }
  }

  // Leave family group
  async leaveFamilyGroup(groupId) {
    try {
      const userId = this.getUserId();
      return await this.removeMember(groupId, userId);
    } catch (error) {
      console.error('Error leaving family group:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete family group (admin only)
  async deleteFamilyGroup(groupId) {
    try {
      const userId = this.getUserId();

      // Get group
      const groupResult = await this.getFamilyGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }

      const group = groupResult.data;

      // Check if user is creator
      if (group.createdBy !== userId) {
        return { success: false, error: 'Only the creator can delete the group' };
      }

      // Remove group from all members' familyGroups
      for (const member of group.members) {
        await this.updateUserFamilyGroups(member.userId, groupId, 'remove');
      }

      // Delete group
      await deleteDoc(doc(db, this.familyGroupsCollection, groupId));

      // Delete pending invitations
      const invitesQuery = query(
        collection(db, this.invitationsCollection),
        where('groupId', '==', groupId),
        where('status', '==', 'pending')
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      invitesSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting family group:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user's familyGroups array
  async updateUserFamilyGroups(userId, groupId, action) {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        if (action === 'add') {
          await updateDoc(userRef, {
            familyGroups: arrayUnion(groupId),
            updatedAt: Timestamp.now()
          });
        } else if (action === 'remove') {
          await updateDoc(userRef, {
            familyGroups: arrayRemove(groupId),
            updatedAt: Timestamp.now()
          });
        }
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          userId: userId,
          familyGroups: [groupId],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error updating user family groups:', error);
    }
  }

  // Update group settings
  async updateGroupSettings(groupId, settings) {
    try {
      const userId = this.getUserId();

      // Get group
      const groupResult = await this.getFamilyGroup(groupId);
      if (!groupResult.success) {
        return { success: false, error: 'Group not found' };
      }

      const group = groupResult.data;

      // Check if user is admin
      const isAdmin = group.members.some(m => m.userId === userId && m.role === 'admin');
      if (!isAdmin) {
        return { success: false, error: 'Only admins can update settings' };
      }

      // Update group settings - family groups are NOT encrypted
      const groupRef = doc(db, this.familyGroupsCollection, groupId);
      await updateDoc(groupRef, {
        settings: { ...group.settings, ...settings },
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating group settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Get family expenses (all members)
  async getFamilyExpenses(groupId) {
    try {
      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('familyGroupId', '==', groupId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const expenses = [];

      snapshot.forEach((doc) => {
        expenses.push({ id: doc.id, ...doc.data() });
      });

      return expenses;
    } catch (error) {
      console.error('Error getting family expenses:', error);
      return [];
    }
  }

  // Get family income (all members)
  async getFamilyIncome(groupId) {
    try {
      const incomeRef = collection(db, 'income');
      const q = query(
        incomeRef,
        where('familyGroupId', '==', groupId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const income = [];

      snapshot.forEach((doc) => {
        income.push({ id: doc.id, ...doc.data() });
      });

      return income;
    } catch (error) {
      console.error('Error getting family income:', error);
      return [];
    }
  }

  // Get member's expenses
  async getMemberExpenses(groupId, memberId) {
    try {
      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('familyGroupId', '==', groupId),
        where('userId', '==', memberId),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const expenses = [];

      snapshot.forEach((doc) => {
        expenses.push({ id: doc.id, ...doc.data() });
      });

      return expenses;
    } catch (error) {
      console.error('Error getting member expenses:', error);
      return [];
    }
  }

  // Send invitation email
  async sendInvitationEmail(invitationData) {
    try {
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invitedEmail: invitationData.invitedEmail,
          invitedByName: invitationData.invitedByName,
          groupName: invitationData.groupName,
          invitationId: invitationData.invitationId
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Server returned HTML or other non-JSON content (likely an error page)
        const text = await response.text();
        console.error('Server returned non-JSON response:', text.substring(0, 200));
        result = { error: 'Server error: Email service is not configured properly' };
      }
      
      if (!response.ok) {
        console.error('Failed to send invitation email:', result.error);
        return { success: false, error: result.error || 'Failed to send invitation email' };
      }

      console.log('Invitation email sent successfully');
      return { success: true };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const familyService = new FamilyService();
export default familyService;
