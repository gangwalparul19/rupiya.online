// Fuel Fill-up Service - Track vehicle fuel fill-ups and calculate mileage
import { db, auth } from '../config/firebase-config.js';
import { collection, getDocs, query, where, orderBy, Timestamp, limit } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import firestoreService from './firestore-service.js';

class FuelService {
  constructor() {
    this.collectionName = 'fuelLogs'; // Changed from fuelFillups to match the rest of the codebase
  }

  /**
   * Add a new fuel fill-up
   * Automatically calculates mileage and cost per km
   */
  async addFillup(fillupData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Get previous fill-up for this vehicle to calculate mileage
      const previousFillup = await this.getLastFillup(fillupData.vehicleId);
      
      let distanceTraveled = 0;
      let mileage = 0;
      let costPerKm = 0;

      if (previousFillup && previousFillup.odometerReading < fillupData.odometerReading) {
        distanceTraveled = fillupData.odometerReading - previousFillup.odometerReading;
        // Prevent division by zero
        mileage = fillupData.fuelQuantity > 0 ? distanceTraveled / fillupData.fuelQuantity : 0;
        costPerKm = distanceTraveled > 0 ? fillupData.totalAmount / distanceTraveled : 0;
      }

      const data = {
        ...fillupData,
        userId: user.uid,
        distanceTraveled: Math.round(distanceTraveled * 100) / 100,
        mileage: Math.round(mileage * 100) / 100,
        costPerKm: Math.round(costPerKm * 100) / 100,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Use firestoreService to handle encryption
      const result = await firestoreService.addDocument(this.collectionName, data);

      return result;
    } catch (error) {
      console.error('Error adding fuel fill-up:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all fill-ups for a specific vehicle
   */
  async getFillupsByVehicle(vehicleId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', user.uid),
        where('vehicleId', '==', vehicleId),
        orderBy('odometerReading', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fillups = [];
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        // Decrypt the data using firestoreService
        const decryptedData = await firestoreService.decryptData(data, this.collectionName);
        fillups.push({
          id: docSnap.id,
          ...decryptedData,
          date: decryptedData.date?.toDate ? decryptedData.date.toDate() : decryptedData.date
        });
      }

      return fillups;
    } catch (error) {
      console.error('Error getting fill-ups:', error);
      return [];
    }
  }

  /**
   * Get all fill-ups for the user (all vehicles)
   */
  async getAllFillups() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fillups = [];
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        // Decrypt the data using firestoreService
        const decryptedData = await firestoreService.decryptData(data, this.collectionName);
        fillups.push({
          id: docSnap.id,
          ...decryptedData,
          date: decryptedData.date?.toDate ? decryptedData.date.toDate() : decryptedData.date
        });
      }

      return fillups;
    } catch (error) {
      console.error('Error getting all fill-ups:', error);
      return [];
    }
  }

  /**
   * Get the last fill-up for a vehicle
   */
  async getLastFillup(vehicleId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', user.uid),
        where('vehicleId', '==', vehicleId),
        orderBy('odometerReading', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      // Decrypt the data using firestoreService
      const decryptedData = await firestoreService.decryptData(data, this.collectionName);
      
      return {
        id: docSnap.id,
        ...decryptedData,
        date: decryptedData.date?.toDate ? decryptedData.date.toDate() : decryptedData.date
      };
    } catch (error) {
      console.error('Error getting last fill-up:', error);
      return null;
    }
  }

  /**
   * Update a fill-up
   */
  async updateFillup(id, fillupData) {
    try {
      const updateData = {
        ...fillupData,
        updatedAt: Timestamp.now()
      };

      // Use firestoreService to handle encryption
      const result = await firestoreService.updateDocument(this.collectionName, id, updateData);

      return result;
    } catch (error) {
      console.error('Error updating fill-up:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a fill-up
   */
  async deleteFillup(id) {
    try {
      // Use firestoreService to handle encryption
      const result = await firestoreService.deleteDocument(this.collectionName, id);
      return result;
    } catch (error) {
      console.error('Error deleting fill-up:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate average mileage for a vehicle
   */
  calculateAverageMileage(fillups) {
    const fillupsWithMileage = fillups.filter(f => f.mileage > 0);
    if (fillupsWithMileage.length === 0) return 0;

    const totalMileage = fillupsWithMileage.reduce((sum, f) => sum + f.mileage, 0);
    return Math.round((totalMileage / fillupsWithMileage.length) * 100) / 100;
  }

  /**
   * Calculate total fuel cost for a vehicle
   */
  calculateTotalCost(fillups) {
    return fillups.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
  }

  /**
   * Calculate average cost per km
   */
  calculateAverageCostPerKm(fillups) {
    const fillupsWithCost = fillups.filter(f => f.costPerKm > 0);
    if (fillupsWithCost.length === 0) return 0;

    const totalCost = fillupsWithCost.reduce((sum, f) => sum + f.costPerKm, 0);
    return Math.round((totalCost / fillupsWithCost.length) * 100) / 100;
  }

  /**
   * Get best and worst mileage
   */
  getBestWorstMileage(fillups) {
    const fillupsWithMileage = fillups.filter(f => f.mileage > 0);
    if (fillupsWithMileage.length === 0) {
      return { best: 0, worst: 0 };
    }

    const mileages = fillupsWithMileage.map(f => f.mileage);
    return {
      best: Math.max(...mileages),
      worst: Math.min(...mileages)
    };
  }

  /**
   * Get total distance traveled
   */
  getTotalDistance(fillups) {
    return fillups.reduce((sum, f) => sum + (f.distanceTraveled || 0), 0);
  }

  /**
   * Get total fuel consumed
   */
  getTotalFuel(fillups) {
    return fillups.reduce((sum, f) => sum + (f.fuelQuantity || 0), 0);
  }
}

const fuelService = new FuelService();
export default fuelService;
