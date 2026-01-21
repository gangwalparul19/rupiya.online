// Feedback Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import toast from '../components/toast.js';
import confirmationModal from '../components/confirmation-modal.js';

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
    
    if (!currentUser) {
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
async function initPage() {
    const user = await authService.waitForAuth();
  
  // Update user profile in sidebar
  loadUserProfile(user);
  
  // Setup event listeners
  setupEventListeners();
  
  // Pre-fill email if available
  const emailInput = document.getElementById('feedbackEmail');
  if (emailInput && currentUser && currentUser.email) {
    emailInput.value = currentUser.email;
  }
  
}

// load user profile
function loadUserProfile(user) {
  if (!user) return;
  
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  
  if (userName) {
    userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
  }
  
  if (userEmail) {
    userEmail.textContent = user.email || '';
  }
  
  if (userAvatar) {
    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
    } else {
      const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
      userAvatar.textContent = initial;
    }
  }
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

  // Logout handled by global logout-handler.js via sidebar.js

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
    const apiUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000/api/send-feedback'
      : 'https://rupiya.online/api/send-feedback';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData)
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response');
    }
    
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
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send feedback. ';
    if (error.message.includes('non-JSON')) {
      errorMessage += 'The feedback service is currently unavailable. Please try again later or contact us directly at help.rupiya@gmail.com';
    } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      errorMessage += 'Please check your internet connection and try again.';
    } else {
      errorMessage += 'Please try again or contact us at help.rupiya@gmail.com';
    }
    
    showToast(errorMessage, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}


// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
