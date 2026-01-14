// Payment Methods Service
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';
import firestoreService from './firestore-service.js';

class PaymentMethodsService {
  constructor() {
    this.collectionName = 'paymentMethods';
    
    // Payment method types
    this.types = {
      CASH: 'cash',
      CARD: 'card',
      UPI: 'upi',
      WALLET: 'wallet',
      BANK: 'bank'
    };
    
    // Default payment methods
    this.defaultMethods = [
      { type: 'cash', name: 'Cash', isDefault: true }
    ];
  }

  // Get user ID
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  /**
   * Get all payment methods for current user
   */
  async getPaymentMethods() {
    try {
      const userId = this.getUserId();
      console.log('[PaymentMethodsService] Getting payment methods for user:', userId);
      
      // Use firestoreService to get all payment methods (handles decryption)
      const allMethods = await firestoreService.getAll(this.collectionName);
      console.log('[PaymentMethodsService] Retrieved all methods:', allMethods.length);
      
      // Filter by userId and active status
      const methods = allMethods.filter(method => 
        method.userId === userId && method.isActive !== false
      );
      console.log('[PaymentMethodsService] Filtered methods for user:', methods.length);
      
      // Log first method for debugging
      if (methods.length > 0) {
        console.log('[PaymentMethodsService] First method sample:', {
          id: methods[0].id,
          name: methods[0].name,
          type: methods[0].type,
          hasEncrypted: !!methods[0]._encrypted,
          hasEncryptionVersion: !!methods[0]._encryptionVersion
        });
      }
      
      // Sort by createdAt
      methods.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return aTime - bTime;
      });
      
      // If no methods exist, create default cash method
      if (methods.length === 0) {
        await this.initializeDefaultMethods();
        return await this.getPaymentMethods();
      }
      
      return methods;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  }

  /**
   * Initialize default payment methods for new user
   */
  async initializeDefaultMethods() {
    try {
      const userId = this.getUserId();
      
      for (const method of this.defaultMethods) {
        const data = {
          ...method,
          userId,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        // Use firestoreService to handle encryption
        await firestoreService.add(this.collectionName, data);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing default methods:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment methods by type
   */
  async getPaymentMethodsByType(type) {
    try {
      const allMethods = await this.getPaymentMethods();
      return allMethods.filter(method => method.type === type && method.isActive);
    } catch (error) {
      console.error('Error getting payment methods by type:', error);
      return [];
    }
  }

  /**
   * Add a new payment method
   */
  async addPaymentMethod(methodData) {
    try {
      const userId = this.getUserId();
      
      // Validate required fields
      if (!methodData.type || !methodData.name) {
        return { success: false, error: 'Type and name are required' };
      }
      
      // Prepare data based on type
      const data = {
        type: methodData.type,
        name: methodData.name,
        userId,
        isActive: true,
        isDefault: methodData.isDefault || false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Add type-specific fields
      // SECURITY: Only store last 4 digits of sensitive numbers
      switch (methodData.type) {
        case this.types.CARD:
          // Only store last 4 digits of card number for security
          data.cardNumber = methodData.cardNumber ? methodData.cardNumber.slice(-4) : '';
          data.cardType = methodData.cardType || 'credit'; // credit, debit
          data.bankName = methodData.bankName || '';
          break;
          
        case this.types.UPI:
          data.upiId = methodData.upiId || '';
          data.provider = methodData.provider || ''; // gpay, phonepe, paytm, etc.
          break;
          
        case this.types.WALLET:
          data.walletProvider = methodData.walletProvider || ''; // paytm, phonepe, amazon, etc.
          // Only store last 4 digits of wallet number
          data.walletNumber = methodData.walletNumber ? methodData.walletNumber.slice(-4) : '';
          break;
          
        case this.types.BANK:
          // Only store last 4 digits of account number for security
          data.bankAccountNumber = methodData.accountNumber ? methodData.accountNumber.slice(-4) : '';
          data.bankName = methodData.bankName || '';
          // Don't store full IFSC, just for reference
          data.ifscCode = methodData.ifscCode || '';
          data.accountType = methodData.accountType || 'savings'; // savings, current
          break;
      }
      
      // Use firestoreService to handle encryption
      const result = await firestoreService.add(this.collectionName, data);
      
      // If this is a credit card, also create an entry in creditCards collection
      if (result.success && methodData.type === this.types.CARD && methodData.cardType === 'credit') {
        await this.createCreditCardEntry(methodData, userId, result.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error adding payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a credit card entry in creditCards collection when a credit card payment method is added
   */
  async createCreditCardEntry(methodData, userId, paymentMethodId) {
    try {
      const creditCardData = {
        userId,
        paymentMethodId, // Link to the payment method
        cardName: methodData.name,
        bankName: methodData.bankName || '',
        cardType: 'credit',
        lastFourDigits: methodData.cardNumber ? methodData.cardNumber.slice(-4) : '',
        creditLimit: methodData.creditLimit || 0,
        currentBalance: 0, // Start with 0 balance
        billingDate: methodData.billingDate || 1,
        dueDate: methodData.dueDate || 15,
        rewardsProgram: methodData.rewardsProgram || '',
        rewardsBalance: 0,
        annualFee: methodData.annualFee || 0,
        notes: methodData.notes || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const result = await firestoreService.add('creditCards', creditCardData);
      
      if (result.success) {
        console.log('[PaymentMethodsService] Credit card entry created successfully:', result.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating credit card entry:', error);
      // Don't throw error - payment method was already created successfully
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(methodId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      // Use firestoreService to handle encryption
      const result = await firestoreService.update(this.collectionName, methodId, updateData);
      
      return result;
    } catch (error) {
      console.error('Error updating payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a payment method (soft delete - mark as inactive)
   */
  async deletePaymentMethod(methodId) {
    try {
      // Soft delete - mark as inactive
      const result = await firestoreService.update(this.collectionName, methodId, {
        isActive: false,
        updatedAt: Timestamp.now()
      });
      
      return result;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Permanently delete a payment method
   */
  async permanentlyDeletePaymentMethod(methodId) {
    try {
      const result = await firestoreService.delete(this.collectionName, methodId);
      return result;
    } catch (error) {
      console.error('Error permanently deleting payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(methodId) {
    try {
      const userId = this.getUserId();
      
      // First, unset all defaults
      const allMethods = await this.getPaymentMethods();
      for (const method of allMethods) {
        if (method.isDefault) {
          await this.updatePaymentMethod(method.id, { isDefault: false });
        }
      }
      
      // Set the new default
      await this.updatePaymentMethod(methodId, { isDefault: true });
      
      return { success: true };
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default payment method
   */
  async getDefaultPaymentMethod() {
    try {
      const methods = await this.getPaymentMethods();
      return methods.find(method => method.isDefault) || methods[0] || null;
    } catch (error) {
      console.error('Error getting default payment method:', error);
      return null;
    }
  }

  /**
   * Get payment method by ID
   */
  async getPaymentMethod(methodId) {
    try {
      // Use firestoreService to get payment method (handles decryption)
      const result = await firestoreService.get(this.collectionName, methodId);
      return result;
    } catch (error) {
      console.error('Error getting payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format card number for display (mask middle digits)
   */
  formatCardNumber(cardNumber) {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return cardNumber;
    
    const last4 = cleaned.slice(-4);
    return `**** **** **** ${last4}`;
  }

  /**
   * Format UPI ID for display
   */
  formatUpiId(upiId) {
    if (!upiId) return '';
    return upiId;
  }

  /**
   * Format account number for display (mask middle digits)
   */
  formatAccountNumber(accountNumber) {
    if (!accountNumber) return '';
    const cleaned = accountNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return accountNumber;
    
    const last4 = cleaned.slice(-4);
    return `****${last4}`;
  }

  /**
   * Get payment method icon/emoji (fallback)
   */
  getPaymentMethodIcon(type) {
    const icons = {
      cash: '💵',
      card: '💳',
      upi: '📱',
      wallet: '👛',
      bank: '🏦'
    };
    return icons[type] || '💰';
  }

  /**
   * Get brand-specific SVG icon for payment method
   * Returns small inline SVG logos for cards (Visa, Mastercard), UPI providers, wallets
   */
  getPaymentMethodBrandIcon(method) {
    if (!method) return this.getPaymentMethodIcon('cash');
    
    const iconSize = 28; // Small icon size
    
    // Credit Card icons (premium gold/blue look)
    const creditCardIcons = {
      visa: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#1A1F71"/>
        <rect x="4" y="8" width="40" height="6" fill="#FFD700"/>
        <path d="M19.5 31L21.5 17H25L23 31H19.5Z" fill="white"/>
        <path d="M33.5 17.3C32.7 17 31.5 16.7 30 16.7C26.5 16.7 24 18.5 24 21.1C24 23 25.7 24 27 24.7C28.3 25.4 28.8 25.9 28.8 26.5C28.8 27.4 27.7 27.8 26.7 27.8C25.3 27.8 24.5 27.6 23.3 27.1L22.8 26.9L22.3 30.1C23.2 30.5 24.8 30.8 26.5 30.8C30.2 30.8 32.6 29 32.6 26.2C32.6 24.7 31.7 23.5 29.7 22.6C28.5 22 27.8 21.6 27.8 20.9C27.8 20.3 28.5 19.7 30 19.7C31.2 19.7 32.1 19.9 32.8 20.2L33.2 20.4L33.5 17.3Z" fill="white"/>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#FFD700" text-anchor="middle">CREDIT</text>
      </svg>`,
      mastercard: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#1A1A2E"/>
        <rect x="4" y="8" width="40" height="6" fill="#FFD700"/>
        <circle cx="19" cy="24" r="8" fill="#EB001B"/>
        <circle cx="29" cy="24" r="8" fill="#F79E1B"/>
        <path d="M24 17.5C25.8 19 27 21.3 27 24C27 26.7 25.8 29 24 30.5C22.2 29 21 26.7 21 24C21 21.3 22.2 19 24 17.5Z" fill="#FF5F00"/>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#FFD700" text-anchor="middle">CREDIT</text>
      </svg>`,
      rupay: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#097A44"/>
        <rect x="4" y="8" width="40" height="6" fill="#FFD700"/>
        <text x="24" y="26" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">RuPay</text>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#FFD700" text-anchor="middle">CREDIT</text>
      </svg>`,
      generic: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#1A1F71"/>
        <rect x="4" y="8" width="40" height="6" fill="#FFD700"/>
        <rect x="8" y="18" width="12" height="8" rx="1" fill="#FFD700"/>
        <rect x="8" y="30" width="20" height="3" rx="1" fill="white" opacity="0.5"/>
        <rect x="8" y="35" width="14" height="3" rx="1" fill="white" opacity="0.5"/>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#FFD700" text-anchor="middle">CREDIT</text>
      </svg>`
    };
    
    // Debit Card icons (green/teal look)
    const debitCardIcons = {
      visa: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#00695C"/>
        <rect x="4" y="8" width="40" height="6" fill="#4DB6AC"/>
        <path d="M19.5 31L21.5 17H25L23 31H19.5Z" fill="white"/>
        <path d="M33.5 17.3C32.7 17 31.5 16.7 30 16.7C26.5 16.7 24 18.5 24 21.1C24 23 25.7 24 27 24.7C28.3 25.4 28.8 25.9 28.8 26.5C28.8 27.4 27.7 27.8 26.7 27.8C25.3 27.8 24.5 27.6 23.3 27.1L22.8 26.9L22.3 30.1C23.2 30.5 24.8 30.8 26.5 30.8C30.2 30.8 32.6 29 32.6 26.2C32.6 24.7 31.7 23.5 29.7 22.6C28.5 22 27.8 21.6 27.8 20.9C27.8 20.3 28.5 19.7 30 19.7C31.2 19.7 32.1 19.9 32.8 20.2L33.2 20.4L33.5 17.3Z" fill="white"/>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#4DB6AC" text-anchor="middle">DEBIT</text>
      </svg>`,
      mastercard: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#00695C"/>
        <rect x="4" y="8" width="40" height="6" fill="#4DB6AC"/>
        <circle cx="19" cy="24" r="8" fill="#EB001B"/>
        <circle cx="29" cy="24" r="8" fill="#F79E1B"/>
        <path d="M24 17.5C25.8 19 27 21.3 27 24C27 26.7 25.8 29 24 30.5C22.2 29 21 26.7 21 24C21 21.3 22.2 19 24 17.5Z" fill="#FF5F00"/>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#4DB6AC" text-anchor="middle">DEBIT</text>
      </svg>`,
      rupay: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#00695C"/>
        <rect x="4" y="8" width="40" height="6" fill="#4DB6AC"/>
        <text x="24" y="26" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">RuPay</text>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#4DB6AC" text-anchor="middle">DEBIT</text>
      </svg>`,
      generic: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#00695C"/>
        <rect x="4" y="8" width="40" height="6" fill="#4DB6AC"/>
        <rect x="8" y="18" width="12" height="8" rx="1" fill="#4DB6AC"/>
        <rect x="8" y="30" width="20" height="3" rx="1" fill="white" opacity="0.5"/>
        <rect x="8" y="35" width="14" height="3" rx="1" fill="white" opacity="0.5"/>
        <text x="24" y="44" font-family="Arial, sans-serif" font-size="6" fill="#4DB6AC" text-anchor="middle">DEBIT</text>
      </svg>`
    };
    
    // UPI provider icons
    const upiIcons = {
      gpay: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#fff" stroke="#e0e0e0"/>
        <path d="M24 10L34 16V32L24 38L14 32V16L24 10Z" fill="#4285F4"/>
        <path d="M24 10L34 16V24L24 30L14 24V16L24 10Z" fill="#34A853"/>
        <path d="M24 18L29 21V27L24 30L19 27V21L24 18Z" fill="#FBBC05"/>
        <path d="M24 18L29 21V24L24 27L19 24V21L24 18Z" fill="#EA4335"/>
      </svg>`,
      phonepe: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#5F259F"/>
        <path d="M24 12C17.4 12 12 17.4 12 24C12 30.6 17.4 36 24 36C30.6 36 36 30.6 36 24C36 17.4 30.6 12 24 12ZM28 28C28 29.1 27.1 30 26 30H20V18H26C27.1 18 28 18.9 28 20V28ZM24 22H22V26H24C25.1 26 26 25.1 26 24C26 22.9 25.1 22 24 22Z" fill="white"/>
      </svg>`,
      paytm: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#00BAF2"/>
        <text x="24" y="28" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">Paytm</text>
      </svg>`,
      bhim: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#00796B"/>
        <text x="24" y="28" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">BHIM</text>
      </svg>`,
      amazonpay: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#FF9900"/>
        <path d="M14 28C14 28 20 32 28 28" stroke="#232F3E" stroke-width="2" stroke-linecap="round"/>
        <path d="M30 26L32 28L30 30" stroke="#232F3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="24" y="22" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#232F3E" text-anchor="middle">amazon</text>
      </svg>`
    };
    
    // Wallet provider icons
    const walletIcons = {
      paytm: upiIcons.paytm,
      phonepe: upiIcons.phonepe,
      amazonpay: upiIcons.amazonpay,
      mobikwik: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#2196F3"/>
        <text x="24" y="26" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="white" text-anchor="middle">Mobi</text>
        <text x="24" y="34" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="white" text-anchor="middle">Kwik</text>
      </svg>`,
      freecharge: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#8BC34A"/>
        <text x="24" y="26" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="white" text-anchor="middle">Free</text>
        <text x="24" y="34" font-family="Arial, sans-serif" font-size="6" font-weight="bold" fill="white" text-anchor="middle">charge</text>
      </svg>`
    };
    
    // Default icons by type
    const defaultIcons = {
      cash: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#4CAF50"/>
        <rect x="8" y="14" width="32" height="20" rx="2" fill="#81C784"/>
        <circle cx="24" cy="24" r="6" fill="#4CAF50"/>
        <text x="24" y="28" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">₹</text>
      </svg>`,
      card: creditCardIcons.generic,
      upi: upiIcons.gpay,
      wallet: walletIcons.paytm,
      bank: `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="6" fill="#607D8B"/>
        <path d="M24 10L38 18H10L24 10Z" fill="white"/>
        <rect x="12" y="20" width="4" height="14" fill="white"/>
        <rect x="22" y="20" width="4" height="14" fill="white"/>
        <rect x="32" y="20" width="4" height="14" fill="white"/>
        <rect x="10" y="34" width="28" height="4" fill="white"/>
      </svg>`
    };
    
    // Determine which icon to use based on method type and provider
    switch (method.type) {
      case 'card':
        // Determine if credit or debit card
        const isDebit = method.cardType === 'debit';
        const cardIconSet = isDebit ? debitCardIcons : creditCardIcons;
        
        // Try to detect card brand from name
        const cardName = (method.name || '').toLowerCase();
        const bankName = (method.bankName || '').toLowerCase();
        if (cardName.includes('visa') || bankName.includes('visa')) {
          return cardIconSet.visa;
        } else if (cardName.includes('master') || bankName.includes('master')) {
          return cardIconSet.mastercard;
        } else if (cardName.includes('rupay') || bankName.includes('rupay')) {
          return cardIconSet.rupay;
        }
        // Default generic card icon
        return cardIconSet.generic;
        
      case 'upi':
        const provider = (method.provider || '').toLowerCase();
        if (provider === 'gpay' || provider.includes('google')) {
          return upiIcons.gpay;
        } else if (provider === 'phonepe' || provider.includes('phone')) {
          return upiIcons.phonepe;
        } else if (provider === 'paytm') {
          return upiIcons.paytm;
        } else if (provider === 'bhim') {
          return upiIcons.bhim;
        } else if (provider === 'amazonpay' || provider.includes('amazon')) {
          return upiIcons.amazonpay;
        }
        return upiIcons.gpay; // Default UPI icon
        
      case 'wallet':
        const walletProvider = (method.walletProvider || '').toLowerCase();
        if (walletProvider === 'paytm') {
          return walletIcons.paytm;
        } else if (walletProvider === 'phonepe') {
          return walletIcons.phonepe;
        } else if (walletProvider === 'amazonpay' || walletProvider.includes('amazon')) {
          return walletIcons.amazonpay;
        } else if (walletProvider === 'mobikwik') {
          return walletIcons.mobikwik;
        } else if (walletProvider === 'freecharge') {
          return walletIcons.freecharge;
        }
        return walletIcons.paytm; // Default wallet icon
        
      case 'bank':
        return defaultIcons.bank;
        
      case 'cash':
      default:
        return defaultIcons.cash;
    }
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodDisplayName(method) {
    if (!method) return '';
    
    switch (method.type) {
      case this.types.CARD:
        return `${method.name}${method.cardNumber ? ` (****${method.cardNumber})` : ''}`;
      case this.types.UPI:
        return `${method.name}${method.upiId ? ` (${method.upiId})` : ''}`;
      case this.types.WALLET:
        return `${method.name}${method.walletProvider ? ` - ${method.walletProvider}` : ''}`;
      case this.types.BANK:
        return `${method.name}${method.bankAccountNumber ? ` (****${method.bankAccountNumber})` : ''}`;
      default:
        return method.name;
    }
  }
}

// Create and export singleton instance
const paymentMethodsService = new PaymentMethodsService();
export default paymentMethodsService;
