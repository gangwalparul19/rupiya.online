// Payment Methods Service
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

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
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const methods = [];
      
      querySnapshot.forEach((doc) => {
        methods.push({ id: doc.id, ...doc.data() });
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
        await addDoc(collection(db, this.collectionName), {
          ...method,
          userId,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
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
      
      const docRef = await addDoc(collection(db, this.collectionName), data);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding payment method:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(methodId, updates) {
    try {
      const docRef = doc(db, this.collectionName, methodId);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      return { success: true };
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
      const docRef = doc(db, this.collectionName, methodId);
      
      // Soft delete - mark as inactive
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.now()
      });
      
      return { success: true };
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
      await deleteDoc(doc(db, this.collectionName, methodId));
      return { success: true };
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
      const docRef = doc(db, this.collectionName, methodId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Payment method not found' };
      }
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
   * Get payment method icon/emoji
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
