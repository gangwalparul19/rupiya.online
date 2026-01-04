// Notification Service for Trip Groups
// Handles WhatsApp/SMS notifications for non-Rupiya users

class NotificationService {
  constructor() {
    this.apiEndpoint = '/api/notifications'; // Backend API endpoint
  }

  /**
   * Send expense notification to a non-Rupiya member
   * @param {string} phoneNumber - Member's phone number
   * @param {object} expenseDetails - Expense information
   * @param {number} balance - Member's current balance in the group
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendExpenseNotification(phoneNumber, expenseDetails, balance) {
    if (!phoneNumber) {
      return { success: false, error: 'Phone number is required' };
    }

    const message = this.formatExpenseMessage(expenseDetails, balance);
    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send settlement notification to a non-Rupiya member
   * @param {string} phoneNumber - Member's phone number
   * @param {object} settlementDetails - Settlement information
   * @param {number} balance - Member's current balance after settlement
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendSettlementNotification(phoneNumber, settlementDetails, balance) {
    if (!phoneNumber) {
      return { success: false, error: 'Phone number is required' };
    }

    const message = this.formatSettlementMessage(settlementDetails, balance);
    return await this.sendNotification(phoneNumber, message);
  }

  /**
   * Send budget warning notification to all members
   * @param {Array} members - Array of member objects with phone numbers
   * @param {object} budgetStatus - Budget status information
   * @returns {Promise<{success: boolean, sent: number, failed: number}>}
   */
  async sendBudgetWarning(members, budgetStatus) {
    const message = this.formatBudgetWarningMessage(budgetStatus);
    let sent = 0;
    let failed = 0;

    for (const member of members) {
      if (member.phone && member.notificationsEnabled !== false) {
        const result = await this.sendNotification(member.phone, message);
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }
    }

    return { success: true, sent, failed };
  }

  /**
   * Format expense notification message
   */
  formatExpenseMessage(expense, balance) {
    const balanceText = balance > 0 
      ? `You are owed ₹${Math.abs(balance).toFixed(2)}`
      : balance < 0 
        ? `You owe ₹${Math.abs(balance).toFixed(2)}`
        : 'Your balance is settled';

    return `🧾 New expense in "${expense.groupName}"

💰 Amount: ₹${expense.amount.toFixed(2)}
📝 ${expense.description}
👤 Paid by: ${expense.paidByName}
📅 ${expense.date}

Your share: ₹${expense.yourShare?.toFixed(2) || '0.00'}

📊 ${balanceText}

- Rupiya App`;
  }

  /**
   * Format settlement notification message
   */
  formatSettlementMessage(settlement, balance) {
    const balanceText = balance > 0 
      ? `You are owed ₹${Math.abs(balance).toFixed(2)}`
      : balance < 0 
        ? `You owe ₹${Math.abs(balance).toFixed(2)}`
        : 'Your balance is settled! ✅';

    return `💸 Settlement recorded in "${settlement.groupName}"

${settlement.fromName} paid ₹${settlement.amount.toFixed(2)} to ${settlement.toName}

📊 ${balanceText}

- Rupiya App`;
  }

  /**
   * Format budget warning message
   */
  formatBudgetWarningMessage(budgetStatus) {
    const isOverBudget = budgetStatus.progress >= 100;
    const emoji = isOverBudget ? '🚨' : '⚠️';
    const title = isOverBudget ? 'Budget Exceeded!' : 'Budget Warning';

    return `${emoji} ${title}

Trip: ${budgetStatus.groupName}
Budget: ₹${budgetStatus.budget.toFixed(2)}
Spent: ₹${budgetStatus.spent.toFixed(2)} (${budgetStatus.progress.toFixed(0)}%)
${isOverBudget 
  ? `Over by: ₹${Math.abs(budgetStatus.remaining).toFixed(2)}`
  : `Remaining: ₹${budgetStatus.remaining.toFixed(2)}`}

- Rupiya App`;
  }

  /**
   * Send notification via backend API
   * This is a placeholder - actual implementation would call a backend service
   * that integrates with WhatsApp Business API or SMS gateway
   */
  async sendNotification(phoneNumber, message) {
    try {
      // Validate phone number format
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      if (!this.isValidPhoneNumber(cleanPhone)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // In production, this would call a backend API
      // For now, we'll log the notification and return success
      console.log(`[Notification] To: ${cleanPhone}`);
      console.log(`[Notification] Message: ${message}`);

      // Simulate API call
      // const response = await fetch(this.apiEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: cleanPhone, message })
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Failed to send notification');
      // }

      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean phone number - remove spaces, dashes, etc.
   */
  cleanPhoneNumber(phone) {
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone) {
    // Basic validation - should start with + or be 10+ digits
    const phoneRegex = /^(\+\d{1,3})?\d{10,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Check if member has opted out of notifications
   */
  isOptedOut(member) {
    return member.notificationsEnabled === false;
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
