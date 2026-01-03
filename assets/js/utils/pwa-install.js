// PWA Installation Manager
class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
    this.init();
  }

  init() {
    // Check if app is already installed
    this.checkInstallStatus();
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallUI();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.hideInstallUI();
      this.showInstalledMessage();
      
      // Clear the deferredPrompt
      this.deferredPrompt = null;
    });

    // Check if launched as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      console.log('[PWA] Running as installed app');
      this.isStandalone = true;
      this.hideInstallUI();
    }
  }

  checkInstallStatus() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      this.isInstalled = true;
      this.isStandalone = true;
      return true;
    }

    // Check localStorage for install status
    const installStatus = localStorage.getItem('pwa-installed');
    if (installStatus === 'true') {
      this.isInstalled = true;
      return true;
    }

    return false;
  }

  showInstallUI() {
    // Show install button on landing page
    const landingInstallBtn = document.getElementById('pwaInstallBanner');
    if (landingInstallBtn) {
      landingInstallBtn.style.display = 'flex';
    }

    // Show install button on dashboard
    const dashboardInstallBtn = document.getElementById('dashboardInstallBtn');
    if (dashboardInstallBtn) {
      dashboardInstallBtn.style.display = 'flex';
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  }

  hideInstallUI() {
    // Hide install button on landing page
    const landingInstallBtn = document.getElementById('pwaInstallBanner');
    if (landingInstallBtn) {
      landingInstallBtn.style.display = 'none';
    }

    // Hide install button on dashboard
    const dashboardInstallBtn = document.getElementById('dashboardInstallBtn');
    if (dashboardInstallBtn) {
      dashboardInstallBtn.style.display = 'none';
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('[PWA] Install prompt not available');
      
      // Show manual install instructions
      this.showManualInstallInstructions();
      return false;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
      localStorage.setItem('pwa-installed', 'true');
      this.isInstalled = true;
    } else {
      console.log('[PWA] User dismissed the install prompt');
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }

    // Clear the deferredPrompt
    this.deferredPrompt = null;
    
    return outcome === 'accepted';
  }

  showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let message = '';
    
    if (isIOS) {
      message = `
        <div class="install-instructions">
          <h3>📱 Install Rupiya on iOS</h3>
          <ol>
            <li>Tap the Share button <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg></li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to confirm</li>
          </ol>
        </div>
      `;
    } else if (isAndroid) {
      message = `
        <div class="install-instructions">
          <h3>📱 Install Rupiya on Android</h3>
          <ol>
            <li>Tap the menu button (⋮) in your browser</li>
            <li>Tap "Add to Home screen" or "Install app"</li>
            <li>Tap "Install" to confirm</li>
          </ol>
        </div>
      `;
    } else {
      message = `
        <div class="install-instructions">
          <h3>💻 Install Rupiya on Desktop</h3>
          <ol>
            <li>Look for the install icon in your browser's address bar</li>
            <li>Click it and follow the prompts</li>
            <li>Or use your browser's menu: Settings → Install Rupiya</li>
          </ol>
        </div>
      `;
    }

    // Show in a modal or toast
    const modal = document.createElement('div');
    modal.className = 'pwa-install-modal';
    modal.innerHTML = `
      <div class="pwa-install-modal-content">
        ${message}
        <button class="btn btn-primary" onclick="this.closest('.pwa-install-modal').remove()">Got it!</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showInstalledMessage() {
    // Show success message
    if (typeof toast !== 'undefined') {
      toast.success('🎉 Rupiya installed successfully! You can now use it like a native app.');
    } else {
      alert('🎉 Rupiya installed successfully! You can now use it like a native app.');
    }
  }

  // Check if user dismissed install prompt recently
  shouldShowInstallPrompt() {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (!dismissedTime) return true;

    // Show again after 7 days
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const timeSinceDismissed = Date.now() - parseInt(dismissedTime);
    
    return timeSinceDismissed > sevenDaysInMs;
  }

  // Get install status
  getInstallStatus() {
    return {
      isInstalled: this.isInstalled,
      isStandalone: this.isStandalone,
      canPrompt: !!this.deferredPrompt,
      shouldShow: this.shouldShowInstallPrompt()
    };
  }
}

// Create singleton instance
const pwaInstallManager = new PWAInstallManager();

export default pwaInstallManager;
