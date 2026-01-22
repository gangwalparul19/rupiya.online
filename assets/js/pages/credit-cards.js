// Credit Cards Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import creditCardService from '../services/credit-card-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State
const state = {
  creditCards: [],
  filteredCards: [],
  currentPage: 1,
  itemsPerPage: 10,
  totalCount: 0,
  allDataKPI: {
    totalCards: 0,
    totalLimit: 0,
    totalSpent: 0,
    totalRewards: 0
  }
};
let editingCardId = null;
let currentUser = null;

// Initialize
async function init() {
  currentUser = await authService.waitForAuth();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  loadUserProfile();
  setupEventListeners();

  // Check if encryption reauth is needed
  await encryptionReauthModal.checkAndPrompt(async () => {
    await loadCreditCards();
  });

  await loadCreditCards();
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
  // Sidebar toggle
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

  // Form section buttons
  document.getElementById('addCardBtn')?.addEventListener('click', () => openCardForm());
  document.getElementById('addCardBtnEmpty')?.addEventListener('click', () => openCardForm());
  document.getElementById('closeFormBtn')?.addEventListener('click', closeCardForm);
  document.getElementById('cancelBtn')?.addEventListener('click', closeCardForm);
  document.getElementById('cardForm')?.addEventListener('submit', handleCardSubmit);
  
  // Delete modal
  document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);
  
  // Pay Bill modal
  document.getElementById('closePayBillModal')?.addEventListener('click', closePayBillModal);
  document.getElementById('cancelPayBillBtn')?.addEventListener('click', closePayBillModal);
  document.getElementById('payBillForm')?.addEventListener('submit', handlePayBill);
  
  // Pagination buttons
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        goToPage(state.currentPage - 1);
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalRecords = state.filteredCards.length;
      const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
      
      if (state.currentPage < totalPages) {
        goToPage(state.currentPage + 1);
      }
    });
  }
}

// Load credit cards
async function loadCreditCards() {
  try {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const cardsGrid = document.getElementById('cardsGrid');

    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    cardsGrid.style.display = 'none';

    const allCards = await firestoreService.getAll('creditCards', 'createdAt', 'desc');
    
    state.creditCards = allCards;
    state.filteredCards = [...allCards];
    state.totalCount = allCards.length;
    
    calculateKPISummary();
    state.currentPage = 1;

    if (state.filteredCards.length === 0) {
      loadingState.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      loadingState.style.display = 'none';
      cardsGrid.style.display = 'grid';
      renderCreditCards();
    }

    updateKPIs();
  } catch (error) {
    console.error('Error loading credit cards:', error);
    toast.error('Failed to load credit cards');
  }
}

// Calculate KPI summary
function calculateKPISummary() {
  const totalLimit = state.creditCards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
  const totalSpent = state.creditCards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
  const totalRewards = state.creditCards.reduce((sum, card) => sum + (card.rewardsBalance || 0), 0);
  const utilization = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  
  state.allDataKPI = {
    totalCards: state.creditCards.length,
    totalLimit,
    totalSpent,
    totalRewards,
    utilization
  };
}

// Render credit cards
function renderCreditCards() {
  const cardsGrid = document.getElementById('cardsGrid');
  const paginationContainer = document.getElementById('paginationContainer');
  if (!cardsGrid) return;
  
  if (state.filteredCards.length === 0) {
    cardsGrid.innerHTML = '';
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }
  
  // Calculate pagination
  const totalRecords = state.filteredCards.length;
  const totalPages = Math.ceil(totalRecords / state.itemsPerPage);
  
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const pageCards = state.filteredCards.slice(startIndex, endIndex);

  cardsGrid.innerHTML = pageCards.map(card => {
    const utilization = (card.currentBalance / card.creditLimit) * 100;
    const utilizationClass = utilization > 70 ? 'high' : '';
    const cardTypeClass = card.cardType ? `card-type-${card.cardType.toLowerCase().replace(' ', '')}` : 'card-type-default';
    
    // Safely handle potentially undefined values
    const cardName = card.cardName || 'Unnamed Card';
    const bankName = card.bankName || 'Unknown Bank';
    const cardType = card.cardType || 'N/A';
    const lastFourDigits = card.lastFourDigits || '****';
    const creditLimit = card.creditLimit || 0;
    const currentBalance = card.currentBalance || 0;
    const rewardsProgram = card.rewardsProgram || '';
    const rewardsBalance = card.rewardsBalance || 0;

    return `
      <div class="card-item" data-card-id="${card.id}">
        <div class="card-header">
          <div class="card-info">
            <h3>${cardName}</h3>
            <div class="card-bank">${bankName}</div>
          </div>
          <span class="card-type-badge ${cardTypeClass}">${cardType}</span>
        </div>

        <div class="card-number">•••• •••• •••• ${lastFourDigits}</div>

        <div class="card-stats">
          <div class="card-stat">
            <div class="card-stat-label">Credit Limit</div>
            <div class="card-stat-value">${formatCurrency(creditLimit)}</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-label">Available</div>
            <div class="card-stat-value">${formatCurrency(creditLimit - currentBalance)}</div>
          </div>
        </div>

        <div class="card-progress">
          <div class="card-progress-label">
            <span>Utilization</span>
            <span>${utilization.toFixed(1)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${utilizationClass}" style="width: ${utilization}%"></div>
          </div>
        </div>

        ${rewardsProgram ? `
          <div class="card-rewards">
            <div class="card-rewards-icon">🎁</div>
            <div class="card-rewards-info">
              <div class="card-rewards-label">${rewardsProgram}</div>
              <div class="card-rewards-value">${rewardsBalance} points</div>
            </div>
          </div>
        ` : ''}

        <div class="card-actions">
          <button class="btn btn-sm btn-success" data-action="pay-bill">💰 Pay Bill</button>
          <button class="btn btn-sm btn-outline" data-action="edit">Edit</button>
          <button class="btn btn-sm btn-danger-outline" data-action="delete">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add event listeners to buttons
  document.querySelectorAll('.card-item').forEach(cardEl => {
    const cardId = cardEl.dataset.cardId;
    const card = state.creditCards.find(c => c.id === cardId);
    if (!card) return;
    
    cardEl.querySelector('[data-action="pay-bill"]')?.addEventListener('click', () => {
      payBill(card.id, card.cardName || 'Unnamed Card', card.currentBalance || 0);
    });
    
    cardEl.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      editCard(card.id);
    });
    
    cardEl.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      deleteCard(card.id, card.cardName || 'Unnamed Card');
    });
  });
  
  renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
  const paginationContainer = document.getElementById('paginationContainer');
  const paginationNumbers = document.getElementById('paginationNumbers');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
  if (!paginationContainer || !paginationNumbers) return;
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  if (prevBtn) prevBtn.disabled = state.currentPage === 1;
  if (nextBtn) nextBtn.disabled = state.currentPage === totalPages;
  
  const pageNumbers = generatePageNumbers(state.currentPage, totalPages);
  
  paginationNumbers.innerHTML = pageNumbers.map(page => {
    if (page === '...') {
      return '<span class="ellipsis">...</span>';
    }
    
    const isActive = page === state.currentPage;
    return `<button class="page-number ${isActive ? 'active' : ''}" data-page="${page}">${page}</button>`;
  }).join('');
  
  paginationNumbers.querySelectorAll('.page-number').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      goToPage(page);
    });
  });
}

// Generate page numbers
function generatePageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxVisible = 7;
  
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('...');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    pages.push(totalPages);
  }
  
  return pages;
}

// Go to page
function goToPage(page) {
  state.currentPage = page;
  renderCreditCards();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update KPIs
function updateKPIs() {
  const totalCardsEl = document.getElementById('totalCards');
  const totalLimitEl = document.getElementById('totalLimit');
  const utilizationEl = document.getElementById('utilization');
  const totalRewardsEl = document.getElementById('totalRewards');

  if (totalCardsEl) totalCardsEl.textContent = state.allDataKPI.totalCards;
  if (totalLimitEl) {
    totalLimitEl.textContent = formatCurrencyCompact(state.allDataKPI.totalLimit);
    totalLimitEl.title = formatCurrency(state.allDataKPI.totalLimit);
  }
  if (utilizationEl) {
    utilizationEl.textContent = state.allDataKPI.utilization + '%';
    utilizationEl.title = `${formatCurrency(state.allDataKPI.totalSpent)} of ${formatCurrency(state.allDataKPI.totalLimit)}`;
  }
  if (totalRewardsEl) totalRewardsEl.textContent = state.allDataKPI.totalRewards.toLocaleString();
}

// Edit card
function editCard(cardId) {
  openCardForm(cardId);
}

// Delete card
let deleteCardId = null;

function deleteCard(cardId, cardName) {
  deleteCardId = cardId;
  document.getElementById('deleteCardName').textContent = cardName;
  document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('show');
  deleteCardId = null;
}

async function confirmDelete() {
  if (!deleteCardId) return;

  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const originalText = confirmBtn.textContent;

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting...';

    await firestoreService.delete('creditCards', deleteCardId);
    toast.success('Credit card deleted successfully');
    closeDeleteModal();
    await loadCreditCards();
  } catch (error) {
    console.error('Error deleting credit card:', error);
    toast.error('Failed to delete credit card');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = originalText;
  }
}

// Open card form
function openCardForm(cardId = null) {
  const formSection = document.getElementById('addCardSection');
  const formTitle = document.getElementById('formTitle');
  const form = document.getElementById('cardForm');

  editingCardId = cardId;

  if (cardId) {
    const card = state.creditCards.find(c => c.id === cardId);
    if (card) {
      formTitle.textContent = 'Edit Credit Card';
      document.getElementById('cardName').value = card.cardName || '';
      document.getElementById('bankName').value = card.bankName || '';
      document.getElementById('cardType').value = card.cardType || '';
      document.getElementById('lastFourDigits').value = card.lastFourDigits || '';
      document.getElementById('creditLimit').value = card.creditLimit || '';
      document.getElementById('currentBalance').value = card.currentBalance || 0;
      document.getElementById('billingDate').value = card.billingDate || '';
      document.getElementById('dueDate').value = card.dueDate || '';
      document.getElementById('rewardsProgram').value = card.rewardsProgram || '';
      document.getElementById('rewardsBalance').value = card.rewardsBalance || 0;
      document.getElementById('annualFee').value = card.annualFee || 0;
      document.getElementById('notes').value = card.notes || '';
    }
  } else {
    formTitle.textContent = 'Add Credit Card';
    form.reset();
  }

  formSection.classList.add('show');
  formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Close card form
function closeCardForm() {
  document.getElementById('addCardSection').classList.remove('show');
  document.getElementById('cardForm').reset();
  editingCardId = null;
}

// Handle card submit
async function handleCardSubmit(e) {
  e.preventDefault();

  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const cardData = {
      cardName: document.getElementById('cardName').value,
      bankName: document.getElementById('bankName').value,
      cardType: document.getElementById('cardType').value,
      lastFourDigits: document.getElementById('lastFourDigits').value,
      creditLimit: parseFloat(document.getElementById('creditLimit').value),
      currentBalance: parseFloat(document.getElementById('currentBalance').value) || 0,
      billingDate: parseInt(document.getElementById('billingDate').value) || null,
      dueDate: parseInt(document.getElementById('dueDate').value) || null,
      rewardsProgram: document.getElementById('rewardsProgram').value || null,
      rewardsBalance: parseFloat(document.getElementById('rewardsBalance').value) || 0,
      annualFee: parseFloat(document.getElementById('annualFee').value) || 0,
      notes: document.getElementById('notes').value || null,
      userId: currentUser.uid
    };

    if (editingCardId) {
      await firestoreService.update('creditCards', editingCardId, cardData);
      toast.success('Credit card updated successfully');
    } else {
      await firestoreService.add('creditCards', cardData);
      toast.success('Credit card added successfully');
    }

    closeCardForm();
    await loadCreditCards();
  } catch (error) {
    console.error('Error saving credit card:', error);
    toast.error('Failed to save credit card');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Pay Bill functionality
let payBillCardId = null;
let payBillCurrentBalance = 0;

function payBill(cardId, cardName, currentBalance) {
  payBillCardId = cardId;
  payBillCurrentBalance = currentBalance;
  
  document.getElementById('payBillCardName').textContent = cardName;
  document.getElementById('payBillAmount').textContent = formatCurrency(currentBalance);
  document.getElementById('paymentAmount').value = currentBalance.toFixed(2);
  document.getElementById('paymentDate').valueAsDate = new Date();
  document.getElementById('payBillModal').classList.add('show');
}

function closePayBillModal() {
  document.getElementById('payBillModal').classList.remove('show');
  document.getElementById('payBillForm').reset();
  payBillCardId = null;
  payBillCurrentBalance = 0;
}

async function handlePayBill(e) {
  e.preventDefault();
  
  if (!payBillCardId) return;

  const confirmBtn = document.getElementById('confirmPayBillBtn');
  const originalText = confirmBtn.textContent;

  try {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';

    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentNotes = document.getElementById('paymentNotes').value.trim();
    const billDocument = document.getElementById('billDocument').files[0];

    // Get card details
    const card = state.creditCards.find(c => c.id === payBillCardId);
    if (!card) {
      toast.error('Card not found');
      return;
    }

    // Calculate new balance
    const newBalance = Math.max(0, card.currentBalance - paymentAmount);

    // Update card balance
    await firestoreService.update('creditCards', payBillCardId, {
      currentBalance: newBalance
    });

    // Upload document if provided
    let documentId = null;
    if (billDocument) {
      try {
        // Import storage service dynamically
        const { default: storageService } = await import('../services/storage-service.js');
        
        // Upload file
        const uploadResult = await storageService.uploadFile(
          billDocument,
          'documents'
        );

        if (uploadResult.success) {
          // Create document record
          const documentData = {
            name: `${card.cardName} - Bill Payment`,
            description: `Credit card bill payment for ${card.cardName} on ${paymentDate}`,
            category: 'Credit Card Bill',
            documentDate: new Date(paymentDate),
            fileUrl: uploadResult.url,
            filePath: uploadResult.path,
            fileName: uploadResult.name,
            fileSize: uploadResult.size,
            fileType: uploadResult.type,
            linkedType: 'creditCard',
            linkedId: payBillCardId,
            linkedName: card.cardName
          };

          const docResult = await firestoreService.add('documents', documentData);
          if (docResult.success) {
            documentId = docResult.id;
          }
        }
      } catch (docError) {
        console.error('Error uploading document:', docError);
        // Continue even if document upload fails
      }
    }

    // Create a payment record (for tracking payment history)
    const paymentRecord = {
      cardId: payBillCardId,
      cardName: card.cardName,
      amount: paymentAmount,
      date: new Date(paymentDate),
      paymentMethod: paymentMethod,
      notes: paymentNotes,
      documentId: documentId,
      previousBalance: card.currentBalance,
      newBalance: newBalance
    };

    await firestoreService.add('creditCardPayments', paymentRecord);

    toast.success(`Payment of ${formatCurrency(paymentAmount)} recorded successfully`);
    closePayBillModal();
    await loadCreditCards();
  } catch (error) {
    console.error('Error processing payment:', error);
    toast.error('Failed to process payment');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = originalText;
  }
}

// Initialize on page load
init();
