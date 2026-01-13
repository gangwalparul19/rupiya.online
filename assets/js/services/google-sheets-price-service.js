/**
 * Google Sheets Price Service
 * Fetches real-time prices from Google Sheets
 * Replaces Yahoo Finance API with Google Sheets data
 */

class GoogleSheetsPriceService {
  constructor() {
    this.priceCache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Use serverless API endpoint instead of direct Google Sheets URLs
    // This keeps the actual sheet URLs secure in environment variables
    this.API_ENDPOINT = '/api/get-sheet-data';

    // Data storage
    this.stocksData = [];
    this.mutualFundsData = [];
    this.lastFetch = {
      stocks: 0,
      mutualFunds: 0
    };
    
    // Track ongoing fetch promises to prevent duplicate requests
    this.fetchPromises = {
      stocks: null,
      mutualFunds: null
    };
    
    // Flag to track if initial preload has been done
    this.preloadStarted = false;
  }

  /**
   * Preload data in background (call this early in app lifecycle)
   * This prevents the first search from being slow
   */
  preloadData() {
    if (this.preloadStarted) return;
    this.preloadStarted = true;
    
    // Fire and forget - don't await, let it load in background
    this.getAllData().catch(err => {
      console.warn('[GoogleSheets] Background preload failed:', err.message);
    });
  }

  /**
   * Parse Google Sheets JSON response
   */
  parseGoogleSheetsResponse(responseText) {
    try {
      // Check if response looks like HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('Received HTML instead of JSON. Response preview:', responseText.substring(0, 200));
        throw new Error('Sheet returned HTML instead of data. The sheet may not be publicly accessible or the URL is incorrect.');
      }

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from Google Sheets');
      }

      // Remove the Google Visualization API wrapper
      // Expected format: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
      let jsonString = responseText;
      
      // Try to extract JSON from the wrapper
      if (responseText.includes('google.visualization.Query.setResponse')) {
        const startIndex = responseText.indexOf('(') + 1;
        const endIndex = responseText.lastIndexOf(')');
        
        if (startIndex > 0 && endIndex > startIndex) {
          jsonString = responseText.substring(startIndex, endIndex);
        } else {
          throw new Error('Could not extract JSON from Google Sheets response');
        }
      } else {
        // Fallback: try the old method
        jsonString = responseText.substring(47).slice(0, -2);
      }

      const data = JSON.parse(jsonString);
      
      if (!data.table || !data.table.rows) {
        console.error('Invalid data structure:', data);
        throw new Error('Invalid Google Sheets response format - missing table.rows');
      }

      const rows = data.table.rows;
      const cols = data.table.cols;

      // Parse rows into objects
      const parsedData = rows.map(row => {
        const rowData = {};
        row.c.forEach((cell, index) => {
          const colLabel = cols[index].label || cols[index].id;
          rowData[colLabel] = cell ? cell.v : null;
        });
        return rowData;
      });

      return parsedData;
    } catch (error) {
      console.error('Error parsing Google Sheets response:', error);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Failed to parse Google Sheets data: ${error.message}`);
    }
  }

  /**
   * Fetch data from Google Sheets via serverless API
   * Uses promise deduplication to prevent multiple simultaneous requests
   */
  async fetchSheetData(sheetType) {
    if (!['stocks', 'mutualFunds'].includes(sheetType)) {
      throw new Error(`Unknown sheet type: ${sheetType}`);
    }

    // If there's already a fetch in progress for this sheet type, return that promise
    if (this.fetchPromises[sheetType]) {
      console.log(`[GoogleSheets] Reusing existing fetch promise for ${sheetType}`);
      return this.fetchPromises[sheetType];
    }

    // Create new fetch promise
    this.fetchPromises[sheetType] = (async () => {
      try {
        console.log(`[GoogleSheets] Fetching ${sheetType} data...`);
        
        const response = await fetch(`${this.API_ENDPOINT}?sheetType=${sheetType}`, {
          method: 'GET',
          headers: {
            'Accept': 'text/plain, application/json',
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          // Try to get error details from response
          let errorMessage = `Failed to fetch sheet: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('[GoogleSheets] API Error Details:', errorData);
          } catch (e) {
            // Response might not be JSON
            const text = await response.text();
            console.error('[GoogleSheets] API Error Response:', text);
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const text = await response.text();
        
        const data = this.parseGoogleSheetsResponse(text);

        // Store data
        if (sheetType === 'stocks') {
          this.stocksData = data;
        } else if (sheetType === 'mutualFunds') {
          this.mutualFundsData = data;
        }

        this.lastFetch[sheetType] = Date.now();
        
        console.log(`[GoogleSheets] Fetched ${data.length} rows from ${sheetType} sheet`);
        return data;
      } finally {
        // Clear the promise so future requests can fetch fresh data
        this.fetchPromises[sheetType] = null;
      }
    })();

    return this.fetchPromises[sheetType];
  }

  /**
   * Get all data (fetch if needed)
   * Fetches both sheets in PARALLEL for faster loading
   */
  async getAllData() {
    const now = Date.now();
    
    // Check which sheets need fetching
    const needsStocks = now - this.lastFetch.stocks > this.CACHE_DURATION;
    const needsMutualFunds = now - this.lastFetch.mutualFunds > this.CACHE_DURATION;

    // Fetch both sheets in parallel if needed
    const fetchPromises = [];
    
    if (needsStocks) {
      fetchPromises.push(this.fetchSheetData('stocks').catch(err => {
        console.warn('[GoogleSheets] Failed to fetch stocks:', err.message);
        return null; // Don't fail completely if one sheet fails
      }));
    }
    
    if (needsMutualFunds) {
      fetchPromises.push(this.fetchSheetData('mutualFunds').catch(err => {
        console.warn('[GoogleSheets] Failed to fetch mutual funds:', err.message);
        return null;
      }));
    }

    // Wait for all fetches to complete in parallel
    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }

    return {
      stocks: this.stocksData,
      mutualFunds: this.mutualFundsData
    };
  }

  /**
   * Find price data for a symbol
   * Searches in both stocks and mutual funds sheets
   * Handles crypto symbols in both formats: "BTC" and "CURRENCY:BTCUSD"
   */
  async findSymbolData(symbol) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // Strip exchange prefix if present
    const cleanSymbol = this.stripExchangePrefix(symbol);

    // Check cache first (use clean symbol for cache key)
    const cached = this.priceCache.get(cleanSymbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Fetch latest data
    const allData = await this.getAllData();

    // Normalize symbol for comparison
    const normalizedSymbol = cleanSymbol.toUpperCase().trim();

    // Search in stocks data first (Symbol column)
    let found = allData.stocks.find(row => {
      const rowSymbol = this.stripExchangePrefix((row.Symbol || row.symbol || '').toString()).toUpperCase().trim();
      
      // Direct match
      if (rowSymbol === normalizedSymbol) {
        return true;
      }
      
      // For crypto: check if searching for "BTC" and row has "CURRENCY:BTCUSD"
      if (rowSymbol.includes('CURRENCY:')) {
        const cryptoPart = rowSymbol.split(':')[1]; // Get "BTCUSD"
        if (cryptoPart.endsWith('USD')) {
          const cryptoTicker = cryptoPart.substring(0, cryptoPart.length - 3); // "BTC"
          if (cryptoTicker === normalizedSymbol) {
            return true;
          }
        }
      }
      
      // Also check if user searched with full format "CURRENCY:BTCUSD"
      if (normalizedSymbol.includes('CURRENCY:') && rowSymbol === normalizedSymbol) {
        return true;
      }
      
      return false;
    });

    // If not found, search in mutual funds (Scheme Code column)
    if (!found) {
      found = allData.mutualFunds.find(row => {
        const rowSymbol = this.stripExchangePrefix(
          (row['Scheme Code'] || row.scheme_code || row['Scheme_Code'] || row.SchemeCode ||
           row.Symbol || row.symbol || '').toString()
        ).toUpperCase().trim();
        return rowSymbol === normalizedSymbol;
      });
    }

    if (!found) {
      throw new Error(`Symbol ${cleanSymbol} not found in Google Sheets`);
    }

    // Extract price data (adjust column names based on your sheet structure)
    const priceData = this.extractPriceData(found, cleanSymbol);

    // Cache the result
    this.priceCache.set(cleanSymbol, {
      data: priceData,
      timestamp: Date.now()
    });

    return priceData;
  }

  /**
   * Extract price data from sheet row
   * Adjust column names based on your actual Google Sheets structure
   * 
   * STOCKS Sheet columns:
   * - Symbol_Name: Company/Asset name (e.g., "Accenture")
   * - Ticker_Code: Exchange with ticker (e.g., "NYSE:ACN")
   * - Category: Asset type (e.g., "Stock-US")
   * - Symbol: Ticker symbol (e.g., "ACN")
   * - Live_Price: Current price (e.g., "259.95")
   * 
   * MUTUAL FUNDS Sheet columns:
   * - Scheme Code: Fund code (e.g., "119551")
   * - Scheme Name: Fund name (e.g., "HDFC Balanced Advantage Fund")
   * - Net Asset Value: NAV/Price (e.g., "345.67")
   * - Date: NAV date
   */
  extractPriceData(row, symbol) {
    // Extract price from Live_Price (stocks) or Net Asset Value (mutual funds)
    const price = parseFloat(
      row.Live_Price || row.live_price || row['Live Price'] || row.LivePrice ||
      row['Net Asset Value'] || row['Net_Asset_Value'] || row.NAV || row.nav ||
      row.Price || row.price || row['Current Price'] || row['LTP'] || 
      row['Last Price'] || 0
    );

    const previousClose = parseFloat(
      row['Previous Close'] || row['Prev Close'] || row.previousClose || 
      row['Yesterday Close'] || price
    );

    const change = parseFloat(row.Change || row.change || (price - previousClose));
    const changePercent = parseFloat(
      row['Change %'] || row['Change Percent'] || row.changePercent || 
      (previousClose > 0 ? ((change / previousClose) * 100) : 0)
    );

    // Get name from Symbol_Name (stocks) or Scheme Name (mutual funds)
    const name = row.Symbol_Name || row.symbol_name || row['Symbol Name'] || row.SymbolName ||
                row['Scheme Name'] || row.scheme_name || row['Scheme_Name'] || row.SchemeName ||
                row.Name || row.name || row['Company Name'] || 
                row.CompanyName || row.companyName || '';

    // Get exchange from Ticker_Code column (format: "NYSE:ACN")
    // Extract just the exchange part before the colon
    let exchange = '';
    const tickerCode = row.Ticker_Code || row.ticker_code || row['Ticker Code'] || row.TickerCode || '';
    if (tickerCode && tickerCode.includes(':')) {
      exchange = tickerCode.split(':')[0];
    } else {
      // Fallback to other exchange columns
      exchange = row.Exchange || row.exchange || row.Market || row.market || '';
    }
    
    // For mutual funds, default to India
    if (!exchange && (row['Scheme Name'] || row['Scheme Code'] || row['Net Asset Value'])) {
      exchange = 'India';
    }

    // Get type from Category column (stocks) or default to Mutual Fund
    let type = row.Category || row.category || 
               row.Type || row.type || row.AssetType || row.asset_type || '';
    
    // If we detect mutual fund columns, set type to Mutual Fund
    if (!type && (row['Scheme Name'] || row['Scheme Code'] || row['Net Asset Value'])) {
      type = 'Mutual Fund';
    }

    // Detect currency based on category and exchange
    const currency = this.detectCurrency(row, symbol);

    return {
      symbol: symbol,
      name: name,
      exchange: exchange,
      type: type,
      price: price,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      currency: currency,
      lastUpdate: new Date().toISOString(),
      source: 'Google Sheets'
    };
  }

  /**
   * Detect currency based on symbol, category, or row data
   */
  detectCurrency(row, symbol) {
    // Check if currency is explicitly mentioned in the sheet
    if (row.Currency || row.currency) {
      return row.Currency || row.currency;
    }

    // Check Category column first (e.g., "Stock-US", "Stock-IN", "Cryptocurrency")
    const category = (row.Category || row.category || row.Type || row.type || '').toString().toUpperCase();
    
    if (category.includes('US') || category.includes('USA') || category.includes('STOCK-US')) {
      return 'USD';
    }
    
    if (category.includes('IN') || category.includes('INDIA') || category.includes('STOCK-IN') || 
        category.includes('INDIAN')) {
      return 'INR';
    }
    
    if (category.includes('CRYPTO') || category.includes('CRYPTOCURRENCY') || category.includes('DIGITAL')) {
      return 'USD'; // Most crypto prices are in USD
    }

    // Detect based on symbol suffix
    const symbolUpper = symbol.toUpperCase();
    
    // Indian stocks (NSE/BSE)
    if (symbolUpper.includes('.NS') || symbolUpper.includes('.BO')) {
      return 'INR';
    }
    
    // Crypto currencies
    if (symbolUpper.includes('BTC') || symbolUpper.includes('ETH') || 
        symbolUpper.includes('USDT') || symbolUpper.includes('BNB') ||
        symbolUpper.includes('-USD') || symbolUpper.includes('USDC')) {
      return 'USD';
    }
    
    // Currency indicators in symbol
    if (symbolUpper.includes('INR') || symbolUpper.includes('₹')) {
      return 'INR';
    }

    if (symbolUpper.includes('USD') || symbolUpper.includes('$')) {
      return 'USD';
    }

    // Check Ticker_Code column for exchange
    const tickerCode = (row.Ticker_Code || row.ticker_code || row['Ticker Code'] || '').toString().toUpperCase();
    if (tickerCode.includes('NYSE') || tickerCode.includes('NASDAQ')) {
      return 'USD';
    }
    if (tickerCode.includes('NSE') || tickerCode.includes('BSE')) {
      return 'INR';
    }

    // Check exchange column
    const exchange = (row.Exchange || row.exchange || '').toString().toUpperCase();
    if (exchange.includes('NSE') || exchange.includes('BSE') || exchange.includes('MCX')) {
      return 'INR';
    }

    if (exchange.includes('NASDAQ') || exchange.includes('NYSE') || exchange.includes('US')) {
      return 'USD';
    }
    
    // Check for crypto exchanges
    if (exchange.includes('BINANCE') || exchange.includes('COINBASE') || 
        exchange.includes('CRYPTO') || exchange.includes('KRAKEN')) {
      return 'USD';
    }

    // Default to INR for Indian app
    return 'INR';
  }

  /**
   * Get live price for a symbol (main method compatible with existing code)
   */
  async getLivePrice(symbol) {
    try {
      const priceData = await this.findSymbolData(symbol);
      return priceData;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple prices at once (batch operation)
   */
  async getMultiplePrices(symbols) {
    const results = {};
    
    // Fetch all data once
    await this.getAllData();

    // Get prices for each symbol
    for (const symbol of symbols) {
      try {
        results[symbol] = await this.findSymbolData(symbol);
      } catch (error) {
        console.warn(`Could not get price for ${symbol}:`, error.message);
        results[symbol] = null;
      }
    }

    return results;
  }

  /**
   * Search symbols (for autocomplete)
   * Optimized to only fetch the relevant sheet based on type
   * 
   * STOCKS Sheet columns:
   * - Symbol_Name: Company/Asset name
   * - Ticker_Code: Exchange with ticker (e.g., "NYSE:ACN" or "CURRENCY:BTCUSD")
   * - Category: Asset type
   * - Symbol: Ticker symbol (e.g., "ACN" or "CURRENCY:BTCUSD")
   * - Live_Price: Current price
   * 
   * MUTUAL FUNDS Sheet columns:
   * - Scheme Code: Fund code
   * - Scheme Name: Fund name
   * - Net Asset Value: NAV/Price
   * 
   * @param {string} query - Search query
   * @param {number} limit - Max results to return
   * @param {string} type - Investment type filter ('all', 'Stocks', 'Cryptocurrency', 'Mutual Funds', etc.)
   */
  async searchSymbols(query, limit = 10, type = 'all') {
    const queryUpper = query.toUpperCase();
    const results = [];
    const now = Date.now();
    
    // Determine which sheets to search based on type
    const typeUpper = (type || 'all').toUpperCase();
    const needsStocksSheet = typeUpper === 'ALL' || 
                             typeUpper.includes('STOCK') || 
                             typeUpper.includes('CRYPTO') ||
                             typeUpper.includes('GOLD') ||
                             typeUpper.includes('OTHER');
    const needsMutualFundsSheet = typeUpper === 'ALL' || 
                                   typeUpper.includes('MUTUAL') || 
                                   typeUpper.includes('FUND');
    
    console.log(`[GoogleSheets] Search type: ${type}, needsStocks: ${needsStocksSheet}, needsMF: ${needsMutualFundsSheet}`);
    
    // Only fetch the sheets we need
    let stocksData = [];
    let mutualFundsData = [];
    
    if (needsStocksSheet) {
      // Use cached data if available, otherwise fetch only stocks sheet
      if (this.stocksData.length > 0) {
        stocksData = this.stocksData;
        // Trigger background refresh if stale
        if (now - this.lastFetch.stocks > this.CACHE_DURATION) {
          this.fetchSheetData('stocks').catch(err => {
            console.warn('[GoogleSheets] Background stocks refresh failed:', err.message);
          });
        }
      } else {
        // Need to fetch stocks sheet
        await this.fetchSheetData('stocks');
        stocksData = this.stocksData;
      }
    }
    
    if (needsMutualFundsSheet) {
      // Use cached data if available, otherwise fetch only mutual funds sheet
      if (this.mutualFundsData.length > 0) {
        mutualFundsData = this.mutualFundsData;
        // Trigger background refresh if stale
        if (now - this.lastFetch.mutualFunds > this.CACHE_DURATION) {
          this.fetchSheetData('mutualFunds').catch(err => {
            console.warn('[GoogleSheets] Background MF refresh failed:', err.message);
          });
        }
      } else {
        // Need to fetch mutual funds sheet
        await this.fetchSheetData('mutualFunds');
        mutualFundsData = this.mutualFundsData;
      }
    }

    // Search in stocks (only if needed)
    if (needsStocksSheet) {
      stocksData.forEach(row => {
      // Get symbol from Symbol column
      let symbol = (row.Symbol || row.symbol || row.Ticker || row.ticker || '').toString();
      
      // For crypto, extract the actual ticker from "CURRENCY:BTCUSD" format
      // Extract BTC from BTCUSD, ETH from ETHUSD, etc.
      let displaySymbol = symbol;
      if (symbol.includes('CURRENCY:')) {
        const cryptoPart = symbol.split(':')[1]; // Get "BTCUSD"
        // Extract the crypto ticker (remove USD suffix)
        if (cryptoPart.endsWith('USD')) {
          displaySymbol = cryptoPart.substring(0, cryptoPart.length - 3); // "BTC", "ETH", etc.
        } else {
          displaySymbol = cryptoPart;
        }
      } else {
        displaySymbol = this.stripExchangePrefix(symbol);
      }
      
      // Get name from Symbol_Name column
      const name = (row.Symbol_Name || row.symbol_name || row['Symbol Name'] || row.SymbolName ||
                    row.Name || row.name || row['Company Name'] || row.CompanyName || '').toString();
      
      // Get exchange from Ticker_Code column (format: "NYSE:ACN" or "CURRENCY:BTCUSD")
      let exchange = '';
      const tickerCode = (row.Ticker_Code || row.ticker_code || row['Ticker Code'] || row.TickerCode || '').toString();
      if (tickerCode && tickerCode.includes(':')) {
        const exchangePart = tickerCode.split(':')[0];
        // For crypto, show the exchange as "Crypto" instead of "CURRENCY"
        exchange = exchangePart === 'CURRENCY' ? 'Crypto' : exchangePart;
      } else {
        exchange = (row.Exchange || row.exchange || row.Market || row.market || '').toString();
      }
      
      // Get type from Category column
      const type = (row.Category || row.category || 
                    row.Type || row.type || 'Stock').toString();
      
      // Search by display symbol, actual symbol, or name
      if (displaySymbol.toUpperCase().includes(queryUpper) || 
          symbol.toUpperCase().includes(queryUpper) ||
          name.toUpperCase().includes(queryUpper)) {
        console.log('Match found:', { symbol: displaySymbol, name, type, exchange, originalSymbol: symbol });
        results.push({
          symbol: displaySymbol, // Use clean symbol for display (BTC, ETH, etc.)
          originalSymbol: symbol, // Keep original for lookup (CURRENCY:BTCUSD)
          name: name,
          type: type,
          exchange: exchange
        });
      }
    });
    }

    // Search in mutual funds (only if needed)
    if (needsMutualFundsSheet) {
    mutualFundsData.forEach(row => {
      // Get symbol from Scheme Code column
      const symbol = this.stripExchangePrefix(
        (row['Scheme Code'] || row.scheme_code || row['Scheme_Code'] || row.SchemeCode ||
         row.Symbol || row.symbol || '').toString()
      );
      
      // Get name from Scheme Name column
      const name = (row['Scheme Name'] || row.scheme_name || row['Scheme_Name'] || row.SchemeName ||
                    row.Name || row.name || '').toString();
      
      // Mutual funds are always in India
      const exchange = 'India';
      
      // Search by scheme code or scheme name
      if (symbol.toUpperCase().includes(queryUpper) || name.toUpperCase().includes(queryUpper)) {
        results.push({
          symbol: symbol,
          originalSymbol: symbol, // Same for mutual funds
          name: name,
          type: 'Mutual Fund',
          exchange: exchange
        });
      }
    });
    }

    console.log('Search results:', results);
    return results.slice(0, limit);
  }

  /**
   * Strip exchange prefix from symbol
   */
  stripExchangePrefix(symbol) {
    if (!symbol) return '';
    
    const symbolStr = symbol.toString();
    
    // Remove common exchange prefixes
    const prefixes = ['NSE:', 'BSE:', 'NYSE:', 'NASDAQ:', 'MCX:'];
    for (const prefix of prefixes) {
      if (symbolStr.toUpperCase().startsWith(prefix)) {
        return symbolStr.substring(prefix.length);
      }
    }
    
    return symbolStr;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.priceCache.clear();
    this.lastFetch = {
      stocks: 0,
      mutualFunds: 0
    };
  }

  /**
   * Get USD to INR exchange rate (for compatibility)
   */
  async getUSDToINRRate() {
    try {
      // Try to find USD/INR in the sheets
      const usdInrData = await this.findSymbolData('USDINR');
      if (usdInrData && usdInrData.price) {
        return usdInrData.price;
      }
    } catch (error) {
      console.warn('USD/INR not found in sheets, using fallback');
    }

    // Fallback to external API
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR');
      const data = await response.json();
      return data.rates.INR;
    } catch (error) {
      console.warn('Could not fetch exchange rate, using fallback');
      return 83.50; // Fallback rate
    }
  }

  /**
   * Convert USD to INR
   */
  async convertUSDToINR(usdPrice) {
    const rate = await this.getUSDToINRRate();
    return usdPrice * rate;
  }
}

// Export singleton instance
const googleSheetsPriceService = new GoogleSheetsPriceService();
export default googleSheetsPriceService;
