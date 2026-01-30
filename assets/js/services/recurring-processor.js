/**
 * Recurring Transaction Processor
 * Automatically processes recurring transactions and creates actual expense/income entries
 */

import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import firestoreService from './firestore-service.js';

class RecurringProcessor {
  constructor() {
    this.processingKey = 'rupiya_last_recurring_process';
  }

  /**
   * Check if we should process recurring transactions
   * Returns true if:
   * 1. Never processed before, OR
   * 2. Last process was on a different day, OR
   * 3. There are past due transactions that need processing
   */
  async shouldProcess() {
    const lastProcess = localStorage.getItem(this.processingKey);
    if (!lastProcess) return true;
    
    const lastDate = new Date(lastProcess);
    const today = new Date();
    
    // Normalize both dates to midnight for comparison (ignore time)
    const lastDateNormalized = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Process if last process was on a different day
    if (lastDateNormalized.getTime() !== todayNormalized.getTime()) {
      return true;
    }
    
    // Even if processed today, check if there are past due transactions
    // This handles cases where recurring transactions were added with past start dates
    try {
      const user = authService.getCurrentUser();
      if (!user) return false;
      
      const recurringTransactions = await firestoreService.getAll('recurringTransactions', 'startDate', 'asc');
      
      for (const recurring of recurringTransactions) {
        if (recurring.status === 'paused' || recurring.status === 'inactive') {
          continue;
        }
        
        const startDate = recurring.startDate?.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
        const lastProcessed = recurring.lastProcessedDate?.toDate ? recurring.lastProcessedDate.toDate() : null;
        const endDate = recurring.endDate?.toDate ? recurring.endDate.toDate() : null;
        
        const dueDates = this.getDueDates(startDate, recurring.frequency, lastProcessed, endDate);
        
        if (dueDates.length > 0) {
          return true;
        }
      }
    } catch (error) {
      console.error('[RecurringProcessor] Error checking for past due transactions:', error);
    }
    
    return false;
  }

  /**
   * Mark processing as complete for today
   */
  markProcessed() {
    localStorage.setItem(this.processingKey, new Date().toISOString());
  }

  /**
   * Calculate the next occurrence date based on frequency
   */
  calculateNextDate(currentDate, frequency) {
    const next = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }
    
    return next;
  }

  /**
   * Get all dates that should have been processed between lastProcessed and today
   */
  getDueDates(startDate, frequency, lastProcessedDate, endDate = null) {
    const dueDates = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let currentDate = new Date(startDate);
    // Normalize to start of day to avoid timezone issues
    currentDate.setHours(0, 0, 0, 0);
    
    // If we have a last processed date, start from the next occurrence after that
    if (lastProcessedDate) {
      const lastProcessed = new Date(lastProcessedDate);
      lastProcessed.setHours(0, 0, 0, 0);
      while (currentDate <= lastProcessed) {
        currentDate = this.calculateNextDate(currentDate, frequency);
      }
    }
    
    // Collect all due dates up to today (inclusive)
    while (currentDate <= today) {
      // Check if end date has passed
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (currentDate > end) break;
      }
      
      dueDates.push(new Date(currentDate));
      currentDate = this.calculateNextDate(currentDate, frequency);
    }
     
    return dueDates;
  }

  /**
   * Process all recurring transactions
   */
  async processRecurring(forceProcess = false) {
    // Check if we should process    
    const shouldProc = forceProcess || await this.shouldProcess();

    if (!shouldProc) {
      return { processed: 0, skipped: true };
    }

    const user = authService.getCurrentUser();
    if (!user) {
      return { processed: 0, error: 'Not authenticated' };
    }

    try {
      // Get all recurring transactions
      const recurringTransactions = await firestoreService.getAll('recurringTransactions', 'startDate', 'asc');
      
      // Get all active savings with auto-deduct enabled
      const savings = await firestoreService.getSavings();
      const activeSavings = savings.filter(s => 
        s.status === 'active' && 
        s.autoDeduct === true && 
        s.frequency !== 'one-time'
      );
      
      let processedCount = 0;
      let createdTransactions = [];

      // Process recurring transactions (expenses and income)
      for (const recurring of recurringTransactions) {
        // Skip paused or inactive recurring transactions
        if (recurring.status === 'paused' || recurring.status === 'inactive') {
           continue;
        }

        const startDate = recurring.startDate?.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
        const endDate = recurring.endDate?.toDate ? recurring.endDate.toDate() : null;
        const lastProcessed = recurring.lastProcessedDate?.toDate ? recurring.lastProcessedDate.toDate() : null;
        
        // Get all due dates that need processing
        const dueDates = this.getDueDates(startDate, recurring.frequency, lastProcessed, endDate);
        
        if (dueDates.length === 0) {
          continue;
        }

        // Create transactions for each due date
        for (const dueDate of dueDates) {
          const transactionData = {
            amount: recurring.amount,
            category: recurring.category,
            description: recurring.description || recurring.name || 'Recurring transaction',
            date: dueDate,
            paymentMethod: recurring.paymentMethod || 'cash',
            paymentMethodId: recurring.paymentMethodId || null,
            paymentMethodName: recurring.paymentMethodName || null,
            isRecurring: true,
            recurringId: recurring.id,
            notes: recurring.notes || `Auto-generated from recurring: ${recurring.description || recurring.name}`
          };

          let result;
          if (recurring.type === 'expense') {
            result = await firestoreService.addExpense(transactionData);
          } else if (recurring.type === 'income') {
            result = await firestoreService.addIncome(transactionData);
          } else {

          }

          if (result?.success) {
            processedCount++;
            createdTransactions.push({
              type: recurring.type,
              description: recurring.description,
              amount: recurring.amount,
              date: dueDate
            });
          }
        }

        // Update the recurring transaction with last processed date
        const lastDueDate = dueDates[dueDates.length - 1];
        await firestoreService.update('recurringTransactions', recurring.id, {
          lastProcessedDate: Timestamp.fromDate(lastDueDate),
          nextDueDate: Timestamp.fromDate(this.calculateNextDate(lastDueDate, recurring.frequency))
        });
      }

      // Process recurring savings (auto-deduct)
      for (const saving of activeSavings) {
        const startDate = saving.startDate?.toDate ? saving.startDate.toDate() : new Date(saving.startDate);
        const endDate = saving.maturityDate?.toDate ? saving.maturityDate.toDate() : null;
        const lastProcessed = saving.lastProcessedDate?.toDate ? saving.lastProcessedDate.toDate() : null;
        
        // Get all due dates that need processing
        const dueDates = this.getDueDates(startDate, saving.frequency, lastProcessed, endDate);
        
        if (dueDates.length === 0) {
          continue;
        }

        // Create expense entries for each due date (savings = money going out)
        for (const dueDate of dueDates) {
          const expenseData = {
            amount: saving.amount,
            category: 'Savings',
            description: `${saving.name} - ${saving.savingType}`,
            date: dueDate,
            paymentMethod: 'bank_transfer',
            paymentMethodId: null,
            paymentMethodName: null,
            isRecurring: true,
            recurringId: saving.id,
            savingId: saving.id,
            notes: `Auto-deducted from ${saving.name} (${saving.savingType})`
          };

          const result = await firestoreService.addExpense(expenseData);

          if (result?.success) {
            processedCount++;
            createdTransactions.push({
              type: 'savings',
              description: saving.name,
              amount: saving.amount,
              date: dueDate
            });
            
            // Update the current value of the saving
            const newCurrentValue = (parseFloat(saving.currentValue) || 0) + parseFloat(saving.amount);
            await firestoreService.updateSaving(saving.id, {
              currentValue: newCurrentValue
            });
          }
        }

        // Update the saving with last processed date
        const lastDueDate = dueDates[dueDates.length - 1];
        await firestoreService.updateSaving(saving.id, {
          lastProcessedDate: Timestamp.fromDate(lastDueDate),
          nextDueDate: Timestamp.fromDate(this.calculateNextDate(lastDueDate, saving.frequency))
        });
      }

      // Mark as processed for today
      this.markProcessed();

      return { 
        processed: processedCount, 
        transactions: createdTransactions,
        skipped: false 
      };

    } catch (error) {
      console.error('[RecurringProcessor] Error processing recurring transactions:', error);
      return { processed: 0, error: error.message };
    }
  }

  /**
   * Get upcoming recurring transactions (for display purposes)
   */
  async getUpcoming(days = 7) {
    const user = authService.getCurrentUser();
    if (!user) return [];

    try {
      const recurringTransactions = await firestoreService.getAll('recurringTransactions', 'startDate', 'asc');
      const upcoming = [];
      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      for (const recurring of recurringTransactions) {
        if (recurring.status === 'paused' || recurring.status === 'inactive') {
          continue;
        }

        const startDate = recurring.startDate?.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
        const endDate = recurring.endDate?.toDate ? recurring.endDate.toDate() : null;
        const lastProcessed = recurring.lastProcessedDate?.toDate ? recurring.lastProcessedDate.toDate() : null;
        
        // Calculate next due date
        let nextDue = new Date(startDate);
        if (lastProcessed) {
          nextDue = this.calculateNextDate(lastProcessed, recurring.frequency);
        } else {
          while (nextDue < today) {
            nextDue = this.calculateNextDate(nextDue, recurring.frequency);
          }
        }

        // Check if within range and not past end date
        if (nextDue <= futureDate && (!endDate || nextDue <= endDate)) {
          upcoming.push({
            ...recurring,
            nextDueDate: nextDue,
            daysUntil: Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24))
          });
        }
      }

      // Sort by next due date
      return upcoming.sort((a, b) => a.nextDueDate - b.nextDueDate);

    } catch (error) {
      console.error('[RecurringProcessor] Error getting upcoming:', error);
      return [];
    }
  }

  /**
   * Reset processing flag (for testing or manual re-processing)
   */
  resetProcessingFlag() {
    localStorage.removeItem(this.processingKey);
  }
}

const recurringProcessor = new RecurringProcessor();
export default recurringProcessor;
