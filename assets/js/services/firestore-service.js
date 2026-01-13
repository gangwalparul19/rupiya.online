// Firestore Service - Optimized with caching, pagination, batch operations, and encryption
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
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
import encryptionService from './encryption-service.js';
import privacyConfig from '../config/privacy-config.js';

class FirestoreService {
  constructor() {
    this.collections = {
      expenses: 'expenses',
      income: 'income',
      budgets: 'budgets',
      investments: 'investments',
      goals: 'goals',
      loans: 'loans',
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
      splits: 'splits',
      paymentMethods: 'paymentMethods',
      transfers: 'transfers',
      netWorthSnapshots: 'netWorthSnapshots'
    };
    
    // Cache configuration with size limits
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    this.maxCacheSize = 100; // Maximum number of cache entries
    this.lastCursors = new Map();
    this.maxCursorSize = 50; // Maximum number of cursor entries
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
    // Enforce cache size limit with LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry (first entry in Map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  invalidateCache(collectionName = null) {
    if (collectionName) {
      const userId = this.getUserId();
      const prefix = `${userId}:${collectionName}`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) this.cache.delete(key);
      }
      
      // Also invalidate monthly summary cache if expenses or income changed
      if (collectionName === 'expenses' || collectionName === 'income') {
        const summaryPrefix = `${userId}:monthlySummary`;
        for (const key of this.cache.keys()) {
          if (key.startsWith(summaryPrefix)) this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    
    // Enforce cursor size limit
    if (this.lastCursors.size > this.maxCursorSize) {
      const firstKey = this.lastCursors.keys().next().value;
      this.lastCursors.delete(firstKey);
    }
  }

  // ============================================
  // GENERIC CRUD OPERATIONS
  // ============================================

  async add(collectionName, data) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before saving data
      await encryptionService.waitForInitialization();
      
      // Encrypt data before saving
      const dataToSave = await encryptionService.encryptObject(data, collectionName);
      
      const docRef = await addDoc(collection(db, collectionName), {
        ...dataToSave,
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
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        let data = { id: docSnap.id, ...docSnap.data() };
        
        // Decrypt data after reading
        data = await encryptionService.decryptObject(data, collectionName);
        
        this.setCache(cacheKey, data);
        return { success: true, data };
      }
      return { success: false, error: 'Document not found' };
    } catch (error) {
      console.error(`Error getting from ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async getAll(collectionName, orderByField = 'createdAt', orderDirection = 'desc', maxLimit = 100) {
    try {
      const userId = this.getUserId();
      if (!userId) {
        console.warn(`[FirestoreService] No userId for getAll ${collectionName}`);
        return [];
      }
      
      const cacheKey = this.getCacheKey(collectionName, { orderByField, orderDirection, maxLimit });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      let q = query(
        collection(db, collectionName),
        where('userId', '==', userId),
        orderBy(orderByField, orderDirection)
      );
      
      // Always enforce a reasonable limit to prevent loading thousands of records
      // Pass null explicitly to bypass this limit if absolutely necessary
      if (maxLimit !== null) {
        q = query(q, limit(maxLimit));
      }
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));

      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, collectionName);
  
      this.setCache(cacheKey, decryptedData);
      return decryptedData;
    } catch (error) {
      console.error(`[FirestoreService] Error getting all from ${collectionName}:`, error);
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
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
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
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, collectionName);
      
      return { data: decryptedData, lastDoc: lastVisible, hasMore: data.length === pageSize };
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
      // Wait for encryption to be ready before updating data
      await encryptionService.waitForInitialization();
      
      // Encrypt data before updating
      const dataToUpdate = await encryptionService.encryptObject(data, collectionName);
      
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, { ...dataToUpdate, updatedAt: Timestamp.now() });
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
      
      for (const item of items) {
        const docRef = doc(collection(db, collectionName));
        // Encrypt each item before saving
        const encryptedItem = await encryptionService.encryptObject(item, collectionName);
        batch.set(docRef, { ...encryptedItem, userId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
        ids.push(docRef.id);
      }
      
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
      
      for (const { id, data } of updates) {
        // Encrypt each update before saving
        const encryptedData = await encryptionService.encryptObject(data, collectionName);
        batch.update(doc(db, collectionName, id), { ...encryptedData, updatedAt: Timestamp.now() });
      }
      
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

  async getExpenses(pageSize = 50) {
    // Default to 50 most recent expenses instead of ALL
    return this.getAll(this.collections.expenses, 'date', 'desc', pageSize);
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

  async getIncome(pageSize = 50) {
    // Default to 50 most recent income instead of ALL
    return this.getAll(this.collections.income, 'date', 'desc', pageSize);
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
  // LOANS & EMI
  // ============================================

  async addLoan(loan) {
    return this.add(this.collections.loans, {
      ...loan,
      startDate: loan.startDate instanceof Date ? Timestamp.fromDate(loan.startDate) : Timestamp.now()
    });
  }

  async getLoans() { return this.getAll(this.collections.loans, 'createdAt', 'desc'); }

  async updateLoan(id, loan) {
    const updateData = { ...loan };
    if (loan.startDate instanceof Date) updateData.startDate = Timestamp.fromDate(loan.startDate);
    return this.update(this.collections.loans, id, updateData);
  }

  async deleteLoan(id) { return this.delete(this.collections.loans, id); }

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
  // PAYMENT METHODS - Encrypted
  // ============================================

  async addPaymentMethod(paymentMethod) {
    return this.add(this.collections.paymentMethods, paymentMethod);
  }

  async getPaymentMethods() {
    return this.getAll(this.collections.paymentMethods, 'createdAt', 'desc');
  }

  async getPaymentMethod(id) {
    return this.get(this.collections.paymentMethods, id);
  }

  async updatePaymentMethod(id, paymentMethod) {
    return this.update(this.collections.paymentMethods, id, paymentMethod);
  }

  async deletePaymentMethod(id) {
    return this.delete(this.collections.paymentMethods, id);
  }

  // ============================================
  // CUSTOM QUERY METHOD
  // ============================================

  async query(collectionName, filters = [], orderByField = null, orderDirection = 'asc', limitCount = null) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      let constraints = [where('userId', '==', userId)];
      
      // Add filters
      if (Array.isArray(filters)) {
        filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });
      }
      
      // Add ordering
      if (orderByField) {
        constraints.push(orderBy(orderByField, orderDirection));
      }
      
      // Add limit
      if (limitCount) {
        constraints.push(limit(limitCount));
      }
      
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, collectionName);
      
      return decryptedData;
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
      return [];
    }
  }

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
      
      // Data is already decrypted by getAll
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

  // Optimized: Get expenses for a specific month only (for KPIs)
  async getExpensesByMonth(year, month) {
    try {
      const cacheKey = this.getCacheKey('expensesByMonth', { year, month });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      
      const data = await this.queryByDateRange(this.collections.expenses, startDate, endDate);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting expenses by month:', error);
      return [];
    }
  }

  // Optimized: Get income for a specific month only (for KPIs)
  async getIncomeByMonth(year, month) {
    try {
      const cacheKey = this.getCacheKey('incomeByMonth', { year, month });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      
      const data = await this.queryByDateRange(this.collections.income, startDate, endDate);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting income by month:', error);
      return [];
    }
  }

  // Optimized: Get expenses for last N months (for charts)
  async getExpensesForLastMonths(months = 6) {
    try {
      const cacheKey = this.getCacheKey('expensesLastMonths', { months });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const data = await this.queryByDateRange(this.collections.expenses, startDate, endDate);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting expenses for last months:', error);
      return [];
    }
  }

  // Optimized: Get income for last N months (for charts)
  async getIncomeForLastMonths(months = 6) {
    try {
      const cacheKey = this.getCacheKey('incomeLastMonths', { months });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const data = await this.queryByDateRange(this.collections.income, startDate, endDate);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error getting income for last months:', error);
      return [];
    }
  }

  // Optimized: Get KPI summary for expenses page (current month, last month, total count)
  async getExpenseKPISummary() {
    try {
      const cacheKey = this.getCacheKey('expenseKPISummary', {});
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Get current and last month data in parallel
      const [currentMonthExpenses, lastMonthExpenses, totalCount] = await Promise.all([
        this.getExpensesByMonth(currentYear, currentMonth),
        this.getExpensesByMonth(currentYear, currentMonth - 1),
        this.getExpensesCount()
      ]);
      
      const summary = {
        thisMonth: currentMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
        lastMonth: lastMonthExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
        totalCount
      };
      
      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Error getting expense KPI summary:', error);
      return { thisMonth: 0, lastMonth: 0, totalCount: 0 };
    }
  }

  // Optimized: Get KPI summary for income page
  async getIncomeKPISummary() {
    try {
      const cacheKey = this.getCacheKey('incomeKPISummary', {});
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Get current and last month data in parallel
      const [currentMonthIncome, lastMonthIncome, totalCount] = await Promise.all([
        this.getIncomeByMonth(currentYear, currentMonth),
        this.getIncomeByMonth(currentYear, currentMonth - 1),
        this.getIncomeCount()
      ]);
      
      const summary = {
        thisMonth: currentMonthIncome.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0),
        lastMonth: lastMonthIncome.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0),
        totalCount
      };
      
      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Error getting income KPI summary:', error);
      return { thisMonth: 0, lastMonth: 0, totalCount: 0 };
    }
  }

  // Optimized: Get category totals for current month (for budgets)
  async getCurrentMonthCategoryTotals() {
    try {
      const cacheKey = this.getCacheKey('currentMonthCategoryTotals', {});
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const now = new Date();
      const expenses = await this.getExpensesByMonth(now.getFullYear(), now.getMonth());
      
      const totals = {};
      expenses.forEach(e => {
        const cat = e.category || 'Other';
        totals[cat] = (totals[cat] || 0) + (parseFloat(e.amount) || 0);
      });
      
      this.setCache(cacheKey, totals);
      return totals;
    } catch (error) {
      console.error('Error getting category totals:', error);
      return {};
    }
  }

  async getMonthlySummary(year, month) {
    try {
      const cacheKey = this.getCacheKey('monthlySummary', { year, month });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      
      const [expenses, income, splits] = await Promise.all([
        this.queryByDateRange(this.collections.expenses, startDate, endDate),
        this.queryByDateRange(this.collections.income, startDate, endDate),
        this.getSplitsByDateRange(startDate, endDate)
      ]);
      
      // Calculate split expenses and income for REFERENCE ONLY
      // These are tracked separately and should NOT be included in main totals
      // until the user explicitly settles and adds their share
      let splitExpenses = 0;
      let splitIncome = 0;
      
      splits.forEach(split => {
        const myShare = split.participants?.find(p => p.name === 'Me');
        const myAmount = myShare ? parseFloat(myShare.amount) || 0 : 0;
        
        if (split.paidBy === 'me') {
          // I paid - my share is my expense
          splitExpenses += myAmount;
          // If settled, the amount others owed me is income I received
          if (split.status === 'settled') {
            const othersTotal = split.participants
              ?.filter(p => p.name !== 'Me')
              .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
            splitIncome += othersTotal;
          }
        } else {
          // Someone else paid - my share is my expense (I owe them)
          splitExpenses += myAmount;
        }
      });
      
      // NOTE: Split expenses/income are kept separate from main totals
      // They are provided for reference but NOT included in totalExpenses/totalIncome
      const summary = {
        totalExpenses: expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
        totalIncome: income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0),
        netSavings: 0,
        expenseCount: expenses.length,
        incomeCount: income.length,
        splitExpenses: splitExpenses,
        splitIncome: splitIncome,
        splitCount: splits.length
      };
      summary.netSavings = summary.totalIncome - summary.totalExpenses;
      
      this.setCache(cacheKey, summary);
      return summary;
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return { totalExpenses: 0, totalIncome: 0, netSavings: 0, expenseCount: 0, incomeCount: 0, splitExpenses: 0, splitIncome: 0, splitCount: 0 };
    }
  }

  async getSplitsByDateRange(startDate, endDate) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      const q = query(
        collection(db, this.collections.splits),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, this.collections.splits);
      
      return decryptedData;
    } catch (error) {
      console.error('Error querying splits by date range:', error);
      return [];
    }
  }

  // Get trip group expenses linked to current user's personal expenses
  async getTripGroupExpensesByDateRange(startDate, endDate) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      // Query personal expenses that are linked to trip groups
      const q = query(
        collection(db, this.collections.expenses),
        where('userId', '==', userId),
        where('tripGroupId', '!=', null),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('tripGroupId'),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, this.collections.expenses);
      
      return decryptedData;
    } catch (error) {
      console.error('Error querying trip group expenses by date range:', error);
      return [];
    }
  }

  async queryByDateRange(collectionName, startDate, endDate) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
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
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, collectionName);
      
      // IMPORTANT: Filter out family group expenses/income from personal queries
      // Family expenses should only appear in family dashboard, not personal dashboard
      // This ensures accurate personal income/expense tracking
      const personalData = decryptedData.filter(item => !item.familyGroupId);
      
      return personalData;
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
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
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
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, this.collections.expenses);
      
      return decryptedData;
    } catch (error) {
      console.error(`Error getting expenses for ${linkedType} ${linkedId}:`, error);
      return [];
    }
  }

  async getIncomeByLinked(linkedType, linkedId) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
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
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, this.collections.income);
      
      return decryptedData;
    } catch (error) {
      console.error(`Error getting income for ${linkedType} ${linkedId}:`, error);
      return [];
    }
  }

  // Find expense by custom field (e.g., houseHelpPaymentId)
  async findExpenseByField(fieldName, fieldValue) {
    try {
      const userId = this.getUserId();
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      const q = query(
        collection(db, this.collections.expenses),
        where('userId', '==', userId),
        where(fieldName, '==', fieldValue),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      let data = { id: doc.id, ...doc.data() };
      
      // Decrypt the document
      data = await encryptionService.decryptObject(data, this.collections.expenses);
      
      return data;
    } catch (error) {
      console.error(`Error finding expense by ${fieldName}:`, error);
      return null;
    }
  }

  // Get all expenses by linked type (optimized query)
  async getExpensesByLinkedType(linkedType) {
    try {
      const userId = this.getUserId();
      const cacheKey = this.getCacheKey('expensesByLinkedType', { linkedType });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      const q = query(
        collection(db, this.collections.expenses),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, this.collections.expenses);
      
      this.setCache(cacheKey, decryptedData);
      return decryptedData;
    } catch (error) {
      console.error(`Error getting expenses by linked type ${linkedType}:`, error);
      return [];
    }
  }

  // Get all income by linked type (optimized query)
  async getIncomeByLinkedType(linkedType) {
    try {
      const userId = this.getUserId();
      const cacheKey = this.getCacheKey('incomeByLinkedType', { linkedType });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
      
      // Wait for encryption to be ready before loading data
      await encryptionService.waitForInitialization();
      
      const q = query(
        collection(db, this.collections.income),
        where('userId', '==', userId),
        where('linkedType', '==', linkedType),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      
      // Decrypt all documents
      const decryptedData = await encryptionService.decryptArray(data, this.collections.income);
      
      this.setCache(cacheKey, decryptedData);
      return decryptedData;
    } catch (error) {
      console.error(`Error getting income by linked type ${linkedType}:`, error);
      return [];
    }
  }
  // ============================================
  // USER SETTINGS
  // ============================================
  
  async getUserSettings() {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'userSettings', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }
  
  async updateUserSettings(settings) {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, 'userSettings', userId);
      
      // Check if document exists
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existing
        await updateDoc(docRef, {
          ...settings,
          updatedAt: Timestamp.now()
        });
      } else {
        // Create new
        await setDoc(docRef, {
          ...settings,
          userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user settings:', error);
      return { success: false, error: error.message };
    }
  }
}

const firestoreService = new FirestoreService();
export default firestoreService;