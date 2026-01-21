// Trip Settlement Service
// Provides automatic settlement calculation, optimization, and tracking

import tripGroupsService from './trip-groups-service.js';

class TripSettlementService {
  constructor() {
    this.settlementMethods = ['cash', 'upi', 'bank_transfer', 'other'];
  }

  /**
   * Calculate optimized settlements to minimize transactions
   * Uses a greedy algorithm to simplify debts
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Array>} - Optimized settlement transactions
   */
  async calculateOptimizedSettlements(groupId) {
    try {
      // Get current balances
      const balances = await tripGroupsService.calculateBalances(groupId);
      const members = await tripGroupsService.getGroupMembers(groupId);
      
      // Create member lookup
      const memberLookup = {};
      members.forEach(m => memberLookup[m.id] = m);

      // Separate creditors (positive balance) and debtors (negative balance)
      const creditors = [];
      const debtors = [];

      Object.entries(balances).forEach(([memberId, balance]) => {
        if (balance > 0.01) {
          creditors.push({ memberId, amount: balance, name: memberLookup[memberId]?.name || 'Unknown' });
        } else if (balance < -0.01) {
          debtors.push({ memberId, amount: Math.abs(balance), name: memberLookup[memberId]?.name || 'Unknown' });
        }
      });

      // Sort by amount (descending) for optimal matching
      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      const settlements = [];

      // Match debtors with creditors
      while (debtors.length > 0 && creditors.length > 0) {
        const debtor = debtors[0];
        const creditor = creditors[0];

        const settlementAmount = Math.min(debtor.amount, creditor.amount);

        if (settlementAmount > 0.01) {
          settlements.push({
            fromMemberId: debtor.memberId,
            fromName: debtor.name,
            toMemberId: creditor.memberId,
            toName: creditor.name,
            amount: Math.round(settlementAmount * 100) / 100
          });
        }

        // Update remaining amounts
        debtor.amount -= settlementAmount;
        creditor.amount -= settlementAmount;

        // Remove settled parties
        if (debtor.amount < 0.01) debtors.shift();
        if (creditor.amount < 0.01) creditors.shift();
      }

      return settlements;
    } catch (error) {
      console.error('Error calculating optimized settlements:', error);
      return [];
    }
  }

  /**
   * Get settlement summary for a trip
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Object>} - Settlement summary
   */
  async getSettlementSummary(groupId) {
    try {
      const [balances, settlements, members, expenses] = await Promise.all([
        tripGroupsService.calculateBalances(groupId),
        tripGroupsService.getSettlements(groupId),
        tripGroupsService.getGroupMembers(groupId),
        tripGroupsService.getGroupExpenses(groupId)
      ]);

      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Calculate total settled
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);

      // Calculate remaining to settle
      let totalOwed = 0;
      Object.values(balances).forEach(balance => {
        if (balance < 0) totalOwed += Math.abs(balance);
      });

      // Get optimized settlements
      const pendingSettlements = await this.calculateOptimizedSettlements(groupId);

      // Count settled vs unsettled members
      let settledMembers = 0;
      let unsettledMembers = 0;
      Object.values(balances).forEach(balance => {
        if (Math.abs(balance) < 0.01) {
          settledMembers++;
        } else {
          unsettledMembers++;
        }
      });

      return {
        totalExpenses,
        totalSettled,
        totalOwed,
        pendingSettlements,
        settlementCount: settlements.length,
        memberCount: members.length,
        settledMembers,
        unsettledMembers,
        isFullySettled: totalOwed < 0.01,
        perPersonAverage: members.length > 0 ? totalExpenses / members.length : 0
      };
    } catch (error) {
      console.error('Error getting settlement summary:', error);
      return null;
    }
  }

  /**
   * Record a settlement with additional metadata
   * @param {string} groupId - Trip group ID
   * @param {Object} settlementData - Settlement details
   * @returns {Promise<Object>} - Result
   */
  async recordSettlementWithDetails(groupId, settlementData) {
    try {
      const result = await tripGroupsService.recordSettlement(groupId, {
        ...settlementData,
        method: settlementData.method || 'cash',
        notes: settlementData.notes || '',
        reference: settlementData.reference || null
      });

      return result;
    } catch (error) {
      console.error('Error recording settlement:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get settlement history with member details
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Array>} - Settlement history
   */
  async getSettlementHistory(groupId) {
    try {
      const [settlements, members] = await Promise.all([
        tripGroupsService.getSettlements(groupId),
        tripGroupsService.getGroupMembers(groupId)
      ]);

      const memberLookup = {};
      members.forEach(m => memberLookup[m.id] = m);

      return settlements.map(s => {
        let formattedDate = 'Unknown';
        if (s.date) {
          try {
            const date = s.date.toDate ? s.date.toDate() : new Date(s.date);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString('en-IN');
            }
          } catch (error) {
            console.warn('Failed to format settlement date:', error);
          }
        }
        
        return {
          ...s,
          fromMember: memberLookup[s.fromMemberId] || { name: 'Unknown' },
          toMember: memberLookup[s.toMemberId] || { name: 'Unknown' },
          formattedDate
        };
      });
    } catch (error) {
      console.error('Error getting settlement history:', error);
      return [];
    }
  }
   * Generate settlement reminders for pending settlements
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Array>} - List of reminders
   */
  async generateSettlementReminders(groupId) {
    try {
      const pendingSettlements = await this.calculateOptimizedSettlements(groupId);
      
      return pendingSettlements.map(s => ({
        type: 'settlement_reminder',
        fromName: s.fromName,
        toName: s.toName,
        amount: s.amount,
        message: `${s.fromName} owes ₹${s.amount.toLocaleString('en-IN')} to ${s.toName}`
      }));
    } catch (error) {
      console.error('Error generating settlement reminders:', error);
      return [];
    }
  }
}

// Export singleton instance
const tripSettlementService = new TripSettlementService();
export default tripSettlementService;
