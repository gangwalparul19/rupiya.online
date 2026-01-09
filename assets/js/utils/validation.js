// Form Validation Utilities

export class Validator {
  constructor() {
    this.errors = {};
  }

  // Validate required field
  required(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      this.errors[fieldName] = `${fieldName} is required`;
      return false;
    }
    return true;
  }

  // Validate email
  email(value, fieldName = 'Email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      this.errors[fieldName] = 'Please enter a valid email address';
      return false;
    }
    return true;
  }

  // Validate password
  password(value, fieldName = 'Password', minLength = 6) {
    if (value.length < minLength) {
      this.errors[fieldName] = `Password must be at least ${minLength} characters long`;
      return false;
    }
    return true;
  }

  // Validate password match
  passwordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
      this.errors['confirmPassword'] = 'Passwords do not match';
      return false;
    }
    return true;
  }

  // Validate phone number
  phone(value, fieldName = 'Phone') {
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleaned = value.replace(/\D/g, '');
    if (!phoneRegex.test(cleaned)) {
      this.errors[fieldName] = 'Please enter a valid 10-digit phone number';
      return false;
    }
    return true;
  }

  // Validate number
  number(value, fieldName = 'Number') {
    if (isNaN(value) || value === '') {
      this.errors[fieldName] = 'Please enter a valid number';
      return false;
    }
    return true;
  }

  // Validate positive number
  positiveNumber(value, fieldName = 'Amount') {
    if (isNaN(value) || parseFloat(value) <= 0) {
      this.errors[fieldName] = 'Please enter a positive number';
      return false;
    }
    return true;
  }

  // Validate non-negative number
  nonNegativeNumber(value, fieldName = 'Amount') {
    if (isNaN(value) || parseFloat(value) < 0) {
      this.errors[fieldName] = 'Please enter a non-negative number';
      return false;
    }
    return true;
  }

  // Validate min value
  min(value, minValue, fieldName = 'Value') {
    if (parseFloat(value) < minValue) {
      this.errors[fieldName] = `Value must be at least ${minValue}`;
      return false;
    }
    return true;
  }

  // Validate max value
  max(value, maxValue, fieldName = 'Value') {
    if (parseFloat(value) > maxValue) {
      this.errors[fieldName] = `Value must not exceed ${maxValue}`;
      return false;
    }
    return true;
  }

  // Validate min length
  minLength(value, minLen, fieldName = 'Field') {
    if (value.length < minLen) {
      this.errors[fieldName] = `${fieldName} must be at least ${minLen} characters`;
      return false;
    }
    return true;
  }

  // Validate max length
  maxLength(value, maxLen, fieldName = 'Field') {
    if (value.length > maxLen) {
      this.errors[fieldName] = `${fieldName} must not exceed ${maxLen} characters`;
      return false;
    }
    return true;
  }

  // Validate date
  date(value, fieldName = 'Date') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      this.errors[fieldName] = 'Please enter a valid date';
      return false;
    }
    return true;
  }

  // Validate future date
  futureDate(value, fieldName = 'Date') {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      this.errors[fieldName] = 'Date must be in the future';
      return false;
    }
    return true;
  }

  // Validate past date
  pastDate(value, fieldName = 'Date') {
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (date > today) {
      this.errors[fieldName] = 'Date must be in the past';
      return false;
    }
    return true;
  }

  // Validate date range
  dateRange(startDate, endDate, fieldName = 'Date Range') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      this.errors[fieldName] = 'Start date must be before end date';
      return false;
    }
    return true;
  }

  // Validate URL
  url(value, fieldName = 'URL') {
    try {
      new URL(value);
      return true;
    } catch {
      this.errors[fieldName] = 'Please enter a valid URL';
      return false;
    }
  }

  // Validate credit card number (basic Luhn algorithm)
  creditCard(value, fieldName = 'Card Number') {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      this.errors[fieldName] = 'Please enter a valid card number';
      return false;
    }
    
    // Basic Luhn check
    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      this.errors[fieldName] = 'Please enter a valid card number';
      return false;
    }
    return true;
  }

  // Validate currency amount
  currencyAmount(value, fieldName = 'Amount') {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0 || amount > 999999999) {
      this.errors[fieldName] = 'Please enter a valid amount';
      return false;
    }
    return true;
  }

  // Sanitize input to prevent XSS
  sanitize(value) {
    if (typeof value !== 'string') return value;
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  // Get all errors
  getErrors() {
    return this.errors;
  }

  // Get error for specific field
  getError(fieldName) {
    return this.errors[fieldName] || null;
  }

  // Check if has errors
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  // Clear all errors
  clearErrors() {
    this.errors = {};
  }

  // Clear error for specific field
  clearError(fieldName) {
    delete this.errors[fieldName];
  }
}

// Form validation helper
export function validateForm(formElement, rules) {
  const validator = new Validator();
  const formData = new FormData(formElement);
  const data = {};
  
  // Clear previous errors
  formElement.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
  });
  
  formElement.querySelectorAll('.invalid-feedback').forEach(el => {
    el.textContent = '';
  });
  
  // Collect form data
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  // Validate each field
  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const value = data[fieldName];
    const input = formElement.querySelector(`[name="${fieldName}"]`);
    
    for (const rule of fieldRules) {
      const [ruleName, ...params] = rule.split(':');
      
      let isValid = true;
      
      switch (ruleName) {
        case 'required':
          isValid = validator.required(value, fieldName);
          break;
        case 'email':
          if (value) isValid = validator.email(value, fieldName);
          break;
        case 'password':
          if (value) isValid = validator.password(value, fieldName, parseInt(params[0]) || 6);
          break;
        case 'passwordMatch':
          if (value) isValid = validator.passwordMatch(data[params[0]], value);
          break;
        case 'phone':
          if (value) isValid = validator.phone(value, fieldName);
          break;
        case 'number':
          if (value) isValid = validator.number(value, fieldName);
          break;
        case 'positiveNumber':
          if (value) isValid = validator.positiveNumber(value, fieldName);
          break;
        case 'min':
          if (value) isValid = validator.min(value, parseFloat(params[0]), fieldName);
          break;
        case 'max':
          if (value) isValid = validator.max(value, parseFloat(params[0]), fieldName);
          break;
        case 'minLength':
          if (value) isValid = validator.minLength(value, parseInt(params[0]), fieldName);
          break;
        case 'maxLength':
          if (value) isValid = validator.maxLength(value, parseInt(params[0]), fieldName);
          break;
        case 'date':
          if (value) isValid = validator.date(value, fieldName);
          break;
        case 'futureDate':
          if (value) isValid = validator.futureDate(value, fieldName);
          break;
        case 'pastDate':
          if (value) isValid = validator.pastDate(value, fieldName);
          break;
        case 'url':
          if (value) isValid = validator.url(value, fieldName);
          break;
      }
      
      if (!isValid && input) {
        input.classList.add('is-invalid');
        const feedback = input.parentElement.querySelector('.invalid-feedback');
        if (feedback) {
          feedback.textContent = validator.getError(fieldName);
        }
        break;
      }
    }
  }
  
  return {
    isValid: !validator.hasErrors(),
    errors: validator.getErrors(),
    data
  };
}

// Real-time validation
export function setupRealtimeValidation(formElement, rules) {
  for (const fieldName of Object.keys(rules)) {
    const input = formElement.querySelector(`[name="${fieldName}"]`);
    if (!input) continue;
    
    input.addEventListener('blur', () => {
      const fieldRules = { [fieldName]: rules[fieldName] };
      validateForm(formElement, fieldRules);
    });
    
    input.addEventListener('input', () => {
      if (input.classList.contains('is-invalid')) {
        const fieldRules = { [fieldName]: rules[fieldName] };
        validateForm(formElement, fieldRules);
      }
    });
  }
}

export default Validator;
