// Location Service - Fetches user location from IP
// Uses free IP geolocation API to get city and country

class LocationService {
  constructor() {
    this.cache = null;
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.cacheTimestamp = 0;
  }

  /**
   * Get user location from IP address
   * Uses ipapi.co as primary (HTTPS) and ip-api.com as fallback (HTTP only)
   */
  async getUserLocation() {
    // Check cache first
    if (this.cache && Date.now() - this.cacheTimestamp < this.cacheExpiry) {
      return this.cache;
    }

    // On HTTPS sites, try HTTPS API first
    const isSecure = window.location.protocol === 'https:';
    
    if (isSecure) {
      try {
        // Primary for HTTPS: ipapi.co (HTTPS, free tier 1000/day)
        const location = await this.fetchFromIpapiCo();
        if (location) {
          this.cache = location;
          this.cacheTimestamp = Date.now();
          return location;
        }
      } catch (error) {
        console.warn('[Location Service] HTTPS API failed:', error.message);
      }
    } else {
      try {
        // Primary for HTTP: ip-api.com (free, no key needed)
        const location = await this.fetchFromIpApi();
        if (location) {
          this.cache = location;
          this.cacheTimestamp = Date.now();
          return location;
        }
      } catch (error) {
        console.warn('[Location Service] Primary API failed:', error.message);
      }

      try {
        // Fallback: ipapi.co (free tier, 1000/day)
        const location = await this.fetchFromIpapiCo();
        if (location) {
          this.cache = location;
          this.cacheTimestamp = Date.now();
          return location;
        }
      } catch (error) {
        console.warn('[Location Service] Fallback API failed:', error.message);
      }
    }

    // Return null if all APIs fail
    return null;
  }

  /**
   * Fetch from ip-api.com
   * Note: Using HTTPS proxy or alternative when available for security
   */
  async fetchFromIpApi() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      // Use HTTPS endpoint (ip-api.com requires pro for HTTPS, so we try ipapi.co first in production)
      // For development/testing, HTTP is acceptable but not for production
      const isSecure = window.location.protocol === 'https:';
      
      // If on HTTPS, skip ip-api.com (HTTP only on free tier) and let fallback handle it
      if (isSecure) {
        throw new Error('Skipping HTTP API on HTTPS site');
      }
      
      const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,regionName,city', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          city: data.city || null,
          region: data.regionName || null,
          country: data.country || null,
          countryCode: data.countryCode || null,
          source: 'ip-api'
        };
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Fetch from ipapi.co (fallback)
   */
  async fetchFromIpapiCo() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.error) {
        return {
          city: data.city || null,
          region: data.region || null,
          country: data.country_name || null,
          countryCode: data.country_code || null,
          source: 'ipapi.co'
        };
      }
      
      return null;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Clear cached location
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

// Create and export singleton instance
const locationService = new LocationService();
export default locationService;
