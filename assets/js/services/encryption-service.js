// Encryption Service - Client-side encryption using Web Crypto API
// Uses AES-GCM for encryption with PBKDF2 for key derivation

import privacyConfig from '../config/privacy-config.js';

class EncryptionService {
  constructor() {
    this.encryptionKey = null;
    this.salt = null;
    this.isInitialized = false;
    this.SALT_KEY = 'rupiya_encryption_salt';
    this.PBKDF2_ITERATIONS = 100000;
    this.KEY_LENGTH = 256;
  }

  // Initialize encryption with user's password
  async initialize(password, userId) {
    if (!password || !userId) {
      console.warn('[Encryption] Cannot initialize without password and userId');
      return false;
    }

    try {
      // Get or create salt for this user
      this.salt = await this.getOrCreateSalt(userId);
      
      // Derive encryption key from password
      this.encryptionKey = await this.deriveKey(password, this.salt);
      this.isInitialized = true;
      
      console.log('[Encryption] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Encryption] Initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Get or create salt for user
  async getOrCreateSalt(userId) {
    const saltKey = `${this.SALT_KEY}_${userId}`;
    let saltBase64 = localStorage.getItem(saltKey);
    
    if (saltBase64) {
      // Convert base64 back to Uint8Array
      return Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    }
    
    // Generate new salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Store as base64
    saltBase64 = btoa(String.fromCharCode(...salt));
    localStorage.setItem(saltKey, saltBase64);
    
    return salt;
  }

  // Derive encryption key from password using PBKDF2
  async deriveKey(password, salt) {
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-GCM key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Check if encryption is ready
  isReady() {
    return this.isInitialized && this.encryptionKey !== null;
  }

  // Clear encryption keys (on logout)
  clear() {
    this.encryptionKey = null;
    this.salt = null;
    this.isInitialized = false;
    console.log('[Encryption] Keys cleared');
  }


  // Encrypt a string value
  async encryptValue(value) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized');
    }

    if (value === null || value === undefined) {
      return value;
    }

    try {
      // Convert value to string if needed
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Generate random IV for each encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encodedData = new TextEncoder().encode(stringValue);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        this.encryptionKey,
        encodedData
      );

      // Combine IV and encrypted data, then encode as base64
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('[Encryption] Encrypt error:', error);
      throw error;
    }
  }

  // Decrypt a string value
  async decryptValue(encryptedValue) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized');
    }

    if (encryptedValue === null || encryptedValue === undefined) {
      return encryptedValue;
    }

    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this.encryptionKey,
        encryptedData
      );

      const decryptedString = new TextDecoder().decode(decryptedData);
      
      // Try to parse as JSON, return as-is if not JSON
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      console.error('[Encryption] Decrypt error:', error);
      throw error;
    }
  }

  // Encrypt an object (only sensitive fields)
  async encryptObject(data, collectionName) {
    if (!privacyConfig.encryptionEnabled) {
      return data;
    }

    if (!this.isReady()) {
      console.warn('[Encryption] Not initialized, storing data unencrypted');
      return data;
    }

    // Check if this collection should be encrypted
    if (!privacyConfig.encryptedCollections.includes(collectionName)) {
      return data;
    }

    try {
      const encryptedData = { ...data };
      const sensitiveFields = privacyConfig.sensitiveFields[collectionName] || [];
      const encryptedFields = {};

      // Encrypt each sensitive field
      for (const field of sensitiveFields) {
        if (data[field] !== undefined && data[field] !== null) {
          encryptedFields[field] = await this.encryptValue(data[field]);
          delete encryptedData[field];
        }
      }

      // Also encrypt any field not in unencryptedFields list
      for (const [key, value] of Object.entries(data)) {
        if (!privacyConfig.unencryptedFields.includes(key) && 
            !sensitiveFields.includes(key) &&
            value !== undefined && 
            value !== null &&
            typeof value !== 'object') {
          encryptedFields[key] = await this.encryptValue(value);
          delete encryptedData[key];
        }
      }

      // Add encrypted data container
      if (Object.keys(encryptedFields).length > 0) {
        encryptedData._encrypted = encryptedFields;
        encryptedData._encryptionVersion = privacyConfig.encryptionVersion;
      }

      return encryptedData;
    } catch (error) {
      console.error('[Encryption] Object encryption failed:', error);
      // Return original data if encryption fails
      return data;
    }
  }

  // Decrypt an object
  async decryptObject(data, collectionName) {
    if (!privacyConfig.encryptionEnabled) {
      return data;
    }

    // If no encrypted data, return as-is
    if (!data._encrypted) {
      return data;
    }

    if (!this.isReady()) {
      console.warn('[Encryption] Not initialized, cannot decrypt data');
      return data;
    }

    try {
      const decryptedData = { ...data };
      delete decryptedData._encrypted;
      delete decryptedData._encryptionVersion;

      // Decrypt each encrypted field
      for (const [field, encryptedValue] of Object.entries(data._encrypted)) {
        try {
          decryptedData[field] = await this.decryptValue(encryptedValue);
        } catch (fieldError) {
          console.warn(`[Encryption] Failed to decrypt field ${field}:`, fieldError);
          // Keep encrypted value if decryption fails
          decryptedData[field] = encryptedValue;
        }
      }

      return decryptedData;
    } catch (error) {
      console.error('[Encryption] Object decryption failed:', error);
      return data;
    }
  }

  // Encrypt an array of objects
  async encryptArray(dataArray, collectionName) {
    if (!Array.isArray(dataArray)) return dataArray;
    
    const results = [];
    for (const item of dataArray) {
      results.push(await this.encryptObject(item, collectionName));
    }
    return results;
  }

  // Decrypt an array of objects
  async decryptArray(dataArray, collectionName) {
    if (!Array.isArray(dataArray)) return dataArray;
    
    const results = [];
    for (const item of dataArray) {
      results.push(await this.decryptObject(item, collectionName));
    }
    return results;
  }

  // Check if data is encrypted
  isEncrypted(data) {
    return data && data._encrypted !== undefined;
  }

  // Get encryption status info
  getStatus() {
    return {
      enabled: privacyConfig.encryptionEnabled,
      initialized: this.isInitialized,
      ready: this.isReady(),
      version: privacyConfig.encryptionVersion
    };
  }
}

// Create and export singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;
