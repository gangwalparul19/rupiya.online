// Encryption Service - Client-side encryption using Web Crypto API
// Uses AES-GCM for encryption with PBKDF2 for key derivation

import privacyConfig from '../config/privacy-config.js';

class EncryptionService {
  constructor() {
    this.encryptionKey = null;
    this.salt = null;
    this.isInitialized = false;
    this.SALT_KEY = 'rupiya_encryption_salt';
    this.SESSION_KEY_STORAGE = 'rupiya_session_key';
    this.PBKDF2_ITERATIONS = 100000;
    this.KEY_LENGTH = 256;
    this._restorePromise = null;
    
    // Try to restore encryption key from session storage on construction
    this._restorePromise = this._restoreFromSession();
  }
  
  // Wait for restoration to complete
  async waitForRestore() {
    if (this._restorePromise) {
      await this._restorePromise;
    }
  }
  
  // Restore encryption key from session storage
  async _restoreFromSession() {
    try {
      const sessionData = sessionStorage.getItem(this.SESSION_KEY_STORAGE);
      if (sessionData) {
        const { keyData, saltBase64, userId } = JSON.parse(sessionData);
        
        // Import the raw key back
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          Uint8Array.from(atob(keyData), c => c.charCodeAt(0)),
          { name: 'AES-GCM', length: this.KEY_LENGTH },
          true,
          ['encrypt', 'decrypt']
        );
        
        this.salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
        this.isInitialized = true;
        console.log('[Encryption] Restored from session storage');
      }
    } catch (error) {
      console.warn('[Encryption] Could not restore from session:', error);
      this.clear();
    }
  }
  
  // Save encryption key to session storage
  async _saveToSession(userId) {
    try {
      // Export the key to raw format
      const keyData = await crypto.subtle.exportKey('raw', this.encryptionKey);
      const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
      const saltBase64 = btoa(String.fromCharCode(...this.salt));
      
      sessionStorage.setItem(this.SESSION_KEY_STORAGE, JSON.stringify({
        keyData: keyBase64,
        saltBase64,
        userId
      }));
      console.log('[Encryption] Saved to session storage');
    } catch (error) {
      console.warn('[Encryption] Could not save to session:', error);
    }
  }

  // Initialize encryption with user's password
  async initialize(password, userId) {
    if (!userId) {
      console.warn('[Encryption] Cannot initialize without userId');
      return false;
    }

    try {
      // Get or create salt for this user
      this.salt = await this.getOrCreateSalt(userId);
      
      // Derive encryption key from password or generate for Google users
      if (password) {
        // Email/password login - use password for key derivation
        this.encryptionKey = await this.deriveKey(password, this.salt);
      } else {
        // Google login - generate key from user data
        this.encryptionKey = await this.generateKeyForGoogleUser(userId, this.salt);
      }
      
      this.isInitialized = true;
      
      // Save to session storage for persistence across page loads
      await this._saveToSession(userId);
      
      console.log('[Encryption] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Encryption] Initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Generate encryption key for Google users (no password available)
  async generateKeyForGoogleUser(userId, salt) {
    // Use a combination of userId and a stored secret to generate a consistent key
    // This ensures the same key is generated each time for the same user
    
    const keyMaterial = userId + 'rupiya_google_encryption_v1';
    
    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-GCM key (exportable so we can save to session)
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true, // extractable - needed to save to session
      ['encrypt', 'decrypt']
    );
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

    // Derive AES-GCM key (exportable so we can save to session)
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true, // extractable - needed to save to session
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
    this._restorePromise = null;
    try {
      sessionStorage.removeItem(this.SESSION_KEY_STORAGE);
    } catch (e) {
      console.warn('[Encryption] Could not clear session storage:', e);
    }
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

    // Check if value looks like it's encrypted (base64 encoded with minimum length)
    // Encrypted values should be at least 12 bytes IV + some data
    if (typeof encryptedValue !== 'string' || encryptedValue.length < 20) {
      // Value doesn't look encrypted, return as-is
      console.warn('[Encryption] Value does not appear to be encrypted, returning as-is');
      return encryptedValue;
    }

    try {
      // Decode from base64
      let combined;
      try {
        combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
      } catch (base64Error) {
        // Not valid base64, return original value
        console.warn('[Encryption] Value is not valid base64, returning as-is');
        return encryptedValue;
      }
      
      // Check minimum length (12 bytes IV + at least 1 byte data + 16 bytes auth tag)
      if (combined.length < 29) {
        console.warn('[Encryption] Encrypted data too short, returning as-is');
        return encryptedValue;
      }
      
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
      
      // Try to parse as JSON first (handles objects, arrays, booleans, numbers)
      try {
        return JSON.parse(decryptedString);
      } catch {
        // Not valid JSON, check if it's a number
        if (!isNaN(decryptedString) && decryptedString.trim() !== '') {
          return parseFloat(decryptedString);
        }
        // Return as string
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

    // Wait for session restoration to complete
    await this.waitForRestore();

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

    // If no encrypted data marker, return as-is (data was never encrypted)
    if (!data || !data._encrypted) {
      return data;
    }

    // Wait for session restoration to complete
    await this.waitForRestore();

    if (!this.isReady()) {
      console.warn('[Encryption] Not initialized, returning data with encrypted fields visible');
      // Return data but try to show something useful
      const partialData = { ...data };
      // Copy encrypted fields as-is so UI doesn't break completely
      if (data._encrypted) {
        for (const [field, value] of Object.entries(data._encrypted)) {
          partialData[field] = '[Encrypted]';
        }
      }
      delete partialData._encrypted;
      delete partialData._encryptionVersion;
      return partialData;
    }

    try {
      const decryptedData = { ...data };
      delete decryptedData._encrypted;
      delete decryptedData._encryptionVersion;

      // Decrypt each encrypted field
      for (const [field, encryptedValue] of Object.entries(data._encrypted)) {
        try {
          const decrypted = await this.decryptValue(encryptedValue);
          decryptedData[field] = decrypted;
        } catch (fieldError) {
          console.warn(`[Encryption] Failed to decrypt field ${field}:`, fieldError);
          // If decryption fails, try to use the encrypted value as-is
          // (it might be unencrypted data that was stored in _encrypted by mistake)
          if (typeof encryptedValue === 'string' && encryptedValue.length < 100) {
            // Short string - might be unencrypted, use as-is
            decryptedData[field] = encryptedValue;
          } else if (typeof encryptedValue === 'number') {
            // Number - definitely unencrypted
            decryptedData[field] = encryptedValue;
          } else {
            // Show placeholder if we can't recover
            decryptedData[field] = '[Decryption Failed]';
          }
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
