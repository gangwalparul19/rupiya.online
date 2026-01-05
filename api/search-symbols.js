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
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', searchAlias: 'JP MORGAN' },
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
    { symbol: 'COIN', name: 'Coinbase Global Inc.', exchange: 'NASDAQ' },
    { symbol: 'ACC', name: 'Accenture Limited', exchange: 'NASDAQ'}
  ],
  india_nse: [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', exchange: 'NSE', searchAlias: 'RELIANCE' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services Limited', exchange: 'NSE', searchAlias: 'TCS' },
    { symbol: 'INFY.NS', name: 'Infosys Limited', exchange: 'NSE', searchAlias: 'INFY' },
    { symbol: 'WIPRO.NS', name: 'Wipro Limited', exchange: 'NSE', searchAlias: 'WIPRO' },
    { symbol: 'HDFC.NS', name: 'HDFC Bank Limited', exchange: 'NSE', searchAlias: 'HDFC' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited', exchange: 'NSE', searchAlias: 'ICICIBANK' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', searchAlias: 'SBIN' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Limited', exchange: 'NSE', searchAlias: 'MARUTI' },
    { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Limited', exchange: 'NSE', searchAlias: 'BAJAJFINSV' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited', exchange: 'NSE', searchAlias: 'BHARTIARTL' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', exchange: 'NSE', searchAlias: 'HDFCBANK' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Limited', exchange: 'NSE', searchAlias: 'KOTAKBANK' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank Limited', exchange: 'NSE', searchAlias: 'AXISBANK' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Limited', exchange: 'NSE', searchAlias: 'SUNPHARMA' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints (India) Limited', exchange: 'NSE', searchAlias: 'ASIANPAINT' },
    { symbol: 'DMART.NS', name: 'Avenue Supermarts Limited', exchange: 'NSE', searchAlias: 'DMART' },
    { symbol: 'NESTLEIND.NS', name: 'Nestle India Limited', exchange: 'NSE', searchAlias: 'NESTLEIND' },
    { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India Limited', exchange: 'NSE', searchAlias: 'POWERGRID' },
    { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Limited', exchange: 'NSE', searchAlias: 'JSWSTEEL' },
    { symbol: 'TATASTEEL.NS', name: 'Tata Steel Limited', exchange: 'NSE', searchAlias: 'TATASTEEL' },
    { symbol: 'ACC.NS', name: 'Accenture Limited', exchange: 'NSE', searchAlias: 'ACC' },
    { symbol: 'BAJAJHLDNG.NS', name: 'Bajaj Holdings & Investment Limited', exchange: 'NSE', searchAlias: 'BAJAJHLDNG' },
    { symbol: 'BPCL.NS', name: 'Bharat Petroleum Corporation Limited', exchange: 'NSE', searchAlias: 'BPCL' },
    { symbol: 'BRITANNIA.NS', name: 'Britannia Industries Limited', exchange: 'NSE', searchAlias: 'BRITANNIA' },
    { symbol: 'CIPLA.NS', name: 'Cipla Limited', exchange: 'NSE', searchAlias: 'CIPLA' },
    { symbol: 'COALINDIA.NS', name: 'Coal India Limited', exchange: 'NSE', searchAlias: 'COALINDIA' },
    { symbol: 'COLPAL.NS', name: 'Colgate-Palmolive (India) Limited', exchange: 'NSE', searchAlias: 'COLPAL' },
    { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Limited', exchange: 'NSE', searchAlias: 'DIVISLAB' },
    { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories Limited', exchange: 'NSE', searchAlias: 'DRREDDY' },
    { symbol: 'EICHERMOT.NS', name: 'Eicher Motors Limited', exchange: 'NSE', searchAlias: 'EICHERMOT' },
    { symbol: 'GAIL.NS', name: 'GAIL (India) Limited', exchange: 'NSE', searchAlias: 'GAIL' },
    { symbol: 'GRASIM.NS', name: 'Grasim Industries Limited', exchange: 'NSE', searchAlias: 'GRASIM' },
    { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Limited', exchange: 'NSE', searchAlias: 'HEROMOTOCO' },
    { symbol: 'HINDALCO.NS', name: 'Hindalco Industries Limited', exchange: 'NSE', searchAlias: 'HINDALCO' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Limited', exchange: 'NSE', searchAlias: 'HINDUNILVR' },
    { symbol: 'INDIGO.NS', name: 'InterGlobe Aviation Limited', exchange: 'NSE', searchAlias: 'INDIGO' },
    { symbol: 'INDUSIND.NS', name: 'IndusInd Bank Limited', exchange: 'NSE', searchAlias: 'INDUSIND' },
    { symbol: 'IOC.NS', name: 'Indian Oil Corporation Limited', exchange: 'NSE', searchAlias: 'IOC' },
    { symbol: 'ITC.NS', name: 'ITC Limited', exchange: 'NSE', searchAlias: 'ITC' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro Limited', exchange: 'NSE', searchAlias: 'LT' },
    { symbol: 'LTTS.NS', name: 'L&T Technology Services Limited', exchange: 'NSE', searchAlias: 'LTTS' },
    { symbol: 'LUPIN.NS', name: 'Lupin Limited', exchange: 'NSE', searchAlias: 'LUPIN' },
    { symbol: 'MAHINDRA.NS', name: 'Mahindra & Mahindra Limited', exchange: 'NSE', searchAlias: 'MAHINDRA' },
    { symbol: 'MINDTREE.NS', name: 'Mindtree Limited', exchange: 'NSE', searchAlias: 'MINDTREE' },
    { symbol: 'NTPC.NS', name: 'NTPC Limited', exchange: 'NSE', searchAlias: 'NTPC' },
    { symbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation Limited', exchange: 'NSE', searchAlias: 'ONGC' },
    { symbol: 'PHARMEASY.NS', name: 'PharmEasy Limited', exchange: 'NSE', searchAlias: 'PHARMEASY' },
    { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries Limited', exchange: 'NSE', searchAlias: 'PIDILITIND' },
    { symbol: 'SHREECEM.NS', name: 'Shree Cement Limited', exchange: 'NSE', searchAlias: 'SHREECEM' },
    { symbol: 'SIEMENS.NS', name: 'Siemens Limited', exchange: 'NSE', searchAlias: 'SIEMENS' },
    { symbol: 'SUNTV.NS', name: 'Sun TV Network Limited', exchange: 'NSE', searchAlias: 'SUNTV' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited', exchange: 'NSE', searchAlias: 'TATAMOTORS' },
    { symbol: 'TATAPOWER.NS', name: 'Tata Power Company Limited', exchange: 'NSE', searchAlias: 'TATAPOWER' },
    { symbol: 'TECHM.NS', name: 'Tech Mahindra Limited', exchange: 'NSE', searchAlias: 'TECHM' },
    { symbol: 'TITAN.NS', name: 'Titan Company Limited', exchange: 'NSE', searchAlias: 'TITAN' },
    { symbol: 'TORNTPHARM.NS', name: 'Torrent Pharmaceuticals Limited', exchange: 'NSE', searchAlias: 'TORNTPHARM' },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Limited', exchange: 'NSE', searchAlias: 'ULTRACEMCO' },
    { symbol: 'UPL.NS', name: 'UPL Limited', exchange: 'NSE', searchAlias: 'UPL' },
    { symbol: 'VEDL.NS', name: 'Vedanta Limited', exchange: 'NSE', searchAlias: 'VEDL' }
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
  { symbol: '0P0000YOIX.BO', name: 'Axis Bluechip Fund', fund_house: 'Axis', searchAlias: 'AXIS' },
  { symbol: '0P0000YPQQ.BO', name: 'HDFC Top 100 Fund', fund_house: 'HDFC', searchAlias: 'HDFC' },
  { symbol: '0P0000YQFQ.BO', name: 'SBI Bluechip Fund', fund_house: 'SBI', searchAlias: 'SBI' },
  { symbol: '0P0000YQFR.BO', name: 'ICICI Prudential Bluechip Fund', fund_house: 'ICICI Prudential', searchAlias: 'ICICI' },
  { symbol: '0P0000YQFS.BO', name: 'Kotak Standard Multicap Fund', fund_house: 'Kotak', searchAlias: 'KOTAK' },
  { symbol: '0P0000YQFT.BO', name: 'Mirae Asset Large Cap Fund', fund_house: 'Mirae Asset', searchAlias: 'MIRAE' },
  { symbol: '0P0000YQFU.BO', name: 'Motilal Oswal Multicap 35 Fund', fund_house: 'Motilal Oswal', searchAlias: 'MOTILAL' },
  { symbol: '0P0000YQFV.BO', name: 'Nippon India Growth Fund', fund_house: 'Nippon India', searchAlias: 'NIPPON' },
  { symbol: '0P0000YQFW.BO', name: 'Parag Parikh Financial Advisory Fund', fund_house: 'Parag Parikh', searchAlias: 'PARAG' },
  { symbol: '0P0000YQFX.BO', name: 'Quant Active Fund', fund_house: 'Quant', searchAlias: 'QUANT' },
  { symbol: '0P0000YQFY.BO', name: 'Sundaram Balanced Fund', fund_house: 'Sundaram', searchAlias: 'SUNDARAM' },
  { symbol: '0P0000YQFZ.BO', name: 'UTI Equity Fund', fund_house: 'UTI', searchAlias: 'UTI' },
  { symbol: '0P0000YQGA.BO', name: 'Vanguard India Index Fund', fund_house: 'Vanguard', searchAlias: 'VANGUARD' },
  { symbol: '0P0000YQGB.BO', name: 'Aditya Birla Sun Life Equity Fund', fund_house: 'Aditya Birla', searchAlias: 'ADITYA' },
  { symbol: '0P0000YQGC.BO', name: 'Canara Robeco Equity Diversified Fund', fund_house: 'Canara Robeco', searchAlias: 'CANARA' },
  { symbol: '0P0000YQGD.BO', name: 'Franklin India Bluechip Fund', fund_house: 'Franklin Templeton', searchAlias: 'FRANKLIN' },
  { symbol: '0P0000YQGE.BO', name: 'ICICI Prudential Equity Fund', fund_house: 'ICICI Prudential', searchAlias: 'ICICI EQUITY' },
  { symbol: '0P0000YQGF.BO', name: 'HDFC Equity Fund', fund_house: 'HDFC', searchAlias: 'HDFC EQUITY' },
  { symbol: '0P0000YQGG.BO', name: 'Reliance Growth Fund', fund_house: 'Reliance', searchAlias: 'RELIANCE MF' },
  { symbol: '0P0000YQGH.BO', name: 'Tata Equity Fund', fund_house: 'Tata', searchAlias: 'TATA MF' },
  { symbol: '0P0000YQGI.BO', name: 'Birlasoft Equity Fund', fund_house: 'Birla', searchAlias: 'BIRLA' },
  { symbol: '0P0000YQGJ.BO', name: 'DSP Equity Fund', fund_house: 'DSP', searchAlias: 'DSP' },
  { symbol: '0P0000YQGK.BO', name: 'Edelweiss Equity Fund', fund_house: 'Edelweiss', searchAlias: 'EDELWEISS' },
  { symbol: '0P0000YQGL.BO', name: 'Fidelity Equity Fund', fund_house: 'Fidelity', searchAlias: 'FIDELITY' },
  { symbol: '0P0000YQGM.BO', name: 'IDFC Equity Fund', fund_house: 'IDFC', searchAlias: 'IDFC' },
  { symbol: '0P0000YQGN.BO', name: 'Invesco Equity Fund', fund_house: 'Invesco', searchAlias: 'INVESCO' },
  { symbol: '0P0000YQGO.BO', name: 'JM Financial Equity Fund', fund_house: 'JM Financial', searchAlias: 'JM' },
  { symbol: '0P0000YQGP.BO', name: 'L&T Equity Fund', fund_house: 'L&T', searchAlias: 'LT MF' },
  { symbol: '0P0000YQGQ.BO', name: 'Principal Equity Fund', fund_house: 'Principal', searchAlias: 'PRINCIPAL' },
  { symbol: '0P0000YQGR.BO', name: 'Quantum Equity Fund', fund_house: 'Quantum', searchAlias: 'QUANTUM' },
  { symbol: '0P0000YQGS.BO', name: 'Samco Equity Fund', fund_house: 'Samco', searchAlias: 'SAMCO' },
  { symbol: '0P0000YQGT.BO', name: 'Shriram Equity Fund', fund_house: 'Shriram', searchAlias: 'SHRIRAM' },
  { symbol: '0P0000YQGU.BO', name: 'Templeton Equity Fund', fund_house: 'Templeton', searchAlias: 'TEMPLETON' },
  { symbol: '0P0000YQGV.BO', name: 'Union Equity Fund', fund_house: 'Union', searchAlias: 'UNION' },
  { symbol: '0P0000YQGW.BO', name: 'Whirlpool Equity Fund', fund_house: 'Whirlpool', searchAlias: 'WHIRLPOOL' },
  { symbol: '0P0000YQGX.BO', name: 'Axis Midcap Fund', fund_house: 'Axis', searchAlias: 'AXIS MIDCAP' },
  { symbol: '0P0000YQGY.BO', name: 'HDFC Midcap Fund', fund_house: 'HDFC', searchAlias: 'HDFC MIDCAP' },
  { symbol: '0P0000YQGZ.BO', name: 'ICICI Prudential Midcap Fund', fund_house: 'ICICI Prudential', searchAlias: 'ICICI MIDCAP' },
  { symbol: '0P0000YQHA.BO', name: 'Kotak Midcap Fund', fund_house: 'Kotak', searchAlias: 'KOTAK MIDCAP' },
  { symbol: '0P0000YQHB.BO', name: 'SBI Midcap Fund', fund_house: 'SBI', searchAlias: 'SBI MIDCAP' },
  { symbol: '0P0000YQHC.BO', name: 'Axis Smallcap Fund', fund_house: 'Axis', searchAlias: 'AXIS SMALLCAP' },
  { symbol: '0P0000YQHD.BO', name: 'HDFC Smallcap Fund', fund_house: 'HDFC', searchAlias: 'HDFC SMALLCAP' },
  { symbol: '0P0000YQHE.BO', name: 'ICICI Prudential Smallcap Fund', fund_house: 'ICICI Prudential', searchAlias: 'ICICI SMALLCAP' }
];

/**
 * Search symbols by query and type
 */
function searchSymbols(query, type = 'all', limit = 10) {
  if (!query || query.length < 1) {
    return [];
  }

  const q = query.toLowerCase();
  const normalizedType = type.toLowerCase();
  console.log(`[searchSymbols] Query: "${q}", Type: "${normalizedType}"`);
  let results = [];

  // Search stocks
  if (normalizedType === 'all' || normalizedType === 'stock' || normalizedType === 'stocks') {
    const allStocks = [...POPULAR_STOCKS.us, ...POPULAR_STOCKS.india_nse, ...POPULAR_STOCKS.india_bse];
    const stockResults = allStocks.filter(stock =>
      stock.symbol.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      (stock.searchAlias && stock.searchAlias.toLowerCase().includes(q))
    );
    console.log(`[searchSymbols] Found ${stockResults.length} stocks matching "${q}"`);
    results = results.concat(stockResults.map(s => ({ ...s, type: 'stock' })));
  }

  // Search crypto
  if (normalizedType === 'all' || normalizedType === 'crypto' || normalizedType === 'cryptocurrencies') {
    const cryptoResults = POPULAR_CRYPTOS.filter(crypto =>
      crypto.symbol.toLowerCase().includes(q) ||
      crypto.name.toLowerCase().includes(q) ||
      crypto.code.toLowerCase().includes(q)
    );
    results = results.concat(cryptoResults.map(c => ({ ...c, type: 'crypto' })));
  }

  // Search mutual funds
  if (normalizedType === 'all' || normalizedType === 'mf' || normalizedType === 'mutualfund' || normalizedType === 'mutualfunds') {
    const mfResults = POPULAR_MFS.filter(mf =>
      mf.symbol.toLowerCase().includes(q) ||
      mf.name.toLowerCase().includes(q) ||
      mf.fund_house.toLowerCase().includes(q) ||
      (mf.searchAlias && mf.searchAlias.toLowerCase().includes(q))
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
  const normalizedType = type.toLowerCase();

  if (normalizedType === 'all' || normalizedType === 'stock' || normalizedType === 'stocks') {
    const allStocks = [...POPULAR_STOCKS.us, ...POPULAR_STOCKS.india_nse, ...POPULAR_STOCKS.india_bse];
    if (allStocks.some(stock => stock.symbol === s || (stock.searchAlias && stock.searchAlias === s))) return true;
  }

  if (normalizedType === 'all' || normalizedType === 'crypto' || normalizedType === 'cryptocurrencies') {
    if (POPULAR_CRYPTOS.some(crypto => crypto.symbol === s || crypto.code === s)) return true;
  }

  if (normalizedType === 'all' || normalizedType === 'mf' || normalizedType === 'mutualfund' || normalizedType === 'mutualfunds') {
    if (POPULAR_MFS.some(mf => mf.symbol === s)) return true;
  }

  return false;
}

/**
 * Get all symbols of a type
 */
function getAllSymbols(type = 'all') {
  const normalizedType = type.toLowerCase();
  let results = [];

  if (normalizedType === 'all' || normalizedType === 'stock' || normalizedType === 'stocks') {
    const allStocks = [...POPULAR_STOCKS.us, ...POPULAR_STOCKS.india_nse, ...POPULAR_STOCKS.india_bse];
    results = results.concat(allStocks.map(s => ({ ...s, type: 'stock' })));
  }

  if (normalizedType === 'all' || normalizedType === 'crypto' || normalizedType === 'cryptocurrencies') {
    results = results.concat(POPULAR_CRYPTOS.map(c => ({ ...c, type: 'crypto' })));
  }

  if (normalizedType === 'all' || normalizedType === 'mf' || normalizedType === 'mutualfund' || normalizedType === 'mutualfunds') {
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
    let { query, type = 'all', limit = 10, action = 'search' } = req.query;
    
    // Debug logging
    console.log('[Handler] Raw req.query:', req.query);
    console.log('[Handler] Parsed query:', query, 'type:', type);
    
    // Ensure query is a string (sometimes it can be an array)
    if (Array.isArray(query)) {
      query = query[0];
    }
    if (Array.isArray(type)) {
      type = type[0];
    }
    if (Array.isArray(action)) {
      action = action[0];
    }
    
    console.log('[Handler] After normalization - query:', query, 'type:', type, 'action:', action);

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

    console.log(`[Search API] Query: "${query}", Type: "${type}", Limit: ${limit}`);
    const results = searchSymbols(query, type, parseInt(limit) || 10);
    console.log(`[Search API] Found ${results.length} results for "${query}"`);

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
