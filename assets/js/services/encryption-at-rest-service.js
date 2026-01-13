// Encryption at Rest Service - Encrypt data stored locally
import logger from '../utils/logger.js';

class EncryptionAtRestService {
  constructor() {
    this.algorithm = 'AES-256-GCM';
    this.keyLength = 256;
    this.saltLength = 16;
    this.iterations = 100000;
    this.encryptedStorage = new Map();
    this.masterKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize encryption with master password
   * @param {string} masterPassword - Master password
   * @returns {Promise<boolean>} - Initialization status
   */
  async initialize(masterPassword) {
    try {
      this.masterKey = await this.deriveKey(masterPassword);
      this.isInitialized = true;
      logger.info('Encryption at rest initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize encryption:', error);
      return false;
    }
  }

  /**
   * Derive key from password
   * @param {string} password - Password
   * @param {Uint8Array} salt - Salt (optional)
   * @returns {Promise<CryptoKey>} - Derived key
   */
  async deriveKey(password, salt = null) {
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
    }

    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: this.keyLength },
      true,
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key (optional, uses master key)
   * @returns {Promise<string>} - Encrypted data (base64)
   */
  async encrypt(data, key = null) {
    if (!this.isInitialized && !key) {
      throw new Error('Encryption not initialized');
    }

    try {
      const encryptionKey = key || this.masterKey;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        encryptionKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64
      const binaryString = String.fromCharCode.apply(null, combined);
      const base64 = btoa(binaryString);

      logger.debug('Data encrypted successfully');
      return base64;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Encrypted data (base64)
   * @param {string} key - Decryption key (optional, uses master key)
   * @returns {Promise<string>} - Decrypted data
   */
  async decrypt(encryptedData, key = null) {
    if (!this.isInitialized && !key) {
      throw new Error('Encryption not initialized');
    }

    try {
      const decryptionKey = key || this.masterKey;
      
      // Convert from base64
      const binaryString = atob(encryptedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Extract IV and encrypted data
      const iv = bytes.slice(0, 12);
      const encryptedBuffer = bytes.slice(12);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        decryptionKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      const decryptedData = decoder.decode(decryptedBuffer);

      logger.debug('Data decrypted successfully');
      return decryptedData;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt and store data
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   * @returns {Promise<void>}
   */
  async encryptAndStore(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      const encrypted = await this.encrypt(jsonData);
      
      this.encryptedStorage.set(key, encrypted);
      localStorage.setItem(`encrypted_${key}`, encrypted);
      
      logger.debug(`Data encrypted and stored: ${key}`);
    } catch (error) {
      logger.error('Failed to encrypt and store data:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt data
   * @param {string} key - Storage key
   * @returns {Promise<*>} - Decrypted data
   */
  async retrieveAndDecrypt(key) {
    try {
      let encrypted = this.encryptedStorage.get(key);
      
      if (!encrypted) {
        encrypted = localStorage.getItem(`encrypted_${key}`);
      }

      if (!encrypted) {
        return null;
      }

      const decrypted = await this.decrypt(encrypted);
      const data = JSON.parse(decrypted);
      
      logger.debug(`Data retrieved and decrypted: ${key}`);
      return data;
    } catch (error) {
      logger.error('Failed to retrieve and decrypt data:', error);
      throw error;
    }
  }

  /**
   * Encrypt object fields
   * @param {object} obj - Object to encrypt
   * @param {array} fields - Fields to encrypt
   * @returns {Promise<object>} - Object with encrypted fields
   */
  async encryptFields(obj, fields) {
    try {
      const encrypted = { ...obj };

      for (const field of fields) {
        if (encrypted[field]) {
          encrypted[field] = await this.encrypt(String(encrypted[field]));
        }
      }

      logger.debug(`Fields encrypted: ${fields.join(', ')}`);
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt fields:', error);
      throw error;
    }
  }

  /**
   * Decrypt object fields
   * @param {object} obj - Object to decrypt
   * @param {array} fields - Fields to decrypt
   * @returns {Promise<object>} - Object with decrypted fields
   */
  async decryptFields(obj, fields) {
    try {
      const decrypted = { ...obj };

      for (const field of fields) {
        if (decrypted[field]) {
          decrypted[field] = await this.decrypt(decrypted[field]);
        }
      }

      logger.debug(`Fields decrypted: ${fields.join(', ')}`);
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt fields:', error);
      throw error;
    }
  }

  /**
   * Encrypt array of objects
   * @param {array} arr - Array to encrypt
   * @param {array} fields - Fields to encrypt
   * @returns {Promise<array>} - Array with encrypted fields
   */
  async encryptArray(arr, fields) {
    try {
      const encrypted = [];

      for (const item of arr) {
        encrypted.push(await this.encryptFields(item, fields));
      }

      logger.debug(`Array encrypted: ${arr.length} items`);
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt array:', error);
      throw error;
    }
  }

  /**
   * Decrypt array of objects
   * @param {array} arr - Array to decrypt
   * @param {array} fields - Fields to decrypt
   * @returns {Promise<array>} - Array with decrypted fields
   */
  async decryptArray(arr, fields) {
    try {
      const decrypted = [];

      for (const item of arr) {
        decrypted.push(await this.decryptFields(item, fields));
      }

      logger.debug(`Array decrypted: ${arr.length} items`);
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt array:', error);
      throw error;
    }
  }

  /**
   * Change master password
   * @param {string} oldPassword - Old password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  async changePassword(oldPassword, newPassword) {
    try {
      // Verify old password
      const oldKey = await this.deriveKey(oldPassword);
      
      // Get all encrypted data
      const allData = {};
      for (const [key, value] of this.encryptedStorage) {
        allData[key] = await this.decrypt(value, oldKey);
      }

      // Re-encrypt with new password
      this.masterKey = await this.deriveKey(newPassword);
      
      for (const [key, value] of Object.entries(allData)) {
        const encrypted = await this.encrypt(value);
        this.encryptedStorage.set(key, encrypted);
        localStorage.setItem(`encrypted_${key}`, encrypted);
      }

      logger.info('Master password changed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to change password:', error);
      return false;
    }
  }

  /**
   * Clear all encrypted data
   */
  clearAll() {
    this.encryptedStorage.clear();
    
    // Clear from localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('encrypted_')) {
        localStorage.removeItem(key);
      }
    }

    logger.info('All encrypted data cleared');
  }

  /**
   * Get encryption status
   * @returns {object} - Encryption status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      iterations: this.iterations,
      storageSize: this.encryptedStorage.size,
      localStorageItems: Array.from(localStorage.keys()).filter(k => k.startsWith('encrypted_')).length
    };
  }

  /**
   * Export encrypted data
   * @returns {object} - Encrypted data
   */
  exportData() {
    const data = {};
    for (const [key, value] of this.encryptedStorage) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Import encrypted data
   * @param {object} data - Encrypted data
   */
  importData(data) {
    for (const [key, value] of Object.entries(data)) {
      this.encryptedStorage.set(key, value);
      localStorage.setItem(`encrypted_${key}`, value);
    }
    logger.info(`Imported ${Object.keys(data).length} encrypted items`);
  }

  /**
   * Verify encryption integrity
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} - Integrity status
   */
  async verifyIntegrity(key) {
    try {
      const data = await this.retrieveAndDecrypt(key);
      return data !== null;
    } catch (error) {
      logger.error('Integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Get encryption statistics
   * @returns {object} - Encryption statistics
   */
  getStats() {
    let totalSize = 0;
    for (const value of this.encryptedStorage.values()) {
      totalSize += value.length;
    }

    return {
      itemsEncrypted: this.encryptedStorage.size,
      totalSize: totalSize,
      averageSize: this.encryptedStorage.size > 0 ? totalSize / this.encryptedStorage.size : 0,
      algorithm: this.algorithm,
      keyLength: this.keyLength
    };
  }
}

export default new EncryptionAtRestService();
