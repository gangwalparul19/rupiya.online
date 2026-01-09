/**
 * KPI Card Enhancements
 * Adds trend indicators, sparklines, and interactive features to KPI cards
 */

class KPIEnhancer {
  constructor() {
    this.kpiCards = {};
  }

  /**
   * Initialize KPI card with enhancements
   * @param {string} cardId - ID of the KPI card element
   * @param {object} config - Configuration object
   */
  initCard(cardId, config = {}) {
    const card = document.getElementById(cardId);
    if (!card) return;

    this.kpiCards[cardId] = {
      element: card,
      config: {
        showSparkline: config.showSparkline !== false,
        showDetails: config.showDetails !== false,
        showViewDetails: config.showViewDetails !== false,
        detailsLink: config.detailsLink || '#',
        ...config
      }
    };

    this.enhanceCard(cardId);
  }

  /**
   * Enhance a KPI card with visual improvements
   */
  enhanceCard(cardId) {
    const kpiData = this.kpiCards[cardId];
    if (!kpiData) return;

    const { element, config } = kpiData;

    // Add hover effects
    element.style.cursor = 'pointer';

    // Add click handler for view details
    if (config.showViewDetails && config.detailsLink) {
      element.addEventListener('click', () => {
        window.location.href = config.detailsLink;
      });
    }
  }

  /**
   * Update KPI card with trend data
   * @param {string} cardId - ID of the KPI card
   * @param {number} currentValue - Current value
   * @param {number} previousValue - Previous value for comparison
   * @param {array} sparklineData - Array of values for sparkline chart
   */
  updateKPI(cardId, currentValue, previousValue = 0, sparklineData = []) {
    const kpiData = this.kpiCards[cardId];
    if (!kpiData) return;

    const { element } = kpiData;

    // Calculate trend
    const trend = this.calculateTrend(currentValue, previousValue);

    // Update trend indicator
    this.updateTrendIndicator(element, trend);

    // Add sparkline if data provided
    if (sparklineData.length > 0) {
      this.addSparkline(element, sparklineData, trend);
    }

    // Add details breakdown if configured
    if (kpiData.config.showDetails) {
      this.addDetailsBreakdown(element, currentValue, previousValue);
    }
  }

  /**
   * Calculate trend percentage
   */
  calculateTrend(current, previous) {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Update trend indicator on KPI card
   */
  updateTrendIndicator(element, trendPercent) {
    let changeElement = element.querySelector('.kpi-change');
    if (!changeElement) return;

    const isPositive = trendPercent > 0;
    const isNegative = trendPercent < 0;

    // Update classes
    changeElement.className = 'kpi-change';
    if (isPositive) changeElement.classList.add('positive');
    if (isNegative) changeElement.classList.add('negative');

    // Update arrow and text
    const arrow = isPositive ? '↑' : isNegative ? '↓' : '→';
    const text = trendPercent === 0 
      ? 'No change' 
      : `${Math.abs(trendPercent).toFixed(1)}% from last month`;

    changeElement.innerHTML = `<span>${arrow}</span><span>${text}</span>`;
  }

  /**
   * Add sparkline chart to KPI card
   */
  addSparkline(element, data, trend) {
    // Remove existing sparkline
    const existing = element.querySelector('.kpi-sparkline');
    if (existing) existing.remove();

    if (data.length === 0) return;

    const sparkline = document.createElement('div');
    sparkline.className = 'kpi-sparkline';

    const title = document.createElement('div');
    title.className = 'kpi-sparkline-title';
    title.textContent = '7-Day Trend';

    const chart = document.createElement('div');
    chart.className = 'kpi-sparkline-chart';

    // Normalize data for visualization
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    data.forEach((value, index) => {
      const bar = document.createElement('div');
      bar.className = 'kpi-sparkline-bar';
      
      // Calculate height as percentage
      const height = ((value - min) / range) * 100;
      bar.style.height = `${Math.max(height, 10)}%`;

      // Color based on trend
      if (index === data.length - 1) {
        bar.classList.add(trend > 0 ? 'positive' : trend < 0 ? 'negative' : '');
      }

      // Add tooltip on hover
      bar.title = `Day ${index + 1}: ${value}`;

      chart.appendChild(bar);
    });

    sparkline.appendChild(title);
    sparkline.appendChild(chart);

    // Insert after kpi-change
    const changeElement = element.querySelector('.kpi-change');
    if (changeElement) {
      changeElement.parentNode.insertBefore(sparkline, changeElement.nextSibling);
    } else {
      element.appendChild(sparkline);
    }
  }

  /**
   * Add details breakdown to KPI card
   */
  addDetailsBreakdown(element, current, previous) {
    // Remove existing details
    const existing = element.querySelector('.kpi-details');
    if (existing) existing.remove();

    const details = document.createElement('div');
    details.className = 'kpi-details';

    const currentDetail = document.createElement('div');
    currentDetail.className = 'kpi-detail-item';
    currentDetail.innerHTML = `
      <div class="kpi-detail-label">This Month</div>
      <div class="kpi-detail-value">${this.formatValue(current)}</div>
    `;

    const previousDetail = document.createElement('div');
    previousDetail.className = 'kpi-detail-item';
    previousDetail.innerHTML = `
      <div class="kpi-detail-label">Last Month</div>
      <div class="kpi-detail-value">${this.formatValue(previous)}</div>
    `;

    details.appendChild(currentDetail);
    details.appendChild(previousDetail);

    element.appendChild(details);
  }

  /**
   * Format value for display
   */
  formatValue(value) {
    if (value >= 1000000) {
      return `₹${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toFixed(0)}`;
  }

  /**
   * Add view details link to KPI card
   */
  addViewDetailsLink(cardId, label = 'View Details', href = '#') {
    const kpiData = this.kpiCards[cardId];
    if (!kpiData) return;

    const { element } = kpiData;

    // Remove existing link
    const existing = element.querySelector('.kpi-view-details');
    if (existing) existing.remove();

    const link = document.createElement('div');
    link.className = 'kpi-view-details';
    link.innerHTML = `
      <span>${label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;

    link.addEventListener('click', () => {
      window.location.href = href;
    });

    element.appendChild(link);
  }

  /**
   * Set KPI card status (positive, negative, neutral)
   */
  setCardStatus(cardId, status) {
    const kpiData = this.kpiCards[cardId];
    if (!kpiData) return;

    const { element } = kpiData;
    element.classList.remove('positive', 'negative', 'neutral');
    element.classList.add(status);
  }

  /**
   * Animate KPI value change
   */
  animateValueChange(cardId, newValue, duration = 1000) {
    const kpiData = this.kpiCards[cardId];
    if (!kpiData) return;

    const { element } = kpiData;
    const valueElement = element.querySelector('.kpi-value');
    if (!valueElement) return;

    const oldValue = parseFloat(valueElement.textContent.replace(/[^0-9.-]/g, ''));
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = oldValue + (newValue - oldValue) * progress;

      valueElement.textContent = this.formatValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Add tooltip to KPI card
   */
  setTooltip(cardId, tooltipText) {
    const kpiData = this.kpiCards[cardId];
    if (!kpiData) return;

    const { element } = kpiData;
    element.setAttribute('data-tooltip', tooltipText);
  }
}

// Export singleton instance
const kpiEnhancer = new KPIEnhancer();
export default kpiEnhancer;
