// Script to encrypt existing trip group data (expenses, settlements, members) and family data (groups, invitations)
import { db } from '../config/firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';
import encryptionService from '../services/encryption-service.js';

class TripDataEncryptor {
  constructor() {
    this.membersCollection = 'tripGroupMembers';
    this.expensesCollection = 'tripGroupExpenses';
    this.settlementsCollection = 'tripGroupSettlements';
    this.familyGroupsCollection = 'familyGroups';
    this.familyInvitationsCollection = 'familyInvitations';
    
    this.stats = {
      members: { processed: 0, errors: 0, skipped: 0 },
      expenses: { processed: 0, errors: 0, skipped: 0 },
      settlements: { processed: 0, errors: 0, skipped: 0 },
      familyGroups: { processed: 0, errors: 0, skipped: 0 },
      familyInvitations: { processed: 0, errors: 0, skipped: 0 }
    };
  }

  // Check if data is already encrypted (has _encrypted field)
  isEncrypted(data) {
    return data && data._encrypted && typeof data._encrypted === 'object';
  }

  // Check if a value looks encrypted (base64-like string)
  looksEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    return value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
  }

  // ============================================
  // MEMBER ENCRYPTION
  // ============================================

  async encryptMember(memberId, memberData) {
    try {
      const updates = {};
      let needsUpdate = false;

      // Encrypt name if not already encrypted
      if (memberData.name && !this.looksEncrypted(memberData.name)) {
        updates.name = await encryptionService.encryptValue(memberData.name);
        needsUpdate = true;
      }

      // Encrypt email if present and not already encrypted
      if (memberData.email && !this.looksEncrypted(memberData.email)) {
        updates.email = await encryptionService.encryptValue(memberData.email);
        needsUpdate = true;
      }

      // Encrypt phone if present and not already encrypted
      if (memberData.phone && !this.looksEncrypted(memberData.phone)) {
        updates.phone = await encryptionService.encryptValue(memberData.phone);
        needsUpdate = true;
      }

      if (needsUpdate) {
        const memberRef = doc(db, this.membersCollection, memberId);
        await updateDoc(memberRef, updates);
        this.stats.members.processed++;
        return { success: true };
      } else {
        this.stats.members.skipped++;
        return { success: true, skipped: true };
      }
    } catch (error) {
      this.stats.members.errors++;
      console.error(`✗ Error encrypting member ${memberId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllMembers() {
    const membersSnapshot = await getDocs(collection(db, this.membersCollection));
    const totalMembers = membersSnapshot.size;

    if (totalMembers === 0) return;

    let index = 0;
    for (const docSnap of membersSnapshot.docs) {
      index++;
      await this.encryptMember(docSnap.id, docSnap.data());

      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // ============================================
  // EXPENSE ENCRYPTION
  // ============================================

  async encryptExpense(expenseId, expenseData) {
    try {
      // Check if already encrypted using the new format
      if (this.isEncrypted(expenseData)) {
        this.stats.expenses.skipped++;
        return { success: true, skipped: true };
      }

      // Use encryptObject to encrypt the entire expense
      const encryptedExpense = await encryptionService.encryptObject(
        expenseData, 
        this.expensesCollection
      );

      // Check if anything was actually encrypted
      if (!encryptedExpense._encrypted || Object.keys(encryptedExpense._encrypted).length === 0) {
        this.stats.expenses.skipped++;
        return { success: true, skipped: true };
      }

      const expenseRef = doc(db, this.expensesCollection, expenseId);
      await updateDoc(expenseRef, encryptedExpense);
      
      this.stats.expenses.processed++;
      return { success: true };
    } catch (error) {
      this.stats.expenses.errors++;
      console.error(`✗ Error encrypting expense ${expenseId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllExpenses() {
    const expensesSnapshot = await getDocs(collection(db, this.expensesCollection));
    const totalExpenses = expensesSnapshot.size;

    if (totalExpenses === 0) return;

    let index = 0;
    for (const docSnap of expensesSnapshot.docs) {
      index++;
      await this.encryptExpense(docSnap.id, docSnap.data());

      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // ============================================
  // SETTLEMENT ENCRYPTION
  // ============================================

  async encryptSettlement(settlementId, settlementData) {
    try {
      // Check if already encrypted using the new format
      if (this.isEncrypted(settlementData)) {
        this.stats.settlements.skipped++;
        return { success: true, skipped: true };
      }

      // Use encryptObject to encrypt the entire settlement
      const encryptedSettlement = await encryptionService.encryptObject(
        settlementData, 
        this.settlementsCollection
      );

      // Check if anything was actually encrypted
      if (!encryptedSettlement._encrypted || Object.keys(encryptedSettlement._encrypted).length === 0) {
        this.stats.settlements.skipped++;
        return { success: true, skipped: true };
      }

      const settlementRef = doc(db, this.settlementsCollection, settlementId);
      await updateDoc(settlementRef, encryptedSettlement);
      
      this.stats.settlements.processed++;
      return { success: true };
    } catch (error) {
      this.stats.settlements.errors++;
      console.error(`✗ Error encrypting settlement ${settlementId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllSettlements() {
    const settlementsSnapshot = await getDocs(collection(db, this.settlementsCollection));
    const totalSettlements = settlementsSnapshot.size;

    if (totalSettlements === 0) return;

    let index = 0;
    for (const docSnap of settlementsSnapshot.docs) {
      index++;
      await this.encryptSettlement(docSnap.id, docSnap.data());

      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // ============================================
  // FAMILY GROUP ENCRYPTION
  // ============================================

  async encryptFamilyGroup(groupId, groupData) {
    try {
      // Check if already encrypted using the new format
      if (this.isEncrypted(groupData)) {
        this.stats.familyGroups.skipped++;
        return { success: true, skipped: true };
      }

      // Use encryptObject to encrypt the entire group
      const encryptedGroup = await encryptionService.encryptObject(
        groupData, 
        this.familyGroupsCollection
      );

      // Check if anything was actually encrypted
      if (!encryptedGroup._encrypted || Object.keys(encryptedGroup._encrypted).length === 0) {
        this.stats.familyGroups.skipped++;
        return { success: true, skipped: true };
      }

      const groupRef = doc(db, this.familyGroupsCollection, groupId);
      await updateDoc(groupRef, encryptedGroup);
      
      this.stats.familyGroups.processed++;
      return { success: true };
    } catch (error) {
      this.stats.familyGroups.errors++;
      console.error(`✗ Error encrypting family group ${groupId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllFamilyGroups() {
    const groupsSnapshot = await getDocs(collection(db, this.familyGroupsCollection));
    const totalGroups = groupsSnapshot.size;

    if (totalGroups === 0) return;

    let index = 0;
    for (const docSnap of groupsSnapshot.docs) {
      index++;
      await this.encryptFamilyGroup(docSnap.id, docSnap.data());

      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // ============================================
  // FAMILY INVITATION ENCRYPTION
  // ============================================

  async encryptFamilyInvitation(invitationId, invitationData) {
    try {
      // Check if already encrypted using the new format
      if (this.isEncrypted(invitationData)) {
        this.stats.familyInvitations.skipped++;
        return { success: true, skipped: true };
      }

      // Use encryptObject to encrypt the entire invitation
      const encryptedInvitation = await encryptionService.encryptObject(
        invitationData, 
        this.familyInvitationsCollection
      );

      // Check if anything was actually encrypted
      if (!encryptedInvitation._encrypted || Object.keys(encryptedInvitation._encrypted).length === 0) {
        this.stats.familyInvitations.skipped++;
        return { success: true, skipped: true };
      }

      const invitationRef = doc(db, this.familyInvitationsCollection, invitationId);
      await updateDoc(invitationRef, encryptedInvitation);
      
      this.stats.familyInvitations.processed++;
      return { success: true };
    } catch (error) {
      this.stats.familyInvitations.errors++;
      console.error(`✗ Error encrypting invitation ${invitationId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllFamilyInvitations() {
    const invitationsSnapshot = await getDocs(collection(db, this.familyInvitationsCollection));
    const totalInvitations = invitationsSnapshot.size;

    if (totalInvitations === 0) return;

    let index = 0;
    for (const docSnap of invitationsSnapshot.docs) {
      index++;
      await this.encryptFamilyInvitation(docSnap.id, docSnap.data());

      if (index % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // ============================================
  // MAIN PROCESS
  // ============================================

  async encryptAllTripData() {
    try {

      // Check authentication
      await authService.waitForAuth();
      if (!authService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      // Check encryption key
      const hasKey = await encryptionService.hasEncryptionKey();
      if (!hasKey) {
        throw new Error('No encryption key found. Please set up encryption first.');
      }

      // Reset stats
      this.stats = {
        members: { processed: 0, errors: 0, skipped: 0 },
        expenses: { processed: 0, errors: 0, skipped: 0 },
        settlements: { processed: 0, errors: 0, skipped: 0 },
        familyGroups: { processed: 0, errors: 0, skipped: 0 },
        familyInvitations: { processed: 0, errors: 0, skipped: 0 }
      };

      // Encrypt all data types
      await this.encryptAllMembers();
      await this.encryptAllExpenses();
      await this.encryptAllSettlements();
      await this.encryptAllFamilyGroups();
      await this.encryptAllFamilyInvitations();
      
      const totalErrors = this.stats.members.errors + this.stats.expenses.errors + 
                         this.stats.settlements.errors + this.stats.familyGroups.errors + 
                         this.stats.familyInvitations.errors;
      const totalProcessed = this.stats.members.processed + this.stats.expenses.processed + 
                            this.stats.settlements.processed + this.stats.familyGroups.processed + 
                            this.stats.familyInvitations.processed;

    } catch (error) {
      console.error('\n❌ Fatal error during encryption:', error);
      throw error;
    }
  }

  // ============================================
  // VERIFICATION
  // ============================================

  async verifyEncryption() {
    try {

      let verified = { members: 0, expenses: 0, settlements: 0, familyGroups: 0, familyInvitations: 0 };
      let failed = { members: 0, expenses: 0, settlements: 0, familyGroups: 0, familyInvitations: 0 };

      // Verify members
      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      for (const docSnap of membersSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (data.name && this.looksEncrypted(data.name)) {
            const decrypted = await encryptionService.decryptValue(data.name);
            if (decrypted) {
              verified.members++;
            }
          }
        } catch (error) {
          failed.members++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify expenses
      const expensesSnapshot = await getDocs(collection(db, this.expensesCollection));
      for (const docSnap of expensesSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.expensesCollection);
            if (decrypted) {
              verified.expenses++;
            }
          }
        } catch (error) {
          failed.expenses++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify settlements
      const settlementsSnapshot = await getDocs(collection(db, this.settlementsCollection));
      for (const docSnap of settlementsSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.settlementsCollection);
            if (decrypted) {
              verified.settlements++;
            }
          }
        } catch (error) {
          failed.settlements++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify family groups
      const groupsSnapshot = await getDocs(collection(db, this.familyGroupsCollection));
      for (const docSnap of groupsSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.familyGroupsCollection);
            if (decrypted) {
              verified.familyGroups++;
            }
          }
        } catch (error) {
          failed.familyGroups++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify family invitations
      const invitationsSnapshot = await getDocs(collection(db, this.familyInvitationsCollection));
      for (const docSnap of invitationsSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.familyInvitationsCollection);
            if (decrypted) {
              verified.familyInvitations++;
            }
          }
        } catch (error) {
          failed.familyInvitations++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

    } catch (error) {
      console.error('\n❌ Error during verification:', error);
      throw error;
    }
  }
}

// Create instance
const encryptor = new TripDataEncryptor();

// Export for use in console or other scripts
window.tripDataEncryptor = encryptor;

// Auto-run message
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
  });
} else {
}

export default encryptor;
