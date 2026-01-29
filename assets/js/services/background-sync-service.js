/**
 * Background Sync Service
 * Implements Background Sync API for reliable offline-to-online data sync
 */

import logger from '../utils/logger.js';

class BackgroundSyncService {
  constructor() {
    this.syncTag = 'rupiya-sync';
    this.isSupported = 'serviceWorker' in navigator && 'SyncManager' in window;
    this.syncQueue = this.loadQueue();
    this.syncCallbacks = new Map();
    
    if (this.isSupported) {
      this.registerSyncHandler();
    } else {
      logger.warn('Background Sync API not supported, falling back to manual sync');
    }
  }

  /**
   * Check if Background Sync is supported
   */
  isBackgroundSyncSupported() {
    return this.isSupported;
  }

  /**
   * Register a sync operation
   * @param {Object} operation - Operation to sync
   * @returns {Promise<string>} Operation ID
   */
  async registerSync(operation) {
    const operationId = this.generateId();
    const queueItem = {
      id: operationId,
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    };

    // Add to queue
    this.syncQueue.push(queueItem);
    this.saveQueue();

    // Register with Background Sync API
    if (this.isSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(this.syncTag);
        logger.info(`Background sync registered: ${operationId}`);
      } catch (error) {
        logger.error('Failed to register background sync:', error);
        // Fall back to immediate sync attempt
        this.attemptSync();
      }
    } else {
      // Fall back to immediate sync attempt
      this.attemptSync();
    }

    return operationId;
  }

  /**
   * Register sync handler in service worker
   */
  registerSyncHandler() {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        this.handleSyncComplete(event.data.results);
      } else if (event.data.type === 'SYNC_FAILED') {
        this.handleSyncFailed(event.data.error);
      }
    });
  }

  /**
   * Attempt to sync all pending operations
   */
  async attemptSync() {
    if (!navigator.onLine) {
      logger.info('Offline, sync will retry when online');
      return;
    }

    const pendingOps = this.syncQueue.filter(op => op.status === 'pending');
    if (pendingOps.length === 0) {
      logger.info('No pending operations to sync');
      return;
    }

    logger.info(`Syncing ${pendingOps.length} operations`);

    const results = {
      success: [],
      failed: []
    };

    for (const operation of pendingOps) {
      try {
        await this.syncOperation(operation);
        operation.status = 'completed';
        results.success.push(operation.id);
        
        // Call success callback if registered
        const callback = this.syncCallbacks.get(operation.id);
        if (callback?.onSuccess) {
          callback.onSuccess(operation);
        }
      } catch (error) {
        operation.retries++;
        operation.lastError = error.message;
        
        // Max retries reached?
        if (operation.retries >= 3) {
          operation.status = 'failed';
          results.failed.push({
            id: operation.id,
            error: error.message
          });
          
          // Call error callback if registered
          const callback = this.syncCallbacks.get(operation.id);
          if (callback?.onError) {
            callback.onError(operation, error);
          }
        } else {
          logger.warn(`Sync failed for ${operation.id}, will retry (${operation.retries}/3)`);
        }
      }
    }

    // Remove completed operations
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    this.saveQueue();

    logger.info(`Sync complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Sync a single operation
   * @param {Object} operation - Operation to sync
   */
  async syncOperation(operation) {
    const { type, collection, docId, data } = operation;

    // Import Firestore service dynamically
    const { default: firestoreService } = await import('./firestore-service.js');

    switch (type) {
      case 'add':
        await firestoreService.add(collection, data);
        break;
      
      case 'update':
        await firestoreService.update(collection, docId, data);
        break;
      
      case 'delete':
        await firestoreService.delete(collection, docId);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    logger.debug(`Synced ${type} operation for ${collection}/${docId}`);
  }

  /**
   * Register callbacks for sync operation
   * @param {string} operationId - Operation ID
   * @param {Object} callbacks - Success and error callbacks
   */
  onSync(operationId, callbacks) {
    this.syncCallbacks.set(operationId, callbacks);
  }

  /**
   * Handle sync completion from service worker
   */
  handleSyncComplete(results) {
    logger.info('Background sync completed', results);
    
    // Update queue status
    results.success?.forEach(id => {
      const op = this.syncQueue.find(o => o.id === id);
      if (op) {
        op.status = 'completed';
      }
    });

    // Remove completed operations
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    this.saveQueue();
  }

  /**
   * Handle sync failure from service worker
   */
  handleSyncFailed(error) {
    logger.error('Background sync failed', error);
  }

  /**
   * Get pending operations count
   */
  getPendingCount() {
    return this.syncQueue.filter(op => op.status === 'pending').length;
  }

  /**
   * Get all pending operations
   */
  getPendingOperations() {
    return this.syncQueue.filter(op => op.status === 'pending');
  }

  /**
   * Clear completed operations
   */
  clearCompleted() {
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'completed');
    this.saveQueue();
  }

  /**
   * Clear all operations
   */
  clearAll() {
    this.syncQueue = [];
    this.saveQueue();
  }

  /**
   * Load queue from storage
   */
  loadQueue() {
    try {
      const stored = localStorage.getItem('rupiya_sync_queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to load sync queue:', error);
      return [];
    }
  }

  /**
   * Save queue to storage
   */
  saveQueue() {
    try {
      localStorage.setItem('rupiya_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get sync statistics
   */
  getStats() {
    const pending = this.syncQueue.filter(op => op.status === 'pending').length;
    const failed = this.syncQueue.filter(op => op.status === 'failed').length;
    const completed = this.syncQueue.filter(op => op.status === 'completed').length;

    return {
      total: this.syncQueue.length,
      pending,
      failed,
      completed,
      isSupported: this.isSupported,
      isOnline: navigator.onLine
    };
  }
}

// Create singleton instance
const backgroundSyncService = new BackgroundSyncService();

// Auto-sync when coming online
window.addEventListener('online', () => {
  backgroundSyncService.attemptSync();
});

export default backgroundSyncService;
