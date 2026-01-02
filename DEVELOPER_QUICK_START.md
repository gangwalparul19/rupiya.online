# Developer Quick Start Guide

Quick reference for developers working on Rupiya.

## Setup (5 minutes)

### 1. Clone & Navigate
```bash
cd rupiya-vanilla
```

### 2. Start Local Server
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve

# Option 3: PHP
php -S localhost:8000
```

### 3. Open Browser
```
http://localhost:8000
```

### 4. Test Login
- Email: `test@rupiya.com`
- Password: `Test@123456`

---

## Project Structure

```
rupiya-vanilla/
├── *.html                  # Pages
├── assets/
│   ├── css/               # Styles
│   ├── js/                # Scripts
│   └── images/            # Assets
├── manifest.json          # PWA
├── service-worker.js      # Offline
└── *.md                   # Docs
```

---

## Key Files

### Configuration
- `assets/js/config/firebase-config.js` - Firebase setup

### Services
- `assets/js/services/auth-service.js` - Authentication
- `assets/js/services/firestore-service.js` - Database
- `assets/js/services/storage-service.js` - File storage

### Utilities
- `assets/js/utils/helpers.js` - Helper functions
- `assets/js/utils/performance.js` - Performance tools
- `assets/js/utils/error-handler.js` - Error handling

### Styles
- `assets/css/common.css` - Global styles
- `assets/css/components.css` - Components
- `assets/css/responsive.css` - Mobile
- `assets/css/loading.css` - Loading states
- `assets/css/accessibility.css` - A11y

---

## Common Tasks

### Add New Page

1. **Create HTML file**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - Rupiya</title>
  <link rel="stylesheet" href="assets/css/common.css">
  <link rel="stylesheet" href="assets/css/components.css">
  <link rel="stylesheet" href="assets/css/your-page.css">
</head>
<body>
  <div id="app">
    <!-- Content -->
  </div>
  <script type="module" src="assets/js/pages/your-page.js"></script>
</body>
</html>
```

2. **Create CSS file** (`assets/css/your-page.css`)
3. **Create JS file** (`assets/js/pages/your-page.js`)

### Add Firestore Collection

```javascript
// In firestore-service.js
async addYourData(data) {
  return this.add('yourCollection', data);
}

async getYourData() {
  return this.getAll('yourCollection');
}

async updateYourData(id, data) {
  return this.update('yourCollection', id, data);
}

async deleteYourData(id) {
  return this.delete('yourCollection', id);
}
```

### Show Loading State

```javascript
import loadingManager from '../components/loading.js';

// Page loader
loadingManager.showPageLoader('Loading...');
loadingManager.hidePageLoader();

// Button loader
loadingManager.showButtonLoader(button);
loadingManager.hideButtonLoader(button);

// With async operation
await loadingManager.withLoading(
  async () => {
    // Your async code
  },
  { showPage: true }
);
```

### Handle Errors

```javascript
import errorHandler from '../utils/error-handler.js';

try {
  // Your code
} catch (error) {
  errorHandler.handle(error, 'Context Name');
}

// With retry
const result = await errorHandler.retry(
  async () => {
    // Operation to retry
  },
  3, // max retries
  1000 // delay
);
```

### Show Toast Notification

```javascript
// Success
showToast('Operation successful!', 'success');

// Error
showToast('Something went wrong', 'error');

// Warning
showToast('Please check your input', 'warning');

// Info
showToast('New feature available', 'info');
```

---

## Firebase Operations

### Authentication

```javascript
import authService from '../services/auth-service.js';

// Sign in
const result = await authService.signIn(email, password);

// Sign up
const result = await authService.signUp(email, password, displayName);

// Sign out
await authService.signOut();

// Get current user
const user = authService.getCurrentUser();

// Check if authenticated
if (authService.isAuthenticated()) {
  // User is logged in
}
```

### Firestore

```javascript
import firestoreService from '../services/firestore-service.js';

// Add document
const result = await firestoreService.addExpense({
  amount: 1000,
  category: 'Food',
  description: 'Lunch',
  date: new Date()
});

// Get all documents
const expenses = await firestoreService.getExpenses();

// Update document
await firestoreService.updateExpense(id, {
  amount: 1500
});

// Delete document
await firestoreService.deleteExpense(id);
```

### Storage

```javascript
import storageService from '../services/storage-service.js';

// Upload file
const result = await storageService.uploadFile(
  file,
  'documents',
  (progress) => {
    console.log(`Upload: ${progress}%`);
  }
);

// Delete file
await storageService.deleteFile(filePath);

// Get file URL
const { url } = await storageService.getFileURL(filePath);
```

---

## Styling

### Use CSS Variables

```css
.my-component {
  color: var(--primary-blue);
  background: var(--bg-card);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-md);
}
```

### Responsive Design

```css
/* Mobile first */
.element {
  width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .element {
    width: 50%;
  }
}

/* Desktop */
@media (min-width: 992px) {
  .element {
    width: 33.333%;
  }
}
```

### Use Utility Classes

```html
<div class="d-flex justify-content-between align-items-center gap-3 p-3">
  <span class="text-primary fw-bold">Title</span>
  <button class="btn btn-primary">Action</button>
</div>
```

---

## Performance Tips

### Debounce Search

```javascript
import PerformanceUtils from '../utils/performance.js';

searchInput.addEventListener('input',
  PerformanceUtils.debounce((e) => {
    performSearch(e.target.value);
  }, 300)
);
```

### Lazy Load Images

```html
<img data-src="image.jpg" alt="Description" class="lazy-image">
```

```javascript
import PerformanceUtils from '../utils/performance.js';
PerformanceUtils.lazyLoadImages('img[data-src]');
```

### Cache Data

```javascript
import PerformanceUtils from '../utils/performance.js';

const cache = PerformanceUtils.createCache(5 * 60 * 1000);

async function getData() {
  if (cache.has('key')) {
    return cache.get('key');
  }
  
  const data = await fetchData();
  cache.set('key', data);
  return data;
}
```

---

## Debugging

### Enable Console Logs

```javascript
// In firebase-config.js or app.js
const DEBUG = true;

if (DEBUG) {
  console.log('Debug info:', data);
}
```

### Check Firebase Connection

```javascript
// In browser console
console.log('Auth:', auth);
console.log('DB:', db);
console.log('Storage:', storage);
console.log('User:', authService.getCurrentUser());
```

### View Service Worker

1. Open DevTools
2. Go to Application tab
3. Click Service Workers
4. Check status and cache

---

## Testing

### Manual Testing Checklist

- [ ] Login/Signup works
- [ ] Dashboard loads
- [ ] CRUD operations work
- [ ] Search/Filter works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Loading states show
- [ ] Error messages display

### Browser Testing

```bash
# Chrome
chrome --disable-web-security --user-data-dir=/tmp/chrome

# Firefox
firefox -private-window

# Safari
# Use Safari Technology Preview
```

---

## Deployment

### Firebase Hosting

```bash
# Login
firebase login

# Initialize (first time)
firebase init hosting

# Deploy
firebase deploy --only hosting

# View
firebase open hosting:site
```

### Quick Deploy

```bash
# Build (if needed)
# No build step for vanilla JS

# Deploy
firebase deploy --only hosting -m "Version 1.0.1"
```

---

## Troubleshooting

### Firebase Not Connecting
1. Check `firebase-config.js` credentials
2. Verify authorized domains in Firebase Console
3. Check browser console for errors

### Authentication Failing
1. Enable auth methods in Firebase Console
2. Check email/password format
3. Clear browser cache

### Data Not Loading
1. Check Firestore security rules
2. Verify user is authenticated
3. Check network tab in DevTools

### PWA Not Installing
1. Verify HTTPS is enabled
2. Check `manifest.json` is accessible
3. Verify service worker is registered
4. Check icons exist

---

## Useful Commands

```bash
# Start server
python -m http.server 8000

# Firebase login
firebase login

# Firebase deploy
firebase deploy --only hosting

# View Firebase logs
firebase functions:log

# Clear browser cache
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (Mac)

# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## Resources

### Documentation
- [Migration Plan](./MIGRATION_PLAN_NEXTJS_TO_VANILLA.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Performance Guide](./PERFORMANCE_GUIDE.md)

### External
- [Firebase Docs](https://firebase.google.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Chart.js Docs](https://www.chartjs.org/docs/)

---

## Quick Reference

### Color Palette
- Primary Blue: `#4A90E2`
- Success Green: `#27AE60`
- Danger Red: `#E74C3C`
- Warning Orange: `#F39C12`
- Info Cyan: `#3498DB`

### Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 991px`
- Desktop: `≥ 992px`

### Firebase Collections
- `expenses` - Expense records
- `income` - Income records
- `budgets` - Budget plans
- `goals` - Financial goals
- `investments` - Investment portfolio
- `houses` - Property assets
- `vehicles` - Vehicle assets
- `houseHelps` - House help records
- `notes` - User notes
- `documents` - Document metadata

---

**Happy Coding! 🚀**

