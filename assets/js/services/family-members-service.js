// Family Members Service - Manages predefined family member roles
import firestoreService from './firestore-service.js';
import authService from './auth-service.js';
import encryptionService from './encryption-service.js';

class FamilyMembersService {
  constructor() {
    this.defaultMembers = [
      { id: 'self', role: 'Self', name: 'Me', icon: '👤', order: 1, enabled: true },
      { id: 'spouse', role: 'Spouse', name: 'Wife', icon: '👩', order: 2, enabled: true },
      { id: 'child1', role: 'Child 1', name: 'Child 1', icon: '👦', order: 3, enabled: true },
      { id: 'child2', role: 'Child 2', name: 'Child 2', icon: '👧', order: 4, enabled: false },
      { id: 'father', role: 'Father', name: 'Father', icon: '👨', order: 5, enabled: false },
      { id: 'mother', role: 'Mother', name: 'Mother', icon: '👩', order: 6, enabled: false }
    ];
  }

  // Encrypt family member data
  async encryptMemberData(members) {
    try {
      const encryptedMembers = await Promise.all(members.map(async (member) => {
        return {
          ...member,
          name: await encryptionService.encryptValue(member.name),
          role: await encryptionService.encryptValue(member.role)
        };
      }));
      return encryptedMembers;
    } catch (error) {
      console.error('Error encrypting family member data:', error);
      throw error;
    }
  }

  // Decrypt family member data
  async decryptMemberData(members) {
    try {
      const decryptedMembers = await Promise.all(members.map(async (member) => {
        return {
          ...member,
          name: await encryptionService.decryptValue(member.name),
          role: await encryptionService.decryptValue(member.role)
        };
      }));
      return decryptedMembers;
    } catch (error) {
      console.error('Error decrypting family member data:', error);
      // Return original data if decryption fails (might be unencrypted legacy data)
      return members;
    }
  }

  // Get family members (from user settings or defaults)
  async getFamilyMembers() {
    try {
      const user = authService.getCurrentUser();
      if (!user) return this.defaultMembers;

      // Try to get custom names from user settings
      const userSettings = await firestoreService.getUserSettings();
      
      if (userSettings && userSettings.familyMembers) {
        // Decrypt the data
        const decryptedMembers = await this.decryptMemberData(userSettings.familyMembers);
        return decryptedMembers;
      }

      // Return defaults if no custom settings
      return this.defaultMembers;
    } catch (error) {
      console.error('Error getting family members:', error);
      return this.defaultMembers;
    }
  }

  // Update family member names
  async updateFamilyMembers(members) {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Encrypt the data before saving
      const encryptedMembers = await this.encryptMemberData(members);

      await firestoreService.updateUserSettings({
        familyMembers: encryptedMembers
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating family members:', error);
      return { success: false, error: error.message };
    }
  }

  // Get active family members (those that are enabled)
  async getActiveFamilyMembers() {
    const members = await this.getFamilyMembers();
    return members.filter(m => m.enabled !== false);
  }

  // Reset to defaults
  async resetToDefaults() {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Encrypt default members before saving
      const encryptedDefaults = await this.encryptMemberData(this.defaultMembers);

      await firestoreService.updateUserSettings({
        familyMembers: encryptedDefaults
      });

      return { success: true };
    } catch (error) {
      console.error('Error resetting family members:', error);
      return { success: false, error: error.message };
    }
  }

  // Add a new family member
  async addFamilyMember(memberData) {
    try {
      const members = await this.getFamilyMembers();
      
      // Generate unique ID
      const newId = `custom_${Date.now()}`;
      
      const newMember = {
        id: newId,
        role: memberData.role || 'Family Member',
        name: memberData.name || 'New Member',
        icon: memberData.icon || '👤',
        order: members.length + 1,
        enabled: true,
        isCustom: true
      };
      
      members.push(newMember);
      
      const result = await this.updateFamilyMembers(members);
      return result;
    } catch (error) {
      console.error('Error adding family member:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove a family member
  async removeFamilyMember(memberId) {
    try {
      const members = await this.getFamilyMembers();
      const filteredMembers = members.filter(m => m.id !== memberId);
      
      if (filteredMembers.length === members.length) {
        return { success: false, error: 'Member not found' };
      }
      
      const result = await this.updateFamilyMembers(filteredMembers);
      return result;
    } catch (error) {
      console.error('Error removing family member:', error);
      return { success: false, error: error.message };
    }
  }
}

const familyMembersService = new FamilyMembersService();
export default familyMembersService;
