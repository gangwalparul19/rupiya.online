/**
 * Button State Manager
 * Ensures buttons always reset properly after operations
 */

class ButtonStateManager {
  constructor() {
    this.activeButtons = new Map();
    this.resetTimeout = 10000; // 10 seconds max loading time
  }

  /**
   * Set button to loading state
   * @param {HTMLElement|string} button - Button element or ID
   * @param {string} loadingText - Text to show while loading
   */
  setLoading(button, loadingText = 'Loading...') {
    const btn = typeof button === 'string' ? document.getElementById(button) : button;
    if (!btn) return;

    // Store original state
    const originalText = btn.textContent;
    const originalDisabled = btn.disabled;

    this.activeButtons.set(btn, {
      originalText,
      originalDisabled,
      timestamp: Date.now()
    });

    // Set loading state
    btn.disabled = true;
    btn.textContent = loadingText;

    // Auto-reset after timeout
    setTimeout(() => {
      if (this.activeButtons.has(btn)) {
        console.warn('Button auto-reset after timeout:', btn.id || btn);
        this.reset(btn);
      }
    }, this.resetTimeout);
  }

  /**
   * Reset button to original state
   * @param {HTMLElement|string} button - Button element or ID
   */
  reset(button) {
    const btn = typeof button === 'string' ? document.getElementById(button) : button;
    if (!btn) return;

    const state = this.activeButtons.get(btn);
    if (state) {
      btn.textContent = state.originalText;
      btn.disabled = state.originalDisabled;
      this.activeButtons.delete(btn);
    } else {
      // Fallback reset
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    }
  }

  /**
   * Reset all active buttons
   */
  resetAll() {
    this.activeButtons.forEach((state, btn) => {
      this.reset(btn);
    });
  }

  /**
   * Check for stuck buttons and reset them
   */
  checkStuckButtons() {
    const now = Date.now();
    this.activeButtons.forEach((state, btn) => {
      if (now - state.timestamp > this.resetTimeout) {
        console.warn('Resetting stuck button:', btn.id || btn);
        this.reset(btn);
      }
    });
  }
}

// Create global instance
window.buttonStateManager = new ButtonStateManager();

// Auto-check for stuck buttons every 5 seconds
setInterval(() => {
  window.buttonStateManager.checkStuckButtons();
}, 5000);

// Reset all buttons on page visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    window.buttonStateManager.resetAll();
  }
});

// Reset all buttons on page load
window.addEventListener('load', () => {
  // Reset any buttons that might be stuck from previous session
  document.querySelectorAll('.btn:disabled, .btn-loading').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
  });
});

// Export for use in modules
export default ButtonStateManager;
