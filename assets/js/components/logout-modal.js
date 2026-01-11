/**
 * Logout Confirmation Modal
 * Beautiful modal for logout confirmation
 */

class LogoutModal {
  constructor() {
    this.modal = null;
    this.resolvePromise = null;
    this.isShowing = false;
    this.init();
  }

  init() {
    // Create modal HTML
    const modalHTML = `
      <div class="logout-modal-overlay" id="logoutModalOverlay">
        <div class="logout-modal-container">
          <div class="logout-modal-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </div>
          <h2 class="logout-modal-title">Logout Confirmation</h2>
          <p class="logout-modal-message">We'll miss you! Are you sure you want to logout?</p>
          <p class="logout-modal-submessage">Your data is securely encrypted and will be waiting for you when you return.</p>
          <div class="logout-modal-actions">
            <button class="logout-modal-btn logout-modal-btn-cancel" id="logoutModalCancel" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Stay Logged In
            </button>
            <button class="logout-modal-btn logout-modal-btn-confirm" id="logoutModalConfirm" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Yes, Logout
            </button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    this.modal = tempDiv.firstElementChild;
    document.body.appendChild(this.modal);

    // Add event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    const cancelBtn = document.getElementById('logoutModalCancel');
    const confirmBtn = document.getElementById('logoutModalConfirm');
    const overlay = document.getElementById('logoutModalOverlay');

    // Cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        this.resolveWithValue(false);
      });
    }

    // Confirm button
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        this.resolveWithValue(true);
      });
    }

    // Click outside to cancel
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hide();
          this.resolveWithValue(false);
        }
      });
    }

    // ESC key to cancel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isShowing) {
        this.hide();
        this.resolveWithValue(false);
      }
    });
  }

  // Safely resolve promise only once
  resolveWithValue(value) {
    if (this.resolvePromise) {
      this.resolvePromise(value);
      this.resolvePromise = null;
    }
  }

  show() {
    return new Promise((resolve) => {
      // Prevent multiple concurrent shows
      if (this.isShowing) {
        resolve(false);
        return;
      }

      this.isShowing = true;
      this.resolvePromise = resolve;
      
      if (this.modal) {
        this.modal.style.display = 'flex';
        // Focus on confirm button for accessibility
        const confirmBtn = document.getElementById('logoutModalConfirm');
        if (confirmBtn) {
          setTimeout(() => confirmBtn.focus(), 100);
        }
      }
    });
  }

  hide() {
    this.isShowing = false;
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
}

// Create and export singleton instance
const logoutModal = new LogoutModal();
export default logoutModal;
