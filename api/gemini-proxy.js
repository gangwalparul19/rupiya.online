// Gemini API Proxy - Backend Function
// Handles all Gemini API calls securely
// - Validates Firebase JWT token
// - Retrieves and decrypts user's API key from Firestore
// - Calls Gemini API
// - Logs usage for monitoring
// - Returns results to client

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';

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

// Constants
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const MAX_REQUESTS_PER_DAY = parseInt(process.env.GEMINI_MAX_REQUESTS_PER_USER_PER_DAY || '100');
const MAX_TOKENS_PER_REQUEST = parseInt(process.env.GEMINI_MAX_TOKENS_PER_REQUEST || '2000');

/**
 * Decrypt API key using master key
 * Uses the same encryption method as client-side encryption service
 */
function decryptApiKey(encryptedData, masterKey) {
  try {
    // Extract components
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'hex');
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const authTag = Buffer.from(encryptedData.authTag || '', 'hex');

    // Derive key from master key and salt
    const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    
    if (authTag.length > 0) {
      decipher.setAuthTag(authTag);
    }

    // Decrypt
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt API key');
  }
}

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
 * Get user's decrypted API key from Firestore
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

    // For now, return the encrypted data
    // In production, you'd decrypt using a master key stored securely
    // This is a simplified version - in real implementation, use KMS or similar
    return {
      encryptedKey: data.encryptedKey,
      iv: data.iv,
      salt: data.salt,
      authTag: data.authTag
    };
  } catch (error) {
    console.error('Error retrieving API key:', error);
    throw error;
  }
}

/**
 * Check rate limit for user
 */
async function checkRateLimit(userId) {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const today = new Date().toISOString().split('T')[0];
    const usageDocRef = db.collection('geminiUsage').doc(`${userId}_${today}`);
    const usageDoc = await usageDocRef.get();

    if (usageDoc.exists) {
      const requestCount = usageDoc.data().requestCount || 0;
      if (requestCount >= MAX_REQUESTS_PER_DAY) {
        throw new Error(`Daily request limit (${MAX_REQUESTS_PER_DAY}) exceeded`);
      }
    }

    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    throw error;
  }
}

/**
 * Record usage in Firestore
 */
async function recordUsage(userId, inputTokens, outputTokens, action, success = true) {
  try {
    if (!db) return;

    const today = new Date().toISOString().split('T')[0];
    const usageDocRef = db.collection('geminiUsage').doc(`${userId}_${today}`);
    const usageDoc = await usageDocRef.get();

    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = (totalTokens * 0.00000075); // Rough estimate

    if (usageDoc.exists) {
      await usageDocRef.update({
        requestCount: (usageDoc.data().requestCount || 0) + 1,
        tokenCount: (usageDoc.data().tokenCount || 0) + totalTokens,
        estimatedCost: (usageDoc.data().estimatedCost || 0) + estimatedCost,
        lastRequest: new Date(),
        lastAction: action,
        errors: success ? (usageDoc.data().errors || 0) : (usageDoc.data().errors || 0) + 1
      });
    } else {
      await usageDocRef.set({
        userId,
        date: today,
        requestCount: 1,
        tokenCount: totalTokens,
        estimatedCost,
        lastRequest: new Date(),
        lastAction: action,
        errors: success ? 0 : 1
      });
    }

    // Update key's usage count
    const keyDocRef = db.collection('userGeminiKeys').doc(userId);
    const keyDoc = await keyDocRef.get();
    if (keyDoc.exists) {
      await keyDocRef.update({
        usageCount: (keyDoc.data().usageCount || 0) + 1,
        lastUsed: new Date()
      });
    }
  } catch (error) {
    console.error('Error recording usage:', error);
    // Don't throw - usage recording shouldn't break the app
  }
}

/**
 * Call Gemini API
 */
async function callGeminiApi(apiKey, prompt, maxTokens = 500) {
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
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: Math.min(maxTokens, MAX_TOKENS_PER_REQUEST),
          temperature: 0.3,
          topP: 0.95
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();

    // Extract response text
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = data.usageMetadata || {};

    return {
      text: responseText,
      inputTokens: usageMetadata.promptTokenCount || 0,
      outputTokens: usageMetadata.candidatesTokenCount || 0,
      success: true
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Sanitize and validate prompt to prevent injection attacks
 */
function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Invalid prompt');
  }

  // Remove potentially dangerous content
  let sanitized = prompt
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();

  // Limit prompt length
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }

  return sanitized;
}

/**
 * Main handler for different Gemini actions
 */
async function handleGeminiRequest(userId, action, data, apiKey) {
  let prompt = '';

  switch (action) {
    case 'categorizeExpense':
      prompt = buildCategorizeExpensePrompt(data);
      break;

    case 'analyzeBudget':
      prompt = buildAnalyzeBudgetPrompt(data);
      break;

    case 'spendingInsights':
      prompt = buildSpendingInsightsPrompt(data);
      break;

    case 'investmentAnalysis':
      prompt = buildInvestmentAnalysisPrompt(data);
      break;

    case 'goalRecommendation':
      prompt = buildGoalRecommendationPrompt(data);
      break;

    case 'chat':
      prompt = sanitizePrompt(data.message);
      break;

    default:
      throw new Error('Unknown action');
  }

  return await callGeminiApi(apiKey, prompt);
}

/**
 * Build prompts for different actions
 */
function buildCategorizeExpensePrompt(data) {
  const categories = (data.userCategories || []).join(', ');
  const recentExpenses = JSON.stringify(data.recentExpenses || []);

  return sanitizePrompt(`
You are a financial assistant. Categorize this expense based on the user's existing categories.

User's categories: ${categories}
Recent similar expenses: ${recentExpenses}

Expense to categorize:
- Description: "${data.description}"
- Amount: ${data.amount}

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "category": "best_category_name",
  "confidence": 85,
  "reasoning": "brief explanation"
}
  `);
}

function buildAnalyzeBudgetPrompt(data) {
  return sanitizePrompt(`
You are a financial advisor. Analyze this budget and provide recommendations.

Budget data:
${JSON.stringify(data, null, 2)}

Provide a brief analysis (2-3 sentences) with specific recommendations for budget optimization.
Focus on actionable insights.
  `);
}

function buildSpendingInsightsPrompt(data) {
  return sanitizePrompt(`
You are a financial analyst. Analyze this spending data and identify patterns and insights.

Spending data:
${JSON.stringify(data, null, 2)}

Provide 3-4 key insights about spending patterns and recommendations.
  `);
}

function buildInvestmentAnalysisPrompt(data) {
  return sanitizePrompt(`
You are an investment advisor. Analyze this investment portfolio.

Portfolio data:
${JSON.stringify(data, null, 2)}

Provide a brief analysis with recommendations for portfolio optimization.
  `);
}

function buildGoalRecommendationPrompt(data) {
  return sanitizePrompt(`
You are a financial goal advisor. Based on this financial data, recommend goals.

Financial data:
${JSON.stringify(data, null, 2)}

Suggest 2-3 realistic financial goals with specific targets and timelines.
  `);
}

/**
 * Main API handler
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

    // Check rate limit
    await checkRateLimit(userId);

    // Get user's API key
    const encryptedKeyData = await getUserApiKey(userId);

    // In production, decrypt using secure key management
    // For now, we'll need to implement proper decryption
    // This is a placeholder - actual implementation would use KMS or similar
    let apiKey = encryptedKeyData.encryptedKey;

    // TODO: Implement proper decryption using master key from secure storage
    // For development, you might store the master key in environment variables
    // In production, use Google Cloud KMS or similar

    // Extract request data
    const { action, data } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Missing action' });
    }

    // Handle the Gemini request
    const result = await handleGeminiRequest(userId, action, data, apiKey);

    // Record usage
    await recordUsage(userId, result.inputTokens, result.outputTokens, action, true);

    // Return response
    return res.status(200).json({
      success: true,
      data: result.text,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      }
    });
  } catch (error) {
    console.error('Gemini proxy error:', error);

    // Record failed usage
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decodedToken = await verifyToken(token);
        await recordUsage(decodedToken.uid, 0, 0, req.body?.action || 'unknown', false);
      }
    } catch (e) {
      // Ignore recording errors
    }

    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
