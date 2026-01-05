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
   */
  async fetchSheetData(sheetType) {
    if (!['stocks', 'mutualFunds'].includes(sheetType)) {
      throw new Error(`Unknown sheet type: ${sheetType}`);
    }

    try {
      const response = await fetch(`${this.API_ENDPOINT}?sheetType=${sheetType}`);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Failed to fetch sheet: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('API Error Details:', errorData);
        } catch (e) {
          // Response might not be JSON
          const text = await response.text();
          console.error('API Error Response:', text);
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
      
      console.log(`Fetched ${data.length} rows from ${sheetType} sheet`);
      return data;
    } catch (error) {
      console.error(`Error fetching ${sheetType} sheet:`, error);
      throw error;
    }
  }

  /**
   * Get all data (fetch if needed)
   */
  async getAllData() {
    const now = Date.now();
    
    // Fetch stocks if cache expired
    if (now - this.lastFetch.stocks > this.CACHE_DURATION) {
      await this.fetchSheetData('stocks');
    }

    // Fetch mutual funds if cache expired
    if (now - this.lastFetch.mutualFunds > this.CACHE_DURATION) {
      await this.fetchSheetData('mutualFunds');
    }

    return {
      stocks: this.stocksData,
      mutualFunds: this.mutualFundsData
    };
  }

  /**
   * Find price data for a symbol
   * Searches in both stocks and mutual funds sheets
   */
  async findSymbolData(symbol) {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    // Fetch latest data
    const allData = await this.getAllData();

    // Normalize symbol for comparison
    const normalizedSymbol = symbol.toUpperCase().trim();

    // Search in stocks data first
    let found = allData.stocks.find(row => {
      const rowSymbol = (row.Symbol || row.symbol || '').toString().toUpperCase().trim();
      return rowSymbol === normalizedSymbol;
    });

    // If not found, search in mutual funds
    if (!found) {
      found = allData.mutualFunds.find(row => {
        const rowSymbol = (row.Symbol || row.symbol || row['Scheme Code'] || '').toString().toUpperCase().trim();
        return rowSymbol === normalizedSymbol;
      });
    }

    if (!found) {
      throw new Error(`Symbol ${symbol} not found in Google Sheets`);
    }

    // Extract price data (adjust column names based on your sheet structure)
    const priceData = this.extractPriceData(found, symbol);

    // Cache the result
    this.priceCache.set(symbol, {
      data: priceData,
      timestamp: Date.now()
    });

    return priceData;
  }

  /**
   * Extract price data from sheet row
   * Adjust column names based on your actual Google Sheets structure
   */
  extractPriceData(row, symbol) {
    // Common column name variations
    const price = parseFloat(
      row.Price || row.price || row['Current Price'] || row['LTP'] || 
      row['Last Price'] || row.NAV || row.nav || 0
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

    // Detect currency
    const currency = this.detectCurrency(row, symbol);

    // Get name
    const name = row.Name || row.name || row['Company Name'] || row['Scheme Name'] || symbol;

    return {
      symbol: symbol,
      name: name,
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
   * Detect currency based on symbol or row data
   */
  detectCurrency(row, symbol) {
    // Check if currency is explicitly mentioned in the sheet
    if (row.Currency || row.currency) {
      return row.Currency || row.currency;
    }

    // Detect based on symbol suffix
    const symbolUpper = symbol.toUpperCase();
    
    if (symbolUpper.includes('.NS') || symbolUpper.includes('.BO')) {
      return 'INR'; // NSE/BSE stocks
    }
    
    if (symbolUpper.includes('INR') || symbolUpper.includes('₹')) {
      return 'INR';
    }

    if (symbolUpper.includes('USD') || symbolUpper.includes('$')) {
      return 'USD';
    }

    // Check exchange column
    const exchange = (row.Exchange || row.exchange || '').toString().toUpperCase();
    if (exchange.includes('NSE') || exchange.includes('BSE') || exchange.includes('MCX')) {
      return 'INR';
    }

    if (exchange.includes('NASDAQ') || exchange.includes('NYSE') || exchange.includes('US')) {
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
   */
  async searchSymbols(query, limit = 10) {
    const allData = await this.getAllData();
    const queryUpper = query.toUpperCase();

    const results = [];

    // Search in stocks
    allData.stocks.forEach(row => {
      const symbol = (row.Symbol || row.symbol || '').toString();
      const name = (row.Name || row.name || '').toString();
      
      if (symbol.toUpperCase().includes(queryUpper) || name.toUpperCase().includes(queryUpper)) {
        results.push({
          symbol: symbol,
          name: name,
          type: row.Type || row.type || 'Stock',
          exchange: row.Exchange || row.exchange || ''
        });
      }
    });

    // Search in mutual funds
    allData.mutualFunds.forEach(row => {
      const symbol = (row.Symbol || row.symbol || row['Scheme Code'] || '').toString();
      const name = (row.Name || row.name || row['Scheme Name'] || '').toString();
      
      if (symbol.toUpperCase().includes(queryUpper) || name.toUpperCase().includes(queryUpper)) {
        results.push({
          symbol: symbol,
          name: name,
          type: 'Mutual Fund',
          exchange: 'India'
        });
      }
    });

    return results.slice(0, limit);
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
