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
