// Performance Monitoring Service - Track app performance metrics
import logger from '../utils/logger.js';

class PerformanceMonitoringService {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      pageLoadTime: 3000, // 3 seconds
      encryptionTime: 1000, // 1 second
      firestoreQueryTime: 2000, // 2 seconds
      cacheHitRate: 0.7, // 70%
      errorRate: 0.01 // 1%
    };
    this.alerts = [];
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    
    // Monitor page load
    this.monitorPageLoad();
    
    // Monitor long tasks (with initial grace period to avoid startup alerts)
    setTimeout(() => {
      this.monitorLongTasks();
    }, 2000);
    
    // Monitor memory usage
    this.monitorMemory();
    
    logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    logger.info('Performance monitoring stopped');
  }

  /**
   * Record a metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   */
  recordMetric(name, value, metadata = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric = {
      value,
      timestamp: Date.now(),
      ...metadata
    };

    this.metrics.get(name).push(metric);

    // Check threshold
    if (this.thresholds[name] && value > this.thresholds[name]) {
      this.createAlert(`${name} exceeded threshold: ${value}ms > ${this.thresholds[name]}ms`);
    }

    logger.debug(`Metric recorded: ${name} = ${value}`);
  }

  /**
   * Record operation timing
   * @param {string} operationName - Operation name
   * @param {function} operation - Operation to time
   * @returns {*} - Operation result
   */
  async recordTiming(operationName, operation) {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.recordMetric(operationName, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`${operationName}_error`, duration);
      throw error;
    }
  }

  /**
   * Monitor page load performance
   */
  monitorPageLoad() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.recordPageLoadMetrics();
      });
    } else {
      this.recordPageLoadMetrics();
    }
  }

  /**
   * Record page load metrics
   */
  recordPageLoadMetrics() {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    const metrics = {
      navigationStart: timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      firstPaint: timing.responseEnd - timing.navigationStart
    };

    for (const [name, value] of Object.entries(metrics)) {
      if (value > 0) {
        this.recordMetric(`pageLoad_${name}`, value);
      }
    }

    logger.info('Page load metrics recorded', metrics);
  }

  /**
   * Monitor long tasks
   */
  monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('longTask', entry.duration, {
              name: entry.name,
              startTime: entry.startTime
            });
            this.createAlert(`Long task detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        logger.warn('Long task monitoring not supported:', error);
      }
    }
  }

  /**
   * Monitor memory usage
   */
  monitorMemory() {
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        this.recordMetric('memory_usage', usagePercent, {
          usedJSHeapSize: memory.usedJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });

        if (usagePercent > 90) {
          this.createAlert(`High memory usage: ${usagePercent.toFixed(2)}%`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Record encryption performance
   * @param {number} duration - Encryption duration in ms
   * @param {number} dataSize - Data size in bytes
   */
  recordEncryptionMetric(duration, dataSize) {
    this.recordMetric('encryption_time', duration, {
      dataSize,
      throughput: dataSize / (duration / 1000) // bytes per second
    });
  }

  /**
   * Record Firestore query performance
   * @param {string} collection - Collection name
   * @param {number} duration - Query duration in ms
   * @param {number} documentCount - Number of documents returned
   */
  recordFirestoreMetric(collection, duration, documentCount) {
    this.recordMetric('firestore_query', duration, {
      collection,
      documentCount,
      timePerDoc: duration / documentCount
    });
  }

  /**
   * Record cache hit/miss
   * @param {string} cacheType - Cache type
   * @param {boolean} isHit - Whether it was a hit
   */
  recordCacheMetric(cacheType, isHit) {
    const metricName = `cache_${cacheType}`;
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, { hits: 0, misses: 0 });
    }

    const cache = this.metrics.get(metricName);
    if (isHit) {
      cache.hits++;
    } else {
      cache.misses++;
    }

    const hitRate = cache.hits / (cache.hits + cache.misses);
    if (hitRate < this.thresholds.cacheHitRate) {
      this.createAlert(`Low cache hit rate for ${cacheType}: ${(hitRate * 100).toFixed(2)}%`);
    }
  }

  /**
   * Record error
   * @param {string} errorType - Error type
   * @param {string} message - Error message
   */
  recordError(errorType, message) {
    this.recordMetric('error', 1, {
      errorType,
      message
    });

    const totalErrors = this.getMetricCount('error');
    const errorRate = totalErrors / this.getMetricCount('total_operations');
    
    if (errorRate > this.thresholds.errorRate) {
      this.createAlert(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
    }
  }

  /**
   * Get metric statistics
   * @param {string} metricName - Metric name
   * @returns {object} - Statistics
   */
  getMetricStats(metricName) {
    if (!this.metrics.has(metricName)) {
      return null;
    }

    const values = this.metrics.get(metricName);
    if (!Array.isArray(values)) {
      return values;
    }

    const nums = values.map(m => m.value);
    const sorted = [...nums].sort((a, b) => a - b);

    return {
      count: nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics
   * @returns {object} - All metrics with statistics
   */
  getAllMetrics() {
    const result = {};
    
    for (const [name, values] of this.metrics) {
      if (Array.isArray(values)) {
        result[name] = this.getMetricStats(name);
      } else {
        result[name] = values;
      }
    }

    return result;
  }

  /**
   * Get metric count
   * @param {string} metricName - Metric name
   * @returns {number} - Count
   */
  getMetricCount(metricName) {
    if (!this.metrics.has(metricName)) {
      return 0;
    }

    const values = this.metrics.get(metricName);
    return Array.isArray(values) ? values.length : 0;
  }

  /**
   * Create performance alert
   * @param {string} message - Alert message
   */
  createAlert(message) {
    const alert = {
      message,
      timestamp: Date.now(),
      severity: 'warning'
    };

    this.alerts.push(alert);
    logger.warn('Performance alert:', message);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  /**
   * Get alerts
   * @returns {array} - Array of alerts
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Update threshold
   * @param {string} metricName - Metric name
   * @param {number} threshold - New threshold
   */
  updateThreshold(metricName, threshold) {
    this.thresholds[metricName] = threshold;
    logger.info(`Threshold updated: ${metricName} = ${threshold}`);
  }

  /**
   * Export metrics for analysis
   * @returns {object} - Metrics data
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      alerts: this.alerts,
      thresholds: this.thresholds
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.alerts = [];
    logger.info('All metrics cleared');
  }

  /**
   * Get performance report
   * @returns {object} - Performance report
   */
  getPerformanceReport() {
    const metrics = this.getAllMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMetrics: this.metrics.size,
        totalAlerts: this.alerts.length,
        isMonitoring: this.isMonitoring
      },
      performance: {
        pageLoad: metrics.pageLoad_loadComplete,
        encryption: metrics.encryption_time,
        firestore: metrics.firestore_query,
        memory: metrics.memory_usage
      },
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };

    return report;
  }
}

export default new PerformanceMonitoringService();
