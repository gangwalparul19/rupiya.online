// Smart Document Organization Service
// Provides auto-categorization, asset linking, and expiry tracking for documents

import firestoreService from './firestore-service.js';
import authService from './auth-service.js';

class SmartDocumentService {
  constructor() {
    // Document type patterns for auto-categorization
    this.documentPatterns = {
      'Tax': {
        keywords: ['tax', 'itr', 'form 16', 'form16', 'tds', 'gst', 'pan', 'aadhaar', 'income tax', '26as', 'challan'],
        filePatterns: ['itr', 'form16', 'tds', 'gst', 'pan', 'aadhaar']
      },
      'Insurance': {
        keywords: ['insurance', 'policy', 'premium', 'claim', 'health insurance', 'life insurance', 'motor insurance', 'vehicle insurance', 'term plan', 'mediclaim'],
        filePatterns: ['insurance', 'policy', 'premium']
      },
      'Property': {
        keywords: ['property', 'deed', 'registry', 'sale deed', 'agreement', 'rent agreement', 'lease', 'mortgage', 'encumbrance', 'khata', 'patta', 'mutation'],
        filePatterns: ['deed', 'registry', 'agreement', 'lease']
      },
      'Vehicle': {
        keywords: ['rc', 'registration', 'vehicle', 'car', 'bike', 'driving license', 'dl', 'puc', 'pollution', 'fitness', 'permit', 'challan'],
        filePatterns: ['rc', 'registration', 'license', 'puc']
      },
      'Investment': {
        keywords: ['investment', 'mutual fund', 'stock', 'share', 'demat', 'bond', 'fd', 'fixed deposit', 'ppf', 'nps', 'elss', 'sip', 'portfolio', 'dividend'],
        filePatterns: ['investment', 'mutual', 'stock', 'demat', 'bond']
      },
      'Loan': {
        keywords: ['loan', 'emi', 'sanction', 'disbursement', 'noc', 'foreclosure', 'prepayment', 'mortgage', 'home loan', 'car loan', 'personal loan'],
        filePatterns: ['loan', 'sanction', 'emi', 'noc']
      },
      'Personal': {
        keywords: ['passport', 'visa', 'birth certificate', 'marriage certificate', 'degree', 'marksheet', 'certificate', 'id card', 'voter id', 'ration card'],
        filePatterns: ['passport', 'visa', 'certificate', 'degree', 'marksheet']
      },
      'Warranty': {
        keywords: ['warranty', 'guarantee', 'invoice', 'receipt', 'bill', 'purchase'],
        filePatterns: ['warranty', 'invoice', 'receipt', 'bill']
      }
    };

    // Document types that typically have expiry dates
    this.expiryDocumentTypes = {
      'Insurance': { defaultValidityMonths: 12, reminderDays: 30 },
      'Vehicle': { defaultValidityMonths: 12, reminderDays: 30 },
      'Personal': { defaultValidityMonths: 120, reminderDays: 90 }, // Passport: 10 years
      'Warranty': { defaultValidityMonths: 24, reminderDays: 30 }
    };

    // Asset types for linking
    this.assetTypes = ['vehicle', 'house', 'loan', 'investment'];
  }

  /**
   * Auto-suggest category based on document name and description
   * @param {string} name - Document name
   * @param {string} description - Document description
   * @param {string} fileName - Original file name
   * @returns {Object} - Suggested category with confidence
   */
  suggestCategory(name, description = '', fileName = '') {
    const searchText = `${name} ${description} ${fileName}`.toLowerCase();
    const scores = {};

    // Calculate scores for each category
    for (const [category, patterns] of Object.entries(this.documentPatterns)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of patterns.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          score += keyword.split(' ').length; // Multi-word matches score higher
        }
      }
      
      // Check file patterns
      for (const pattern of patterns.filePatterns) {
        if (searchText.includes(pattern.toLowerCase())) {
          score += 2; // File pattern matches are strong indicators
        }
      }
      
      if (score > 0) {
        scores[category] = score;
      }
    }

    // Find best match
    const sortedCategories = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
      return { category: 'Other', confidence: 0, suggestions: [] };
    }

    const topScore = sortedCategories[0][1];
    const confidence = Math.min(1, topScore / 5); // Normalize confidence

    return {
      category: sortedCategories[0][0],
      confidence: confidence,
      suggestions: sortedCategories.slice(0, 3).map(([cat, score]) => ({
        category: cat,
        score: score
      }))
    };
  }

  /**
   * Get linkable assets for a document category
   * @param {string} category - Document category
   * @returns {Promise<Array>} - List of assets that can be linked
   */
  async getLinkableAssets(category) {
    const assets = [];
    const userId = authService.getCurrentUser()?.uid;
    if (!userId) return assets;

    try {
      switch (category) {
        case 'Vehicle':
          const vehicles = await firestoreService.getAll('vehicles', 'createdAt', 'desc');
          assets.push(...vehicles.map(v => ({
            type: 'vehicle',
            id: v.id,
            name: `${v.make} ${v.model} (${v.registrationNumber || 'No Reg'})`,
            icon: v.type === 'car' ? '🚗' : v.type === 'bike' ? '🏍️' : '🚐'
          })));
          break;

        case 'Property':
        case 'Insurance':
          const houses = await firestoreService.getAll('houses', 'createdAt', 'desc');
          assets.push(...houses.map(h => ({
            type: 'house',
            id: h.id,
            name: h.name || h.address,
            icon: h.type === 'apartment' ? '🏢' : '🏠'
          })));
          
          // Also include vehicles for insurance
          if (category === 'Insurance') {
            const vehiclesForInsurance = await firestoreService.getAll('vehicles', 'createdAt', 'desc');
            assets.push(...vehiclesForInsurance.map(v => ({
              type: 'vehicle',
              id: v.id,
              name: `${v.make} ${v.model} (${v.registrationNumber || 'No Reg'})`,
              icon: v.type === 'car' ? '🚗' : v.type === 'bike' ? '🏍️' : '🚐'
            })));
          }
          break;

        case 'Loan':
          const loans = await firestoreService.getAll('loans', 'createdAt', 'desc');
          assets.push(...loans.map(l => ({
            type: 'loan',
            id: l.id,
            name: `${l.name} - ₹${l.principalAmount?.toLocaleString('en-IN') || 0}`,
            icon: '🏦'
          })));
          break;

        case 'Investment':
          const investments = await firestoreService.getAll('investments', 'createdAt', 'desc');
          assets.push(...investments.map(i => ({
            type: 'investment',
            id: i.id,
            name: `${i.name} (${i.type})`,
            icon: i.type === 'stock' ? '📈' : i.type === 'mutual_fund' ? '📊' : '💰'
          })));
          break;
      }
    } catch (error) {
      console.error('Error fetching linkable assets:', error);
    }

    return assets;
  }

  /**
   * Link a document to an asset
   * @param {string} documentId - Document ID
   * @param {string} assetType - Type of asset (vehicle, house, loan, investment)
   * @param {string} assetId - Asset ID
   * @returns {Promise<Object>} - Result
   */
  async linkDocumentToAsset(documentId, assetType, assetId) {
    try {
      const result = await firestoreService.update('documents', documentId, {
        linkedAssetType: assetType,
        linkedAssetId: assetId,
        updatedAt: new Date()
      });

      return result;
    } catch (error) {
      console.error('Error linking document to asset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlink a document from an asset
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} - Result
   */
  async unlinkDocument(documentId) {
    try {
      const result = await firestoreService.update('documents', documentId, {
        linkedAssetType: null,
        linkedAssetId: null,
        updatedAt: new Date()
      });

      return result;
    } catch (error) {
      console.error('Error unlinking document:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get documents linked to a specific asset
   * @param {string} assetType - Type of asset
   * @param {string} assetId - Asset ID
   * @returns {Promise<Array>} - List of linked documents
   */
  async getDocumentsForAsset(assetType, assetId) {
    try {
      const allDocuments = await firestoreService.getAll('documents', 'createdAt', 'desc');
      return allDocuments.filter(doc => 
        doc.linkedAssetType === assetType && doc.linkedAssetId === assetId
      );
    } catch (error) {
      console.error('Error fetching documents for asset:', error);
      return [];
    }
  }

  /**
   * Set expiry date for a document
   * @param {string} documentId - Document ID
   * @param {Date} expiryDate - Expiry date
   * @param {number} reminderDays - Days before expiry to remind
   * @returns {Promise<Object>} - Result
   */
  async setDocumentExpiry(documentId, expiryDate, reminderDays = 30) {
    try {
      const reminderDate = new Date(expiryDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);

      const result = await firestoreService.update('documents', documentId, {
        expiryDate: expiryDate,
        reminderDate: reminderDate,
        reminderDays: reminderDays,
        updatedAt: new Date()
      });

      return result;
    } catch (error) {
      console.error('Error setting document expiry:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get documents expiring soon
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} - List of expiring documents
   */
  async getExpiringDocuments(daysAhead = 30) {
    try {
      const allDocuments = await firestoreService.getAll('documents', 'expiryDate', 'asc');
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      return allDocuments.filter(doc => {
        if (!doc.expiryDate) return false;
        const expiry = doc.expiryDate.toDate ? doc.expiryDate.toDate() : new Date(doc.expiryDate);
        return expiry >= now && expiry <= futureDate;
      }).map(doc => ({
        ...doc,
        daysUntilExpiry: Math.ceil((new Date(doc.expiryDate.toDate ? doc.expiryDate.toDate() : doc.expiryDate) - now) / (1000 * 60 * 60 * 24)),
        isExpired: new Date(doc.expiryDate.toDate ? doc.expiryDate.toDate() : doc.expiryDate) < now
      }));
    } catch (error) {
      console.error('Error fetching expiring documents:', error);
      return [];
    }
  }

  /**
   * Get expired documents
   * @returns {Promise<Array>} - List of expired documents
   */
  async getExpiredDocuments() {
    try {
      const allDocuments = await firestoreService.getAll('documents', 'expiryDate', 'asc');
      const now = new Date();

      return allDocuments.filter(doc => {
        if (!doc.expiryDate) return false;
        const expiry = doc.expiryDate.toDate ? doc.expiryDate.toDate() : new Date(doc.expiryDate);
        return expiry < now;
      }).map(doc => ({
        ...doc,
        daysSinceExpiry: Math.ceil((now - new Date(doc.expiryDate.toDate ? doc.expiryDate.toDate() : doc.expiryDate)) / (1000 * 60 * 60 * 24))
      }));
    } catch (error) {
      console.error('Error fetching expired documents:', error);
      return [];
    }
  }

  /**
   * Get document statistics
   * @returns {Promise<Object>} - Document statistics
   */
  async getDocumentStats() {
    try {
      const allDocuments = await firestoreService.getAll('documents', 'createdAt', 'desc');
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const stats = {
        total: allDocuments.length,
        byCategory: {},
        linkedCount: 0,
        withExpiry: 0,
        expiringSoon: 0,
        expired: 0,
        totalSize: 0
      };

      allDocuments.forEach(doc => {
        // Count by category
        const category = doc.category || 'Other';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // Count linked documents
        if (doc.linkedAssetId) {
          stats.linkedCount++;
        }

        // Count documents with expiry
        if (doc.expiryDate) {
          stats.withExpiry++;
          const expiry = doc.expiryDate.toDate ? doc.expiryDate.toDate() : new Date(doc.expiryDate);
          
          if (expiry < now) {
            stats.expired++;
          } else if (expiry <= thirtyDaysFromNow) {
            stats.expiringSoon++;
          }
        }

        // Sum file sizes
        if (doc.fileSize) {
          stats.totalSize += doc.fileSize;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching document stats:', error);
      return null;
    }
  }

  /**
   * Suggest expiry date based on document type
   * @param {string} category - Document category
   * @param {Date} documentDate - Document date
   * @returns {Object} - Suggested expiry info
   */
  suggestExpiryDate(category, documentDate = new Date()) {
    const expiryInfo = this.expiryDocumentTypes[category];
    
    if (!expiryInfo) {
      return { hasExpiry: false };
    }

    const suggestedExpiry = new Date(documentDate);
    suggestedExpiry.setMonth(suggestedExpiry.getMonth() + expiryInfo.defaultValidityMonths);

    return {
      hasExpiry: true,
      suggestedExpiryDate: suggestedExpiry,
      defaultReminderDays: expiryInfo.reminderDays,
      validityMonths: expiryInfo.defaultValidityMonths
    };
  }
}

// Export singleton instance
const smartDocumentService = new SmartDocumentService();
export default smartDocumentService;
