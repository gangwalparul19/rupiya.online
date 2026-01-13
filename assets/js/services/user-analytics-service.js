// User Analytics Service - Track user behavior and engagement
import logger from '../utils/logger.js';

class UserAnalyticsService {
  constructor() {
    this.events = [];
    this.sessions = new Map();
    this.currentSession = null;
    this.isEnabled = true;
    this.batchSize = 50;
    this.flushInterval = 60000; // 1 minute
    this.eventQueue = [];
    this.startAutoFlush();
  }

  /**
   * Initialize analytics session
   * @param {string} userId - User ID
   * @param {object} metadata - Session metadata
   */
  initSession(userId, metadata = {}) {
    this.currentSession = {
      sessionId: this.generateSessionId(),
      userId,
      startTime: Date.now(),
      endTime: null,
      events: [],
      metadata,
      pageViews: 0,
      eventCount: 0
    };

    this.sessions.set(this.currentSession.sessionId, this.currentSession);
    logger.info('Analytics session started:', this.currentSession.sessionId);
  }

  /**
   * End current session
   */
  endSession() {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
      logger.info('Analytics session ended:', this.currentSession.sessionId);
      this.flush();
    }
  }

  /**
   * Log event
   * @param {string} eventName - Event name
   * @param {object} eventData - Event data
   */
  logEvent(eventName, eventData = {}) {
    if (!this.isEnabled || !this.currentSession) {
      return;
    }

    const event = {
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.currentSession.sessionId,
      userId: this.currentSession.userId,
      data: eventData,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.eventQueue.push(event);
    this.currentSession.events.push(event);
    this.currentSession.eventCount++;

    logger.debug(`Event logged: ${eventName}`, eventData);

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Log page view
   * @param {string} pageName - Page name
   * @param {object} metadata - Page metadata
   */
  logPageView(pageName, metadata = {}) {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.pageViews++;
    this.logEvent('page_view', {
      pageName,
      ...metadata
    });
  }

  /**
   * Log feature usage
   * @param {string} featureName - Feature name
   * @param {object} metadata - Feature metadata
   */
  logFeatureUsage(featureName, metadata = {}) {
    this.logEvent('feature_usage', {
      featureName,
      ...metadata
    });
  }

  /**
   * Log user action
   * @param {string} action - Action name
   * @param {string} category - Action category
   * @param {object} metadata - Action metadata
   */
  logUserAction(action, category, metadata = {}) {
    this.logEvent('user_action', {
      action,
      category,
      ...metadata
    });
  }

  /**
   * Log conversion
   * @param {string} conversionType - Conversion type
   * @param {number} value - Conversion value
   * @param {object} metadata - Conversion metadata
   */
  logConversion(conversionType, value = 1, metadata = {}) {
    this.logEvent('conversion', {
      conversionType,
      value,
      ...metadata
    });
  }

  /**
   * Log error event
   * @param {string} errorType - Error type
   * @param {string} message - Error message
   * @param {object} metadata - Error metadata
   */
  logError(errorType, message, metadata = {}) {
    this.logEvent('error', {
      errorType,
      message,
      ...metadata
    });
  }

  /**
   * Log timing event
   * @param {string} timingName - Timing name
   * @param {number} duration - Duration in ms
   * @param {object} metadata - Timing metadata
   */
  logTiming(timingName, duration, metadata = {}) {
    this.logEvent('timing', {
      timingName,
      duration,
      ...metadata
    });
  }

  /**
   * Log engagement
   * @param {string} engagementType - Engagement type
   * @param {number} duration - Duration in ms
   */
  logEngagement(engagementType, duration) {
    this.logEvent('engagement', {
      engagementType,
      duration
    });
  }

  /**
   * Track user property
   * @param {string} propertyName - Property name
   * @param {*} propertyValue - Property value
   */
  setUserProperty(propertyName, propertyValue) {
    if (this.currentSession) {
      this.currentSession.metadata[propertyName] = propertyValue;
    }
  }

  /**
   * Get user properties
   * @returns {object} - User properties
   */
  getUserProperties() {
    if (this.currentSession) {
      return this.currentSession.metadata;
    }
    return {};
  }

  /**
   * Flush events to storage
   */
  flush() {
    if (this.eventQueue.length === 0) {
      return;
    }

    try {
      const batch = this.eventQueue.splice(0, this.batchSize);
      this.storeEvents(batch);
      logger.debug(`Flushed ${batch.length} events`);
    } catch (error) {
      logger.error('Failed to flush events:', error);
    }
  }

  /**
   * Store events (to localStorage or backend)
   * @param {array} batch - Events batch
   */
  storeEvents(batch) {
    try {
      const stored = JSON.parse(localStorage.getItem('analyticsEvents') || '[]');
      const updated = [...stored, ...batch];
      
      // Keep only last 1000 events
      if (updated.length > 1000) {
        updated.splice(0, updated.length - 1000);
      }

      localStorage.setItem('analyticsEvents', JSON.stringify(updated));
    } catch (error) {
      logger.warn('Failed to store events in localStorage:', error);
    }
  }

  /**
   * Start auto-flush timer
   */
  startAutoFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Get session analytics
   * @param {string} sessionId - Session ID
   * @returns {object} - Session analytics
   */
  getSessionAnalytics(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      duration: session.duration,
      pageViews: session.pageViews,
      eventCount: session.eventCount,
      startTime: new Date(session.startTime).toISOString(),
      endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
      events: session.events
    };
  }

  /**
   * Get user analytics
   * @param {string} userId - User ID
   * @returns {object} - User analytics
   */
  getUserAnalytics(userId) {
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId);

    const totalDuration = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPageViews = userSessions.reduce((sum, s) => sum + s.pageViews, 0);
    const totalEvents = userSessions.reduce((sum, s) => sum + s.eventCount, 0);

    return {
      userId,
      sessionCount: userSessions.length,
      totalDuration,
      totalPageViews,
      totalEvents,
      avgSessionDuration: totalDuration / userSessions.length,
      sessions: userSessions.map(s => ({
        sessionId: s.sessionId,
        duration: s.duration,
        pageViews: s.pageViews,
        eventCount: s.eventCount
      }))
    };
  }

  /**
   * Get feature usage statistics
   * @returns {object} - Feature usage stats
   */
  getFeatureUsageStats() {
    const featureUsage = {};

    this.events.forEach(event => {
      if (event.name === 'feature_usage') {
        const featureName = event.data.featureName;
        if (!featureUsage[featureName]) {
          featureUsage[featureName] = {
            count: 0,
            lastUsed: null,
            users: new Set()
          };
        }
        featureUsage[featureName].count++;
        featureUsage[featureName].lastUsed = event.timestamp;
        featureUsage[featureName].users.add(event.userId);
      }
    });

    // Convert to plain object
    const result = {};
    for (const [feature, data] of Object.entries(featureUsage)) {
      result[feature] = {
        count: data.count,
        lastUsed: new Date(data.lastUsed).toISOString(),
        uniqueUsers: data.users.size
      };
    }

    return result;
  }

  /**
   * Get error statistics
   * @returns {object} - Error stats
   */
  getErrorStats() {
    const errorStats = {};

    this.events.forEach(event => {
      if (event.name === 'error') {
        const errorType = event.data.errorType;
        if (!errorStats[errorType]) {
          errorStats[errorType] = {
            count: 0,
            lastOccurred: null,
            messages: []
          };
        }
        errorStats[errorType].count++;
        errorStats[errorType].lastOccurred = event.timestamp;
        if (errorStats[errorType].messages.length < 5) {
          errorStats[errorType].messages.push(event.data.message);
        }
      }
    });

    // Convert timestamps
    const result = {};
    for (const [errorType, data] of Object.entries(errorStats)) {
      result[errorType] = {
        count: data.count,
        lastOccurred: new Date(data.lastOccurred).toISOString(),
        messages: data.messages
      };
    }

    return result;
  }

  /**
   * Get conversion funnel
   * @param {array} steps - Conversion steps
   * @returns {object} - Funnel data
   */
  getConversionFunnel(steps) {
    const funnelData = {};

    steps.forEach((step, index) => {
      const stepEvents = this.events.filter(e => 
        e.name === 'conversion' && e.data.conversionType === step
      );
      
      funnelData[step] = {
        count: stepEvents.length,
        percentage: index === 0 ? 100 : 0
      };
    });

    // Calculate percentages
    const firstStepCount = funnelData[steps[0]].count;
    steps.forEach(step => {
      funnelData[step].percentage = (funnelData[step].count / firstStepCount) * 100;
    });

    return funnelData;
  }

  /**
   * Get analytics report
   * @returns {object} - Analytics report
   */
  getAnalyticsReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: this.events.length,
        totalSessions: this.sessions.size,
        totalUsers: new Set(Array.from(this.sessions.values()).map(s => s.userId)).size
      },
      featureUsage: this.getFeatureUsageStats(),
      errors: this.getErrorStats(),
      eventQueue: this.eventQueue.length
    };
  }

  /**
   * Enable/disable analytics
   * @param {boolean} enabled - Enable flag
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all analytics data
   */
  clearData() {
    this.events = [];
    this.sessions.clear();
    this.eventQueue = [];
    localStorage.removeItem('analyticsEvents');
    logger.info('Analytics data cleared');
  }

  /**
   * Generate session ID
   * @returns {string} - Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export analytics data
   * @returns {object} - Analytics data
   */
  exportData() {
    return {
      timestamp: new Date().toISOString(),
      events: this.events,
      sessions: Array.from(this.sessions.values()),
      report: this.getAnalyticsReport()
    };
  }
}

export default new UserAnalyticsService();
