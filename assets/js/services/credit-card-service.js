// Credit Card Service - Manages credit card tracking and utilization
import { db } from '../config/firebase-config.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import firestoreService from './firestore-service.js';

class CreditCardService {
  constructor() {
    this.collectionName = 'creditCards';
  }

  /**
   * Get user ID
   */
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * Get all credit cards for current user
   */
  async getCreditCards() {
    try {
      const userId = this.getUserId();
      const allCards = await firestoreService.getAll(this.collectionName);
      
      // Filter by userId
      const cards = allCards.filter(card => card.userId === userId);
      
      // Sort by createdAt
      cards.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return aTime - bTime;
      });
      
      return cards;
    } catch (error) {
      console.error('Error getting credit cards:', error);
      return [];
    }
  }

  /**
   * Get credit card by ID
   */
  async getCreditCard(cardId) {
    try {
      const result = await firestoreService.get(this.collectionName, cardId);
      return result;
    } catch (error) {
      console.error('Error getting credit card:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get credit card by payment method ID
   */
  async getCreditCardByPaymentMethodId(paymentMethodId) {
    try {
      const userId = this.getUserId();
      const allCards = await firestoreService.getAll(this.collectionName);
      
      const card = allCards.find(c => 
        c.userId === userId && c.paymentMethodId === paymentMethodId
      );
      
      return card || null;
    } catch (error) {
      console.error('Error getting credit card by payment method ID:', error);
      return null;
    }
  }

  /**
   * Update credit card balance when an expense is created
   * This is called when an expense is created with a credit card payment method
   */
  async updateCardBalanceOnExpense(paymentMethodId, expenseAmount) {
    try {
      if (!paymentMethodId) {
        return { success: true };
      }

      // Get the credit card linked to this payment method
      const card = await this.getCreditCardByPaymentMethodId(paymentMethodId);
      
      if (!card) {
        return { success: true };
      }

      // Update the card's current balance
      const newBalance = (card.currentBalance || 0) + expenseAmount;
      
      const result = await firestoreService.update(this.collectionName, card.id, {
        currentBalance: newBalance,
        updatedAt: Timestamp.now()
      });

      return result;
    } catch (error) {
      console.error('Error updating card balance on expense:', error);
      // Don't throw error - expense was already created successfully
      return { success: false, error: error.message };
    }
  }

  /**
   * Update credit card balance when an expense is deleted
   */
  async updateCardBalanceOnExpenseDelete(paymentMethodId, expenseAmount) {
    try {
      if (!paymentMethodId) {
        return { success: true };
      }

      // Get the credit card linked to this payment method
      const card = await this.getCreditCardByPaymentMethodId(paymentMethodId);
      
      if (!card) {
        return { success: true };
      }

      // Reduce the card's current balance
      const newBalance = Math.max(0, (card.currentBalance || 0) - expenseAmount);
      
      const result = await firestoreService.update(this.collectionName, card.id, {
        currentBalance: newBalance,
        updatedAt: Timestamp.now()
      });

      return result;
    } catch (error) {
      console.error('Error updating card balance on expense delete:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate credit utilization percentage
   */
  calculateUtilization(currentBalance, creditLimit) {
    if (!creditLimit || creditLimit === 0) return 0;
    return Math.round((currentBalance / creditLimit) * 100);
  }

  /**
   * Get available credit
   */
  getAvailableCredit(currentBalance, creditLimit) {
    return Math.max(0, creditLimit - currentBalance);
  }

  /**
   * Check if utilization is high (> 70%)
   */
  isHighUtilization(currentBalance, creditLimit) {
    const utilization = this.calculateUtilization(currentBalance, creditLimit);
    return utilization > 70;
  }

  /**
   * Get credit card summary
   */
  async getCreditCardSummary() {
    try {
      const cards = await this.getCreditCards();
      
      const summary = {
        totalCards: cards.length,
        totalLimit: 0,
        totalSpent: 0,
        totalAvailable: 0,
        totalRewards: 0,
        highUtilizationCards: [],
        averageUtilization: 0
      };

      let totalUtilization = 0;

      cards.forEach(card => {
        summary.totalLimit += card.creditLimit || 0;
        summary.totalSpent += card.currentBalance || 0;
        summary.totalRewards += card.rewardsBalance || 0;

        const utilization = this.calculateUtilization(card.currentBalance, card.creditLimit);
        totalUtilization += utilization;

        if (this.isHighUtilization(card.currentBalance, card.creditLimit)) {
          summary.highUtilizationCards.push({
            id: card.id,
            cardName: card.cardName,
            utilization: utilization,
            currentBalance: card.currentBalance,
            creditLimit: card.creditLimit
          });
        }
      });

      summary.totalAvailable = summary.totalLimit - summary.totalSpent;
      summary.averageUtilization = cards.length > 0 ? Math.round(totalUtilization / cards.length) : 0;

      return summary;
    } catch (error) {
      console.error('Error getting credit card summary:', error);
      return {
        totalCards: 0,
        totalLimit: 0,
        totalSpent: 0,
        totalAvailable: 0,
        totalRewards: 0,
        highUtilizationCards: [],
        averageUtilization: 0
      };
    }
  }

  /**
   * Add a new credit card
   */
  async addCreditCard(cardData) {
    try {
      const userId = this.getUserId();
      
      const data = {
        ...cardData,
        userId,
        currentBalance: cardData.currentBalance || 0,
        rewardsBalance: cardData.rewardsBalance || 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const result = await firestoreService.add(this.collectionName, data);
      return result;
    } catch (error) {
      console.error('Error adding credit card:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a credit card
   */
  async updateCreditCard(cardId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      const result = await firestoreService.update(this.collectionName, cardId, updateData);
      return result;
    } catch (error) {
      console.error('Error updating credit card:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a credit card
   */
  async deleteCreditCard(cardId) {
    try {
      const result = await firestoreService.delete(this.collectionName, cardId);
      return result;
    } catch (error) {
      console.error('Error deleting credit card:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Make a payment on a credit card (reduce balance)
   */
  async makePayment(cardId, paymentAmount) {
    try {
      const card = await this.getCreditCard(cardId);
      
      if (!card.success) {
        return { success: false, error: 'Credit card not found' };
      }

      const newBalance = Math.max(0, (card.data.currentBalance || 0) - paymentAmount);
      
      const result = await this.updateCreditCard(cardId, {
        currentBalance: newBalance
      });

      return result;
    } catch (error) {
      console.error('Error making payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add rewards to a credit card
   */
  async addRewards(cardId, rewardAmount) {
    try {
      const card = await this.getCreditCard(cardId);
      
      if (!card.success) {
        return { success: false, error: 'Credit card not found' };
      }

      const newRewardsBalance = (card.data.rewardsBalance || 0) + rewardAmount;
      
      const result = await this.updateCreditCard(cardId, {
        rewardsBalance: newRewardsBalance
      });

      return result;
    } catch (error) {
      console.error('Error adding rewards:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const creditCardService = new CreditCardService();
export default creditCardService;
