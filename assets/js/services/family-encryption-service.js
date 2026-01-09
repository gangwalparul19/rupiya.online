/**
 * Family Encryption Service
 * 
 * Manages shared encryption keys for family groups.
 * Each family group has a shared key that all members can use to
 * encrypt/decrypt family-shared data.
 * 
 * How it works:
 * 1. When a family group is created, a random shared key is generated
 * 2. The shared key is encrypted with the creator's personal key and stored
 * 3. When a member joins, the shared key is re-encrypted with their key too
 * 4. Family data uses this shared key for encryption/decryption
 */

import { db } from '../config/firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import encryptionService from './encryption-service.js';
import logger from '../utils/logger.js';

const log = logger.create('FamilyEncryption');

class FamilyEncryptionService {
  constructor() {
    this.familyKeys = new Map(); // Cache: groupId -> CryptoKey
    this.KEY_LENGTH = 256;
  }

  /**
   * Generate a new random encryption key for a family group
   */
  async generateFamilyKey() {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true, // extractable - needed to encrypt and store
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export a CryptoKey to base64 string
   */
  async exportKey(key) {
    const rawKey = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  }

  /**
   * Import a base64 string back to CryptoKey
   */
  async importKey(base64Key) {
    const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt the family key with a user's personal encryption
   */
  async encryptFamilyKeyForUser(familyKey) {
    if (!encryptionService.isReady()) {
      throw new Error('Personal encryption not initialized');
    }
    
    const exportedKey = await this.exportKey(familyKey);
    return await encryptionService.encryptValue(exportedKey);
  }

  /**
   * Decrypt the family key using user's personal encryption
   */
  async decryptFamilyKeyForUser(encryptedKey) {
    if (!encryptionService.isReady()) {
      throw new Error('Personal encryption not initialized');
    }
    
    const exportedKey = await encryptionService.decryptValue(encryptedKey);
    return await this.importKey(exportedKey);
  }

  /**
   * Create and store a new family key when a group is created
   */
  async createFamilyKey(groupId) {
    try {
      const userId = authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Generate new family key
      const familyKey = await this.generateFamilyKey();
      
      // Encrypt with creator's personal key
      const encryptedKey = await this.encryptFamilyKeyForUser(familyKey);
      
      // Store in Firestore
      const keyDocRef = doc(db, 'familyKeys', groupId);
      await setDoc(keyDocRef, {
        groupId,
        memberKeys: {
          [userId]: encryptedKey
        },
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Cache the key
      this.familyKeys.set(groupId, familyKey);
      
      log.log(`Created family key for group ${groupId}`);
      return familyKey;
    } catch (error) {
      log.error('Error creating family key:', error);
      throw error;
    }
  }

  /**
   * Add a new member's encrypted key to the family group
   * Called when a user joins a family group
   */
  async addMemberToFamilyKey(groupId, newMemberUserId) {
    try {
      const currentUserId = authService.getCurrentUser()?.uid;
      if (!currentUserId) throw new Error('User not authenticated');

      // Get the family key (current user must have access)
      const familyKey = await this.getFamilyKey(groupId);
      if (!familyKey) {
        throw new Error('Cannot access family key');
      }

      // If adding ourselves, encrypt with our key
      if (newMemberUserId === currentUserId) {
        const encryptedKey = await this.encryptFamilyKeyForUser(familyKey);
        
        const keyDocRef = doc(db, 'familyKeys', groupId);
        await updateDoc(keyDocRef, {
          [`memberKeys.${newMemberUserId}`]: encryptedKey,
          updatedAt: Timestamp.now()
        });
        
        log.log(`Added member ${newMemberUserId} to family key for group ${groupId}`);
      }
      
      return true;
    } catch (error) {
      log.error('Error adding member to family key:', error);
      throw error;
    }
  }

  /**
   * Get the family key for a group
   */
  async getFamilyKey(groupId) {
    try {
      // Check cache first
      if (this.familyKeys.has(groupId)) {
        return this.familyKeys.get(groupId);
      }

      const userId = authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Get from Firestore
      const keyDocRef = doc(db, 'familyKeys', groupId);
      const keyDoc = await getDoc(keyDocRef);
      
      if (!keyDoc.exists()) {
        log.warn(`No family key found for group ${groupId}`);
        return null;
      }

      const data = keyDoc.data();
      const encryptedKey = data.memberKeys?.[userId];
      
      if (!encryptedKey) {
        log.warn(`User ${userId} does not have access to family key for group ${groupId}`);
        return null;
      }

      // Decrypt with user's personal key
      const familyKey = await this.decryptFamilyKeyForUser(encryptedKey);
      
      // Cache it
      this.familyKeys.set(groupId, familyKey);
      
      return familyKey;
    } catch (error) {
      log.error('Error getting family key:', error);
      return null;
    }
  }

  /**
   * Encrypt data using family key
   */
  async encryptWithFamilyKey(data, groupId) {
    const familyKey = await this.getFamilyKey(groupId);
    if (!familyKey) {
      throw new Error('Cannot access family encryption key');
    }

    // Skip null, undefined, and empty strings
    if (data === null || data === undefined || data === '') {
      return data;
    }

    try {
      const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(stringValue);
      
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        familyKey,
        encodedData
      );

      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      log.error('Family encrypt error:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using family key
   */
  async decryptWithFamilyKey(encryptedValue, groupId) {
    const familyKey = await this.getFamilyKey(groupId);
    if (!familyKey) {
      throw new Error('Cannot access family encryption key');
    }

    if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
      return encryptedValue;
    }

    if (typeof encryptedValue !== 'string' || encryptedValue.length < 20) {
      return encryptedValue;
    }

    try {
      let combined;
      try {
        combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
      } catch (base64Error) {
        return encryptedValue;
      }
      
      if (combined.length < 29) {
        return encryptedValue;
      }
      
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        familyKey,
        encryptedData
      );

      const decryptedString = new TextDecoder().decode(decryptedData);
      
      try {
        return JSON.parse(decryptedString);
      } catch {
        if (!isNaN(decryptedString) && decryptedString.trim() !== '') {
          return parseFloat(decryptedString);
        }
        return decryptedString;
      }
    } catch (error) {
      log.error('Family decrypt error:', error);
      throw error;
    }
  }

  /**
   * Encrypt an object for family sharing
   */
  async encryptFamilyObject(data, groupId, sensitiveFields = []) {
    if (!data || !groupId) return data;

    try {
      const encryptedData = { ...data };
      const encryptedFields = {};

      // Default sensitive fields for expenses/income
      const fieldsToEncrypt = sensitiveFields.length > 0 ? sensitiveFields : [
        'amount', 'description', 'notes', 'merchant', 'location',
        'source', 'paymentMethod'
      ];

      for (const field of fieldsToEncrypt) {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          encryptedFields[field] = await this.encryptWithFamilyKey(data[field], groupId);
          delete encryptedData[field];
        }
      }

      if (Object.keys(encryptedFields).length > 0) {
        encryptedData._familyEncrypted = encryptedFields;
        encryptedData._familyGroupId = groupId;
      }

      return encryptedData;
    } catch (error) {
      log.error('Error encrypting family object:', error);
      return data;
    }
  }

  /**
   * Decrypt an object that was encrypted for family sharing
   */
  async decryptFamilyObject(data) {
    if (!data || !data._familyEncrypted || !data._familyGroupId) {
      return data;
    }

    try {
      const groupId = data._familyGroupId;
      const decryptedData = { ...data };
      delete decryptedData._familyEncrypted;
      delete decryptedData._familyGroupId;

      for (const [field, encryptedValue] of Object.entries(data._familyEncrypted)) {
        try {
          decryptedData[field] = await this.decryptWithFamilyKey(encryptedValue, groupId);
        } catch (fieldError) {
          log.warn(`Failed to decrypt family field ${field}:`, fieldError);
          decryptedData[field] = '[Decryption Failed]';
        }
      }

      return decryptedData;
    } catch (error) {
      log.error('Error decrypting family object:', error);
      return data;
    }
  }

  /**
   * Decrypt an array of family-encrypted objects
   */
  async decryptFamilyArray(dataArray) {
    if (!Array.isArray(dataArray)) return dataArray;
    
    const results = [];
    for (const item of dataArray) {
      results.push(await this.decryptFamilyObject(item));
    }
    return results;
  }

  /**
   * Clear cached keys (on logout)
   */
  clear() {
    this.familyKeys.clear();
    log.log('Family encryption keys cleared');
  }
}

// Create and export singleton
const familyEncryptionService = new FamilyEncryptionService();
export default familyEncryptionService;
