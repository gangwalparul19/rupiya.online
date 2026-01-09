/**
 * Pagination Helper Utility
 * Provides utilities for efficient pagination and data slicing
 */

class PaginationHelper {
  /**
   * Calculate pagination info
   * @param {number} totalItems - Total number of items
   * @param {number} pageSize - Items per page
   * @param {number} currentPage - Current page number (1-indexed)
   * @returns {Object} Pagination info
   */
  static calculatePagination(totalItems, pageSize, currentPage) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const validPage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (validPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    return {
      currentPage: validPage,
      pageSize,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      itemsOnPage: endIndex - startIndex,
      hasNextPage: validPage < totalPages,
      hasPreviousPage: validPage > 1,
      isFirstPage: validPage === 1,
      isLastPage: validPage === totalPages
    };
  }

  /**
   * Slice array based on pagination
   * @param {Array} items - Array to slice
   * @param {number} pageSize - Items per page
   * @param {number} currentPage - Current page number (1-indexed)
   * @returns {Array} Sliced array
   */
  static getPageItems(items, pageSize, currentPage) {
    const pagination = this.calculatePagination(items.length, pageSize, currentPage);
    return items.slice(pagination.startIndex, pagination.endIndex);
  }

  /**
   * Generate page numbers for pagination controls
   * @param {number} currentPage - Current page number
   * @param {number} totalPages - Total number of pages
   * @param {number} maxVisible - Maximum page numbers to show (default: 5)
   * @returns {Array} Array of page numbers to display
   */
  static getPageNumbers(currentPage, totalPages, maxVisible = 5) {
    const pages = [];
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate range around current page
      const halfVisible = Math.floor(maxVisible / 2);
      let start = Math.max(1, currentPage - halfVisible);
      let end = Math.min(totalPages, start + maxVisible - 1);

      // Adjust if we're near the end
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }

      // Add first page if not visible
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }

      // Add page range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add last page if not visible
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }

    return pages;
  }

  /**
   * Create pagination state object
   * @param {Array} items - Array of items
   * @param {number} pageSize - Items per page
   * @param {number} currentPage - Current page number
   * @returns {Object} Pagination state
   */
  static createPaginationState(items, pageSize, currentPage) {
    const pagination = this.calculatePagination(items.length, pageSize, currentPage);
    const pageItems = items.slice(pagination.startIndex, pagination.endIndex);
    const pageNumbers = this.getPageNumbers(currentPage, pagination.totalPages);

    return {
      ...pagination,
      items: pageItems,
      pageNumbers
    };
  }

  /**
   * Validate page number
   * @param {number} pageNumber - Page number to validate
   * @param {number} totalPages - Total number of pages
   * @returns {number} Valid page number
   */
  static validatePageNumber(pageNumber, totalPages) {
    return Math.max(1, Math.min(pageNumber, totalPages));
  }

  /**
   * Calculate optimal page size based on container height
   * @param {HTMLElement} container - Container element
   * @param {number} itemHeight - Height of each item in pixels
   * @returns {number} Recommended page size
   */
  static calculateOptimalPageSize(container, itemHeight) {
    const containerHeight = container.clientHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    // Add buffer for smooth scrolling
    return Math.max(10, visibleItems + 5);
  }
}

export default PaginationHelper;
