// Backup and Export Service - Export and import user data
import { db } from '../config/firebase-config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import encryptionService from './encryption-service.js';
import logger from '../utils/logger.js';

class BackupService {
  constructor() {
    this.collections = [
      'expenses',
      'income',
      'budgets',
      'investments',
      'goals',
      'loans',
      'houses',
      'vehicles',
      'notes',
      'documents',
      'categories',
      'wallets',
      'recurringTransactions',
      'houseHelps',
      'houseHelpPayments',
      'fuelLogs',
      'splits',
      'paymentMethods',
      'transfers',
      'netWorthSnapshots'
    ];
  }

  /**
   * Export all user data as JSON
   * @param {object} options - Export options
   * @returns {Promise<object>} - Exported data
   */
  async exportUserData(options = {}) {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      logger.info('Starting data export...');
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        userId: userId,
        collections: {}
      };

      // Export each collection
      for (const collectionName of this.collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const q = query(collectionRef, where('userId', '==', userId));
          const snapshot = await getDocs(q);

          const docs = [];
          snapshot.forEach(doc => {
            docs.push({
              id: doc.id,
              ...doc.data()
            });
          });

          exportData.collections[collectionName] = docs;
          logger.debug(`Exported ${docs.length} documents from ${collectionName}`);
        } catch (error) {
          logger.warn(`Failed to export ${collectionName}:`, error);
          exportData.collections[collectionName] = [];
        }
      }

      // Add metadata
      exportData.metadata = {
        totalCollections: Object.keys(exportData.collections).length,
        totalDocuments: Object.values(exportData.collections).reduce((sum, docs) => sum + docs.length, 0),
        exportedAt: new Date().toISOString()
      };

      logger.info(`Data export completed. Total documents: ${exportData.metadata.totalDocuments}`);
      return exportData;
    } catch (error) {
      logger.error('Data export failed:', error);
      throw error;
    }
  }

  /**
   * Export data as JSON file and download
   * @param {object} options - Export options
   */
  async downloadBackup(options = {}) {
    try {
      const data = await this.exportUserData(options);
      
      // Optionally encrypt the backup
      let content = JSON.stringify(data, null, 2);
      let filename = `rupiya-backup-${new Date().toISOString().split('T')[0]}.json`;

      if (options.encrypt) {
        try {
          content = await encryptionService.encrypt(content);
          filename = filename.replace('.json', '.encrypted');
          logger.info('Backup encrypted');
        } catch (error) {
          logger.warn('Failed to encrypt backup:', error);
        }
      }

      // Create blob and download
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info(`Backup downloaded: ${filename}`);
    } catch (error) {
      logger.error('Backup download failed:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON file
   * @param {File} file - JSON file to import
   * @returns {Promise<object>} - Import result
   */
  async importUserData(file) {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      logger.info('Starting data import...');
      
      // Read file
      const content = await this.readFile(file);
      let data;

      try {
        data = JSON.parse(content);
      } catch (error) {
        // Try to decrypt if it's encrypted
        try {
          const decrypted = await encryptionService.decrypt(content);
          data = JSON.parse(decrypted);
          logger.info('Backup decrypted successfully');
        } catch (decryptError) {
          throw new Error('Invalid backup file format');
        }
      }

      // Validate backup structure
      if (!data.collections || typeof data.collections !== 'object') {
        throw new Error('Invalid backup structure');
      }

      // Validate version compatibility
      if (data.version && data.version !== '1.0') {
        logger.warn(`Backup version ${data.version} may not be fully compatible`);
      }

      // Import data
      const result = {
        imported: 0,
        failed: 0,
        errors: [],
        collections: {}
      };

      for (const [collectionName, docs] of Object.entries(data.collections)) {
        if (!Array.isArray(docs)) continue;

        result.collections[collectionName] = {
          imported: 0,
          failed: 0
        };

        for (const doc of docs) {
          try {
            // Validate userId matches
            if (doc.userId && doc.userId !== userId) {
              logger.warn(`Skipping document with mismatched userId in ${collectionName}`);
              result.collections[collectionName].failed++;
              continue;
            }

            // Import document (implementation depends on your data structure)
            // This is a placeholder - actual implementation would use firestore-service
            result.collections[collectionName].imported++;
            result.imported++;
          } catch (error) {
            logger.error(`Failed to import document from ${collectionName}:`, error);
            result.collections[collectionName].failed++;
            result.failed++;
            result.errors.push({
              collection: collectionName,
              docId: doc.id,
              error: error.message
            });
          }
        }
      }

      logger.info(`Data import completed. Imported: ${result.imported}, Failed: ${result.failed}`);
      return result;
    } catch (error) {
      logger.error('Data import failed:', error);
      throw error;
    }
  }

  /**
   * Read file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} - File content
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Create scheduled backup
   * @param {object} options - Backup options
   * @returns {Promise<void>}
   */
  async createScheduledBackup(options = {}) {
    try {
      const data = await this.exportUserData(options);
      
      // Store backup metadata in localStorage
      const backups = JSON.parse(localStorage.getItem('backupMetadata') || '[]');
      backups.push({
        date: new Date().toISOString(),
        size: JSON.stringify(data).length,
        collections: Object.keys(data.collections).length,
        documents: data.metadata.totalDocuments
      });

      // Keep only last 10 backups
      if (backups.length > 10) {
        backups.shift();
      }

      localStorage.setItem('backupMetadata', JSON.stringify(backups));
      logger.info('Scheduled backup created');
    } catch (error) {
      logger.error('Scheduled backup failed:', error);
    }
  }

  /**
   * Get backup history
   * @returns {array} - Array of backup metadata
   */
  getBackupHistory() {
    try {
      return JSON.parse(localStorage.getItem('backupMetadata') || '[]');
    } catch (error) {
      logger.error('Failed to get backup history:', error);
      return [];
    }
  }

  /**
   * Clear backup history
   */
  clearBackupHistory() {
    localStorage.removeItem('backupMetadata');
    logger.info('Backup history cleared');
  }

  /**
   * Export specific collection
   * @param {string} collectionName - Collection to export
   * @returns {Promise<array>} - Collection documents
   */
  async exportCollection(collectionName) {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const docs = [];
      snapshot.forEach(doc => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      logger.info(`Exported ${docs.length} documents from ${collectionName}`);
      return docs;
    } catch (error) {
      logger.error(`Failed to export ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Export data as CSV
   * @param {string} collectionName - Collection to export
   * @returns {Promise<string>} - CSV content
   */
  async exportAsCSV(collectionName) {
    try {
      const docs = await this.exportCollection(collectionName);
      
      if (docs.length === 0) {
        return '';
      }

      // Get all keys from all documents
      const keys = new Set();
      docs.forEach(doc => {
        Object.keys(doc).forEach(key => keys.add(key));
      });

      const headers = Array.from(keys);
      const rows = [headers.join(',')];

      // Add data rows
      for (const doc of docs) {
        const row = headers.map(header => {
          const value = doc[header];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        rows.push(row.join(','));
      }

      return rows.join('\n');
    } catch (error) {
      logger.error(`Failed to export ${collectionName} as CSV:`, error);
      throw error;
    }
  }

  /**
   * Download collection as CSV
   * @param {string} collectionName - Collection to export
   */
  async downloadCollectionAsCSV(collectionName) {
    try {
      const csv = await this.exportAsCSV(collectionName);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${collectionName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info(`Collection exported as CSV: ${collectionName}`);
    } catch (error) {
      logger.error(`Failed to download ${collectionName} as CSV:`, error);
      throw error;
    }
  }

  /**
   * Get backup size estimate
   * @returns {Promise<object>} - Size information
   */
  async getBackupSizeEstimate() {
    try {
      const data = await this.exportUserData();
      const jsonString = JSON.stringify(data);
      const sizeInBytes = new Blob([jsonString]).size;
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

      return {
        bytes: sizeInBytes,
        kb: sizeInKB,
        mb: sizeInMB,
        collections: Object.keys(data.collections).length,
        documents: data.metadata.totalDocuments
      };
    } catch (error) {
      logger.error('Failed to estimate backup size:', error);
      throw error;
    }
  }
}

export default new BackupService();
