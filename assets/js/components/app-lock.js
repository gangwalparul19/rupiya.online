// App Lock Component - Lock screen UI and PIN entry
import appLockService from '../services/app-lock-service.js';
import authService from '../services/auth-service.js';

class AppLock {
  constructor() {
    this.overlay = null;
    this.pinValue = '';
    this.maxPinLength = 6;
    this.isSetupMode = false;
    this.setupStep = 1;
    this.firstPin = '';
    this.onUnlockCallback = null;
    this.lockoutInterval = null;
  }

  // Initialize app lock check
  async init() {
    // Wait for auth to be ready
    await authService.waitForAuth();
    
    if (!authService.isAuthenticated()) {
      return;
    }

    // Check if should show lock screen
    if (appLockService.isLocked() || appLockService.shouldAutoLock()) {
      appLockService.lock();
      this.show();
    }
  }

  // Create lock screen overlay
  createOverlay() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'app-lock-overlay';
    this.overlay.innerHTML = this.getLockScreenHTML();
    document.body.appendChild(this.overlay);

    this.setupEventListeners();
  }

  // Get lock screen HTML
  getLockScreenHTML() {
    const isLockedOut = appLockService.isLockedOut();
    const settings = appLockService.getSettings();

    return `
      <div class="app-lock-container">
        <div class="app-lock-icon" id="lockIcon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        
        <h2 class="app-lock-title">Welcome Back</h2>
        <p class="app-lock-subtitle">Enter your PIN to unlock</p>
        
        ${isLockedOut ? this.getLockoutHTML() : ''}
        
        <div class="pin-input-container" id="pinDots">
          ${this.getPinDotsHTML()}
        </div>
        
        <div class="app-lock-error" id="lockError"></div>
        
        <div class="pin-keypad" id="pinKeypad">
          ${this.getKeypadHTML()}
        </div>
        
        ${settings.useBiometric ? `
          <button class="biometric-btn" id="biometricBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/>
            </svg>
            Use Biometric
          </button>
        ` : ''}
      </div>
    `;
  }

  // Get PIN dots HTML
  getPinDotsHTML() {
    let html = '';
    for (let i = 0; i < this.maxPinLength; i++) {
      const filled = i < this.pinValue.length ? 'filled' : '';
      html += `<div class="pin-dot ${filled}"></div>`;
    }
    return html;
  }

  // Get keypad HTML
  getKeypadHTML() {
    const keys = [
      '1', '2', '3',
      '4', '5', '6',
      '7', '8', '9',
      'biometric', '0', 'delete'
    ];

    return keys.map(key => {
      if (key === 'delete') {
        return `
          <button class="pin-key action" data-key="delete" aria-label="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/>
              <line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
          </button>
        `;
      } else if (key === 'biometric') {
        return `<div class="pin-key action" style="visibility: hidden;"></div>`;
      } else {
        return `<button class="pin-key" data-key="${key}">${key}</button>`;
      }
    }).join('');
  }

  // Get lockout HTML
  getLockoutHTML() {
    const remaining = appLockService.getLockoutRemaining();
    return `
      <div class="lockout-message">
        <p>Too many failed attempts</p>
        <div class="lockout-timer" id="lockoutTimer">${this.formatTime(remaining)}</div>
      </div>
    `;
  }

  // Format time for lockout display
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Setup event listeners
  setupEventListeners() {
    const keypad = this.overlay.querySelector('#pinKeypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const key = e.target.closest('.pin-key');
        if (key && !key.disabled) {
          const value = key.dataset.key;
          this.handleKeyPress(value);
        }
      });
    }

    const biometricBtn = this.overlay.querySelector('#biometricBtn');
    if (biometricBtn) {
      biometricBtn.addEventListener('click', () => this.handleBiometric());
    }

    // Keyboard support
    document.addEventListener('keydown', this.handleKeyboardInput.bind(this));

    // Start lockout timer if needed
    if (appLockService.isLockedOut()) {
      this.startLockoutTimer();
    }
  }

  // Handle keyboard input
  handleKeyboardInput(e) {
    if (!this.overlay || !this.overlay.classList.contains('active')) return;

    if (/^\d$/.test(e.key)) {
      this.handleKeyPress(e.key);
    } else if (e.key === 'Backspace') {
      this.handleKeyPress('delete');
    }
  }

  // Handle key press
  async handleKeyPress(key) {
    if (appLockService.isLockedOut()) return;

    if (key === 'delete') {
      this.pinValue = this.pinValue.slice(0, -1);
      this.updatePinDots();
      this.clearError();
    } else if (/^\d$/.test(key) && this.pinValue.length < this.maxPinLength) {
      this.pinValue += key;
      this.updatePinDots();
      
      // Auto-submit when PIN is complete (4-6 digits)
      if (this.pinValue.length >= 4) {
        await this.verifyPin();
      }
    }
  }

  // Update PIN dots display
  updatePinDots() {
    const dotsContainer = this.overlay.querySelector('#pinDots');
    if (dotsContainer) {
      dotsContainer.innerHTML = this.getPinDotsHTML();
    }
  }

  // Verify entered PIN
  async verifyPin() {
    const result = await appLockService.verifyPin(this.pinValue);
    
    if (result.success) {
      appLockService.unlock();
      this.hide();
      if (this.onUnlockCallback) {
        this.onUnlockCallback();
      }
    } else {
      this.showError(result.error);
      this.shakeIcon();
      this.pinValue = '';
      this.updatePinDots(true);
      
      if (result.lockedOut) {
        this.showLockout();
      }
    }
  }

  // Handle biometric authentication
  async handleBiometric() {
    const result = await appLockService.authenticateWithBiometric();
    
    if (result.success) {
      appLockService.unlock();
      this.hide();
      if (this.onUnlockCallback) {
        this.onUnlockCallback();
      }
    } else {
      this.showError(result.error);
    }
  }

  // Show error message
  showError(message) {
    const errorEl = this.overlay.querySelector('#lockError');
    if (errorEl) {
      errorEl.textContent = message;
    }
    
    // Add error class to dots
    const dots = this.overlay.querySelectorAll('.pin-dot');
    dots.forEach(dot => dot.classList.add('error'));
    
    setTimeout(() => {
      dots.forEach(dot => dot.classList.remove('error'));
    }, 500);
  }

  // Clear error message
  clearError() {
    const errorEl = this.overlay.querySelector('#lockError');
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  // Shake lock icon on error
  shakeIcon() {
    const icon = this.overlay.querySelector('#lockIcon');
    if (icon) {
      icon.classList.add('shake');
      setTimeout(() => icon.classList.remove('shake'), 500);
    }
  }

  // Show lockout state
  showLockout() {
    const container = this.overlay.querySelector('.app-lock-container');
    if (container) {
      // Add lockout message if not present
      if (!container.querySelector('.lockout-message')) {
        const subtitle = container.querySelector('.app-lock-subtitle');
        if (subtitle) {
          subtitle.insertAdjacentHTML('afterend', this.getLockoutHTML());
        }
      }
      
      // Disable keypad
      const keys = container.querySelectorAll('.pin-key');
      keys.forEach(key => key.disabled = true);
      
      this.startLockoutTimer();
    }
  }

  // Start lockout countdown timer
  startLockoutTimer() {
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
    }

    this.lockoutInterval = setInterval(() => {
      const remaining = appLockService.getLockoutRemaining();
      const timerEl = this.overlay?.querySelector('#lockoutTimer');
      
      if (remaining <= 0) {
        clearInterval(this.lockoutInterval);
        this.lockoutInterval = null;
        this.removeLockout();
      } else if (timerEl) {
        timerEl.textContent = this.formatTime(remaining);
      }
    }, 1000);
  }

  // Remove lockout state
  removeLockout() {
    const lockoutMsg = this.overlay?.querySelector('.lockout-message');
    if (lockoutMsg) {
      lockoutMsg.remove();
    }
    
    // Re-enable keypad
    const keys = this.overlay?.querySelectorAll('.pin-key');
    keys?.forEach(key => key.disabled = false);
  }

  // Show lock screen
  show() {
    this.createOverlay();
    this.pinValue = '';
    
    // Force reflow before adding active class
    this.overlay.offsetHeight;
    this.overlay.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Hide lock screen
  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      document.body.style.overflow = '';
      
      // Clean up after animation
      setTimeout(() => {
        if (this.overlay && !this.overlay.classList.contains('active')) {
          this.overlay.remove();
          this.overlay = null;
        }
      }, 300);
    }
    
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
      this.lockoutInterval = null;
    }
  }

  // Set callback for successful unlock
  onUnlock(callback) {
    this.onUnlockCallback = callback;
  }

  // Destroy component
  destroy() {
    document.removeEventListener('keydown', this.handleKeyboardInput);
    if (this.lockoutInterval) {
      clearInterval(this.lockoutInterval);
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

// Create and export singleton instance
const appLock = new AppLock();
export default appLock;
