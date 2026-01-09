/**
 * Form Validation Utility
 * Provides real-time form validation with visual feedback
 */

class FormValidator {
  constructor(formElement) {
    this.form = formElement;
    this.fields = {};
    this.isValid = false;
    this.init();
  }

  init() {
    if (!this.form) return;

    // Get all form controls
    const controls = this.form.querySelectorAll('.form-control, .form-select');
    
    controls.forEach(control => {
      const fieldName = control.name || control.id;
      if (!fieldName) return;

      this.fields[fieldName] = {
        element: control,
        rules: this.parseValidationRules(control),
        isValid: false,
        errors: []
      };

      // Add real-time validation listeners
      control.addEventListener('blur', () => this.validateField(fieldName));
      control.addEventListener('input', () => this.validateField(fieldName));
      control.addEventListener('change', () => this.validateField(fieldName));

      // Special handling for password fields
      if (control.type === 'password') {
        this.setupPasswordStrength(control);
      }
    });
  }

  parseValidationRules(element) {
    const rules = {};

    // Required
    if (element.hasAttribute('required')) {
      rules.required = true;
    }

    // Min length
    if (element.hasAttribute('minlength')) {
      rules.minlength = parseInt(element.getAttribute('minlength'));
    }

    // Max length
    if (element.hasAttribute('maxlength')) {
      rules.maxlength = parseInt(element.getAttribute('maxlength'));
    }

    // Pattern
    if (element.hasAttribute('pattern')) {
      rules.pattern = element.getAttribute('pattern');
    }

    // Type-specific rules
    if (element.type === 'email') {
      rules.email = true;
    }

    if (element.type === 'number') {
      rules.number = true;
      if (element.hasAttribute('min')) {
        rules.min = parseFloat(element.getAttribute('min'));
      }
      if (element.hasAttribute('max')) {
        rules.max = parseFloat(element.getAttribute('max'));
      }
    }

    // Custom data attributes
    if (element.hasAttribute('data-validate')) {
      const customRules = element.getAttribute('data-validate').split(',');
      customRules.forEach(rule => {
        rules[rule.trim()] = true;
      });
    }

    return rules;
  }

  validateField(fieldName) {
    const field = this.fields[fieldName];
    if (!field) return false;

    const { element, rules } = field;
    const value = element.value.trim();
    const errors = [];

    // Required validation
    if (rules.required && !value) {
      errors.push('This field is required');
    }

    // Only validate other rules if field has value or is required
    if (value || rules.required) {
      // Min length
      if (rules.minlength && value.length < rules.minlength) {
        errors.push(`Minimum ${rules.minlength} characters required`);
      }

      // Max length
      if (rules.maxlength && value.length > rules.maxlength) {
        errors.push(`Maximum ${rules.maxlength} characters allowed`);
      }

      // Email validation
      if (rules.email && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push('Please enter a valid email address');
        }
      }

      // Number validation
      if (rules.number && value) {
        if (isNaN(value)) {
          errors.push('Please enter a valid number');
        } else {
          const num = parseFloat(value);
          if (rules.min !== undefined && num < rules.min) {
            errors.push(`Minimum value is ${rules.min}`);
          }
          if (rules.max !== undefined && num > rules.max) {
            errors.push(`Maximum value is ${rules.max}`);
          }
        }
      }

      // Pattern validation
      if (rules.pattern && value) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push('Please enter a valid format');
        }
      }

      // Password validation
      if (rules.password && value) {
        const passwordErrors = this.validatePassword(value);
        errors.push(...passwordErrors);
      }

      // Confirm password
      if (rules.confirmPassword && value) {
        const passwordField = this.form.querySelector('[name="password"]');
        if (passwordField && passwordField.value !== value) {
          errors.push('Passwords do not match');
        }
      }
    }

    // Update field state
    field.errors = errors;
    field.isValid = errors.length === 0;

    // Update UI
    this.updateFieldUI(fieldName);

    return field.isValid;
  }

  validatePassword(password) {
    const errors = [];
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*]/.test(password)
    };

    if (!requirements.length) errors.push('At least 8 characters');
    if (!requirements.uppercase) errors.push('At least one uppercase letter');
    if (!requirements.lowercase) errors.push('At least one lowercase letter');
    if (!requirements.number) errors.push('At least one number');
    if (!requirements.special) errors.push('At least one special character');

    return errors;
  }

  updateFieldUI(fieldName) {
    const field = this.fields[fieldName];
    const { element, isValid, errors } = field;

    // Remove existing classes
    element.classList.remove('is-valid', 'is-invalid');

    // Add appropriate class
    if (element.value.trim()) {
      element.classList.add(isValid ? 'is-valid' : 'is-invalid');
    }

    // Update feedback messages
    const group = element.closest('.form-group');
    if (group) {
      const validFeedback = group.querySelector('.valid-feedback');
      const invalidFeedback = group.querySelector('.invalid-feedback');

      if (validFeedback) {
        validFeedback.textContent = '✓ Looks good!';
      }

      if (invalidFeedback) {
        invalidFeedback.textContent = errors[0] || 'Invalid input';
      }
    }

    // Update character counter if present
    this.updateCharacterCounter(element);
  }

  updateCharacterCounter(element) {
    const group = element.closest('.form-group');
    if (!group) return;

    const counter = group.querySelector('.form-counter');
    if (!counter) return;

    const current = element.value.length;
    const max = element.maxLength || element.getAttribute('maxlength');

    if (max) {
      const currentSpan = counter.querySelector('.form-counter-current');
      if (currentSpan) {
        currentSpan.textContent = current;
      }

      // Add warning class if near limit
      if (current > max * 0.8) {
        counter.classList.add('warning');
      } else {
        counter.classList.remove('warning');
      }

      if (current >= max) {
        counter.classList.add('error');
      } else {
        counter.classList.remove('error');
      }
    }
  }

  setupPasswordStrength(passwordField) {
    const group = passwordField.closest('.form-group');
    if (!group) return;

    // Create password strength indicator if not exists
    let strengthContainer = group.querySelector('.password-strength');
    if (!strengthContainer) {
      strengthContainer = document.createElement('div');
      strengthContainer.className = 'password-strength';
      strengthContainer.innerHTML = `
        <div class="password-strength-bar">
          <div class="password-strength-fill"></div>
        </div>
        <div class="password-strength-text">Password strength: <span>-</span></div>
      `;
      passwordField.parentNode.insertBefore(strengthContainer, passwordField.nextSibling);
    }

    // Update on input
    passwordField.addEventListener('input', () => {
      const strength = this.calculatePasswordStrength(passwordField.value);
      const fill = strengthContainer.querySelector('.password-strength-fill');
      const text = strengthContainer.querySelector('.password-strength-text span');

      fill.className = `password-strength-fill ${strength.level}`;
      text.textContent = strength.text;
    });
  }

  calculatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;

    if (strength <= 1) return { level: 'weak', text: 'Weak' };
    if (strength <= 3) return { level: 'fair', text: 'Fair' };
    return { level: 'good', text: 'Good' };
  }

  validateForm() {
    let isFormValid = true;

    Object.keys(this.fields).forEach(fieldName => {
      const isFieldValid = this.validateField(fieldName);
      if (!isFieldValid) {
        isFormValid = false;
      }
    });

    this.isValid = isFormValid;
    this.showValidationSummary();

    return isFormValid;
  }

  showValidationSummary() {
    let summary = this.form.querySelector('.form-validation-summary');

    if (this.isValid) {
      if (summary) {
        summary.classList.remove('show');
      }
      return;
    }

    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'form-validation-summary';
      this.form.insertBefore(summary, this.form.firstChild);
    }

    const errors = Object.values(this.fields)
      .filter(field => field.errors.length > 0)
      .flatMap(field => field.errors);

    if (errors.length > 0) {
      summary.innerHTML = `
        <div class="form-validation-summary-title">Please fix the following errors:</div>
        <ul class="form-validation-summary-list">
          ${errors.map(error => `<li class="form-validation-summary-item">${error}</li>`).join('')}
        </ul>
      `;
      summary.classList.add('show');
    }
  }

  getErrors() {
    return Object.values(this.fields)
      .filter(field => field.errors.length > 0)
      .reduce((acc, field) => {
        acc[field.element.name || field.element.id] = field.errors;
        return acc;
      }, {});
  }

  reset() {
    Object.values(this.fields).forEach(field => {
      field.element.classList.remove('is-valid', 'is-invalid');
      field.errors = [];
      field.isValid = false;
    });

    const summary = this.form.querySelector('.form-validation-summary');
    if (summary) {
      summary.classList.remove('show');
    }
  }
}

export default FormValidator;
