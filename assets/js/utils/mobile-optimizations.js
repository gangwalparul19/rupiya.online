// Mobile Optimizations Utility
// Provides mobile-first UX improvements

class MobileOptimizations {
  constructor() {
    this.isMobile = this.detectMobile();
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.init();
  }

  /**
   * Initialize mobile optimizations
   */
  init() {
    if (this.isMobile) {
      this.optimizeTouchTargets();
      this.setupSwipeGestures();
      this.optimizeFormLayouts();
      this.setupBottomSheetModals();
      this.optimizeKeyboardHandling();
      this.setupPullToRefresh();
    }
  }

  /**
   * Detect if device is mobile
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }

  /**
   * Optimize touch targets to minimum 48px
   */
  optimizeT ouchTargets() {
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width < 48 || rect.height < 48) {
        btn.style.minWidth = '48px';
        btn.style.minHeight = '48px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
      }
    });
  }

  /**
   * Setup swipe gestures for mobile
   */
  setupSwipeGestures() {
    document.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    }, false);
  }

  /**
   * Handle swipe gestures
   */
  handleSwipe() {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left
        this.triggerSwipeLeft();
      } else {
        // Swiped right
        this.triggerSwipeRight();
      }
    }
  }

  /**
   * Trigger swipe left action (e.g., delete)
   */
  triggerSwipeLeft() {
    // Find swipeable items and show delete action
    const swipeableItems = document.querySelectorAll('[data-swipeable]');
    swipeableItems.forEach(item => {
      item.classList.add('swiped-left');
    });
  }

  /**
   * Trigger swipe right action (e.g., back)
   */
  triggerSwipeRight() {
    // Could trigger back navigation or other actions
  }

  /**
   * Optimize form layouts for mobile
   */
  optimizeFormLayouts() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      // Make form single column on mobile
      const formGroups = form.querySelectorAll('.form-group');
      formGroups.forEach(group => {
        group.style.width = '100%';
      });

      // Increase input sizes
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.style.minHeight = '44px';
        input.style.fontSize = '16px'; // Prevents zoom on iOS
        input.style.padding = '12px';
      });

      // Stack buttons vertically
      const buttons = form.querySelectorAll('button');
      if (buttons.length > 1) {
        const buttonContainer = buttons[0].parentElement;
        if (buttonContainer) {
          buttonContainer.style.display = 'flex';
          buttonContainer.style.flexDirection = 'column';
          buttonContainer.style.gap = '0.75rem';
        }
      }
    });
  }

  /**
   * Setup bottom sheet modals for mobile
   */
  setupBottomSheetModals() {
    const modals = document.querySelectorAll('.modal, [role="dialog"]');
    modals.forEach(modal => {
      if (this.isMobile) {
        modal.classList.add('bottom-sheet-modal');
      }
    });
  }

  /**
   * Optimize keyboard handling
   */
  optimizeKeyboardHandling() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        // Scroll input into view when focused
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });

      // Set appropriate keyboard types
      if (input.type === 'email') {
        input.setAttribute('inputmode', 'email');
      } else if (input.type === 'tel') {
        input.setAttribute('inputmode', 'tel');
      } else if (input.type === 'number') {
        input.setAttribute('inputmode', 'numeric');
      }
    });
  }

  /**
   * Setup pull-to-refresh functionality
   */
  setupPullToRefresh() {
    let pullStartY = 0;
    let isPulling = false;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        pullStartY = e.touches[0].clientY;
        isPulling = true;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      const pullDistance = e.touches[0].clientY - pullStartY;
      if (pullDistance > 100) {
        this.showPullToRefreshIndicator();
      }
    });

    document.addEventListener('touchend', () => {
      if (isPulling) {
        isPulling = false;
        this.hidePullToRefreshIndicator();
      }
    });
  }

  /**
   * Show pull-to-refresh indicator
   */
  showPullToRefreshIndicator() {
    let indicator = document.getElementById('pull-to-refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pull-to-refresh-indicator';
      indicator.className = 'pull-to-refresh-indicator';
      indicator.innerHTML = '↓ Pull to refresh';
      document.body.insertBefore(indicator, document.body.firstChild);
    }
    indicator.style.display = 'block';
  }

  /**
   * Hide pull-to-refresh indicator
   */
  hidePullToRefreshIndicator() {
    const indicator = document.getElementById('pull-to-refresh-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Setup swipeable list items
   */
  setupSwipeableItems() {
    const items = document.querySelectorAll('[data-swipeable]');
    items.forEach(item => {
      let startX = 0;

      item.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });

      item.addEventListener('touchmove', (e) => {
        const currentX = e.touches[0].clientX;
        const diff = startX - currentX;

        if (diff > 50) {
          item.classList.add('swiped');
          item.style.transform = `translateX(-${Math.min(diff, 100)}px)`;
        }
      });

      item.addEventListener('touchend', () => {
        if (item.classList.contains('swiped')) {
          item.style.transform = 'translateX(-100px)';
        } else {
          item.style.transform = 'translateX(0)';
        }
      });
    });
  }

  /**
   * Get viewport dimensions
   */
  getViewportDimensions() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isPortrait: window.innerHeight > window.innerWidth,
      isLandscape: window.innerWidth > window.innerHeight
    };
  }

  /**
   * Handle orientation change
   */
  onOrientationChange(callback) {
    window.addEventListener('orientationchange', () => {
      const dimensions = this.getViewportDimensions();
      callback(dimensions);
    });
  }

  /**
   * Disable zoom on double tap
   */
  disableDoubleClickZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  /**
   * Setup viewport meta tag
   */
  setupViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes';
  }

  /**
   * Check if device has notch
   */
  hasNotch() {
    return CSS.supports('padding-top: max(0px)');
  }

  /**
   * Apply safe area insets
   */
  applySafeAreaInsets() {
    if (this.hasNotch()) {
      document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
      document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
    }
  }
}

// Create and export singleton instance
const mobileOptimizations = new MobileOptimizations();
export default mobileOptimizations;
