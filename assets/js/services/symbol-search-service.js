/**
 * Symbol Search Service
 * Provides autocomplete and search functionality for investment symbols
 * Now uses Google Sheets data directly
 */

import googleSheetsPriceService from './google-sheets-price-service.js';

class SymbolSearchService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Search for symbols in Google Sheets data
   * Optimized to only fetch the relevant sheet based on type
   */
  async searchSymbols(query, type = 'all', limit = 15) {
    if (!query || query.length < 1) {
      return [];
    }

    const cacheKey = `search_${query}_${type}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('Returning cached results for:', query);
      return cached;
    }

    try {
      console.log('Searching Google Sheets for:', query, 'type:', type);
      
      // Pass type to Google Sheets service for optimized sheet selection
      const results = await googleSheetsPriceService.searchSymbols(query, limit, type);
      
      // Filter by type if specified (additional filtering for edge cases)
      let filteredResults = results;
      if (type && type !== 'all') {
        filteredResults = results.filter(r => {
          const resultType = this.normalizeType(r.type);
          const searchType = this.normalizeType(type);
          return resultType === searchType;
        });
      }

      // Enhance results with additional info
      const enhancedResults = filteredResults.map(r => {
        // Use the clean symbol for display, but keep originalSymbol for lookup
        const cleanSymbol = r.symbol; // Already cleaned by google-sheets-price-service
        const originalSymbol = r.originalSymbol || r.symbol; // Keep original for crypto lookup
        const name = r.name || '';
        const exchange = r.exchange || '';
        
        return {
          symbol: cleanSymbol, // Display symbol (BTC, ETH, ACN, etc.)
          originalSymbol: originalSymbol, // Original symbol for lookup (CURRENCY:BTCUSD, ACN, etc.)
          name: name,
          type: this.normalizeType(r.type),
          exchange: exchange,
          displayName: name ? `${name} (${cleanSymbol})` : cleanSymbol
        };
      });

      // Cache for longer since data doesn't change frequently
      this.setCache(cacheKey, enhancedResults);
      console.log('Found results:', enhancedResults.length);
      return enhancedResults;
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  }

  /**
   * Normalize type names
   */
  normalizeType(type) {
    if (!type) return 'other';
    
    const typeUpper = type.toUpperCase();
    
    if (typeUpper.includes('STOCK') || typeUpper.includes('EQUITY') || typeUpper.includes('ETF')) {
      return 'Stocks';
    } else if (typeUpper.includes('CRYPTO') || typeUpper.includes('CURRENCY')) {
      return 'Cryptocurrency';
    } else if (typeUpper.includes('MUTUAL') || typeUpper.includes('FUND') || typeUpper.includes('MF')) {
      return 'Mutual Funds';
    } else if (typeUpper.includes('GOLD') || typeUpper.includes('SILVER') || typeUpper.includes('COMMODITY')) {
      return 'Gold';
    } else if (typeUpper.includes('FOREX') || typeUpper.includes('FX')) {
      return 'Forex';
    }
    
    return 'Other';
  }

  /**
   * Verify if symbol exists in sheets
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
      // Try to get price data for the symbol
      const priceData = await googleSheetsPriceService.getLivePrice(symbol);
      const exists = !!priceData;
      
      this.setCache(cacheKey, exists);
      return exists;
    } catch (error) {
      console.warn('Symbol not found:', symbol);
      this.setCache(cacheKey, false);
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
      // Get all data from sheets
      const allData = await googleSheetsPriceService.getAllData();
      
      let symbols = [];
      
      // Add stocks
      if (type === 'all' || type === 'Stocks') {
        symbols = symbols.concat(allData.stocks.map(row => ({
          symbol: row.Symbol || row.symbol,
          name: row.Name || row.name,
          type: 'Stocks',
          exchange: row.Exchange || row.exchange
        })));
      }
      
      // Add mutual funds
      if (type === 'all' || type === 'Mutual Funds') {
        symbols = symbols.concat(allData.mutualFunds.map(row => ({
          symbol: row.Symbol || row.symbol || row['Scheme Code'],
          name: row.Name || row.name || row['Scheme Name'],
          type: 'Mutual Funds',
          exchange: 'India'
        })));
      }

      this.setCache(cacheKey, symbols);
      return symbols;
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
    let symbol = result.symbol || result.Symbol || '';
    const name = result.name || result.Name || '';
    const exchange = result.exchange || result.Exchange || '';
    const type = result.type || result.Type || '';
    
    // Strip exchange prefix from symbol (e.g., "NSE:RELIANCE" -> "RELIANCE")
    symbol = this.stripExchangePrefix(symbol);
    
    // Format display based on type
    if (type && type.toLowerCase().includes('mutual')) {
      return name ? `${symbol} - ${name}` : symbol;
    } else if (name) {
      return `${symbol} - ${name}`;
    } else {
      return symbol;
    }
  }

  /**
   * Strip exchange prefix from symbol
   */
  stripExchangePrefix(symbol) {
    if (!symbol) return '';
    
    // Remove common exchange prefixes
    const prefixes = ['NSE:', 'BSE:', 'NYSE:', 'NASDAQ:', 'MCX:'];
    for (const prefix of prefixes) {
      if (symbol.toUpperCase().startsWith(prefix)) {
        return symbol.substring(prefix.length);
      }
    }
    
    return symbol;
  }

  /**
   * Get symbol from result
   */
  getSymbolFromResult(result) {
    const symbol = result.symbol || result.Symbol || '';
    return this.stripExchangePrefix(symbol);
  }
}

const symbolSearchService = new SymbolSearchService();
export default symbolSearchService;
