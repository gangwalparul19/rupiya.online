// Push Notifications Service - Send notifications for important events
import logger from '../utils/logger.js';

class PushNotificationsService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.isSubscribed = false;
    this.subscription = null;
    this.notifications = [];
    this.notificationQueue = [];
    this.isEnabled = true;
  }

  /**
   * Request notification permission
   * @returns {Promise<string>} - Permission status
   */
  async requestPermission() {
    if (!this.isSupported) {
      logger.warn('Push notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      logger.info('Notification permission:', permission);
      return permission;
    } catch (error) {
      logger.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications
   * @returns {Promise<boolean>} - Subscription status
   */
  async subscribe() {
    if (!this.isSupported) {
      logger.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        logger.warn('Notification permission not granted');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VAPID_PUBLIC_KEY || 'default-key'
        )
      });

      this.isSubscribed = true;
      logger.info('Push notification subscription successful');
      return true;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   * @returns {Promise<boolean>} - Unsubscription status
   */
  async unsubscribe() {
    if (!this.subscription) {
      return false;
    }

    try {
      await this.subscription.unsubscribe();
      this.isSubscribed = false;
      this.subscription = null;
      logger.info('Push notification unsubscription successful');
      return true;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Show local notification
   * @param {string} title - Notification title
   * @param {object} options - Notification options
   */
  showNotification(title, options = {}) {
    if (!this.isEnabled) {
      return;
    }

    const defaultOptions = {
      icon: '/logo.png',
      badge: '/favicon.ico',
      tag: 'rupiya-notification',
      requireInteraction: false,
      ...options
    };

    const notification = {
      title,
      options: defaultOptions,
      timestamp: Date.now(),
      id: this.generateNotificationId()
    };

    this.notifications.push(notification);

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, defaultOptions);
        logger.debug('Notification shown:', title);
      } catch (error) {
        logger.error('Failed to show notification:', error);
      }
    }
  }

  /**
   * Send budget exceeded notification
   * @param {string} budgetName - Budget name
   * @param {number} spent - Amount spent
   * @param {number} limit - Budget limit
   */
  notifyBudgetExceeded(budgetName, spent, limit) {
    this.showNotification('Budget Exceeded', {
      body: `${budgetName}: ₹${spent.toFixed(2)} / ₹${limit.toFixed(2)}`,
      tag: 'budget-exceeded',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Budget' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    this.logNotification('budget_exceeded', {
      budgetName,
      spent,
      limit
    });
  }

  /**
   * Send goal milestone notification
   * @param {string} goalName - Goal name
   * @param {number} progress - Progress percentage
   */
  notifyGoalMilestone(goalName, progress) {
    this.showNotification('Goal Milestone Reached', {
      body: `${goalName}: ${progress.toFixed(0)}% complete`,
      tag: 'goal-milestone',
      actions: [
        { action: 'view', title: 'View Goal' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    this.logNotification('goal_milestone', {
      goalName,
      progress
    });
  }

  /**
   * Send EMI due notification
   * @param {string} loanName - Loan name
   * @param {number} amount - EMI amount
   * @param {string} dueDate - Due date
   */
  notifyEMIDue(loanName, amount, dueDate) {
    this.showNotification('EMI Due', {
      body: `${loanName}: ₹${amount.toFixed(2)} due on ${dueDate}`,
      tag: 'emi-due',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Loan' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    this.logNotification('emi_due', {
      loanName,
      amount,
      dueDate
    });
  }

  /**
   * Send family member added notification
   * @param {string} memberName - Member name
   */
  notifyFamilyMemberAdded(memberName) {
    this.showNotification('Family Member Added', {
      body: `${memberName} has been added to your family`,
      tag: 'family-member-added',
      actions: [
        { action: 'view', title: 'View Family' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    this.logNotification('family_member_added', {
      memberName
    });
  }

  /**
   * Send trip expense settled notification
   * @param {string} tripName - Trip name
   * @param {number} amount - Settlement amount
   * @param {string} settledWith - Settled with person
   */
  notifyTripExpenseSettled(tripName, amount, settledWith) {
    this.showNotification('Trip Expense Settled', {
      body: `${tripName}: ₹${amount.toFixed(2)} settled with ${settledWith}`,
      tag: 'trip-settled',
      actions: [
        { action: 'view', title: 'View Trip' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });

    this.logNotification('trip_expense_settled', {
      tripName,
      amount,
      settledWith
    });
  }

  /**
   * Send custom notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @param {object} metadata - Additional metadata
   */
  sendCustomNotification(title, message, type = 'info', metadata = {}) {
    this.showNotification(title, {
      body: message,
      tag: type,
      ...metadata
    });

    this.logNotification(type, {
      title,
      message,
      ...metadata
    });
  }

  /**
   * Log notification
   * @param {string} type - Notification type
   * @param {object} data - Notification data
   */
  logNotification(type, data) {
    const notification = {
      type,
      data,
      timestamp: Date.now()
    };

    this.notificationQueue.push(notification);

    // Keep only last 100 notifications
    if (this.notificationQueue.length > 100) {
      this.notificationQueue.shift();
    }

    logger.debug(`Notification logged: ${type}`, data);
  }

  /**
   * Get notification history
   * @returns {array} - Notification history
   */
  getNotificationHistory() {
    return this.notificationQueue;
  }

  /**
   * Clear notification history
   */
  clearNotificationHistory() {
    this.notificationQueue = [];
  }

  /**
   * Enable/disable notifications
   * @param {boolean} enabled - Enable flag
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get subscription status
   * @returns {object} - Subscription status
   */
  getSubscriptionStatus() {
    return {
      isSupported: this.isSupported,
      isSubscribed: this.isSubscribed,
      isEnabled: this.isEnabled,
      permission: Notification.permission,
      subscription: this.subscription ? {
        endpoint: this.subscription.endpoint,
        expirationTime: this.subscription.expirationTime
      } : null
    };
  }

  /**
   * Convert VAPID key
   * @param {string} base64String - Base64 string
   * @returns {Uint8Array} - Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Generate notification ID
   * @returns {string} - Notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle notification click
   * @param {string} action - Action name
   * @param {string} tag - Notification tag
   */
  handleNotificationClick(action, tag) {
    logger.info(`Notification clicked: ${tag} - ${action}`);

    switch (tag) {
      case 'budget-exceeded':
        if (action === 'view') {
          window.location.href = '/budgets.html';
        }
        break;
      case 'goal-milestone':
        if (action === 'view') {
          window.location.href = '/goals.html';
        }
        break;
      case 'emi-due':
        if (action === 'view') {
          window.location.href = '/loans.html';
        }
        break;
      case 'family-member-added':
        if (action === 'view') {
          window.location.href = '/profile.html';
        }
        break;
      case 'trip-settled':
        if (action === 'view') {
          window.location.href = '/trip-groups.html';
        }
        break;
    }
  }

  /**
   * Get notification stats
   * @returns {object} - Notification statistics
   */
  getNotificationStats() {
    const stats = {
      total: this.notificationQueue.length,
      byType: {}
    };

    this.notificationQueue.forEach(notif => {
      if (!stats.byType[notif.type]) {
        stats.byType[notif.type] = 0;
      }
      stats.byType[notif.type]++;
    });

    return stats;
  }

  /**
   * Export notification data
   * @returns {object} - Notification data
   */
  exportData() {
    return {
      timestamp: new Date().toISOString(),
      status: this.getSubscriptionStatus(),
      history: this.getNotificationHistory(),
      stats: this.getNotificationStats()
    };
  }
}

export default new PushNotificationsService();
