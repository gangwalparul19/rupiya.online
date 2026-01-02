// Documents Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import storageService from '../services/storage-service.js';
import toast from '../components/toast.js';
import { formatDate } from '../utils/helpers.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let documents = [];
let filteredDocuments = [];
let editingDocumentId = null;
let uploadedFile = null;

let addDocumentBtn, addDocumentSection, closeFormBtn, cancelFormBtn;
let documentForm, formTitle, saveFormBtn, saveFormBtnText, saveFormBtnSpinner;
let documentsList, emptyState, loadingState;
let totalDocumentsEl, totalCategoriesEl, storageUsedEl;
let searchInput, categoryFilter;
let fileInput, uploadProgress, progressFill, progressText;
let currentFileGroup, currentFileName, currentFileLink;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteBtnText, deleteBtnSpinner, deleteDocumentName;
let deleteDocumentId = null;

async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  initDOMElements();
  setupEventListeners();
  loadUserProfile(user);
  await loadDocuments();
  
  // Set default date if element exists
  const documentDateInput = document.getElementById('documentDate');
  if (documentDateInput) {
    documentDateInput.valueAsDate = new Date();
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
  saveFormBtnText = document.getElementById('saveFormBtnText');
  saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
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
  deleteBtnText = document.getElementById('deleteBtnText');
  deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
  deleteDocumentName = document.getElementById('deleteDocumentName');
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
  saveFormBtnText.textContent = 'Save Document';
  documentForm.reset();
  
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
  saveFormBtnText.textContent = 'Update Document';

  document.getElementById('name').value = doc.name;
  document.getElementById('category').value = doc.category;
  document.getElementById('documentDate').value = doc.documentDate ? formatDateForInput(doc.documentDate) : '';
  document.getElementById('description').value = doc.description || '';
  
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

  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

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
      documentDate: document.getElementById('documentDate').value ? new Date(document.getElementById('documentDate').value) : null,
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
      await loadDocuments();
    } else {
      showToast(result.error || 'Failed to save document', 'error');
    }
  } catch (error) {
    console.error('Error saving document:', error);
    showToast('Failed to save document', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
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
    documents = await firestoreService.getAll('documents', 'createdAt', 'desc');
    filteredDocuments = [...documents];
    
    if (documents.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderDocuments();
      documentsList.style.display = 'grid';
    }

    updateSummary();
  } catch (error) {
    console.error('Error loading documents:', error);
    showToast('Failed to load documents', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
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

  renderDocuments();
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
    return;
  }

  documentsList.innerHTML = filteredDocuments.map(doc => {
    const icon = doc.fileName ? storageService.getFileIcon(doc.fileName) : getDocumentIcon(doc.category);
    const fileSize = doc.fileSize ? ` (${storageService.formatFileSize(doc.fileSize)})` : '';
    
    return `
    <div class="document-card" onclick="window.viewDocument('${doc.id}')">
      <div class="document-icon">${icon}</div>
      <div class="document-name">${doc.name}</div>
      <div class="document-meta">
        <span class="document-category">${doc.category}</span>
        ${doc.documentDate ? `<span class="document-date">${formatDate(doc.documentDate)}</span>` : ''}
      </div>
      ${doc.fileName ? `<div class="document-description">${doc.fileName}${fileSize}</div>` : ''}
      ${doc.description ? `<div class="document-description">${doc.description}</div>` : ''}
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

  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

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
      await loadDocuments();
    } else {
      showToast(result.error || 'Failed to delete document', 'error');
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    showToast('Failed to delete document', 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    deleteBtnText.style.display = 'inline';
    deleteBtnSpinner.style.display = 'none';
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

function formatDateForInput(date) {
  if (!date) return '';
  
  let d;
  if (date.toDate) {
    d = date.toDate();
  } else if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

window.viewDocument = viewDocument;
window.openDocument = openDocument;
window.editDocument = editDocument;
window.showDeleteConfirmation = showDeleteConfirmation;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
