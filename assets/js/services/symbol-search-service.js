/**
 * Symbol Search Service
 * Provides autocomplete and search functionality for investment symbols
 */

class SymbolSearchService {
  constructor() {
    this.API_ENDPOINT = '/api/search-symbols';
    this.cache = new Map();
    this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query, type = 'all', limit = 10) {
    if (!query || query.length < 1) {
      return [];
    }

    const cacheKey = `search_${query}_${type}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_ENDPOINT}?query=${encodeURIComponent(query)}&type=${type}&limit=${limit}&action=search`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      this.setCache(cacheKey, data.results);
      return data.results;
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  }

  /**
   * Verify if symbol is supported
   */
  async verifySymbol(symbol, type = 'all') {
    if (!symbol) {
      return false;
    }

    const cacheKey = `verify_${symbol}_${type}`;
    const cached = this.getFromCache(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_ENDPOINT}?query=${encodeURIComponent(symbol)}&type=${type}&action=verify`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        return false;
      }

      this.setCache(cacheKey, data.supported);
      return data.supported;
    } catch (error) {
      console.error('Error verifying symbol:', error);
      return false;
    }
  }

  /**
   * Get all symbols of a type
   */
  async getAllSymbols(type = 'all') {
    const cacheKey = `all_${type}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.API_ENDPOINT}?type=${type}&action=all`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get symbols');
      }

      this.setCache(cacheKey, data.symbols);
      return data.symbols;
    } catch (error) {
      console.error('Error getting all symbols:', error);
      return [];
    }
  }

  /**
   * Get cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return undefined;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Format symbol for display
   */
  formatSymbolDisplay(result) {
    if (result.type === 'stock') {
      return `${result.symbol} - ${result.name} (${result.exchange})`;
    } else if (result.type === 'crypto') {
      return `${result.symbol} - ${result.name}`;
    } else if (result.type === 'mf') {
      return `${result.symbol} - ${result.name} (${result.fund_house})`;
    }
    return result.symbol;
  }

  /**
   * Get symbol from result
   */
  getSymbolFromResult(result) {
    return result.symbol;
  }
}

const symbolSearchService = new SymbolSearchService();
export default symbolSearchService;
