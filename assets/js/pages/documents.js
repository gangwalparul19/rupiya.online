// Documents Page Logic
import '../services/services-init.js'; // Initialize services first
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import storageService from '../services/storage-service.js';
import smartDocumentService from '../services/smart-document-service.js';
import toast from '../components/toast.js';
import Pagination from '../components/pagination.js';
import { formatDate, escapeHtml, formatDateForInput } from '../utils/helpers.js';
import timezoneService from '../utils/timezone.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let documents = [];
let filteredDocuments = [];
let editingDocumentId = null;

// Pagination state
let pagination = null;
let allLoadedDocuments = []; // Cache for client-side filtering

let addDocumentBtn, addDocumentSection, closeFormBtn, cancelFormBtn;
let documentForm, formTitle, saveFormBtn;
let documentsList, emptyState, loadingState;
let totalDocumentsEl, totalCategoriesEl, storageUsedEl;
let searchInput, categoryFilter;
let fileInput, uploadProgress, progressFill, progressText;
let currentFileGroup, currentFileName, currentFileLink;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteDocumentName;
let deleteDocumentId = null;

// Smart document elements
let expiryDateInput, reminderDaysInput, linkedAssetSelect;
let expiringDocumentsEl, expiredDocumentsEl;

async function init() {
  try {
    const user = await authService.waitForAuth();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Check if encryption reauth is needed
    await encryptionReauthModal.checkAndPrompt(async () => {
      await loadDocuments();
    });

    initDOMElements();
    setupEventListeners();
    loadUserProfile(user);
    await loadDocuments();
    
    // Set default date if element exists
    const documentDateInput = document.getElementById('documentDate');
    if (documentDateInput) {
      documentDateInput.valueAsDate = new Date();
    }
  } catch (error) {
    console.error('[Documents] Error initializing page:', error);
  }
}

function initDOMElements() {
  addDocumentBtn = document.getElementById('addDocumentBtn');
  addDocumentSection = document.getElementById('addDocumentSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  documentForm = document.getElementById('documentForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  documentsList = document.getElementById('documentsList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalDocumentsEl = document.getElementById('totalDocuments');
  totalCategoriesEl = document.getElementById('totalCategories');
  storageUsedEl = document.getElementById('storageUsed');
  searchInput = document.getElementById('searchInput');
  categoryFilter = document.getElementById('categoryFilter');
  fileInput = document.getElementById('fileInput');
  uploadProgress = document.getElementById('uploadProgress');
  progressFill = document.getElementById('progressFill');
  progressText = document.getElementById('progressText');
  currentFileGroup = document.getElementById('currentFileGroup');
  currentFileName = document.getElementById('currentFileName');
  currentFileLink = document.getElementById('currentFileLink');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteDocumentName = document.getElementById('deleteDocumentName');
  
  // Smart document elements
  expiryDateInput = document.getElementById('expiryDate');
  reminderDaysInput = document.getElementById('reminderDays');
  linkedAssetSelect = document.getElementById('linkedAsset');
  expiringDocumentsEl = document.getElementById('expiringDocuments');
  expiredDocumentsEl = document.getElementById('expiredDocuments');
}

function setupEventListeners() {
  const sidebarOpen = document.getElementById('sidebarOpen');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

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

  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  addDocumentBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  documentForm.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', handleSearch);
  categoryFilter.addEventListener('change', handleFilter);
  closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
  cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  confirmDeleteBtn.addEventListener('click', handleDelete);
  
  // Smart document event listeners
  const nameInput = document.getElementById('name');
  const categorySelect = document.getElementById('category');
  
  // Auto-suggest category on name input
  nameInput?.addEventListener('input', debounce(() => {
    const name = nameInput.value.trim();
    const fileName = fileInput?.files[0]?.name || '';
    if (name.length >= 3 && !categorySelect.value) {
      const suggestion = smartDocumentService.suggestCategory(name, '', fileName);
      if (suggestion.category !== 'Other' && suggestion.confidence >= 0.3) {
        showCategorySuggestion(suggestion);
      } else {
        hideCategorySuggestion();
      }
    } else {
      hideCategorySuggestion();
    }
  }, 300));
  
  // Load linkable assets when category changes
  categorySelect?.addEventListener('change', async () => {
    const category = categorySelect.value;
    await loadLinkableAssets(category);
    
    // Suggest expiry date based on category
    const expiryInfo = smartDocumentService.suggestExpiryDate(category);
    if (expiryInfo.hasExpiry && expiryDateInput) {
      const suggestedDate = expiryInfo.suggestedExpiryDate;
      expiryDateInput.value = formatDateForInput(suggestedDate);
      if (reminderDaysInput) {
        reminderDaysInput.value = expiryInfo.defaultReminderDays;
      }
    }
    
    hideCategorySuggestion();
  });
  
  // Auto-suggest category from file name
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file && !categorySelect.value) {
      const suggestion = smartDocumentService.suggestCategory(nameInput.value || '', '', file.name);
      if (suggestion.category !== 'Other' && suggestion.confidence >= 0.3) {
        showCategorySuggestion(suggestion);
      }
    }
  });
}

function loadUserProfile(user) {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  if (userName) userName.textContent = user.displayName || 'User';
  if (userEmail) userEmail.textContent = user.email;
  if (userAvatar) {
    userAvatar.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
  }
}

function showAddForm() {
  editingDocumentId = null;
  uploadedFile = null;
  formTitle.textContent = 'Add Document';
  saveFormBtn.textContent = 'Save Document';
  documentForm.reset();
  
  // Reset button state
  saveFormBtn.disabled = false;
  
  // Set default date if element exists
  const documentDateInput = document.getElementById('documentDate');
  if (documentDateInput) {
    documentDateInput.valueAsDate = new Date();
  }
  
  uploadProgress.style.display = 'none';
  currentFileGroup.style.display = 'none';
  fileInput.required = true;
  addDocumentSection.classList.add('show');
  addDocumentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  addDocumentSection.classList.remove('show');
  documentForm.reset();
  editingDocumentId = null;
  uploadedFile = null;
  uploadProgress.style.display = 'none';
  currentFileGroup.style.display = 'none';
}

function showEditForm(doc) {
  editingDocumentId = doc.id;
  uploadedFile = null;
  formTitle.textContent = 'Edit Document';
  saveFormBtn.textContent = 'Update Document';

  // Reset button state
  saveFormBtn.disabled = false;

  document.getElementById('name').value = doc.name;
  document.getElementById('category').value = doc.category;
  document.getElementById('documentDate').value = doc.documentDate ? formatDateForInput(doc.documentDate) : '';
  document.getElementById('description').value = doc.description || '';
  
  // Populate expiry fields
  const expiryDateEl = document.getElementById('expiryDate');
  const reminderDaysEl = document.getElementById('reminderDays');
  if (expiryDateEl && doc.expiryDate) {
    const expiry = doc.expiryDate.toDate ? doc.expiryDate.toDate() : new Date(doc.expiryDate);
    expiryDateEl.value = formatDateForInput(expiry);
  } else if (expiryDateEl) {
    expiryDateEl.value = '';
  }
  if (reminderDaysEl) {
    reminderDaysEl.value = doc.reminderDays || 30;
  }
  
  // Load linkable assets and set selected
  loadLinkableAssets(doc.category).then(() => {
    const linkedAssetEl = document.getElementById('linkedAsset');
    if (linkedAssetEl && doc.linkedAssetType && doc.linkedAssetId) {
      linkedAssetEl.value = `${doc.linkedAssetType}:${doc.linkedAssetId}`;
    }
  });
  
  // Show current file
  if (doc.fileUrl) {
    currentFileGroup.style.display = 'block';
    currentFileName.textContent = doc.fileName || 'View File';
    currentFileLink.href = doc.fileUrl;
    fileInput.required = false;
  }
  
  uploadProgress.style.display = 'none';

  addDocumentSection.classList.add('show');
  addDocumentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(e) {
  e.preventDefault();

  // Check if file is selected for new documents
  const file = fileInput.files[0];
  if (!editingDocumentId && !file) {
    showToast('Please select a file to upload', 'error');
    return;
  }

  const originalText = saveFormBtn.textContent;
  saveFormBtn.disabled = true;
  saveFormBtn.textContent = 'Saving...';

  try {
    let fileUrl = null;
    let filePath = null;
    let fileName = null;
    let fileSize = null;
    let fileType = null;

    // Upload file if selected
    if (file) {
      uploadProgress.style.display = 'block';
      
      const uploadResult = await storageService.uploadFile(
        file,
        'documents',
        (progress) => {
          progressFill.style.width = `${progress}%`;
          progressText.textContent = `${Math.round(progress)}%`;
        }
      );

      if (!uploadResult.success) {
        showToast(uploadResult.error || 'Failed to upload file', 'error');
        return;
      }

      fileUrl = uploadResult.url;
      filePath = uploadResult.path;
      fileName = uploadResult.name;
      fileSize = uploadResult.size;
      fileType = uploadResult.type;
    }

    const formData = {
      name: document.getElementById('name').value.trim(),
      category: document.getElementById('category').value,
      documentDate: document.getElementById('documentDate').value ? timezoneService.parseInputDate(document.getElementById('documentDate').value) : null,
      description: document.getElementById('description').value.trim()
    };

    // Add file data if uploaded
    if (fileUrl) {
      formData.fileUrl = fileUrl;
      formData.filePath = filePath;
      formData.fileName = fileName;
      formData.fileSize = fileSize;
      formData.fileType = fileType;
    }

    // Add expiry date if set
    const expiryDateValue = document.getElementById('expiryDate')?.value;
    if (expiryDateValue) {
      formData.expiryDate = timezoneService.parseInputDate(expiryDateValue);
      const reminderDays = parseInt(document.getElementById('reminderDays')?.value) || 30;
      formData.reminderDays = reminderDays;
      
      // Calculate reminder date
      const reminderDate = new Date(formData.expiryDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);
      formData.reminderDate = reminderDate;
    }

    // Add linked asset if selected
    const linkedAssetValue = document.getElementById('linkedAsset')?.value;
    if (linkedAssetValue) {
      const [assetType, assetId] = linkedAssetValue.split(':');
      formData.linkedAssetType = assetType;
      formData.linkedAssetId = assetId;
    }

    let result;
    if (editingDocumentId) {
      // If editing and new file uploaded, delete old file
      if (fileUrl) {
        const oldDoc = documents.find(d => d.id === editingDocumentId);
        if (oldDoc && oldDoc.filePath) {
          await storageService.deleteFile(oldDoc.filePath);
        }
      }
      
      result = await firestoreService.update('documents', editingDocumentId, formData);
      if (result.success) showToast('Document updated successfully', 'success');
    } else {
      result = await firestoreService.add('documents', formData);
      if (result.success) showToast('Document added successfully', 'success');
    }

    if (result.success) {
      hideForm();
      allLoadedDocuments = []; // Clear cache to reload fresh data
      await loadDocuments();
    } else {
      showToast(result.error || 'Failed to save document', 'error');
    }
  } catch (error) {
    console.error('Error saving document:', error);
    showToast('Failed to save document', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtn.textContent = originalText;
    uploadProgress.style.display = 'none';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';
  }
}

async function loadDocuments() {
  loadingState.style.display = 'flex';
  documentsList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    // Get total count for pagination
    const totalCount = await firestoreService.getCount('documents');
    
    // Initialize pagination if not already done
    if (!pagination) {
      pagination = new Pagination({
        pageSize: 12, // 12 documents per page for grid layout
        containerId: 'paginationContainer',
        onPageChange: handlePageChange
      });
    }
    
    pagination.setTotal(totalCount);
    
    // Load documents (with caching)
    if (allLoadedDocuments.length === 0) {
      allLoadedDocuments = await firestoreService.getAll('documents', 'createdAt', 'desc');
    }
    
    documents = allLoadedDocuments;
    filteredDocuments = [...documents];
    
    if (documents.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderDocuments();
      documentsList.style.display = 'grid';
    }

    updateSummary();
    pagination.render();
    
    // Load expiring documents alert
    await loadExpiringDocumentsAlert();
  } catch (error) {
    console.error('Error loading documents:', error);
    showToast('Failed to load documents', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

function handlePageChange(page) {
  renderDocuments();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const category = categoryFilter.value;

  filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm) || 
                         (doc.description && doc.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !category || doc.category === category;
    return matchesSearch && matchesCategory;
  });

  // Update pagination total based on filtered results
  if (pagination) {
    pagination.setTotal(filteredDocuments.length);
    pagination.currentPage = 1;
  }

  renderDocuments();
  if (pagination) pagination.render();
}

function handleFilter() {
  handleSearch();
}

function getDocumentIcon(category) {
  const icons = {
    'Tax': '📋',
    'Insurance': '🛡️',
    'Property': '🏠',
    'Investment': '📈',
    'Personal': '👤',
    'Other': '📄'
  };
  return icons[category] || '📄';
}

function renderDocuments() {
  if (filteredDocuments.length === 0) {
    documentsList.innerHTML = '<div class="empty-state"><p>No documents found</p></div>';
    if (pagination) {
      const container = document.getElementById('paginationContainer');
      if (container) container.style.display = 'none';
    }
    return;
  }

  const now = new Date();

  // Apply pagination
  const pageSize = pagination ? pagination.pageSize : 12;
  const currentPage = pagination ? pagination.currentPage : 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageDocuments = filteredDocuments.slice(startIndex, endIndex);

  documentsList.innerHTML = pageDocuments.map(doc => {
    const icon = doc.fileName ? storageService.getFileIcon(doc.fileName) : getDocumentIcon(doc.category);
    const fileSize = doc.fileSize ? ` (${storageService.formatFileSize(doc.fileSize)})` : '';
    const escapedName = escapeHtml(doc.name);
    const escapedCategory = escapeHtml(doc.category);
    const escapedFileName = doc.fileName ? escapeHtml(doc.fileName) : '';
    const escapedDescription = doc.description ? escapeHtml(doc.description) : '';
    
    // Check expiry status
    let expiryBadge = '';
    if (doc.expiryDate) {
      const expiry = doc.expiryDate.toDate ? doc.expiryDate.toDate() : new Date(doc.expiryDate);
      const daysUntil = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        expiryBadge = `<span class="expiry-badge expired">Expired ${Math.abs(daysUntil)} days ago</span>`;
      } else if (daysUntil <= 30) {
        expiryBadge = `<span class="expiry-badge expiring">Expires in ${daysUntil} days</span>`;
      } else {
        expiryBadge = `<span class="expiry-badge valid">Expires ${formatDate(expiry)}</span>`;
      }
    }
    
    // Check linked asset
    let linkedBadge = '';
    if (doc.linkedAssetType && doc.linkedAssetId) {
      const assetIcon = doc.linkedAssetType === 'vehicle' ? '🚗' : 
                        doc.linkedAssetType === 'house' ? '🏠' : 
                        doc.linkedAssetType === 'loan' ? '🏦' : 
                        doc.linkedAssetType === 'investment' ? '📈' : '🔗';
      linkedBadge = `<span class="linked-badge">${assetIcon} Linked</span>`;
    }
    
    return `
    <div class="document-card" onclick="window.viewDocument('${doc.id}')">
      <div class="document-icon">${icon}</div>
      <div class="document-name">${escapedName}</div>
      <div class="document-meta">
        <span class="document-category">${escapedCategory}</span>
        ${doc.documentDate ? `<span class="document-date">${formatDate(doc.documentDate)}</span>` : ''}
      </div>
      <div class="document-badges">
        ${expiryBadge}
        ${linkedBadge}
      </div>
      ${doc.fileName ? `<div class="document-description">${escapedFileName}${fileSize}</div>` : ''}
      ${doc.description ? `<div class="document-description">${escapedDescription}</div>` : ''}
      <div class="document-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="window.openDocument('${doc.fileUrl}')" title="Open">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.editDocument('${doc.id}')" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${doc.id}')" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  }).join('');
}

function updateSummary() {
  const totalDocuments = documents.length;
  const categories = [...new Set(documents.map(d => d.category))].length;
  
  // Calculate total storage used
  const totalBytes = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
  const storageUsed = storageService.formatFileSize(totalBytes);

  totalDocumentsEl.textContent = totalDocuments;
  totalCategoriesEl.textContent = categories;
  storageUsedEl.textContent = storageUsed;
}

function viewDocument(id) {
  const doc = documents.find(d => d.id === id);
  if (doc) showEditForm(doc);
}

function openDocument(url) {
  window.open(url, '_blank');
}

function editDocument(id) {
  const doc = documents.find(d => d.id === id);
  if (doc) showEditForm(doc);
}

function showDeleteConfirmation(id) {
  const doc = documents.find(d => d.id === id);
  if (!doc) return;

  deleteDocumentId = id;
  deleteDocumentName.textContent = doc.name;
  deleteModal.classList.add('show');
}

function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteDocumentId = null;
}

async function handleDelete() {
  if (!deleteDocumentId) return;

  const originalText = confirmDeleteBtn.textContent;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    // Get document to delete file from storage
    const doc = documents.find(d => d.id === deleteDocumentId);
    
    // Delete from Firestore
    const result = await firestoreService.delete('documents', deleteDocumentId);
    
    if (result.success) {
      // Delete file from storage if exists
      if (doc && doc.filePath) {
        await storageService.deleteFile(doc.filePath);
      }
      
      showToast('Document deleted successfully', 'success');
      hideDeleteModal();
      allLoadedDocuments = []; // Clear cache to reload fresh data
      await loadDocuments();
    } else {
      showToast(result.error || 'Failed to delete document', 'error');
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    showToast('Failed to delete document', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = originalText;
  }
}

async function handleLogout() {
  const result = await authService.signOut();
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    showToast('Failed to logout', 'error');
  }
}

window.viewDocument = viewDocument;
window.openDocument = openDocument;
window.editDocument = editDocument;
window.showDeleteConfirmation = showDeleteConfirmation;

// ============================================
// SMART DOCUMENT HELPERS
// ============================================

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show category suggestion
function showCategorySuggestion(suggestion) {
  hideCategorySuggestion();
  
  const categoryGroup = document.getElementById('category')?.closest('.form-group');
  if (!categoryGroup) return;
  
  const suggestionDiv = document.createElement('div');
  suggestionDiv.id = 'categorySuggestion';
  suggestionDiv.className = 'category-suggestion';
  suggestionDiv.innerHTML = `
    <span class="suggestion-icon">💡</span>
    <span class="suggestion-text">Suggested: <strong>${escapeHtml(suggestion.category)}</strong></span>
    <span class="suggestion-confidence">(${Math.round(suggestion.confidence * 100)}% match)</span>
    <button type="button" class="suggestion-apply" onclick="applyCategorySuggestion('${escapeHtml(suggestion.category)}')">Apply</button>
    <button type="button" class="suggestion-dismiss" onclick="hideCategorySuggestion()">✕</button>
  `;
  
  // Show other suggestions if available
  if (suggestion.suggestions && suggestion.suggestions.length > 1) {
    const otherSuggestions = suggestion.suggestions.slice(1, 3);
    if (otherSuggestions.length > 0) {
      const othersDiv = document.createElement('div');
      othersDiv.className = 'other-suggestions';
      othersDiv.innerHTML = `
        <span>Other options: </span>
        ${otherSuggestions.map(s => 
          `<button type="button" class="suggestion-alt" onclick="applyCategorySuggestion('${escapeHtml(s.category)}')">${escapeHtml(s.category)}</button>`
        ).join('')}
      `;
      suggestionDiv.appendChild(othersDiv);
    }
  }
  
  categoryGroup.appendChild(suggestionDiv);
}

// Hide category suggestion
function hideCategorySuggestion() {
  const existing = document.getElementById('categorySuggestion');
  if (existing) {
    existing.remove();
  }
}

// Apply category suggestion
function applyCategorySuggestion(category) {
  const categorySelect = document.getElementById('category');
  if (categorySelect) {
    // Check if category exists in options, if not add it
    const options = Array.from(categorySelect.options).map(o => o.value);
    if (!options.includes(category)) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    }
    categorySelect.value = category;
    categorySelect.dispatchEvent(new Event('change'));
  }
  hideCategorySuggestion();
  showToast(`Category set to "${category}"`, 'success');
}

// Load linkable assets for a category
async function loadLinkableAssets(category) {
  if (!linkedAssetSelect) return;
  
  const assets = await smartDocumentService.getLinkableAssets(category);
  
  linkedAssetSelect.innerHTML = '<option value="">No linked asset</option>';
  
  if (assets.length > 0) {
    assets.forEach(asset => {
      const option = document.createElement('option');
      option.value = `${asset.type}:${asset.id}`;
      option.textContent = `${asset.icon} ${asset.name}`;
      linkedAssetSelect.appendChild(option);
    });
    linkedAssetSelect.closest('.form-group').style.display = 'block';
  } else {
    linkedAssetSelect.closest('.form-group').style.display = 'none';
  }
}

// Load expiring documents alert
async function loadExpiringDocumentsAlert() {
  try {
    const [expiring, expired] = await Promise.all([
      smartDocumentService.getExpiringDocuments(30),
      smartDocumentService.getExpiredDocuments()
    ]);
    
    // Update expiring documents count
    if (expiringDocumentsEl) {
      expiringDocumentsEl.textContent = expiring.length;
      expiringDocumentsEl.closest('.summary-card')?.classList.toggle('warning', expiring.length > 0);
    }
    
    // Update expired documents count
    if (expiredDocumentsEl) {
      expiredDocumentsEl.textContent = expired.length;
      expiredDocumentsEl.closest('.summary-card')?.classList.toggle('danger', expired.length > 0);
    }
    
    // Show alert if there are expiring/expired documents
    if (expired.length > 0) {
      showToast(`⚠️ ${expired.length} document(s) have expired!`, 'warning');
    } else if (expiring.length > 0) {
      showToast(`📅 ${expiring.length} document(s) expiring soon`, 'info');
    }
  } catch (error) {
    console.error('Error loading expiring documents:', error);
  }
}

// Expose functions to window
window.applyCategorySuggestion = applyCategorySuggestion;
window.hideCategorySuggestion = hideCategorySuggestion;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
