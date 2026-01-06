// App Lock Service - PIN/Biometric authentication for app security
import authService from './auth-service.js';

class AppLockService {
  constructor() {
    this.STORAGE_KEY = 'rupiya_app_lock';
    this.LOCK_STATE_KEY = 'rupiya_lock_state';
    this.LAST_ACTIVITY_KEY = 'rupiya_last_activity';
    this.FAILED_ATTEMPTS_KEY = 'rupiya_failed_attempts';
    this.LOCKOUT_UNTIL_KEY = 'rupiya_lockout_until';
    
    // Default settings
    this.defaultSettings = {
      enabled: false,
      pin: null, // Hashed PIN
      useBiometric: false,
      autoLockTimeout: 5, // minutes (0 = immediate, -1 = never)
      lockOnBackground: true,
      maxFailedAttempts: 5,
      lockoutDuration: 5 // minutes
    };
    
    // Track visibility changes for auto-lock
    this.setupVisibilityListener();
    this.setupActivityListener();
  }

  // Get user-specific storage key
  getUserKey(key) {
    const user = authService.getCurrentUser();
    if (!user) return null;
    return `${key}_${user.uid}`;
  }

  // Get app lock settings
  getSettings() {
    const key = this.getUserKey(this.STORAGE_KEY);
    if (!key) return { ...this.defaultSettings };
    
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return { ...this.defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error reading app lock settings:', e);
    }
    return { ...this.defaultSettings };
  }

  // Save app lock settings
  saveSettings(settings) {
    const key = this.getUserKey(this.STORAGE_KEY);
    if (!key) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Error saving app lock settings:', e);
      return false;
    }
  }

  // Hash PIN using SHA-256
  async hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Enable app lock with PIN
  async enableAppLock(pin, options = {}) {
    if (!pin || pin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits' };
    }
    
    if (!/^\d+$/.test(pin)) {
      return { success: false, error: 'PIN must contain only numbers' };
    }

    try {
      const hashedPin = await this.hashPin(pin);
      const settings = this.getSettings();
      
      const newSettings = {
        ...settings,
        enabled: true,
        pin: hashedPin,
        useBiometric: options.useBiometric || false,
        autoLockTimeout: options.autoLockTimeout ?? settings.autoLockTimeout,
        lockOnBackground: options.lockOnBackground ?? settings.lockOnBackground
      };
      
      this.saveSettings(newSettings);
      this.unlock(); // Start fresh
      
      return { success: true };
    } catch (e) {
      console.error('Error enabling app lock:', e);
      return { success: false, error: 'Failed to enable app lock' };
    }
  }

  // Disable app lock
  async disableAppLock(pin) {
    const verifyResult = await this.verifyPin(pin);
    if (!verifyResult.success) {
      return verifyResult;
    }
    
    const settings = this.getSettings();
    settings.enabled = false;
    settings.pin = null;
    settings.useBiometric = false;
    
    this.saveSettings(settings);
    this.unlock();
    this.clearFailedAttempts();
    
    return { success: true };
  }

  // Change PIN
  async changePin(currentPin, newPin) {
    const verifyResult = await this.verifyPin(currentPin);
    if (!verifyResult.success) {
      return verifyResult;
    }
    
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'New PIN must be at least 4 digits' };
    }
    
    if (!/^\d+$/.test(newPin)) {
      return { success: false, error: 'PIN must contain only numbers' };
    }

    try {
      const hashedPin = await this.hashPin(newPin);
      const settings = this.getSettings();
      settings.pin = hashedPin;
      this.saveSettings(settings);
      
      return { success: true };
    } catch (e) {
      console.error('Error changing PIN:', e);
      return { success: false, error: 'Failed to change PIN' };
    }
  }

  // Verify PIN
  async verifyPin(pin) {
    // Check if locked out
    if (this.isLockedOut()) {
      const remaining = this.getLockoutRemaining();
      return { 
        success: false, 
        error: `Too many failed attempts. Try again in ${Math.ceil(remaining / 60)} minute(s)`,
        lockedOut: true,
        lockoutRemaining: remaining
      };
    }
    
    const settings = this.getSettings();
    if (!settings.enabled || !settings.pin) {
      return { success: true };
    }

    try {
      const hashedPin = await this.hashPin(pin);
      if (hashedPin === settings.pin) {
        this.clearFailedAttempts();
        return { success: true };
      } else {
        this.recordFailedAttempt();
        const attempts = this.getFailedAttempts();
        const remaining = settings.maxFailedAttempts - attempts;
        
        if (remaining <= 0) {
          this.startLockout();
          return { 
            success: false, 
            error: `Too many failed attempts. Locked for ${settings.lockoutDuration} minutes`,
            lockedOut: true
          };
        }
        
        return { 
          success: false, 
          error: `Incorrect PIN. ${remaining} attempt(s) remaining`,
          attemptsRemaining: remaining
        };
      }
    } catch (e) {
      console.error('Error verifying PIN:', e);
      return { success: false, error: 'Failed to verify PIN' };
    }
  }

  // Check if app lock is enabled
  isEnabled() {
    const settings = this.getSettings();
    return settings.enabled && settings.pin !== null;
  }

  // Check if app is currently locked
  isLocked() {
    if (!this.isEnabled()) return false;
    
    const key = this.getUserKey(this.LOCK_STATE_KEY);
    if (!key) return false;
    
    return localStorage.getItem(key) === 'locked';
  }

  // Lock the app
  lock() {
    if (!this.isEnabled()) return;
    
    const key = this.getUserKey(this.LOCK_STATE_KEY);
    if (key) {
      localStorage.setItem(key, 'locked');
    }
  }

  // Unlock the app
  unlock() {
    const key = this.getUserKey(this.LOCK_STATE_KEY);
    if (key) {
      localStorage.removeItem(key);
    }
    this.updateLastActivity();
  }

  // Update last activity timestamp
  updateLastActivity() {
    const key = this.getUserKey(this.LAST_ACTIVITY_KEY);
    if (key) {
      localStorage.setItem(key, Date.now().toString());
    }
  }

  // Get last activity timestamp
  getLastActivity() {
    const key = this.getUserKey(this.LAST_ACTIVITY_KEY);
    if (!key) return Date.now();
    
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : Date.now();
  }

  // Check if should auto-lock based on timeout
  shouldAutoLock() {
    if (!this.isEnabled()) return false;
    
    const settings = this.getSettings();
    if (settings.autoLockTimeout === -1) return false; // Never auto-lock
    if (settings.autoLockTimeout === 0) return true; // Always lock
    
    const lastActivity = this.getLastActivity();
    const timeout = settings.autoLockTimeout * 60 * 1000; // Convert to ms
    
    return Date.now() - lastActivity > timeout;
  }

  // Failed attempts management
  getFailedAttempts() {
    const key = this.getUserKey(this.FAILED_ATTEMPTS_KEY);
    if (!key) return 0;
    
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  }

  recordFailedAttempt() {
    const key = this.getUserKey(this.FAILED_ATTEMPTS_KEY);
    if (!key) return;
    
    const attempts = this.getFailedAttempts() + 1;
    localStorage.setItem(key, attempts.toString());
  }

  clearFailedAttempts() {
    const key = this.getUserKey(this.FAILED_ATTEMPTS_KEY);
    if (key) {
      localStorage.removeItem(key);
    }
    
    const lockoutKey = this.getUserKey(this.LOCKOUT_UNTIL_KEY);
    if (lockoutKey) {
      localStorage.removeItem(lockoutKey);
    }
  }

  startLockout() {
    const key = this.getUserKey(this.LOCKOUT_UNTIL_KEY);
    if (!key) return;
    
    const settings = this.getSettings();
    const lockoutUntil = Date.now() + (settings.lockoutDuration * 60 * 1000);
    localStorage.setItem(key, lockoutUntil.toString());
  }

  isLockedOut() {
    const key = this.getUserKey(this.LOCKOUT_UNTIL_KEY);
    if (!key) return false;
    
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    
    const lockoutUntil = parseInt(stored, 10);
    if (Date.now() >= lockoutUntil) {
      this.clearFailedAttempts();
      return false;
    }
    
    return true;
  }

  getLockoutRemaining() {
    const key = this.getUserKey(this.LOCKOUT_UNTIL_KEY);
    if (!key) return 0;
    
    const stored = localStorage.getItem(key);
    if (!stored) return 0;
    
    const lockoutUntil = parseInt(stored, 10);
    return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
  }

  // Check biometric availability
  async isBiometricAvailable() {
    if (!window.PublicKeyCredential) return false;
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (e) {
      return false;
    }
  }

  // Authenticate with biometric (WebAuthn)
  async authenticateWithBiometric() {
    const settings = this.getSettings();
    if (!settings.useBiometric) {
      return { success: false, error: 'Biometric not enabled' };
    }

    try {
      // Simple biometric prompt using WebAuthn
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname
        }
      });
      
      if (credential) {
        this.clearFailedAttempts();
        return { success: true };
      }
      
      return { success: false, error: 'Biometric authentication failed' };
    } catch (e) {
      console.error('Biometric auth error:', e);
      return { success: false, error: 'Biometric authentication cancelled or failed' };
    }
  }

  // Setup visibility change listener for auto-lock
  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App going to background
        const settings = this.getSettings();
        if (settings.enabled && settings.lockOnBackground) {
          this.lock();
        }
      } else {
        // App coming to foreground
        if (this.shouldAutoLock()) {
          this.lock();
        }
      }
    });
  }

  // Setup activity listener for timeout tracking
  setupActivityListener() {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const throttledUpdate = this.throttle(() => {
      if (!this.isLocked()) {
        this.updateLastActivity();
      }
    }, 30000); // Update at most every 30 seconds
    
    events.forEach(event => {
      document.addEventListener(event, throttledUpdate, { passive: true });
    });
  }

  // Throttle helper
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Update settings
  updateSettings(updates) {
    const settings = this.getSettings();
    const newSettings = { ...settings, ...updates };
    return this.saveSettings(newSettings);
  }
}

// Create and export singleton instance
const appLockService = new AppLockService();
export default appLockService;
