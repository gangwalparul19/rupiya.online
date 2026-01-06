// Smart Categorization Service
// ML-based expense categorization using pattern matching and user learning
// Implements: Category suggestions, pattern learning, auto-categorization

import firestoreService from './firestore-service.js';
import authService from './auth-service.js';
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class SmartCategorizationService {
  constructor() {
    // Default keyword mappings for categories
    this.defaultKeywords = {
      // Expense categories
      'Groceries': ['grocery', 'supermarket', 'vegetables', 'fruits', 'milk', 'bread', 'rice', 'dmart', 'bigbasket', 'grofers', 'blinkit', 'zepto', 'instamart', 'reliance fresh', 'more', 'spencer'],
      'Transportation': ['uber', 'ola', 'rapido', 'auto', 'taxi', 'cab', 'metro', 'bus', 'train', 'railway', 'irctc', 'redbus', 'makemytrip'],
      'Vehicle Fuel': ['petrol', 'diesel', 'fuel', 'gas station', 'hp', 'indian oil', 'bharat petroleum', 'shell', 'cng'],
      'Vehicle Maintenance': ['service', 'repair', 'mechanic', 'tyre', 'tire', 'oil change', 'car wash', 'bike service'],
      'Dining': ['restaurant', 'cafe', 'coffee', 'zomato', 'swiggy', 'food', 'lunch', 'dinner', 'breakfast', 'dominos', 'pizza', 'burger', 'mcdonalds', 'kfc', 'starbucks', 'ccd'],
      'Entertainment': ['movie', 'cinema', 'pvr', 'inox', 'netflix', 'amazon prime', 'hotstar', 'spotify', 'game', 'concert', 'event', 'bookmyshow'],
      'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'clothes', 'shoes', 'electronics', 'mobile', 'laptop', 'gadget', 'mall', 'shopping'],
      'Healthcare': ['hospital', 'doctor', 'medicine', 'pharmacy', 'medical', 'clinic', 'apollo', 'fortis', 'medplus', '1mg', 'pharmeasy', 'netmeds', 'health'],
      'Bills & Utilities': ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'jio', 'airtel', 'vi', 'bsnl', 'mobile recharge', 'dth', 'tata sky'],
      'Rent': ['rent', 'house rent', 'flat rent', 'pg', 'hostel'],
      'Insurance': ['insurance', 'lic', 'hdfc life', 'icici prudential', 'policy', 'premium', 'health insurance', 'car insurance', 'bike insurance'],
      'Education': ['school', 'college', 'tuition', 'course', 'udemy', 'coursera', 'books', 'stationery', 'fees'],
      'Personal Care': ['salon', 'haircut', 'spa', 'beauty', 'cosmetics', 'grooming', 'parlour'],
      'Subscriptions': ['subscription', 'membership', 'gym', 'fitness', 'club'],
      'EMI Payment': ['emi', 'loan', 'installment', 'bajaj', 'hdfc', 'icici', 'sbi'],
      'House Help': ['maid', 'cook', 'driver', 'watchman', 'security', 'helper', 'domestic'],
      'House Maintenance': ['plumber', 'electrician', 'carpenter', 'painter', 'repair', 'maintenance', 'ac service', 'pest control'],
      'Gifts & Donations': ['gift', 'donation', 'charity', 'present', 'birthday', 'anniversary'],
      'Travel': ['flight', 'hotel', 'booking', 'trip', 'vacation', 'holiday', 'oyo', 'goibibo', 'cleartrip', 'yatra'],
      'Taxes': ['tax', 'gst', 'income tax', 'property tax', 'road tax'],
      'Other': []
    };

    // Income categories
    this.incomeKeywords = {
      'Salary': ['salary', 'payroll', 'wages', 'monthly pay', 'ctc'],
      'Freelance': ['freelance', 'project', 'contract', 'consulting', 'gig'],
      'Business': ['business', 'profit', 'revenue', 'sales', 'client payment'],
      'Investments': ['dividend', 'interest', 'returns', 'capital gains', 'mutual fund'],
      'Rental': ['rent received', 'rental income', 'tenant', 'lease'],
      'Interest': ['fd interest', 'savings interest', 'bank interest', 'rd interest'],
      'Dividends': ['dividend', 'stock dividend', 'mf dividend'],
      'Bonus': ['bonus', 'incentive', 'performance bonus', 'annual bonus'],
      'Refunds': ['refund', 'cashback', 'reimbursement', 'return'],
      'Gifts': ['gift received', 'money received', 'transfer received'],
      'Other': []
    };

    // User-specific patterns cache
    this.userPatterns = null;
    this.patternsLoaded = false;
  }

  /**
   * Get category suggestion for a description
   */
  async suggestCategory(description, type = 'expense') {
    if (!description || description.trim().length === 0) {
      return { category: null, confidence: 0, suggestions: [] };
    }

    const normalizedDesc = description.toLowerCase().trim();
    
    // Load user patterns if not loaded
    await this.loadUserPatterns();

    // First, check user-specific patterns (highest priority)
    const userMatch = this.matchUserPatterns(normalizedDesc, type);
    if (userMatch.confidence >= 0.8) {
      return userMatch;
    }

    // Then check default keywords
    const defaultMatch = this.matchDefaultKeywords(normalizedDesc, type);
    
    // Combine results
    const suggestions = this.combineAndRankSuggestions(userMatch, defaultMatch);
    
    return {
      category: suggestions[0]?.category || null,
      confidence: suggestions[0]?.confidence || 0,
      suggestions: suggestions.slice(0, 5)
    };
  }

  /**
   * Match against user-specific patterns
   */
  matchUserPatterns(description, type) {
    if (!this.userPatterns || !this.userPatterns[type]) {
      return { category: null, confidence: 0, suggestions: [] };
    }

    const patterns = this.userPatterns[type];
    const matches = [];

    for (const [category, data] of Object.entries(patterns)) {
      if (!data.keywords || data.keywords.length === 0) continue;

      let matchScore = 0;
      let matchCount = 0;

      for (const keyword of data.keywords) {
        if (description.includes(keyword.toLowerCase())) {
          // Weight by frequency
          const weight = data.frequency?.[keyword] || 1;
          matchScore += weight;
          matchCount++;
        }
      }

      if (matchCount > 0) {
        // Normalize score based on total usage
        const totalUsage = data.totalUsage || 1;
        const confidence = Math.min(0.95, (matchScore / totalUsage) * 0.5 + (matchCount / data.keywords.length) * 0.5);
        
        matches.push({
          category,
          confidence,
          source: 'user_pattern',
          matchCount
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      category: matches[0]?.category || null,
      confidence: matches[0]?.confidence || 0,
      suggestions: matches
    };
  }

  /**
   * Match against default keywords
   */
  matchDefaultKeywords(description, type) {
    const keywords = type === 'expense' ? this.defaultKeywords : this.incomeKeywords;
    const matches = [];

    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      if (!categoryKeywords || categoryKeywords.length === 0) continue;

      let matchCount = 0;
      let totalWeight = 0;

      for (const keyword of categoryKeywords) {
        if (description.includes(keyword.toLowerCase())) {
          matchCount++;
          // Longer keywords get higher weight
          totalWeight += keyword.length / 10;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(0.85, (matchCount / categoryKeywords.length) * 0.4 + totalWeight * 0.3 + 0.3);
        
        matches.push({
          category,
          confidence,
          source: 'default',
          matchCount
        });
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      category: matches[0]?.category || null,
      confidence: matches[0]?.confidence || 0,
      suggestions: matches
    };
  }

  /**
   * Combine and rank suggestions from different sources
   */
  combineAndRankSuggestions(userMatch, defaultMatch) {
    const combined = new Map();

    // Add user matches with higher weight
    for (const suggestion of (userMatch.suggestions || [])) {
      combined.set(suggestion.category, {
        ...suggestion,
        confidence: suggestion.confidence * 1.2 // Boost user patterns
      });
    }

    // Add default matches
    for (const suggestion of (defaultMatch.suggestions || [])) {
      if (combined.has(suggestion.category)) {
        // Combine confidences
        const existing = combined.get(suggestion.category);
        existing.confidence = Math.min(0.98, existing.confidence + suggestion.confidence * 0.3);
      } else {
        combined.set(suggestion.category, suggestion);
      }
    }

    // Convert to array and sort
    const suggestions = Array.from(combined.values());
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions;
  }

  /**
   * Load user-specific patterns from Firestore
   */
  async loadUserPatterns() {
    if (this.patternsLoaded) return;

    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const docRef = doc(db, 'userCategorizationPatterns', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.userPatterns = docSnap.data();
      } else {
        this.userPatterns = { expense: {}, income: {} };
      }

      this.patternsLoaded = true;
    } catch (error) {
      console.error('Error loading user patterns:', error);
      this.userPatterns = { expense: {}, income: {} };
    }
  }

  /**
   * Learn from user's categorization choice
   */
  async learnFromCategorization(description, category, type = 'expense') {
    if (!description || !category) return;

    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      // Extract keywords from description
      const keywords = this.extractKeywords(description);
      if (keywords.length === 0) return;

      // Load current patterns
      await this.loadUserPatterns();

      // Initialize category if not exists
      if (!this.userPatterns[type]) {
        this.userPatterns[type] = {};
      }
      if (!this.userPatterns[type][category]) {
        this.userPatterns[type][category] = {
          keywords: [],
          frequency: {},
          totalUsage: 0
        };
      }

      const categoryData = this.userPatterns[type][category];

      // Add new keywords and update frequency
      for (const keyword of keywords) {
        if (!categoryData.keywords.includes(keyword)) {
          categoryData.keywords.push(keyword);
        }
        categoryData.frequency[keyword] = (categoryData.frequency[keyword] || 0) + 1;
      }

      categoryData.totalUsage++;

      // Limit keywords to prevent bloat (keep top 50 by frequency)
      if (categoryData.keywords.length > 50) {
        const sortedKeywords = categoryData.keywords.sort(
          (a, b) => (categoryData.frequency[b] || 0) - (categoryData.frequency[a] || 0)
        );
        categoryData.keywords = sortedKeywords.slice(0, 50);
      }

      // Save to Firestore
      const docRef = doc(db, 'userCategorizationPatterns', user.uid);
      await setDoc(docRef, {
        ...this.userPatterns,
        updatedAt: Timestamp.now()
      }, { merge: true });

    } catch (error) {
      console.error('Error learning from categorization:', error);
    }
  }

  /**
   * Extract meaningful keywords from description
   */
  extractKeywords(description) {
    if (!description) return [];

    // Normalize
    const normalized = description.toLowerCase().trim();

    // Remove common stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'payment', 'paid', 'pay', 'amount', 'rs', 'inr', 'rupees'];

    // Split into words
    const words = normalized.split(/[\s,.\-_\/\\()[\]{}:;'"!?@#$%^&*+=<>|~`]+/);

    // Filter and extract keywords
    const keywords = words.filter(word => {
      return word.length >= 3 && 
             !stopWords.includes(word) && 
             !/^\d+$/.test(word); // Exclude pure numbers
    });

    // Also extract multi-word phrases (bigrams)
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i].length >= 2 && words[i + 1].length >= 2) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (!stopWords.includes(words[i]) && !stopWords.includes(words[i + 1])) {
          bigrams.push(bigram);
        }
      }
    }

    return [...new Set([...keywords, ...bigrams])];
  }

  /**
   * Get all categories for a type
   */
  getCategories(type = 'expense') {
    if (type === 'expense') {
      return Object.keys(this.defaultKeywords);
    } else {
      return Object.keys(this.incomeKeywords);
    }
  }

  /**
   * Reset user patterns (for testing or user request)
   */
  async resetUserPatterns() {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const docRef = doc(db, 'userCategorizationPatterns', user.uid);
      await setDoc(docRef, {
        expense: {},
        income: {},
        updatedAt: Timestamp.now()
      });

      this.userPatterns = { expense: {}, income: {} };
      this.patternsLoaded = true;

      return { success: true };
    } catch (error) {
      console.error('Error resetting patterns:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's categorization statistics
   */
  async getCategorizationStats() {
    await this.loadUserPatterns();

    const stats = {
      expense: {},
      income: {},
      totalPatterns: 0,
      topCategories: []
    };

    for (const type of ['expense', 'income']) {
      if (!this.userPatterns[type]) continue;

      for (const [category, data] of Object.entries(this.userPatterns[type])) {
        stats[type][category] = {
          keywordCount: data.keywords?.length || 0,
          totalUsage: data.totalUsage || 0
        };
        stats.totalPatterns += data.keywords?.length || 0;
      }
    }

    // Get top categories by usage
    const allCategories = [
      ...Object.entries(stats.expense).map(([cat, data]) => ({ category: cat, type: 'expense', ...data })),
      ...Object.entries(stats.income).map(([cat, data]) => ({ category: cat, type: 'income', ...data }))
    ];

    stats.topCategories = allCategories
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, 10);

    return stats;
  }

  /**
   * Invalidate cache to force reload
   */
  invalidateCache() {
    this.patternsLoaded = false;
    this.userPatterns = null;
  }
}

const smartCategorizationService = new SmartCategorizationService();
export default smartCategorizationService;
