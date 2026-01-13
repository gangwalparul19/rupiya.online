// Toast Notification System

class ToastManager {
  constructor() {
    this.container = null;
    this.maxToasts = 5;
    this.activeToasts = [];
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 2000) {
    // Enforce max toasts limit
    if (this.activeToasts.length >= this.maxToasts) {
      const oldestToast = this.activeToasts.shift();
      oldestToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    
    const icon = this.getIcon(type);
    
    // Sanitize message to prevent XSS
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    const sanitizedMessage = messageEl.innerHTML;
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${sanitizedMessage}</div>
      <button class="toast-close" type="button" aria-label="Close notification">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    `;

    // Add close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    this.container.appendChild(toast);
    this.activeToasts.push(toast);

    // Auto remove after duration
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        this.removeToast(toast);
      }, duration);
      
      // Store timeout ID for cleanup
      toast.dataset.timeoutId = timeoutId;
    }

    return toast;
  }

  removeToast(toast) {
    if (!toast || !toast.parentElement) return;
    
    // Clear timeout if exists
    if (toast.dataset.timeoutId) {
      clearTimeout(parseInt(toast.dataset.timeoutId));
    }
    
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
      // Remove from active toasts array
      const index = this.activeToasts.indexOf(toast);
      if (index > -1) {
        this.activeToasts.splice(index, 1);
      }
    }, 300);
  }

  success(message, duration = 2000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 3000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 2000) {
    return this.show(message, 'info', duration);
  }

  getIcon(type) {
    const icons = {
      success: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`,
      error: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`,
      warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      info: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`
    };
    return icons[type] || icons.info;
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Create and export singleton instance
const toast = new ToastManager();
export default toast;

// Make toast available globally for privacy mode and other utilities
if (typeof window !== 'undefined') {
  window.showToast = (message, type, duration) => toast.show(message, type, duration);
}

// Add toast styles dynamically
const style = document.createElement('style');
style.textContent = `
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  }

  .toast-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toast-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.5;
    color: #2C3E50;
  }

  .toast-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #7F8C8D;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .toast-close:hover {
    background: #F8F9FA;
    color: #2C3E50;
  }

  .toast-success {
    border-left-color: #27AE60;
  }

  .toast-success .toast-icon {
    color: #27AE60;
  }

  .toast-error {
    border-left-color: #E74C3C;
  }

  .toast-error .toast-icon {
    color: #E74C3C;
  }

  .toast-warning {
    border-left-color: #F39C12;
  }

  .toast-warning .toast-icon {
    color: #F39C12;
  }

  .toast-info {
    border-left-color: #3498DB;
  }

  .toast-info .toast-icon {
    color: #3498DB;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.fade-out {
    animation: fadeOut 0.3s ease-out forwards;
  }

  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateX(400px);
    }
  }

  @media (max-width: 576px) {
    .toast-container {
      left: 20px;
      right: 20px;
      max-width: none;
    }

    .toast {
      min-width: auto;
    }
  }
`;
document.head.appendChild(style);
