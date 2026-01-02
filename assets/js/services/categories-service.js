// Categories Service
import { db } from '../config/firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth-service.js';

class CategoriesService {
  constructor() {
    this.collectionName = 'userCategories';
    
    // Default categories
    this.defaultExpenseCategories = [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Travel',
      'Personal Care',
      'House Maintenance',
      'Vehicle Fuel',
      'Vehicle Maintenance',
      'Insurance',
      'Taxes',
      'Gifts & Donations',
      'Other'
    ];
    
    this.defaultIncomeCategories = [
      'Salary',
      'Freelance',
      'Business',
      'Investments',
      'Rental Income',
      'House Rent',
      'Vehicle Earnings',
      'Interest',
      'Dividends',
      'Bonus',
      'Refund',
      'Gift',
      'Other'
    ];
  }

  // Get user ID
  getUserId() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
  }

  // Initialize categories for new user
  async initializeCategories() {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, this.collectionName, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create default categories for new user
        await setDoc(docRef, {
          expenseCategories: this.defaultExpenseCategories,
          incomeCategories: this.defaultIncomeCategories,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        return {
          success: true,
          data: {
            expenseCategories: this.defaultExpenseCategories,
            incomeCategories: this.defaultIncomeCategories
          }
        };
      }

      return {
        success: true,
        data: docSnap.data()
      };
    } catch (error) {
      console.error('Error initializing categories:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user categories
  async getCategories() {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, this.collectionName, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Initialize if doesn't exist
        const result = await this.initializeCategories();
        return result.data;
      }

      return docSnap.data();
    } catch (error) {
      console.error('Error getting categories:', error);
      // Return defaults on error
      return {
        expenseCategories: this.defaultExpenseCategories,
        incomeCategories: this.defaultIncomeCategories
      };
    }
  }

  // Get expense categories
  async getExpenseCategories() {
    const categories = await this.getCategories();
    return categories.expenseCategories || this.defaultExpenseCategories;
  }

  // Get income categories
  async getIncomeCategories() {
    const categories = await this.getCategories();
    return categories.incomeCategories || this.defaultIncomeCategories;
  }

  // Update expense categories
  async updateExpenseCategories(categories) {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, this.collectionName, userId);
      
      await updateDoc(docRef, {
        expenseCategories: categories,
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating expense categories:', error);
      return { success: false, error: error.message };
    }
  }

  // Update income categories
  async updateIncomeCategories(categories) {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, this.collectionName, userId);
      
      await updateDoc(docRef, {
        incomeCategories: categories,
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating income categories:', error);
      return { success: false, error: error.message };
    }
  }

  // Add expense category
  async addExpenseCategory(category) {
    try {
      const categories = await this.getExpenseCategories();
      
      if (categories.includes(category)) {
        return { success: false, error: 'Category already exists' };
      }

      categories.push(category);
      return await this.updateExpenseCategories(categories);
    } catch (error) {
      console.error('Error adding expense category:', error);
      return { success: false, error: error.message };
    }
  }

  // Add income category
  async addIncomeCategory(category) {
    try {
      const categories = await this.getIncomeCategories();
      
      if (categories.includes(category)) {
        return { success: false, error: 'Category already exists' };
      }

      categories.push(category);
      return await this.updateIncomeCategories(categories);
    } catch (error) {
      console.error('Error adding income category:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete expense category
  async deleteExpenseCategory(category) {
    try {
      const categories = await this.getExpenseCategories();
      const filtered = categories.filter(c => c !== category);
      
      if (filtered.length === categories.length) {
        return { success: false, error: 'Category not found' };
      }

      return await this.updateExpenseCategories(filtered);
    } catch (error) {
      console.error('Error deleting expense category:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete income category
  async deleteIncomeCategory(category) {
    try {
      const categories = await this.getIncomeCategories();
      const filtered = categories.filter(c => c !== category);
      
      if (filtered.length === categories.length) {
        return { success: false, error: 'Category not found' };
      }

      return await this.updateIncomeCategories(filtered);
    } catch (error) {
      console.error('Error deleting income category:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset to defaults
  async resetToDefaults() {
    try {
      const userId = this.getUserId();
      const docRef = doc(db, this.collectionName, userId);
      
      await setDoc(docRef, {
        expenseCategories: this.defaultExpenseCategories,
        incomeCategories: this.defaultIncomeCategories,
        updatedAt: Timestamp.now()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error resetting categories:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const categoriesService = new CategoriesService();
export default categoriesService;
