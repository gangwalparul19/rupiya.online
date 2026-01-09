// Chart Enhancements Utility
// Provides interactive chart features and improvements

class ChartEnhancements {
  constructor() {
    this.charts = new Map();
    this.chartTypes = ['pie', 'bar', 'line', 'area'];
  }

  /**
   * Create enhanced chart with interactive features
   * @param {string} containerId - Container element ID
   * @param {Object} config - Chart configuration
   * @returns {Object} Chart instance
   */
  createEnhancedChart(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return null;
    }

    // Create chart wrapper with controls
    const wrapper = this.createChartWrapper(containerId, config);
    container.appendChild(wrapper);

    // Store chart reference
    const chartId = `chart_${containerId}`;
    this.charts.set(chartId, {
      containerId,
      config,
      currentType: config.type || 'pie',
      wrapper
    });

    return this.charts.get(chartId);
  }

  /**
   * Create chart wrapper with controls
   */
  createChartWrapper(containerId, config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    wrapper.innerHTML = `
      <div class="chart-controls">
        <div class="chart-type-selector">
          ${this.chartTypes.map(type => `
            <button class="chart-type-btn ${type === (config.type || 'pie') ? 'active' : ''}" 
                    data-type="${type}" 
                    title="Switch to ${type} chart">
              ${this.getChartTypeIcon(type)}
            </button>
          `).join('')}
        </div>
        <div class="chart-actions">
          <button class="chart-action-btn" id="chart-export-${containerId}" title="Export as image">
            📥
          </button>
          <button class="chart-action-btn" id="chart-fullscreen-${containerId}" title="Fullscreen">
            ⛶
          </button>
        </div>
      </div>
      <div class="chart-date-range">
        <input type="date" class="chart-date-input" id="chart-start-${containerId}">
        <span class="chart-date-separator">to</span>
        <input type="date" class="chart-date-input" id="chart-end-${containerId}">
        <button class="chart-apply-btn" id="chart-apply-${containerId}">Apply</button>
      </div>
      <div class="chart-container" id="chart-${containerId}"></div>
      <div class="chart-legend" id="legend-${containerId}"></div>
    `;

    // Bind events
    this.bindChartEvents(wrapper, containerId, config);

    return wrapper;
  }

  /**
   * Bind chart control events
   */
  bindChartEvents(wrapper, containerId, config) {
    // Chart type selector
    wrapper.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchChartType(containerId, e.target.dataset.type);
      });
    });

    // Export button
    const exportBtn = wrapper.querySelector(`#chart-export-${containerId}`);
    exportBtn?.addEventListener('click', () => this.exportChart(containerId));

    // Fullscreen button
    const fullscreenBtn = wrapper.querySelector(`#chart-fullscreen-${containerId}`);
    fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen(containerId));

    // Date range apply
    const applyBtn = wrapper.querySelector(`#chart-apply-${containerId}`);
    applyBtn?.addEventListener('click', () => this.applyDateRange(containerId));
  }

  /**
   * Switch chart type
   */
  switchChartType(containerId, newType) {
    const chartId = `chart_${containerId}`;
    const chart = this.charts.get(chartId);
    if (!chart) return;

    chart.currentType = newType;

    // Update button states
    const wrapper = chart.wrapper;
    wrapper.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === newType);
    });

    // Re-render chart with new type
    this.renderChart(containerId, newType);
  }

  /**
   * Render chart with specified type
   */
  renderChart(containerId, chartType) {
    const chartContainer = document.getElementById(`chart-${containerId}`);
    if (!chartContainer) return;

    // Clear previous chart
    chartContainer.innerHTML = '';

    // Create chart based on type
    const chartData = this.generateChartData(chartType);
    this.drawChart(chartContainer, chartData, chartType);
  }

  /**
   * Generate chart data
   */
  generateChartData(chartType) {
    // This would be replaced with actual data
    return {
      labels: ['Category A', 'Category B', 'Category C', 'Category D'],
      datasets: [{
        label: 'Amount',
        data: [300, 150, 200, 100],
        backgroundColor: [
          'rgba(74, 144, 226, 0.8)',
          'rgba(46, 204, 113, 0.8)',
          'rgba(241, 196, 15, 0.8)',
          'rgba(231, 76, 60, 0.8)'
        ]
      }]
    };
  }

  /**
   * Draw chart
   */
  drawChart(container, data, chartType) {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Simple chart rendering (would use Chart.js in production)
    this.renderSimpleChart(canvas, data, chartType);
  }

  /**
   * Render simple chart (fallback)
   */
  renderSimpleChart(canvas, data, chartType) {
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.offsetWidth;
    const height = 300;

    canvas.width = width;
    canvas.height = height;

    switch (chartType) {
      case 'pie':
        this.drawPieChart(ctx, data, width, height);
        break;
      case 'bar':
        this.drawBarChart(ctx, data, width, height);
        break;
      case 'line':
        this.drawLineChart(ctx, data, width, height);
        break;
      case 'area':
        this.drawAreaChart(ctx, data, width, height);
        break;
    }
  }

  /**
   * Draw pie chart
   */
  drawPieChart(ctx, data, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    let currentAngle = -Math.PI / 2;

    data.datasets[0].data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;

      ctx.fillStyle = data.datasets[0].backgroundColor[index];
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fill();

      currentAngle += sliceAngle;
    });
  }

  /**
   * Draw bar chart
   */
  drawBarChart(ctx, data, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const barWidth = chartWidth / data.labels.length * 0.8;
    const barSpacing = chartWidth / data.labels.length;

    const maxValue = Math.max(...data.datasets[0].data);
    const scale = chartHeight / maxValue;

    data.datasets[0].data.forEach((value, index) => {
      const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
      const barHeight = value * scale;
      const y = height - padding - barHeight;

      ctx.fillStyle = data.datasets[0].backgroundColor[index];
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  /**
   * Draw line chart
   */
  drawLineChart(ctx, data, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const maxValue = Math.max(...data.datasets[0].data);
    const scale = chartHeight / maxValue;

    ctx.strokeStyle = data.datasets[0].backgroundColor[0];
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.datasets[0].data.forEach((value, index) => {
      const x = padding + (index / (data.datasets[0].data.length - 1)) * chartWidth;
      const y = height - padding - value * scale;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  /**
   * Draw area chart
   */
  drawAreaChart(ctx, data, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const maxValue = Math.max(...data.datasets[0].data);
    const scale = chartHeight / maxValue;

    ctx.fillStyle = data.datasets[0].backgroundColor[0];
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);

    data.datasets[0].data.forEach((value, index) => {
      const x = padding + (index / (data.datasets[0].data.length - 1)) * chartWidth;
      const y = height - padding - value * scale;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width - padding, height - padding);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = data.datasets[0].backgroundColor[0];
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.datasets[0].data.forEach((value, index) => {
      const x = padding + (index / (data.datasets[0].data.length - 1)) * chartWidth;
      const y = height - padding - value * scale;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  /**
   * Export chart as image
   */
  exportChart(containerId) {
    const canvas = document.querySelector(`#chart-${containerId} canvas`);
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `chart-${Date.now()}.png`;
    link.click();
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen(containerId) {
    const wrapper = document.querySelector(`#chart-${containerId}`).closest('.chart-wrapper');
    if (!wrapper) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapper.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    }
  }

  /**
   * Apply date range filter
   */
  applyDateRange(containerId) {
    const startInput = document.querySelector(`#chart-start-${containerId}`);
    const endInput = document.querySelector(`#chart-end-${containerId}`);

    if (!startInput || !endInput) return;

    const startDate = new Date(startInput.value);
    const endDate = new Date(endInput.value);

    if (startDate > endDate) {
      alert('Start date must be before end date');
      return;
    }

    // Trigger date range change event
    const event = new CustomEvent('chartDateRangeChanged', {
      detail: { startDate, endDate, containerId }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get chart type icon
   */
  getChartTypeIcon(type) {
    const icons = {
      pie: '🥧',
      bar: '📊',
      line: '📈',
      area: '📉'
    };
    return icons[type] || '📊';
  }

  /**
   * Add tooltip to chart
   */
  addChartTooltip(canvas, data) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate which data point is hovered
      // This would be more complex with actual chart library
    });
  }
}

// Create and export singleton instance
const chartEnhancements = new ChartEnhancements();
export default chartEnhancements;
