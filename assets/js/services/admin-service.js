// Admin Service - Platform-wide analytics and user management
// 
// HOW TO MAKE A USER AN ADMIN:
// ============================
// In Firebase Console > Firestore Database:
// 1. Go to the 'users' collection
// 2. Find the user document by their UID
// 3. Add a field: isAdmin = true (boolean)
// 
// Or use Firebase Admin SDK:
// await admin.firestore().collection('users').doc(userId).update({ isAdmin: true });
//
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

class AdminService {
  constructor() {
    this.adminEmails = []; // Will be loaded from config
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Check if current user is an admin
  async isAdmin() {
    const user = authService.getCurrentUser();
    if (!user) return false;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.isAdmin === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get cache or fetch fresh data
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

  clearCache() {
    this.cache.clear();
  }


  // Get platform overview statistics
  async getPlatformStats() {
    const cacheKey = 'platformStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get user count
      const usersSnapshot = await getCountFromServer(collection(db, 'users'));
      const totalUsers = usersSnapshot.data().count;

      // Get expenses count and sum
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      let totalExpenses = 0;
      let expenseCount = 0;
      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        totalExpenses += data.amount || 0;
        expenseCount++;
      });

      // Get income count and sum
      const incomeSnapshot = await getDocs(collection(db, 'income'));
      let totalIncome = 0;
      let incomeCount = 0;
      incomeSnapshot.forEach(doc => {
        const data = doc.data();
        totalIncome += data.amount || 0;
        incomeCount++;
      });

      // Get family groups count
      const familyGroupsSnapshot = await getCountFromServer(collection(db, 'familyGroups'));
      const totalFamilyGroups = familyGroupsSnapshot.data().count;

      // Get trip groups count
      const tripGroupsSnapshot = await getCountFromServer(collection(db, 'tripGroups'));
      const totalTripGroups = tripGroupsSnapshot.data().count;

      const stats = {
        totalUsers,
        totalExpenses,
        totalIncome,
        expenseCount,
        incomeCount,
        totalFamilyGroups,
        totalTripGroups,
        netSavings: totalIncome - totalExpenses,
        avgExpensePerUser: totalUsers > 0 ? totalExpenses / totalUsers : 0,
        avgIncomePerUser: totalUsers > 0 ? totalIncome / totalUsers : 0
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw error;
    }
  }

  // Get users by location (city/country)
  async getUsersByLocation() {
    const cacheKey = 'usersByLocation';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const locationData = {
        byCountry: {},
        byCity: {},
        unknown: 0
      };

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const country = data.country || data.location?.country;
        const city = data.city || data.location?.city;

        if (country) {
          locationData.byCountry[country] = (locationData.byCountry[country] || 0) + 1;
        }
        if (city) {
          locationData.byCity[city] = (locationData.byCity[city] || 0) + 1;
        }
        if (!country && !city) {
          locationData.unknown++;
        }
      });

      // Sort by count
      locationData.byCountry = Object.entries(locationData.byCountry)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
      
      locationData.byCity = Object.entries(locationData.byCity)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

      this.setCache(cacheKey, locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting users by location:', error);
      throw error;
    }
  }


  // Get expense breakdown by category (platform-wide)
  async getExpensesByCategory() {
    const cacheKey = 'expensesByCategory';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      const categoryData = {};

      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'Uncategorized';
        if (!categoryData[category]) {
          categoryData[category] = { total: 0, count: 0 };
        }
        categoryData[category].total += data.amount || 0;
        categoryData[category].count++;
      });

      // Sort by total amount
      const sorted = Object.entries(categoryData)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([category, data]) => ({ category, ...data }));

      this.setCache(cacheKey, sorted);
      return sorted;
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      throw error;
    }
  }

  // Get income breakdown by source (platform-wide)
  async getIncomeBySource() {
    const cacheKey = 'incomeBySource';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const incomeSnapshot = await getDocs(collection(db, 'income'));
      const sourceData = {};

      incomeSnapshot.forEach(doc => {
        const data = doc.data();
        const source = data.category || data.source || 'Other';
        if (!sourceData[source]) {
          sourceData[source] = { total: 0, count: 0 };
        }
        sourceData[source].total += data.amount || 0;
        sourceData[source].count++;
      });

      // Sort by total amount
      const sorted = Object.entries(sourceData)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([source, data]) => ({ source, ...data }));

      this.setCache(cacheKey, sorted);
      return sorted;
    } catch (error) {
      console.error('Error getting income by source:', error);
      throw error;
    }
  }

  // Get monthly trends (platform-wide)
  async getMonthlyTrends(months = 12) {
    const cacheKey = `monthlyTrends_${months}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const startTimestamp = Timestamp.fromDate(startDate);

      // Get expenses
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('date', '>=', startTimestamp),
        orderBy('date', 'asc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);

      // Get income
      const incomeQuery = query(
        collection(db, 'income'),
        where('date', '>=', startTimestamp),
        orderBy('date', 'asc')
      );
      const incomeSnapshot = await getDocs(incomeQuery);

      // Aggregate by month
      const monthlyData = {};

      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { expenses: 0, income: 0, expenseCount: 0, incomeCount: 0 };
        }
        monthlyData[monthKey].expenses += data.amount || 0;
        monthlyData[monthKey].expenseCount++;
      });

      incomeSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { expenses: 0, income: 0, expenseCount: 0, incomeCount: 0 };
        }
        monthlyData[monthKey].income += data.amount || 0;
        monthlyData[monthKey].incomeCount++;
      });

      // Convert to sorted array
      const trends = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          ...data,
          savings: data.income - data.expenses
        }));

      this.setCache(cacheKey, trends);
      return trends;
    } catch (error) {
      console.error('Error getting monthly trends:', error);
      throw error;
    }
  }


  // Get recent users
  async getRecentUsers(count = 10) {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(count)
      );
      const snapshot = await getDocs(usersQuery);
      
      const users = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          city: data.city || data.location?.city || '-',
          country: data.country || data.location?.country || '-',
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt,
          isActive: data.isActive !== false
        });
      });

      return users;
    } catch (error) {
      console.error('Error getting recent users:', error);
      throw error;
    }
  }

  // Get user activity stats
  async getUserActivityStats() {
    const cacheKey = 'userActivityStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      const now = new Date();
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      let activeToday = 0;
      let activeThisWeek = 0;
      let activeThisMonth = 0;
      let totalUsers = 0;

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        totalUsers++;
        
        if (data.lastLoginAt) {
          const lastLogin = data.lastLoginAt.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt);
          
          if (lastLogin >= dayAgo) activeToday++;
          if (lastLogin >= weekAgo) activeThisWeek++;
          if (lastLogin >= monthAgo) activeThisMonth++;
        }
      });

      const stats = {
        totalUsers,
        activeToday,
        activeThisWeek,
        activeThisMonth,
        inactiveUsers: totalUsers - activeThisMonth
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting user activity stats:', error);
      throw error;
    }
  }

  // Get all users list with pagination
  async getAllUsers(pageSize = 50, lastDoc = null) {
    try {
      let usersQuery;
      
      if (lastDoc) {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      } else {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(usersQuery);
      const users = [];
      let lastVisible = null;

      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
        lastVisible = doc;
      });

      return { users, lastDoc: lastVisible, hasMore: users.length === pageSize };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Get platform growth data
  async getPlatformGrowth() {
    const cacheKey = 'platformGrowth';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const monthlySignups = {};

      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlySignups[monthKey] = (monthlySignups[monthKey] || 0) + 1;
        }
      });

      // Convert to sorted array with cumulative count
      let cumulative = 0;
      const growth = Object.entries(monthlySignups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => {
          cumulative += count;
          return { month, newUsers: count, totalUsers: cumulative };
        });

      this.setCache(cacheKey, growth);
      return growth;
    } catch (error) {
      console.error('Error getting platform growth:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const adminService = new AdminService();
export default adminService;
