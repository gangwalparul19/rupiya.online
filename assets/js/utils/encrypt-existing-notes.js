// Migration Script: Encrypt Existing Notes
// Run this once to encrypt all existing notes in the database

import { db } from '../config/firebase-config.js';
import { collection, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from '../services/auth-service.js';
import encryptionService from '../services/encryption-service.js';

async function encryptExistingNotes() {
  try {
    // Wait for auth
    const user = await authService.waitForAuth();
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    // Wait for encryption to be ready
    await encryptionService.waitForInitialization();
    if (!encryptionService.isReady()) {
      console.error('Encryption service not ready');
      return;
    }
    
    // Get all notes for current user
    const notesRef = collection(db, 'notes');
    const snapshot = await getDocs(notesRef);
    
    let total = 0;
    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Skip if not current user's note
      if (data.userId !== user.uid) {
        continue;
      }
      
      total++;
      
      // Check if already encrypted
      if (data._encrypted) {
        alreadyEncrypted++;
        continue;
      }
      
      try {
        // Encrypt the note data
        const encryptedData = await encryptionService.encryptObject(data, 'notes');
        
        // Update the document
        await updateDoc(doc(db, 'notes', docSnap.id), encryptedData);
        
        encrypted++;
      } catch (error) {
        errors++;
        console.error(`✗ Failed to encrypt note ${docSnap.id}:`, error);
      }
    }
    
    if (encrypted > 0) {
      alert(`Successfully encrypted ${encrypted} notes!`);
    } else if (alreadyEncrypted > 0) {
      alert(`All ${alreadyEncrypted} notes are already encrypted.`);
    } else {
      alert('No notes found to encrypt.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    alert('Migration failed: ' + error.message);
  }
}

// Export for use in console or as a button click handler
window.encryptExistingNotes = encryptExistingNotes;

export default encryptExistingNotes;
