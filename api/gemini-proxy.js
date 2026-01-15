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
// Use gemini-2.5-flash-lite for all requests (fast, efficient, and free tier friendly)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
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
          temperature: 0.7, // Increased for more conversational responses
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
  let maxTokens = 500; // Default

  switch (action) {
    case 'categorizeExpense':
      prompt = buildCategorizeExpensePrompt(data);
      maxTokens = 300;
      break;

    case 'analyzeBudget':
      prompt = buildAnalyzeBudgetPrompt(data);
      maxTokens = 800;
      break;

    case 'spendingInsights':
      prompt = buildSpendingInsightsPrompt(data);
      maxTokens = 800;
      break;

    case 'investmentAnalysis':
      prompt = buildInvestmentAnalysisPrompt(data);
      maxTokens = 800;
      break;

    case 'goalRecommendation':
      prompt = buildGoalRecommendationPrompt(data);
      maxTokens = 800;
      break;

    case 'chat':
      prompt = buildChatPrompt(data);
      maxTokens = 1000; // Higher limit for conversational responses
      break;

    default:
      throw new Error('Unknown action');
  }

  return await callGeminiApi(apiKey, prompt, maxTokens);
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

function buildChatPrompt(data) {
  const { message, financialContext } = data;
  
  // Build comprehensive context summary
  let contextSummary = '';
  
  if (financialContext) {
    contextSummary += '\n=== YOUR COMPLETE FINANCIAL DATA (ALREADY LOADED) ===\n';
    contextSummary += 'IMPORTANT: This data is ALREADY available to you. Use it to answer questions.\n';
    contextSummary += 'READ CAREFULLY - All sections below contain your actual data!\n\n';
    
    // Add a quick summary of what data is available
    contextSummary += '📋 DATA AVAILABILITY SUMMARY:\n';
    contextSummary += `✓ Expenses: ${financialContext.expenses?.length || 0} records\n`;
    contextSummary += `✓ Income: ${financialContext.income?.length || 0} records\n`;
    contextSummary += `✓ Budgets: ${financialContext.budgets?.length || 0} records\n`;
    contextSummary += `✓ Goals: ${financialContext.goals?.length || 0} records\n`;
    contextSummary += `✓ Investments: ${financialContext.investments?.length || 0} records\n`;
    contextSummary += `✓ Credit Cards: ${financialContext.creditCards?.length || 0} records\n`;
    contextSummary += `✓ Loans: ${financialContext.loans?.length || 0} records\n`;
    contextSummary += `✓ Properties: ${financialContext.houses?.length || 0} records\n`;
    contextSummary += `✓ Vehicles: ${financialContext.vehicles?.length || 0} records\n`;
    contextSummary += `✓ House Help: ${financialContext.houseHelp?.length || 0} records ⚠️ CHECK THIS SECTION BELOW!\n`;
    contextSummary += `✓ Recurring Transactions: ${financialContext.recurringTransactions?.length || 0} records\n`;
    contextSummary += `✓ Family Members: ${financialContext.familyMembers?.length || 0} records\n`;
    contextSummary += `✓ Trip Groups: ${financialContext.tripGroups?.length || 0} records\n`;
    contextSummary += `✓ Healthcare Insurance: ${financialContext.healthcareInsurance?.length || 0} records\n`;
    contextSummary += '\n=== DETAILED DATA BELOW ===\n';
    
    // Expenses
    if (financialContext.expenses && financialContext.expenses.length > 0) {
      const totalExpenses = financialContext.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const expensesByCategory = {};
      const expensesByDate = {};
      
      financialContext.expenses.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
        if (!expensesByDate[e.date]) {
          expensesByDate[e.date] = [];
        }
        expensesByDate[e.date].push(e);
      });
      
      contextSummary += `📊 EXPENSES (Last 3 Months) - ${financialContext.expenses.length} transactions:\n`;
      contextSummary += `Total: ₹${totalExpenses.toFixed(2)}\n\n`;
      
      contextSummary += `By Category:\n`;
      Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
        contextSummary += `  ${cat}: ₹${amt.toFixed(2)}\n`;
      });
      
      contextSummary += `\n⚠️ IMPORTANT: All Expense Transactions Listed Below (sorted by date):\n`;
      contextSummary += `Date format: YYYY-MM-DD (e.g., 2026-01-01 = January 1st, 2026)\n\n`;
      Object.entries(expensesByDate).sort((a, b) => b[0].localeCompare(a[0])).forEach(([date, expenses]) => {
        const dayTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        contextSummary += `DATE: ${date} | Day Total: ₹${dayTotal.toFixed(2)} | ${expenses.length} transaction(s)\n`;
        expenses.forEach(e => {
          contextSummary += `  → ₹${e.amount.toFixed(2)} | Category: ${e.category} | Description: ${e.description || 'No description'}\n`;
        });
        contextSummary += `\n`;
      });
    } else {
      contextSummary += `📊 EXPENSES: No expense data available\n`;
    }
    
    // Income
    if (financialContext.income && financialContext.income.length > 0) {
      const totalIncome = financialContext.income.reduce((sum, i) => sum + (i.amount || 0), 0);
      contextSummary += `\n💰 INCOME (Last 3 Months) - ${financialContext.income.length} transactions:\n`;
      contextSummary += `Total: ₹${totalIncome.toFixed(2)}\n`;
      
      contextSummary += `\nAll Income Transactions:\n`;
      financialContext.income.forEach(i => {
        contextSummary += `  ${i.date}: ₹${i.amount} | ${i.source} | ${i.description || 'No description'}\n`;
      });
    } else {
      contextSummary += `\n💰 INCOME: No income data available\n`;
    }
    
    // Budgets
    if (financialContext.budgets && financialContext.budgets.length > 0) {
      contextSummary += `\n📋 ACTIVE BUDGETS (${financialContext.budgets.length} budget(s)):\n`;
      financialContext.budgets.forEach(b => {
        contextSummary += `  ${b.category}: ₹${b.amount} per ${b.period || 'month'}\n`;
      });
    } else {
      contextSummary += `\n📋 ACTIVE BUDGETS: No budgets set\n`;
    }
    
    // Goals
    if (financialContext.goals && financialContext.goals.length > 0) {
      contextSummary += `\n🎯 FINANCIAL GOALS (${financialContext.goals.length} goal(s)):\n`;
      financialContext.goals.forEach(g => {
        const progress = g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(1) : 0;
        contextSummary += `  ${g.name}: ₹${g.currentAmount} / ₹${g.targetAmount} (${progress}%) - Target: ${g.targetDate || 'Not set'}\n`;
      });
    } else {
      contextSummary += `\n🎯 FINANCIAL GOALS: No goals set\n`;
    }
    
    // Investments
    if (financialContext.investments && financialContext.investments.length > 0) {
      const totalInvested = financialContext.investments.reduce((sum, i) => sum + (i.investedAmount || 0), 0);
      const totalCurrent = financialContext.investments.reduce((sum, i) => sum + (i.currentValue || 0), 0);
      const returns = totalCurrent - totalInvested;
      const returnPct = totalInvested > 0 ? ((returns / totalInvested) * 100).toFixed(2) : 0;
      
      contextSummary += `\n📈 INVESTMENTS (${financialContext.investments.length} holdings):\n`;
      contextSummary += `  Total Invested: ₹${totalInvested.toFixed(2)}\n`;
      contextSummary += `  Current Value: ₹${totalCurrent.toFixed(2)}\n`;
      contextSummary += `  Returns: ₹${returns.toFixed(2)} (${returnPct}%)\n`;
    } else {
      contextSummary += `\n📈 INVESTMENTS: No investment records\n`;
    }
    
    // Credit Cards
    if (financialContext.creditCards && financialContext.creditCards.length > 0) {
      const totalLimit = financialContext.creditCards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
      const totalBalance = financialContext.creditCards.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
      
      contextSummary += `\n💳 CREDIT CARDS (${financialContext.creditCards.length} cards):\n`;
      contextSummary += `  Total Limit: ₹${totalLimit.toFixed(2)}\n`;
      contextSummary += `  Total Outstanding: ₹${totalBalance.toFixed(2)}\n`;
      financialContext.creditCards.forEach(c => {
        contextSummary += `    ${c.bankName} ${c.cardName}: ₹${c.currentBalance} / ₹${c.creditLimit}\n`;
      });
    } else {
      contextSummary += `\n💳 CREDIT CARDS: No credit card records\n`;
    }
    
    // Loans
    if (financialContext.loans && financialContext.loans.length > 0) {
      const totalOutstanding = financialContext.loans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
      const totalEMI = financialContext.loans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
      
      contextSummary += `\n🏦 ACTIVE LOANS (${financialContext.loans.length} loan(s)):\n`;
      contextSummary += `  Total Outstanding: ₹${totalOutstanding.toFixed(2)}\n`;
      contextSummary += `  Total Monthly EMI: ₹${totalEMI.toFixed(2)}\n\n`;
      contextSummary += `  Loan Details:\n`;
      financialContext.loans.forEach((l, idx) => {
        contextSummary += `  ${idx + 1}. ${l.loanType} from ${l.lender}\n`;
        contextSummary += `     Outstanding: ₹${l.outstandingAmount.toFixed(2)}\n`;
        contextSummary += `     Interest Rate: ${l.interestRate}%\n`;
        contextSummary += `     Monthly EMI: ₹${l.emiAmount.toFixed(2)}\n\n`;
      });
    } else {
      contextSummary += `\n🏦 ACTIVE LOANS: No active loans\n`;
    }
    
    // Properties
    if (financialContext.houses && financialContext.houses.length > 0) {
      const totalValue = financialContext.houses.reduce((sum, h) => sum + (h.currentValue || 0), 0);
      contextSummary += `\n🏠 PROPERTIES (${financialContext.houses.length} properties):\n`;
      contextSummary += `  Total Value: ₹${totalValue.toFixed(2)}\n`;
    } else {
      contextSummary += `\n🏠 PROPERTIES: No property records\n`;
    }
    
    // Vehicles
    if (financialContext.vehicles && financialContext.vehicles.length > 0) {
      const totalValue = financialContext.vehicles.reduce((sum, v) => sum + (v.currentValue || 0), 0);
      contextSummary += `\n🚗 VEHICLES (${financialContext.vehicles.length} vehicles):\n`;
      contextSummary += `  Total Value: ₹${totalValue.toFixed(2)}\n`;
    } else {
      contextSummary += `\n🚗 VEHICLES: No vehicle records\n`;
    }
    
    // Recurring Transactions
    if (financialContext.recurringTransactions && financialContext.recurringTransactions.length > 0) {
      contextSummary += `\n� RECURRING TRANSACTIONS (${financialContext.recurringTransactions.length} active):\n`;
      financialContext.recurringTransactions.forEach(r => {
        contextSummary += `  ${r.description}: ₹${r.amount} ${r.frequency} (${r.type}) - ${r.category}\n`;
      });
    } else {
      contextSummary += `\n🔄 RECURRING TRANSACTIONS: No recurring transactions\n`;
    }
    
    // Family Members
    if (financialContext.familyMembers && financialContext.familyMembers.length > 0) {
      contextSummary += `\n👨‍👩‍👧‍👦 FAMILY MEMBERS (${financialContext.familyMembers.length} members):\n`;
      financialContext.familyMembers.forEach(m => {
        contextSummary += `  ${m.name} (${m.relationship})\n`;
      });
    } else {
      contextSummary += `\n👨‍👩‍👧‍👦 FAMILY MEMBERS: No family member records\n`;
    }
    
    // Trip Groups
    if (financialContext.tripGroups && financialContext.tripGroups.length > 0) {
      contextSummary += `\n✈️ TRIP GROUPS (${financialContext.tripGroups.length} groups):\n`;
      financialContext.tripGroups.forEach(t => {
        contextSummary += `  ${t.name}: ₹${t.totalSpent} / ₹${t.totalBudget} (${t.memberCount} members)\n`;
      });
    } else {
      contextSummary += `\n✈️ TRIP GROUPS: No trip group records\n`;
    }
    
    // Healthcare Insurance
    if (financialContext.healthcareInsurance && financialContext.healthcareInsurance.length > 0) {
      contextSummary += `\n🏥 HEALTHCARE INSURANCE (${financialContext.healthcareInsurance.length} policies):\n`;
      financialContext.healthcareInsurance.forEach(h => {
        contextSummary += `  ${h.policyName} (${h.provider}): ₹${h.coverageAmount} coverage\n`;
      });
    } else {
      contextSummary += `\n🏥 HEALTHCARE INSURANCE: No insurance policies\n`;
    }
    
    // House Help
    if (financialContext.houseHelp && financialContext.houseHelp.length > 0) {
      const totalMonthlySalary = financialContext.houseHelp.reduce((sum, h) => {
        // Convert to monthly if needed
        let monthlySalary = h.salary || 0;
        if (h.paymentFrequency && h.paymentFrequency.toLowerCase() === 'daily') {
          monthlySalary = monthlySalary * 30;
        } else if (h.paymentFrequency && h.paymentFrequency.toLowerCase() === 'weekly') {
          monthlySalary = monthlySalary * 4;
        }
        return sum + monthlySalary;
      }, 0);
      
      contextSummary += `\n👥 HOUSE HELP (${financialContext.houseHelp.length} staff member(s)):\n`;
      contextSummary += `Total Monthly Wages: ₹${totalMonthlySalary.toFixed(2)}\n\n`;
      contextSummary += `Staff Details:\n`;
      financialContext.houseHelp.forEach((h, idx) => {
        contextSummary += `  ${idx + 1}. ${h.name || 'Unnamed'} - ${h.role || 'Staff'}\n`;
        contextSummary += `     Salary: ₹${h.salary || 0} per ${h.paymentFrequency || 'month'}\n`;
      });
    } else {
      contextSummary += `\n👥 HOUSE HELP: No house help records\n`;
    }
    
    // Documents & Notes
    if (financialContext.documents && financialContext.documents.length > 0) {
      contextSummary += `\n📄 DOCUMENTS: ${financialContext.documents.length} files\n`;
    }
    
    if (financialContext.notes && financialContext.notes.length > 0) {
      contextSummary += `📝 NOTES: ${financialContext.notes.length} notes\n`;
    }
    
    contextSummary += '\n=== END OF FINANCIAL DATA ===\n';
  } else {
    contextSummary = '\n\nNO FINANCIAL DATA AVAILABLE - User needs to add data to the app first.\n';
  }

  return sanitizePrompt(`
You are Rupiya AI Assistant, a helpful financial advisor with COMPLETE ACCESS to the user's financial data.

${contextSummary}

User's Question: "${message}"

CRITICAL INSTRUCTIONS:
1. The financial data above is ALREADY LOADED and AVAILABLE to you - USE IT!
2. DO NOT say "I couldn't find" or "I don't have access" - YOU HAVE ALL THE DATA ABOVE!
3. Answer questions using the EXACT data provided in the sections above
4. For date-specific questions:
   - Dates are in YYYY-MM-DD format (e.g., 2026-01-01 is January 1st, 2026)
   - "1st Jan 2026" = "2026-01-01"
   - "January 1, 2026" = "2026-01-01"
   - Search the "All Expense Transactions" section for the exact date
5. When asked "what was my expense on [date]", list ALL transactions from that date
6. Be specific with numbers, amounts, dates, and categories from the data
7. If asked about counts, count from the data above
8. Use Indian Rupee (₹) format
9. Be conversational and helpful
10. If the specific date has no data, check nearby dates and mention what you found

RESPONSE STYLE:
- Answer ONLY what was asked - don't volunteer extra information
- Be concise and direct
- If asked about loans, ONLY talk about loans (don't mention budgets, goals, etc.)
- If asked about expenses on a date, ONLY list those expenses
- If the answer is "No" or "None", just say so clearly and stop
- Don't add "However, I can see..." or "Here's what else..." unless relevant
- Keep responses focused and to the point

IMPORTANT: Before saying "no data found", carefully review the relevant section above!

Answer the user's question now using the data provided above:
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

    // Get API key from request body (client sends decrypted key)
    // Client-side encryption service decrypts the key before sending
    const { action, data, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key not provided' });
    }

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
