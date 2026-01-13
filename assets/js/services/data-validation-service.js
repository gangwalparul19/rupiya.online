// Data Validation Service - Comprehensive validation for all data types
import { Validator } from '../utils/validation.js';
import logger from '../utils/logger.js';

class DataValidationService {
  constructor() {
    this.validator = new Validator();
    this.schemas = this.initializeSchemas();
  }

  /**
   * Initialize validation schemas for all collections
   */
  initializeSchemas() {
    return {
      expenses: {
        amount: { type: 'number', required: true, min: 0.01, max: 999999999 },
        description: { type: 'string', required: true, minLength: 1, maxLength: 500 },
        category: { type: 'string', required: true },
        date: { type: 'date', required: true },
        paymentMethod: { type: 'string', required: false },
        tags: { type: 'array', required: false },
        notes: { type: 'string', required: false, maxLength: 1000 },
        receipt: { type: 'string', required: false },
        isRecurring: { type: 'boolean', required: false }
      },
      income: {
        amount: { type: 'number', required: true, min: 0.01, max: 999999999 },
        source: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        date: { type: 'date', required: true },
        category: { type: 'string', required: false },
        notes: { type: 'string', required: false, maxLength: 1000 },
        isRecurring: { type: 'boolean', required: false }
      },
      budgets: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        category: { type: 'string', required: true },
        limit: { type: 'number', required: true, min: 0.01, max: 999999999 },
        period: { type: 'string', required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
        startDate: { type: 'date', required: true },
        endDate: { type: 'date', required: false },
        alertThreshold: { type: 'number', required: false, min: 0, max: 100 },
        notes: { type: 'string', required: false, maxLength: 500 }
      },
      investments: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        type: { type: 'string', required: true, enum: ['stock', 'mutual_fund', 'bond', 'crypto', 'real_estate', 'other'] },
        amount: { type: 'number', required: true, min: 0.01, max: 999999999 },
        quantity: { type: 'number', required: false, min: 0 },
        purchasePrice: { type: 'number', required: false, min: 0 },
        currentPrice: { type: 'number', required: false, min: 0 },
        purchaseDate: { type: 'date', required: true },
        notes: { type: 'string', required: false, maxLength: 1000 }
      },
      goals: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        targetAmount: { type: 'number', required: true, min: 0.01, max: 999999999 },
        currentAmount: { type: 'number', required: false, min: 0, max: 999999999 },
        deadline: { type: 'date', required: true },
        category: { type: 'string', required: false },
        priority: { type: 'string', required: false, enum: ['low', 'medium', 'high'] },
        notes: { type: 'string', required: false, maxLength: 1000 }
      },
      loans: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        amount: { type: 'number', required: true, min: 0.01, max: 999999999 },
        interestRate: { type: 'number', required: true, min: 0, max: 100 },
        startDate: { type: 'date', required: true },
        endDate: { type: 'date', required: true },
        emiAmount: { type: 'number', required: false, min: 0 },
        lender: { type: 'string', required: false, maxLength: 200 },
        notes: { type: 'string', required: false, maxLength: 1000 }
      },
      houses: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        address: { type: 'string', required: true, minLength: 5, maxLength: 500 },
        value: { type: 'number', required: true, min: 0.01, max: 999999999 },
        purchaseDate: { type: 'date', required: false },
        mortgageAmount: { type: 'number', required: false, min: 0 },
        notes: { type: 'string', required: false, maxLength: 1000 }
      },
      vehicles: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        type: { type: 'string', required: true, enum: ['car', 'bike', 'truck', 'other'] },
        value: { type: 'number', required: true, min: 0.01, max: 999999999 },
        purchaseDate: { type: 'date', required: false },
        registrationNumber: { type: 'string', required: false, maxLength: 50 },
        notes: { type: 'string', required: false, maxLength: 1000 }
      },
      notes: {
        title: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        content: { type: 'string', required: true, minLength: 1, maxLength: 10000 },
        category: { type: 'string', required: false },
        tags: { type: 'array', required: false }
      },
      documents: {
        name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
        type: { type: 'string', required: false },
        category: { type: 'string', required: false },
        url: { type: 'string', required: false },
        notes: { type: 'string', required: false, maxLength: 1000 }
      },
      transfers: {
        fromAccount: { type: 'string', required: true },
        toAccount: { type: 'string', required: true },
        amount: { type: 'number', required: true, min: 0.01, max: 999999999 },
        date: { type: 'date', required: true },
        notes: { type: 'string', required: false, maxLength: 500 }
      }
    };
  }

  /**
   * Validate data against schema
   * @param {object} data - Data to validate
   * @param {string} collection - Collection name
   * @returns {object} - { isValid: boolean, errors: object }
   */
  validate(data, collection) {
    const schema = this.schemas[collection];
    if (!schema) {
      logger.warn(`No schema found for collection: ${collection}`);
      return { isValid: true, errors: {} };
    }

    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(value, field, rules);
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    const isValid = Object.keys(errors).length === 0;
    
    if (!isValid) {
      logger.warn(`Validation failed for ${collection}:`, errors);
    }

    return { isValid, errors };
  }

  /**
   * Validate a single field
   * @param {*} value - Field value
   * @param {string} fieldName - Field name
   * @param {object} rules - Validation rules
   * @returns {array} - Array of error messages
   */
  validateField(value, fieldName, rules) {
    const errors = [];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} is required`);
      return errors;
    }

    // Skip validation if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // Type validation
    switch (rules.type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${fieldName} must be a valid number`);
        } else {
          if (rules.min !== undefined && value < rules.min) {
            errors.push(`${fieldName} must be at least ${rules.min}`);
          }
          if (rules.max !== undefined && value > rules.max) {
            errors.push(`${fieldName} must not exceed ${rules.max}`);
          }
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} must be a string`);
        } else {
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
          }
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
          }
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${fieldName} must be a valid date`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${fieldName} must be an array`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${fieldName} must be a boolean`);
        }
        break;
    }

    return errors;
  }

  /**
   * Sanitize data to prevent XSS
   * @param {object} data - Data to sanitize
   * @param {array} stringFields - Fields to sanitize
   * @returns {object} - Sanitized data
   */
  sanitize(data, stringFields = []) {
    const sanitized = { ...data };

    for (const field of stringFields) {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = this.sanitizeString(sanitized[field]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize a string to prevent XSS
   * @param {string} str - String to sanitize
   * @returns {string} - Sanitized string
   */
  sanitizeString(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Validate email
   * @param {string} email - Email to validate
   * @returns {boolean} - Is valid email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone to validate
   * @returns {boolean} - Is valid phone
   */
  validatePhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleaned = phone.replace(/\D/g, '');
    return phoneRegex.test(cleaned);
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Is valid URL
   */
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate amount (currency)
   * @param {number} amount - Amount to validate
   * @returns {boolean} - Is valid amount
   */
  validateAmount(amount) {
    return typeof amount === 'number' && 
           !isNaN(amount) && 
           amount > 0 && 
           amount <= 999999999;
  }

  /**
   * Validate date range
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @returns {boolean} - Is valid range
   */
  validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  }

  /**
   * Add custom validation schema
   * @param {string} collection - Collection name
   * @param {object} schema - Validation schema
   */
  addSchema(collection, schema) {
    this.schemas[collection] = schema;
    logger.info(`Custom schema added for ${collection}`);
  }

  /**
   * Get schema for collection
   * @param {string} collection - Collection name
   * @returns {object} - Validation schema
   */
  getSchema(collection) {
    return this.schemas[collection] || null;
  }
}

export default new DataValidationService();
