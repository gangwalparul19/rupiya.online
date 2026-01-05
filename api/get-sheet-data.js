/**
 * Serverless API to fetch Google Sheets data
 * Keeps sheet URLs secure in environment variables
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheetType } = req.query;

  // Validate sheet type
  if (!sheetType || !['stocks', 'mutualFunds'].includes(sheetType)) {
    return res.status(400).json({ 
      error: 'Invalid sheet type. Must be "stocks" or "mutualFunds"' 
    });
  }

  try {
    // Get sheet URL from environment variables
    let sheetUrl;
    
    if (sheetType === 'stocks') {
      sheetUrl = process.env.GOOGLE_SHEETS_STOCKS_URL;
    } else if (sheetType === 'mutualFunds') {
      sheetUrl = process.env.GOOGLE_SHEETS_MUTUAL_FUNDS_URL;
    }

    // Check if environment variable is set
    if (!sheetUrl) {
      console.error(`Environment variable not set for ${sheetType}`);
      return res.status(500).json({ 
        error: 'Sheet configuration missing',
        message: 'Please configure environment variables in Vercel'
      });
    }

    // Fetch data from Google Sheets
    const response = await fetch(sheetUrl);

    if (!response.ok) {
      throw new Error(`Google Sheets API returned ${response.status}`);
    }

    const data = await response.text();

    // Set cache headers (5 minutes)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/plain');
    
    return res.status(200).send(data);

  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch sheet data',
      message: error.message 
    });
  }
}
