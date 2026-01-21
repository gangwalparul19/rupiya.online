// Transfers Service - Handles money transfers between accounts
// Tracks: Investment purchases, Loan EMI payments, Account transfers, Savings allocations
import firestoreService from './firestore-service.js';
import authService from './auth-service.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class TransfersService {
  constructor() {
    this.collectionName = 'transfers';
    
    // Transfer types
    this.types = {
      INVESTMENT_PURCHASE: 'investment_purchase',
      INVESTMENT_SALE: 'investment_sale',
      LOAN_EMI: 'loan_emi',
      LOAN_DISBURSEMENT: 'loan_disbursement',
      LOAN_PREPAYMENT: 'loan_prepayment',
      ACCOUNT_TRANSFER: 'account_transfer',
      SAVINGS_DEPOSIT: 'savings_deposit',
      SAVINGS_WITHDRAWAL: 'savings_withdrawal',
      EMERGENCY_FUND: 'emergency_fund',
      OTHER: 'other'
    };
    
    // Transfer categories for display
    this.categories = {
      investment_purchase: { name: 'Investment Purchase', icon: '📈', color: '#4A90E2' },
      investment_sale: { name: 'Investment Sale', icon: '💰', color: '#27AE60' },
      loan_emi: { name: 'Loan EMI', icon: '🏦', color: '#E74C3C' },
      loan_disbursement: { name: 'Loan Received', icon: '💵', color: '#27AE60' },
      loan_prepayment: { name: 'Loan Prepayment', icon: '⚡', color: '#F39C12' },
      account_transfer: { name: 'Account Transfer', icon: '🔄', color: '#9B59B6' },
      savings_deposit: { name: 'Savings Deposit', icon: '🐷', color: '#27AE60' },
      savings_withdrawal: { name: 'Savings Withdrawal', icon: '💸', color: '#E74C3C' },
      emergency_fund: { name: 'Emergency Fund', icon: '🛡️', color: '#3498DB' },
      other: { name: 'Other Transfer', icon: '📋', color: '#7F8C8D' }
    };
    
    // Account types
    this.accountTypes = {
      BANK: 'bank',
      CASH: 'cash',
      WALLET: 'wallet',
      INVESTMENT: 'investment',
      LOAN: 'loan',
      SAVINGS: 'savings',
      CREDIT_CARD: 'credit_card',
      EMERGENCY_FUND: 'emergency_fund'
    };
  }

  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * Create a new transfer
   */
  async createTransfer(transferData) {
    try {
      const userId = this.getUserId();
      
      const transfer = {
        userId,
        type: transferData.type,
        fromAccount: transferData.fromAccount || null,
        fromAccountType: transferData.fromAccountType || null,
        toAccount: transferData.toAccount || null,
        toAccountType: transferData.toAccountType || null,
        amount: parseFloat(transferData.amount),
        date: transferData.date instanceof Date 
          ? Timestamp.fromDate(transferData.date) 
          : Timestamp.fromDate(new Date(transferData.date)),
        description: transferData.description || '',
        notes: transferData.notes || '',
        
        // For loan EMI - split principal and interest
        principalAmount: transferData.principalAmount ? parseFloat(transferData.principalAmount) : null,
        interestAmount: transferData.interestAmount ? parseFloat(transferData.interestAmount) : null,
        
        // For investment transactions
        investmentGainLoss: transferData.investmentGainLoss ? parseFloat(transferData.investmentGainLoss) : null,
        
        // Linked entities
        linkedType: transferData.linkedType || null, // 'investment', 'loan', 'goal'
        linkedId: transferData.linkedId || null,
        linkedName: transferData.linkedName || null,
        
        // Payment method used
        paymentMethod: transferData.paymentMethod || null,
        specificPaymentMethod: transferData.specificPaymentMethod || null,
        
        // Status
        status: transferData.status || 'completed',
        
        // Metadata
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const result = await firestoreService.add(this.collectionName, transfer);
      return { id: result.id, ...transfer };
    } catch (error) {
      console.error('[TransfersService] Error creating transfer:', error);
      throw error;
    }
  }

  /**
   * Get all transfers for current user
   */
  async getTransfers(filters = {}) {
    try {
      const userId = this.getUserId();
      const allTransfers = await firestoreService.getAll(this.collectionName);
      
      let transfers = allTransfers.filter(t => t.userId === userId);
      
      // Apply filters
      if (filters.type) {
        transfers = transfers.filter(t => t.type === filters.type);
      }
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        transfers = transfers.filter(t => {
          if (!t.date) return false;
          try {
            const tDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
            return !isNaN(tDate.getTime()) && tDate >= fromDate;
          } catch (error) {
            console.warn('Failed to parse transfer date:', error);
            return false;
          }
        });
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        transfers = transfers.filter(t => {
          if (!t.date) return false;
          try {
            const tDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
            return !isNaN(tDate.getTime()) && tDate <= toDate;
          } catch (error) {
            console.warn('Failed to parse transfer date:', error);
            return false;
          }
        });
      }
      
      if (filters.linkedType) {
        transfers = transfers.filter(t => t.linkedType === filters.linkedType);
      }
      
      if (filters.linkedId) {
        transfers = transfers.filter(t => t.linkedId === filters.linkedId);
      }
      
      // Sort by date descending
      transfers.sort((a, b) => {
        try {
          const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
          const bDate = b.date?.toDate ? b.date.toDate() : new Date(b.date);
          if (isNaN(aDate.getTime()) || isNaN(bDate.getTime())) return 0;
          return bDate - aDate;
        } catch (error) {
          console.warn('Failed to sort transfers by date:', error);
          return 0;
        }
      });
      
      return transfers;
    } catch (error) {
      console.error('[TransfersService] Error getting transfers:', error);
      throw error;
    }
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(id) {
    try {
      return await firestoreService.get(this.collectionName, id);
    } catch (error) {
      console.error('[TransfersService] Error getting transfer:', error);
      throw error;
    }
  }

  /**
   * Update a transfer
   */
  async updateTransfer(id, updateData) {
    try {
      const updates = {
        ...updateData,
        updatedAt: Timestamp.now()
      };
      
      if (updates.date && !(updates.date instanceof Timestamp)) {
        updates.date = updates.date instanceof Date 
          ? Timestamp.fromDate(updates.date) 
          : Timestamp.fromDate(new Date(updates.date));
      }
      
      if (updates.amount) updates.amount = parseFloat(updates.amount);
      if (updates.principalAmount) updates.principalAmount = parseFloat(updates.principalAmount);
      if (updates.interestAmount) updates.interestAmount = parseFloat(updates.interestAmount);
      if (updates.investmentGainLoss) updates.investmentGainLoss = parseFloat(updates.investmentGainLoss);
      
      await firestoreService.update(this.collectionName, id, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('[TransfersService] Error updating transfer:', error);
      throw error;
    }
  }

  /**
   * Delete a transfer
   */
  async deleteTransfer(id) {
    try {
      await firestoreService.delete(this.collectionName, id);
      return true;
    } catch (error) {
      console.error('[TransfersService] Error deleting transfer:', error);
      throw error;
    }
  }

  /**
   * Get monthly transfer summary
   */
  async getMonthlySummary(year, month) {
    try {
      const transfers = await this.getTransfers();
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      
      const monthlyTransfers = transfers.filter(t => {
        if (!t.date) return false;
        try {
          const tDate = t.date.toDate ? t.date.toDate() : new Date(t.date);
          return !isNaN(tDate.getTime()) && tDate >= startDate && tDate <= endDate;
        } catch (error) {
          console.warn('Failed to parse transfer date in monthly summary:', error);
          return false;
        }
      });
      
      const summary = {
        totalInvestmentPurchases: 0,
        totalInvestmentSales: 0,
        totalLoanEMI: 0,
        totalPrincipalPaid: 0,
        totalInterestPaid: 0,
        totalSavingsDeposits: 0,
        totalSavingsWithdrawals: 0,
        totalAccountTransfers: 0,
        investmentGainLoss: 0,
        count: monthlyTransfers.length
      };
      
      monthlyTransfers.forEach(t => {
        switch (t.type) {
          case this.types.INVESTMENT_PURCHASE:
            summary.totalInvestmentPurchases += t.amount || 0;
            break;
          case this.types.INVESTMENT_SALE:
            summary.totalInvestmentSales += t.amount || 0;
            summary.investmentGainLoss += t.investmentGainLoss || 0;
            break;
          case this.types.LOAN_EMI:
          case this.types.LOAN_PREPAYMENT:
            summary.totalLoanEMI += t.amount || 0;
            summary.totalPrincipalPaid += t.principalAmount || 0;
            summary.totalInterestPaid += t.interestAmount || 0;
            break;
          case this.types.SAVINGS_DEPOSIT:
          case this.types.EMERGENCY_FUND:
            summary.totalSavingsDeposits += t.amount || 0;
            break;
          case this.types.SAVINGS_WITHDRAWAL:
            summary.totalSavingsWithdrawals += t.amount || 0;
            break;
          case this.types.ACCOUNT_TRANSFER:
            summary.totalAccountTransfers += t.amount || 0;
            break;
        }
      });
      
      return summary;
    } catch (error) {
      console.error('[TransfersService] Error getting monthly summary:', error);
      throw error;
    }
  }

  /**
   * Get transfers linked to a specific entity
   */
  async getLinkedTransfers(linkedType, linkedId) {
    try {
      return await this.getTransfers({ linkedType, linkedId });
    } catch (error) {
      console.error('[TransfersService] Error getting linked transfers:', error);
      throw error;
    }
  }

  /**
   * Create investment purchase transfer
   */
  async createInvestmentPurchase(investmentId, investmentName, amount, date, paymentMethod) {
    return this.createTransfer({
      type: this.types.INVESTMENT_PURCHASE,
      fromAccountType: this.accountTypes.BANK,
      toAccountType: this.accountTypes.INVESTMENT,
      amount,
      date,
      description: `Investment in ${investmentName}`,
      linkedType: 'investment',
      linkedId: investmentId,
      linkedName: investmentName,
      paymentMethod
    });
  }

  /**
   * Create investment sale transfer
   */
  async createInvestmentSale(investmentId, investmentName, amount, gainLoss, date) {
    return this.createTransfer({
      type: this.types.INVESTMENT_SALE,
      fromAccountType: this.accountTypes.INVESTMENT,
      toAccountType: this.accountTypes.BANK,
      amount,
      investmentGainLoss: gainLoss,
      date,
      description: `Sold ${investmentName}`,
      linkedType: 'investment',
      linkedId: investmentId,
      linkedName: investmentName
    });
  }

  /**
   * Create loan EMI payment transfer
   */
  async createLoanEMI(loanId, loanName, totalAmount, principalAmount, interestAmount, date, paymentMethod) {
    return this.createTransfer({
      type: this.types.LOAN_EMI,
      fromAccountType: this.accountTypes.BANK,
      toAccountType: this.accountTypes.LOAN,
      amount: totalAmount,
      principalAmount,
      interestAmount,
      date,
      description: `EMI payment for ${loanName}`,
      linkedType: 'loan',
      linkedId: loanId,
      linkedName: loanName,
      paymentMethod
    });
  }

  /**
   * Create loan disbursement transfer (when loan is received)
   */
  async createLoanDisbursement(loanId, loanName, amount, date) {
    return this.createTransfer({
      type: this.types.LOAN_DISBURSEMENT,
      fromAccountType: this.accountTypes.LOAN,
      toAccountType: this.accountTypes.BANK,
      amount,
      date,
      description: `Loan disbursement: ${loanName}`,
      linkedType: 'loan',
      linkedId: loanId,
      linkedName: loanName
    });
  }

  /**
   * Get category info for a transfer type
   */
  getCategoryInfo(type) {
    return this.categories[type] || this.categories.other;
  }
}

const transfersService = new TransfersService();
export default transfersService;
