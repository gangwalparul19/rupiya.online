// Encryption Check Utility
// Simple utility to check and prompt for encryption reauth on page load

import encryptionReauthModal from '../components/encryption-reauth-modal.js';

/**
 * Check if encryption reauth is needed and show modal if so
 * @param {Function} onSuccess - Callback to run after successful reauth
 * @returns {boolean} - True if reauth modal was shown
 */
export function checkEncryptionReauth(onSuccess = null) {
  return encryptionReauthModal.checkAndPrompt(onSuccess);
}

/**
 * Initialize encryption check for a page
 * Call this after authentication check in page init
 * @param {Function} reloadDataFn - Function to reload page data after reauth
 */
export function initEncryptionCheck(reloadDataFn = null) {
  const needsReauth = encryptionReauthModal.checkAndPrompt(async () => {
    if (reloadDataFn) {
      await reloadDataFn();
    } else {
      // Default: reload the page
      window.location.reload();
    }
  });
  
  return needsReauth;
}

export default {
  checkEncryptionReauth,
  initEncryptionCheck
};
