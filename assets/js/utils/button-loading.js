/**
 * Button Loading State Utility
 * Simple helper to manage button loading states without spinners
 */

/**
 * Set button to loading state
 * @param {HTMLButtonElement} btn - The button element
 * @param {string} loadingText - Text to show while loading (default: 'Loading...')
 * @returns {string} Original button text (to restore later)
 */
export function setButtonLoading(btn, loadingText = 'Loading...') {
  if (!btn) return '';
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  return originalText;
}

/**
 * Reset button from loading state
 * @param {HTMLButtonElement} btn - The button element
 * @param {string} originalText - Original text to restore
 */
export function resetButton(btn, originalText) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = originalText;
}

/**
 * Create a button state manager for a specific button
 * @param {string} buttonId - The button element ID
 * @returns {Object} Object with setLoading and reset methods
 */
export function createButtonManager(buttonId) {
  let originalText = '';
  
  return {
    setLoading(loadingText = 'Loading...') {
      const btn = document.getElementById(buttonId);
      if (btn) {
        originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = loadingText;
      }
    },
    reset() {
      const btn = document.getElementById(buttonId);
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  };
}

export default { setButtonLoading, resetButton, createButtonManager };
