// Notes Page Logic
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import familySwitcher from '../components/family-switcher.js';
import toast from '../components/toast.js';
import themeManager from '../utils/theme-manager.js';
import { formatDate } from '../utils/helpers.js';

// Helper function for toast
const showToast = (message, type) => toast.show(message, type);

let notes = [];
let filteredNotes = [];
let editingNoteId = null;

let addNoteBtn, addNoteSection, closeFormBtn, cancelFormBtn;
let noteForm, formTitle, saveFormBtn, saveFormBtnText, saveFormBtnSpinner;
let notesList, emptyState, loadingState;
let totalNotesEl, pinnedNotesEl, totalCategoriesEl;
let searchInput, categoryFilter;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let deleteBtnText, deleteBtnSpinner, deleteNoteTitle;
let deleteNoteId = null;

async function init() {
  const user = await authService.waitForAuth();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  initDOMElements();
  setupEventListeners();
  loadUserProfile(user);
  await loadNotes();
}

function initDOMElements() {
  addNoteBtn = document.getElementById('addNoteBtn');
  addNoteSection = document.getElementById('addNoteSection');
  closeFormBtn = document.getElementById('closeFormBtn');
  cancelFormBtn = document.getElementById('cancelFormBtn');
  noteForm = document.getElementById('noteForm');
  formTitle = document.getElementById('formTitle');
  saveFormBtn = document.getElementById('saveFormBtn');
  saveFormBtnText = document.getElementById('saveFormBtnText');
  saveFormBtnSpinner = document.getElementById('saveFormBtnSpinner');
  notesList = document.getElementById('notesList');
  emptyState = document.getElementById('emptyState');
  loadingState = document.getElementById('loadingState');
  totalNotesEl = document.getElementById('totalNotes');
  pinnedNotesEl = document.getElementById('pinnedNotes');
  totalCategoriesEl = document.getElementById('totalCategories');
  searchInput = document.getElementById('searchInput');
  categoryFilter = document.getElementById('categoryFilter');
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  deleteBtnText = document.getElementById('deleteBtnText');
  deleteBtnSpinner = document.getElementById('deleteBtnSpinner');
  deleteNoteTitle = document.getElementById('deleteNoteTitle');
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
  addNoteBtn.addEventListener('click', showAddForm);
  closeFormBtn.addEventListener('click', hideForm);
  cancelFormBtn.addEventListener('click', hideForm);
  noteForm.addEventListener('submit', handleSubmit);
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
  editingNoteId = null;
  formTitle.textContent = 'Add Note';
  saveFormBtnText.textContent = 'Save Note';
  noteForm.reset();
  addNoteSection.classList.add('show');
  addNoteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideForm() {
  addNoteSection.classList.remove('show');
  noteForm.reset();
  editingNoteId = null;
}

function showEditForm(note) {
  editingNoteId = note.id;
  formTitle.textContent = 'Edit Note';
  saveFormBtnText.textContent = 'Update Note';

  document.getElementById('title').value = note.title;
  document.getElementById('category').value = note.category;
  document.getElementById('isPinned').value = note.isPinned ? 'true' : 'false';
  document.getElementById('content').value = note.content;

  addNoteSection.classList.add('show');
  addNoteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleSubmit(e) {
  e.preventDefault();

  const formData = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    isPinned: document.getElementById('isPinned').value === 'true',
    content: document.getElementById('content').value.trim()
  };

  saveFormBtn.disabled = true;
  saveFormBtnText.style.display = 'none';
  saveFormBtnSpinner.style.display = 'inline-block';

  try {
    let result;
    if (editingNoteId) {
      result = await firestoreService.update('notes', editingNoteId, formData);
      if (result.success) showToast('Note updated successfully', 'success');
    } else {
      result = await firestoreService.add('notes', formData);
      if (result.success) showToast('Note added successfully', 'success');
    }

    if (result.success) {
      hideForm();
      await loadNotes();
    } else {
      showToast(result.error || 'Failed to save note', 'error');
    }
  } catch (error) {
    console.error('Error saving note:', error);
    showToast('Failed to save note', 'error');
  } finally {
    saveFormBtn.disabled = false;
    saveFormBtnText.style.display = 'inline';
    saveFormBtnSpinner.style.display = 'none';
  }
}

async function loadNotes() {
  loadingState.style.display = 'flex';
  notesList.style.display = 'none';
  emptyState.style.display = 'none';

  try {
    notes = await firestoreService.getAll('notes', 'createdAt', 'desc');
    filteredNotes = [...notes];
    
    if (notes.length === 0) {
      emptyState.style.display = 'block';
    } else {
      renderNotes();
      notesList.style.display = 'grid';
    }

    updateSummary();
  } catch (error) {
    console.error('Error loading notes:', error);
    showToast('Failed to load notes', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const category = categoryFilter.value;

  filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 
                         note.content.toLowerCase().includes(searchTerm);
    const matchesCategory = !category || note.category === category;
    return matchesSearch && matchesCategory;
  });

  renderNotes();
}

function handleFilter() {
  handleSearch();
}

function renderNotes() {
  // Sort: pinned first, then by date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  if (sortedNotes.length === 0) {
    notesList.innerHTML = '<div class="empty-state"><p>No notes found</p></div>';
    return;
  }

  notesList.innerHTML = sortedNotes.map(note => `
    <div class="note-card ${note.isPinned ? 'pinned' : ''}" onclick="window.viewNote('${note.id}')">
      ${note.isPinned ? '<div class="pin-badge">📌</div>' : ''}
      <div class="note-card-header">
        <div class="note-title">${note.title}</div>
        <div class="note-meta">
          <span class="note-category">${note.category}</span>
          <span class="note-date">${formatDate(note.createdAt)}</span>
        </div>
      </div>
      <div class="note-content">${note.content}</div>
      <div class="note-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="window.editNote('${note.id}')" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="btn-icon btn-danger" onclick="window.showDeleteConfirmation('${note.id}')" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

function updateSummary() {
  const totalNotes = notes.length;
  const pinnedNotes = notes.filter(n => n.isPinned).length;
  const categories = [...new Set(notes.map(n => n.category))].length;

  totalNotesEl.textContent = totalNotes;
  pinnedNotesEl.textContent = pinnedNotes;
  totalCategoriesEl.textContent = categories;
}

function viewNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) showEditForm(note);
}

function editNote(id) {
  const note = notes.find(n => n.id === id);
  if (note) showEditForm(note);
}

function showDeleteConfirmation(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  deleteNoteId = id;
  deleteNoteTitle.textContent = note.title;
  deleteModal.classList.add('show');
}

function hideDeleteModal() {
  deleteModal.classList.remove('show');
  deleteNoteId = null;
}

async function handleDelete() {
  if (!deleteNoteId) return;

  confirmDeleteBtn.disabled = true;
  deleteBtnText.style.display = 'none';
  deleteBtnSpinner.style.display = 'inline-block';

  try {
    const result = await firestoreService.delete('notes', deleteNoteId);
    
    if (result.success) {
      showToast('Note deleted successfully', 'success');
      hideDeleteModal();
      await loadNotes();
    } else {
      showToast(result.error || 'Failed to delete note', 'error');
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    showToast('Failed to delete note', 'error');
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

window.viewNote = viewNote;
window.editNote = editNote;
window.showDeleteConfirmation = showDeleteConfirmation;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
