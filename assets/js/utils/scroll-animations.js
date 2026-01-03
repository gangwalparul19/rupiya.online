// Scroll Animations Utility
// Adds animations to elements when they come into view

class ScrollAnimations {
  constructor() {
    this.observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    this.init();
  }
  
  init() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Make all elements visible without animation
      document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right').forEach(el => {
        el.classList.add('visible');
      });
      return;
    }
    
    this.setupObserver();
    this.observeElements();
  }
  
  setupObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Optionally unobserve after animation
          // this.observer.unobserve(entry.target);
        }
      });
    }, this.observerOptions);
  }
  
  observeElements() {
    // Observe elements with scroll animation classes
    const animatedElements = document.querySelectorAll(
      '.scroll-animate, .scroll-animate-left, .scroll-animate-right, .card-animated'
    );
    
    animatedElements.forEach(el => {
      this.observer.observe(el);
    });
  }
  
  // Method to add animation to dynamically added elements
  observe(element) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }
  
  // Method to refresh observations (useful after dynamic content load)
  refresh() {
    this.observeElements();
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.scrollAnimations = new ScrollAnimations();
  });
} else {
  window.scrollAnimations = new ScrollAnimations();
}

// Add stagger animation to card grids
function addStaggerAnimation(containerSelector, itemSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  const items = container.querySelectorAll(itemSelector);
  items.forEach((item, index) => {
    item.style.animationDelay = `${index * 100}ms`;
    item.classList.add('card-animated');
  });
}

// Utility to animate numbers counting up
function animateNumber(element, target, duration = 1000, prefix = '', suffix = '') {
  const start = 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easeOut);
    
    element.textContent = prefix + current.toLocaleString() + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = prefix + target.toLocaleString() + suffix;
    }
  }
  
  requestAnimationFrame(update);
}

// Export for module usage
export { ScrollAnimations, addStaggerAnimation, animateNumber };
