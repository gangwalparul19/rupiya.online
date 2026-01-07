// Feedback Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import toast from '../components/toast.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let currentUser = null;

// Check if Firebase is properly configured
function isFirebaseConfigured() {
  const env = window.__ENV__;
  if (!env) {
    console.error('[Feedback] window.__ENV__ not found - build.js may not have run');
    return false;
  }
  if (!env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY === '' || env.VITE_FIREBASE_API_KEY.includes('YOUR_')) {
    console.error('[Feedback] Firebase API key not configured');
    return false;
  }
  return true;
}

// Show configuration error
function showConfigError() {
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h2 style="color: #e74c3c; margin-bottom: 1rem;">⚠️ Configuration Error</h2>
        <p style="margin-bottom: 1rem;">Firebase is not configured. This usually means the app needs to be redeployed.</p>
        <p style="color: #666; font-size: 0.9rem;">If you're the developer, please redeploy to Vercel to inject environment variables.</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer;">Retry</button>
      </div>
    `;
  }
}

// Initialize
async function init() {
  console.log('[Feedback] Starting init...');
  
  // Check if Firebase is configured
  if (!isFirebaseConfigured()) {
    console.error('[Feedback] Firebase not configured, showing error');
    showConfigError();
    return;
  }
  
  try {
    // Add a small delay to ensure Firebase is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    currentUser = await authService.waitForAuth();
    console.log('[Feedback] Auth result:', currentUser ? currentUser.email : 'null');
    
    if (!currentUser) {
      console.log('[Feedback] No user, redirecting...');
      window.location.href = 'login.html';
      return;
    }
    
    // User is authenticated, initialize page
    initPage();
    
  } catch (error) {
    console.error('[Feedback] Init error:', error);
    // Show error instead of redirecting
    showConfigError();
  }
}

// Initialize page after auth
function initPage() {
  console.log('[Feedback] Initializing page...');
  
  // Update user profile in sidebar
  updateUserProfile();
  
  // Setup event listeners
  setupEventListeners();
  
  // Pre-fill email if available
  const emailInput = document.getElementById('feedbackEmail');
  if (emailInput && currentUser && currentUser.email) {
    emailInput.value = currentUser.email;
  }
  
  console.log('[Feedback] Page initialized successfully');
}

// Update user profile
function updateUserProfile() {
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  if (userAvatar) {
    const initials = currentUser.displayName 
      ? currentUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : currentUser.email[0].toUpperCase();
    userAvatar.textContent = initials;
  }

  if (userName) userName.textContent = currentUser.displayName || 'User';
  if (userEmail) userEmail.textContent = currentUser.email;
}

// Setup event listeners
function setupEventListeners() {
  // Sidebar toggle
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  sidebarOpen?.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
  });

  sidebarClose?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  sidebarOverlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Feedback form
  const feedbackForm = document.getElementById('feedbackForm');
  feedbackForm?.addEventListener('submit', handleFeedbackSubmit);

  // Cancel button
  document.getElementById('cancelFeedbackBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? Your feedback will be lost.')) {
      feedbackForm.reset();
      updateCharCount();
    }
  });

  // Send another button
  document.getElementById('sendAnotherBtn')?.addEventListener('click', () => {
    document.getElementById('feedbackSuccess').style.display = 'none';
    document.getElementById('feedbackForm').style.display = 'block';
    feedbackForm.reset();
    updateCharCount();
  });

  // Character counter
  const feedbackMessage = document.getElementById('feedbackMessage');
  feedbackMessage?.addEventListener('input', updateCharCount);
}

// Update character count
function updateCharCount() {
  const feedbackMessage = document.getElementById('feedbackMessage');
  const charCount = document.getElementById('charCount');
  
  if (feedbackMessage && charCount) {
    const count = feedbackMessage.value.length;
    charCount.textContent = count;
    
    // Change color if approaching limit
    if (count > 1800) {
      charCount.style.color = '#e74c3c';
    } else if (count > 1500) {
      charCount.style.color = '#f39c12';
    } else {
      charCount.style.color = 'var(--primary-blue)';
    }
  }
}

// Handle feedback submission
async function handleFeedbackSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitFeedbackBtn');
  
  // Get form values
  const feedbackType = document.getElementById('feedbackType').value;
  const feedbackSubject = document.getElementById('feedbackSubject').value;
  const feedbackMessage = document.getElementById('feedbackMessage').value;
  const feedbackEmail = document.getElementById('feedbackEmail').value || currentUser.email;
  
  // Validate
  if (!feedbackType || !feedbackSubject || !feedbackMessage) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Show loading
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  
  try {
    // Prepare feedback data
    const feedbackData = {
      type: feedbackType,
      subject: feedbackSubject,
      message: feedbackMessage,
      email: feedbackEmail,
      userName: currentUser.displayName || 'User',
      userId: currentUser.uid,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // Send to API
    const response = await fetch('/api/send-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Show success message
      document.getElementById('feedbackForm').style.display = 'none';
      document.getElementById('feedbackSuccess').style.display = 'block';
      showToast('Feedback sent successfully!', 'success');
      
      // Scroll to success message
      document.getElementById('feedbackSuccess').scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast(result.error || 'Failed to send feedback', 'error');
    }
    
  } catch (error) {
    console.error('Error sending feedback:', error);
    showToast('Failed to send feedback. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Logout
async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    showToast('Failed to logout', 'error');
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
