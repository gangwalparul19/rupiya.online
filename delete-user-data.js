// Delete All User Data Script
// WARNING: This will permanently delete ALL data for the specified user
// Use with extreme caution!

import { db } from './assets/js/config/firebase-config.js';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

/**
 * Delete all data for a specific user
 * @param {string} userId - The user ID to delete data for
 */
async function deleteAllUserData(userId) {
  if (!userId) {
    console.error('❌ User ID is required');
    return;
  }
  
  const confirmed = confirm(`Are you absolutely sure you want to delete ALL data for user ${userId}?\n\nThis includes:\n- All expenses\n- All income\n- All budgets\n- All goals\n- All investments\n- All vehicles\n- All loans\n- All credit cards\n- All notes\n- And everything else\n\nThis action CANNOT be undone!`);
  
  if (!confirmed) {
    return;
  }

  const doubleConfirm = confirm('FINAL CONFIRMATION: Type YES in the next prompt to proceed');
  if (!doubleConfirm) {
    return;
  }

  const finalConfirm = prompt('Type YES to confirm deletion:');
  if (finalConfirm !== 'YES') {
    return;
  }

  try {
    const collections = [
      'expenses',
      'income',
      'budgets',
      'goals',
      'vehicles',
      'fuelLogs',
      'houses',
      'houseHelps',
      'houseHelpPayments',
      'insurancePolicies',
      'healthcareInsurance',
      'healthcareExpenses',
      'investments',
      'investmentPriceHistory',
      'loans',
      'creditCards',
      'notes',
      'documents',
      'recurringTransactions',
      'tripGroups',
      'tripGroupMembers',
      'tripGroupExpenses',
      'tripGroupSettlements',
      'transfers',
      'netWorthSnapshots',
      'notifications',
      'paymentMethods',
      'wallets',
      'splits',
      'vehicleMaintenanceExpenses',
      'vehicleIncome',
      'familyMembers'
    ];

    let totalDeleted = 0;
    let errorCount = 0;

    for (const collectionName of collections) {
      try {
        
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId)
        );
        
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          continue;
        }

        // Delete in batches of 500 (Firestore limit)
        const batchSize = 500;
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchDocs = docs.slice(i, i + batchSize);
          
          batchDocs.forEach(docSnapshot => {
            batch.delete(docSnapshot.ref);
          });

          await batch.commit();
          totalDeleted += batchDocs.length;
        }

      } catch (error) {
        console.error(`❌ Error processing ${collectionName}:`, error);
        console.error('Error details:', error.message);
        errorCount++;
      }
    }

    // Also delete user-specific documents (where document ID = userId)
    const userSpecificCollections = [
      'users',
      'categories',
      'userCategories',
      'userPreferences',
      'userSettings',
      'gamification',
      'features',
      'userEncryption',
      'categorizationPatterns',
      'userCategorizationPatterns'
    ];

    for (const collectionName of userSpecificCollections) {
      try {
        
        const docRef = doc(db, collectionName, userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          await deleteDoc(docRef);
          totalDeleted++;
        } else {
          console.log(`✓ No document at ${collectionName}/${userId}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ${collectionName}/${userId}:`, error);
        errorCount++;
      }
    }

    alert(`Deletion complete!\n\nDeleted: ${totalDeleted} documents\nErrors: ${errorCount}`);

  } catch (error) {
    console.error('❌ Fatal error during deletion:', error);
    alert('Error: ' + error.message);
  }
}

// Make function globally available
window.deleteAllUserData = deleteAllUserData;

export { deleteAllUserData };
