/**
 * Privacy Mode Auto-Initialization
 * Automatically initializes privacy mode on all pages
 * NO HTML CHANGES REQUIRED!
 * 
 * Just add this one line to your HTML:
 * <script type="module" src="assets/js/utils/privacy-mode-auto-init.js"></script>
 */

import privacyMode from './privacy-mode.js';
import initPrivacyModeButton from '../components/privacy-mode-button.js';

// Auto-initialize privacy mode
document.addEventListener('DOMContentLoaded', () => {
    // Initialize privacy mode button
    initPrivacyModeButton();
    
    // Apply privacy mode if it was previously enabled
    if (privacyMode.isEnabled()) {
        privacyMode.applyPrivacyMode();
        
        // Re-apply after a short delay to catch dynamically loaded content
        setTimeout(() => {
            privacyMode.applyPrivacyMode();
        }, 500);
        
        // Re-apply again after 1 second for slower loading content
        setTimeout(() => {
            privacyMode.applyPrivacyMode();
        }, 1000);
    }
});

// Export for manual use if needed
export default privacyMode;
