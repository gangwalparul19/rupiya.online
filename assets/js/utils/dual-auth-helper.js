/**
 * Dual-Auth Helper
 * Handles the logic for supporting both Google OAuth and password login on the same email
 */

import authService from '../services/auth-service.js';
import userService from '../services/user-service.js';

class DualAuthHelper {
  /**
   * Check what auth methods are available for an email
   * Returns: { hasPassword: boolean, hasGoogle: boolean, user: object }
   */
  async getAvailableAuthMethods(email) {
    try {
      const result = await authService.getAuthMethodsForEmail(email);
      
      if (!result.success) {
        // If query fails (e.g., permission denied), assume email doesn't exist
        // This is safe because we'll get a proper error when they try to sign up
        return { 
          hasPassword: false, 
          hasGoogle: false, 
          user: null,
          error: null  // Don't show error to user - they'll find out during signup
        };
      }

      const authMethods = result.authMethods || [];
      
      return {
        hasPassword: authMethods.includes('password'),
        hasGoogle: authMethods.includes('google.com'),
        user: result.user,
        error: null
      };
    } catch (error) {
      console.error('Error checking auth methods:', error);
      // Return safe defaults - user will get proper error during signup/login
      return { 
        hasPassword: false, 
        hasGoogle: false, 
        user: null,
        error: null
      };
    }
  }

  /**
   * Handle login with email - shows available auth methods
   * Returns: { method: 'password' | 'google' | 'both', error?: string }
   * 
   * SIMPLIFIED: Always returns 'both' to show all login options
   * Firebase will handle validation during actual sign-in
   */
  async checkEmailAuthMethods(email) {
    const methods = await this.getAvailableAuthMethods(email);
    
    if (methods.error) {
      return { method: null, error: methods.error };
    }

    // Always return 'both' to show all login options
    // This is more user-friendly and avoids issues with auth method detection
    return { method: 'both', error: null };
  }

  /**
   * Link password to Google account
   * User must be logged in with Google first
   */
  async linkPasswordToGoogle(password) {
    return await authService.linkPasswordToGoogleAccount(password);
  }

  /**
   * Link Google to password account
   * User must be logged in with email/password first
   */
  async linkGoogleToPassword() {
    return await authService.linkGoogleToPasswordAccount();
  }

  /**
   * Unlink an auth method
   */
  async unlinkAuthMethod(providerId) {
    return await authService.unlinkAuthMethod(providerId);
  }

  /**
   * Get all linked auth methods for current user
   */
  async getLinkedAuthMethods() {
    return await authService.getLinkedAuthMethods();
  }

  /**
   * Check if current user has multiple auth methods
   */
  async hasMultipleAuthMethods() {
    try {
      const result = await this.getLinkedAuthMethods();
      if (result.success) {
        return result.authMethods.length > 1;
      }
      return false;
    } catch (error) {
      console.error('Error checking multiple auth methods:', error);
      return false;
    }
  }

  /**
   * Get auth method display names
   */
  getAuthMethodDisplayName(providerId) {
    const names = {
      'password': 'Email & Password',
      'google.com': 'Google',
      'facebook.com': 'Facebook',
      'github.com': 'GitHub',
      'twitter.com': 'Twitter'
    };
    return names[providerId] || providerId;
  }
}

// Create and export singleton instance
const dualAuthHelper = new DualAuthHelper();
export default dualAuthHelper;
