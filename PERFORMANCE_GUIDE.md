# Rupiya Performance Optimization Guide

Guide for optimizing Rupiya's performance and achieving excellent Core Web Vitals scores.

## Performance Targets

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Lighthouse Scores
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

---

## Optimization Techniques

### 1. Image Optimization

#### Compress Images
```bash
# Use tools like ImageOptim, TinyPNG, or Squoosh
# Target: < 100KB per image
```

#### Lazy Loading
```html
<!-- Use data-src for lazy loading -->
<img data-src="image.jpg" alt="Description" class="lazy-image">
```

```javascript
// Implemented in performance.js
PerformanceUtils.lazyLoadImages('img[data-src]');
```

#### Responsive Images
```html
<img 
  srcset="image-320w.jpg 320w,
          image-640w.jpg 640w,
          image-1024w.jpg 1024w"
  sizes="(max-width: 320px) 280px,
         (max-width: 640px) 600px,
         1024px"
  src="image-640w.jpg"
  alt="Description">
```

### 2. CSS Optimization

#### Minification
```bash
# Use cssnano or clean-css
npx cssnano assets/css/common.css assets/css/common.min.css
```

#### Critical CSS
```html
<!-- Inline critical CSS in <head> -->
<style>
  /* Critical above-the-fold styles */
  body { margin: 0; font-family: sans-serif; }
  .header { background: #4A90E2; }
</style>

<!-- Load full CSS asynchronously -->
<link rel="preload" href="assets/css/common.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

#### Remove Unused CSS
```javascript
// Use PurgeCSS or manually remove unused styles
// Implemented in performance.js
PerformanceUtils.removeUnusedCSS(usedSelectors);
```

### 3. JavaScript Optimization

#### Minification
```bash
# Use terser or uglify-js
npx terser assets/js/app.js -o assets/js/app.min.js -c -m
```

#### Code Splitting
```javascript
// Load modules only when needed
async function loadExpensesModule() {
  const module = await import('./pages/expenses.js');
  module.init();
}
```

#### Defer Non-Critical JS
```html
<!-- Defer non-critical scripts -->
<script src="analytics.js" defer></script>

<!-- Or use async for independent scripts -->
<script src="chat-widget.js" async></script>
```

#### Debounce & Throttle
```javascript
// Debounce search input
import PerformanceUtils from './utils/performance.js';

searchInput.addEventListener('input', 
  PerformanceUtils.debounce((e) => {
    performSearch(e.target.value);
  }, 300)
);

// Throttle scroll events
window.addEventListener('scroll',
  PerformanceUtils.throttle(() => {
    handleScroll();
  }, 100)
);
```

### 4. Firebase Optimization

#### Query Optimization
```javascript
// Bad: Fetch all data
const allExpenses = await firestoreService.getExpenses();

// Good: Limit and paginate
const recentExpenses = await getDocs(
  query(
    collection(db, 'expenses'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(20)
  )
);
```

#### Caching
```javascript
// Cache frequently accessed data
import PerformanceUtils from './utils/performance.js';

const cache = PerformanceUtils.createCache(5 * 60 * 1000); // 5 minutes

async function getExpenses() {
  if (cache.has('expenses')) {
    return cache.get('expenses');
  }

  const expenses = await firestoreService.getExpenses();
  cache.set('expenses', expenses);
  return expenses;
}
```

#### Batch Operations
```javascript
// Bad: Multiple individual writes
for (const expense of expenses) {
  await firestoreService.addExpense(expense);
}

// Good: Batch write
const batch = writeBatch(db);
expenses.forEach(expense => {
  const docRef = doc(collection(db, 'expenses'));
  batch.set(docRef, expense);
});
await batch.commit();
```

### 5. Network Optimization

#### HTTP/2 Server Push
```html
<!-- Preload critical resources -->
<link rel="preload" href="assets/css/common.css" as="style">
<link rel="preload" href="assets/js/app.js" as="script">
<link rel="preconnect" href="https://fonts.googleapis.com">
```

#### CDN Usage
```html
<!-- Use CDN for libraries -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.js"></script>
```

#### Compression
```apache
# Enable gzip compression in .htaccess
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

### 6. Caching Strategy

#### Service Worker Caching
```javascript
// Implemented in service-worker.js
// Cache-first strategy for static assets
// Network-first strategy for API calls
```

#### Browser Caching
```apache
# Set cache headers in .htaccess
<FilesMatch "\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>

<FilesMatch "\.(html)$">
  Header set Cache-Control "max-age=3600, must-revalidate"
</FilesMatch>
```

### 7. Rendering Optimization

#### Avoid Layout Shifts
```css
/* Reserve space for images */
img {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}

/* Use CSS containment */
.card {
  contain: layout style paint;
}
```

#### Optimize Animations
```css
/* Use transform and opacity for animations */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Use will-change sparingly */
.animated-element {
  will-change: transform;
}
```

#### Virtual Scrolling
```javascript
// For large lists (1000+ items)
import PerformanceUtils from './utils/performance.js';

const { visibleItems, offsetY } = PerformanceUtils.virtualScroll(
  allItems,
  itemHeight,
  containerHeight,
  scrollTop
);

renderVisibleItems(visibleItems, offsetY);
```

### 8. Database Optimization

#### Indexing
```javascript
// Create composite indexes in Firestore
// Firebase Console > Firestore > Indexes
// Example: userId + date (desc)
```

#### Pagination
```javascript
// Implement cursor-based pagination
let lastVisible = null;

async function loadMore() {
  const q = lastVisible
    ? query(
        collection(db, 'expenses'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        startAfter(lastVisible),
        limit(20)
      )
    : query(
        collection(db, 'expenses'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(20)
      );

  const snapshot = await getDocs(q);
  lastVisible = snapshot.docs[snapshot.docs.length - 1];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

---

## Performance Monitoring

### 1. Lighthouse Audit
```bash
# Run Lighthouse
npx lighthouse https://your-domain.com --view

# Generate report
npx lighthouse https://your-domain.com --output html --output-path ./report.html
```

### 2. Chrome DevTools
- Performance tab: Record and analyze runtime performance
- Network tab: Monitor network requests
- Coverage tab: Find unused CSS/JS

### 3. Real User Monitoring (RUM)
```javascript
// Implemented in performance.js
PerformanceUtils.monitorPerformance();

// Monitor specific metrics
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.duration);
  }
});
observer.observe({ entryTypes: ['measure', 'navigation'] });
```

### 4. Firebase Performance Monitoring
```html
<!-- Add Firebase Performance SDK -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
  import { getPerformance } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-performance.js';
  
  const app = initializeApp(firebaseConfig);
  const perf = getPerformance(app);
</script>
```

---

## Performance Checklist

### Initial Load
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Total Blocking Time < 300ms
- [ ] Cumulative Layout Shift < 0.1

### Assets
- [ ] Images optimized and compressed
- [ ] CSS minified
- [ ] JavaScript minified
- [ ] Fonts optimized (woff2 format)
- [ ] Icons optimized (SVG or icon fonts)

### Caching
- [ ] Service Worker implemented
- [ ] Browser caching configured
- [ ] CDN configured (if applicable)
- [ ] Static assets cached

### Code
- [ ] Unused CSS removed
- [ ] Unused JavaScript removed
- [ ] Code splitting implemented
- [ ] Lazy loading implemented
- [ ] Debounce/throttle on events

### Database
- [ ] Queries optimized
- [ ] Indexes created
- [ ] Pagination implemented
- [ ] Caching strategy in place

### Network
- [ ] HTTP/2 enabled
- [ ] Compression enabled
- [ ] Preload critical resources
- [ ] Minimize redirects

---

## Performance Budget

Set and monitor performance budgets:

```json
{
  "budgets": [
    {
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "stylesheet", "budget": 100 },
        { "resourceType": "image", "budget": 500 },
        { "resourceType": "font", "budget": 100 },
        { "resourceType": "total", "budget": 1000 }
      ],
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1500 },
        { "metric": "largest-contentful-paint", "budget": 2500 },
        { "metric": "interactive", "budget": 3500 }
      ]
    }
  ]
}
```

---

## Tools & Resources

### Testing Tools
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **WebPageTest**: https://www.webpagetest.org/
- **GTmetrix**: https://gtmetrix.com/

### Optimization Tools
- **ImageOptim**: https://imageoptim.com/
- **TinyPNG**: https://tinypng.com/
- **Squoosh**: https://squoosh.app/
- **PurgeCSS**: https://purgecss.com/
- **Terser**: https://terser.org/

### Learning Resources
- **Web.dev**: https://web.dev/
- **MDN Performance**: https://developer.mozilla.org/en-US/docs/Web/Performance
- **Google Web Fundamentals**: https://developers.google.com/web/fundamentals

---

**Last Updated**: January 2, 2026
**Version**: 1.0.0

