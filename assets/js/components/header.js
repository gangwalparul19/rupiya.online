/**
 * Reusable Header Component
 * Injects navigation header into pages
 */

const HeaderComponent = {
  /**
   * Render landing page header (for index, features, user-guide, login, signup)
   * @param {string} activePage - Current active page name
   */
  renderLandingHeader: (activePage = '') => {
    // Inject navbar CSS if not already present
    if (!document.querySelector('link[href*="navbar.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/css/navbar.css';
      document.head.appendChild(link);
    }

    const header = `
      <nav class="navbar" id="navbar">
        <div class="nav-container">
          <a href="index.html" class="logo">
            <img src="logo.png" alt="Rupiya Logo">
          </a>
          <div class="nav-links" id="navLinks">
            <a href="user-guide-public.html" ${activePage === 'guide' ? 'class="active"' : ''}>Guide</a>
            <a href="features.html" ${activePage === 'features' ? 'class="active"' : ''}>Features</a>
            <a href="login.html" class="btn btn-outline">Sign In</a>
            <a href="signup.html" class="btn btn-primary">Get Started</a>
          </div>
          <button class="mobile-toggle" id="mobileToggle">&#9776;</button>
        </div>
      </nav>
    `;
    return header;
  },

  /**
   * Render auth page header (for login, signup)
   * @param {string} currentPage - 'login' or 'signup'
   */
  renderAuthHeader: (currentPage = '') => {
    // Inject navbar CSS if not already present
    if (!document.querySelector('link[href*="navbar.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/css/navbar.css';
      document.head.appendChild(link);
    }

    const header = `
      <nav class="landing-nav">
        <div class="container">
          <div class="landing-logo">
            <a href="index.html">
              <img src="assets/images/logo.png" alt="Rupiya">
            </a>
          </div>
          <div class="landing-nav-links" id="navLinks">
            <a href="user-guide-public.html">Guide</a>
            <a href="features.html">Features</a>
            ${currentPage === 'login' ? '<a href="signup.html" class="btn btn-primary">Get Started</a>' : '<a href="login.html" class="btn btn-outline">Login</a>'}
          </div>
          <button class="mobile-toggle" id="mobileToggle">&#9776;</button>
        </div>
      </nav>
    `;
    return header;
  },

  /**
   * Initialize mobile menu toggle functionality
   */
  initMobileMenu: () => {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navLinks.classList.toggle('active');
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) {
          navLinks.classList.remove('active');
        }
      });

      // Close menu when clicking on a link
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('active');
        });
      });
    }

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
      });
    }
  },

  /**
   * Inject header into page
   * @param {string} containerId - ID of container element
   * @param {string} type - 'landing' or 'auth'
   * @param {string} activePage - Current page identifier
   */
  inject: (containerId, type = 'landing', activePage = '') => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Header container #${containerId} not found`);
      return;
    }

    const headerHTML = type === 'auth' 
      ? HeaderComponent.renderAuthHeader(activePage)
      : HeaderComponent.renderLandingHeader(activePage);

    container.innerHTML = headerHTML;
    HeaderComponent.initMobileMenu();
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeaderComponent;
}
