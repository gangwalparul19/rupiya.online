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
  // Note: Financial data is encrypted, so we only show user and collection counts
  async getPlatformStats() {
    const cacheKey = 'platformStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Use count queries for collections (encrypted data cannot be aggregated)
      const [usersCount, expensesCount, incomeCount, familyCount, tripCount, budgetsCount, goalsCount] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'expenses')),
        getCountFromServer(collection(db, 'income')),
        getCountFromServer(collection(db, 'familyGroups')),
        getCountFromServer(collection(db, 'tripGroups')),
        getCountFromServer(collection(db, 'budgets')),
        getCountFromServer(collection(db, 'goals'))
      ]);

      const stats = {
        totalUsers: usersCount.data().count,
        totalTransactions: expensesCount.data().count + incomeCount.data().count,
        totalExpenseRecords: expensesCount.data().count,
        totalIncomeRecords: incomeCount.data().count,
        totalFamilyGroups: familyCount.data().count,
        totalTripGroups: tripCount.data().count,
        totalBudgets: budgetsCount.data().count,
        totalGoals: goalsCount.data().count
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

  // Get user registration trends (last 6 months)
  async getUserRegistrationTrends() {
    const cacheKey = 'userRegistrationTrends';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startTimestamp = Timestamp.fromDate(sixMonthsAgo);

      const usersSnap = await getDocs(
        query(
          collection(db, 'users'), 
          where('createdAt', '>=', startTimestamp),
          orderBy('createdAt', 'asc'),
          limit(1000)
        )
      );

      const monthlyData = {};

      usersSnap.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { registrations: 0 };
        }
        monthlyData[monthKey].registrations++;
      });

      const trends = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          ...data
        }));

      this.setCache(cacheKey, trends);
      return trends;
    } catch (error) {
      console.error('Error getting user registration trends:', error);
      throw error;
    }
  }

  // Get platform usage stats (collection activity)
  async getPlatformUsageStats() {
    const cacheKey = 'platformUsageStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Count documents in various collections to show platform usage
      const [
        expensesCount, incomeCount, budgetsCount, goalsCount, 
        investmentsCount, notesCount, documentsCount, vehiclesCount,
        housesCount, splitsCount, familyGroupsCount, tripGroupsCount
      ] = await Promise.all([
        getCountFromServer(collection(db, 'expenses')),
        getCountFromServer(collection(db, 'income')),
        getCountFromServer(collection(db, 'budgets')),
        getCountFromServer(collection(db, 'goals')),
        getCountFromServer(collection(db, 'investments')),
        getCountFromServer(collection(db, 'notes')),
        getCountFromServer(collection(db, 'documents')),
        getCountFromServer(collection(db, 'vehicles')),
        getCountFromServer(collection(db, 'houses')),
        getCountFromServer(collection(db, 'splits')),
        getCountFromServer(collection(db, 'familyGroups')),
        getCountFromServer(collection(db, 'tripGroups'))
      ]);

      const stats = {
        expenses: expensesCount.data().count,
        income: incomeCount.data().count,
        budgets: budgetsCount.data().count,
        goals: goalsCount.data().count,
        investments: investmentsCount.data().count,
        notes: notesCount.data().count,
        documents: documentsCount.data().count,
        vehicles: vehiclesCount.data().count,
        houses: housesCount.data().count,
        splits: splitsCount.data().count,
        familyGroups: familyGroupsCount.data().count,
        tripGroups: tripGroupsCount.data().count
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting platform usage stats:', error);
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

  // Get detailed user statistics from users collection
  async getUserStats() {
    const cacheKey = 'userStats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all users (limited to 5000 for performance)
      const usersSnap = await getDocs(
        query(collection(db, 'users'), limit(5000))
      );

      let usersFromIndia = 0;
      let usersOutsideIndia = 0;
      let usersWithLocation = 0;
      let usersWithDisplayName = 0;
      let usersWithPhone = 0;
      let activeThisMonth = 0;

      const now = new Date();
      const monthAgo = Timestamp.fromDate(new Date(now - 30 * 24 * 60 * 60 * 1000));

      usersSnap.forEach(doc => {
        const data = doc.data();

        // Count users with display name
        if (data.displayName && data.displayName.trim()) {
          usersWithDisplayName++;
        }

        // Count users with phone
        if (data.phoneNumber && data.phoneNumber.trim()) {
          usersWithPhone++;
        }

        // Count users with location data
        if ((data.country && data.country.trim()) || (data.city && data.city.trim())) {
          usersWithLocation++;

          // Count by country
          if (data.country) {
            const country = data.country.toLowerCase().trim();
            if (country === 'india' || country === 'in') {
              usersFromIndia++;
            } else if (country) {
              usersOutsideIndia++;
            }
          }
        }

        // Count active users (last login in last 30 days)
        if (data.lastLoginAt && data.lastLoginAt >= monthAgo) {
          activeThisMonth++;
        }
      });

      const stats = {
        usersFromIndia,
        usersOutsideIndia,
        usersWithLocation,
        usersWithDisplayName,
        usersWithPhone,
        activeThisMonth
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      // Return default stats on error
      return {
        usersFromIndia: 0,
        usersOutsideIndia: 0,
        usersWithLocation: 0,
        usersWithDisplayName: 0,
        usersWithPhone: 0,
        activeThisMonth: 0
      };
    }
  }
}

const adminService = new AdminService();
export default adminService;
