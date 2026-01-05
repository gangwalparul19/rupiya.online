/**
 * Search Symbols API
 * Searches for stocks, mutual funds, and cryptocurrencies supported by Yahoo Finance
 * 
 * Usage:
 * GET /api/search-symbols?query=apple&type=stock
 * GET /api/search-symbols?query=bitcoin&type=crypto
 * GET /api/search-symbols?query=hdfc&type=mf
 */

export const config = {
  maxDuration: 10
};

// Popular stocks database (cached locally to avoid API calls)
const POPULAR_STOCKS = {
  us: [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
    { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE' },
    { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE' },
    { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NASDAQ' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ' },
    { symbol: 'UBER', name: 'Uber Technologies Inc.', exchange: 'NYSE' },
    { symbol: 'SPOT', name: 'Spotify Technology S.A.', exchange: 'NYSE' },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', exchange: 'NASDAQ' }
  ],
  india_nse: [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', exchange: 'NSE' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services Limited', exchange: 'NSE' },
    { symbol: 'INFY.NS', name: 'Infosys Limited', exchange: 'NSE' },
    { symbol: 'WIPRO.NS', name: 'Wipro Limited', exchange: 'NSE' },
    { symbol: 'HDFC.NS', name: 'HDFC Bank Limited', exchange: 'NSE' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited', exchange: 'NSE' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Limited', exchange: 'NSE' },
    { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Limited', exchange: 'NSE' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited', exchange: 'NSE' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', exchange: 'NSE' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Limited', exchange: 'NSE' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank Limited', exchange: 'NSE' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Limited', exchange: 'NSE' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints (India) Limited', exchange: 'NSE' },
    { symbol: 'DMART.NS', name: 'Avenue Supermarts Limited', exchange: 'NSE' },
    { symbol: 'NESTLEIND.NS', name: 'Nestle India Limited', exchange: 'NSE' },
    { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Limited', exchange: 'NSE' },
    { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Limited', exchange: 'NSE' },
    { symbol: 'TATASTEEL.NS', name: 'Tata Steel Limited', exchange: 'NSE' }
  ],
  india_bse: [
    { symbol: 'RELIANCE.BO', name: 'Reliance Industries Limited', exchange: 'BSE' },
    { symbol: 'TCS.BO', name: 'Tata Consultancy Services Limited', exchange: 'BSE' },
    { symbol: 'INFY.BO', name: 'Infosys Limited', exchange: 'BSE' },
    { symbol: 'WIPRO.BO', name: 'Wipro Limited', exchange: 'BSE' },
    { symbol: 'HDFC.BO', name: 'HDFC Bank Limited', exchange: 'BSE' }
  ]
};

// Popular cryptocurrencies
const POPULAR_CRYPTOS = [
  { symbol: 'BTC-USD', name: 'Bitcoin', code: 'BTC' },
  { symbol: 'ETH-USD', name: 'Ethereum', code: 'ETH' },
  { symbol: 'BNB-USD', name: 'Binance Coin', code: 'BNB' },
  { symbol: 'XRP-USD', name: 'Ripple', code: 'XRP' },
  { symbol: 'ADA-USD', name: 'Cardano', code: 'ADA' },
  { symbol: 'SOL-USD', name: 'Solana', code: 'SOL' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', code: 'DOGE' },
  { symbol: 'MATIC-USD', name: 'Polygon', code: 'MATIC' },
  { symbol: 'LINK-USD', name: 'Chainlink', code: 'LINK' },
  { symbol: 'LTC-USD', name: 'Litecoin', code: 'LTC' },
  { symbol: 'BCH-USD', name: 'Bitcoin Cash', code: 'BCH' },
  { symbol: 'XLM-USD', name: 'Stellar Lumens', code: 'XLM' },
  { symbol: 'AVAX-USD', name: 'Avalanche', code: 'AVAX' },
  { symbol: 'FTT-USD', name: 'FTX Token', code: 'FTT' },
  { symbol: 'ATOM-USD', name: 'Cosmos', code: 'ATOM' },
  { symbol: 'BTC-INR', name: 'Bitcoin (INR)', code: 'BTC' },
  { symbol: 'ETH-INR', name: 'Ethereum (INR)', code: 'ETH' }
];

// Popular Indian Mutual Funds
const POPULAR_MFS = [
  { symbol: '0P0000YOIX.BO', name: 'Axis Bluechip Fund', fund_house: 'Axis' },
  { symbol: '0P0000YPQQ.BO', name: 'HDFC Top 100 Fund', fund_house: 'HDFC' },
  { symbol: '0P0000YQFQ.BO', name: 'SBI Bluechip Fund', fund_house: 'SBI' },
  { symbol: '0P0000YQFR.BO', name: 'ICICI Prudential Bluechip Fund', fund_house: 'ICICI Prudential' },
  { symbol: '0P0000YQFS.BO', name: 'Kotak Standard Multicap Fund', fund_house: 'Kotak' },
  { symbol: '0P0000YQFT.BO', name: 'Mirae Asset Large Cap Fund', fund_house: 'Mirae Asset' },
  { symbol: '0P0000YQFU.BO', name: 'Motilal Oswal Multicap 35 Fund', fund_house: 'Motilal Oswal' },
  { symbol: '0P0000YQFV.BO', name: 'Nippon India Growth Fund', fund_house: 'Nippon India' },
  { symbol: '0P0000YQFW.BO', name: 'Parag Parikh Financial Advisory Fund', fund_house: 'Parag Parikh' },
  { symbol: '0P0000YQFX.BO', name: 'Quant Active Fund', fund_house: 'Quant' },
  { symbol: '0P0000YQFY.BO', name: 'Sundaram Balanced Fund', fund_house: 'Sundaram' },
  { symbol: '0P0000YQFZ.BO', name: 'UTI Equity Fund', fund_house: 'UTI' },
  { symbol: '0P0000YQGA.BO', name: 'Vanguard India Index Fund', fund_house: 'Vanguard' },
  { symbol: '0P0000YQGB.BO', name: 'Aditya Birla Sun Life Equity Fund', fund_house: 'Aditya Birla' },
  { symbol: '0P0000YQGC.BO', name: 'Canara Robeco Equity Diversified Fund', fund_house: 'Canara Robeco' }
];

/**
 * Search symbols by query and type
 */
function searchSymbols(query, type = 'all', limit = 10) {
  if (!query || query.length < 1) {
    return [];
  }

  const q = query.toLowerCase();
  let results = [];

  // Search stocks
  if (type === 'all' || type === 'stock') {
    const allStocks = [...POPULAR_STOCKS.us, ...POPULAR_STOCKS.india_nse, ...POPULAR_STOCKS.india_bse];
    const stockResults = allStocks.filter(stock =>
      stock.symbol.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q)
    );
    results = results.concat(stockResults.map(s => ({ ...s, type: 'stock' })));
  }

  // Search crypto
  if (type === 'all' || type === 'crypto') {
    const cryptoResults = POPULAR_CRYPTOS.filter(crypto =>
      crypto.symbol.toLowerCase().includes(q) ||
      crypto.name.toLowerCase().includes(q) ||
      crypto.code.toLowerCase().includes(q)
    );
    results = results.concat(cryptoResults.map(c => ({ ...c, type: 'crypto' })));
  }

  // Search mutual funds
  if (type === 'all' || type === 'mf') {
    const mfResults = POPULAR_MFS.filter(mf =>
      mf.symbol.toLowerCase().includes(q) ||
      mf.name.toLowerCase().includes(q) ||
      mf.fund_house.toLowerCase().includes(q)
    );
    results = results.concat(mfResults.map(m => ({ ...m, type: 'mf' })));
  }

  // Remove duplicates and limit results
  const uniqueResults = Array.from(new Map(results.map(r => [r.symbol, r])).values());
  return uniqueResults.slice(0, limit);
}

/**
 * Verify if symbol is supported
 */
function isSymbolSupported(symbol, type = 'all') {
  const s = symbol.toUpperCase();

  if (type === 'all' || type === 'stock') {
    const allStocks = [...POPULAR_STOCKS.us, ...POPULAR_STOCKS.india_nse, ...POPULAR_STOCKS.india_bse];
    if (allStocks.some(stock => stock.symbol === s)) return true;
  }

  if (type === 'all' || type === 'crypto') {
    if (POPULAR_CRYPTOS.some(crypto => crypto.symbol === s)) return true;
  }

  if (type === 'all' || type === 'mf') {
    if (POPULAR_MFS.some(mf => mf.symbol === s)) return true;
  }

  return false;
}

/**
 * Get all symbols of a type
 */
function getAllSymbols(type = 'all') {
  let results = [];

  if (type === 'all' || type === 'stock') {
    const allStocks = [...POPULAR_STOCKS.us, ...POPULAR_STOCKS.india_nse, ...POPULAR_STOCKS.india_bse];
    results = results.concat(allStocks.map(s => ({ ...s, type: 'stock' })));
  }

  if (type === 'all' || type === 'crypto') {
    results = results.concat(POPULAR_CRYPTOS.map(c => ({ ...c, type: 'crypto' })));
  }

  if (type === 'all' || type === 'mf') {
    results = results.concat(POPULAR_MFS.map(m => ({ ...m, type: 'mf' })));
  }

  return results;
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
    const { query, type = 'all', limit = 10, action = 'search' } = req.query;

    if (action === 'verify') {
      // Verify if symbol is supported
      const symbol = query;
      if (!symbol) {
        return res.status(400).json({
          success: false,
          error: 'Symbol is required'
        });
      }

      const supported = isSymbolSupported(symbol, type);
      return res.status(200).json({
        success: true,
        symbol,
        supported,
        message: supported ? 'Symbol is supported' : 'Symbol is not in our database'
      });
    }

    if (action === 'all') {
      // Get all symbols of a type
      const symbols = getAllSymbols(type);
      return res.status(200).json({
        success: true,
        count: symbols.length,
        symbols
      });
    }

    // Default: search
    if (!query || query.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const results = searchSymbols(query, type, parseInt(limit) || 10);

    return res.status(200).json({
      success: true,
      query,
      type,
      count: results.length,
      results
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
