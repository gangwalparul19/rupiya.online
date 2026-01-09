// Advanced Filtering & Sorting Service
// Provides powerful filtering and sorting capabilities

class AdvancedFilteringService {
  constructor() {
    this.filters = [];
    this.sortFields = [];
    this.presets = new Map();
    this.data = [];
    this.filteredData = [];
    this.loadPresets();
  }

  /**
   * Add filter condition
   * @param {string} field - Field name
   * @param {string} operator - Comparison operator (eq, ne, gt, lt, gte, lte, contains, startsWith, endsWith)
   * @param {*} value - Filter value
   */
  addFilter(field, operator, value) {
    this.filters.push({ field, operator, value });
    this.applyFilters();
  }

  /**
   * Remove filter by index
   */
  removeFilter(index) {
    this.filters.splice(index, 1);
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.filters = [];
    this.applyFilters();
  }

  /**
   * Add sort field
   * @param {string} field - Field name
   * @param {string} direction - 'asc' or 'desc'
   */
  addSort(field, direction = 'asc') {
    // Remove if already exists
    this.sortFields = this.sortFields.filter(s => s.field !== field);
    this.sortFields.push({ field, direction });
    this.applySorting();
  }

  /**
   * Remove sort field
   */
  removeSort(field) {
    this.sortFields = this.sortFields.filter(s => s.field !== field);
    this.applySorting();
  }

  /**
   * Clear all sorting
   */
  clearSorting() {
    this.sortFields = [];
    this.applySorting();
  }

  /**
   * Apply all filters to data
   */
  applyFilters() {
    this.filteredData = this.data.filter(item => {
      return this.filters.every(filter => this.matchesFilter(item, filter));
    });
    this.applySorting();
  }

  /**
   * Check if item matches filter
   */
  matchesFilter(item, filter) {
    const value = this.getNestedValue(item, filter.field);

    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return value > filter.value;
      case 'lt':
        return value < filter.value;
      case 'gte':
        return value >= filter.value;
      case 'lte':
        return value <= filter.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'startsWith':
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'endsWith':
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'between':
        return value >= filter.value[0] && value <= filter.value[1];
      default:
        return true;
    }
  }

  /**
   * Get nested object value
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Apply sorting to filtered data
   */
  applySorting() {
    if (this.sortFields.length === 0) return;

    this.filteredData.sort((a, b) => {
      for (const sort of this.sortFields) {
        const aVal = this.getNestedValue(a, sort.field);
        const bVal = this.getNestedValue(b, sort.field);

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Set data to filter
   */
  setData(data) {
    this.data = [...data];
    this.applyFilters();
  }

  /**
   * Get filtered data
   */
  getFilteredData() {
    return [...this.filteredData];
  }

  /**
   * Save filter preset
   */
  savePreset(name, filters, sorts) {
    this.presets.set(name, { filters, sorts });
    this.persistPresets();
  }

  /**
   * Load filter preset
   */
  loadPreset(name) {
    const preset = this.presets.get(name);
    if (preset) {
      this.filters = [...preset.filters];
      this.sortFields = [...preset.sorts];
      this.applyFilters();
      return true;
    }
    return false;
  }

  /**
   * Get all presets
   */
  getPresets() {
    return Array.from(this.presets.keys());
  }

  /**
   * Delete preset
   */
  deletePreset(name) {
    this.presets.delete(name);
    this.persistPresets();
  }

  /**
   * Persist presets to localStorage
   */
  persistPresets() {
    try {
      const presetsObj = {};
      this.presets.forEach((value, key) => {
        presetsObj[key] = value;
      });
      localStorage.setItem('rupiya_filter_presets', JSON.stringify(presetsObj));
    } catch (e) {
      console.warn('Failed to persist presets:', e);
    }
  }

  /**
   * Load presets from localStorage
   */
  loadPresets() {
    try {
      const saved = localStorage.getItem('rupiya_filter_presets');
      if (saved) {
        const presetsObj = JSON.parse(saved);
        Object.entries(presetsObj).forEach(([key, value]) => {
          this.presets.set(key, value);
        });
      }
    } catch (e) {
      console.warn('Failed to load presets:', e);
    }
  }

  /**
   * Get filter summary
   */
  getFilterSummary() {
    return {
      filterCount: this.filters.length,
      sortCount: this.sortFields.length,
      resultCount: this.filteredData.length,
      totalCount: this.data.length
    };
  }

  /**
   * Export filtered data as CSV
   */
  exportAsCSV(filename = 'export.csv') {
    if (this.filteredData.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(this.filteredData[0]);
    const csv = [
      headers.join(','),
      ...this.filteredData.map(row =>
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Create filter builder UI
   */
  createFilterBuilder(containerId, fields) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const builder = document.createElement('div');
    builder.className = 'filter-builder';

    builder.innerHTML = `
      <div class="filter-builder-header">
        <h3 class="filter-builder-title">Advanced Filters</h3>
        <div class="filter-builder-actions">
          <button class="filter-builder-btn" id="add-filter-btn">+ Add Filter</button>
          <button class="filter-builder-btn" id="clear-filters-btn">Clear All</button>
        </div>
      </div>

      <div class="filter-group" id="filter-group">
        <!-- Filters will be added here -->
      </div>

      <div class="filter-summary" id="filter-summary">
        <span class="filter-summary-text">
          Showing <span class="filter-summary-count">0</span> of <span class="filter-summary-total">0</span> results
        </span>
        <div class="filter-summary-actions">
          <button class="filter-summary-btn" id="export-btn">Export</button>
          <button class="filter-summary-btn" id="save-preset-btn">Save Preset</button>
        </div>
      </div>
    `;

    container.appendChild(builder);

    // Bind events
    this.bindFilterBuilderEvents(builder, fields);
  }

  /**
   * Bind filter builder events
   */
  bindFilterBuilderEvents(builder, fields) {
    const addBtn = builder.querySelector('#add-filter-btn');
    const clearBtn = builder.querySelector('#clear-filters-btn');
    const exportBtn = builder.querySelector('#export-btn');
    const savePresetBtn = builder.querySelector('#save-preset-btn');

    addBtn.addEventListener('click', () => this.addFilterRow(builder, fields));
    clearBtn.addEventListener('click', () => {
      this.clearFilters();
      this.updateFilterUI(builder);
    });
    exportBtn.addEventListener('click', () => this.exportAsCSV());
    savePresetBtn.addEventListener('click', () => this.showSavePresetDialog());
  }

  /**
   * Add filter row to UI
   */
  addFilterRow(builder, fields) {
    const filterGroup = builder.querySelector('#filter-group');
    const row = document.createElement('div');
    row.className = 'filter-row';

    row.innerHTML = `
      <select class="filter-field-select filter-field">
        <option value="">Select field</option>
        ${fields.map(f => `<option value="${f.value}">${f.label}</option>`).join('')}
      </select>
      <select class="filter-field-select filter-operator">
        <option value="eq">Equals</option>
        <option value="ne">Not Equals</option>
        <option value="gt">Greater Than</option>
        <option value="lt">Less Than</option>
        <option value="gte">Greater or Equal</option>
        <option value="lte">Less or Equal</option>
        <option value="contains">Contains</option>
        <option value="startsWith">Starts With</option>
        <option value="endsWith">Ends With</option>
      </select>
      <input type="text" class="filter-field-input filter-value" placeholder="Value">
      <button class="filter-remove-btn">Remove</button>
    `;

    const removeBtn = row.querySelector('.filter-remove-btn');
    removeBtn.addEventListener('click', () => {
      row.remove();
      this.updateFiltersFromUI(builder);
    });

    row.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('change', () => this.updateFiltersFromUI(builder));
    });

    filterGroup.appendChild(row);
  }

  /**
   * Update filters from UI
   */
  updateFiltersFromUI(builder) {
    this.filters = [];
    const rows = builder.querySelectorAll('.filter-row');

    rows.forEach(row => {
      const field = row.querySelector('.filter-field').value;
      const operator = row.querySelector('.filter-operator').value;
      const value = row.querySelector('.filter-value').value;

      if (field && value) {
        this.addFilter(field, operator, value);
      }
    });

    this.updateFilterUI(builder);
  }

  /**
   * Update filter UI summary
   */
  updateFilterUI(builder) {
    const summary = this.getFilterSummary();
    const summaryEl = builder.querySelector('#filter-summary');

    if (summaryEl) {
      summaryEl.querySelector('.filter-summary-count').textContent = summary.resultCount;
      summaryEl.querySelector('.filter-summary-total').textContent = summary.totalCount;
    }
  }

  /**
   * Show save preset dialog
   */
  showSavePresetDialog() {
    const name = prompt('Enter preset name:');
    if (name) {
      this.savePreset(name, this.filters, this.sortFields);
      alert(`Preset "${name}" saved successfully`);
    }
  }
}

// Create and export singleton instance
const advancedFilteringService = new AdvancedFilteringService();
export default advancedFilteringService;
