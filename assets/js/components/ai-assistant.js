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
            <p>Hi! I'm your financial AI assistant. I can help you with:</p>
            <ul>
              <li>Expense categorization</li>
              <li>Budget analysis</li>
              <li>Spending insights</li>
              <li>Financial recommendations</li>
            </ul>
            <p>What would you like to know?</p>
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

      // Get Firebase token
      const token = await auth.currentUser.getIdToken();

      // Call backend with decrypted API key
      const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'chat',
          data: {
            message: message
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
    p.textContent = text;
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
