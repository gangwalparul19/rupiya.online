// Landing Page Logic

// Scroll effect for navigation
const nav = document.getElementById('landingNav');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// Mobile menu toggle
if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('show');
    
    // Update icon
    const icon = mobileMenuToggle.querySelector('svg path');
    if (mobileMenu.classList.contains('show')) {
      icon.setAttribute('d', 'M6 18L18 6M6 6l12 12');
    } else {
      icon.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
    }
  });
  
  // Close mobile menu when clicking on a link
  document.querySelectorAll('.mobile-menu-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('show');
      const icon = mobileMenuToggle.querySelector('svg path');
      icon.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
    });
  });
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
      mobileMenu.classList.remove('show');
      const icon = mobileMenuToggle.querySelector('svg path');
      icon.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
    }
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Animation on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe all feature cards, step cards, and benefit cards
document.querySelectorAll('.feature-card, .step-card, .benefit-card, .stat-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'all 0.6s ease-out';
  observer.observe(card);
});

// Add stagger effect to feature cards
document.querySelectorAll('.feature-card').forEach((card, index) => {
  card.style.transitionDelay = `${index * 0.1}s`;
});

// Add stagger effect to stat cards
document.querySelectorAll('.stat-card').forEach((card, index) => {
  card.style.transitionDelay = `${index * 0.1}s`;
});

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = formatStatValue(target);
      clearInterval(timer);
    } else {
      element.textContent = formatStatValue(Math.floor(current));
    }
  }, 16);
}

function formatStatValue(value) {
  const originalText = value.toString();
  if (originalText.includes('K')) return originalText;
  if (originalText.includes('Cr')) return originalText;
  if (originalText.includes('/')) return originalText;
  if (originalText.includes('M')) return originalText;
  return value.toLocaleString();
}

// Observe stat cards for counter animation
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      const valueElement = entry.target.querySelector('.stat-value');
      const originalValue = valueElement.textContent;
      entry.target.dataset.animated = 'true';
      
      // Extract number from text like "10K+", "₹50Cr+", "4.9/5", "1M+"
      let targetValue = 0;
      if (originalValue.includes('K+')) {
        targetValue = parseInt(originalValue) * 1000;
        setTimeout(() => {
          let current = 0;
          const interval = setInterval(() => {
            current += 200;
            if (current >= targetValue) {
              valueElement.textContent = originalValue;
              clearInterval(interval);
            } else {
              valueElement.textContent = Math.floor(current / 1000) + 'K+';
            }
          }, 20);
        }, 300);
      } else if (originalValue.includes('Cr+')) {
        valueElement.textContent = '₹0Cr+';
        setTimeout(() => {
          let current = 0;
          const target = parseInt(originalValue.replace('₹', '').replace('Cr+', ''));
          const interval = setInterval(() => {
            current += 1;
            if (current >= target) {
              valueElement.textContent = originalValue;
              clearInterval(interval);
            } else {
              valueElement.textContent = '₹' + current + 'Cr+';
            }
          }, 40);
        }, 300);
      } else if (originalValue.includes('/')) {
        valueElement.textContent = '0.0/5';
        setTimeout(() => {
          let current = 0;
          const target = parseFloat(originalValue);
          const interval = setInterval(() => {
            current += 0.1;
            if (current >= target) {
              valueElement.textContent = originalValue;
              clearInterval(interval);
            } else {
              valueElement.textContent = current.toFixed(1) + '/5';
            }
          }, 40);
        }, 300);
      } else if (originalValue.includes('M+')) {
        valueElement.textContent = '0M+';
        setTimeout(() => {
          let current = 0;
          const target = parseInt(originalValue.replace('M+', ''));
          const interval = setInterval(() => {
            current += 0.02;
            if (current >= target) {
              valueElement.textContent = originalValue;
              clearInterval(interval);
            } else {
              valueElement.textContent = current.toFixed(1) + 'M+';
            }
          }, 20);
        }, 300);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-card').forEach(card => {
  statObserver.observe(card);
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const heroContent = document.querySelector('.hero-content');
  if (heroContent && scrolled < 800) {
    heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
    heroContent.style.opacity = 1 - (scrolled / 800);
  }
});

// Add floating shapes to hero section
function createFloatingShapes() {
  const heroSection = document.querySelector('.hero-section');
  if (!heroSection) return;
  
  const shapesContainer = document.createElement('div');
  shapesContainer.className = 'floating-shapes';
  
  for (let i = 0; i < 3; i++) {
    const shape = document.createElement('div');
    shape.className = `shape shape-${i + 1}`;
    shapesContainer.appendChild(shape);
  }
  
  heroSection.insertBefore(shapesContainer, heroSection.firstChild);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  createFloatingShapes();
});


// PWA Install functionality
let deferredPrompt;
const heroInstallBtn = document.getElementById('heroInstallBtn');
const pwaInstallBanner = document.getElementById('pwaInstallBanner');
const installAppBtn = document.getElementById('installAppBtn');
const closePwaBanner = document.getElementById('closePwaBanner');

// Detect device and browser
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Check if already installed
if (isInStandaloneMode()) {
  // Already installed, don't show install options
  console.log('App is already installed');
  if (heroInstallBtn) {
    heroInstallBtn.style.display = 'none';
  }
  if (pwaInstallBanner) {
    pwaInstallBanner.style.display = 'none';
  }
} else {
  // Show install button for all devices
  if (heroInstallBtn) {
    heroInstallBtn.style.display = 'inline-flex';
    
    // Update button text based on device
    if (isIOS()) {
      heroInstallBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Install App
      `;
    } else if (isAndroid()) {
      heroInstallBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Install App
      `;
    } else {
      heroInstallBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Install App
      `;
    }
  }
  
  // Show banner
  if (pwaInstallBanner) {
    pwaInstallBanner.style.display = 'block';
  }
  
  // Listen for beforeinstallprompt event (Android Chrome, Edge, etc.)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    console.log('PWA install prompt available (Android/Desktop)');
  });
}

// Show iOS install instructions modal
function showIOSInstructions() {
  const modal = document.createElement('div');
  modal.className = 'pwa-install-modal';
  modal.innerHTML = `
    <div class="pwa-install-modal-content">
      <div class="install-instructions">
        <h3>📱 Install Rupiya App</h3>
        <p>To install this app on your iPhone:</p>
        <ol>
          <li>Tap the <strong>Share</strong> button <svg style="display: inline; width: 16px; height: 16px; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg> at the bottom of the screen</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>Tap <strong>"Add"</strong> in the top right corner</li>
          <li>The app will appear on your home screen!</li>
        </ol>
        <button class="btn btn-primary w-100" onclick="this.closest('.pwa-install-modal').remove()">Got it!</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Show Android install instructions for browsers that don't support beforeinstallprompt
function showAndroidInstructions() {
  const modal = document.createElement('div');
  modal.className = 'pwa-install-modal';
  modal.innerHTML = `
    <div class="pwa-install-modal-content">
      <div class="install-instructions">
        <h3>📱 Install Rupiya App</h3>
        <p>To install this app on your Android device:</p>
        <ol>
          <li>Tap the <strong>menu</strong> button (⋮) in your browser</li>
          <li>Look for <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
          <li>Tap it and confirm</li>
          <li>The app will appear on your home screen!</li>
        </ol>
        <button class="btn btn-primary w-100" onclick="this.closest('.pwa-install-modal').remove()">Got it!</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Handle install button click (hero button)
if (heroInstallBtn) {
  heroInstallBtn.addEventListener('click', async () => {
    // iOS - show instructions
    if (isIOS()) {
      showIOSInstructions();
      return;
    }
    
    // Android/Desktop with beforeinstallprompt support
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response to the install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Hide the install button
        if (heroInstallBtn) {
          heroInstallBtn.style.display = 'none';
        }
        // Hide the banner
        if (pwaInstallBanner) {
          pwaInstallBanner.style.display = 'none';
        }
      }
      
      // Clear the deferredPrompt
      deferredPrompt = null;
    } else {
      // Android without beforeinstallprompt - show instructions
      if (isAndroid()) {
        showAndroidInstructions();
      } else {
        // Desktop - show generic instructions
        alert('To install this app:\n\n1. Click the install icon in your browser\'s address bar\n2. Or check your browser menu for "Install" or "Add to Home Screen" option');
      }
    }
  });
}

// Handle install button click (banner button)
if (installAppBtn) {
  installAppBtn.addEventListener('click', async () => {
    // iOS - show instructions
    if (isIOS()) {
      showIOSInstructions();
      return;
    }
    
    // Android/Desktop with beforeinstallprompt support
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`User response to the install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Hide the banner
        if (pwaInstallBanner) {
          pwaInstallBanner.style.display = 'none';
        }
        // Hide the install button
        if (heroInstallBtn) {
          heroInstallBtn.style.display = 'none';
        }
      }
      
      // Clear the deferredPrompt
      deferredPrompt = null;
    } else {
      // Android without beforeinstallprompt - show instructions
      if (isAndroid()) {
        showAndroidInstructions();
      } else {
        // Desktop - show generic instructions
        alert('To install this app:\n\n1. Click the install icon in your browser\'s address bar\n2. Or check your browser menu for "Install" or "Add to Home Screen" option');
      }
    }
  });
}

// Handle close banner button
if (closePwaBanner) {
  closePwaBanner.addEventListener('click', () => {
    if (pwaInstallBanner) {
      pwaInstallBanner.style.display = 'none';
    }
  });
}

// Handle close banner button
if (closePwaBanner) {
  closePwaBanner.addEventListener('click', () => {
    if (pwaInstallBanner) {
      pwaInstallBanner.style.display = 'none';
    }
  });
}

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  
  // Hide all install prompts
  if (heroInstallBtn) {
    heroInstallBtn.style.display = 'none';
  }
  
  if (pwaInstallBanner) {
    pwaInstallBanner.style.display = 'none';
  }
  
  // Clear the deferredPrompt
  deferredPrompt = null;
});
