/**
 * Reports Page
 * Generate and download weekly/monthly financial reports
 */

import '../services/services-init.js';
import authService from '../services/auth-service.js';
import reportGeneratorService from '../services/report-generator-service.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';
import toast from '../components/toast.js';
import breadcrumbManager from '../utils/breadcrumbs.js';
import logger from '../utils/logger.js';

let currentUser = null;
let currentReportData = null;
let recentReports = [];

// Initialize page
async function init() {
  try {
    // Wait for auth
    currentUser = await authService.waitForAuth();
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    // Initialize breadcrumbs
    breadcrumbManager.setBreadcrumbs([
      { label: 'Dashboard', href: 'dashboard.html' },
      { label: 'Reports', href: null }
    ]);

    // Load user profile
    loadUserProfile();

    // Setup event listeners
    setupEventListeners();

    // Load recent reports from localStorage
    loadRecentReports();

    // Check if encryption reauth is needed
    await encryptionReauthModal.checkAndPrompt(async () => {
      logger.info('Reports page initialized');
    });
  } catch (error) {
    logger.error('Initialization error:', error);
    toast.show('Failed to initialize page', 'error');
  }
}

// Load user profile
function loadUserProfile() {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  if (userName) {
    userName.textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  }

  if (userEmail) {
    userEmail.textContent = currentUser.email || '';
  }

  if (userAvatar) {
    if (currentUser.photoURL) {
      userAvatar.innerHTML = `<img src="${currentUser.photoURL}" alt="User Avatar">`;
    } else {
      const initial = (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Generate report buttons
  document.querySelectorAll('.generate-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const type = e.currentTarget.dataset.type;
      await generateReport(type);
    });
  });

  // Custom range modal
  const customRangeBtn = document.getElementById('customRangeBtn');
  const customRangeModal = document.getElementById('customRangeModal');
  const closeCustomRange = document.getElementById('closeCustomRange');
  const cancelCustomRange = document.getElementById('cancelCustomRange');
  const generateCustomReport = document.getElementById('generateCustomReport');

  customRangeBtn?.addEventListener('click', () => {
    customRangeModal.classList.add('active');
    
    // Set default dates
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    document.getElementById('customStartDate').valueAsDate = startDate;
    document.getElementById('customEndDate').valueAsDate = endDate;
  });

  closeCustomRange?.addEventListener('click', () => {
    customRangeModal.classList.remove('active');
  });

  cancelCustomRange?.addEventListener('click', () => {
    customRangeModal.classList.remove('active');
  });

  generateCustomReport?.addEventListener('click', async () => {
    const startDate = document.getElementById('customStartDate').valueAsDate;
    const endDate = document.getElementById('customEndDate').valueAsDate;
    
    if (!startDate || !endDate) {
      toast.show('Please select both start and end dates', 'error');
      return;
    }
    
    if (startDate > endDate) {
      toast.show('Start date must be before end date', 'error');
      return;
    }
    
    customRangeModal.classList.remove('active');
    await generateReport('custom', startDate, endDate);
  });

  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  sidebarOpen?.addEventListener('click', () => {
    sidebar?.classList.add('active');
    sidebarOverlay?.classList.add('active');
  });

  sidebarClose?.addEventListener('click', () => {
    sidebar?.classList.remove('active');
    sidebarOverlay?.classList.remove('active');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar?.classList.remove('active');
    sidebarOverlay?.classList.remove('active');
  });
}

// Generate report
async function generateReport(type, customStart = null, customEnd = null) {
  try {
    showLoading();

    let startDate, endDate;
    
    if (type === 'custom' && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else {
      const dateRange = reportGeneratorService.getDateRangeForType(type);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Generate report data
    currentReportData = await reportGeneratorService.generateReportData(
      type === 'custom' ? 'custom' : type,
      startDate,
      endDate
    );

    // Save to recent reports
    const reportId = Date.now().toString();
    saveToRecentReports({
      id: reportId,
      type: type === 'custom' ? 'custom' : type,
      startDate,
      endDate,
      generatedAt: new Date(),
      summary: currentReportData.summary,
      data: currentReportData // Store full data for later download
    });

    hideLoading();
    toast.show('Report generated successfully! Click icons to download.', 'success');
    
    // Scroll to recent reports
    document.querySelector('.recent-reports')?.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    logger.error('Failed to generate report:', error);
    hideLoading();
    toast.show('Failed to generate report. Please try again.', 'error');
  }
}

// Download report as HTML
async function downloadReportHTML(reportData) {
  try {
    showLoading();
    
    const html = reportGeneratorService.generateHTMLReport(reportData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.type}-report-${reportData.period.start.toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    hideLoading();
    toast.show('HTML report downloaded successfully!', 'success');
  } catch (error) {
    logger.error('Failed to download HTML report:', error);
    hideLoading();
    toast.show('Failed to download report', 'error');
  }
}

// Download report as PDF
async function downloadReportPDF(reportData) {
  try {
    showLoading();
    
    await reportGeneratorService.downloadPDFReport(reportData);
    
    hideLoading();
    toast.show('PDF report downloaded successfully!', 'success');
  } catch (error) {
    logger.error('Failed to download PDF report:', error);
    hideLoading();
    toast.show('Failed to download PDF. Try HTML format instead.', 'error');
  }
}

// Save to recent reports
function saveToRecentReports(report) {
  recentReports.unshift(report);
  
  // Keep only last 10 reports
  if (recentReports.length > 10) {
    recentReports = recentReports.slice(0, 10);
  }
  
  // Save to localStorage
  try {
    localStorage.setItem('recentReports', JSON.stringify(recentReports));
    renderRecentReports();
  } catch (error) {
    logger.error('Failed to save recent reports:', error);
  }
}

// Load recent reports
function loadRecentReports() {
  try {
    const stored = localStorage.getItem('recentReports');
    if (stored) {
      recentReports = JSON.parse(stored);
      renderRecentReports();
    }
  } catch (error) {
    logger.error('Failed to load recent reports:', error);
  }
}

// Pagination state
let currentPage = 1;
const reportsPerPage = 5;

// Render recent reports
function renderRecentReports() {
  const container = document.getElementById('recentReportsList');
  
  if (recentReports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        📊
        <p>No reports generated yet</p>
        <p class="subtext">Generate your first report to see it here</p>
      </div>
    `;
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(recentReports.length / reportsPerPage);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const paginatedReports = recentReports.slice(startIndex, endIndex);
  
  container.innerHTML = `
    ${paginatedReports.map(report => {
      const date = new Date(report.generatedAt);
      const startDate = new Date(report.startDate);
      const endDate = new Date(report.endDate);
      
      return `
        <div class="report-item" data-report-id="${report.id}">
          <div class="report-icon">
            📅
          </div>
          <div class="report-info">
            <h4>${report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report</h4>
            <p class="report-date">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
            <p class="report-summary">
              Income: ₹${report.summary.totalIncome.toLocaleString()} | 
              Expenses: ₹${report.summary.totalExpenses.toLocaleString()} | 
              Savings: ₹${report.summary.netSavings.toLocaleString()}
            </p>
          </div>
          <div class="report-actions">
            <button class="report-action-btn" onclick="window.downloadReportFromList('${report.id}', 'html')" title="Download HTML">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              HTML
            </button>
            <button class="report-action-btn" onclick="window.downloadReportFromList('${report.id}', 'pdf')" title="Download PDF">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              PDF
            </button>
            <button class="report-action-btn delete-btn" onclick="window.deleteReport('${report.id}')" title="Delete Report">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Delete
            </button>
          </div>
          <div class="report-meta">
            <span class="report-time">${formatTimeAgo(date)}</span>
          </div>
        </div>
      `;
    }).join('')}
    
    ${totalPages > 1 ? `
      <div class="pagination">
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="window.changePage(${currentPage - 1})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Previous
        </button>
        <div class="pagination-info">
          Page ${currentPage} of ${totalPages}
        </div>
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.changePage(${currentPage + 1})">
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    ` : ''}
  `;
}

// Change page
window.changePage = function(page) {
  const totalPages = Math.ceil(recentReports.length / reportsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderRecentReports();
};

// Download report from list
window.downloadReportFromList = async function(reportId, format) {
  const report = recentReports.find(r => r.id === reportId);
  if (!report || !report.data) {
    toast.show('Report data not found', 'error');
    return;
  }
  
  if (format === 'html') {
    await downloadReportHTML(report.data);
  } else if (format === 'pdf') {
    await downloadReportPDF(report.data);
  }
};

// Delete report
window.deleteReport = function(reportId) {
  if (!confirm('Are you sure you want to delete this report?')) {
    return;
  }
  
  // Filter out the report
  const beforeLength = recentReports.length;
  recentReports = recentReports.filter(r => r.id !== reportId);
  const afterLength = recentReports.length;
  
  // Check if report was actually deleted
  if (beforeLength === afterLength) {
    toast.show('Report not found', 'error');
    return;
  }
  
  // Adjust current page if needed
  const totalPages = Math.ceil(recentReports.length / reportsPerPage);
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  } else if (recentReports.length === 0) {
    currentPage = 1;
  }
  
  // Save to localStorage
  try {
    localStorage.setItem('recentReports', JSON.stringify(recentReports));
    renderRecentReports();
    toast.show('Report deleted successfully', 'success');
  } catch (error) {
    logger.error('Failed to save recent reports:', error);
    toast.show('Failed to delete report', 'error');
  }
};

// Format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

// Show loading
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// Initialize on load
init();
