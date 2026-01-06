// PIN Setup Modal Component - For setting up or changing PIN
import appLockService from '../services/app-lock-service.js';
import toast from './toast.js';

class PinSetupModal {
  constructor() {
    this.modal = null;
    this.step = 1; // 1 = enter PIN, 2 = confirm PIN, 3 = current PIN (for change)
    this.firstPin = '';
    this.currentPin = '';
    this.pinValue = '';
    this.maxPinLength = 6;
    this.minPinLength = 4;
    this.mode = 'setup'; // 'setup', 'change', 'disable'
    this.onCompleteCallback = null;
  }

  // Show modal for setting up new PIN
  showSetup(onComplete) {
    this.mode = 'setup';
    this.step = 1;
    this.onCompleteCallback = onComplete;
    this.show();
  }

  // Show modal for changing PIN
  showChange(onComplete) {
    this.mode = 'change';
    this.step = 3; // Start with current PIN verification
    this.onCompleteCallback = onComplete;
    this.show();
  }

  // Show modal for disabling PIN
  showDisable(onComplete) {
    this.mode = 'disable';
    this.step = 3; // Verify current PIN
    this.onCompleteCallback = onComplete;
    this.show();
  }

  // Create and show modal
  show() {
    this.pinValue = '';
    this.firstPin = '';
    this.currentPin = '';
    this.createModal();
    
    // Force reflow
    this.modal.offsetHeight;
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  // Create modal HTML
  createModal() {
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.className = 'modal-overlay';
    this.modal.id = 'pinSetupModal';
    this.modal.innerHTML = this.getModalHTML();
    document.body.appendChild(this.modal);

    this.setupEventListeners();
  }

  // Get modal HTML based on current step
  getModalHTML() {
    const { title, subtitle } = this.getStepContent();

    return `
      <div class="modal-container modal-sm">
        <div class="modal-header">
          <h2 class="modal-title">${this.getModalTitle()}</h2>
          <button class="modal-close" id="closePinSetupBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="pin-setup-step">
            <h3>${title}</h3>
            <p>${subtitle}</p>
            
            <div class="pin-input-display" id="pinDisplay">
              ${this.getPinDisplayHTML()}
            </div>
            
            <div class="app-lock-error" id="pinSetupError"></div>
            
            <div class="pin-keypad" id="setupKeypad">
              ${this.getKeypadHTML()}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="cancelPinSetupBtn">Cancel</button>
          <button class="btn btn-primary" id="confirmPinBtn" disabled>
            <span id="confirmPinBtnText">${this.getButtonText()}</span>
            <span id="confirmPinBtnSpinner" class="spinner" style="display: none;"></span>
          </button>
        </div>
      </div>
    `;
  }

  // Get modal title based on mode
  getModalTitle() {
    switch (this.mode) {
      case 'setup': return 'Set Up App Lock';
      case 'change': return 'Change PIN';
      case 'disable': return 'Disable App Lock';
      default: return 'App Lock';
    }
  }

  // Get step content
  getStepContent() {
    if (this.step === 3) {
      return {
        title: 'Enter Current PIN',
        subtitle: 'Verify your current PIN to continue'
      };
    } else if (this.step === 1) {
      return {
        title: 'Create Your PIN',
        subtitle: `Enter a ${this.minPinLength}-${this.maxPinLength} digit PIN`
      };
    } else {
      return {
        title: 'Confirm Your PIN',
        subtitle: 'Enter the same PIN again to confirm'
      };
    }
  }

  // Get button text
  getButtonText() {
    if (this.mode === 'disable' && this.step === 3) {
      return 'Disable';
    }
    if (this.step === 2 || (this.mode === 'change' && this.step === 1)) {
      return 'Confirm';
    }
    return 'Next';
  }

  // Get PIN display HTML
  getPinDisplayHTML() {
    let html = '';
    for (let i = 0; i < this.maxPinLength; i++) {
      const filled = i < this.pinValue.length ? 'filled' : '';
      const active = i === this.pinValue.length ? 'active' : '';
      const char = i < this.pinValue.length ? '•' : '';
      html += `<div class="pin-input-box ${filled} ${active}">${char}</div>`;
    }
    return html;
  }

  // Get keypad HTML
  getKeypadHTML() {
    const keys = [
      '1', '2', '3',
      '4', '5', '6',
      '7', '8', '9',
      '', '0', 'delete'
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
      } else if (key === '') {
        return `<div class="pin-key action" style="visibility: hidden;"></div>`;
      } else {
        return `<button class="pin-key" data-key="${key}">${key}</button>`;
      }
    }).join('');
  }

  // Setup event listeners
  setupEventListeners() {
    // Close button
    this.modal.querySelector('#closePinSetupBtn')?.addEventListener('click', () => this.hide());
    this.modal.querySelector('#cancelPinSetupBtn')?.addEventListener('click', () => this.hide());

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });

    // Keypad
    const keypad = this.modal.querySelector('#setupKeypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const key = e.target.closest('.pin-key');
        if (key) {
          const value = key.dataset.key;
          this.handleKeyPress(value);
        }
      });
    }

    // Confirm button
    this.modal.querySelector('#confirmPinBtn')?.addEventListener('click', () => this.handleConfirm());

    // Keyboard support
    this.keyboardHandler = this.handleKeyboardInput.bind(this);
    document.addEventListener('keydown', this.keyboardHandler);
  }

  // Handle keyboard input
  handleKeyboardInput(e) {
    if (!this.modal || !this.modal.classList.contains('show')) return;

    if (/^\d$/.test(e.key)) {
      this.handleKeyPress(e.key);
    } else if (e.key === 'Backspace') {
      this.handleKeyPress('delete');
    } else if (e.key === 'Enter') {
      const confirmBtn = this.modal.querySelector('#confirmPinBtn');
      if (confirmBtn && !confirmBtn.disabled) {
        this.handleConfirm();
      }
    } else if (e.key === 'Escape') {
      this.hide();
    }
  }

  // Handle key press
  handleKeyPress(key) {
    if (key === 'delete') {
      this.pinValue = this.pinValue.slice(0, -1);
    } else if (/^\d$/.test(key) && this.pinValue.length < this.maxPinLength) {
      this.pinValue += key;
    }

    this.updateDisplay();
    this.clearError();
    this.updateConfirmButton();
  }

  // Update PIN display
  updateDisplay() {
    const display = this.modal.querySelector('#pinDisplay');
    if (display) {
      display.innerHTML = this.getPinDisplayHTML();
    }
  }

  // Update confirm button state
  updateConfirmButton() {
    const btn = this.modal.querySelector('#confirmPinBtn');
    if (btn) {
      btn.disabled = this.pinValue.length < this.minPinLength;
    }
  }

  // Handle confirm button click
  async handleConfirm() {
    const btn = this.modal.querySelector('#confirmPinBtn');
    const btnText = this.modal.querySelector('#confirmPinBtnText');
    const btnSpinner = this.modal.querySelector('#confirmPinBtnSpinner');

    if (this.step === 3) {
      // Verify current PIN
      btn.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline-block';

      const result = await appLockService.verifyPin(this.pinValue);
      
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';

      if (result.success) {
        this.currentPin = this.pinValue;
        
        if (this.mode === 'disable') {
          // Disable app lock
          await this.disableAppLock();
        } else {
          // Move to enter new PIN
          this.step = 1;
          this.pinValue = '';
          this.updateModalContent();
        }
      } else {
        this.showError(result.error);
        this.pinValue = '';
        this.updateDisplay();
      }
    } else if (this.step === 1) {
      // Save first PIN and move to confirm
      this.firstPin = this.pinValue;
      this.step = 2;
      this.pinValue = '';
      this.updateModalContent();
    } else if (this.step === 2) {
      // Verify PINs match
      if (this.pinValue !== this.firstPin) {
        this.showError('PINs do not match. Please try again.');
        this.step = 1;
        this.pinValue = '';
        this.firstPin = '';
        this.updateModalContent();
        return;
      }

      // Enable/change app lock
      btn.disabled = true;
      btnText.style.display = 'none';
      btnSpinner.style.display = 'inline-block';

      let result;
      if (this.mode === 'change') {
        result = await appLockService.changePin(this.currentPin, this.pinValue);
      } else {
        result = await appLockService.enableAppLock(this.pinValue);
      }

      btn.disabled = false;
      btnText.style.display = 'inline';
      btnSpinner.style.display = 'none';

      if (result.success) {
        toast.success(this.mode === 'change' ? 'PIN changed successfully' : 'App Lock enabled');
        this.hide();
        if (this.onCompleteCallback) {
          this.onCompleteCallback(true);
        }
      } else {
        this.showError(result.error);
      }
    }
  }

  // Disable app lock
  async disableAppLock() {
    const result = await appLockService.disableAppLock(this.currentPin);
    
    if (result.success) {
      toast.success('App Lock disabled');
      this.hide();
      if (this.onCompleteCallback) {
        this.onCompleteCallback(true);
      }
    } else {
      this.showError(result.error);
    }
  }

  // Update modal content for new step
  updateModalContent() {
    const { title, subtitle } = this.getStepContent();
    
    const stepTitle = this.modal.querySelector('.pin-setup-step h3');
    const stepSubtitle = this.modal.querySelector('.pin-setup-step p');
    const btnText = this.modal.querySelector('#confirmPinBtnText');
    
    if (stepTitle) stepTitle.textContent = title;
    if (stepSubtitle) stepSubtitle.textContent = subtitle;
    if (btnText) btnText.textContent = this.getButtonText();
    
    this.updateDisplay();
    this.updateConfirmButton();
    this.clearError();
  }

  // Show error message
  showError(message) {
    const errorEl = this.modal.querySelector('#pinSetupError');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  // Clear error message
  clearError() {
    const errorEl = this.modal.querySelector('#pinSetupError');
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  // Hide modal
  hide() {
    if (this.modal) {
      this.modal.classList.remove('show');
      document.body.style.overflow = '';
      
      // Remove keyboard listener
      if (this.keyboardHandler) {
        document.removeEventListener('keydown', this.keyboardHandler);
      }
      
      // Clean up after animation
      setTimeout(() => {
        if (this.modal) {
          this.modal.remove();
          this.modal = null;
        }
      }, 300);
    }
  }
}

// Create and export singleton instance
const pinSetupModal = new PinSetupModal();
export default pinSetupModal;
