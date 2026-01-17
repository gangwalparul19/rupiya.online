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
    console.log('\n📋 Processing trip group members...');
    const membersSnapshot = await getDocs(collection(db, this.membersCollection));
    const totalMembers = membersSnapshot.size;
    console.log(`Found ${totalMembers} members\n`);

    if (totalMembers === 0) return;

    let index = 0;
    for (const docSnap of membersSnapshot.docs) {
      index++;
      console.log(`[${index}/${totalMembers}] Member: ${docSnap.id}`);
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
        console.log(`⊘ Skipped expense (already encrypted): ${expenseId}`);
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
        console.log(`⊘ Skipped expense (no sensitive data): ${expenseId}`);
        return { success: true, skipped: true };
      }

      console.log(`  - Encrypted fields: ${Object.keys(encryptedExpense._encrypted).join(', ')}`);

      const expenseRef = doc(db, this.expensesCollection, expenseId);
      await updateDoc(expenseRef, encryptedExpense);
      
      this.stats.expenses.processed++;
      console.log(`✓ Encrypted expense: ${expenseId}`);
      return { success: true };
    } catch (error) {
      this.stats.expenses.errors++;
      console.error(`✗ Error encrypting expense ${expenseId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllExpenses() {
    console.log('\n💰 Processing trip group expenses...');
    const expensesSnapshot = await getDocs(collection(db, this.expensesCollection));
    const totalExpenses = expensesSnapshot.size;
    console.log(`Found ${totalExpenses} expenses\n`);

    if (totalExpenses === 0) return;

    let index = 0;
    for (const docSnap of expensesSnapshot.docs) {
      index++;
      console.log(`[${index}/${totalExpenses}] Expense: ${docSnap.id}`);
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
        console.log(`⊘ Skipped settlement (already encrypted): ${settlementId}`);
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
        console.log(`⊘ Skipped settlement (no sensitive data): ${settlementId}`);
        return { success: true, skipped: true };
      }

      console.log(`  - Encrypted fields: ${Object.keys(encryptedSettlement._encrypted).join(', ')}`);

      const settlementRef = doc(db, this.settlementsCollection, settlementId);
      await updateDoc(settlementRef, encryptedSettlement);
      
      this.stats.settlements.processed++;
      console.log(`✓ Encrypted settlement: ${settlementId}`);
      return { success: true };
    } catch (error) {
      this.stats.settlements.errors++;
      console.error(`✗ Error encrypting settlement ${settlementId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllSettlements() {
    console.log('\n🤝 Processing trip group settlements...');
    const settlementsSnapshot = await getDocs(collection(db, this.settlementsCollection));
    const totalSettlements = settlementsSnapshot.size;
    console.log(`Found ${totalSettlements} settlements\n`);

    if (totalSettlements === 0) return;

    let index = 0;
    for (const docSnap of settlementsSnapshot.docs) {
      index++;
      console.log(`[${index}/${totalSettlements}] Settlement: ${docSnap.id}`);
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
        console.log(`⊘ Skipped family group (already encrypted): ${groupId}`);
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
        console.log(`⊘ Skipped family group (no sensitive data): ${groupId}`);
        return { success: true, skipped: true };
      }

      console.log(`  - Encrypted fields: ${Object.keys(encryptedGroup._encrypted).join(', ')}`);

      const groupRef = doc(db, this.familyGroupsCollection, groupId);
      await updateDoc(groupRef, encryptedGroup);
      
      this.stats.familyGroups.processed++;
      console.log(`✓ Encrypted family group: ${groupId}`);
      return { success: true };
    } catch (error) {
      this.stats.familyGroups.errors++;
      console.error(`✗ Error encrypting family group ${groupId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllFamilyGroups() {
    console.log('\n👨‍👩‍👧‍👦 Processing family groups...');
    const groupsSnapshot = await getDocs(collection(db, this.familyGroupsCollection));
    const totalGroups = groupsSnapshot.size;
    console.log(`Found ${totalGroups} family groups\n`);

    if (totalGroups === 0) return;

    let index = 0;
    for (const docSnap of groupsSnapshot.docs) {
      index++;
      console.log(`[${index}/${totalGroups}] Family Group: ${docSnap.id}`);
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
        console.log(`⊘ Skipped invitation (already encrypted): ${invitationId}`);
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
        console.log(`⊘ Skipped invitation (no sensitive data): ${invitationId}`);
        return { success: true, skipped: true };
      }

      console.log(`  - Encrypted fields: ${Object.keys(encryptedInvitation._encrypted).join(', ')}`);

      const invitationRef = doc(db, this.familyInvitationsCollection, invitationId);
      await updateDoc(invitationRef, encryptedInvitation);
      
      this.stats.familyInvitations.processed++;
      console.log(`✓ Encrypted invitation: ${invitationId}`);
      return { success: true };
    } catch (error) {
      this.stats.familyInvitations.errors++;
      console.error(`✗ Error encrypting invitation ${invitationId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async encryptAllFamilyInvitations() {
    console.log('\n✉️ Processing family invitations...');
    const invitationsSnapshot = await getDocs(collection(db, this.familyInvitationsCollection));
    const totalInvitations = invitationsSnapshot.size;
    console.log(`Found ${totalInvitations} invitations\n`);

    if (totalInvitations === 0) return;

    let index = 0;
    for (const docSnap of invitationsSnapshot.docs) {
      index++;
      console.log(`[${index}/${totalInvitations}] Invitation: ${docSnap.id}`);
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
      console.log('🔐 Starting trip data encryption...\n');
      console.log('='.repeat(60));

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

      console.log('✓ Authentication verified');
      console.log('✓ Encryption key found\n');

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

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 ENCRYPTION SUMMARY');
      console.log('='.repeat(60));
      
      console.log('\n👥 Trip Members:');
      console.log(`  ✓ Encrypted: ${this.stats.members.processed}`);
      console.log(`  ⊘ Skipped: ${this.stats.members.skipped}`);
      console.log(`  ✗ Errors: ${this.stats.members.errors}`);
      
      console.log('\n💰 Trip Expenses:');
      console.log(`  ✓ Encrypted: ${this.stats.expenses.processed}`);
      console.log(`  ⊘ Skipped: ${this.stats.expenses.skipped}`);
      console.log(`  ✗ Errors: ${this.stats.expenses.errors}`);
      
      console.log('\n🤝 Trip Settlements:');
      console.log(`  ✓ Encrypted: ${this.stats.settlements.processed}`);
      console.log(`  ⊘ Skipped: ${this.stats.settlements.skipped}`);
      console.log(`  ✗ Errors: ${this.stats.settlements.errors}`);
      
      console.log('\n👨‍👩‍👧‍👦 Family Groups:');
      console.log(`  ✓ Encrypted: ${this.stats.familyGroups.processed}`);
      console.log(`  ⊘ Skipped: ${this.stats.familyGroups.skipped}`);
      console.log(`  ✗ Errors: ${this.stats.familyGroups.errors}`);
      
      console.log('\n✉️ Family Invitations:');
      console.log(`  ✓ Encrypted: ${this.stats.familyInvitations.processed}`);
      console.log(`  ⊘ Skipped: ${this.stats.familyInvitations.skipped}`);
      console.log(`  ✗ Errors: ${this.stats.familyInvitations.errors}`);
      
      const totalErrors = this.stats.members.errors + this.stats.expenses.errors + 
                         this.stats.settlements.errors + this.stats.familyGroups.errors + 
                         this.stats.familyInvitations.errors;
      const totalProcessed = this.stats.members.processed + this.stats.expenses.processed + 
                            this.stats.settlements.processed + this.stats.familyGroups.processed + 
                            this.stats.familyInvitations.processed;
      
      console.log('\n' + '='.repeat(60));
      console.log(`📝 Total encrypted: ${totalProcessed}`);
      console.log(`✗ Total errors: ${totalErrors}`);
      console.log('='.repeat(60));

      if (totalErrors > 0) {
        console.log('\n⚠️  Some items failed to encrypt. Check the errors above.');
      } else if (totalProcessed > 0) {
        console.log('\n✅ All data encrypted successfully!');
      } else {
        console.log('\n✅ All data was already encrypted!');
      }

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
      console.log('\n🔍 Verifying encryption...\n');
      console.log('='.repeat(60));

      let verified = { members: 0, expenses: 0, settlements: 0, familyGroups: 0, familyInvitations: 0 };
      let failed = { members: 0, expenses: 0, settlements: 0, familyGroups: 0, familyInvitations: 0 };

      // Verify members
      console.log('\n👥 Verifying trip members...');
      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      for (const docSnap of membersSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (data.name && this.looksEncrypted(data.name)) {
            const decrypted = await encryptionService.decryptValue(data.name);
            if (decrypted) {
              verified.members++;
              console.log(`✓ ${docSnap.id}: ${decrypted}`);
            }
          }
        } catch (error) {
          failed.members++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify expenses
      console.log('\n💰 Verifying trip expenses...');
      const expensesSnapshot = await getDocs(collection(db, this.expensesCollection));
      for (const docSnap of expensesSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.expensesCollection);
            if (decrypted) {
              verified.expenses++;
              console.log(`✓ ${docSnap.id}: ${decrypted.description || 'No description'}`);
            }
          }
        } catch (error) {
          failed.expenses++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify settlements
      console.log('\n🤝 Verifying trip settlements...');
      const settlementsSnapshot = await getDocs(collection(db, this.settlementsCollection));
      for (const docSnap of settlementsSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.settlementsCollection);
            if (decrypted) {
              verified.settlements++;
              console.log(`✓ ${docSnap.id}: ₹${decrypted.amount || 0}`);
            }
          }
        } catch (error) {
          failed.settlements++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify family groups
      console.log('\n👨‍👩‍👧‍👦 Verifying family groups...');
      const groupsSnapshot = await getDocs(collection(db, this.familyGroupsCollection));
      for (const docSnap of groupsSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.familyGroupsCollection);
            if (decrypted) {
              verified.familyGroups++;
              console.log(`✓ ${docSnap.id}: ${decrypted.name || 'No name'}`);
            }
          }
        } catch (error) {
          failed.familyGroups++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Verify family invitations
      console.log('\n✉️ Verifying family invitations...');
      const invitationsSnapshot = await getDocs(collection(db, this.familyInvitationsCollection));
      for (const docSnap of invitationsSnapshot.docs) {
        const data = docSnap.data();
        try {
          if (this.isEncrypted(data)) {
            const decrypted = await encryptionService.decryptObject(data, this.familyInvitationsCollection);
            if (decrypted) {
              verified.familyInvitations++;
              console.log(`✓ ${docSnap.id}: ${decrypted.invitedEmail || 'No email'}`);
            }
          }
        } catch (error) {
          failed.familyInvitations++;
          console.error(`✗ ${docSnap.id}: ${error.message}`);
        }
      }

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 VERIFICATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`✓ Trip Members verified: ${verified.members}`);
      console.log(`✓ Trip Expenses verified: ${verified.expenses}`);
      console.log(`✓ Trip Settlements verified: ${verified.settlements}`);
      console.log(`✓ Family Groups verified: ${verified.familyGroups}`);
      console.log(`✓ Family Invitations verified: ${verified.familyInvitations}`);
      console.log(`✗ Total failures: ${failed.members + failed.expenses + failed.settlements + failed.familyGroups + failed.familyInvitations}`);
      console.log('='.repeat(60));

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
    console.log('Trip Data Encryptor loaded. Use window.tripDataEncryptor to run encryption.');
    console.log('Example: await window.tripDataEncryptor.encryptAllTripData()');
  });
} else {
  console.log('Trip Data Encryptor loaded. Use window.tripDataEncryptor to run encryption.');
  console.log('Example: await window.tripDataEncryptor.encryptAllTripData()');
}

export default encryptor;
