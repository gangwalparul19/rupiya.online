/**
 * KPI Tooltip Manager
 * Handles tooltip display for KPI cards with proper mobile support
 */

class KPITooltipManager {
  constructor() {
    this.tooltips = new Map();
    this.activeTooltip = null;
  }

  /**
   * Initialize tooltips on KPI cards
   */
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupTooltips());
    } else {
      this.setupTooltips();
    }

    // Handle clicks outside tooltips
    document.addEventListener('click', (e) => this.handleOutsideClick(e));
  }

  /**
   * Setup tooltips on all KPI cards with data-tooltip attribute
   */
  setupTooltips() {
    const kpiCards = document.querySelectorAll('[data-tooltip]');
    
    kpiCards.forEach(card => {
      const tooltipText = card.getAttribute('data-tooltip');
      if (tooltipText) {
        this.createTooltip(card, tooltipText);
      }
    });

    // Also watch for dynamically added cards
    this.observeNewCards();
  }

  /**
   * Create tooltip for a KPI card
   */
  createTooltip(card, tooltipText) {
    // Check if tooltip already exists
    if (card.querySelector('.kpi-info-btn')) {
      return;
    }

    // Find or create header
    let header = card.querySelector('.kpi-header');
    if (!header) {
      // Create header if it doesn't exist
      header = document.createElement('div');
      header.className = 'kpi-header';
      card.insertBefore(header, card.firstChild);
    }

    // Create info button
    const infoBtn = document.createElement('button');
    infoBtn.className = 'kpi-info-btn';
    infoBtn.type = 'button';
    infoBtn.setAttribute('aria-label', 'More information');
    infoBtn.innerHTML = 'ℹ';
    infoBtn.setAttribute('tabindex', '0');

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'kpi-info-tooltip';
    tooltip.textContent = tooltipText;
    tooltip.setAttribute('role', 'tooltip');

    // Add to header
    header.appendChild(infoBtn);
    header.appendChild(tooltip);

    // Store reference
    this.tooltips.set(infoBtn, {
      button: infoBtn,
      tooltip: tooltip,
      card: card
    });

    // Event listeners
    infoBtn.addEventListener('click', (e) => this.toggleTooltip(e, infoBtn, tooltip));
    infoBtn.addEventListener('mouseenter', () => this.showTooltip(tooltip));
    infoBtn.addEventListener('mouseleave', () => this.hideTooltip(tooltip));
    infoBtn.addEventListener('focus', () => this.showTooltip(tooltip));
    infoBtn.addEventListener('blur', () => this.hideTooltip(tooltip));

    // Prevent card click from interfering with tooltip
    infoBtn.addEventListener('click', (e) => e.stopPropagation());
  }

  /**
   * Toggle tooltip visibility on click
   */
  toggleTooltip(e, button, tooltip) {
    e.preventDefault();
    e.stopPropagation();

    // Hide other tooltips
    if (this.activeTooltip && this.activeTooltip !== tooltip) {
      this.hideTooltip(this.activeTooltip);
    }

    // Toggle current tooltip
    if (tooltip.classList.contains('show')) {
      this.hideTooltip(tooltip);
    } else {
      this.showTooltip(tooltip);
      this.activeTooltip = tooltip;
    }
  }

  /**
   * Show tooltip
   */
  showTooltip(tooltip) {
    tooltip.classList.add('show');
    this.activeTooltip = tooltip;
    
    // Adjust position if tooltip goes off-screen
    this.adjustTooltipPosition(tooltip);
  }

  /**
   * Hide tooltip
   */
  hideTooltip(tooltip) {
    tooltip.classList.remove('show');
    if (this.activeTooltip === tooltip) {
      this.activeTooltip = null;
    }
  }

  /**
   * Adjust tooltip position if it goes off-screen
   */
  adjustTooltipPosition(tooltip) {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if tooltip goes off-screen horizontally
      if (rect.left < 0) {
        tooltip.style.left = '0';
        tooltip.style.transform = 'translateX(0) translateY(0)';
      } else if (rect.right > viewportWidth) {
        tooltip.style.left = 'auto';
        tooltip.style.right = '0';
        tooltip.style.transform = 'translateX(0) translateY(0)';
      }

      // Check if tooltip goes off-screen vertically
      if (rect.top < 0) {
        // Move tooltip below the button
        tooltip.style.top = 'auto';
        tooltip.style.bottom = 'auto';
      }
    });
  }

  /**
   * Handle clicks outside tooltips
   */
  handleOutsideClick(e) {
    if (this.activeTooltip && !e.target.closest('.kpi-info-btn') && !e.target.closest('.kpi-info-tooltip')) {
      this.hideTooltip(this.activeTooltip);
    }
  }

  /**
   * Observe for dynamically added KPI cards
   */
  observeNewCards() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.hasAttribute && node.hasAttribute('data-tooltip')) {
              const tooltipText = node.getAttribute('data-tooltip');
              this.createTooltip(node, tooltipText);
            }
            // Also check children
            const children = node.querySelectorAll?.('[data-tooltip]');
            if (children) {
              children.forEach((child) => {
                if (!child.querySelector('.kpi-info-btn')) {
                  const tooltipText = child.getAttribute('data-tooltip');
                  this.createTooltip(child, tooltipText);
                }
              });
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update tooltip text for a card
   */
  updateTooltip(card, newText) {
    const tooltip = card.querySelector('.kpi-info-tooltip');
    if (tooltip) {
      tooltip.textContent = newText;
      card.setAttribute('data-tooltip', newText);
    }
  }
}

// Initialize on page load
const kpiTooltipManager = new KPITooltipManager();
kpiTooltipManager.init();
