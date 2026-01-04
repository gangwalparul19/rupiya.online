// Reusable Pagination Component
// Provides consistent pagination UI across the app

class Pagination {
  constructor(options = {}) {
    this.currentPage = 1;
    this.pageSize = options.pageSize || 10;
    this.totalItems = 0;
    this.totalPages = 0;
    this.onPageChange = options.onPageChange || (() => {});
    this.containerId = options.containerId || 'paginationContainer';
    this.showInfo = options.showInfo !== false;
    this.maxVisiblePages = options.maxVisiblePages || 5;
  }

  setTotal(total) {
    this.totalItems = total;
    this.totalPages = Math.ceil(total / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  setPage(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.onPageChange(page);
      this.render();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.setPage(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.setPage(this.currentPage - 1);
    }
  }

  getVisiblePages() {
    const pages = [];
    const half = Math.floor(this.maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);
    
    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (this.totalPages <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    const visiblePages = this.getVisiblePages();
    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);

    container.innerHTML = `
      <div class="pagination-wrapper">
        ${this.showInfo ? `
          <div class="pagination-info">
            Showing ${startItem}-${endItem} of ${this.totalItems}
          </div>
        ` : ''}
        <div class="pagination-controls">
          <button class="pagination-btn pagination-prev" ${this.currentPage === 1 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          
          ${visiblePages[0] > 1 ? `
            <button class="pagination-btn pagination-page" data-page="1">1</button>
            ${visiblePages[0] > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
          ` : ''}
          
          ${visiblePages.map(page => `
            <button class="pagination-btn pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}">
              ${page}
            </button>
          `).join('')}
          
          ${visiblePages[visiblePages.length - 1] < this.totalPages ? `
            ${visiblePages[visiblePages.length - 1] < this.totalPages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
            <button class="pagination-btn pagination-page" data-page="${this.totalPages}">${this.totalPages}</button>
          ` : ''}
          
          <button class="pagination-btn pagination-next" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Attach event listeners
    container.querySelector('.pagination-prev')?.addEventListener('click', () => this.prevPage());
    container.querySelector('.pagination-next')?.addEventListener('click', () => this.nextPage());
    container.querySelectorAll('.pagination-page').forEach(btn => {
      btn.addEventListener('click', () => this.setPage(parseInt(btn.dataset.page)));
    });
  }

  reset() {
    this.currentPage = 1;
    this.totalItems = 0;
    this.totalPages = 0;
  }
}

// CSS styles for pagination (inject once)
const paginationStyles = `
.pagination-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
}

.pagination-info {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 0.5rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #333);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--hover-bg, #f5f5f5);
  border-color: var(--primary-blue, #4A90E2);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn.active {
  background: var(--primary-blue, #4A90E2);
  border-color: var(--primary-blue, #4A90E2);
  color: white;
}

.pagination-ellipsis {
  padding: 0 0.5rem;
  color: var(--text-secondary, #666);
}

@media (max-width: 480px) {
  .pagination-btn {
    min-width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }
  
  .pagination-info {
    font-size: 0.75rem;
  }
}
`;

// Inject styles once
if (!document.getElementById('pagination-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'pagination-styles';
  styleEl.textContent = paginationStyles;
  document.head.appendChild(styleEl);
}

export default Pagination;