// Trip Budget Planning Service
// Provides budget estimation, category-wise tracking, and real-time monitoring

import tripGroupsService from './trip-groups-service.js';

class TripBudgetService {
  constructor() {
    // Default budget templates based on trip type
    this.budgetTemplates = {
      domestic_short: {
        name: 'Domestic Short Trip (2-3 days)',
        categories: {
          'Accommodation': 30,
          'Transport': 25,
          'Food & Dining': 25,
          'Activities': 10,
          'Shopping': 5,
          'Other': 5
        }
      },
      domestic_long: {
        name: 'Domestic Long Trip (1 week+)',
        categories: {
          'Accommodation': 35,
          'Transport': 20,
          'Food & Dining': 25,
          'Activities': 10,
          'Shopping': 5,
          'Other': 5
        }
      },
      international: {
        name: 'International Trip',
        categories: {
          'Accommodation': 30,
          'Transport': 25,
          'Food & Dining': 20,
          'Activities': 15,
          'Shopping': 5,
          'Other': 5
        }
      },
      adventure: {
        name: 'Adventure Trip',
        categories: {
          'Accommodation': 25,
          'Transport': 20,
          'Food & Dining': 20,
          'Activities': 25,
          'Shopping': 5,
          'Other': 5
        }
      },
      business: {
        name: 'Business Trip',
        categories: {
          'Accommodation': 40,
          'Transport': 30,
          'Food & Dining': 20,
          'Activities': 5,
          'Shopping': 0,
          'Other': 5
        }
      }
    };

    // Per-person daily estimates (in INR)
    this.dailyEstimates = {
      budget: { accommodation: 1500, food: 500, transport: 300, activities: 200 },
      moderate: { accommodation: 3500, food: 1000, transport: 600, activities: 500 },
      luxury: { accommodation: 8000, food: 2500, transport: 1500, activities: 1500 }
    };
  }

  /**
   * Estimate trip budget based on parameters
   * @param {Object} params - Trip parameters
   * @returns {Object} - Budget estimation
   */
  estimateBudget(params) {
    const {
      destination = 'domestic',
      duration = 3,
      memberCount = 2,
      budgetLevel = 'moderate',
      includeActivities = true,
      includeShopping = true
    } = params;

    const dailyRates = this.dailyEstimates[budgetLevel] || this.dailyEstimates.moderate;
    
    // Calculate base daily cost per person
    let dailyPerPerson = dailyRates.accommodation + dailyRates.food + dailyRates.transport;
    
    if (includeActivities) {
      dailyPerPerson += dailyRates.activities;
    }

    // Adjust for international trips
    const multiplier = destination === 'international' ? 3 : 1;
    dailyPerPerson *= multiplier;

    // Calculate totals
    const totalPerPerson = dailyPerPerson * duration;
    const totalBudget = totalPerPerson * memberCount;

    // Add shopping buffer
    const shoppingBuffer = includeShopping ? totalBudget * 0.1 : 0;
    const contingency = totalBudget * 0.1;

    const finalBudget = Math.round(totalBudget + shoppingBuffer + contingency);

    // Category breakdown
    const template = destination === 'international' 
      ? this.budgetTemplates.international 
      : this.budgetTemplates.domestic_short;

    const categoryBudgets = {};
    Object.entries(template.categories).forEach(([category, percentage]) => {
      categoryBudgets[category] = Math.round(finalBudget * (percentage / 100));
    });

    return {
      totalBudget: finalBudget,
      perPerson: Math.round(finalBudget / memberCount),
      perDay: Math.round(finalBudget / duration),
      perPersonPerDay: Math.round(finalBudget / memberCount / duration),
      categoryBudgets,
      breakdown: {
        accommodation: Math.round(dailyRates.accommodation * duration * memberCount * multiplier),
        food: Math.round(dailyRates.food * duration * memberCount * multiplier),
        transport: Math.round(dailyRates.transport * duration * memberCount * multiplier),
        activities: includeActivities ? Math.round(dailyRates.activities * duration * memberCount * multiplier) : 0,
        shopping: Math.round(shoppingBuffer),
        contingency: Math.round(contingency)
      },
      params: { destination, duration, memberCount, budgetLevel }
    };
  }

  /**
   * Get budget templates
   * @returns {Object} - Available budget templates
   */
  getBudgetTemplates() {
    return this.budgetTemplates;
  }

  /**
   * Apply budget template to a trip
   * @param {string} groupId - Trip group ID
   * @param {string} templateKey - Template key
   * @param {number} totalBudget - Total budget amount
   * @returns {Promise<Object>} - Result
   */
  async applyBudgetTemplate(groupId, templateKey, totalBudget) {
    try {
      const template = this.budgetTemplates[templateKey];
      if (!template) {
        return { success: false, error: 'Invalid template' };
      }

      const categoryBudgets = {};
      Object.entries(template.categories).forEach(([category, percentage]) => {
        categoryBudgets[category] = Math.round(totalBudget * (percentage / 100));
      });

      const result = await tripGroupsService.setBudget(groupId, {
        total: totalBudget,
        categories: categoryBudgets
      });

      return result;
    } catch (error) {
      console.error('Error applying budget template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get real-time budget tracking for a trip
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Object>} - Budget tracking data
   */
  async getBudgetTracking(groupId) {
    try {
      const [budgetStatus, group, expenses] = await Promise.all([
        tripGroupsService.getBudgetStatus(groupId),
        tripGroupsService.getGroup(groupId),
        tripGroupsService.getGroupExpenses(groupId)
      ]);

      if (!budgetStatus.success) {
        return { success: false, error: budgetStatus.error };
      }

      const data = budgetStatus.data;
      const groupData = group.data;

      // Calculate daily spending rate
      let dailyRate = 0;
      let daysElapsed = 0;
      let daysRemaining = 0;

      if (groupData.startDate) {
        try {
          const startDate = groupData.startDate.toDate ? groupData.startDate.toDate() : new Date(groupData.startDate);
          const endDate = groupData.endDate 
            ? (groupData.endDate.toDate ? groupData.endDate.toDate() : new Date(groupData.endDate))
            : new Date();
          const now = new Date();

          // Validate dates
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
            daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
          }
        } catch (error) {
          console.warn('Failed to calculate trip dates:', error);
        }
      }        dailyRate = data.spent / daysElapsed;
      }

      // Project final spending
      const projectedTotal = daysRemaining > 0 
        ? data.spent + (dailyRate * daysRemaining)
        : data.spent;

      // Calculate category progress
      const categoryProgress = {};
      Object.entries(data.categoryBudgets || {}).forEach(([category, budget]) => {
        const spent = data.spentByCategory[category] || 0;
        categoryProgress[category] = {
          budget,
          spent,
          remaining: budget - spent,
          progress: budget > 0 ? (spent / budget) * 100 : 0,
          status: spent > budget ? 'over' : spent > budget * 0.8 ? 'warning' : 'ok'
        };
      });

      // Add categories without budget
      Object.entries(data.spentByCategory || {}).forEach(([category, spent]) => {
        if (!categoryProgress[category]) {
          categoryProgress[category] = {
            budget: 0,
            spent,
            remaining: -spent,
            progress: 100,
            status: 'unbudgeted'
          };
        }
      });

      return {
        success: true,
        data: {
          ...data,
          dailyRate: Math.round(dailyRate),
          daysElapsed,
          daysRemaining,
          projectedTotal: Math.round(projectedTotal),
          projectedOverUnder: Math.round(projectedTotal - data.budget),
          categoryProgress,
          healthScore: this.calculateBudgetHealthScore(data, projectedTotal)
        }
      };
    } catch (error) {
      console.error('Error getting budget tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate budget health score (0-100)
   * @param {Object} budgetData - Budget data
   * @param {number} projectedTotal - Projected total spending
   * @returns {number} - Health score
   */
  calculateBudgetHealthScore(budgetData, projectedTotal) {
    if (!budgetData.budget || budgetData.budget === 0) return 100;

    const projectedProgress = (projectedTotal / budgetData.budget) * 100;
    
    if (projectedProgress <= 80) return 100;
    if (projectedProgress <= 90) return 80;
    if (projectedProgress <= 100) return 60;
    if (projectedProgress <= 110) return 40;
    if (projectedProgress <= 120) return 20;
    return 0;
  }

  /**
   * Get spending insights for a trip
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Object>} - Spending insights
   */
  async getSpendingInsights(groupId) {
    try {
      const [expenses, members, group] = await Promise.all([
        tripGroupsService.getGroupExpenses(groupId),
        tripGroupsService.getGroupMembers(groupId),
        tripGroupsService.getGroup(groupId)
      ]);

      if (expenses.length === 0) {
        return { success: true, data: { hasData: false } };
      }

      // Calculate insights
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const avgExpense = totalSpent / expenses.length;

      // Find biggest expense
      const biggestExpense = expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0]);

      // Category breakdown
      const categoryTotals = {};
      expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      });

      const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

      // Spending by member
      const memberSpending = {};
      members.forEach(m => memberSpending[m.id] = { name: m.name, paid: 0, share: 0 });

      expenses.forEach(e => {
        if (memberSpending[e.paidBy]) {
          memberSpending[e.paidBy].paid += e.amount;
        }
        e.splits?.forEach(s => {
          if (memberSpending[s.memberId]) {
            memberSpending[s.memberId].share += s.amount;
          }
        });
      });

      const topSpender = Object.values(memberSpending)
        .sort((a, b) => b.paid - a.paid)[0];

      // Daily spending trend
      const dailySpending = {};
      expenses.forEach(e => {
        let dateKey = 'unknown';
        if (e.date) {
          try {
            const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
            if (!isNaN(date.getTime())) {
              dateKey = date.toISOString().split('T')[0];
            }
          } catch (error) {
            console.warn('Failed to parse expense date for daily spending:', error);
          }
        }
        dailySpending[dateKey] = (dailySpending[dateKey] || 0) + e.amount;
      });

      return {
        success: true,
        data: {
          hasData: true,
          totalSpent,
          expenseCount: expenses.length,
          avgExpense: Math.round(avgExpense),
          biggestExpense: {
            description: biggestExpense.description,
            amount: biggestExpense.amount,
            category: biggestExpense.category
          },
          topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
          topSpender: topSpender ? { name: topSpender.name, amount: topSpender.paid } : null,
          perPerson: Math.round(totalSpent / members.length),
          categoryBreakdown: Object.entries(categoryTotals)
            .map(([name, amount]) => ({ name, amount, percentage: Math.round((amount / totalSpent) * 100) }))
            .sort((a, b) => b.amount - a.amount),
          memberSpending: Object.values(memberSpending),
          dailySpending: Object.entries(dailySpending)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))
        }
      };
    } catch (error) {
      console.error('Error getting spending insights:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate post-trip expense summary
   * @param {string} groupId - Trip group ID
   * @returns {Promise<Object>} - Trip summary
   */
  async generateTripSummary(groupId) {
    try {
      const [group, expenses, members, settlements, budgetTracking] = await Promise.all([
        tripGroupsService.getGroup(groupId),
        tripGroupsService.getGroupExpenses(groupId),
        tripGroupsService.getGroupMembers(groupId),
        tripGroupsService.getSettlements(groupId),
        this.getBudgetTracking(groupId)
      ]);

      const groupData = group.data;
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);

      // Calculate trip duration
      let duration = 0;
      if (groupData.startDate && groupData.endDate) {
        try {
          const start = groupData.startDate.toDate ? groupData.startDate.toDate() : new Date(groupData.startDate);
          const end = groupData.endDate.toDate ? groupData.endDate.toDate() : new Date(groupData.endDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          }
        } catch (error) {
          console.warn('Failed to calculate trip duration:', error);
        }
      }

      return {
        success: true,
        data: {
          tripName: groupData.name,
          destination: groupData.destination,
          duration,
          memberCount: members.length,
          totalExpenses: totalSpent,
          expenseCount: expenses.length,
          budget: groupData.budget?.total || 0,
          budgetVariance: groupData.budget?.total ? totalSpent - groupData.budget.total : 0,
          perPerson: Math.round(totalSpent / members.length),
          perDay: duration > 0 ? Math.round(totalSpent / duration) : totalSpent,
          perPersonPerDay: duration > 0 && members.length > 0 
            ? Math.round(totalSpent / duration / members.length) 
            : 0,
          settlementCount: settlements.length,
          totalSettled,
          categoryBreakdown: budgetTracking.success ? budgetTracking.data.categoryProgress : {},
          isFullySettled: Math.abs(totalSpent - totalSettled) < 1
        }
      };
    } catch (error) {
      console.error('Error generating trip summary:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const tripBudgetService = new TripBudgetService();
export default tripBudgetService;
