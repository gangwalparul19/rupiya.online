# Rupiya - Quick Reference Guide

## 🚀 Quick Start

### Start Development Server
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Access: `http://localhost:8000`

---

## 🔐 Authentication

### Sign In
```javascript
import authService from './services/auth-service.js';

const result = await authService.signIn(email, password);
if (result.success) {
  window.location.href = '/dashboard.html';
}
```

### Sign Up
```javascript
const result = await authService.signUp(email, password, displayName);
```

### Google Sign In
```javascript
const result = await authService.signInWithGoogle();
```

### Check Auth Status
```javascript
if (!authService.isAuthenticated()) {
  window.location.href = '/login.html';
}
```

---

## 💾 Database Operations

### Add Expense
```javascript
import firestoreService from './services/firestore-service.js';

await firestoreService.addExpense({
  amount: 1500,
  category: "Food",
  description: "Dinner",
  date: new Date()
});
```

### Get All Expenses
```javascript
const expenses = await firestoreService.getExpenses();
```

### Update Expense
```javascript
await firestoreService.updateExpense(expenseId, {
  amount: 1600
});
```

### Delete Expense
```javascript
await firestoreService.deleteExpense(expenseId);
```

---

## 👨‍👩‍👧‍👦 Family Management

### Create Family Group
```javascript
import familyService from './services/family-service.js';

const result = await familyService.createFamilyGroup("Smith Family");
```

### Invite Member
```javascript
await familyService.inviteMember(groupId, "jane@example.com", "member");
```

### Get User's Invitations
```javascript
const invitations = await familyService.getUserInvitations();
```

### Accept Invitation
```javascript
await familyService.acceptInvitation(invitationId);
```

---

## 🎨 UI Components

### Show Toast
```javascript
import { showToast } from './components/toast.js';

showToast('Success!', 'success');
showToast('Error occurred', 'error');
showToast('Warning message', 'warning');
showToast('Info message', 'info');
```

### Loading States
```javascript
import { showLoading, hideLoading } from './components/loading.js';

showLoading();
await fetchData();
hideLoading();
```

---

## 📁 File Structure

```
assets/
├── css/
│   ├── common.css          # Global styles
│   ├── components.css      # UI components
│   └── [page].css          # Page-specific
├── js/
│   ├── config/
│   │   ├── firebase-config.js
│   │   └── env.js
│   ├── services/
│   │   ├── auth-service.js
│   │   ├── user-service.js
│   │   ├── firestore-service.js
│   │   └── family-service.js
│   ├── components/
│   │   ├── toast.js
│   │   └── loading.js
│   └── pages/
│       └── [page].js
```

---

## 🔒 Security Rules

### Firestore Rules Pattern
```javascript
match /collection/{docId} {
  allow read: if belongsToUser();
  allow create: if isAuthenticated() && hasValidUserId();
  allow update: if belongsToUser() && userIdNotChanged();
  allow delete: if belongsToUser();
}
```

### Deploy Rules
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

---

## 🌐 Environment Variables

### Required Variables
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

---

## 🐛 Common Issues

### CORS Errors
❌ Problem: Opening files directly  
✅ Solution: Use `http://localhost:8000`

### Permission Denied
❌ Problem: Firestore rules not deployed  
✅ Solution: `firebase deploy --only firestore:rules`

### Email Not Sending
❌ Problem: Missing Gmail credentials  
✅ Solution: Set `GMAIL_USER` and `GMAIL_APP_PASSWORD`

---

## 📊 Database Collections

| Collection | Purpose |
|------------|---------|
| users | User profiles |
| expenses | Expense transactions |
| income | Income transactions |
| familyGroups | Family groups |
| familyInvitations | Pending invitations |
| budgets | Budget plans |
| investments | Investment tracking |
| goals | Financial goals |
| houses | House management |
| vehicles | Vehicle management |
| documents | Document storage |
| notes | User notes |

---

## 🔧 Useful Commands

### Firebase
```bash
# Login
firebase login

# Initialize
firebase init

# Deploy
firebase deploy

# Deploy specific
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

### Vercel
```bash
# Login
vercel login

# Deploy
vercel

# Production
vercel --prod
```

---

## 📱 PWA

### Install Service Worker
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

### Update Cache Version
```bash
node update-cache-version.js
```

---

## 🎯 Page Protection

```javascript
import authService from './services/auth-service.js';

await authService.waitForAuth();

if (!authService.isAuthenticated()) {
  window.location.href = '/login.html';
}
```

---

## 📈 Dashboard KPIs

```javascript
// Calculate KPIs
const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
const cashFlow = totalIncome - totalExpenses;
const savingsRate = ((cashFlow / totalIncome) * 100).toFixed(1);
```

---

## 🔄 Service Initialization

```javascript
// Import in every page
import './services/services-init.js';
```

---

## 📝 Code Snippets

### Page Template
```javascript
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import { showToast } from '../components/toast.js';

// Auth check
await authService.waitForAuth();
if (!authService.isAuthenticated()) {
  window.location.href = '/login.html';
}

// Initialize
async function init() {
  try {
    const data = await firestoreService.getExpenses();
    render(data);
  } catch (error) {
    showToast('Error loading data', 'error');
  }
}

init();
```

### Form Submission
```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  const result = await firestoreService.addExpense(data);
  
  if (result.success) {
    showToast('Added successfully!', 'success');
    form.reset();
  } else {
    showToast(result.error, 'error');
  }
});
```

---

## 🎨 CSS Variables

```css
:root {
  --primary-color: #4A90E2;
  --secondary-color: #00D4FF;
  --success-color: #10B981;
  --danger-color: #EF4444;
  --warning-color: #F59E0B;
  
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

---

**Quick Links:**
- [Full Documentation](TECHNICAL_DOCUMENTATION.md)
- [README](README.md)
- [Firebase Console](https://console.firebase.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)
