// Button State Utility
// Handles button loading states consistently across the app

/**
 * Set button to loading state
 * @param {HTMLElement} button - The button element
 * @param {string} loadingText - Text to show during loading (default: 'Saving...')
 */
export function setButtonLoading(button, loadingText = 'Saving...') {
  if (!button) return;
  
  // Store original state
  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent.trim();
  }
  
  // Disable button
  button.disabled = true;
  button.classList.add('loading');
  
  // Set loading text
  button.textContent = loadingText;
}

/**
 * Reset button to normal state
 * @param {HTMLElement} button - The button element
 * @param {string} text - Text to show (default: original text)
 */
export function resetButton(button, text = null) {
  if (!button) return;
  
  // Enable button
  button.disabled = false;
  button.classList.remove('loading');
  
  // Restore original or custom text
  button.textContent = text || button.dataset.originalText || 'Submit';
}

/**
 * Set button to success state temporarily
 * @param {HTMLElement} button - The button element
 * @param {string} successText - Success message (default: "Success!")
 * @param {number} duration - Duration in ms before reset (default: 2000)
 */
export function setButtonSuccess(button, successText = '✓ Success!', duration = 2000) {
  if (!button) return;
  
  button.disabled = true;
  button.classList.add('success');
  button.textContent = successText;
  
  setTimeout(() => {
    resetButton(button);
  }, duration);
}

/**
 * Set button to error state temporarily
 * @param {HTMLElement} button - The button element
 * @param {string} errorText - Error message (default: "Error")
 * @param {number} duration - Duration in ms before reset (default: 2000)
 */
export function setButtonError(button, errorText = '✗ Error', duration = 2000) {
  if (!button) return;
  
  button.disabled = true;
  button.classList.add('error');
  button.textContent = errorText;
  
  setTimeout(() => {
    resetButton(button);
  }, duration);
}

// Export default object with all functions
export default {
  setButtonLoading,
  resetButton,
  setButtonSuccess,
  setButtonError
};
