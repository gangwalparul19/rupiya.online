// Split Service - Manage split expenses in Firestore
import { db, auth } from '../config/firebase-config.js';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import firestoreService from './firestore-service.js';

class SplitService {
  constructor() {
    this.collectionName = 'splits';
  }

  // Invalidate related caches when splits change
  invalidateSplitCaches() {
    try {
      // Invalidate splits cache and monthly summary cache (since splits affect KPIs)
      firestoreService.invalidateCache('splits');
      firestoreService.invalidateCache('monthlySummary');
    } catch (error) {
      console.warn('Could not invalidate cache:', error);
    }
  }

  async addSplit(splitData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const data = {
        ...splitData,
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Use firestoreService to handle encryption
      const result = await firestoreService.addDocument(this.collectionName, data);

      // Invalidate caches so dashboard reflects new split
      this.invalidateSplitCaches();

      return result;
    } catch (error) {
      console.error('Error adding split:', error);
      return { success: false, error: error.message };
    }
  }

  async getSplits() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const splits = [];
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        // Decrypt the data using firestoreService
        const decryptedData = await firestoreService.decryptData(data, this.collectionName);
        splits.push({ id: docSnap.id, ...decryptedData });
      }

      return splits;
    } catch (error) {
      console.error('Error getting splits:', error);
      return [];
    }
  }

  async updateSplit(id, splitData) {
    try {
      const updateData = {
        ...splitData,
        updatedAt: Timestamp.now()
      };

      // Use firestoreService to handle encryption
      const result = await firestoreService.updateDocument(this.collectionName, id, updateData);

      // Invalidate caches so dashboard reflects updated split
      this.invalidateSplitCaches();

      return result;
    } catch (error) {
      console.error('Error updating split:', error);
      return { success: false, error: error.message };
    }
  }

  async settleSplit(id, settleData) {
    try {
      const updateData = {
        status: 'settled',
        settledDate: settleData.settledDate || Timestamp.now(),
        settleNotes: settleData.settleNotes || '',
        updatedAt: Timestamp.now()
      };

      // Use firestoreService to handle encryption
      const result = await firestoreService.updateDocument(this.collectionName, id, updateData);

      // Invalidate caches so dashboard reflects settled split (affects income)
      this.invalidateSplitCaches();

      return result;
    } catch (error) {
      console.error('Error settling split:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSplit(id) {
    try {
      // Use firestoreService to handle encryption
      const result = await firestoreService.deleteDocument(this.collectionName, id);
      
      // Invalidate caches so dashboard reflects deleted split
      this.invalidateSplitCaches();
      
      return result;
    } catch (error) {
      console.error('Error deleting split:', error);
      return { success: false, error: error.message };
    }
  }
}

const splitService = new SplitService();
export default splitService;
