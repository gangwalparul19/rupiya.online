/**
 * CSP Nonce Generator
 * Generates cryptographic nonces for inline scripts and styles
 * This allows removing 'unsafe-inline' from CSP
 */

/**
 * Generate a cryptographic nonce
 * @returns {string} Base64 encoded nonce
 */
export function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array));
}

/**
 * Get or create nonce for current page
 * Nonce is stored in meta tag and reused for all inline scripts/styles
 */
export function getPageNonce() {
  // Check if nonce already exists in meta tag
  let nonceMeta = document.querySelector('meta[name="csp-nonce"]');
  
  if (!nonceMeta) {
    // Generate new nonce
    const nonce = generateNonce();
    
    // Create meta tag
    nonceMeta = document.createElement('meta');
    nonceMeta.name = 'csp-nonce';
    nonceMeta.content = nonce;
    document.head.appendChild(nonceMeta);
    
    return nonce;
  }
  
  return nonceMeta.content;
}

/**
 * Add nonce to inline script
 * @param {string} scriptContent - Script content
 * @returns {HTMLScriptElement} Script element with nonce
 */
export function createScriptWithNonce(scriptContent) {
  const script = document.createElement('script');
  script.nonce = getPageNonce();
  script.textContent = scriptContent;
  return script;
}

/**
 * Add nonce to inline style
 * @param {string} styleContent - Style content
 * @returns {HTMLStyleElement} Style element with nonce
 */
export function createStyleWithNonce(styleContent) {
  const style = document.createElement('style');
  style.nonce = getPageNonce();
  style.textContent = styleContent;
  return style;
}

/**
 * Execute inline script safely with nonce
 * @param {string} scriptContent - Script to execute
 */
export function executeInlineScript(scriptContent) {
  const script = createScriptWithNonce(scriptContent);
  document.head.appendChild(script);
  // Remove after execution to keep DOM clean
  setTimeout(() => script.remove(), 0);
}

/**
 * Add inline style safely with nonce
 * @param {string} styleContent - CSS to add
 * @returns {HTMLStyleElement} Added style element
 */
export function addInlineStyle(styleContent) {
  const style = createStyleWithNonce(styleContent);
  document.head.appendChild(style);
  return style;
}
