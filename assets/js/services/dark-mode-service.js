// Dark Mode Service
// Manages dark mode preferences and theme switching

class DarkModeService {
  constructor() {
    this.isDarkMode = false;
    this.prefersDarkMode = false;
    this.themePreference = 'auto'; // 'auto', 'light', 'dark'
    this.init();
  }

  /**
   * Initialize dark mode service
   */
  init() {
    this.detectSystemPreference();
    this.loadThemePreference();
    this.applyTheme();
    this.setupMediaQueryListener();
    this.setupThemeToggle();
  }

  /**
   * Detect system color scheme preference
   */
  detectSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.prefersDarkMode = true;
    }
  }

  /**
   * Setup media query listener for system preference changes
   */
  setupMediaQueryListener() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', (e) => {
        this.prefersDarkMode = e.matches;
        if (this.themePreference === 'auto') {
          this.applyTheme();
        }
      });
    }
  }

  /**
   * Load theme preference from localStorage
   */
  loadThemePreference() {
    try {
      const saved = localStorage.getItem('rupiya_theme_preference');
      if (saved) {
        this.themePreference = saved;
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
  }

  /**
   * Save theme preference to localStorage
   */
  saveThemePreference() {
    try {
      localStorage.setItem('rupiya_theme_preference', this.themePreference);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  }

  /**
   * Apply theme based on preference
   */
  applyTheme() {
    let shouldBeDark = false;

    if (this.themePreference === 'auto') {
      shouldBeDark = this.prefersDarkMode;
    } else if (this.themePreference === 'dark') {
      shouldBeDark = true;
    } else {
      shouldBeDark = false;
    }

    this.isDarkMode = shouldBeDark;
    this.updateDOM();
    this.updateMetaThemeColor();
  }

  /**
   * Update DOM with theme class
   */
  updateDOM() {
    const html = document.documentElement;
    const body = document.body;

    if (this.isDarkMode) {
      html.classList.add('dark-mode');
      body.classList.add('dark-mode');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark-mode');
      body.classList.remove('dark-mode');
      html.style.colorScheme = 'light';
    }

    // Dispatch theme change event
    const event = new CustomEvent('themeChanged', {
      detail: { isDarkMode: this.isDarkMode }
    });
    document.dispatchEvent(event);
  }

  /**
   * Update meta theme-color tag
   */
  updateMetaThemeColor() {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }

    if (this.isDarkMode) {
      metaThemeColor.content = '#1a1a1a';
    } else {
      metaThemeColor.content = '#4A90E2';
    }
  }

  /**
   * Setup theme toggle button
   */
  setupThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleTheme());
      this.updateToggleButton();
    }
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    if (this.themePreference === 'auto') {
      this.themePreference = this.isDarkMode ? 'light' : 'dark';
    } else if (this.themePreference === 'dark') {
      this.themePreference = 'light';
    } else {
      this.themePreference = 'auto';
    }

    this.saveThemePreference();
    this.applyTheme();
    this.updateToggleButton();
    this.showThemeChangeNotification();
  }

  /**
   * Set theme explicitly
   */
  setTheme(theme) {
    if (['auto', 'light', 'dark'].includes(theme)) {
      this.themePreference = theme;
      this.saveThemePreference();
      this.applyTheme();
      this.updateToggleButton();
    }
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.themePreference;
  }

  /**
   * Check if dark mode is active
   */
  isDark() {
    return this.isDarkMode;
  }

  /**
   * Update toggle button appearance
   */
  updateToggleButton() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('svg') || toggleBtn;
    const label = toggleBtn.querySelector('.theme-label');

    if (this.isDarkMode) {
      icon.textContent = '☀️';
      if (label) label.textContent = 'Light Mode';
    } else {
      icon.textContent = '🌙';
      if (label) label.textContent = 'Dark Mode';
    }

    // Update title
    toggleBtn.title = this.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }

  /**
   * Show theme change notification
   */
  showThemeChangeNotification() {
    const notification = document.createElement('div');
    notification.className = 'theme-change-notification';
    notification.textContent = this.isDarkMode ? '🌙 Dark Mode Enabled' : '☀️ Light Mode Enabled';
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  /**
   * Get CSS variable value
   */
  getCSSVariable(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /**
   * Set CSS variable value
   */
  setCSSVariable(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  /**
   * Optimize images for dark mode
   */
  optimizeImagesForDarkMode() {
    const images = document.querySelectorAll('img[data-dark-mode-src]');
    images.forEach(img => {
      if (this.isDarkMode) {
        img.dataset.lightSrc = img.src;
        img.src = img.dataset.darkModeSrc;
      } else if (img.dataset.lightSrc) {
        img.src = img.dataset.lightSrc;
      }
    });
  }

  /**
   * Test dark mode contrast
   */
  testContrast() {
    const results = {
      passed: [],
      failed: []
    };

    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const color = style.color;

      const contrast = this.calculateContrast(bgColor, color);
      if (contrast < 4.5) {
        results.failed.push({
          element: el,
          contrast: contrast.toFixed(2),
          bg: bgColor,
          color: color
        });
      } else {
        results.passed.push({
          element: el,
          contrast: contrast.toFixed(2)
        });
      }
    });

    return results;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrast(bgColor, fgColor) {
    const bgLum = this.getLuminance(bgColor);
    const fgLum = this.getLuminance(fgColor);

    const lighter = Math.max(bgLum, fgLum);
    const darker = Math.min(bgLum, fgLum);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get luminance of a color
   */
  getLuminance(color) {
    // Parse color and calculate relative luminance
    const rgb = this.parseColor(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Parse color string to RGB
   */
  parseColor(color) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = color;
    const computed = ctx.fillStyle;

    if (computed.startsWith('#')) {
      const hex = computed.slice(1);
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    } else if (computed.startsWith('rgb')) {
      const match = computed.match(/\d+/g);
      return match ? match.map(Number) : null;
    }
    return null;
  }

  /**
   * Create theme preview
   */
  createThemePreview() {
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.innerHTML = `
      <div class="theme-preview-item light-preview">
        <div class="theme-preview-content">
          <div class="theme-preview-header">Light Mode</div>
          <div class="theme-preview-body">
            <div class="theme-preview-card"></div>
            <div class="theme-preview-card"></div>
          </div>
        </div>
      </div>
      <div class="theme-preview-item dark-preview">
        <div class="theme-preview-content">
          <div class="theme-preview-header">Dark Mode</div>
          <div class="theme-preview-body">
            <div class="theme-preview-card"></div>
            <div class="theme-preview-card"></div>
          </div>
        </div>
      </div>
    `;
    return preview;
  }
}

// Create and export singleton instance
const darkModeService = new DarkModeService();
export default darkModeService;
