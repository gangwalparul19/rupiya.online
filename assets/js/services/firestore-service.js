// Firestore Service - Optimized with caching, pagination, and batch operations
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
  startAfter,
  getCountFromServer,
  Timestamp,
  writeBatch
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
      houseHelpPayments: 'houseHelpPayments',
      fuelLogs: 'fuelLogs',
      splits: 'splits'
    };
    
    // Cache configuration
    this.cache = new Map();
    this.cacheExpiry = 2 * 60 * 1000; // 2 minutes cache
    this.lastCursors = new Map();
    this.defaultPageSize = 10;
  }

  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================
  
  getCacheKey(collectionName, params = {}) {
    const userId = this.getUserId();
    return `${userId}:${collectionName}:${JSON.stringify(params)}`;
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }
  
  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  invalidateCache(collectionName = null) {
    if (collectionName) {
      const userId = this.getUserId();
      const prefix = `${userId}:${collectionName}`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
    this.lastCursors.clear();
  }

  // ============================================
  // GENERIC CRUD OPERATIONS
  // ============================================

  async add(collectionName, data) {
    try {
      const userId = this.getUserId();
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      this.invalidateCache(collectionName);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error(`Error adding to ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async get(collectionName, docId) {
    try {
      const cacheKey = this.getCacheKey(collectionName, { docId });
      const cached = this.getFromCache(cacheKey);
      if (cached) return { success: true, data: cached, fromCache: true };
      
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        this.setCache(cacheKey, data);
        return { success: true, data };
      }
      return { success: false, error: 'Document not found' };
    } catch (error) {
      console.error(`Error getting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getAll(collectionName, orderByField = 'createdAt', orderDirection = 'desc', maxLimit = null) {
    try {
      const userId = this.getUserId();
      const cacheKey = this.getCacheKey(collectionName, { orderByField, orderDirection, maxLimit });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      let q = query(
        collection(db, collectionName),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      if (maxLimit) q = query(q, limit(maxLimit));
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error getting all from ${collectionName}:`, error);
      return [];
    }
  }

  // ============================================
  // PAGINATED QUERIES
  // ============================================

  async getPaginated(collectionName, options = {}) {
    const {
      orderByField = 'createdAt',
      orderDirection = 'desc',
      pageSize = this.defaultPageSize,
      lastDoc = null,
      filters = []
    } = options;
    
    try {
      const userId = this.getUserId();
      let constraints = [
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      ];
      
      filters.forEach(filter => {
        constraints.push(where(filter.field, filter.operator, filter.value));
      });
      
      if (lastDoc) constraints.push(startAfter(lastDoc));
      constraints.push(limit(pageSize));
      
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const data = [];
      let lastVisible = null;
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
        lastVisible = doc;
      });
      
      return { data, lastDoc: lastVisible, hasMore: data.length === pageSize };
    } catch (error) {
      console.error(`Error getting paginated from ${collectionName}:`, error);
      return { data: [], lastDoc: null, hasMore: false };
    }
  }

  async getCount(collectionName, filters = []) {
    try {
      const userId = this.getUserId();
      let constraints = [where('userId', '==', userId)];
      filters.forEach(filter => constraints.push(where(filter.field, filter.operator, filter.value)));
      
      const q = query(collection(db, collectionName), ...constraints);
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error(`Error getting count for ${collectionName}:`, error);
      return 0;
    }
  }

  async update(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
      this.invalidateCache(collectionName);
      return { success: true };
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async delete(collectionName, docId) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      this.invalidateCache(collectionName);
      return { success: true };
    } catch (error) {
      console.error(`Error deleting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  async batchAdd(collectionName, items) {
    try {
      const userId = this.getUserId();
      const batch = writeBatch(db);
      const ids = [];
      
      items.forEach(item => {
        const docRef = doc(collection(db, collectionName));
        batch.set(docRef, { ...item, userId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        ids.push(docRef.id);
      });
      
      await batch.commit();
      this.invalidateCache(collectionName);
      return { success: true, ids };
    } catch (error) {
      console.error(`Error batch adding to ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async batchDelete(collectionName, docIds) {
    try {
      const batch = writeBatch(db);
      docIds.forEach(docId => batch.delete(doc(db, collectionName, docId)));
      await batch.commit();
      this.invalidateCache(collectionName);
      return { success: true };
    } catch (error) {
      console.error(`Error batch deleting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async batchUpdate(collectionName, updates) {
    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, data }) => {
        batch.update(doc(db, collectionName, id), { ...data, updatedAt: Timestamp.now() });
      });
      await batch.commit();
      this.invalidateCache(collectionName);
      return { success: true };
    } catch (error) {
      console.error(`Error batch updating ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }


  // ============================================
  // EXPENSES - Optimized
  // ============================================

  async addExpense(expense) {
    return this.add(this.collections.expenses, {
      ...expense,
      date: expense.date instanceof Date ? Timestamp.fromDate(expense.date) : Timestamp.now()
    });
  }

  async getExpenses(pageSize = null) {
    return pageSize 
      ? this.getAll(this.collections.expenses, 'date', 'desc', pageSize)
      : this.getAll(this.collections.expenses, 'date', 'desc');
  }

  async getExpensesPaginated(options = {}) {
    return this.getPaginated(this.collections.expenses, { orderByField: 'date', orderDirection: 'desc', ...options });
  }

  async getExpensesCount(filters = []) {
    return this.getCount(this.collections.expenses, filters);
  }

  async updateExpense(id, expense) {
    const updateData = { ...expense };
    if (expense.date instanceof Date) updateData.date = Timestamp.fromDate(expense.date);
    return this.update(this.collections.expenses, id, updateData);
  }

  async deleteExpense(id) {
    return this.delete(this.collections.expenses, id);
  }

  // ============================================
  // INCOME - Optimized
  // ============================================

  async addIncome(income) {
    return this.add(this.collections.income, {
      ...income,
      date: income.date instanceof Date ? Timestamp.fromDate(income.date) : Timestamp.now()
    });
  }

  async getIncome(pageSize = null) {
    return pageSize
      ? this.getAll(this.collections.income, 'date', 'desc', pageSize)
      : this.getAll(this.collections.income, 'date', 'desc');
  }

  async getIncomePaginated(options = {}) {
    return this.getPaginated(this.collections.income, { orderByField: 'date', orderDirection: 'desc', ...options });
  }

  async getIncomeCount(filters = []) {
    return this.getCount(this.collections.income, filters);
  }

  async updateIncome(id, income) {
    const updateData = { ...income };
    if (income.date instanceof Date) updateData.date = Timestamp.fromDate(income.date);
    return this.update(this.collections.income, id, updateData);
  }

  async deleteIncome(id) {
    return this.delete(this.collections.income, id);
  }

  // ============================================
  // BUDGETS
  // ============================================

  async addBudget(budget) { return this.add(this.collections.budgets, budget); }
  async getBudgets() { return this.getAll(this.collections.budgets, 'month', 'desc'); }
  async updateBudget(id, budget) { return this.update(this.collections.budgets, id, budget); }
  async deleteBudget(id) { return this.delete(this.collections.budgets, id); }

  // ============================================
  // INVESTMENTS
  // ============================================

  async addInvestment(investment) {
    return this.add(this.collections.investments, {
      ...investment,
      purchaseDate: investment.purchaseDate instanceof Date ? Timestamp.fromDate(investment.purchaseDate) : Timestamp.now()
    });
  }

  async getInvestments() { return this.getAll(this.collections.investments, 'purchaseDate', 'desc'); }

  async updateInvestment(id, investment) {
    const updateData = { ...investment };
    if (investment.purchaseDate instanceof Date) updateData.purchaseDate = Timestamp.fromDate(investment.purchaseDate);
    return this.update(this.collections.investments, id, updateData);
  }

  async deleteInvestment(id) { return this.delete(this.collections.investments, id); }

  // ============================================
  // GOALS
  // ============================================

  async addGoal(goal) {
    return this.add(this.collections.goals, {
      ...goal,
      targetDate: goal.targetDate instanceof Date ? Timestamp.fromDate(goal.targetDate) : Timestamp.now()
    });
  }

  async getGoals() { return this.getAll(this.collections.goals, 'targetDate', 'asc'); }

  async updateGoal(id, goal) {
    const updateData = { ...goal };
    if (goal.targetDate instanceof Date) updateData.targetDate = Timestamp.fromDate(goal.targetDate);
    return this.update(this.collections.goals, id, updateData);
  }

  async deleteGoal(id) { return this.delete(this.collections.goals, id); }

  // ============================================
  // RECURRING TRANSACTIONS
  // ============================================

  async addRecurring(recurring) {
    return this.add(this.collections.recurring, {
      ...recurring,
      startDate: recurring.startDate instanceof Date ? Timestamp.fromDate(recurring.startDate) : Timestamp.now(),
      nextDueDate: recurring.nextDueDate instanceof Date ? Timestamp.fromDate(recurring.nextDueDate) : null,
      endDate: recurring.endDate instanceof Date ? Timestamp.fromDate(recurring.endDate) : null
    });
  }

  async getRecurring() { return this.getAll(this.collections.recurring, 'createdAt', 'desc'); }

  async updateRecurring(id, recurring) {
    const updateData = { ...recurring };
    if (recurring.startDate instanceof Date) updateData.startDate = Timestamp.fromDate(recurring.startDate);
    if (recurring.nextDueDate instanceof Date) updateData.nextDueDate = Timestamp.fromDate(recurring.nextDueDate);
    if (recurring.endDate instanceof Date) updateData.endDate = Timestamp.fromDate(recurring.endDate);
    return this.update(this.collections.recurring, id, updateData);
  }

  async deleteRecurring(id) { return this.delete(this.collections.recurring, id); }

  // ============================================
  // NOTES, DOCUMENTS, SPLITS - Paginated
  // ============================================

  async getNotes() { return this.getAll(this.collections.notes, 'createdAt', 'desc'); }
  async getNotesPaginated(options = {}) { return this.getPaginated(this.collections.notes, { orderByField: 'createdAt', orderDirection: 'desc', ...options }); }

  async getDocuments() { return this.getAll(this.collections.documents, 'createdAt', 'desc'); }
  async getDocumentsPaginated(options = {}) { return this.getPaginated(this.collections.documents, { orderByField: 'createdAt', orderDirection: 'desc', ...options }); }

  async getSplits() { return this.getAll(this.collections.splits, 'createdAt', 'desc'); }
  async getSplitsPaginated(options = {}) { return this.getPaginated(this.collections.splits, { orderByField: 'createdAt', orderDirection: 'desc', ...options }); }

  // ============================================
  // OPTIMIZED QUERY HELPERS
  // ============================================

  async getRecentTransactions(limitCount = 10) {
    try {
      const cacheKey = this.getCacheKey('recentTransactions', { limitCount });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const [expenses, income] = await Promise.all([
        this.getAll(this.collections.expenses, 'date', 'desc', limitCount),
        this.getAll(this.collections.income, 'date', 'desc', limitCount)
      ]);
      
      const combined = [
        ...expenses.map(e => ({ ...e, type: 'expense' })),
        ...income.map(i => ({ ...i, type: 'income' }))
      ].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      }).slice(0, limitCount);
      
      this.setCache(cacheKey, combined);
      return combined;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  async getMonthlySummary(year, month) {
    try {
      const cacheKey = this.getCacheKey('monthlySummary', { year, month });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      
      const [expenses, income] = await Promise.all([
        this.queryByDateRange(this.collections.expenses, startDate, endDate),
        this.queryByDateRange(this.collections.income, startDate, endDate)
      ]);
      
      const summary = {
        totalExpenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        totalIncome: income.reduce((sum, i) => sum + (i.amount || 0), 0),
        netSavings: 0,
        expenseCount: expenses.length,
        incomeCount: income.length
      };
      summary.netSavings = summary.totalIncome - summary.totalExpenses;
      
      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return { totalExpenses: 0, totalIncome: 0, netSavings: 0, expenseCount: 0, incomeCount: 0 };
    }
  }

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
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      return data;
    } catch (error) {
      console.error(`Error querying ${collectionName} by date range:`, error);
      return [];
    }
  }

  async getTotalExpensesByLinkedType(linkedType) {
    try {
      const cacheKey = this.getCacheKey('expensesByLinkedType', { linkedType });
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
      
      const userId = this.getUserId();
      const q = query(
        collection(db, this.collections.expenses),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType)
      );
      
      const querySnapshot = await getDocs(q);
      let total = 0;
      querySnapshot.forEach((doc) => total += doc.data().amount || 0);
      
      this.setCache(cacheKey, total);
      return total;
    } catch (error) {
      console.error(`Error getting total expenses for ${linkedType}:`, error);
      return 0;
    }
  }

  async getTotalIncomeByLinkedType(linkedType) {
    try {
      const cacheKey = this.getCacheKey('incomeByLinkedType', { linkedType });
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) return cached;
      
      const userId = this.getUserId();
      const q = query(
        collection(db, this.collections.income),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType)
      );
      
      const querySnapshot = await getDocs(q);
      let total = 0;
      querySnapshot.forEach((doc) => total += doc.data().amount || 0);
      
      this.setCache(cacheKey, total);
      return total;
    } catch (error) {
      console.error(`Error getting total income for ${linkedType}:`, error);
      return 0;
    }
  }

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
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      return data;
    } catch (error) {
      console.error(`Error getting expenses for ${linkedType} ${linkedId}:`, error);
      return [];
    }
  }

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
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      return data;
    } catch (error) {
      console.error(`Error getting income for ${linkedType} ${linkedId}:`, error);
      return [];
    }
  }
}

const firestoreService = new FirestoreService();
export default firestoreService;