// AI Assistant Component
// Floating chat widget for interacting with Gemini AI
// Provides real-time financial insights and suggestions

import { auth } from '../config/firebase-config.js';
import geminiKeyService from '../services/gemini-key-service.js';
import logger from '../utils/logger.js';

const log = logger.create('AIAssistant');

class AIAssistant {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.isLoading = false;
    this.hasApiKey = false;
    this.container = null;
    this.init();
  }

  async init() {
    // Check if user has API key
    this.hasApiKey = await geminiKeyService.hasUserKey();
    
    if (!this.hasApiKey) {
      log.log('No API key found, AI assistant disabled');
      return;
    }

    this.createWidget();
    this.attachEventListeners();
    log.log('AI Assistant initialized');
  }

  createWidget() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'ai-assistant-widget';
    this.container.className = 'ai-assistant-widget';
    this.container.innerHTML = `
      <div class="ai-assistant-button" id="aiAssistantBtn" title="Open AI Assistant">
        <span class="ai-icon">🤖</span>
      </div>
      
      <div class="ai-assistant-chat" id="aiAssistantChat">
        <div class="ai-chat-header">
          <h3>Rupiya AI Assistant</h3>
          <button class="ai-close-btn" id="aiCloseBtn">✕</button>
        </div>
        
        <div class="ai-chat-messages" id="aiChatMessages">
          <div class="ai-message assistant">
            <p>Hi! I'm your financial AI assistant. I can help you with:<br><br>
            • Expense categorization<br>
            • Budget analysis<br>
            • Spending insights<br>
            • Financial recommendations<br><br>
            What would you like to know?</p>
          </div>
        </div>
        
        <div class="ai-chat-input">
          <input 
            type="text" 
            id="aiMessageInput" 
            placeholder="Ask me anything about your finances..."
            autocomplete="off"
          >
          <button class="ai-send-btn" id="aiSendBtn">Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.addStyles();
  }

  addStyles() {
    // Check if external CSS is loaded (preferred)
    const externalCSS = document.querySelector('link[href*="ai-assistant.css"]');
    if (externalCSS) {
      log.log('Using external AI assistant CSS');
      return; // Use external CSS instead of inline
    }

    if (document.getElementById('ai-assistant-styles')) {
      return; // Styles already added
    }

    const style = document.createElement('style');
    style.id = 'ai-assistant-styles';
    style.textContent = `
      #ai-assistant-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .ai-assistant-button {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #3f51b5 0%, #2196f3 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(63, 81, 181, 0.4);
        transition: all 0.3s ease;
        border: none;
      }

      .ai-assistant-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(63, 81, 181, 0.6);
      }

      .ai-icon {
        font-size: 28px;
      }

      .ai-assistant-chat {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 380px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease;
      }

      .ai-assistant-chat.open {
        display: flex;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-chat-header {
        background: linear-gradient(135deg, #3f51b5 0%, #2196f3 100%);
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ai-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .ai-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ai-close-btn:hover {
        opacity: 0.8;
      }

      .ai-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f5f5f5;
      }

      .ai-message {
        margin-bottom: 12px;
        display: flex;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .ai-message.assistant {
        justify-content: flex-start;
      }

      .ai-message.user {
        justify-content: flex-end;
      }

      .ai-message p {
        margin: 0;
        padding: 10px 14px;
        border-radius: 12px;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
      }

      .ai-message.assistant p {
        background: white;
        color: #333;
        border-bottom-left-radius: 4px;
      }

      .ai-message.user p {
        background: #3f51b5;
        color: white;
        border-bottom-right-radius: 4px;
      }

      .ai-message ul {
        margin: 8px 0;
        padding-left: 20px;
        font-size: 13px;
        color: #333;
      }

      .ai-message li {
        margin: 4px 0;
      }

      .ai-chat-input {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: white;
        border-top: 1px solid #e0e0e0;
      }

      .ai-chat-input input {
        flex: 1;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        padding: 10px 14px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .ai-chat-input input:focus {
        border-color: #3f51b5;
      }

      .ai-send-btn {
        background: #3f51b5;
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: background 0.2s;
      }

      .ai-send-btn:hover:not(:disabled) {
        background: #2196f3;
      }

      .ai-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ai-loading {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .ai-loading span {
        width: 8px;
        height: 8px;
        background: #3f51b5;
        border-radius: 50%;
        animation: bounce 1.4s infinite;
      }

      .ai-loading span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ai-loading span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes bounce {
        0%, 80%, 100% {
          opacity: 0.5;
          transform: translateY(0);
        }
        40% {
          opacity: 1;
          transform: translateY(-8px);
        }
      }

      @media (max-width: 480px) {
        .ai-assistant-chat {
          width: calc(100vw - 20px);
          height: 60vh;
          bottom: 70px;
          right: 10px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  attachEventListeners() {
    const btn = document.getElementById('aiAssistantBtn');
    const closeBtn = document.getElementById('aiCloseBtn');
    const sendBtn = document.getElementById('aiSendBtn');
    const input = document.getElementById('aiMessageInput');

    btn.addEventListener('click', () => this.toggle());
    closeBtn.addEventListener('click', () => this.close());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    document.getElementById('aiAssistantChat').classList.add('open');
    document.getElementById('aiMessageInput').focus();
  }

  close() {
    this.isOpen = false;
    document.getElementById('aiAssistantChat').classList.remove('open');
  }

  /**
   * Gather financial context from Firestore to provide to AI
   * This allows AI to answer questions about user's actual financial data
   * IMPORTANT: All data is encrypted in Firestore and must be decrypted before use
   */
  async gatherFinancialContext() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        return null;
      }

      // Import Firestore and encryption services
      const { db } = await import('../config/firebase-config.js');
      const { collection, query, where, getDocs, orderBy, limit, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
      const encryptionService = await import('../services/encryption-service.js').then(m => m.default);

      // Wait for encryption to be ready
      const encryptionReady = await encryptionService.waitForInitialization(5000);
      if (!encryptionReady) {
        log.warn('Encryption not ready, AI may not have access to encrypted data');
      }

      const context = {
        expenses: [],
        income: [],
        budgets: [],
        goals: [],
        investments: [],
        creditCards: [],
        loans: [],
        houses: [],
        vehicles: [],
        recurringTransactions: [],
        transfers: [],
        familyMembers: [],
        tripGroups: [],
        documents: [],
        notes: [],
        healthcareInsurance: [],
        houseHelp: []
      };

      // Get recent expenses (last 3 months) and decrypt
      try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', userId),
          where('date', '>=', threeMonthsAgo.toISOString().split('T')[0]),
          orderBy('date', 'desc'),
          limit(200)
        );
        
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt expenses
        const decryptedExpenses = await encryptionService.decryptArray(expensesData, 'expenses');
        
        context.expenses = decryptedExpenses.map(doc => ({
          date: doc.date,
          amount: doc.amount,
          category: doc.category,
          description: doc.description
        }));
      } catch (error) {
        log.warn('Could not fetch expenses:', error);
      }

      // Get recent income (last 3 months) and decrypt
      try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const incomeQuery = query(
          collection(db, 'income'),
          where('userId', '==', userId),
          where('date', '>=', threeMonthsAgo.toISOString().split('T')[0]),
          orderBy('date', 'desc'),
          limit(100)
        );
        
        const incomeSnapshot = await getDocs(incomeQuery);
        const incomeData = incomeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt income
        const decryptedIncome = await encryptionService.decryptArray(incomeData, 'income');
        
        context.income = decryptedIncome.map(doc => ({
          date: doc.date,
          amount: doc.amount,
          source: doc.source,
          description: doc.description
        }));
      } catch (error) {
        log.warn('Could not fetch income:', error);
      }

      // Get active budgets and decrypt
      try {
        const budgetsQuery = query(
          collection(db, 'budgets'),
          where('userId', '==', userId),
          limit(50)
        );
        
        const budgetsSnapshot = await getDocs(budgetsQuery);
        const budgetsData = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt budgets
        const decryptedBudgets = await encryptionService.decryptArray(budgetsData, 'budgets');
        
        context.budgets = decryptedBudgets.map(doc => ({
          category: doc.category,
          amount: doc.amount,
          period: doc.period
        }));
      } catch (error) {
        log.warn('Could not fetch budgets:', error);
      }

      // Get active goals and decrypt
      try {
        const goalsQuery = query(
          collection(db, 'goals'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const goalsSnapshot = await getDocs(goalsQuery);
        const goalsData = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt goals
        const decryptedGoals = await encryptionService.decryptArray(goalsData, 'goals');
        
        context.goals = decryptedGoals.map(doc => ({
          name: doc.name,
          targetAmount: doc.targetAmount,
          currentAmount: doc.currentAmount,
          targetDate: doc.targetDate,
          status: doc.status
        }));
      } catch (error) {
        log.warn('Could not fetch goals:', error);
      }

      // Get investments and decrypt
      try {
        const investmentsQuery = query(
          collection(db, 'investments'),
          where('userId', '==', userId),
          limit(100)
        );
        
        const investmentsSnapshot = await getDocs(investmentsQuery);
        const investmentsData = investmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt investments
        const decryptedInvestments = await encryptionService.decryptArray(investmentsData, 'investments');
        
        context.investments = decryptedInvestments.map(doc => ({
          name: doc.name,
          type: doc.type,
          currentValue: doc.currentValue,
          investedAmount: doc.investedAmount,
          quantity: doc.quantity
        }));
      } catch (error) {
        log.warn('Could not fetch investments:', error);
      }

      // Get credit cards and decrypt
      try {
        const creditCardsQuery = query(
          collection(db, 'creditCards'),
          where('userId', '==', userId),
          limit(50)
        );
        
        const creditCardsSnapshot = await getDocs(creditCardsQuery);
        const creditCardsData = creditCardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt credit cards
        const decryptedCreditCards = await encryptionService.decryptArray(creditCardsData, 'creditCards');
        
        context.creditCards = decryptedCreditCards.map(doc => ({
          bankName: doc.bankName,
          cardName: doc.cardName,
          creditLimit: doc.creditLimit,
          currentBalance: doc.currentBalance,
          dueDate: doc.dueDate
        }));
      } catch (error) {
        log.warn('Could not fetch credit cards:', error);
      }

      // Get loans and decrypt
      try {
        const loansQuery = query(
          collection(db, 'loans'),
          where('userId', '==', userId),
          limit(50)
        );
        
        const loansSnapshot = await getDocs(loansQuery);
        const loansData = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt loans
        const decryptedLoans = await encryptionService.decryptArray(loansData, 'loans');
        
        context.loans = decryptedLoans.map(doc => ({
          loanType: doc.loanType,
          lender: doc.lender,
          principalAmount: doc.principalAmount,
          outstandingAmount: doc.outstandingAmount,
          interestRate: doc.interestRate,
          emiAmount: doc.emiAmount
        }));
      } catch (error) {
        log.warn('Could not fetch loans:', error);
      }

      // Get houses/properties and decrypt
      try {
        const housesQuery = query(
          collection(db, 'houses'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const housesSnapshot = await getDocs(housesQuery);
        const housesData = housesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt houses
        const decryptedHouses = await encryptionService.decryptArray(housesData, 'houses');
        
        context.houses = decryptedHouses.map(doc => ({
          propertyName: doc.propertyName,
          propertyType: doc.propertyType,
          currentValue: doc.currentValue,
          purchaseValue: doc.purchaseValue,
          address: doc.address
        }));
      } catch (error) {
        log.warn('Could not fetch houses:', error);
      }

      // Get vehicles and decrypt
      try {
        const vehiclesQuery = query(
          collection(db, 'vehicles'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt vehicles
        const decryptedVehicles = await encryptionService.decryptArray(vehiclesData, 'vehicles');
        
        context.vehicles = decryptedVehicles.map(doc => ({
          vehicleName: doc.vehicleName,
          vehicleType: doc.vehicleType,
          currentValue: doc.currentValue,
          purchaseValue: doc.purchaseValue,
          registrationNumber: doc.registrationNumber
        }));
      } catch (error) {
        log.warn('Could not fetch vehicles:', error);
      }

      // Get recurring transactions and decrypt
      try {
        const recurringQuery = query(
          collection(db, 'recurring'),
          where('userId', '==', userId),
          where('isActive', '==', true),
          limit(50)
        );
        
        const recurringSnapshot = await getDocs(recurringQuery);
        const recurringData = recurringSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt recurring transactions
        const decryptedRecurring = await encryptionService.decryptArray(recurringData, 'recurring');
        
        context.recurringTransactions = decryptedRecurring.map(doc => ({
          description: doc.description,
          amount: doc.amount,
          frequency: doc.frequency,
          category: doc.category,
          type: doc.type
        }));
      } catch (error) {
        log.warn('Could not fetch recurring transactions:', error);
      }

      // Get transfers and decrypt
      try {
        const transfersQuery = query(
          collection(db, 'transfers'),
          where('userId', '==', userId),
          orderBy('date', 'desc'),
          limit(50)
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        const transfersData = transfersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt transfers
        const decryptedTransfers = await encryptionService.decryptArray(transfersData, 'transfers');
        
        context.transfers = decryptedTransfers.map(doc => ({
          date: doc.date,
          amount: doc.amount,
          fromAccount: doc.fromAccount,
          toAccount: doc.toAccount,
          description: doc.description
        }));
      } catch (error) {
        log.warn('Could not fetch transfers:', error);
      }

      // Get family members from user profile and decrypt
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          let userData = { id: userDoc.id, ...userDoc.data() };
          
          // Decrypt user data
          userData = await encryptionService.decryptObject(userData, 'users');
          
          if (userData.familyMembers) {
            context.familyMembers = userData.familyMembers.map(member => ({
              name: member.name,
              relationship: member.relationship,
              dateOfBirth: member.dateOfBirth
            }));
          }
        }
      } catch (error) {
        log.warn('Could not fetch family members:', error);
      }

      // Get trip groups and decrypt
      try {
        const tripGroupsQuery = query(
          collection(db, 'tripGroups'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const tripGroupsSnapshot = await getDocs(tripGroupsQuery);
        const tripGroupsData = tripGroupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt trip groups
        const decryptedTripGroups = await encryptionService.decryptArray(tripGroupsData, 'tripGroups');
        
        context.tripGroups = decryptedTripGroups.map(doc => ({
          name: doc.name,
          totalBudget: doc.totalBudget,
          totalSpent: doc.totalSpent,
          memberCount: doc.members?.length || 0
        }));
      } catch (error) {
        log.warn('Could not fetch trip groups:', error);
      }

      // Get healthcare insurance and decrypt
      try {
        const healthcareQuery = query(
          collection(db, 'healthcareInsurance'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const healthcareSnapshot = await getDocs(healthcareQuery);
        const healthcareData = healthcareSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt healthcare insurance
        const decryptedHealthcare = await encryptionService.decryptArray(healthcareData, 'healthcareInsurance');
        
        context.healthcareInsurance = decryptedHealthcare.map(doc => ({
          policyName: doc.policyName,
          provider: doc.provider,
          coverageAmount: doc.coverageAmount,
          premium: doc.premium,
          policyNumber: doc.policyNumber
        }));
      } catch (error) {
        log.warn('Could not fetch healthcare insurance:', error);
      }

      // Get house help and decrypt
      try {
        const houseHelpQuery = query(
          collection(db, 'houseHelp'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const houseHelpSnapshot = await getDocs(houseHelpQuery);
        const houseHelpData = houseHelpSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt house help
        const decryptedHouseHelp = await encryptionService.decryptArray(houseHelpData, 'houseHelp');
        
        context.houseHelp = decryptedHouseHelp.map(doc => ({
          name: doc.name,
          role: doc.role,
          salary: doc.salary,
          paymentFrequency: doc.paymentFrequency
        }));
      } catch (error) {
        log.warn('Could not fetch house help:', error);
      }

      // Get documents count and decrypt
      try {
        const documentsQuery = query(
          collection(db, 'documents'),
          where('userId', '==', userId),
          limit(100)
        );
        
        const documentsSnapshot = await getDocs(documentsQuery);
        const documentsData = documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt documents
        const decryptedDocuments = await encryptionService.decryptArray(documentsData, 'documents');
        
        context.documents = decryptedDocuments.map(doc => ({
          name: doc.name,
          category: doc.category,
          uploadDate: doc.uploadDate
        }));
      } catch (error) {
        log.warn('Could not fetch documents:', error);
      }

      // Get notes count and decrypt
      try {
        const notesQuery = query(
          collection(db, 'notes'),
          where('userId', '==', userId),
          limit(50)
        );
        
        const notesSnapshot = await getDocs(notesQuery);
        const notesData = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Decrypt notes
        const decryptedNotes = await encryptionService.decryptArray(notesData, 'notes');
        
        context.notes = decryptedNotes.map(doc => ({
          title: doc.title,
          category: doc.category,
          createdAt: doc.createdAt
        }));
      } catch (error) {
        log.warn('Could not fetch notes:', error);
      }

      log.log('Comprehensive financial context gathered (ALL DATA DECRYPTED):', {
        expenses: context.expenses.length,
        income: context.income.length,
        budgets: context.budgets.length,
        goals: context.goals.length,
        investments: context.investments.length,
        creditCards: context.creditCards.length,
        loans: context.loans.length,
        houses: context.houses.length,
        vehicles: context.vehicles.length,
        recurringTransactions: context.recurringTransactions.length,
        transfers: context.transfers.length,
        familyMembers: context.familyMembers.length,
        tripGroups: context.tripGroups.length,
        healthcareInsurance: context.healthcareInsurance.length,
        houseHelp: context.houseHelp.length,
        documents: context.documents.length,
        notes: context.notes.length
      });

      return context;
    } catch (error) {
      log.error('Error gathering financial context:', error);
      return null;
    }
  }

  async sendMessage() {
    const input = document.getElementById('aiMessageInput');
    const message = input.value.trim();

    if (!message || this.isLoading) {
      return;
    }

    // Add user message to chat
    this.addMessage(message, 'user');
    input.value = '';

    // Show loading state
    this.isLoading = true;
    this.showLoadingMessage();

    try {
      // Get decrypted API key from key service
      const apiKey = await geminiKeyService.getUserKey();
      
      if (!apiKey) {
        throw new Error('No API key found. Please configure your Gemini API key in settings.');
      }

      // Gather financial context for the AI
      const financialContext = await this.gatherFinancialContext();

      // Get Firebase token
      const token = await auth.currentUser.getIdToken();

      // Call backend with decrypted API key and financial context
      const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'chat',
          data: {
            message: message,
            financialContext: financialContext // Include user's financial data
          },
          apiKey: apiKey // Send decrypted key to backend
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const result = await response.json();
      
      // Remove loading message and add AI response
      this.removeLoadingMessage();
      this.addMessage(result.data, 'assistant');
    } catch (error) {
      log.error('Error sending message:', error);
      this.removeLoadingMessage();
      this.addMessage('Sorry, I encountered an error: ' + error.message, 'assistant');
    } finally {
      this.isLoading = false;
    }
  }

  addMessage(text, sender) {
    const messagesDiv = document.getElementById('aiChatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${sender}`;
    
    const p = document.createElement('p');
    // Convert line breaks to <br> tags for proper display
    p.innerHTML = text.replace(/\n/g, '<br>');
    messageEl.appendChild(p);
    
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  showLoadingMessage() {
    const messagesDiv = document.getElementById('aiChatMessages');
    const loadingEl = document.createElement('div');
    loadingEl.id = 'ai-loading-message';
    loadingEl.className = 'ai-message assistant';
    loadingEl.innerHTML = '<div class="ai-loading"><span></span><span></span><span></span></div>';
    messagesDiv.appendChild(loadingEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  removeLoadingMessage() {
    const loadingEl = document.getElementById('ai-loading-message');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  static async initialize() {
    // Wait for auth to be ready
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        if (user) {
          const assistant = new AIAssistant();
          resolve(assistant);
        } else {
          resolve(null);
        }
      });
    });
  }
}

export default AIAssistant;
