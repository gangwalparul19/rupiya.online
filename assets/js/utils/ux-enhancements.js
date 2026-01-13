// UX Enhancements - Interactive improvements
// Provides scroll progress, better focus management, and micro-interactions

class UXEnhancements {
  constructor() {
    this.init();
  }

  init() {
    this.initScrollProgress();
    this.initSkipLink();
    this.initSmoothScrolling();
    this.initKeyboardNavigation();
    this.initFormEnhancements();
    this.initLazyLoading();
  }

  // Scroll progress indicator
  initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.id = 'scrollProgress';
    document.body.prepend(progressBar);

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${progress}%`;
    }, { passive: true });
  }

  // Skip to main content link for accessibility
  initSkipLink() {
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (!mainContent) return;

    mainContent.id = mainContent.id || 'main-content';

    // Check if skip link already exists
    if (document.querySelector('.skip-link')) return;

    const skipLink = document.createElement('a');
    skipLink.href = `#${mainContent.id}`;
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('tabindex', '0');
    
    // Insert after body opening, not prepend to avoid layout issues
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // Smooth scrolling for anchor links
  initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          target.focus({ preventScroll: true });
        }
      });
    });
  }

  // Better keyboard navigation
  initKeyboardNavigation() {
    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal-overlay.show');
        if (openModal) {
          const closeBtn = openModal.querySelector('.modal-close');
          if (closeBtn) closeBtn.click();
        }
      }
    });

    // Tab trap for modals
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
    });
  }

  // Form enhancements
  initFormEnhancements() {
    // Note: btn-loading is NOT auto-added here anymore
    // Each page handles its own button loading states in the form submit handlers
    // This prevents double-spinner issues and ensures proper cleanup

    // Clear search on escape
    document.querySelectorAll('input[type="search"], #searchInput').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    // Number input scroll prevention
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('wheel', (e) => {
        if (document.activeElement === input) {
          e.preventDefault();
        }
      }, { passive: false });
    });
  }

  // Lazy loading for images
  initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }

  // Scroll animation observer
  static initScrollAnimations() {
    if ('IntersectionObserver' in window) {
      const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            animationObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.scroll-animate').forEach(el => {
        animationObserver.observe(el);
      });
    }
  }

  // Show toast notification
  static showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} alert-animated`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>
    `;
    
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Confirm dialog
  static async confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      overlay.innerHTML = `
        <div class="modal-container modal-sm" style="animation: scaleIn 0.3s ease">
          <div class="modal-header">
            <h2 class="modal-title">${title}</h2>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" data-action="cancel">Cancel</button>
            <button class="btn btn-primary" data-action="confirm">Confirm</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      overlay.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'confirm') {
          resolve(true);
          overlay.remove();
        } else if (action === 'cancel' || e.target === overlay) {
          resolve(false);
          overlay.remove();
        }
      });
    });
  }

  // Format relative time
  static formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  // Debounce utility
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle utility
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new UXEnhancements());
} else {
  new UXEnhancements();
}

// Export for module usage
export default UXEnhancements;
