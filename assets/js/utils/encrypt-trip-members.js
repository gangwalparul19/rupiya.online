// Script to encrypt existing trip group members data
import { db } from '../config/firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';
import encryptionService from '../services/encryption-service.js';

class TripMembersEncryptor {
  constructor() {
    this.membersCollection = 'tripGroupMembers';
    this.processedCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
  }

  // Check if data is already encrypted
  isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    // Check if it looks like encrypted data (base64-like string with certain length)
    return value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
  }

  // Encrypt trip member data
  async encryptMember(memberId, memberData) {
    try {
      const updates = {};
      let needsUpdate = false;

      // Encrypt name if not already encrypted
      if (memberData.name && !this.isEncrypted(memberData.name)) {
        updates.name = await encryptionService.encryptValue(memberData.name);
        needsUpdate = true;
        console.log(`  - Encrypting name: ${memberData.name}`);
      }

      // Encrypt email if present and not already encrypted
      if (memberData.email && !this.isEncrypted(memberData.email)) {
        updates.email = await encryptionService.encryptValue(memberData.email);
        needsUpdate = true;
        console.log(`  - Encrypting email: ${memberData.email}`);
      }

      // Encrypt phone if present and not already encrypted
      if (memberData.phone && !this.isEncrypted(memberData.phone)) {
        updates.phone = await encryptionService.encryptValue(memberData.phone);
        needsUpdate = true;
        console.log(`  - Encrypting phone: ${memberData.phone}`);
      }

      if (needsUpdate) {
        const memberRef = doc(db, this.membersCollection, memberId);
        await updateDoc(memberRef, updates);
        this.processedCount++;
        console.log(`✓ Encrypted member: ${memberId}`);
        return { success: true };
      } else {
        this.skippedCount++;
        console.log(`⊘ Skipped (already encrypted): ${memberId}`);
        return { success: true, skipped: true };
      }
    } catch (error) {
      this.errorCount++;
      console.error(`✗ Error encrypting member ${memberId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Process all trip members
  async encryptAllMembers() {
    try {
      console.log('🔐 Starting trip members encryption...\n');

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

      console.log('📋 Fetching all trip members...');
      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      const totalMembers = membersSnapshot.size;

      console.log(`Found ${totalMembers} trip members to process\n`);

      if (totalMembers === 0) {
        console.log('No trip members found.');
        return;
      }

      // Process each member
      let index = 0;
      for (const docSnap of membersSnapshot.docs) {
        index++;
        console.log(`\n[${index}/${totalMembers}] Processing member: ${docSnap.id}`);
        
        const memberData = docSnap.data();
        await this.encryptMember(docSnap.id, memberData);

        // Add a small delay to avoid overwhelming Firestore
        if (index % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 ENCRYPTION SUMMARY');
      console.log('='.repeat(60));
      console.log(`✓ Successfully encrypted: ${this.processedCount}`);
      console.log(`⊘ Skipped (already encrypted): ${this.skippedCount}`);
      console.log(`✗ Errors: ${this.errorCount}`);
      console.log(`📝 Total processed: ${totalMembers}`);
      console.log('='.repeat(60));

      if (this.errorCount > 0) {
        console.log('\n⚠️  Some members failed to encrypt. Check the errors above.');
      } else if (this.processedCount > 0) {
        console.log('\n✅ All trip members encrypted successfully!');
      } else {
        console.log('\n✅ All trip members were already encrypted!');
      }

    } catch (error) {
      console.error('\n❌ Fatal error during encryption:', error);
      throw error;
    }
  }

  // Verify encryption (decrypt and check)
  async verifyEncryption() {
    try {
      console.log('\n🔍 Verifying encryption...\n');

      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      let verifiedCount = 0;
      let failedCount = 0;

      for (const docSnap of membersSnapshot.docs) {
        const memberData = docSnap.data();
        
        try {
          // Try to decrypt name
          if (memberData.name) {
            const decryptedName = await encryptionService.decryptValue(memberData.name);
            if (decryptedName) {
              verifiedCount++;
              console.log(`✓ Verified member: ${docSnap.id} - ${decryptedName}`);
            }
          }
        } catch (error) {
          failedCount++;
          console.error(`✗ Failed to verify member: ${docSnap.id}`, error.message);
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 VERIFICATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`✓ Successfully verified: ${verifiedCount}`);
      console.log(`✗ Failed verification: ${failedCount}`);
      console.log('='.repeat(60));

    } catch (error) {
      console.error('\n❌ Error during verification:', error);
      throw error;
    }
  }
}

// Create instance
const encryptor = new TripMembersEncryptor();

// Export for use in console or other scripts
window.tripMembersEncryptor = encryptor;

// Auto-run if this script is loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Trip Members Encryptor loaded. Use window.tripMembersEncryptor to run encryption.');
    console.log('Example: await window.tripMembersEncryptor.encryptAllMembers()');
  });
} else {
  console.log('Trip Members Encryptor loaded. Use window.tripMembersEncryptor to run encryption.');
  console.log('Example: await window.tripMembersEncryptor.encryptAllMembers()');
}

export default encryptor;
