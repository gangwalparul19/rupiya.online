/**
 * Live Price Service
 * Fetches real-time prices from Yahoo Finance API
 * Manages price updates and caching
 */

class LivePriceService {
  constructor() {
    this.priceCache = new Map();
    this.updateListeners = new Map(); // For real-time updates
    this.refreshIntervals = new Map(); // Store interval IDs for cleanup
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.API_ENDPOINT = '/api/get-live-price';
  }

  /**
   * Get live price for a symbol
   */
  async getLivePrice(symbol) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    try {
      const response = await fetch(`${this.API_ENDPOINT}?symbol=${encodeURIComponent(symbol)}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch price');
      }

      // Cache the result
      this.priceCache.set(symbol, {
        data: result.data,
        timestamp: Date.now()
      });

      return result.data;
    } catch (error) {
      console.error(`Error fetching live price for ${symbol}:`, error);
      
      // Return cached data if available
      const cached = this.priceCache.get(symbol);
      if (cached) {
        console.log(`Using cached price for ${symbol}`);
        return cached.data;
      }

      throw error;
    }
  }

  /**
   * Get live price for investment
   */
  async getLivePriceForInvestment(investment) {
    if (!investment || !investment.symbol) {
      throw new Error('Investment with symbol is required');
    }

    try {
      const response = await fetch(`${this.API_ENDPOINT}?symbol=${encodeURIComponent(investment.symbol)}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch price');
      }

      return result.data;
    } catch (error) {
      console.error(`Error fetching live price for investment:`, error);
      throw error;
    }
  }

  /**
   * Get prices for multiple symbols
   */
  async getLivePrices(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Array of symbols is required');
    }

    const results = {};
    const errors = {};

    // Fetch prices in parallel
    const promises = symbols.map(async (symbol) => {
      try {
        const price = await this.getLivePrice(symbol);
        results[symbol] = price;
      } catch (error) {
        errors[symbol] = error.message;
      }
    });

    await Promise.all(promises);

    return { results, errors };
  }

  /**
   * Subscribe to price updates
   * Calls callback whenever price is updated
   */
  subscribeToPriceUpdates(symbol, callback, intervalSeconds = 60) {
    if (!symbol || !callback) {
      throw new Error('Symbol and callback are required');
    }

    const key = `${symbol}_${Date.now()}`;

    // Initial fetch
    this.getLivePrice(symbol)
      .then(price => callback(null, price))
      .catch(error => callback(error, null));

    // Set up interval for updates
    const intervalId = setInterval(async () => {
      try {
        const price = await this.getLivePrice(symbol);
        callback(null, price);
      } catch (error) {
        callback(error, null);
      }
    }, intervalSeconds * 1000);

    this.refreshIntervals.set(key, intervalId);
    this.updateListeners.set(key, { symbol, callback, intervalSeconds });

    // Return unsubscribe function
    return () => this.unsubscribeFromPriceUpdates(key);
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromPriceUpdates(key) {
    const intervalId = this.refreshIntervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.refreshIntervals.delete(key);
    }
    this.updateListeners.delete(key);
  }

  /**
   * Unsubscribe all listeners
   */
  unsubscribeAll() {
    for (const [key, intervalId] of this.refreshIntervals.entries()) {
      clearInterval(intervalId);
    }
    this.refreshIntervals.clear();
    this.updateListeners.clear();
  }

  /**
   * Get cached price
   */
  getCachedPrice(symbol) {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * Clear cache
   */
  clearCache(symbol = null) {
    if (symbol) {
      this.priceCache.delete(symbol);
    } else {
      this.priceCache.clear();
    }
  }

  /**
   * Get price change
   */
  getPriceChange(symbol, oldPrice, newPrice) {
    const change = newPrice - oldPrice;
    const changePercent = oldPrice > 0 ? ((change / oldPrice) * 100).toFixed(2) : 0;
    return {
      change,
      changePercent,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  }

  /**
   * Format price with currency
   */
  formatPrice(price, currency = 'USD') {
    const currencySymbols = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${price.toFixed(2)}`;
  }

  /**
   * Get investment current value
   */
  calculateInvestmentValue(investment, livePrice) {
    if (!investment || !livePrice) return null;

    const currentValue = investment.quantity * livePrice;
    const totalInvested = investment.quantity * investment.purchasePrice;
    const returns = currentValue - totalInvested;
    const returnsPercent = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(2) : 0;

    return {
      currentPrice: livePrice,
      currentValue,
      totalInvested,
      returns,
      returnsPercent,
      returnsDirection: returns > 0 ? 'up' : returns < 0 ? 'down' : 'neutral'
    };
  }

  /**
   * Get portfolio value
   */
  calculatePortfolioValue(investments, livePrices) {
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const investment of investments) {
      const livePrice = livePrices[investment.symbol];
      if (livePrice) {
        const invested = investment.quantity * investment.purchasePrice;
        const current = investment.quantity * livePrice;
        
        totalInvested += invested;
        totalCurrentValue += current;
      }
    }

    const totalReturns = totalCurrentValue - totalInvested;
    const returnsPercent = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalReturns,
      returnsPercent,
      returnsDirection: totalReturns > 0 ? 'up' : totalReturns < 0 ? 'down' : 'neutral'
    };
  }
}

const livePriceService = new LivePriceService();
export default livePriceService;
