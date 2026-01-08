// Encryption Service - Client-side encryption using Web Crypto API
// Uses AES-GCM for encryption with PBKDF2 for key derivation
// 
// CROSS-DEVICE ENCRYPTION STRATEGY:
// - Google users: Deterministic key derived from userId (no salt needed, works everywhere)
// - Email/password users: Key derived from password, with encrypted key backup in Firestore
//   so the same key can be restored on any device after login

import privacyConfig from '../config/privacy-config.js';
import logger from '../utils/logger.js';

const log = logger.create('Encryption');

class EncryptionService {
  constructor() {
    this.encryptionKey = null;
    this.isInitialized = false;
    this.SESSION_KEY_STORAGE = 'rupiya_session_key';
    this.PBKDF2_ITERATIONS = 100000;
    this.KEY_LENGTH = 256;
    this._restorePromise = null;
    this._initializingUserId = null;
    
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
        const { keyData, userId } = JSON.parse(sessionData);
        
        // Import the raw key back
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          Uint8Array.from(atob(keyData), c => c.charCodeAt(0)),
          { name: 'AES-GCM', length: this.KEY_LENGTH },
          true,
          ['encrypt', 'decrypt']
        );
        
        this.isInitialized = true;
        log.log('Restored encryption key from session storage');
      }
    } catch (error) {
      log.warn('Could not restore from session:', error);
      this.clear();
    }
  }
  
  // Save encryption key to session storage
  async _saveToSession(userId) {
    try {
      // Export the key to raw format
      const keyData = await crypto.subtle.exportKey('raw', this.encryptionKey);
      const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
      
      sessionStorage.setItem(this.SESSION_KEY_STORAGE, JSON.stringify({
        keyData: keyBase64,
        userId
      }));
      log.log('Saved encryption key to session storage');
    } catch (error) {
      log.warn('Could not save to session:', error);
    }
  }

  // Initialize encryption with user's password (or null for Google users)
  async initialize(password, userId) {
    if (!userId) {
      log.warn('Cannot initialize without userId');
      return false;
    }

    // Prevent concurrent initialization for the same user
    if (this._initializingUserId === userId) {
      log.log('Already initializing for this user, waiting...');
      await this.waitForRestore();
      return this.isReady();
    }

    this._initializingUserId = userId;

    try {
      if (password) {
        // Email/password login - derive key from password and sync to Firestore
        this.encryptionKey = await this._initializeForPasswordUser(password, userId);
      } else {
        // Google login - use deterministic key derivation (no sync needed)
        this.encryptionKey = await this._generateDeterministicKey(userId);
      }
      
      this.isInitialized = true;
      this._initializingUserId = null;
      
      // Save to session storage for persistence across page loads
      await this._saveToSession(userId);
      
      log.log('Encryption initialized successfully');
      return true;
    } catch (error) {
      log.error('Encryption initialization failed:', error);
      this.isInitialized = false;
      this._initializingUserId = null;
      return false;
    }
  }

  // Initialize encryption for email/password users
  // Strategy: Generate a random master key, encrypt it with password-derived key, store in Firestore
  // On new device: retrieve encrypted key from Firestore, decrypt with password
  async _initializeForPasswordUser(password, userId) {
    try {
      const { getFirestore, doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
      
      const db = getFirestore(getApp());
      const userEncryptionRef = doc(db, 'userEncryption', userId);
      const encryptionDoc = await getDoc(userEncryptionRef);
      
      // Derive a key-encryption-key (KEK) from the password
      // This KEK is used to encrypt/decrypt the actual data encryption key
      const kek = await this._deriveKeyFromPassword(password, userId);
      
      if (encryptionDoc.exists() && encryptionDoc.data().encryptedKey) {
        // Existing user - decrypt the stored key
        log.log('Found encrypted key in Firestore, decrypting...');
        const { encryptedKey, iv } = encryptionDoc.data();
        
        try {
          const masterKey = await this._decryptMasterKey(encryptedKey, iv, kek);
          log.log('Successfully decrypted master key from Firestore');
          return masterKey;
        } catch (decryptError) {
          // Decryption failed - this could mean wrong password or corrupted data
          // For password users, we should fail here so they know something is wrong
          log.error('Failed to decrypt master key - password may be incorrect or data corrupted');
          throw new Error('Failed to decrypt encryption key. If you recently changed your password, your encrypted data may need to be re-encrypted.');
        }
      } else {
        // New user - generate a new master key and store encrypted version
        log.log('No existing encryption key found, generating new one...');
        const masterKey = await this._generateRandomMasterKey();
        
        // Encrypt the master key with the KEK
        const { encryptedKey, iv } = await this._encryptMasterKey(masterKey, kek);
        
        // Store in Firestore
        await setDoc(userEncryptionRef, {
          encryptedKey,
          iv,
          createdAt: new Date().toISOString(),
          version: 3,
          keyType: 'password'
        });
        
        log.log('Generated and stored new encrypted master key in Firestore');
        return masterKey;
      }
    } catch (error) {
      log.error('Password user encryption initialization failed:', error);
      throw error;
    }
  }

  // Generate a deterministic encryption key for Google users
  // This key is the same on every device because it's derived from the userId
  async _generateDeterministicKey(userId) {
    // Use a deterministic salt derived from userId (not random)
    const saltSource = `rupiya_deterministic_salt_v3_${userId}`;
    const saltData = new TextEncoder().encode(saltSource);
    const saltHash = await crypto.subtle.digest('SHA-256', saltData);
    const salt = new Uint8Array(saltHash).slice(0, 16);
    
    // Key material is also deterministic
    const keyMaterial = `rupiya_google_encryption_v3_${userId}`;
    
    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-GCM key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      importedKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
    
    log.log('Generated deterministic key for Google user');
    return key;
  }

  // Derive a key-encryption-key from password
  async _deriveKeyFromPassword(password, userId) {
    // Use userId as part of the salt for additional security
    const saltSource = `rupiya_kek_salt_v3_${userId}`;
    const saltData = new TextEncoder().encode(saltSource);
    const saltHash = await crypto.subtle.digest('SHA-256', saltData);
    const salt = new Uint8Array(saltHash).slice(0, 16);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      false, // not extractable - only used for encryption/decryption
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  // Generate a random master key for data encryption
  async _generateRandomMasterKey() {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true, // extractable - needed to encrypt and store
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt the master key with the KEK for storage
  async _encryptMasterKey(masterKey, kek) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Export the master key to raw format
    const rawKey = await crypto.subtle.exportKey('raw', masterKey);
    
    // Encrypt with KEK
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      kek,
      rawKey
    );
    
    return {
      encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  // Decrypt the master key using the KEK
  async _decryptMasterKey(encryptedKeyBase64, ivBase64, kek) {
    const encryptedData = Uint8Array.from(atob(encryptedKeyBase64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    
    // Decrypt with KEK
    const rawKey = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      kek,
      encryptedData
    );
    
    // Import as AES-GCM key
    return await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Legacy method for backward compatibility - now just calls _generateDeterministicKey
  async generateKeyForGoogleUser(userId) {
    return await this._generateDeterministicKey(userId);
  }

  // Legacy method - kept for backward compatibility but no longer used
  async deriveKey(password, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: this.KEY_LENGTH },
      true,
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
    this.isInitialized = false;
    this._restorePromise = null;
    this._initializingUserId = null;
    try {
      sessionStorage.removeItem(this.SESSION_KEY_STORAGE);
    } catch (e) {
      log.warn('Could not clear session storage:', e);
    }
    log.log('Encryption keys cleared');
  }

  // Migrate existing user data to new encryption system
  // Call this for users who have data encrypted with the old system
  async migrateFromLegacyEncryption(userId, legacyPassword = null) {
    log.log('Checking if migration from legacy encryption is needed...');
    
    try {
      const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
      
      const db = getFirestore(getApp());
      const userEncryptionRef = doc(db, 'userEncryption', userId);
      const encryptionDoc = await getDoc(userEncryptionRef);
      
      if (encryptionDoc.exists()) {
        const data = encryptionDoc.data();
        // Check if this is old format (has 'salt' but not 'encryptedKey')
        if (data.salt && !data.encryptedKey) {
          log.log('Legacy encryption format detected - migration may be needed');
          // For now, just log - actual migration would require re-encrypting all data
          return { needsMigration: true, hasLegacySalt: true };
        }
        // New format already
        return { needsMigration: false };
      }
      
      return { needsMigration: false };
    } catch (error) {
      log.warn('Could not check migration status:', error);
      return { needsMigration: false, error: error.message };
    }
  }


  // Encrypt a string value
  async encryptValue(value) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized');
    }

    // Skip null, undefined, and empty strings
    if (value === null || value === undefined || value === '') {
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
      log.error('Encrypt error:', error);
      throw error;
    }
  }

  // Decrypt a string value
  async decryptValue(encryptedValue) {
    if (!this.isReady()) {
      throw new Error('Encryption not initialized');
    }

    // Return null, undefined, and empty strings as-is
    if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
      return encryptedValue;
    }

    // Check if value looks like it's encrypted (base64 encoded with minimum length)
    // Encrypted values should be at least 12 bytes IV + some data
    if (typeof encryptedValue !== 'string' || encryptedValue.length < 20) {
      // Value doesn't look encrypted, return as-is
      return encryptedValue;
    }

    try {
      // Decode from base64
      let combined;
      try {
        combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
      } catch (base64Error) {
        // Not valid base64, return original value
        log.warn('Value is not valid base64, returning as-is');
        return encryptedValue;
      }
      
      // Check minimum length (12 bytes IV + at least 1 byte data + 16 bytes auth tag)
      if (combined.length < 29) {
        log.warn('Encrypted data too short, returning as-is');
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
      log.error('Decrypt error:', error);
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
      log.warn(`[${collectionName}] Encryption not ready, storing data unencrypted`);
      log.warn('Encryption status:', {
        isInitialized: this.isInitialized,
        hasKey: !!this.encryptionKey
      });
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

      // Encrypt each sensitive field (skip null, undefined, and empty strings)
      for (const field of sensitiveFields) {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          try {
            // Handle objects and arrays by converting to JSON string first
            const valueToEncrypt = typeof data[field] === 'object' 
              ? JSON.stringify(data[field]) 
              : data[field];
            encryptedFields[field] = await this.encryptValue(valueToEncrypt);
            delete encryptedData[field];
          } catch (fieldError) {
            log.error(`Failed to encrypt field ${field}:`, fieldError);
            // Keep original value if encryption fails
            encryptedData[field] = data[field];
          }
        }
      }

      // Also encrypt any field not in unencryptedFields list (skip null, undefined, and empty strings)
      for (const [key, value] of Object.entries(data)) {
        if (!privacyConfig.unencryptedFields.includes(key) && 
            !sensitiveFields.includes(key) &&
            value !== undefined && 
            value !== null &&
            value !== '' &&
            typeof value !== 'object') {
          try {
            encryptedFields[key] = await this.encryptValue(value);
            delete encryptedData[key];
          } catch (fieldError) {
            log.error(`Failed to encrypt field ${key}:`, fieldError);
            // Keep original value if encryption fails
            encryptedData[key] = value;
          }
        }
      }

      // Add encrypted data container
      if (Object.keys(encryptedFields).length > 0) {
        encryptedData._encrypted = encryptedFields;
        encryptedData._encryptionVersion = privacyConfig.encryptionVersion;
      }

      log.log(`[${collectionName}] Encrypted ${Object.keys(encryptedFields).length} fields`);
      return encryptedData;
    } catch (error) {
      log.error(`[${collectionName}] Object encryption failed:`, error);
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
      log.warn('Not initialized, returning data with encrypted fields visible');
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
          log.warn(`Failed to decrypt field ${field}:`, fieldError);
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
      log.error('Object decryption failed:', error);
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
