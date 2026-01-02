// Theme Manager - Handle dark mode toggle
class ThemeManager {
  constructor() {
    // Default to light theme if no stored preference
    this.theme = this.getStoredTheme() || 'light';
    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.setupSystemThemeListener();
  }

  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    return newTheme;
  }

  getCurrentTheme() {
    return this.theme;
  }

  setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      this.applyTheme(theme);
    }
  }

  setupSystemThemeListener() {
    // Optional: Listen to system theme changes
    // Disabled by default to respect user's manual choice
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

// Create singleton instance
const themeManager = new ThemeManager();

export default themeManager;
