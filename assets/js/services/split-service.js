// Split Service - Manage split expenses in Firestore
import { db, auth } from '../config/firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class SplitService {
  constructor() {
    this.collectionName = 'splits';
  }

  async addSplit(splitData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...splitData,
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return { success: true, id: docRef.id };
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
      querySnapshot.forEach((doc) => {
        splits.push({ id: doc.id, ...doc.data() });
      });

      return splits;
    } catch (error) {
      console.error('Error getting splits:', error);
      return [];
    }
  }

  async updateSplit(id, splitData) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...splitData,
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating split:', error);
      return { success: false, error: error.message };
    }
  }

  async settleSplit(id, settleData) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        status: 'settled',
        settledDate: settleData.settledDate || Timestamp.now(),
        settleNotes: settleData.settleNotes || '',
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error settling split:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSplit(id) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting split:', error);
      return { success: false, error: error.message };
    }
  }
}

const splitService = new SplitService();
export default splitService;
