// Confirmation Modal Component
// Reusable modal for confirmations across the application

class ConfirmationModal {
  constructor() {
    this.modal = null;
    this.resolveCallback = null;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createModal());
    } else {
      this.createModal();
    }
  }

  createModal() {
    console.log('[ConfirmationModal] Creating modal...');
    
    // Create modal HTML
    const modalHTML = `
      <div id="confirmationModal" class="modal-overlay" style="display: none;">
        <div class="modal-container confirmation-modal-container">
          <div class="modal-header">
            <h2 class="modal-title" id="confirmationModalTitle">Confirm Action</h2>
            <button class="modal-close" id="confirmationModalClose">&times;</button>
          </div>
          <div class="modal-body">
            <div class="confirmation-icon" id="confirmationModalIcon">⚠️</div>
            <p class="confirmation-message" id="confirmationModalMessage">Are you sure?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirmationModalCancel">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirmationModalConfirm">Confirm</button>
          </div>
        </div>
      </div>
    `;

    // Add to body if not already present
    if (!document.getElementById('confirmationModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      console.log('[ConfirmationModal] Modal HTML added to DOM');
    } else {
      console.log('[ConfirmationModal] Modal already exists in DOM');
    }

    this.modal = document.getElementById('confirmationModal');
    this.setupEventListeners();
    console.log('[ConfirmationModal] Modal initialized successfully');
  }

  setupEventListeners() {
    const closeBtn = document.getElementById('confirmationModalClose');
    const cancelBtn = document.getElementById('confirmationModalCancel');
    const confirmBtn = document.getElementById('confirmationModalConfirm');

    closeBtn?.addEventListener('click', () => this.hide(false));
    cancelBtn?.addEventListener('click', () => this.hide(false));
    confirmBtn?.addEventListener('click', () => this.hide(true));

    // Close on overlay click
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide(false);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.style.display === 'flex') {
        this.hide(false);
      }
    });
  }

  /**
   * Show confirmation modal
   * @param {Object} options - Configuration options
   * @param {string} options.title - Modal title
   * @param {string} options.message - Confirmation message
   * @param {string} options.confirmText - Confirm button text (default: "Confirm")
   * @param {string} options.cancelText - Cancel button text (default: "Cancel")
   * @param {string} options.type - Modal type: 'danger', 'warning', 'info' (default: 'warning')
   * @param {string} options.icon - Custom icon emoji (optional)
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  show(options = {}) {
    // Ensure modal is created
    if (!this.modal) {
      console.log('[ConfirmationModal] Modal not initialized, creating now...');
      this.createModal();
    }

    const {
      title = 'Confirm Action',
      message = 'Are you sure?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning',
      icon = null
    } = options;

    try {
      // Set content
      const titleEl = document.getElementById('confirmationModalTitle');
      const messageEl = document.getElementById('confirmationModalMessage');
      const confirmBtnEl = document.getElementById('confirmationModalConfirm');
      const cancelBtnEl = document.getElementById('confirmationModalCancel');

      if (!titleEl || !messageEl || !confirmBtnEl || !cancelBtnEl) {
        console.error('[ConfirmationModal] Modal elements not found, recreating modal...');
        this.createModal();
      }

      document.getElementById('confirmationModalTitle').textContent = title;
      document.getElementById('confirmationModalMessage').textContent = message;
      document.getElementById('confirmationModalConfirm').textContent = confirmText;
      document.getElementById('confirmationModalCancel').textContent = cancelText;

    // Set icon based on type
    const iconEl = document.getElementById('confirmationModalIcon');
    const defaultIcons = {
      danger: '🗑️',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    if (iconEl) {
      iconEl.textContent = icon || defaultIcons[type] || defaultIcons.warning;
      iconEl.className = `confirmation-icon confirmation-icon-${type}`;
    }

    // Set confirm button style based on type
    const confirmBtn = document.getElementById('confirmationModalConfirm');
    if (confirmBtn) {
      confirmBtn.className = 'btn';
      if (type === 'danger') {
        confirmBtn.classList.add('btn-danger');
      } else if (type === 'warning') {
        confirmBtn.classList.add('btn-warning');
      } else {
        confirmBtn.classList.add('btn-primary');
      }
    }

    // Show modal
    if (this.modal) {
      this.modal.style.display = 'flex';
    } else {
      console.error('[ConfirmationModal] Modal element not found!');
      return Promise.resolve(false);
    }

    // Return promise
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
    });
    } catch (error) {
      console.error('[ConfirmationModal] Error showing modal:', error);
      return Promise.resolve(false);
    }
  }

  hide(confirmed) {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    if (this.resolveCallback) {
      this.resolveCallback(confirmed);
      this.resolveCallback = null;
    }
  }

  /**
   * Quick confirm method for common use case
   * @param {string} message - Confirmation message
   * @returns {Promise<boolean>}
   */
  async confirm(message) {
    return this.show({ message });
  }

  /**
   * Delete confirmation
   * @param {string} itemName - Name of item to delete
   * @returns {Promise<boolean>}
   */
  async confirmDelete(itemName) {
    return this.show({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      icon: '🗑️'
    });
  }

  /**
   * Reset confirmation
   * @param {string} message - Reset message
   * @returns {Promise<boolean>}
   */
  async confirmReset(message = 'Reset to defaults? Your custom settings will be lost.') {
    return this.show({
      title: 'Reset Confirmation',
      message,
      confirmText: 'Reset',
      type: 'warning',
      icon: '🔄'
    });
  }
}

// Create and export singleton instance
const confirmationModal = new ConfirmationModal();
export default confirmationModal;
