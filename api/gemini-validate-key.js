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
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
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
 * Get user's API key from Firestore
 */
async function getUserApiKey(userId) {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const keyDocRef = db.collection('userGeminiKeys').doc(userId);
    const keyDoc = await keyDocRef.get();

    if (!keyDoc.exists) {
      throw new Error('No API key found for user');
    }

    const data = keyDoc.data();

    if (!data.isActive) {
      throw new Error('API key is inactive');
    }

    // Return encrypted data - will be decrypted on client
    return data.encryptedKey;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    throw error;
  }
}

/**
 * Test Gemini API with a simple request
 */
async function testGeminiApi(apiKey) {
  try {
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

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || 'API validation failed';
      
      // Check for specific error types
      if (errorMessage.includes('API key not valid')) {
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

    return true;
  } catch (error) {
    console.error('Gemini API test error:', error);
    throw error;
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get and verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyToken(token);
    const userId = decodedToken.uid;

    console.log(`Validating Gemini API key for user: ${userId}`);

    // Get the API key from request body (decrypted by client)
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        valid: false,
        message: 'API key not provided'
      });
    }

    // Test the API key
    await testGeminiApi(apiKey);

    console.log(`✅ API key validated for user: ${userId}`);

    return res.status(200).json({
      valid: true,
      message: 'API key is valid and working'
    });
  } catch (error) {
    console.error('Validation error:', error);

    return res.status(400).json({
      valid: false,
      message: error.message || 'API key validation failed'
    });
  }
}
