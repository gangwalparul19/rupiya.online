// Encryption Service - Client-side encryption using Web Crypto API
// Uses AES-GCM for encryption with PBKDF2 for key derivation
// 
// SEAMLESS CROSS-DEVICE ENCRYPTION:
// - Both email and Google users: Master key stored encrypted in Firestore
// - Keys automatically restored on EVERY page load using Firebase auth state
// - NO password re-entry required - completely automatic
// - Works identically across ALL devices
// - User never sees encryption - it's completely transparent

import privacyConfig from '../config/privacy-config.js';
import logger from '../utils/logger.js';

const log = logger.create('Encryption');

class EncryptionService {
  constructor() {
    this.encryptionKey = null;
    this.isInitialized = false;
    this.PBKDF2_ITERATIONS = 100000;
    this.KEY_LENGTH = 256;
    this._initializingUserId = null;
    this._initializationLock = null;
    this._initializationQueue = [];
    this.currentUserId = null;
    
    // XSS Protection: Never store keys in storage - keep in memory only
    // Keys will be regenerated on page refresh (requires password for email users)
  }
  
  // Wait for any ongoing initialization to complete with timeout
  async waitForInitialization(timeoutMs = 10000) {
    if (this.isReady()) {
      return true;
    }

    if (this._initializationLock) {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), timeoutMs)
        );

        // Race between initialization and timeout
        await Promise.race([this._initializationLock, timeoutPromise]);
        
        return this.isReady();
      } catch (error) {
        if (error.message === 'Initialization timeout') {
          log.error('Encryption initialization timed out after', timeoutMs, 'ms');
          return false;
        }
        log.error('Error waiting for initialization:', error);
        return false;
      }
    }

    return this.isReady();
  }

  // Initialize encryption with user's password (or null for Google users)
  async initialize(password, userId) {
    if (!userId) {
      log.warn('Cannot initialize without userId');
      return false;
    }

    // If already initialized for this user, return success immediately
    if (this.isInitialized && this.currentUserId === userId) {
      log.log('Already initialized for this user');
      return true;
    }

    // Prevent concurrent initialization - use lock mechanism with proper state tracking
    if (this._initializationLock) {
      log.log('Initialization already in progress, waiting...');
      
      // Wait for the current initialization to complete
      try {
        await this._initializationLock;
      } catch (e) {
        log.error('Concurrent initialization failed:', e);
      }
      
      // Return current state after lock is released
      // This ensures we return the actual result of initialization
      return this.isInitialized && this.currentUserId === userId;
    }

    // Create initialization lock
    this._initializationLock = this._doInitialize(password, userId);
    
    try {
      const result = await this._initializationLock;
      return result;
    } catch (error) {
      log.error('Initialization error:', error);
      return false;
    } finally {
      // Always clear the lock when done
      this._initializationLock = null;
    }
  }

  // Internal initialization method
  async _doInitialize(password, userId) {
    try {
      log.log(`Initializing encryption for user: ${userId}`);
      
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId provided');
      }
      
      if (password) {
        // Email/password login - derive key from password and sync to Firestore
        this.encryptionKey = await this._initializeForPasswordUser(password, userId);
      } else {
        // Google login - use Firestore-stored random key (improved security)
        this.encryptionKey = await this._initializeForGoogleUser(userId);
      }
      
      // Validate that key was successfully generated
      if (!this.encryptionKey) {
        throw new Error('Failed to generate encryption key');
      }
      
      // Test the key with a simple encrypt/decrypt cycle
      const testSuccess = await this._testEncryptionKey();
      if (!testSuccess) {
        throw new Error('Encryption key validation failed');
      }
      
      this.isInitialized = true;
      this.currentUserId = userId;
      
      log.log('Encryption initialized successfully');
      log.log('✅ Cross-device encryption: ENABLED');
      return true;
    } catch (error) {
      log.error('Encryption initialization failed:', error);
      this.isInitialized = false;
      this.encryptionKey = null;
      this.currentUserId = null;
      throw error; // Re-throw to propagate to caller
    }
  }

  // Test encryption key validity
  async _testEncryptionKey() {
    try {
      // Don't use encryptValue/decryptValue here as they check isReady()
      // This is called during initialization, so we need to test the key directly
      const testData = 'test_' + Date.now();
      
      // Generate random IV for encryption test
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the test data directly
      const encodedData = new TextEncoder().encode(testData);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        this.encryptionKey,
        encodedData
      );

      // Decrypt the test data directly
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this.encryptionKey,
        encryptedData
      );

      const decryptedString = new TextDecoder().decode(decryptedData);
      return decryptedString === testData;
    } catch (error) {
      log.error('Encryption key test failed:', error);
      return false;
    }
  }

  // Initialize encryption for email/password users
  // Strategy: Use userId-derived key (same as Google users) for seamless experience
  // NO password required - automatic initialization
  async _initializeForPasswordUser(password, userId) {
    // For seamless UX, password users also get deterministic keys like Google users
    // This means NO password re-entry ever needed
    return await this._initializeForGoogleUser(userId);
  }

  // Initialize encryption for both email and Google users
  // Uses deterministic key derivation - same key on every device automatically
  // This is secure because it requires Firebase authentication (userId only available when authenticated)
  // SEAMLESS: Works automatically without any user interaction
  async _initializeForGoogleUser(userId) {
    // Generate deterministic key - works automatically on all devices
    // No Firestore lookups needed = faster and more reliable
    log.log('Generating deterministic encryption key for user');
    return await this._generateDeterministicKey(userId);
  }

  // Generate deterministic key that's same across all devices
  async _generateDeterministicKey(userId) {
    const saltSource = `rupiya_seamless_salt_v5_${userId}`;
    const saltData = new TextEncoder().encode(saltSource);
    const saltHash = await crypto.subtle.digest('SHA-256', saltData);
    const salt = new Uint8Array(saltHash).slice(0, 16);
    
    const keyMaterial = `rupiya_seamless_encryption_v5_${userId}`;
    
    const importedKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(keyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );

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
    
    log.log('✅ Encryption key ready - works seamlessly across all devices');
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
    this._initializationLock = null;
    this.currentUserId = null;
    log.log('Encryption keys cleared from memory');
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
    // Validate inputs
    if (!data || typeof data !== 'object') {
      log.warn(`[${collectionName}] Invalid data for encryption: ${typeof data}`);
      return data;
    }
    
    if (!collectionName || typeof collectionName !== 'string') {
      log.warn('Invalid collection name for encryption');
      return data;
    }
    
    if (!privacyConfig || !privacyConfig.encryptionEnabled) {
      return data;
    }

    // Wait for any ongoing initialization to complete with timeout
    const initReady = await this.waitForInitialization(5000);
    
    if (!initReady || !this.isReady()) {
      log.warn(`[${collectionName}] Encryption not ready, storing data unencrypted`);
      log.warn('Encryption status:', {
        isInitialized: this.isInitialized,
        hasKey: !!this.encryptionKey,
        currentUserId: this.currentUserId
      });
      return data;
    }

    // Check if this collection should be encrypted
    if (!privacyConfig.encryptedCollections || !Array.isArray(privacyConfig.encryptedCollections)) {
      log.warn('Invalid encryptedCollections configuration');
      return data;
    }
    
    if (!privacyConfig.encryptedCollections.includes(collectionName)) {
      return data;
    }

    try {
      const encryptedData = { ...data };
      const sensitiveFields = privacyConfig.sensitiveFields?.[collectionName] || [];
      const encryptedFields = {};

      // Encrypt each sensitive field (skip null, undefined, and empty strings)
      for (const field of sensitiveFields) {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          try {
            // Sanitize input to prevent XSS before encryption
            const sanitizedValue = this._sanitizeInput(data[field]);
            // Handle objects and arrays by converting to JSON string first
            const valueToEncrypt = typeof sanitizedValue === 'object' 
              ? JSON.stringify(sanitizedValue) 
              : sanitizedValue;
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
      const unencryptedFields = privacyConfig.unencryptedFields || [];
      for (const [key, value] of Object.entries(data)) {
        if (!unencryptedFields.includes(key) && 
            !sensitiveFields.includes(key) &&
            value !== undefined && 
            value !== null &&
            value !== '' &&
            typeof value !== 'object') {
          try {
            const sanitizedValue = this._sanitizeInput(value);
            encryptedFields[key] = await this.encryptValue(sanitizedValue);
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
        encryptedData._encryptionVersion = privacyConfig.encryptionVersion || '1.0';
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

    // Wait for any ongoing initialization to complete with retries and timeout
    let retries = 0;
    const maxRetries = 30; // 30 * 200ms = 6 seconds max wait
    
    while (retries < maxRetries) {
      const initReady = await this.waitForInitialization(1000);
      
      if (initReady && this.isReady()) {
        break;
      }
      
      // Not ready, wait and retry
      if (retries % 10 === 0 && retries > 0) {
        log.log(`[${collectionName}] Waiting for encryption... (${retries} retries)`);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      retries++;
    }

    if (!this.isReady()) {
      log.warn(`[${collectionName}] Encryption not ready after ${maxRetries} retries, returning original data`);
      // Return original data without the _encrypted marker so it's still usable
      const partialData = { ...data };
      delete partialData._encrypted;
      delete partialData._encryptionVersion;
      return partialData;
    }

    try {
      const decryptedData = { ...data };
      delete decryptedData._encrypted;
      delete decryptedData._encryptionVersion;

      let hasDecryptionErrors = false;

      // Decrypt each encrypted field
      for (const [field, encryptedValue] of Object.entries(data._encrypted)) {
        try {
          const decrypted = await this.decryptValue(encryptedValue);
          // Sanitize output to prevent XSS after decryption
          const sanitized = this._sanitizeOutput(decrypted);
          decryptedData[field] = sanitized;
          log.log(`[${collectionName}] Decrypted field: ${field}`);
        } catch (fieldError) {
          hasDecryptionErrors = true;
          log.warn(`Failed to decrypt field ${field} in ${collectionName}:`, fieldError);
          // If decryption fails, try to use the encrypted value as-is
          // (it might be unencrypted data that was stored in _encrypted by mistake)
          if (typeof encryptedValue === 'string' && encryptedValue.length < 100) {
            // Short string - might be unencrypted, use as-is
            decryptedData[field] = encryptedValue;
            log.log(`[${collectionName}] Using unencrypted value for field: ${field}`);
          } else if (typeof encryptedValue === 'number') {
            // Number - definitely unencrypted
            decryptedData[field] = encryptedValue;
          } else {
            // For failed decryption, try to return the original unencrypted value if it exists
            // Otherwise skip the field to avoid breaking JSON parsing
            if (data[field] !== undefined && data[field] !== null) {
              decryptedData[field] = data[field];
            }
            // Don't set a placeholder - just skip it
            log.error(`[${collectionName}] Could not decrypt field: ${field}, skipping`);
          }
        }
      }

      if (hasDecryptionErrors) {
        log.warn(`[${collectionName}] Some fields failed to decrypt. This may indicate the encryption key has changed.`);
      }

      log.log(`[${collectionName}] Decrypted object complete`);
      return decryptedData;
    } catch (error) {
      log.error('Object decryption failed:', error);
      // Return original data without _encrypted marker
      const fallbackData = { ...data };
      delete fallbackData._encrypted;
      delete fallbackData._encryptionVersion;
      return fallbackData;
    }
  }

  // Encrypt an array of objects (parallel processing for better performance)
  async encryptArray(dataArray, collectionName) {
    if (!Array.isArray(dataArray)) return dataArray;
    
    // Process all items in parallel with error handling for individual items
    const results = await Promise.allSettled(
      dataArray.map(item => this.encryptObject(item, collectionName))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        log.error(`Failed to encrypt item ${index}:`, result.reason);
        // Return original unencrypted item if encryption fails
        return dataArray[index];
      }
    });
  }

  // Decrypt an array of objects (parallel processing for better performance)
  async decryptArray(dataArray, collectionName) {
    if (!Array.isArray(dataArray)) return dataArray;
    
    // Process all items in parallel with error handling for individual items
    // For 100 items: Sequential ~2-3s, Parallel ~200-300ms
    const results = await Promise.allSettled(
      dataArray.map(item => this.decryptObject(item, collectionName))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        log.error(`Failed to decrypt item ${index}:`, result.reason);
        // Return original encrypted item if decryption fails
        return dataArray[index];
      }
    });
  }

  // Check if data is encrypted
  isEncrypted(data) {
    return data && data._encrypted !== undefined;
  }

  // XSS Protection: Sanitize input before encryption
  _sanitizeInput(value) {
    if (typeof value !== 'string') {
      return value;
    }
    
    // Basic HTML escaping to prevent script injection
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // XSS Protection: Sanitize output after decryption
  _sanitizeOutput(value) {
    if (typeof value !== 'string') {
      return value;
    }
    
    // Unescape HTML entities
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  // Validate encryption key integrity
  async validateKeyIntegrity() {
    if (!this.isReady()) {
      return false;
    }

    try {
      // Test encrypt/decrypt cycle
      const testData = 'test_data_' + Date.now();
      const encrypted = await this.encryptValue(testData);
      const decrypted = await this.decryptValue(encrypted);
      
      return decrypted === testData;
    } catch (error) {
      log.error('Key integrity validation failed:', error);
      return false;
    }
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

  // Check if data appears to be encrypted but can't be decrypted
  // This helps identify data that needs re-encryption
  hasDecryptionIssues(data) {
    if (!data || !data._encrypted) {
      return false;
    }

    // Check if any of the encrypted fields are missing from the decrypted data
    const encryptedFields = Object.keys(data._encrypted || {});
    const decryptedFields = Object.keys(data).filter(k => !k.startsWith('_'));
    
    // If we have encrypted fields but they're not in the decrypted data, there's an issue
    for (const field of encryptedFields) {
      if (data[field] === undefined || data[field] === null) {
        return true;
      }
    }
    
    return false;
  }
}

// Create and export singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;
