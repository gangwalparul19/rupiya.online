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
      }

      // Encrypt email if present and not already encrypted
      if (memberData.email && !this.isEncrypted(memberData.email)) {
        updates.email = await encryptionService.encryptValue(memberData.email);
        needsUpdate = true;
      }

      // Encrypt phone if present and not already encrypted
      if (memberData.phone && !this.isEncrypted(memberData.phone)) {
        updates.phone = await encryptionService.encryptValue(memberData.phone);
        needsUpdate = true;
      }

      if (needsUpdate) {
        const memberRef = doc(db, this.membersCollection, memberId);
        await updateDoc(memberRef, updates);
        this.processedCount++;
        return { success: true };
      } else {
        this.skippedCount++;
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

      const membersSnapshot = await getDocs(collection(db, this.membersCollection));
      const totalMembers = membersSnapshot.size;

      if (totalMembers === 0) {
        return;
      }

      // Process each member
      let index = 0;
      for (const docSnap of membersSnapshot.docs) {
        index++;
        
        const memberData = docSnap.data();
        await this.encryptMember(docSnap.id, memberData);

        // Add a small delay to avoid overwhelming Firestore
        if (index % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (error) {
      console.error('\n❌ Fatal error during encryption:', error);
      throw error;
    }
  }

  // Verify encryption (decrypt and check)
  async verifyEncryption() {
    try {
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
            }
          }
        } catch (error) {
          failedCount++;
          console.error(`✗ Failed to verify member: ${docSnap.id}`, error.message);
        }
      }

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

export default encryptor;
