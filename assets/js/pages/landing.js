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
