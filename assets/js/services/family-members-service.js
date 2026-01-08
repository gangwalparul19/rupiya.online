// Family Members Service - Manages predefined family member roles
import firestoreService from './firestore-service.js';
import authService from './auth-service.js';

class FamilyMembersService {
  constructor() {
    this.defaultMembers = [
      { id: 'self', role: 'Self', name: 'Me', icon: '👤', order: 1 },
      { id: 'spouse', role: 'Spouse', name: 'Wife', icon: '👩', order: 2 },
      { id: 'child1', role: 'Child 1', name: 'Child 1', icon: '👦', order: 3 },
      { id: 'child2', role: 'Child 2', name: 'Child 2', icon: '👧', order: 4 },
      { id: 'father', role: 'Father', name: 'Father', icon: '👨', order: 5 },
      { id: 'mother', role: 'Mother', name: 'Mother', icon: '👩', order: 6 }
    ];
  }

  // Get family members (from user settings or defaults)
  async getFamilyMembers() {
    try {
      const user = authService.getCurrentUser();
      if (!user) return this.defaultMembers;

      // Try to get custom names from user settings
      const userSettings = await firestoreService.getUserSettings();
      
      if (userSettings && userSettings.familyMembers) {
        return userSettings.familyMembers;
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

      await firestoreService.updateUserSettings({
        familyMembers: members
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

      await firestoreService.updateUserSettings({
        familyMembers: this.defaultMembers
      });

      return { success: true };
    } catch (error) {
      console.error('Error resetting family members:', error);
      return { success: false, error: error.message };
    }
  }
}

const familyMembersService = new FamilyMembersService();
export default familyMembersService;
