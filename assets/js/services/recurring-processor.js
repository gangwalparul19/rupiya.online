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
   * Only process once per day to avoid duplicates
   */
  shouldProcess() {
    const lastProcess = localStorage.getItem(this.processingKey);
    if (!lastProcess) return true;
    
    const lastDate = new Date(lastProcess);
    const today = new Date();
    
    // Normalize both dates to midnight for comparison (ignore time)
    const lastDateNormalized = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Process if last process was on a different day
    return lastDateNormalized.getTime() !== todayNormalized.getTime();
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
    
    console.log('[RecurringProcessor] getDueDates called:', {
      startDate: currentDate.toISOString(),
      frequency,
      lastProcessedDate: lastProcessedDate ? new Date(lastProcessedDate).toISOString() : null,
      today: today.toISOString()
    });
    
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
    
    console.log('[RecurringProcessor] Due dates found:', dueDates.length, dueDates.map(d => d.toISOString()));
    
    return dueDates;
  }

  /**
   * Process all recurring transactions
   */
  async processRecurring(forceProcess = false) {
    // Check if we should process
    console.log('[RecurringProcessor] processRecurring called with forceProcess:', forceProcess);
    console.log('[RecurringProcessor] shouldProcess() returns:', this.shouldProcess());
    
    if (!forceProcess && !this.shouldProcess()) {
      console.log('[RecurringProcessor] Already processed today, skipping');
      return { processed: 0, skipped: true };
    }

    const user = authService.getCurrentUser();
    if (!user) {
      console.log('[RecurringProcessor] No user logged in');
      return { processed: 0, error: 'Not authenticated' };
    }

    try {
      console.log('[RecurringProcessor] Starting recurring transaction processing...');
      
      // Get all recurring transactions
      const recurringTransactions = await firestoreService.getAll('recurringTransactions', 'startDate', 'asc');
      
      console.log(`[RecurringProcessor] Found ${recurringTransactions.length} recurring transactions`);
      
      let processedCount = 0;
      let createdTransactions = [];

      for (const recurring of recurringTransactions) {
        // Skip paused or inactive recurring transactions
        if (recurring.status === 'paused' || recurring.status === 'inactive') {
          console.log(`[RecurringProcessor] Skipping ${recurring.description} - status: ${recurring.status}`);
          continue;
        }

        const startDate = recurring.startDate?.toDate ? recurring.startDate.toDate() : new Date(recurring.startDate);
        const endDate = recurring.endDate?.toDate ? recurring.endDate.toDate() : null;
        const lastProcessed = recurring.lastProcessedDate?.toDate ? recurring.lastProcessedDate.toDate() : null;
        
        console.log(`[RecurringProcessor] Checking ${recurring.description}:`, {
          status: recurring.status,
          frequency: recurring.frequency,
          startDate: startDate.toISOString(),
          lastProcessed: lastProcessed ? lastProcessed.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        });
        
        // Get all due dates that need processing
        const dueDates = this.getDueDates(startDate, recurring.frequency, lastProcessed, endDate);
        
        if (dueDates.length === 0) {
          console.log(`[RecurringProcessor] No due dates for ${recurring.description}`);
          continue;
        }

        console.log(`[RecurringProcessor] Processing ${recurring.description}: ${dueDates.length} transactions due`);

        // Create transactions for each due date
        for (const dueDate of dueDates) {
          const transactionData = {
            amount: recurring.amount,
            category: recurring.category,
            description: recurring.description,
            date: dueDate,
            paymentMethod: recurring.paymentMethod || 'cash',
            paymentMethodId: recurring.paymentMethodId || null,
            paymentMethodName: recurring.paymentMethodName || null,
            isRecurring: true,
            recurringId: recurring.id,
            notes: recurring.notes || `Auto-generated from recurring: ${recurring.description}`
          };

          let result;
          if (recurring.type === 'expense') {
            console.log(`[RecurringProcessor] Creating expense for ${recurring.description} on ${dueDate.toISOString()}`);
            result = await firestoreService.addExpense(transactionData);
          } else if (recurring.type === 'income') {
            console.log(`[RecurringProcessor] Creating income for ${recurring.description} on ${dueDate.toISOString()}`);
            result = await firestoreService.addIncome(transactionData);
          } else {
            console.log(`[RecurringProcessor] Unknown type: ${recurring.type} for ${recurring.description}`);
          }

          console.log(`[RecurringProcessor] Result:`, result);

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

      // Mark as processed for today
      this.markProcessed();

      console.log(`[RecurringProcessor] Completed. Created ${processedCount} transactions.`);
      
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
    console.log('[RecurringProcessor] Resetting processing flag');
    console.log('[RecurringProcessor] Before reset - localStorage key:', localStorage.getItem(this.processingKey));
    localStorage.removeItem(this.processingKey);
    console.log('[RecurringProcessor] After reset - localStorage key:', localStorage.getItem(this.processingKey));
  }
}

const recurringProcessor = new RecurringProcessor();
export default recurringProcessor;
