// Gemini API Key Management Service
// Handles secure storage and retrieval of user's Gemini API keys
// Keys are encrypted using the same encryption service as other sensitive data

import { db, auth } from '../config/firebase-config.js';
import { collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import encryptionService from './encryption-service.js';
import logger from '../utils/logger.js';

const log = logger.create('GeminiKeyService');

class GeminiKeyService {
  constructor() {
    this.COLLECTION_NAME = 'userGeminiKeys';
    this.USAGE_COLLECTION_NAME = 'geminiUsage';
  }

  /**
   * Store user's Gemini API key securely
   * Key is encrypted before storing in Firestore
   * @param {string} apiKey - The Gemini API key to store
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async storeUserKey(apiKey) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Validate API key format (basic validation)
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('Invalid API key format');
      }

      // Ensure encryption is initialized
      const encryptionReady = await encryptionService.waitForInitialization();
      if (!encryptionReady) {
        throw new Error('Encryption service not ready');
      }

      log.log(`Storing Gemini API key for user: ${userId}`);

      // Encrypt the API key
      const encryptedKey = await encryptionService.encryptValue(apiKey);
      
      if (!encryptedKey) {
        throw new Error('Failed to encrypt API key');
      }

      // Store encrypted key in Firestore
      const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
      
      await setDoc(keyDocRef, {
        userId,
        encryptedKey: encryptedKey,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        usageCount: 0,
        lastUsed: null,
        lastValidated: serverTimestamp()
      });

      log.log('✅ Gemini API key stored successfully');
      return {
        success: true,
        message: 'API key stored securely'
      };
    } catch (error) {
      log.error('Error storing Gemini API key:', error);
      return {
        success: false,
        message: error.message || 'Failed to store API key'
      };
    }
  }

  /**
   * Retrieve and decrypt user's Gemini API key
   * Only the authenticated user can retrieve their own key
   * @returns {Promise<string|null>} - Decrypted API key or null if not found
   */
  async getUserKey() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Ensure encryption is initialized
      const encryptionReady = await encryptionService.waitForInitialization();
      if (!encryptionReady) {
        throw new Error('Encryption service not ready');
      }

      log.log(`Retrieving Gemini API key for user: ${userId}`);

      const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
      const keyDoc = await getDoc(keyDocRef);

      if (!keyDoc.exists()) {
        log.log('No Gemini API key found for user');
        return null;
      }

      const data = keyDoc.data();

      // Verify the key is active
      if (!data.isActive) {
        log.warn('Gemini API key is inactive');
        return null;
      }

      // Decrypt the API key
      const decryptedKey = await encryptionService.decryptValue(data.encryptedKey);

      if (!decryptedKey) {
        throw new Error('Failed to decrypt API key');
      }

      log.log('✅ Gemini API key retrieved and decrypted');
      return decryptedKey;
    } catch (error) {
      log.error('Error retrieving Gemini API key:', error);
      return null;
    }
  }

  /**
   * Check if user has a stored Gemini API key
   * @returns {Promise<boolean>}
   */
  async hasUserKey() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return false;
      }

      const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
      const keyDoc = await getDoc(keyDocRef);

      return keyDoc.exists() && keyDoc.data().isActive === true;
    } catch (error) {
      log.error('Error checking for Gemini API key:', error);
      return false;
    }
  }

  /**
   * Delete user's Gemini API key
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteUserKey() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      log.log(`Deleting Gemini API key for user: ${userId}`);

      const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(keyDocRef);

      log.log('✅ Gemini API key deleted successfully');
      return {
        success: true,
        message: 'API key deleted'
      };
    } catch (error) {
      log.error('Error deleting Gemini API key:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete API key'
      };
    }
  }

  /**
   * Get key status and usage statistics
   * @returns {Promise<Object|null>}
   */
  async getKeyStatus() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
      const keyDoc = await getDoc(keyDocRef);

      if (!keyDoc.exists()) {
        return null;
      }

      const data = keyDoc.data();
      const today = new Date().toISOString().split('T')[0];

      // Get today's usage
      const usageQuery = query(
        collection(db, this.USAGE_COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '==', today)
      );

      const usageDocs = await getDocs(usageQuery);
      let todayUsage = 0;
      let todayTokens = 0;

      usageDocs.forEach(doc => {
        todayUsage += doc.data().requestCount || 0;
        todayTokens += doc.data().tokenCount || 0;
      });

      return {
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.() || null,
        lastUsed: data.lastUsed?.toDate?.() || null,
        lastValidated: data.lastValidated?.toDate?.() || null,
        totalUsageCount: data.usageCount || 0,
        todayRequestCount: todayUsage,
        todayTokenCount: todayTokens,
        estimatedDailyCost: (todayTokens * 0.00000075).toFixed(6) // Rough estimate
      };
    } catch (error) {
      log.error('Error getting key status:', error);
      return null;
    }
  }

  /**
   * Update usage statistics (called by backend after API call)
   * @param {number} inputTokens - Number of input tokens used
   * @param {number} outputTokens - Number of output tokens used
   * @returns {Promise<void>}
   */
  async recordUsage(inputTokens, outputTokens) {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const usageDocRef = doc(db, this.USAGE_COLLECTION_NAME, `${userId}_${today}`);

      const usageDoc = await getDoc(usageDocRef);
      const totalTokens = inputTokens + outputTokens;
      const estimatedCost = (totalTokens * 0.00000075); // Rough estimate

      if (usageDoc.exists()) {
        // Update existing usage record
        await updateDoc(usageDocRef, {
          requestCount: (usageDoc.data().requestCount || 0) + 1,
          tokenCount: (usageDoc.data().tokenCount || 0) + totalTokens,
          estimatedCost: (usageDoc.data().estimatedCost || 0) + estimatedCost,
          lastRequest: serverTimestamp()
        });
      } else {
        // Create new usage record
        await setDoc(usageDocRef, {
          userId,
          date: today,
          requestCount: 1,
          tokenCount: totalTokens,
          estimatedCost,
          lastRequest: serverTimestamp()
        });
      }

      // Update key's usage count
      const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
      await updateDoc(keyDocRef, {
        usageCount: (await getDoc(keyDocRef)).data().usageCount + 1,
        lastUsed: serverTimestamp()
      });

      log.log(`Usage recorded: ${totalTokens} tokens`);
    } catch (error) {
      log.error('Error recording usage:', error);
      // Don't throw - usage recording shouldn't break the app
    }
  }

  /**
   * Validate API key by making a test call to Gemini
   * @returns {Promise<{valid: boolean, message: string}>}
   */
  async validateApiKey() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      log.log('Validating Gemini API key...');

      // Get the user's Firebase ID token
      const idToken = await auth.currentUser.getIdToken();

      // Call backend validation endpoint
      const response = await fetch('/api/gemini-validate-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Validation failed');
      }

      const result = await response.json();

      if (result.valid) {
        // Update last validated timestamp
        const keyDocRef = doc(db, this.COLLECTION_NAME, userId);
        await updateDoc(keyDocRef, {
          lastValidated: serverTimestamp()
        });

        log.log('✅ API key is valid');
      }

      return result;
    } catch (error) {
      log.error('Error validating API key:', error);
      return {
        valid: false,
        message: error.message || 'Validation failed'
      };
    }
  }
}

// Export singleton instance
export default new GeminiKeyService();
