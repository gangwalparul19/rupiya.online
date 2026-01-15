// Gemini API Key Validation Endpoint
// Validates user's Gemini API key by making a test call
// Only accessible to authenticated users for their own keys

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;
    
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('✓ Firebase Admin initialized with service account');
    } else {
      initializeApp();
      console.log('✓ Firebase Admin initialized with default credentials');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

const db = getApps().length > 0 ? getFirestore() : null;
const auth = getApps().length > 0 ? getAuth() : null;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Verify Firebase JWT token
 */
async function verifyToken(token) {
  try {
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Test Gemini API with a simple request
 */
async function testGeminiApi(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key format');
    }

    console.log('🔍 Testing Gemini API with key...');

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Say "API key is valid" in exactly 3 words.'
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1
        }
      })
    });

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'API validation failed';
      
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || errorMessage;
        console.error('❌ Gemini API error:', errorMessage);
      } catch (parseError) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
        console.error('❌ Gemini API error (non-JSON):', errorMessage);
      }
      
      // Check for specific error types
      if (errorMessage.includes('API key not valid') || errorMessage.includes('invalid')) {
        throw new Error('Invalid API key');
      } else if (errorMessage.includes('quota')) {
        throw new Error('API quota exceeded');
      } else if (errorMessage.includes('disabled')) {
        throw new Error('API is disabled for this project');
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Check if we got a valid response
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    console.log('✅ Gemini API test successful');
    return true;
  } catch (error) {
    console.error('❌ Gemini API test error:', error.message);
    throw error;
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  console.log('\n🚀 === Gemini Validate Key API Called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization');

    if (req.method === 'OPTIONS') {
      console.log('✓ OPTIONS request handled');
      res.status(200).end();
      return;
    }

    // Verify request method
    if (req.method !== 'POST') {
      console.log('❌ Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get and verify Firebase token
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid auth header');
      return res.status(401).json({ 
        valid: false,
        message: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7);
    console.log('🎫 Token extracted, length:', token.length);
    
    let decodedToken;
    
    try {
      decodedToken = await verifyToken(token);
      console.log('✅ Token verified for user:', decodedToken.uid);
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError.message);
      return res.status(401).json({
        valid: false,
        message: 'Invalid or expired token'
      });
    }

    const userId = decodedToken.uid;
    console.log(`👤 Validating Gemini API key for user: ${userId}`);

    // Get the API key from request body (decrypted by client)
    const { apiKey } = req.body;
    console.log('🔑 API key received:', !!apiKey, 'Length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.log('❌ No API key in request body');
      return res.status(400).json({
        valid: false,
        message: 'API key not provided'
      });
    }

    // Validate API key format
    if (typeof apiKey !== 'string') {
      console.log('❌ API key is not a string:', typeof apiKey);
      return res.status(400).json({
        valid: false,
        message: 'Invalid API key format'
      });
    }

    if (!apiKey.startsWith('AIza')) {
      console.log('❌ API key does not start with AIza');
      return res.status(400).json({
        valid: false,
        message: 'Invalid API key format (should start with AIza)'
      });
    }

    console.log('✓ API key format valid, testing with Gemini API...');

    // Test the API key
    try {
      await testGeminiApi(apiKey);
      console.log('✅ API key test passed');
    } catch (testError) {
      console.error('❌ API key test failed:', testError.message);
      return res.status(400).json({
        valid: false,
        message: testError.message || 'API key validation failed'
      });
    }

    console.log(`✅ API key validated successfully for user: ${userId}`);
    console.log('=== End of API Call ===\n');

    return res.status(200).json({
      valid: true,
      message: 'API key is valid and working'
    });
  } catch (error) {
    console.error('❌ Unexpected validation error:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we always return JSON
    return res.status(500).json({
      valid: false,
      message: error.message || 'Internal server error'
    });
  }
}
