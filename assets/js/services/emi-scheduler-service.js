/**
 * EMI Scheduler Service
 * 
 * Handles automatic EMI processing on the client-side.
 * This runs when the user opens the app and checks for:
 * 1. EMIs that were due but not recorded (missed days)
 * 2. EMIs due today
 * 3. Upcoming EMI reminders
 * 
 * Why client-side? Because all financial data is encrypted with user-specific
 * keys that only exist in the browser. Cloud Functions cannot decrypt this data.
 */

import firestoreService from './firestore-service.js';
import transfersService from './transfers-service.js';
import crossFeatureIntegrationService from './cross-feature-integration-service.js';
import authService from './auth-service.js';
import logger from '../utils/logger.js';

const log = logger.create('EMIScheduler');

class EMISchedulerService {
  constructor() {
    this.lastCheckDate = null;
    this.isProcessing = false;
  }

  /**
   * Initialize the scheduler - call this after user logs in
   */
  async initialize() {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        log.warn('No user logged in, skipping EMI scheduler');
        return;
      }

      // Check if we already ran today
      const today = new Date().toDateString();
      const lastCheck = localStorage.getItem(`emi_last_check_${user.uid}`);
      
      if (lastCheck === today) {
        log.log('EMI check already done today');
        return;
      }

      log.log('Running daily EMI check...');
      await this.processDailyEMIs();
      
      // Mark as checked for today
      localStorage.setItem(`emi_last_check_${user.uid}`, today);
      
    } catch (error) {
      log.error('EMI scheduler initialization failed:', error);
    }
  }

  /**
   * Process EMIs that are due today or were missed
   */
  async processDailyEMIs() {
    if (this.isProcessing) {
      log.warn('EMI processing already in progress');
      return { processed: 0, skipped: 0 };
    }

    this.isProcessing = true;
    
    try {
      const loans = await firestoreService.getLoans() || [];
      const activeLoans = loans.filter(l => l.status !== 'closed');
      
      log.log(`Found ${activeLoans.length} active loans`);
      
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      let processedCount = 0;
      let skippedCount = 0;
      const results = [];

      for (const loan of activeLoans) {
        const emiDay = this._getEMIDueDay(loan);
        
        // Check if today is the EMI due day
        if (currentDay !== emiDay) {
          continue;
        }

        // Check if EMI already recorded this month
        const alreadyRecorded = await this._isEMIAlreadyRecorded(
          loan.id, 
          currentYear, 
          currentMonth
        );
        
        if (alreadyRecorded) {
          log.log(`EMI already recorded for ${loan.loanName} this month`);
          skippedCount++;
          continue;
        }

        // Check if all EMIs are paid
        const emisPaid = parseFloat(loan.emisPaid) || 0;
        const tenure = parseFloat(loan.tenure) || 0;
        
        if (emisPaid >= tenure) {
          log.log(`Loan ${loan.loanName} fully paid`);
          skippedCount++;
          continue;
        }

        // Process the EMI
        try {
          await this._processEMIPayment(loan, today);
          processedCount++;
          results.push({
            loanName: loan.loanName,
            amount: loan.emiAmount,
            status: 'processed'
          });
          log.log(`Auto-processed EMI for ${loan.loanName}`);
        } catch (error) {
          log.error(`Failed to process EMI for ${loan.loanName}:`, error);
          results.push({
            loanName: loan.loanName,
            amount: loan.emiAmount,
            status: 'failed',
            error: error.message
          });
        }
      }

      log.log(`EMI Processing Complete: ${processedCount} processed, ${skippedCount} skipped`);
      
      return { processed: processedCount, skipped: skippedCount, results };
      
    } catch (error) {
      log.error('Error in daily EMI processing:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get upcoming EMIs for the next N days
   */
  async getUpcomingEMIs(daysAhead = 7) {
    try {
      const loans = await firestoreService.getLoans() || [];
      const activeLoans = loans.filter(l => l.status !== 'closed');
      
      const today = new Date();
      const currentDay = today.getDate();
      const upcoming = [];

      for (const loan of activeLoans) {
        const emiDay = this._getEMIDueDay(loan);
        let daysUntil = emiDay - currentDay;
        
        // Handle month wrap-around
        if (daysUntil < 0) {
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          daysUntil = daysInMonth - currentDay + emiDay;
        }
        
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          upcoming.push({
            loan,
            daysUntil,
            dueDate: new Date(today.getFullYear(), today.getMonth(), emiDay)
          });
        }
      }

      // Sort by days until due
      upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
      
      return upcoming;
    } catch (error) {
      log.error('Error getting upcoming EMIs:', error);
      return [];
    }
  }

  /**
   * Create EMI reminder notifications
   */
  async createEMIReminders() {
    try {
      const upcoming = await this.getUpcomingEMIs(3); // 3 days ahead
      const notifications = [];

      for (const { loan, daysUntil, dueDate } of upcoming) {
        // Check if reminder already exists
        const existingReminders = await this._getExistingReminders(loan.id, dueDate);
        if (existingReminders.length > 0) {
          continue;
        }

        const notification = {
          type: 'emi_reminder',
          title: 'EMI Due Soon',
          message: this._getReminderMessage(loan, daysUntil),
          data: {
            loanId: loan.id,
            loanName: loan.loanName,
            emiAmount: loan.emiAmount,
            dueDate: dueDate.toISOString()
          },
          read: false
        };

        await firestoreService.add('notifications', notification);
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      log.error('Error creating EMI reminders:', error);
      return [];
    }
  }

  /**
   * Get unread notifications for the current user
   */
  async getUnreadNotifications() {
    try {
      const notifications = await firestoreService.getAll('notifications') || [];
      return notifications.filter(n => !n.read);
    } catch (error) {
      log.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      await firestoreService.update('notifications', notificationId, { read: true });
    } catch (error) {
      log.error('Error marking notification as read:', error);
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  _getEMIDueDay(loan) {
    if (loan.emiDate) return parseInt(loan.emiDate);
    if (loan.emiDay) return parseInt(loan.emiDay);
    
    if (loan.startDate) {
      const startDate = loan.startDate.toDate 
        ? loan.startDate.toDate() 
        : new Date(loan.startDate);
      return startDate.getDate();
    }
    
    return 1; // Default to 1st of month
  }

  async _isEMIAlreadyRecorded(loanId, year, month) {
    try {
      const transfers = await transfersService.getTransfers() || [];
      
      return transfers.some(t => {
        if (t.linkedId !== loanId) return false;
        if (!['loan_emi', 'loan_prepayment'].includes(t.type)) return false;
        
        const transferDate = t.date?.toDate 
          ? t.date.toDate() 
          : new Date(t.date);
        
        return transferDate.getFullYear() === year && 
               transferDate.getMonth() === month;
      });
    } catch (error) {
      log.error('Error checking EMI records:', error);
      return false;
    }
  }

  async _processEMIPayment(loan, paymentDate) {
    const emiAmount = parseFloat(loan.emiAmount) || 0;
    const outstandingAmount = parseFloat(loan.outstandingAmount) || 0;
    const interestRate = parseFloat(loan.interestRate) || 0;
    
    if (emiAmount <= 0) {
      throw new Error('No EMI amount set for this loan');
    }

    // Calculate breakdown
    const breakdown = crossFeatureIntegrationService.calculateEMIBreakdown(
      outstandingAmount,
      interestRate,
      emiAmount
    );

    // 1. Update loan document
    const newOutstanding = Math.max(0, outstandingAmount - breakdown.principalPaid);
    const newEmisPaid = (parseFloat(loan.emisPaid) || 0) + 1;
    const tenure = parseFloat(loan.tenure) || 0;
    const isFullyPaid = newEmisPaid >= tenure || newOutstanding <= 0;

    await firestoreService.updateLoan(loan.id, {
      emisPaid: newEmisPaid,
      outstandingAmount: newOutstanding,
      status: isFullyPaid ? 'closed' : 'active',
      lastEMIDate: paymentDate
    });

    // 2. Create expense record
    await crossFeatureIntegrationService.createLoanEMIExpense(
      loan.id,
      loan.loanName,
      loan.lender,
      {
        amount: emiAmount,
        type: 'emi',
        date: paymentDate,
        principalPaid: breakdown.principalPaid,
        interestPaid: breakdown.interestPaid,
        isAutoGenerated: true
      }
    );

    // 3. Create transfer record for net worth tracking
    await transfersService.createTransfer({
      type: 'loan_emi',
      amount: emiAmount,
      date: paymentDate,
      description: `${loan.loanName} - Auto EMI Payment`,
      principalAmount: breakdown.principalPaid,
      interestAmount: breakdown.interestPaid,
      linkedType: 'loan',
      linkedId: loan.id,
      linkedName: loan.loanName,
      status: 'completed',
      isAutoGenerated: true
    });
  }

  async _getExistingReminders(loanId, dueDate) {
    try {
      const notifications = await firestoreService.getAll('notifications') || [];
      const dueDateStr = dueDate.toISOString().split('T')[0];
      
      return notifications.filter(n => 
        n.type === 'emi_reminder' &&
        n.data?.loanId === loanId &&
        n.data?.dueDate?.startsWith(dueDateStr)
      );
    } catch (error) {
      return [];
    }
  }

  _getReminderMessage(loan, daysUntil) {
    const amount = parseFloat(loan.emiAmount) || 0;
    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);

    if (daysUntil === 0) {
      return `Your EMI of ${formattedAmount} for ${loan.loanName} is due today!`;
    } else if (daysUntil === 1) {
      return `Your EMI of ${formattedAmount} for ${loan.loanName} is due tomorrow.`;
    } else {
      return `Your EMI of ${formattedAmount} for ${loan.loanName} is due in ${daysUntil} days.`;
    }
  }
}

// Create and export singleton
const emiSchedulerService = new EMISchedulerService();
export default emiSchedulerService;
