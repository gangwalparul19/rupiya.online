/**
 * Serverless API to fetch Google Sheets data
 * Keeps sheet URLs secure in environment variables
 */

export default async function handler(req, res) {
  // Enable CORS for mobile and cross-origin requests
  // Allow all origins for mobile app compatibility
  const origin = req.headers.origin || '*';
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    let envVarName;
    
    if (sheetType === 'stocks') {
      sheetUrl = process.env.GOOGLE_SHEETS_STOCKS_URL;
      envVarName = 'GOOGLE_SHEETS_STOCKS_URL';
    } else if (sheetType === 'mutualFunds') {
      sheetUrl = process.env.GOOGLE_SHEETS_MUTUAL_FUNDS_URL;
      envVarName = 'GOOGLE_SHEETS_MUTUAL_FUNDS_URL';
    }

    // Check if environment variable is set
    if (!sheetUrl) {
      console.error(`Environment variable ${envVarName} is not set`);
      return res.status(500).json({ 
        error: 'Sheet configuration missing',
        message: `Environment variable ${envVarName} is not configured in Vercel. Please add it in Settings → Environment Variables.`,
        envVarName: envVarName,
        instructions: 'https://vercel.com/docs/concepts/projects/environment-variables'
      });
    }

    // Fetch data from Google Sheets
    const response = await fetch(sheetUrl);

    if (!response.ok) {
      console.error(`Google Sheets returned ${response.status} for ${sheetType}`);
      
      // Provide helpful error messages
      if (response.status === 401 || response.status === 403) {
        return res.status(500).json({
          error: 'Google Sheets access denied',
          message: 'The sheet is not publicly accessible. Please make sure the sheet is shared with "Anyone with the link can view".',
          status: response.status
        });
      } else if (response.status === 404) {
        return res.status(500).json({
          error: 'Google Sheet not found',
          message: 'The sheet URL is invalid or the sheet has been deleted. Please check the environment variable.',
          status: response.status
        });
      } else {
        return res.status(500).json({
          error: 'Failed to fetch from Google Sheets',
          message: `Google Sheets API returned status ${response.status}`,
          status: response.status
        });
      }
    }

    const data = await response.text();

    // Set cache headers (5 minutes)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/plain');
    
    return res.status(200).send(data);

  } catch (error) {
    console.error('Error in get-sheet-data API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
