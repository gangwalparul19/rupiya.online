// Admin Service - Optimized with pagination and reduced memory usage
// 
// HOW TO MAKE A USER AN ADMIN:
// In Firebase Console > Firestore > users collection > find user > add isAdmin: true
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
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.usersLastDoc = null;
    this.usersPageSize = 10;
  }

  // Check if current user is an admin
  async isAdmin() {
    const user = authService.getCurrentUser();
    if (!user) return false;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      return userDoc.exists() && userDoc.data().isAdmin === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Cache helpers
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached || Date.now() - cached.timestamp > this.cacheExpiry) {
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
    this.usersLastDoc = null;
  }

  // Get platform stats using COUNT queries (memory efficient)
  async getPlatformStats() {
    const cacheKey = 'platformStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Use count queries instead of fetching all documents
      const [usersCount, expensesCount, incomeCount, familyCount, tripCount] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'expenses')),
        getCountFromServer(collection(db, 'income')),
        getCountFromServer(collection(db, 'familyGroups')),
        getCountFromServer(collection(db, 'tripGroups'))
      ]);

      // For totals, we need to fetch but limit the data
      // Only fetch amounts, not full documents
      const [expensesSnap, incomeSnap] = await Promise.all([
        getDocs(query(collection(db, 'expenses'), limit(1000))),
        getDocs(query(collection(db, 'income'), limit(1000)))
      ]);

      let totalExpenses = 0;
      expensesSnap.forEach(doc => {
        totalExpenses += doc.data().amount || 0;
      });

      let totalIncome = 0;
      incomeSnap.forEach(doc => {
        totalIncome += doc.data().amount || 0;
      });

      const stats = {
        totalUsers: usersCount.data().count,
        totalExpenses,
        totalIncome,
        expenseCount: expensesCount.data().count,
        incomeCount: incomeCount.data().count,
        totalFamilyGroups: familyCount.data().count,
        totalTripGroups: tripCount.data().count,
        netSavings: totalIncome - totalExpenses
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting platform stats:', error);
      throw error;
    }
  }

  // Get user activity stats (optimized)
  async getUserActivityStats() {
    const cacheKey = 'userActivityStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const dayAgo = Timestamp.fromDate(new Date(now - 24 * 60 * 60 * 1000));
      const weekAgo = Timestamp.fromDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
      const monthAgo = Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));

      // Use count queries for each time period
      const [totalCount, todayCount, weekCount, monthCount] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'users'), where('lastLoginAt', '>=', dayAgo))),
        getCountFromServer(query(collection(db, 'users'), where('lastLoginAt', '>=', weekAgo))),
        getCountFromServer(query(collection(db, 'users'), where('lastLoginAt', '>=', monthAgo)))
      ]);

      const stats = {
        totalUsers: totalCount.data().count,
        activeToday: todayCount.data().count,
        activeThisWeek: weekCount.data().count,
        activeThisMonth: monthCount.data().count,
        inactiveUsers: totalCount.data().count - monthCount.data().count
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting user activity stats:', error);
      throw error;
    }
  }

  // Get users by location (limited fetch)
  async getUsersByLocation() {
    const cacheKey = 'usersByLocation';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Limit to 500 users for location analysis
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      
      const locationData = { byCountry: {}, byCity: {}, byRegion: {}, unknown: 0, total: 0 };

      usersSnap.forEach(doc => {
        const data = doc.data();
        locationData.total++;
        
        // Get country (check both direct field and nested location object)
        const country = data.country || data.location?.country;
        // Get city
        const city = data.city || data.location?.city;
        // Get region/state
        const region = data.region || data.location?.region;

        if (country) {
          locationData.byCountry[country] = (locationData.byCountry[country] || 0) + 1;
        }
        if (city) {
          locationData.byCity[city] = (locationData.byCity[city] || 0) + 1;
        }
        if (region) {
          locationData.byRegion[region] = (locationData.byRegion[region] || 0) + 1;
        }
        if (!country && !city) {
          locationData.unknown++;
        }
      });

      // Sort and limit to top 10
      const sortAndLimit = (obj) => Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

      locationData.byCountry = sortAndLimit(locationData.byCountry);
      locationData.byCity = sortAndLimit(locationData.byCity);
      locationData.byRegion = sortAndLimit(locationData.byRegion);

      this.setCache(cacheKey, locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting users by location:', error);
      throw error;
    }
  }

  // Get expenses by category (limited, aggregated)
  async getExpensesByCategory() {
    const cacheKey = 'expensesByCategory';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Limit to recent 1000 expenses
      const snap = await getDocs(query(collection(db, 'expenses'), limit(1000)));
      const categoryData = {};

      snap.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'Other';
        if (!categoryData[category]) categoryData[category] = { total: 0, count: 0 };
        categoryData[category].total += data.amount || 0;
        categoryData[category].count++;
      });

      const sorted = Object.entries(categoryData)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([category, data]) => ({ category, ...data }));

      this.setCache(cacheKey, sorted);
      return sorted;
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      throw error;
    }
  }

  // Get income by source (limited, aggregated)
  async getIncomeBySource() {
    const cacheKey = 'incomeBySource';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const snap = await getDocs(query(collection(db, 'income'), limit(1000)));
      const sourceData = {};

      snap.forEach(doc => {
        const data = doc.data();
        // Income uses 'source' field, not 'category'
        const source = data.source || 'Other';
        if (!sourceData[source]) sourceData[source] = { total: 0, count: 0 };
        sourceData[source].total += data.amount || 0;
        sourceData[source].count++;
      });

      const sorted = Object.entries(sourceData)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([source, data]) => ({ source, ...data }));

      this.setCache(cacheKey, sorted);
      return sorted;
    } catch (error) {
      console.error('Error getting income by source:', error);
      throw error;
    }
  }

  // Get monthly trends (last 6 months only)
  async getMonthlyTrends() {
    const cacheKey = 'monthlyTrends';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startTimestamp = Timestamp.fromDate(sixMonthsAgo);

      const [expensesSnap, incomeSnap] = await Promise.all([
        getDocs(query(collection(db, 'expenses'), where('date', '>=', startTimestamp), limit(500))),
        getDocs(query(collection(db, 'income'), where('date', '>=', startTimestamp), limit(500)))
      ]);

      const monthlyData = {};

      const processDoc = (doc, type) => {
        const data = doc.data();
        const date = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { expenses: 0, income: 0 };
        }
        monthlyData[monthKey][type] += data.amount || 0;
      };

      expensesSnap.forEach(doc => processDoc(doc, 'expenses'));
      incomeSnap.forEach(doc => processDoc(doc, 'income'));

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

  // Get users with pagination
  async getUsers(page = 1, reset = false) {
    if (reset) {
      this.usersLastDoc = null;
    }

    try {
      let q;
      if (page === 1 || !this.usersLastDoc) {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(this.usersPageSize)
        );
      } else {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(this.usersLastDoc),
          limit(this.usersPageSize)
        );
      }

      const snapshot = await getDocs(q);
      const users = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          displayName: data.displayName || 'User',
          email: data.email,
          city: data.city || '-',
          country: data.country || '-',
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt,
          isActive: data.isActive !== false
        });
        this.usersLastDoc = doc;
      });

      return {
        users,
        hasMore: users.length === this.usersPageSize
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  // Get total user count
  async getTotalUserCount() {
    try {
      const count = await getCountFromServer(collection(db, 'users'));
      return count.data().count;
    } catch (error) {
      console.error('Error getting user count:', error);
      return 0;
    }
  }
}

const adminService = new AdminService();
export default adminService;
