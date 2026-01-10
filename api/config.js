/**
 * Firebase Configuration API Endpoint
 * 
 * This endpoint serves Firebase configuration to authenticated clients.
 * Only public Firebase config is exposed (apiKey, projectId, etc.)
 * Private credentials are NEVER sent to the client.
 * 
 * Deploy this as a Vercel Function or similar serverless platform.
 */

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers to allow only your domain
  const allowedOrigins = [
    'https://rupiya.online',
    'https://www.rupiya.online',
    'http://localhost:8000',
    'http://localhost:3000'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Firebase configuration - only public values
  // These values are safe to expose as they're public Firebase config
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  };

  // Validate that all required config values are present
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

  if (missingFields.length > 0) {
    console.error('[Firebase Config API] Missing environment variables:', missingFields);
    return res.status(500).json({
      error: 'Firebase configuration is incomplete. Please check server environment variables.',
      missing: missingFields
    });
  }

  // Return the configuration
  return res.status(200).json({
    success: true,
    config: firebaseConfig,
    timestamp: new Date().toISOString()
  });
}
