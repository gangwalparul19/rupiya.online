// Feedback Page Logic
import authService from '../services/auth-service.js';
import toast from '../components/toast.js';

let currentUser = null;

// Check authentication
async function checkAuth() {
  currentUser = await authService.waitForAuth();
  if (!currentUser) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Initialize page
async function init() {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await initPage();
  }
}

// Initialize page
async function initPage() {
  // Update user profile
  updateUserProfile();
  
  // Setup event listeners
  setupEventListeners();
  
  // Pre-fill email if available
  const emailInput = document.getElementById('feedbackEmail');
  if (emailInput && currentUser.email) {
    emailInput.value = currentUser.email;
  }
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
  const submitBtnText = document.getElementById('submitBtnText');
  const submitBtnSpinner = document.getElementById('submitBtnSpinner');
  
  // Get form values
  const feedbackType = document.getElementById('feedbackType').value;
  const feedbackSubject = document.getElementById('feedbackSubject').value;
  const feedbackMessage = document.getElementById('feedbackMessage').value;
  const feedbackEmail = document.getElementById('feedbackEmail').value || currentUser.email;
  
  // Validate
  if (!feedbackType || !feedbackSubject || !feedbackMessage) {
    toast.error('Please fill in all required fields');
    return;
  }
  
  // Show loading
  submitBtn.disabled = true;
  submitBtnText.style.display = 'none';
  submitBtnSpinner.style.display = 'inline-block';
  
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
      toast.success('Feedback sent successfully!');
      
      // Scroll to success message
      document.getElementById('feedbackSuccess').scrollIntoView({ behavior: 'smooth' });
    } else {
      toast.error(result.error || 'Failed to send feedback');
    }
    
  } catch (error) {
    console.error('Error sending feedback:', error);
    toast.error('Failed to send feedback. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtnText.style.display = 'inline';
    submitBtnSpinner.style.display = 'none';
  }
}

// Logout
async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    toast.error('Failed to logout');
  }
}

// Start initialization
init();
