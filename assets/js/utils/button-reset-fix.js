/**
 * Button Reset Fix
 * Ensures buttons never get stuck in loading state
 * This is a failsafe mechanism that runs independently
 */

(function() {
  'use strict';

  // Reset stuck buttons on page load
  function resetStuckButtons() {
    document.querySelectorAll('.btn, button').forEach(btn => {
      const spinner = btn.querySelector('.spinner');
      if (spinner && btn.disabled) {
        console.log('[Button Fix] Resetting stuck button:', btn.id || btn.className);
        btn.disabled = false;
        
        // Try to restore original button content
        const btnId = btn.id;
        const commonButtons = {
          'addPaymentMethodBtn': 'Add Payment Method',
          'saveProfileBtn': 'Save Changes',
          'changePasswordBtn': 'Change Password',
          'savePreferencesBtn': 'Save Preferences',
          'saveIncomeBtn': 'Save Income',
          'addIncomeBtn': 'Add Income',
          'saveExpenseBtn': 'Save Expense',
          'addExpenseBtn': 'Add Expense',
          'saveBudgetBtn': 'Save Budget',
          'addBudgetBtn': 'Add Budget',
          'saveGoalBtn': 'Save Goal',
          'addGoalBtn': 'Add Goal',
          'saveInvestmentBtn': 'Save Investment',
          'addInvestmentBtn': 'Add Investment',
          'saveLoanBtn': 'Save Loan',
          'addLoanBtn': 'Add Loan',
          'saveHouseBtn': 'Save House',
          'addHouseBtn': 'Add House',
          'saveVehicleBtn': 'Save Vehicle',
          'addVehicleBtn': 'Add Vehicle',
          'saveDocumentBtn': 'Save Document',
          'addDocumentBtn': 'Add Document',
          'saveNoteBtn': 'Save Note',
          'addNoteBtn': 'Add Note'
        };

        if (btnId && commonButtons[btnId]) {
          btn.textContent = commonButtons[btnId];
        } else {
          // Just remove the spinner
          spinner.remove();
        }
      }
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(resetStuckButtons, 100);
    });
  } else {
    setTimeout(resetStuckButtons, 100);
  }

  // Run when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resetStuckButtons();
    }
  });

  // Monitor for buttons that stay disabled too long
  setInterval(() => {
    document.querySelectorAll('.btn:disabled, button:disabled').forEach(btn => {
      const spinner = btn.querySelector('.spinner');
      if (spinner) {
        // Check if button has been disabled for more than 10 seconds
        const disabledTime = btn.dataset.disabledTime;
        if (!disabledTime) {
          btn.dataset.disabledTime = Date.now();
        } else {
          const elapsed = Date.now() - parseInt(disabledTime);
          if (elapsed > 10000) {
            console.warn('[Button Fix] Auto-resetting button after 10s:', btn.id || btn.className);
            btn.disabled = false;
            spinner.remove();
            delete btn.dataset.disabledTime;
          }
        }
      }
    });

    // Clean up dataset for enabled buttons
    document.querySelectorAll('.btn:not(:disabled), button:not(:disabled)').forEach(btn => {
      if (btn.dataset.disabledTime) {
        delete btn.dataset.disabledTime;
      }
    });
  }, 2000); // Check every 2 seconds

  // Observe DOM for new spinners
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if the node itself is a spinner
          if (node.classList && node.classList.contains('spinner')) {
            const btn = node.closest('.btn, button');
            if (btn) {
              // Set a timeout to auto-reset this button
              setTimeout(() => {
                if (btn.disabled && btn.contains(node)) {
                  console.warn('[Button Fix] Timeout reset for:', btn.id || btn.className);
                  btn.disabled = false;
                  if (node.parentNode) {
                    node.remove();
                  }
                }
              }, 10000);
            }
          }
          // Check if the node contains spinners
          const spinners = node.querySelectorAll && node.querySelectorAll('.spinner');
          if (spinners && spinners.length > 0) {
            spinners.forEach(spinner => {
              const btn = spinner.closest('.btn, button');
              if (btn) {
                setTimeout(() => {
                  if (btn.disabled && btn.contains(spinner)) {
                    console.warn('[Button Fix] Timeout reset for:', btn.id || btn.className);
                    btn.disabled = false;
                    if (spinner.parentNode) {
                      spinner.remove();
                    }
                  }
                }, 10000);
              }
            });
          }
        }
      });
    });
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  console.log('[Button Fix] Button reset failsafe initialized');
})();
