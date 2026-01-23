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

  console.log('⚠️ WARNING: This will delete ALL data for user:', userId);
  console.log('⚠️ This action cannot be undone!');
  
  const confirmed = confirm(`Are you absolutely sure you want to delete ALL data for user ${userId}?\n\nThis includes:\n- All expenses\n- All income\n- All budgets\n- All goals\n- All investments\n- All vehicles\n- All loans\n- All credit cards\n- All notes\n- And everything else\n\nThis action CANNOT be undone!`);
  
  if (!confirmed) {
    console.log('❌ Operation cancelled');
    return;
  }

  const doubleConfirm = confirm('FINAL CONFIRMATION: Type YES in the next prompt to proceed');
  if (!doubleConfirm) {
    console.log('❌ Operation cancelled');
    return;
  }

  const finalConfirm = prompt('Type YES to confirm deletion:');
  if (finalConfirm !== 'YES') {
    console.log('❌ Operation cancelled - confirmation text did not match');
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

    console.log('🗑️ Starting deletion process...');
    console.log('📊 Checking', collections.length, 'collections...');

    for (const collectionName of collections) {
      try {
        console.log(`\n🔍 Processing ${collectionName}...`);
        
        const q = query(
          collection(db, collectionName),
          where('userId', '==', userId)
        );
        
        const snapshot = await getDocs(q);
        console.log(`📊 Found ${snapshot.size} documents in ${collectionName}`);

        if (snapshot.empty) {
          console.log(`✓ No documents to delete in ${collectionName}`);
          continue;
        }

        // Delete in batches of 500 (Firestore limit)
        const batchSize = 500;
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += batchSize) {
          const batch = writeBatch(db);
          const batchDocs = docs.slice(i, i + batchSize);
          
          batchDocs.forEach(docSnapshot => {
            console.log(`  🗑️ Deleting ${collectionName}/${docSnapshot.id}`);
            batch.delete(docSnapshot.ref);
          });

          await batch.commit();
          totalDeleted += batchDocs.length;
          console.log(`  ✅ Deleted batch of ${batchDocs.length} documents`);
        }

        console.log(`✅ Completed ${collectionName}: ${docs.length} documents deleted`);
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

    console.log('\n🔍 Checking user-specific collections...');

    for (const collectionName of userSpecificCollections) {
      try {
        console.log(`\n🔍 Processing ${collectionName}/${userId}...`);
        
        const docRef = doc(db, collectionName, userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          await deleteDoc(docRef);
          totalDeleted++;
          console.log(`✅ Deleted ${collectionName}/${userId}`);
        } else {
          console.log(`✓ No document at ${collectionName}/${userId}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ${collectionName}/${userId}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 DELETION COMPLETE');
    console.log('='.repeat(50));
    console.log(`✅ Total documents deleted: ${totalDeleted}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`👤 User ID: ${userId}`);
    console.log('='.repeat(50));

    alert(`Deletion complete!\n\nDeleted: ${totalDeleted} documents\nErrors: ${errorCount}`);

  } catch (error) {
    console.error('❌ Fatal error during deletion:', error);
    alert('Error: ' + error.message);
  }
}

// Make function globally available
window.deleteAllUserData = deleteAllUserData;

// Usage instructions
console.log('='.repeat(50));
console.log('DELETE USER DATA UTILITY LOADED');
console.log('='.repeat(50));
console.log('To delete all data for a user, run:');
console.log('  deleteAllUserData("USER_ID_HERE")');
console.log('');
console.log('Example:');
console.log('  deleteAllUserData("qJREHLYIH5Mo9OKPiplDF9dCYzW2")');
console.log('');
console.log('⚠️ WARNING: This action cannot be undone!');
console.log('='.repeat(50));

export { deleteAllUserData };
