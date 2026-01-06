// Encryption Re-authentication Modal
// Shows when user needs to re-enter password to decrypt data after page refresh

import authService from '../services/auth-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';
import encryptionService from '../services/encryption-service.js';

class EncryptionReauthModal {
  constructor() {
    this.modal = null;
    this.isShowing = false;
    this.onSuccess = null;
    this.init();
  }

  init() {
    // Listen for reauth needed event
    window.addEventListener('encryption-reauth-needed', (e) => {
      this.show(e.detail?.message);
    });
  }

  createModal() {
    if (this.modal) return;

    const modalHtml = `
      <div id="encryptionReauthModal" class="modal-overlay" style="display: none;">
        <div class="modal-container" style="max-width: 400px;">
          <div class="modal-header">
            <h3 class="modal-title">
              <span style="margin-right: 8px;">🔐</span>
              Unlock Your Data
            </h3>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: 16px; color: var(--text-secondary);">
              Your data is encrypted for privacy. Please enter your password to decrypt it.
            </p>
            <form id="encryptionReauthForm">
              <div class="form-group">
                <label for="reauthPassword" class="form-label">Password</label>
                <div class="password-input-wrapper" style="position: relative;">
                  <input 
                    type="password" 
                    id="reauthPassword" 
                    class="form-input" 
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                  >
                  <button type="button" id="toggleReauthPassword" class="password-toggle" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-secondary);">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div id="reauthError" class="form-error" style="display: none; color: var(--danger); margin-bottom: 12px;"></div>
              <div class="modal-actions" style="display: flex; gap: 12px; margin-top: 20px;">
                <button type="button" id="reauthSkipBtn" class="btn btn-secondary" style="flex: 1;">
                  Skip (View Only)
                </button>
                <button type="submit" id="reauthSubmitBtn" class="btn btn-primary" style="flex: 1;">
                  <span id="reauthBtnText">Unlock</span>
                  <span id="reauthBtnSpinner" class="spinner" style="display: none;"></span>
                </button>
              </div>
            </form>
            <p style="margin-top: 16px; font-size: 12px; color: var(--text-muted); text-align: center;">
              <a href="#" id="reauthLogoutLink" style="color: var(--primary);">Sign out and use a different account</a>
            </p>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = document.getElementById('encryptionReauthModal');

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    const form = document.getElementById('encryptionReauthForm');
    const passwordInput = document.getElementById('reauthPassword');
    const toggleBtn = document.getElementById('toggleReauthPassword');
    const skipBtn = document.getElementById('reauthSkipBtn');
    const logoutLink = document.getElementById('reauthLogoutLink');

    // Toggle password visibility
    toggleBtn?.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
    });

    // Form submission
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    // Skip button
    skipBtn?.addEventListener('click', () => {
      this.hide();
      // User chose to skip - data will remain encrypted
      console.log('[EncryptionReauth] User skipped re-authentication');
    });

    // Logout link
    logoutLink?.addEventListener('click', async (e) => {
      e.preventDefault();
      await authService.signOut();
      window.location.href = 'login.html';
    });

    // Close on overlay click
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        // Don't close on overlay click - user must make a choice
      }
    });
  }

  async handleSubmit() {
    const passwordInput = document.getElementById('reauthPassword');
    const submitBtn = document.getElementById('reauthSubmitBtn');
    const btnText = document.getElementById('reauthBtnText');
    const btnSpinner = document.getElementById('reauthBtnSpinner');
    const errorDiv = document.getElementById('reauthError');

    const password = passwordInput?.value;
    if (!password) {
      this.showError('Please enter your password');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    errorDiv.style.display = 'none';

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        this.showError('User not authenticated');
        return;
      }

      // Try to initialize encryption with the password
      const success = await authEncryptionHelper.initializeAfterLogin(password, user.uid);

      if (success) {
        this.hide();
        
        // Trigger a page reload to refresh data with decryption
        if (this.onSuccess) {
          this.onSuccess();
        } else {
          // Reload the page to refresh all data
          window.location.reload();
        }
      } else {
        this.showError('Incorrect password. Please try again.');
      }
    } catch (error) {
      console.error('[EncryptionReauth] Error:', error);
      this.showError('Failed to unlock data. Please try again.');
    } finally {
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('reauthError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  show(message, onSuccess = null) {
    if (this.isShowing) return;

    this.createModal();
    this.onSuccess = onSuccess;
    this.isShowing = true;

    // Reset form
    const form = document.getElementById('encryptionReauthForm');
    form?.reset();
    
    const errorDiv = document.getElementById('reauthError');
    if (errorDiv) errorDiv.style.display = 'none';

    // Show modal
    this.modal.style.display = 'flex';
    
    // Focus password input
    setTimeout(() => {
      document.getElementById('reauthPassword')?.focus();
    }, 100);
  }

  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    this.isShowing = false;
    this.onSuccess = null;
  }

  // Check if reauth is needed and show modal
  checkAndPrompt(onSuccess = null) {
    const user = authService.getCurrentUser();
    if (!user) return false;

    // Check if encryption is needed but not initialized
    if (authEncryptionHelper.needsReinitialization()) {
      // Don't prompt for Google users
      if (authEncryptionHelper.isGoogleUser()) {
        console.log('[EncryptionReauth] Google user - encryption not available');
        return false;
      }

      this.show('Please enter your password to decrypt your data', onSuccess);
      return true;
    }

    return false;
  }
}

// Create and export singleton instance
const encryptionReauthModal = new EncryptionReauthModal();
export default encryptionReauthModal;
