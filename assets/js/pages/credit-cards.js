// Credit Cards Page Logic
import '../services/services-init.js';
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import toast from '../components/toast.js';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../utils/helpers.js';
import encryptionReauthModal from '../components/encryption-reauth-modal.js';

// State
let creditCards = [];
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

    creditCards = await firestoreService.getAll('creditCards', 'createdAt', 'desc');

    if (creditCards.length === 0) {
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

// Render credit cards
function renderCreditCards() {
  const cardsGrid = document.getElementById('cardsGrid');
  if (!cardsGrid) return;

  cardsGrid.innerHTML = creditCards.map(card => {
    const utilization = (card.currentBalance / card.creditLimit) * 100;
    const utilizationClass = utilization > 70 ? 'high' : '';
    const cardTypeClass = `card-type-${card.cardType.toLowerCase().replace(' ', '')}`;

    return `
      <div class="card-item">
        <div class="card-header">
          <div class="card-info">
            <h3>${card.cardName}</h3>
            <div class="card-bank">${card.bankName}</div>
          </div>
          <span class="card-type-badge ${cardTypeClass}">${card.cardType}</span>
        </div>

        <div class="card-number">•••• •••• •••• ${card.lastFourDigits}</div>

        <div class="card-stats">
          <div class="card-stat">
            <div class="card-stat-label">Credit Limit</div>
            <div class="card-stat-value">${formatCurrency(card.creditLimit)}</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-label">Available</div>
            <div class="card-stat-value">${formatCurrency(card.creditLimit - card.currentBalance)}</div>
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

        ${card.rewardsProgram ? `
          <div class="card-rewards">
            <div class="card-rewards-icon">🎁</div>
            <div class="card-rewards-info">
              <div class="card-rewards-label">${card.rewardsProgram}</div>
              <div class="card-rewards-value">${card.rewardsBalance || 0} points</div>
            </div>
          </div>
        ` : ''}

        <div class="card-actions">
          <button class="btn btn-sm btn-outline" onclick="editCard('${card.id}')">Edit</button>
          <button class="btn btn-sm btn-danger-outline" onclick="deleteCard('${card.id}', '${card.cardName}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Update KPIs
function updateKPIs() {
  const totalCards = creditCards.length;
  const totalLimit = creditCards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
  const totalSpent = creditCards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
  const totalRewards = creditCards.reduce((sum, card) => sum + (card.rewardsBalance || 0), 0);

  const totalCardsEl = document.getElementById('totalCards');
  const totalLimitEl = document.getElementById('totalLimit');
  const totalSpentEl = document.getElementById('totalSpent');
  const totalRewardsEl = document.getElementById('totalRewards');

  if (totalCardsEl) totalCardsEl.textContent = totalCards;
  if (totalLimitEl) {
    totalLimitEl.textContent = formatCurrencyCompact(totalLimit);
    totalLimitEl.title = formatCurrency(totalLimit); // Tooltip with full amount
  }
  if (totalSpentEl) {
    totalSpentEl.textContent = formatCurrencyCompact(totalSpent);
    totalSpentEl.title = formatCurrency(totalSpent); // Tooltip with full amount
  }
  if (totalRewardsEl) totalRewardsEl.textContent = totalRewards.toLocaleString();
}

// Open card form
function openCardForm(cardId = null) {
  const formSection = document.getElementById('addCardSection');
  const formTitle = document.getElementById('formTitle');
  const form = document.getElementById('cardForm');

  editingCardId = cardId;

  if (cardId) {
    const card = creditCards.find(c => c.id === cardId);
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

// Edit card
window.editCard = function(cardId) {
  openCardForm(cardId);
};

// Delete card
let deleteCardId = null;

window.deleteCard = function(cardId, cardName) {
  deleteCardId = cardId;
  document.getElementById('deleteCardName').textContent = cardName;
  document.getElementById('deleteModal').classList.add('show');
};

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

// Initialize on page load
init();
