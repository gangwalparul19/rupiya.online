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

  // Preview actions
  const downloadHTML = document.getElementById('downloadHTML');
  const downloadPDF = document.getElementById('downloadPDF');
  const closePreview = document.getElementById('closePreview');

  downloadHTML?.addEventListener('click', async () => {
    if (currentReportData) {
      await downloadReportHTML();
    }
  });

  downloadPDF?.addEventListener('click', async () => {
    if (currentReportData) {
      await downloadReportPDF();
    }
  });

  closePreview?.addEventListener('click', () => {
    document.getElementById('reportPreview').style.display = 'none';
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

    // Generate HTML
    const html = reportGeneratorService.generateHTMLReport(currentReportData);

    // Show preview
    showPreview(html);

    // Save to recent reports
    saveToRecentReports({
      type: type === 'custom' ? 'custom' : type,
      startDate,
      endDate,
      generatedAt: new Date(),
      summary: currentReportData.summary
    });

    hideLoading();
    toast.show('Report generated successfully!', 'success');
  } catch (error) {
    logger.error('Failed to generate report:', error);
    hideLoading();
    toast.show('Failed to generate report. Please try again.', 'error');
  }
}

// Show preview
function showPreview(html) {
  const reportPreview = document.getElementById('reportPreview');
  const reportFrame = document.getElementById('reportFrame');
  
  reportPreview.style.display = 'block';
  
  // Create blob URL for iframe
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  reportFrame.src = url;
  
  // Scroll to preview
  reportPreview.scrollIntoView({ behavior: 'smooth' });
}

// Download report as HTML
async function downloadReportHTML() {
  try {
    showLoading();
    
    const html = reportGeneratorService.generateHTMLReport(currentReportData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReportData.type}-report-${currentReportData.period.start.toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    hideLoading();
    toast.show('Report downloaded successfully!', 'success');
  } catch (error) {
    logger.error('Failed to download HTML report:', error);
    hideLoading();
    toast.show('Failed to download report', 'error');
  }
}

// Download report as PDF
async function downloadReportPDF() {
  try {
    showLoading();
    
    await reportGeneratorService.downloadPDFReport(
      currentReportData.type,
      currentReportData.period.start,
      currentReportData.period.end
    );
    
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

// Render recent reports
function renderRecentReports() {
  const container = document.getElementById('recentReportsList');
  
  if (recentReports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-file-chart-line"></i>
        <p>No reports generated yet</p>
        <p class="subtext">Generate your first report to see it here</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recentReports.map(report => {
    const date = new Date(report.generatedAt);
    const startDate = new Date(report.startDate);
    const endDate = new Date(report.endDate);
    
    return `
      <div class="report-item">
        <div class="report-icon">
          <i class="fas fa-${report.type === 'weekly' ? 'calendar-week' : report.type === 'monthly' ? 'calendar-alt' : 'calendar-days'}"></i>
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
        <div class="report-meta">
          <span class="report-time">${formatTimeAgo(date)}</span>
        </div>
      </div>
    `;
  }).join('');
}

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
