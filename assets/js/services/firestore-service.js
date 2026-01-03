// Firestore Service
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

class FirestoreService {
  constructor() {
    this.collections = {
      expenses: 'expenses',
      income: 'income',
      budgets: 'budgets',
      investments: 'investments',
      goals: 'goals',
      houses: 'houses',
      vehicles: 'vehicles',
      notes: 'notes',
      documents: 'documents',
      categories: 'categories',
      wallets: 'wallets',
      recurring: 'recurringTransactions',
      houseHelps: 'houseHelps',
      houseHelpPayments: 'houseHelpPayments'
    };
  }

  // Get user ID
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Generic CRUD operations
  async add(collectionName, data) {
    try {
      const userId = this.getUserId();
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async get(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      console.error(`Error getting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getAll(collectionName, orderByField = 'createdAt', orderDirection = 'desc') {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, collectionName),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      return data;
    } catch (error) {
      console.error(`Error getting all from ${collectionName}:`, error);
      return [];
    }
  }

  async update(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
      return { success: true };
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async delete(collectionName, docId) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return { success: true };
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Specific methods for expenses
  async addExpense(expense) {
    return this.add(this.collections.expenses, {
      ...expense,
      date: expense.date instanceof Date ? Timestamp.fromDate(expense.date) : Timestamp.now()
    });
  }

  async getExpenses() {
    return this.getAll(this.collections.expenses, 'date', 'desc');
  }

  async updateExpense(id, expense) {
    const updateData = { ...expense };
    if (expense.date instanceof Date) {
      updateData.date = Timestamp.fromDate(expense.date);
    }
    return this.update(this.collections.expenses, id, updateData);
  }

  async deleteExpense(id) {
    return this.delete(this.collections.expenses, id);
  }

  // Specific methods for income
  async addIncome(income) {
    return this.add(this.collections.income, {
      ...income,
      date: income.date instanceof Date ? Timestamp.fromDate(income.date) : Timestamp.now()
    });
  }

  async getIncome() {
    return this.getAll(this.collections.income, 'date', 'desc');
  }

  async updateIncome(id, income) {
    const updateData = { ...income };
    if (income.date instanceof Date) {
      updateData.date = Timestamp.fromDate(income.date);
    }
    return this.update(this.collections.income, id, updateData);
  }

  async deleteIncome(id) {
    return this.delete(this.collections.income, id);
  }

  // Specific methods for budgets
  async addBudget(budget) {
    return this.add(this.collections.budgets, budget);
  }

  async getBudgets() {
    return this.getAll(this.collections.budgets, 'month', 'desc');
  }

  async updateBudget(id, budget) {
    return this.update(this.collections.budgets, id, budget);
  }

  async deleteBudget(id) {
    return this.delete(this.collections.budgets, id);
  }

  // Specific methods for investments
  async addInvestment(investment) {
    return this.add(this.collections.investments, {
      ...investment,
      purchaseDate: investment.purchaseDate instanceof Date 
        ? Timestamp.fromDate(investment.purchaseDate) 
        : Timestamp.now()
    });
  }

  async getInvestments() {
    return this.getAll(this.collections.investments, 'purchaseDate', 'desc');
  }

  async updateInvestment(id, investment) {
    const updateData = { ...investment };
    if (investment.purchaseDate instanceof Date) {
      updateData.purchaseDate = Timestamp.fromDate(investment.purchaseDate);
    }
    return this.update(this.collections.investments, id, updateData);
  }

  async deleteInvestment(id) {
    return this.delete(this.collections.investments, id);
  }

  // Specific methods for goals
  async addGoal(goal) {
    return this.add(this.collections.goals, {
      ...goal,
      targetDate: goal.targetDate instanceof Date 
        ? Timestamp.fromDate(goal.targetDate) 
        : Timestamp.now()
    });
  }

  async getGoals() {
    return this.getAll(this.collections.goals, 'targetDate', 'asc');
  }

  async updateGoal(id, goal) {
    const updateData = { ...goal };
    if (goal.targetDate instanceof Date) {
      updateData.targetDate = Timestamp.fromDate(goal.targetDate);
    }
    return this.update(this.collections.goals, id, updateData);
  }

  async deleteGoal(id) {
    return this.delete(this.collections.goals, id);
  }

  // Query helpers
  async queryByDateRange(collectionName, startDate, endDate) {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, collectionName),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      return data;
    } catch (error) {
      console.error(`Error querying ${collectionName} by date range:`, error);
      return [];
    }
  }

  // Get total expenses by linked type (house/vehicle)
  async getTotalExpensesByLinkedType(linkedType) {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, this.collections.expenses),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType)
      );
      
      const querySnapshot = await getDocs(q);
      let total = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount || 0;
      });
      
      return total;
    } catch (error) {
      console.error(`Error getting total expenses for ${linkedType}:`, error);
      return 0;
    }
  }

  // Get total income by linked type (house/vehicle)
  async getTotalIncomeByLinkedType(linkedType) {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, this.collections.income),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType)
      );
      
      const querySnapshot = await getDocs(q);
      let total = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount || 0;
      });
      
      return total;
    } catch (error) {
      console.error(`Error getting total income for ${linkedType}:`, error);
      return 0;
    }
  }

  // Get expenses by linked ID
  async getExpensesByLinked(linkedType, linkedId) {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, this.collections.expenses),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType),
        where('linkedId', '==', linkedId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      return data;
    } catch (error) {
      console.error(`Error getting expenses for ${linkedType} ${linkedId}:`, error);
      return [];
    }
  }

  // Get income by linked ID
  async getIncomeByLinked(linkedType, linkedId) {
    try {
      const userId = this.getUserId();
      const q = query(
        collection(db, this.collections.income),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType),
        where('linkedId', '==', linkedId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      return data;
    } catch (error) {
      console.error(`Error getting income for ${linkedType} ${linkedId}:`, error);
      return [];
    }
  }
}

// Create and export singleton instance
const firestoreService = new FirestoreService();
export default firestoreService;
