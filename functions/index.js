/**
 * Rupiya Cloud Functions
 * 
 * NOTE: Due to client-side encryption, automatic EMI processing cannot be done
 * server-side. The encrypted data (amounts, loan details) cannot be decrypted
 * by Cloud Functions as the encryption keys are derived client-side.
 * 
 * EMI processing is handled client-side in:
 * - assets/js/services/emi-scheduler-service.js
 * 
 * This file contains only non-encrypted data operations:
 * 1. User analytics (unencrypted user collection)
 * 2. Cleanup tasks
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// ============================================
// SCHEDULED FUNCTION: Cleanup Old Notifications
// Runs weekly to remove read notifications older than 30 days
// ============================================

exports.cleanupOldNotifications = functions.pubsub
  .schedule('30 18 * * 6')  // Every Sunday at midnight IST (18:30 UTC Saturday)
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    console.log('Starting notification cleanup...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      // Delete read notifications older than 30 days
      const oldNotifications = await db.collection('notifications')
        .where('read', '==', true)
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .limit(500)
        .get();
      
      if (oldNotifications.empty) {
        console.log('No old notifications to clean up');
        return null;
      }
      
      const batch = db.batch();
      oldNotifications.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${oldNotifications.size} old notifications`);
      
      return null;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  });

// ============================================
// HTTP FUNCTION: Health Check
// Simple endpoint to verify functions are deployed
// ============================================

exports.healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Rupiya Cloud Functions are running'
  });
});

