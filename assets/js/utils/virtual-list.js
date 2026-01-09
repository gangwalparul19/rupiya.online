/**
 * Virtual List Utility
 * Implements virtualization for efficient rendering of large lists
 * Only renders visible items, dramatically improving performance
 */

class VirtualList {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.items = [];
    this.itemHeight = options.itemHeight || 50;
    this.bufferSize = options.bufferSize || 5; // Number of items to render outside viewport
    this.renderItem = options.renderItem || this.defaultRenderItem;
    
    this.scrollTop = 0;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.renderedStart = 0;
    this.renderedEnd = 0;
    
    this.viewport = null;
    this.content = null;
    this.scrollListener = null;
    
    this.init();
  }

  /**
   * Initialize virtual list structure
   * @private
   */
  init() {
    // Create viewport and content containers
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-list-viewport';
    this.viewport.style.cssText = `
      overflow-y: auto;
      overflow-x: hidden;
      height: 100%;
      position: relative;
    `;

    this.content = document.createElement('div');
    this.content.className = 'virtual-list-content';
    this.content.style.cssText = `
      position: relative;
      width: 100%;
    `;

    this.viewport.appendChild(this.content);
    
    // Replace container content with viewport
    this.container.innerHTML = '';
    this.container.appendChild(this.viewport);

    // Add scroll listener
    this.scrollListener = this.onScroll.bind(this);
    this.viewport.addEventListener('scroll', this.scrollListener);
  }

  /**
   * Set items to render
   * @param {Array} items - Array of items to render
   */
  setItems(items) {
    this.items = items;
    this.updateLayout();
    this.render();
  }

  /**
   * Update layout based on items
   * @private
   */
  updateLayout() {
    const totalHeight = this.items.length * this.itemHeight;
    this.content.style.height = `${totalHeight}px`;
  }

  /**
   * Handle scroll event
   * @private
   */
  onScroll() {
    this.scrollTop = this.viewport.scrollTop;
    this.updateVisibleRange();
    this.render();
  }

  /**
   * Update visible range based on scroll position
   * @private
   */
  updateVisibleRange() {
    const viewportHeight = this.viewport.clientHeight;
    
    // Calculate visible range
    this.visibleStart = Math.floor(this.scrollTop / this.itemHeight);
    this.visibleEnd = Math.ceil((this.scrollTop + viewportHeight) / this.itemHeight);
    
    // Add buffer
    this.renderedStart = Math.max(0, this.visibleStart - this.bufferSize);
    this.renderedEnd = Math.min(this.items.length, this.visibleEnd + this.bufferSize);
  }

  /**
   * Render visible items
   * @private
   */
  render() {
    // Clear existing items
    const existingItems = this.content.querySelectorAll('.virtual-list-item');
    existingItems.forEach(item => item.remove());

    // Render items in range
    for (let i = this.renderedStart; i < this.renderedEnd; i++) {
      const item = this.items[i];
      const itemElement = document.createElement('div');
      itemElement.className = 'virtual-list-item';
      itemElement.style.cssText = `
        position: absolute;
        top: ${i * this.itemHeight}px;
        left: 0;
        right: 0;
        height: ${this.itemHeight}px;
        overflow: hidden;
      `;

      // Render item content
      const content = this.renderItem(item, i);
      if (typeof content === 'string') {
        itemElement.innerHTML = content;
      } else {
        itemElement.appendChild(content);
      }

      this.content.appendChild(itemElement);
    }
  }

  /**
   * Default item renderer
   * @private
   */
  defaultRenderItem(item, index) {
    return `<div>${JSON.stringify(item)}</div>`;
  }

  /**
   * Scroll to item
   * @param {number} index - Index of item to scroll to
   */
  scrollToItem(index) {
    const targetScrollTop = index * this.itemHeight;
    this.viewport.scrollTop = targetScrollTop;
  }

  /**
   * Get current visible items
   * @returns {Array} Array of visible items
   */
  getVisibleItems() {
    return this.items.slice(this.visibleStart, this.visibleEnd);
  }

  /**
   * Get total item count
   * @returns {number} Total number of items
   */
  getItemCount() {
    return this.items.length;
  }

  /**
   * Destroy virtual list
   */
  destroy() {
    if (this.scrollListener) {
      this.viewport.removeEventListener('scroll', this.scrollListener);
    }
    this.container.innerHTML = '';
    this.items = [];
  }
}

export default VirtualList;
