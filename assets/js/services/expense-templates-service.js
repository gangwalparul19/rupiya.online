// Expense Templates Service
// Provides quick templates for common trip expenses

const DEFAULT_TEMPLATES = [
  {
    id: 'hotel',
    name: 'Hotel Stay',
    icon: '🏨',
    category: 'Accommodation',
    descriptionPrefix: 'Hotel - ',
    splitType: 'equal'
  },
  {
    id: 'taxi',
    name: 'Taxi/Uber',
    icon: '🚕',
    category: 'Transport',
    descriptionPrefix: 'Taxi - ',
    splitType: 'equal'
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    category: 'Food & Dining',
    descriptionPrefix: 'Meal at ',
    splitType: 'equal'
  },
  {
    id: 'groceries',
    name: 'Groceries',
    icon: '🛒',
    category: 'Food & Dining',
    descriptionPrefix: 'Groceries - ',
    splitType: 'equal'
  },
  {
    id: 'activity',
    name: 'Activity/Tour',
    icon: '🎭',
    category: 'Activities',
    descriptionPrefix: 'Activity - ',
    splitType: 'equal'
  },
  {
    id: 'flight',
    name: 'Flight/Train',
    icon: '✈️',
    category: 'Transport',
    descriptionPrefix: 'Travel - ',
    splitType: 'custom'
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    category: 'Shopping',
    descriptionPrefix: 'Shopping - ',
    splitType: 'equal'
  },
  {
    id: 'gas',
    name: 'Gas/Fuel',
    icon: '⛽',
    category: 'Transport',
    descriptionPrefix: 'Fuel - ',
    splitType: 'equal'
  },
  {
    id: 'tips',
    name: 'Tips',
    icon: '💵',
    category: 'Tips',
    descriptionPrefix: 'Tip - ',
    splitType: 'equal'
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📝',
    category: 'Other',
    descriptionPrefix: '',
    splitType: 'equal'
  }
];

class ExpenseTemplatesService {
  constructor() {
    this.templates = DEFAULT_TEMPLATES;
  }

  /**
   * Get all available templates
   * @returns {Array} Array of template objects
   */
  getDefaultTemplates() {
    return [...this.templates];
  }

  /**
   * Get a specific template by ID
   * @param {string} templateId - The template ID
   * @returns {Object|null} Template object or null if not found
   */
  getTemplate(templateId) {
    return this.templates.find(t => t.id === templateId) || null;
  }

  /**
   * Apply a template to expense form data
   * @param {string} templateId - The template ID to apply
   * @param {Object} currentFormData - Current form data (optional)
   * @returns {Object} Updated form data with template values
   */
  applyTemplate(templateId, currentFormData = {}) {
    const template = this.getTemplate(templateId);
    
    if (!template) {
      console.warn(`Template ${templateId} not found`);
      return currentFormData;
    }

    // Merge template values with current form data
    // Template values are defaults, user can override them
    return {
      ...currentFormData,
      category: template.category,
      description: template.descriptionPrefix + (currentFormData.description || ''),
      splitType: template.splitType,
      templateId: template.id
    };
  }

  /**
   * Get template by category
   * @param {string} category - The category name
   * @returns {Array} Array of templates matching the category
   */
  getTemplatesByCategory(category) {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Get the most commonly used templates (first 5)
   * @returns {Array} Array of popular templates
   */
  getPopularTemplates() {
    return this.templates.slice(0, 5);
  }
}

// Create and export singleton instance
const expenseTemplatesService = new ExpenseTemplatesService();
export default expenseTemplatesService;
