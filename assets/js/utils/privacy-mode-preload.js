/**
 * Privacy Mode Preload Script
 * Runs IMMEDIATELY to prevent flash of sensitive content
 * Must be loaded as early as possible (in <head> before any content)
 */

(function() {
  // Check localStorage immediately
  const isPrivacyMode = localStorage.getItem('rupiya_privacy_mode') === 'true';
  
  if (isPrivacyMode) {
    // Set data attribute on html element immediately
    document.documentElement.setAttribute('data-privacy-mode', 'true');
    
    // Also set on body when it's available
    if (document.body) {
      document.body.setAttribute('data-privacy-mode', 'true');
    } else {
      // Wait for body to be available
      const observer = new MutationObserver(function(mutations) {
        if (document.body) {
          document.body.setAttribute('data-privacy-mode', 'true');
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }
  }
})();
