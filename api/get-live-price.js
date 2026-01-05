/**
 * Get Live Price from Yahoo Finance
 * Serverless function to fetch real-time prices for stocks, mutual funds, commodities, and crypto
 * 
 * Usage:
 * GET /api/get-live-price?symbol=AAPL
 * GET /api/get-live-price?symbol=0P0000YOIX.BO (Mutual Fund)
 * GET /api/get-live-price?symbol=GC=F (Gold Commodity)
 * GET /api/get-live-price?symbol=BTC-USD (Bitcoin)
 */

export const config = {
  maxDuration: 10
};

// Cache for prices to avoid hitting API too frequently
const priceCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch price from Yahoo Finance API
 */
async function fetchYahooFinancePrice(symbol) {
  try {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`[Cache Hit] ${symbol}: ${cached.price}`);
      return cached;
    }

    // Yahoo Finance API endpoint
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.quoteSummary || !data.quoteSummary.result || !data.quoteSummary.result[0]) {
      console.error(`No data found for symbol: ${symbol}`);
      return null;
    }

    const priceData = data.quoteSummary.result[0].price;
    
    if (!priceData || !priceData.regularMarketPrice) {
      console.error(`Invalid price data for ${symbol}`);
      return null;
    }

    const result = {
      symbol,
      price: priceData.regularMarketPrice.raw,
      currency: priceData.currency,
      change: priceData.regularMarketChange?.raw || 0,
      changePercent: priceData.regularMarketChangePercent?.raw || 0,
      timestamp: Date.now(),
      marketCap: priceData.marketCap?.raw,
      fiftyTwoWeekHigh: priceData.fiftyTwoWeekHigh?.raw,
      fiftyTwoWeekLow: priceData.fiftyTwoWeekLow?.raw,
      averageVolume: priceData.averageVolume?.raw,
      lastUpdate: new Date().toISOString()
    };

    // Cache the result
    priceCache.set(symbol, result);
    
    return result;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Parse investment symbol based on type
 */
function getYahooSymbol(investment) {
  const { type, symbol, name } = investment;
  
  // If symbol is already provided, use it
  if (symbol) return symbol;

  // Map investment types to Yahoo Finance symbols
  switch (type?.toLowerCase()) {
    case 'stock':
    case 'equity':
      // Assume symbol is in the name or use as-is
      return symbol || name.toUpperCase().replace(/\s+/g, '');
    
    case 'mutual fund':
    case 'mf':
      // Indian MF format: 0P0000YOIX.BO
      return symbol || name;
    
    case 'crypto':
    case 'cryptocurrency':
      // Crypto format: BTC-USD, ETH-USD
      return symbol || `${name.toUpperCase()}-USD`;
    
    case 'commodity':
      // Commodity format: GC=F (Gold), CL=F (Crude Oil)
      return symbol || name;
    
    case 'etf':
      // ETF format: SPY, VOO
      return symbol || name.toUpperCase();
    
    default:
      return symbol || name.toUpperCase();
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { symbol, investment } = req.query;

    if (!symbol && !investment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: symbol or investment'
      });
    }

    let yahooSymbol = symbol;
    
    // If investment object is provided, parse it
    if (investment && !symbol) {
      try {
        const investmentData = JSON.parse(investment);
        yahooSymbol = getYahooSymbol(investmentData);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid investment object'
        });
      }
    }

    if (!yahooSymbol) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine symbol for investment'
      });
    }

    console.log(`[API] Fetching price for symbol: ${yahooSymbol}`);

    const priceData = await fetchYahooFinancePrice(yahooSymbol);

    if (!priceData) {
      return res.status(404).json({
        success: false,
        error: `Could not fetch price for symbol: ${yahooSymbol}`,
        symbol: yahooSymbol
      });
    }

    return res.status(200).json({
      success: true,
      data: priceData
    });

  } catch (error) {
    console.error('[API Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
