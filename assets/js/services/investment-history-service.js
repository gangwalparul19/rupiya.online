/**
 * Investment History Service
 * Tracks price history and calculates performance metrics
 */

import firestoreService from './firestore-service.js';
import authService from './auth-service.js';

class InvestmentHistoryService {
  constructor() {
    this.collectionName = 'investmentPriceHistory';
  }

  /**
   * Record a price update for an investment
   * Creates a snapshot of the current price at a specific time
   */
  async recordPriceUpdate(investmentId, currentPrice, notes = '') {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const historyEntry = {
        investmentId,
        userId: user.uid,
        price: currentPrice,
        timestamp: new Date(),
        notes: notes,
        createdAt: new Date()
      };

      const result = await firestoreService.add(this.collectionName, historyEntry);
      return result;
    } catch (error) {
      // Check if it's a permissions error
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('Price history tracking disabled due to permissions. Investment saved successfully.');
        // Return success to not block the main operation
        return { success: true, warning: 'Price history not tracked' };
      }
      console.error('Error recording price update:', error);
      throw error;
    }
  }

  /**
   * Get price history for an investment
   */
  async getPriceHistory(investmentId, limit = 100) {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Query price history for this investment
      const history = await firestoreService.query(this.collectionName, [
        { field: 'investmentId', operator: '==', value: investmentId },
        { field: 'userId', operator: '==', value: user.uid }
      ], 'timestamp', 'desc', limit);

      return history;
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Calculate price change over a specific period
   */
  async getPriceChangeOverPeriod(investmentId, days) {
    try {
      const history = await this.getPriceHistory(investmentId, 1000);
      
      if (history.length === 0) return null;

      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Find the oldest price in the period
      const oldestInPeriod = history.find(h => {
        const timestamp = h.timestamp?.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
        return timestamp <= periodStart;
      });

      // Get the most recent price
      const newestPrice = history[0];

      if (!oldestInPeriod || !newestPrice) return null;

      const oldPrice = oldestInPeriod.price;
      const newPrice = newestPrice.price;
      const change = newPrice - oldPrice;
      const changePercent = oldPrice > 0 ? ((change / oldPrice) * 100).toFixed(2) : 0;

      return {
        oldPrice,
        newPrice,
        change,
        changePercent,
        days,
        oldDate: oldestInPeriod.timestamp?.toDate ? oldestInPeriod.timestamp.toDate() : new Date(oldestInPeriod.timestamp),
        newDate: newestPrice.timestamp?.toDate ? newestPrice.timestamp.toDate() : new Date(newestPrice.timestamp)
      };
    } catch (error) {
      console.error('Error calculating price change:', error);
      return null;
    }
  }

  /**
   * Get price changes for multiple periods
   */
  async getMultiplePeriodChanges(investmentId) {
    try {
      const changes = {
        last3Days: await this.getPriceChangeOverPeriod(investmentId, 3),
        lastWeek: await this.getPriceChangeOverPeriod(investmentId, 7),
        lastMonth: await this.getPriceChangeOverPeriod(investmentId, 30),
        last3Months: await this.getPriceChangeOverPeriod(investmentId, 90),
        lastYear: await this.getPriceChangeOverPeriod(investmentId, 365)
      };

      return changes;
    } catch (error) {
      console.error('Error getting multiple period changes:', error);
      return {};
    }
  }

  /**
   * Get average price over a period
   */
  async getAveragePriceOverPeriod(investmentId, days) {
    try {
      const history = await this.getPriceHistory(investmentId, 1000);
      
      if (history.length === 0) return null;

      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const pricesInPeriod = history.filter(h => {
        const timestamp = h.timestamp?.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
        return timestamp >= periodStart;
      });

      if (pricesInPeriod.length === 0) return null;

      const sum = pricesInPeriod.reduce((acc, h) => acc + h.price, 0);
      const average = sum / pricesInPeriod.length;

      return {
        average: average.toFixed(2),
        min: Math.min(...pricesInPeriod.map(h => h.price)).toFixed(2),
        max: Math.max(...pricesInPeriod.map(h => h.price)).toFixed(2),
        count: pricesInPeriod.length,
        days
      };
    } catch (error) {
      console.error('Error calculating average price:', error);
      return null;
    }
  }

  /**
   * Get price volatility (standard deviation)
   */
  async getPriceVolatility(investmentId, days) {
    try {
      const history = await this.getPriceHistory(investmentId, 1000);
      
      if (history.length < 2) return null;

      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const pricesInPeriod = history.filter(h => {
        const timestamp = h.timestamp?.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
        return timestamp >= periodStart;
      });

      if (pricesInPeriod.length < 2) return null;

      const prices = pricesInPeriod.map(h => h.price);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const volatility = ((stdDev / mean) * 100).toFixed(2);

      return {
        volatility,
        stdDev: stdDev.toFixed(2),
        mean: mean.toFixed(2),
        days
      };
    } catch (error) {
      console.error('Error calculating volatility:', error);
      return null;
    }
  }

  /**
   * Delete old price history (keep only last N records)
   */
  async cleanupOldHistory(investmentId, keepRecords = 365) {
    try {
      const history = await this.getPriceHistory(investmentId, 10000);
      
      if (history.length <= keepRecords) return { deleted: 0 };

      const toDelete = history.slice(keepRecords);
      let deleted = 0;

      for (const record of toDelete) {
        await firestoreService.delete(this.collectionName, record.id);
        deleted++;
      }

      return { deleted };
    } catch (error) {
      console.error('Error cleaning up history:', error);
      return { deleted: 0, error: error.message };
    }
  }
}

const investmentHistoryService = new InvestmentHistoryService();
export default investmentHistoryService;
