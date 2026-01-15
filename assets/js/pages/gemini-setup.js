// Gemini Setup Page Script
import { auth } from '../config/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import geminiKeyService from '../services/gemini-key-service.js';
import authEncryptionHelper from '../utils/auth-encryption-helper.js';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Sidebar auto-initializes, no need to call it manually
    
    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Load user profile in sidebar
        loadUserProfile(user);

        // Initialize encryption for the user
        try {
            const encryptionReady = await authEncryptionHelper.initializeForGoogleUser(user.uid);
            if (!encryptionReady) {
                console.warn('Encryption initialization failed, but continuing...');
            }
        } catch (error) {
            console.error('Error initializing encryption:', error);
        }

        // Load key status
        await loadKeyStatus();

        // Setup event listeners
        setupEventListeners();
    });
});

/**
 * Load and display user profile in sidebar
 */
function loadUserProfile(user) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userAvatar = document.getElementById('userAvatar');

    if (userName) {
        userName.textContent = user.displayName || user.email || 'User';
    }

    if (userEmail) {
        userEmail.textContent = user.email || 'user@example.com';
    }

    if (userAvatar) {
        // Get first letter of display name or email
        const initials = user.displayName 
            ? user.displayName[0].toUpperCase()
            : user.email[0].toUpperCase();
        userAvatar.textContent = initials;
    }
}

/**
 * Load and display key status
 */
async function loadKeyStatus() {
    try {
        const hasKey = await geminiKeyService.hasUserKey();
        const status = await geminiKeyService.getKeyStatus();

        const keyStatusDiv = document.getElementById('keyStatus');
        
        if (!hasKey) {
            keyStatusDiv.innerHTML = `
                <p style="color: var(--text-secondary); text-align: center;">
                    No API key configured yet. Follow the steps above to add one.
                </p>
            `;
            document.getElementById('validateKeyBtn').disabled = true;
            return;
        }

        if (status) {
            const createdDate = status.createdAt ? new Date(status.createdAt).toLocaleDateString() : 'N/A';
            const lastUsedDate = status.lastUsed ? new Date(status.lastUsed).toLocaleDateString() : 'Never';

            keyStatusDiv.innerHTML = `
                <div class="key-status-item">
                    <span class="key-status-label">Status</span>
                    <span class="key-status-value ${status.isActive ? 'active' : 'inactive'}">
                        ${status.isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                </div>
                <div class="key-status-item">
                    <span class="key-status-label">Created</span>
                    <span class="key-status-value">${createdDate}</span>
                </div>
                <div class="key-status-item">
                    <span class="key-status-label">Last Used</span>
                    <span class="key-status-value">${lastUsedDate}</span>
                </div>
                <div class="key-status-item">
                    <span class="key-status-label">Total Requests</span>
                    <span class="key-status-value">${status.totalUsageCount}</span>
                </div>
                <div class="key-status-item">
                    <span class="key-status-label">Today's Requests</span>
                    <span class="key-status-value">${status.todayRequestCount}</span>
                </div>
                <div class="key-status-item">
                    <span class="key-status-label">Today's Tokens</span>
                    <span class="key-status-value">${status.todayTokenCount}</span>
                </div>
                <div class="key-status-item">
                    <span class="key-status-label">Est. Daily Cost</span>
                    <span class="key-status-value">$${status.estimatedDailyCost}</span>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                    <button class="btn btn-danger" id="deleteKeyBtn" style="width: 100%;">
                        Delete API Key
                    </button>
                </div>
            `;

            document.getElementById('deleteKeyBtn').addEventListener('click', deleteKey);
            document.getElementById('validateKeyBtn').disabled = false;
        }
    } catch (error) {
        console.error('Error loading key status:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const validateKeyBtn = document.getElementById('validateKeyBtn');
    const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');

    toggleKeyVisibility.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleKeyVisibility.textContent = type === 'password' ? '👁️' : '🙈';
    });

    saveKeyBtn.addEventListener('click', saveKey);
    validateKeyBtn.addEventListener('click', validateKey);
}

/**
 * Save API key
 */
async function saveKey() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput.value.trim();
    const statusMessage = document.getElementById('statusMessage');

    if (!apiKey) {
        showMessage('Please enter your API key', 'error', statusMessage);
        return;
    }

    if (!apiKey.startsWith('AIza')) {
        showMessage('Invalid API key format. It should start with "AIza"', 'error', statusMessage);
        return;
    }

    try {
        showMessage('Saving API key...', 'info', statusMessage);
        const result = await geminiKeyService.storeUserKey(apiKey);

        if (result.success) {
            showMessage('✓ API key saved successfully!', 'success', statusMessage);
            apiKeyInput.value = '';
            
            // Reload key status
            setTimeout(() => {
                loadKeyStatus();
            }, 1000);
        } else {
            showMessage('Error: ' + result.message, 'error', statusMessage);
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error', statusMessage);
    }
}

/**
 * Validate API key
 */
async function validateKey() {
    const statusMessage = document.getElementById('statusMessage');
    const validateKeyBtn = document.getElementById('validateKeyBtn');

    try {
        validateKeyBtn.disabled = true;
        showMessage('Validating API key...', 'info', statusMessage);

        const result = await geminiKeyService.validateApiKey();

        if (result.valid) {
            showMessage('✓ API key is valid and working!', 'success', statusMessage);
        } else {
            showMessage('✗ API key validation failed: ' + result.message, 'error', statusMessage);
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error', statusMessage);
    } finally {
        validateKeyBtn.disabled = false;
    }
}

/**
 * Delete API key
 */
async function deleteKey() {
    if (!confirm('Are you sure you want to delete your API key? AI features will be disabled.')) {
        return;
    }

    try {
        const result = await geminiKeyService.deleteUserKey();

        if (result.success) {
            alert('API key deleted successfully');
            loadKeyStatus();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

/**
 * Show status message
 */
function showMessage(message, type, element) {
    element.textContent = message;
    element.className = `status-message show ${type}`;
}
