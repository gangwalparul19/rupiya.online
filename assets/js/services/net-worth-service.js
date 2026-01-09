// Net Worth Service - Calculates and tracks net worth over time
// Aggregates: Investments, Loans, Houses, Vehicles, Cash/Bank accounts
import firestoreService from './firestore-service.js';
import authService from './auth-service.js';
import transfersService from './transfers-service.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class NetWorthService {
  constructor() {
    this.snapshotsCollection = 'netWorthSnapshots';
  }

  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * Calculate current net worth from all sources
   */
  async calculateNetWorth() {
    try {
      const userId = this.getUserId();
      
      // Fetch all asset and liability data in parallel
      const [investments, loans, houses, vehicles, goals] = await Promise.all([
        firestoreService.getAll('investments'),
        firestoreService.getAll('loans'),
        firestoreService.getAll('houses'),
        firestoreService.getAll('vehicles'),
        firestoreService.getAll('goals')
      ]);
      
      // Filter by userId
      const userInvestments = investments.filter(i => i.userId === userId);
      const userLoans = loans.filter(l => l.userId === userId);
      const userHouses = houses.filter(h => h.userId === userId);
      const userVehicles = vehicles.filter(v => v.userId === userId);
      const userGoals = goals.filter(g => g.userId === userId);
      
      // Calculate Assets
      const assets = {
        investments: this._calculateInvestmentsValue(userInvestments),
        realEstate: this._calculateRealEstateValue(userHouses),
        vehicles: this._calculateVehiclesValue(userVehicles),
        savings: this._calculateSavingsValue(userGoals),
        other: 0
      };
      
      // Calculate Liabilities
      const liabilities = {
        loans: this._calculateLoansOutstanding(userLoans),
        creditCards: 0,
        other: 0
      };
      
      // Calculate totals
      const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
      const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
      const netWorth = totalAssets - totalLiabilities;
      
      // Get detailed breakdowns
      const investmentBreakdown = this._getInvestmentBreakdown(userInvestments);
      const loanBreakdown = this._getLoanBreakdown(userLoans);
      const realEstateBreakdown = this._getRealEstateBreakdown(userHouses);
      
      return {
        date: new Date(),
        assets,
        liabilities,
        totalAssets,
        totalLiabilities,
        netWorth,
        breakdown: {
          investments: investmentBreakdown,
          loans: loanBreakdown,
          realEstate: realEstateBreakdown
        }
      };
    } catch (error) {
      console.error('[NetWorthService] Error calculating net worth:', error);
      throw error;
    }
  }

  /**
   * Calculate total investment value
   */
  _calculateInvestmentsValue(investments) {
    return investments.reduce((total, inv) => {
      const quantity = parseFloat(inv.quantity) || 0;
      const currentPrice = parseFloat(inv.currentPrice) || parseFloat(inv.purchasePrice) || 0;
      return total + (quantity * currentPrice);
    }, 0);
  }

  /**
   * Calculate real estate value
   */
  _calculateRealEstateValue(houses) {
    return houses.reduce((total, house) => {
      return total + (parseFloat(house.currentValue) || parseFloat(house.purchasePrice) || 0);
    }, 0);
  }

  /**
   * Calculate vehicles value (depreciating asset)
   */
  _calculateVehiclesValue(vehicles) {
    return vehicles.reduce((total, vehicle) => {
      // Use current value if available, otherwise estimate depreciation
      if (vehicle.currentValue) {
        return total + parseFloat(vehicle.currentValue);
      }
      
      const purchasePrice = parseFloat(vehicle.purchasePrice) || 0;
      const purchaseDate = vehicle.purchaseDate?.toDate ? vehicle.purchaseDate.toDate() : new Date(vehicle.purchaseDate);
      const yearsOwned = (new Date() - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);
      
      // Simple depreciation: 15% per year
      const depreciationRate = 0.15;
      const currentValue = purchasePrice * Math.pow(1 - depreciationRate, yearsOwned);
      
      return total + Math.max(currentValue, 0);
    }, 0);
  }

  /**
   * Calculate savings from goals
   */
  _calculateSavingsValue(goals) {
    return goals.reduce((total, goal) => {
      return total + (parseFloat(goal.currentAmount) || 0);
    }, 0);
  }

  /**
   * Calculate outstanding loan amount
   */
  _calculateLoansOutstanding(loans) {
    return loans.reduce((total, loan) => {
      // Use outstanding amount if available
      if (loan.outstandingAmount !== undefined) {
        return total + parseFloat(loan.outstandingAmount);
      }
      
      // Otherwise calculate from principal and payments
      const principal = parseFloat(loan.principalAmount) || parseFloat(loan.amount) || 0;
      const paidPrincipal = parseFloat(loan.paidPrincipal) || 0;
      
      return total + (principal - paidPrincipal);
    }, 0);
  }

  /**
   * Get investment breakdown by type
   */
  _getInvestmentBreakdown(investments) {
    const breakdown = {};
    
    investments.forEach(inv => {
      const type = inv.type || 'Other';
      const value = (parseFloat(inv.quantity) || 0) * (parseFloat(inv.currentPrice) || parseFloat(inv.purchasePrice) || 0);
      const invested = (parseFloat(inv.quantity) || 0) * (parseFloat(inv.purchasePrice) || 0);
      
      if (!breakdown[type]) {
        breakdown[type] = { value: 0, invested: 0, count: 0, items: [] };
      }
      
      breakdown[type].value += value;
      breakdown[type].invested += invested;
      breakdown[type].count += 1;
      breakdown[type].items.push({
        id: inv.id,
        name: inv.name,
        symbol: inv.symbol,
        value,
        invested,
        gainLoss: value - invested,
        gainLossPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0
      });
    });
    
    return breakdown;
  }

  /**
   * Get loan breakdown by type
   */
  _getLoanBreakdown(loans) {
    const breakdown = {};
    
    loans.forEach(loan => {
      const type = loan.type || 'other';
      const outstanding = loan.outstandingAmount !== undefined 
        ? parseFloat(loan.outstandingAmount)
        : (parseFloat(loan.principalAmount) || parseFloat(loan.amount) || 0) - (parseFloat(loan.paidPrincipal) || 0);
      const original = parseFloat(loan.principalAmount) || parseFloat(loan.amount) || 0;
      
      if (!breakdown[type]) {
        breakdown[type] = { outstanding: 0, original: 0, count: 0, items: [] };
      }
      
      breakdown[type].outstanding += outstanding;
      breakdown[type].original += original;
      breakdown[type].count += 1;
      breakdown[type].items.push({
        id: loan.id,
        name: loan.name || loan.lender,
        outstanding,
        original,
        paidPercent: original > 0 ? ((original - outstanding) / original) * 100 : 0,
        emi: parseFloat(loan.emiAmount) || 0
      });
    });
    
    return breakdown;
  }

  /**
   * Get real estate breakdown
   */
  _getRealEstateBreakdown(houses) {
    return houses.map(house => ({
      id: house.id,
      name: house.name || house.address,
      currentValue: parseFloat(house.currentValue) || parseFloat(house.purchasePrice) || 0,
      purchasePrice: parseFloat(house.purchasePrice) || 0,
      appreciation: (parseFloat(house.currentValue) || 0) - (parseFloat(house.purchasePrice) || 0)
    }));
  }

  /**
   * Save a net worth snapshot
   */
  async saveSnapshot(netWorthData = null) {
    try {
      const userId = this.getUserId();
      const data = netWorthData || await this.calculateNetWorth();
      
      const snapshot = {
        userId,
        date: Timestamp.fromDate(data.date || new Date()),
        assets: data.assets,
        liabilities: data.liabilities,
        totalAssets: data.totalAssets,
        totalLiabilities: data.totalLiabilities,
        netWorth: data.netWorth,
        createdAt: Timestamp.now()
      };
      
      const result = await firestoreService.add(this.snapshotsCollection, snapshot);
      return { id: result.id, ...snapshot };
    } catch (error) {
      console.error('[NetWorthService] Error saving snapshot:', error);
      throw error;
    }
  }

  /**
   * Get net worth history (snapshots)
   */
  async getHistory(limit = 12) {
    try {
      const userId = this.getUserId();
      const allSnapshots = await firestoreService.getAll(this.snapshotsCollection);
      
      const userSnapshots = allSnapshots
        .filter(s => s.userId === userId)
        .sort((a, b) => {
          const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          return bDate - aDate;
        })
        .slice(0, limit);
      
      return userSnapshots;
    } catch (error) {
      console.error('[NetWorthService] Error getting history:', error);
      throw error;
    }
  }

  /**
   * Get net worth change over a period
   */
  async getNetWorthChange(days = 30) {
    try {
      const history = await this.getHistory(60);
      const current = await this.calculateNetWorth();
      
      if (history.length === 0) {
        return {
          current: current.netWorth,
          previous: 0,
          change: current.netWorth,
          changePercent: 0
        };
      }
      
      // Find snapshot closest to 'days' ago
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      
      let closestSnapshot = history[history.length - 1];
      let closestDiff = Infinity;
      
      history.forEach(snapshot => {
        const snapshotDate = snapshot.date?.toDate ? snapshot.date.toDate() : new Date(snapshot.date);
        const diff = Math.abs(snapshotDate - targetDate);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestSnapshot = snapshot;
        }
      });
      
      const previousNetWorth = closestSnapshot.netWorth || 0;
      const change = current.netWorth - previousNetWorth;
      const changePercent = previousNetWorth !== 0 ? (change / Math.abs(previousNetWorth)) * 100 : 0;
      
      return {
        current: current.netWorth,
        previous: previousNetWorth,
        change,
        changePercent
      };
    } catch (error) {
      console.error('[NetWorthService] Error getting net worth change:', error);
      throw error;
    }
  }

  /**
   * Get monthly cash flow summary
   */
  async getMonthlyCashFlow(year, month) {
    try {
      const userId = this.getUserId();
      
      // Get income and expenses for the month
      const [allIncome, allExpenses] = await Promise.all([
        firestoreService.getAll('income'),
        firestoreService.getAll('expenses')
      ]);
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      
      const filterByMonth = (items) => items.filter(item => {
        if (item.userId !== userId) return false;
        const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
      
      const monthlyIncome = filterByMonth(allIncome);
      const monthlyExpenses = filterByMonth(allExpenses);
      
      // Get transfer summary
      const transferSummary = await transfersService.getMonthlySummary(year, month);
      
      // Calculate totals
      const totalIncome = monthlyIncome.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      
      // Available for savings = Income - Expenses
      const availableForSavings = totalIncome - totalExpenses;
      
      // Allocated to savings/investments
      const allocatedToSavings = transferSummary.totalInvestmentPurchases + 
                                  transferSummary.totalSavingsDeposits +
                                  transferSummary.totalPrincipalPaid; // Principal reduces liability
      
      // Interest is an expense (cost of borrowing)
      const loanInterestExpense = transferSummary.totalInterestPaid;
      
      // Investment gains/losses
      const investmentGainLoss = transferSummary.investmentGainLoss;
      
      return {
        income: totalIncome,
        expenses: totalExpenses,
        availableForSavings,
        allocatedToSavings,
        loanInterestExpense,
        investmentGainLoss,
        netSavings: availableForSavings - allocatedToSavings,
        transfers: transferSummary
      };
    } catch (error) {
      console.error('[NetWorthService] Error getting monthly cash flow:', error);
      throw error;
    }
  }

  /**
   * Get asset allocation percentages
   */
  async getAssetAllocation() {
    try {
      const netWorth = await this.calculateNetWorth();
      const total = netWorth.totalAssets;
      
      if (total === 0) {
        return {
          investments: 0,
          realEstate: 0,
          vehicles: 0,
          savings: 0,
          other: 0
        };
      }
      
      return {
        investments: (netWorth.assets.investments / total) * 100,
        realEstate: (netWorth.assets.realEstate / total) * 100,
        vehicles: (netWorth.assets.vehicles / total) * 100,
        savings: (netWorth.assets.savings / total) * 100,
        other: (netWorth.assets.other / total) * 100
      };
    } catch (error) {
      console.error('[NetWorthService] Error getting asset allocation:', error);
      throw error;
    }
  }

  /**
   * Get debt-to-asset ratio
   */
  async getDebtToAssetRatio() {
    try {
      const netWorth = await this.calculateNetWorth();
      
      if (netWorth.totalAssets === 0) return 0;
      
      return (netWorth.totalLiabilities / netWorth.totalAssets) * 100;
    } catch (error) {
      console.error('[NetWorthService] Error getting debt-to-asset ratio:', error);
      throw error;
    }
  }
}

const netWorthService = new NetWorthService();
export default netWorthService;
