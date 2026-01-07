/**
 * Button Reset Fix
 * Ensures buttons never get stuck in loading state
 * This is a failsafe mechanism that runs independently
 */

(function() {
  'use strict';

  // Buttons that should remain disabled (intentionally disabled by design)
  const excludedButtons = [
    'confirmDeleteAccountBtn',  // Disabled until user types confirmation
    'confirmDeletePaymentMethodBtn',  // Disabled until confirmed
    'confirmDeleteBtn',  // Generic delete confirmation buttons
    'deleteAccountBtn'  // Account deletion buttons
  ];

  // Reset stuck buttons on page load
  function resetStuckButtons() {
    document.querySelectorAll('.btn, button').forEach(btn => {
      // Check if button is disabled
      if (!btn.disabled) return;
      
      // Skip buttons that are intentionally disabled
      if (excludedButtons.includes(btn.id)) {
        return;
      }
      
      // Check for visible spinners (not hidden ones)
      const spinners = btn.querySelectorAll('.spinner');
      let hasVisibleSpinner = false;
      
      spinners.forEach(spinner => {
        const style = window.getComputedStyle(spinner);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          hasVisibleSpinner = true;
        }
      });
      
      // Also check if button text contains "..." or "Loading" or "Saving" or "Adding"
      const btnText = btn.textContent.toLowerCase();
      const isLoadingText = btnText.includes('loading') || 
                           btnText.includes('saving') || 
                           btnText.includes('adding') ||
                           btnText.includes('deleting') ||
                           btnText.includes('processing') ||
                           btnText.includes('...');
      
      if (hasVisibleSpinner || isLoadingText) {
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
          'addNoteBtn': 'Add Note',
          'saveRecurringBtn': 'Save Recurring',
          'addRecurringBtn': 'Add Recurring',
          'saveTripGroupBtn': 'Save Group',
          'addTripGroupBtn': 'Add Group',
          'saveSplitExpenseBtn': 'Save Split',
          'addSplitExpenseBtn': 'Add Split'
        };

        if (btnId && commonButtons[btnId]) {
          btn.textContent = commonButtons[btnId];
        } else {
          // Remove all visible spinners
          spinners.forEach(spinner => {
            const style = window.getComputedStyle(spinner);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              spinner.remove();
            }
          });
        }
      }
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(resetStuckButtons, 100);
      // Run again after a short delay to catch any late-loading buttons
      setTimeout(resetStuckButtons, 500);
      setTimeout(resetStuckButtons, 1000);
    });
  } else {
    // Document already loaded, run immediately
    setTimeout(resetStuckButtons, 100);
    setTimeout(resetStuckButtons, 500);
    setTimeout(resetStuckButtons, 1000);
  }

  // Run when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resetStuckButtons();
    }
  });

  // Run on page show (handles back/forward cache)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Page was restored from bfcache
      console.log('[Button Fix] Page restored from cache, resetting buttons');
      resetStuckButtons();
    }
  });

  // Monitor for buttons that stay disabled too long
  setInterval(() => {
    document.querySelectorAll('.btn:disabled, button:disabled').forEach(btn => {
      // Skip buttons that are intentionally disabled
      if (excludedButtons.includes(btn.id)) {
        return;
      }
      
      // Check for visible spinners
      const spinners = btn.querySelectorAll('.spinner');
      let hasVisibleSpinner = false;
      
      spinners.forEach(spinner => {
        const style = window.getComputedStyle(spinner);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          hasVisibleSpinner = true;
        }
      });
      
      // Check for loading text
      const btnText = btn.textContent.toLowerCase();
      const isLoadingText = btnText.includes('loading') || 
                           btnText.includes('saving') || 
                           btnText.includes('adding') ||
                           btnText.includes('deleting') ||
                           btnText.includes('processing') ||
                           btnText.includes('...');
      
      if (hasVisibleSpinner || isLoadingText) {
        // Check if button has been disabled for more than 10 seconds
        const disabledTime = btn.dataset.disabledTime;
        if (!disabledTime) {
          btn.dataset.disabledTime = Date.now();
        } else {
          const elapsed = Date.now() - parseInt(disabledTime);
          if (elapsed > 10000) {
            console.warn('[Button Fix] Auto-resetting button after 10s:', btn.id || btn.className);
            btn.disabled = false;
            
            // Remove visible spinners
            spinners.forEach(spinner => {
              const style = window.getComputedStyle(spinner);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                spinner.remove();
              }
            });
            
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
              // Check if spinner is visible
              const style = window.getComputedStyle(node);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                // Set a timeout to auto-reset this button
                setTimeout(() => {
                  if (btn.disabled && btn.contains(node)) {
                    const currentStyle = window.getComputedStyle(node);
                    if (currentStyle.display !== 'none' && currentStyle.visibility !== 'hidden') {
                      console.warn('[Button Fix] Timeout reset for:', btn.id || btn.className);
                      btn.disabled = false;
                      if (node.parentNode) {
                        node.remove();
                      }
                    }
                  }
                }, 10000);
              }
            }
          }
          // Check if the node contains spinners
          const spinners = node.querySelectorAll && node.querySelectorAll('.spinner');
          if (spinners && spinners.length > 0) {
            spinners.forEach(spinner => {
              const btn = spinner.closest('.btn, button');
              if (btn) {
                const style = window.getComputedStyle(spinner);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                  setTimeout(() => {
                    if (btn.disabled && btn.contains(spinner)) {
                      const currentStyle = window.getComputedStyle(spinner);
                      if (currentStyle.display !== 'none' && currentStyle.visibility !== 'hidden') {
                        console.warn('[Button Fix] Timeout reset for:', btn.id || btn.className);
                        btn.disabled = false;
                        if (spinner.parentNode) {
                          spinner.remove();
                        }
                      }
                    }
                  }, 10000);
                }
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

  // Add click listener to all buttons to track when they're clicked
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, button');
    if (btn && btn.type === 'submit') {
      // Skip buttons that are intentionally disabled
      if (excludedButtons.includes(btn.id)) {
        return;
      }
      
      // Mark the button as clicked
      btn.dataset.clickedAt = Date.now();
      
      // Set a failsafe timeout
      setTimeout(() => {
        if (btn.disabled) {
          console.warn('[Button Fix] Button still disabled 12s after click, force resetting:', btn.id || btn.className);
          btn.disabled = false;
          
          // Remove any spinners
          const spinners = btn.querySelectorAll('.spinner');
          spinners.forEach(spinner => {
            const style = window.getComputedStyle(spinner);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              spinner.remove();
            }
          });
          
          // Try to restore text
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
            'addNoteBtn': 'Add Note',
            'saveRecurringBtn': 'Save Recurring',
            'addRecurringBtn': 'Add Recurring',
            'saveTripGroupBtn': 'Save Group',
            'addTripGroupBtn': 'Add Group',
            'saveSplitExpenseBtn': 'Save Split',
            'addSplitExpenseBtn': 'Add Split'
          };
          
          if (btnId && commonButtons[btnId]) {
            btn.textContent = commonButtons[btnId];
          }
        }
      }, 12000); // 12 seconds failsafe
    }
  }, true); // Use capture phase to catch it early

  console.log('[Button Fix] Button reset failsafe initialized');
})();
