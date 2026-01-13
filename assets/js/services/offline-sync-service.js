// Offline Data Sync Service - Sync data when back online
import logger from '../utils/logger.js';

class OfflineSyncService {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.isOnline = navigator.onLine;
    this.lastSyncTime = null;
    this.syncInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.retryDelays = [1000, 5000, 10000]; // Exponential backoff
    this.conflictResolution = 'last-write-wins'; // or 'manual'
    this.syncCallbacks = [];
    
    this.setupEventListeners();
    this.startSyncTimer();
  }

  /**
   * Setup online/offline event listeners
   */
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('App is online');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.info('App is offline');
    });
  }

  /**
   * Start sync timer
   */
  startSyncTimer() {
    setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    }, this.syncInterval);
  }

  /**
   * Queue operation for sync
   * @param {string} operation - Operation type (add, update, delete)
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   * @param {object} data - Document data
   * @param {object} metadata - Operation metadata
   */
  queueOperation(operation, collection, docId, data, metadata = {}) {
    const queueItem = {
      id: this.generateId(),
      operation,
      collection,
      docId,
      data,
      metadata,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      error: null
    };

    this.syncQueue.push(queueItem);
    this.persistQueue();

    logger.debug(`Operation queued: ${operation} ${collection}/${docId}`);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncAll();
    }

    return queueItem.id;
  }

  /**
   * Sync all queued operations
   * @returns {Promise<object>} - Sync result
   */
  async syncAll() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    const result = { synced: 0, failed: 0, errors: [] };

    try {
      for (const item of this.syncQueue) {
        if (item.status === 'pending') {
          const syncResult = await this.syncItem(item);
          if (syncResult.success) {
            result.synced++;
            item.status = 'synced';
          } else {
            result.failed++;
            result.errors.push(syncResult.error);
          }
        }
      }

      // Remove synced items
      this.syncQueue = this.syncQueue.filter(item => item.status !== 'synced');
      this.persistQueue();
      this.lastSyncTime = Date.now();

      logger.info(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
      this.notifySyncCallbacks(result);
    } catch (error) {
      logger.error('Sync failed:', error);
      result.errors.push(error.message);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync single item
   * @param {object} item - Queue item
   * @returns {Promise<object>} - Sync result
   */
  async syncItem(item) {
    try {
      // This would be implemented with your actual sync logic
      // For now, we'll simulate the sync
      await this.performSync(item);
      
      logger.debug(`Item synced: ${item.id}`);
      return { success: true };
    } catch (error) {
      item.retries++;

      if (item.retries < this.maxRetries) {
        const delay = this.retryDelays[item.retries - 1];
        logger.warn(`Sync failed, retrying in ${delay}ms:`, error);
        
        setTimeout(() => {
          this.syncItem(item);
        }, delay);

        return { success: false, error: error.message };
      } else {
        item.status = 'failed';
        item.error = error.message;
        logger.error(`Item sync failed after ${this.maxRetries} retries:`, error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Perform sync operation
   * @param {object} item - Queue item
   * @returns {Promise<void>}
   */
  async performSync(item) {
    // This is a placeholder - implement with your actual sync logic
    // Example: call your backend API or Firestore
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate sync operation
        if (Math.random() > 0.1) { // 90% success rate for demo
          resolve();
        } else {
          reject(new Error('Sync operation failed'));
        }
      }, 100);
    });
  }

  /**
   * Get sync queue
   * @returns {array} - Sync queue
   */
  getSyncQueue() {
    return this.syncQueue;
  }

  /**
   * Get pending operations count
   * @returns {number} - Pending count
   */
  getPendingCount() {
    return this.syncQueue.filter(item => item.status === 'pending').length;
  }

  /**
   * Get failed operations count
   * @returns {number} - Failed count
   */
  getFailedCount() {
    return this.syncQueue.filter(item => item.status === 'failed').length;
  }

  /**
   * Retry failed operations
   * @returns {Promise<object>} - Retry result
   */
  async retryFailed() {
    const failedItems = this.syncQueue.filter(item => item.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
      item.retries = 0;
      item.error = null;
    }

    this.persistQueue();
    return this.syncAll();
  }

  /**
   * Clear sync queue
   */
  clearQueue() {
    this.syncQueue = [];
    this.persistQueue();
    logger.info('Sync queue cleared');
  }

  /**
   * Remove item from queue
   * @param {string} itemId - Item ID
   */
  removeFromQueue(itemId) {
    this.syncQueue = this.syncQueue.filter(item => item.id !== itemId);
    this.persistQueue();
  }

  /**
   * Persist queue to localStorage
   */
  persistQueue() {
    try {
      localStorage.setItem('offlineSyncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('Failed to persist sync queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const stored = localStorage.getItem('offlineSyncQueue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        logger.info(`Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      logger.error('Failed to load sync queue:', error);
    }
  }

  /**
   * Handle conflict
   * @param {object} localData - Local data
   * @param {object} remoteData - Remote data
   * @returns {object} - Resolved data
   */
  resolveConflict(localData, remoteData) {
    if (this.conflictResolution === 'last-write-wins') {
      return localData.timestamp > remoteData.timestamp ? localData : remoteData;
    } else if (this.conflictResolution === 'manual') {
      // Return both for manual resolution
      return { local: localData, remote: remoteData };
    }
    return localData;
  }

  /**
   * Set conflict resolution strategy
   * @param {string} strategy - Strategy name
   */
  setConflictResolution(strategy) {
    this.conflictResolution = strategy;
    logger.info(`Conflict resolution strategy set to: ${strategy}`);
  }

  /**
   * Register sync callback
   * @param {function} callback - Callback function
   */
  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Notify sync callbacks
   * @param {object} result - Sync result
   */
  notifySyncCallbacks(result) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        logger.error('Sync callback error:', error);
      }
    });
  }

  /**
   * Get sync status
   * @returns {object} - Sync status
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime ? new Date(this.lastSyncTime).toISOString() : null,
      pendingCount: this.getPendingCount(),
      failedCount: this.getFailedCount(),
      queueSize: this.syncQueue.length,
      conflictResolution: this.conflictResolution
    };
  }

  /**
   * Generate unique ID
   * @returns {string} - Unique ID
   */
  generateId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export sync data
   * @returns {object} - Sync data
   */
  exportData() {
    return {
      timestamp: new Date().toISOString(),
      status: this.getSyncStatus(),
      queue: this.syncQueue,
      stats: {
        total: this.syncQueue.length,
        pending: this.getPendingCount(),
        failed: this.getFailedCount(),
        synced: this.syncQueue.filter(item => item.status === 'synced').length
      }
    };
  }

  /**
   * Get sync statistics
   * @returns {object} - Sync statistics
   */
  getSyncStats() {
    const stats = {
      total: this.syncQueue.length,
      pending: this.getPendingCount(),
      failed: this.getFailedCount(),
      synced: this.syncQueue.filter(item => item.status === 'synced').length,
      byOperation: {},
      byCollection: {}
    };

    this.syncQueue.forEach(item => {
      // Count by operation
      if (!stats.byOperation[item.operation]) {
        stats.byOperation[item.operation] = 0;
      }
      stats.byOperation[item.operation]++;

      // Count by collection
      if (!stats.byCollection[item.collection]) {
        stats.byCollection[item.collection] = 0;
      }
      stats.byCollection[item.collection]++;
    });

    return stats;
  }
}

export default new OfflineSyncService();
