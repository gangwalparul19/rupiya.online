/**
 * Input Validator Utility
 * Comprehensive input validation with bounds checking and type validation
 */

class InputValidator {
  /**
   * Validate and sanitize a string input
   * @param {string} value - The input value
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, value: string, error: string|null }
   */
  static string(value, options = {}) {
    const {
      required = false,
      minLength = 0,
      maxLength = 1000,
      trim = true,
      allowEmpty = true
    } = options;

    let sanitized = value;
    
    // Handle null/undefined
    if (value === null || value === undefined) {
      if (required) {
        return { valid: false, value: '', error: 'This field is required' };
      }
      return { valid: true, value: '', error: null };
    }

    // Convert to string
    sanitized = String(value);
    
    // Trim if requested
    if (trim) {
      sanitized = sanitized.trim();
    }

    // Check empty
    if (!allowEmpty && sanitized === '') {
      return { valid: false, value: sanitized, error: 'This field cannot be empty' };
    }

    if (required && sanitized === '') {
      return { valid: false, value: sanitized, error: 'This field is required' };
    }

    // Check length
    if (sanitized.length < minLength) {
      return { valid: false, value: sanitized, error: `Minimum ${minLength} characters required` };
    }

    if (sanitized.length > maxLength) {
      return { valid: false, value: sanitized.substring(0, maxLength), error: `Maximum ${maxLength} characters allowed` };
    }

    return { valid: true, value: sanitized, error: null };
  }

  /**
   * Validate and sanitize a number input
   * @param {any} value - The input value
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, value: number, error: string|null }
   */
  static number(value, options = {}) {
    const {
      required = false,
      min = -Infinity,
      max = Infinity,
      allowNegative = true,
      allowZero = true,
      allowDecimal = true,
      decimalPlaces = 2
    } = options;

    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
      if (required) {
        return { valid: false, value: 0, error: 'This field is required' };
      }
      return { valid: true, value: 0, error: null };
    }

    // Parse number
    const parsed = parseFloat(value);

    // Check if valid number
    if (isNaN(parsed)) {
      return { valid: false, value: 0, error: 'Please enter a valid number' };
    }

    // Check negative
    if (!allowNegative && parsed < 0) {
      return { valid: false, value: Math.abs(parsed), error: 'Negative values are not allowed' };
    }

    // Check zero
    if (!allowZero && parsed === 0) {
      return { valid: false, value: parsed, error: 'Value cannot be zero' };
    }

    // Check decimal
    if (!allowDecimal && !Number.isInteger(parsed)) {
      return { valid: false, value: Math.round(parsed), error: 'Decimal values are not allowed' };
    }

    // Check bounds
    if (parsed < min) {
      return { valid: false, value: min, error: `Minimum value is ${min}` };
    }

    if (parsed > max) {
      return { valid: false, value: max, error: `Maximum value is ${max}` };
    }

    // Round to decimal places
    const rounded = allowDecimal 
      ? Math.round(parsed * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
      : Math.round(parsed);

    return { valid: true, value: rounded, error: null };
  }

  /**
   * Validate an email address
   * @param {string} value - The email value
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, value: string, error: string|null }
   */
  static email(value, options = {}) {
    const { required = false } = options;

    const stringResult = this.string(value, { required, maxLength: 254 });
    if (!stringResult.valid) {
      return stringResult;
    }

    if (stringResult.value === '') {
      return stringResult;
    }

    // Email regex pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(stringResult.value)) {
      return { valid: false, value: stringResult.value, error: 'Please enter a valid email address' };
    }

    return { valid: true, value: stringResult.value.toLowerCase(), error: null };
  }

  /**
   * Validate a date input
   * @param {any} value - The date value
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, value: Date|null, error: string|null }
   */
  static date(value, options = {}) {
    const {
      required = false,
      minDate = null,
      maxDate = null,
      allowFuture = true,
      allowPast = true
    } = options;

    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
      if (required) {
        return { valid: false, value: null, error: 'Date is required' };
      }
      return { valid: true, value: null, error: null };
    }

    // Parse date
    const parsed = value instanceof Date ? value : new Date(value);

    // Check if valid date
    if (isNaN(parsed.getTime())) {
      return { valid: false, value: null, error: 'Please enter a valid date' };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Check future
    if (!allowFuture && parsed > now) {
      return { valid: false, value: parsed, error: 'Future dates are not allowed' };
    }

    // Check past
    if (!allowPast && parsed < now) {
      return { valid: false, value: parsed, error: 'Past dates are not allowed' };
    }

    // Check min date
    if (minDate && parsed < new Date(minDate)) {
      return { valid: false, value: parsed, error: `Date must be after ${new Date(minDate).toLocaleDateString()}` };
    }

    // Check max date
    if (maxDate && parsed > new Date(maxDate)) {
      return { valid: false, value: parsed, error: `Date must be before ${new Date(maxDate).toLocaleDateString()}` };
    }

    return { valid: true, value: parsed, error: null };
  }

  /**
   * Validate amount/currency input
   * @param {any} value - The amount value
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, value: number, error: string|null }
   */
  static amount(value, options = {}) {
    return this.number(value, {
      required: options.required ?? false,
      min: options.min ?? 0,
      max: options.max ?? 999999999.99,
      allowNegative: options.allowNegative ?? false,
      allowZero: options.allowZero ?? false,
      allowDecimal: true,
      decimalPlaces: 2
    });
  }

  /**
   * Sanitize HTML to prevent XSS
   * @param {string} value - The input value
   * @returns {string} - Sanitized string
   */
  static sanitizeHTML(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  /**
   * Validate a select/dropdown value
   * @param {string} value - The selected value
   * @param {Array} allowedValues - Array of allowed values
   * @param {Object} options - Validation options
   * @returns {Object} - { valid: boolean, value: string, error: string|null }
   */
  static select(value, allowedValues = [], options = {}) {
    const { required = false } = options;

    if (!value || value === '') {
      if (required) {
        return { valid: false, value: '', error: 'Please select an option' };
      }
      return { valid: true, value: '', error: null };
    }

    if (allowedValues.length > 0 && !allowedValues.includes(value)) {
      return { valid: false, value: '', error: 'Invalid selection' };
    }

    return { valid: true, value: value, error: null };
  }
}

export default InputValidator;
