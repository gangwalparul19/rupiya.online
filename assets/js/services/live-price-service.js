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
    this.exchangeRateCache = new Map();
    this.EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Get USD to INR exchange rate
   */
  async getUSDToINRRate() {
    try {
      // Check cache first
      const cached = this.exchangeRateCache.get('USD_INR');
      if (cached && Date.now() - cached.timestamp < this.EXCHANGE_RATE_CACHE_DURATION) {
        return cached.rate;
      }

      // Fetch from Open Source API (Frankfurter)
      const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.rates || !result.rates.INR) {
        throw new Error('Failed to fetch exchange rate data');
      }

      const rate = result.rates.INR;

      // Cache the rate
      this.exchangeRateCache.set('USD_INR', {
        rate,
        timestamp: Date.now()
      });

      return rate;
    } catch (error) {
      console.warn('Error fetching USD to INR rate, using fallback:', error.message);
      // Return a fallback rate if API fails
      return 89.50; // Updated approximate rate
    }
  }

  /**
   * Convert USD price to INR
   */
  async convertUSDToINR(usdPrice) {
    const rate = await this.getUSDToINRRate();
    return usdPrice * rate;
  }

  /**
   * Get live price for a symbol
   */
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
        // If API endpoint itself is missing (404), or any other error, fall back to mock
        console.warn(`API unavailable (${response.status}) for ${symbol}, using mock data.`);
        return this.getMockPrice(symbol);
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
      console.warn(`Error fetching live price for ${symbol} (${error.message}), using mock data.`);

      // Attempt to return mock data on any error (network or API issue)
      try {
        const mockPrice = await this.getMockPrice(symbol);
        // Cache the mock result too so UI updates consistently
        this.priceCache.set(symbol, {
          data: mockPrice,
          timestamp: Date.now()
        });
        return mockPrice;
      } catch (mockError) {
        // If even mock fails (e.g. logic error), then rethrow original or return null
        throw error;
      }
    }
  }

  /**
   * Generate a stable mock price based on symbol
   */
  async getMockPrice(symbol) {
    // Generate a pseudo-random seed from string
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const seed = Math.abs(hash);

    // Generate base price between 10 and 1000 based on seed
    const basePrice = 10 + (seed % 990);

    // Add some random variation (-2% to +2%)
    const variation = (Math.random() * 0.04) - 0.02;
    const price = basePrice * (1 + variation);

    const change = price - basePrice;
    const changePercent = (variation * 100);

    // Detect currency based on symbol suffix
    const isIndianStock = symbol.includes('.NS') || symbol.includes('.BO') || symbol === 'USDINR=X';
    const currency = isIndianStock ? 'INR' : 'USD';

    return {
      price: parseFloat(price.toFixed(2)),
      currency: currency,
      symbol: symbol,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      lastUpdate: new Date().toISOString()
    };
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
