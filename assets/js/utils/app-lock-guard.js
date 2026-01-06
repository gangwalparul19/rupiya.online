// App Lock Guard - Checks and shows lock screen on protected pages
// Include this script on pages that should be protected by app lock

(async function() {
  // Wait for modules to load
  const { default: appLock } = await import('../components/app-lock.js');
  const { default: appLockService } = await import('../services/app-lock-service.js');
  const { default: authService } = await import('../services/auth-service.js');

  // Wait for auth to be ready
  await authService.waitForAuth();
  
  // Only check if user is authenticated
  if (!authService.isAuthenticated()) {
    return;
  }

  // Check if app lock is enabled and should show
  if (appLockService.isEnabled()) {
    if (appLockService.isLocked() || appLockService.shouldAutoLock()) {
      appLockService.lock();
      appLock.show();
    }
  }
})();
