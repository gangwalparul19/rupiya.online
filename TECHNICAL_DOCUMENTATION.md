# Rupiya - Technical Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Authentication System](#authentication-system)
4. [Database Structure](#database-structure)
5. [Services Layer](#services-layer)
6. [Frontend Structure](#frontend-structure)
7. [Security & Rules](#security--rules)
8. [API Endpoints](#api-endpoints)
9. [Development Setup](#development-setup)
10. [Deployment](#deployment)

---

## 1. Project Overview

**Rupiya** is an AI-powered personal finance and expense tracking platform built with vanilla HTML, CSS, and JavaScript. It uses Firebase as the backend infrastructure for authentication, database, and storage.

### Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6 Modules)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Email Service**: Nodemailer (via Vercel Serverless Functions)
- **Hosting**: Vercel / Firebase Hosting
- **PWA**: Progressive Web App with Service Worker

### Key Features
- User authentication (Email/Password + Google OAuth)
- Personal expense and income tracking
- Family group management with shared finances
- Budget planning and goal tracking
- Investment and asset management (houses, vehicles)
- Document storage and management
- AI-powered financial insights
- Offline support (PWA)

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTML Pages  │  │  CSS Styles  │  │  JavaScript  │      │
│  │  (Views)     │  │  (Design)    │  │  (Logic)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │ User Service │  │ Firestore    │      │
│  │              │  │              │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Family       │  │ Storage      │  │ Categories   │      │
│  │ Service      │  │ Service      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Firebase     │  │ Cloud        │  │ Cloud        │      │
│  │ Auth         │  │ Firestore    │  │ Storage      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Endpoints (Nodemailer for Email Invitations)   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
rupiya/
├── index.html                    # Landing page
├── login.html                    # Login page
├── signup.html                   # Signup page
├── dashboard.html                # Main dashboard
├── family.html                   # Family management
├── expenses.html                 # Expense tracking
├── income.html                   # Income tracking
├── budgets.html                  # Budget planning
├── investments.html              # Investment tracking
├── goals.html                    # Financial goals
├── houses.html                   # House management
├── vehicles.html                 # Vehicle management
├── documents.html                # Document storage
├── notes.html                    # Notes
├── profile.html                  # User profile
│
├── assets/
│   ├── css/                      # Stylesheets
│   │   ├── common.css            # Global styles & variables
│   │   ├── components.css        # Reusable components
│   │   ├── dark-mode.css         # Dark theme
│   │   └── [page-specific].css  # Page-specific styles
│   │
│   ├── js/
│   │   ├── config/               # Configuration
│   │   │   ├── firebase-config.js    # Firebase initialization
│   │   │   └── env.js                # Environment variables
│   │   │
│   │   ├── services/             # Business logic layer
│   │   │   ├── auth-service.js       # Authentication
│   │   │   ├── user-service.js       # User management
│   │   │   ├── firestore-service.js  # Generic CRUD
│   │   │   ├── family-service.js     # Family groups
│   │   │   ├── storage-service.js    # File uploads
│   │   │   └── services-init.js      # Service initialization
│   │   │
│   │   ├── components/           # Reusable UI components
│   │   │   ├── toast.js              # Notifications
│   │   │   ├── loading.js            # Loading states
│   │   │   └── family-switcher.js    # Family selector
│   │   │
│   │   ├── pages/                # Page-specific logic
│   │   │   ├── dashboard.js
│   │   │   ├── family.js
│   │   │   └── [page].js
│   │   │
│   │   └── utils/                # Helper functions
│   │       ├── helpers.js
│   │       ├── validation.js
│   │       ├── error-handler.js
│   │       └── theme-manager.js
│   │
│   └── images/                   # Static images
│
├── api/                          # Serverless functions
│   └── send-invitation.js        # Email invitation API
│
├── firebase.json                 # Firebase configuration
├── firestore.rules               # Database security rules
├── firestore.indexes.json        # Database indexes
├── storage.rules                 # Storage security rules
├── service-worker.js             # PWA service worker
├── manifest.json                 # PWA manifest
├── vercel.json                   # Vercel deployment config
└── package.json                  # Dependencies
```

---

## 3. Authentication System

### Overview
Authentication is handled by Firebase Authentication with support for:
- Email/Password authentication
- Google OAuth (Sign in with Google)
- Password reset functionality
- Session persistence

### Auth Service (`auth-service.js`)

**Key Features:**
- Singleton pattern for global access
- Auth state listener with callbacks
- Automatic user profile creation on signup/login
- Caching of current user
- User-friendly error messages

**Authentication Flow:**

```javascript
// 1. User submits login form
const result = await authService.signIn(email, password);

// 2. Auth service validates credentials with Firebase
// 3. On success, Firebase returns user object
// 4. Auth state listener triggers
// 5. User service creates/updates user profile in Firestore
// 6. User is redirected to dashboard
```

**Key Methods:**

```javascript
// Sign in with email/password
await authService.signIn(email, password);

// Sign up with email/password
await authService.signUp(email, password, displayName);

// Sign in with Google
await authService.signInWithGoogle();

// Sign out
await authService.signOut();

// Reset password
await authService.resetPassword(email);

// Check authentication status
const isAuth = authService.isAuthenticated();

// Get current user
const user = authService.getCurrentUser();

// Listen to auth state changes
authService.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
  } else {
    // User is signed out
  }
});
```

**Protected Routes:**
All pages except `index.html`, `login.html`, and `signup.html` are protected. Each protected page includes:

```javascript
import authService from './assets/js/services/auth-service.js';

// Wait for auth to initialize
await authService.waitForAuth();

// Check if user is authenticated
if (!authService.isAuthenticated()) {
  window.location.href = '/login.html';
}
```

---

## 4. Database Structure

### Firestore Collections

#### 1. **users** Collection
Stores user profile information.

```javascript
{
  // Document ID: userId (Firebase Auth UID)
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "https://...",
  emailVerified: true,
  phoneNumber: "+1234567890",
  providerId: "google.com" | "password",
  
  // Preferences
  preferences: {
    currency: "INR",
    language: "en",
    theme: "light",
    notifications: true
  },
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt: Timestamp,
  profileComplete: false,
  isActive: true,
  
  // Family groups
  familyGroups: ["groupId1", "groupId2"]
}
```

#### 2. **expenses** Collection
Stores expense transactions.

```javascript
{
  // Document ID: auto-generated
  userId: "user123",
  amount: 1500.00,
  category: "Food & Dining",
  subcategory: "Restaurants",
  description: "Dinner at restaurant",
  date: Timestamp,
  paymentMethod: "Credit Card",
  
  // Optional: Family group
  familyGroupId: "group123",
  
  // Optional: Linked to asset
  linkedType: "house" | "vehicle" | null,
  linkedId: "house123",
  
  // Optional: Receipt
  receiptUrl: "https://...",
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 3. **income** Collection
Stores income transactions.

```javascript
{
  userId: "user123",
  amount: 50000.00,
  source: "Salary",
  category: "Employment",
  description: "Monthly salary",
  date: Timestamp,
  
  // Optional: Family group
  familyGroupId: "group123",
  
  // Optional: Linked to asset
  linkedType: "house" | "vehicle" | null,
  linkedId: "house123",
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 4. **familyGroups** Collection
Stores family group information.

```javascript
{
  // Document ID: auto-generated
  name: "Smith Family",
  createdBy: "user123",
  
  // Members array
  members: [
    {
      userId: "user123",
      email: "john@example.com",
      name: "John Smith",
      role: "admin" | "member",
      joinedAt: Timestamp
    }
  ],
  
  // Settings
  settings: {
    currency: "INR",
    allowMemberInvites: true,
    shareAllTransactions: false
  },
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 5. **familyInvitations** Collection
Stores pending family invitations.

```javascript
{
  groupId: "group123",
  groupName: "Smith Family",
  invitedBy: "user123",
  invitedByName: "John Smith",
  invitedEmail: "jane@example.com",
  role: "member" | "admin",
  status: "pending" | "accepted" | "declined" | "expired",
  
  // Timestamps
  createdAt: Timestamp,
  expiresAt: Timestamp,  // 7 days from creation
  acceptedAt: Timestamp,
  declinedAt: Timestamp
}
```

#### 6. **budgets** Collection
```javascript
{
  userId: "user123",
  category: "Food & Dining",
  amount: 10000.00,
  month: "2025-01",
  spent: 7500.00,
  remaining: 2500.00,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 7. **investments** Collection
```javascript
{
  userId: "user123",
  name: "Mutual Fund XYZ",
  type: "Mutual Fund" | "Stocks" | "Bonds" | "Real Estate",
  amount: 100000.00,
  currentValue: 120000.00,
  purchaseDate: Timestamp,
  returns: 20.0,  // percentage
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 8. **goals** Collection
```javascript
{
  userId: "user123",
  name: "Emergency Fund",
  targetAmount: 500000.00,
  currentAmount: 250000.00,
  targetDate: Timestamp,
  category: "Savings",
  priority: "high" | "medium" | "low",
  status: "active" | "completed" | "paused",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 9. **houses** Collection
```javascript
{
  userId: "user123",
  name: "Main Residence",
  address: "123 Main St",
  purchasePrice: 5000000.00,
  currentValue: 6000000.00,
  purchaseDate: Timestamp,
  propertyType: "Apartment" | "House" | "Villa",
  totalExpenses: 150000.00,
  totalIncome: 0.00,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 10. **vehicles** Collection
```javascript
{
  userId: "user123",
  name: "Honda City",
  make: "Honda",
  model: "City",
  year: 2022,
  purchasePrice: 1200000.00,
  currentValue: 1000000.00,
  registrationNumber: "MH01AB1234",
  totalExpenses: 50000.00,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 11. **documents** Collection
```javascript
{
  userId: "user123",
  name: "Tax Return 2024",
  type: "Tax Document",
  fileUrl: "https://storage.googleapis.com/...",
  fileSize: 1024000,  // bytes
  mimeType: "application/pdf",
  tags: ["tax", "2024"],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 12. **notes** Collection
```javascript
{
  userId: "user123",
  title: "Investment Strategy",
  content: "Long-term investment plan...",
  category: "Investments",
  tags: ["planning", "investments"],
  isPinned: false,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 13. **recurringTransactions** Collection
```javascript
{
  userId: "user123",
  type: "expense" | "income",
  amount: 1500.00,
  category: "Utilities",
  description: "Monthly electricity bill",
  frequency: "monthly" | "weekly" | "yearly",
  startDate: Timestamp,
  endDate: Timestamp,
  isActive: true,
  lastProcessed: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 5. Services Layer

### Service Architecture

The application uses a service-oriented architecture where each service handles specific business logic:

### 1. **Auth Service** (`auth-service.js`)
**Purpose:** Manages user authentication and session state.

**Key Features:**
- Singleton pattern
- Auth state management
- Session persistence
- Error handling with user-friendly messages

**Usage:**
```javascript
import authService from './services/auth-service.js';

// Sign in
const result = await authService.signIn(email, password);
if (result.success) {
  // Redirect to dashboard
}

// Get current user
const user = authService.getCurrentUser();
```

### 2. **User Service** (`user-service.js`)
**Purpose:** Manages user profiles in Firestore.

**Key Features:**
- In-memory caching (5-minute expiry)
- Automatic profile creation on signup
- Prevents duplicate Firestore requests
- Profile update methods

**Caching Strategy:**
```javascript
// First request: Fetches from Firestore
const result1 = await userService.getUserProfile();
// result1.fromCache = false

// Second request (within 5 minutes): Returns from cache
const result2 = await userService.getUserProfile();
// result2.fromCache = true
```

**Usage:**
```javascript
import userService from './services/user-service.js';

// Get or create user profile
const result = await userService.getOrCreateUserProfile(user);

// Update profile
await userService.updateUserProfile({
  displayName: "New Name",
  phoneNumber: "+1234567890"
});

// Update preferences
await userService.updatePreferences({
  currency: "USD",
  theme: "dark"
});
```

### 3. **Firestore Service** (`firestore-service.js`)
**Purpose:** Generic CRUD operations for all collections.

**Key Features:**
- Reusable CRUD methods
- Automatic userId injection
- Timestamp management
- Query helpers

**Usage:**
```javascript
import firestoreService from './services/firestore-service.js';

// Add expense
const result = await firestoreService.addExpense({
  amount: 1500,
  category: "Food",
  description: "Dinner",
  date: new Date()
});

// Get all expenses
const expenses = await firestoreService.getExpenses();

// Update expense
await firestoreService.updateExpense(expenseId, {
  amount: 1600
});

// Delete expense
await firestoreService.deleteExpense(expenseId);

// Query by date range
const expenses = await firestoreService.queryByDateRange(
  'expenses',
  startDate,
  endDate
);
```

### 4. **Family Service** (`family-service.js`)
**Purpose:** Manages family groups and invitations.

**Key Features:**
- Create and manage family groups
- Invite members via email
- Accept/decline invitations
- Member management (add/remove)
- Role-based permissions (admin/member)
- Family expense/income tracking

**Usage:**
```javascript
import familyService from './services/family-service.js';

// Create family group
const result = await familyService.createFamilyGroup("Smith Family");

// Get user's family groups
const groups = await familyService.getUserFamilyGroups();

// Invite member
await familyService.inviteMember(groupId, "jane@example.com", "member");

// Get pending invitations
const invitations = await familyService.getUserInvitations();

// Accept invitation
await familyService.acceptInvitation(invitationId);

// Remove member
await familyService.removeMember(groupId, memberId);

// Get family expenses
const expenses = await familyService.getFamilyExpenses(groupId);
```

### 5. **Storage Service** (`storage-service.js`)
**Purpose:** Manages file uploads to Firebase Storage.

**Key Features:**
- File upload with progress tracking
- File deletion
- URL generation
- File type validation
- Size limits (10MB)

**Usage:**
```javascript
import storageService from './services/storage-service.js';

// Upload file
const result = await storageService.uploadFile(
  file,
  'receipts',
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);

// Get file URL
const url = result.url;

// Delete file
await storageService.deleteFile(url);
```

### Service Initialization

All services are initialized in `services-init.js`:

```javascript
import authService from './auth-service.js';
import userService from './user-service.js';

// Connect services
authService.setUserService(userService);

// Auto-create user profile on auth state change
authService.onAuthStateChanged(async (user) => {
  if (user) {
    await userService.getOrCreateUserProfile(user);
  }
});
```

---

## 6. Frontend Structure

### Page Structure

Each page follows a consistent structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - Rupiya</title>
  
  <!-- Stylesheets -->
  <link rel="stylesheet" href="assets/css/common.css">
  <link rel="stylesheet" href="assets/css/components.css">
  <link rel="stylesheet" href="assets/css/page-specific.css">
</head>
<body>
  <!-- Sidebar Navigation -->
  <aside class="sidebar" id="sidebar">
    <!-- Navigation menu -->
  </aside>
  
  <!-- Main Content -->
  <main class="main-content">
    <!-- Page content -->
  </main>
  
  <!-- Toast Notifications -->
  <div id="toast-container"></div>
  
  <!-- JavaScript Modules -->
  <script type="module" src="assets/js/pages/page-name.js"></script>
</body>
</html>
```

### CSS Architecture

**1. common.css** - Global styles and CSS variables
```css
:root {
  /* Colors */
  --primary-color: #4A90E2;
  --secondary-color: #00D4FF;
  --success-color: #10B981;
  --danger-color: #EF4444;
  --warning-color: #F59E0B;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
}
```

**2. components.css** - Reusable component styles
- Buttons
- Cards
- Forms
- Modals
- Tables
- Badges

**3. Page-specific CSS** - Styles unique to each page

### JavaScript Module Pattern

Each page uses ES6 modules:

```javascript
// Import services
import authService from '../services/auth-service.js';
import firestoreService from '../services/firestore-service.js';
import { showToast } from '../components/toast.js';

// Wait for auth
await authService.waitForAuth();

// Check authentication
if (!authService.isAuthenticated()) {
  window.location.href = '/login.html';
}

// Initialize page
async function initPage() {
  try {
    // Load data
    const data = await firestoreService.getExpenses();
    
    // Render UI
    renderExpenses(data);
  } catch (error) {
    showToast('Error loading data', 'error');
  }
}

// Event listeners
document.getElementById('addBtn').addEventListener('click', handleAdd);

// Initialize
initPage();
```

### Reusable Components

#### 1. Toast Notifications (`toast.js`)
```javascript
import { showToast } from './components/toast.js';

// Success message
showToast('Expense added successfully!', 'success');

// Error message
showToast('Failed to add expense', 'error');

// Info message
showToast('Loading data...', 'info');

// Warning message
showToast('Please fill all fields', 'warning');
```

#### 2. Loading States (`loading.js`)
```javascript
import { showLoading, hideLoading } from './components/loading.js';

// Show loading
showLoading();

// Perform async operation
await fetchData();

// Hide loading
hideLoading();
```

#### 3. Family Switcher (`family-switcher.js`)
```javascript
import FamilySwitcher from './components/family-switcher.js';

// Initialize family switcher
const switcher = new FamilySwitcher();
await switcher.init();

// Get selected family
const selectedFamily = switcher.getSelectedFamily();

// Listen to family changes
switcher.onFamilyChange((familyId) => {
  // Reload data for selected family
  loadFamilyData(familyId);
});
```

---

## 7. Security & Rules

### Firestore Security Rules

**Key Principles:**
1. Users can only access their own data
2. Family members can access shared family data
3. All writes require authentication
4. userId cannot be changed after creation

**Helper Functions:**
```javascript
// Check if user is authenticated
function isAuthenticated() {
  return request.auth != null;
}

// Check if user owns the document
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

// Check if document belongs to current user
function belongsToUser() {
  return isAuthenticated() && resource.data.userId == request.auth.uid;
}

// Validate userId is set correctly on create
function hasValidUserId() {
  return request.resource.data.userId == request.auth.uid;
}

// Check if userId is not being changed
function userIdNotChanged() {
  return request.resource.data.userId == resource.data.userId;
}
```

**Example Rules:**

```javascript
// Users collection
match /users/{userId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId);
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}

// Expenses collection
match /expenses/{expenseId} {
  // Users can read their own expenses OR family members' expenses
  allow read: if belongsToUser() || isFamilyMember();
  allow create: if isAuthenticated() && hasValidUserId();
  allow update: if belongsToUser() && userIdNotChanged();
  allow delete: if belongsToUser();
}

// Family groups
match /familyGroups/{groupId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && 
                   request.resource.data.createdBy == request.auth.uid;
  allow update: if isAuthenticated() && 
                   resource.data.createdBy == request.auth.uid;
  allow delete: if isAuthenticated() && 
                   resource.data.createdBy == request.auth.uid;
}
```

### Storage Security Rules

**Key Principles:**
1. Users can only access files in their own directory
2. File size limit: 10MB
3. File type validation for images and documents

**Example Rules:**

```javascript
// User profile pictures
match /users/{userId}/profile/{fileName} {
  allow read: if isOwner(userId);
  allow write: if isOwner(userId) && 
                 isValidImageType() && 
                 isValidSize();
  allow delete: if isOwner(userId);
}

// Document files
match /users/{userId}/documents/{fileName} {
  allow read: if isOwner(userId);
  allow write: if isOwner(userId) && 
                 isValidDocumentType() && 
                 isValidSize();
  allow delete: if isOwner(userId);
}

// Helper functions
function isValidSize() {
  return request.resource.size < 10 * 1024 * 1024; // 10MB
}

function isValidImageType() {
  return request.resource.contentType.matches('image/.*');
}

function isValidDocumentType() {
  return request.resource.contentType.matches('image/.*') ||
         request.resource.contentType.matches('application/pdf') ||
         request.resource.contentType.matches('application/msword');
}
```

---

## 8. API Endpoints

### Email Invitation API

**Endpoint:** `/api/send-invitation.js`  
**Method:** POST  
**Purpose:** Send email invitations to family group members

**Request Body:**
```javascript
{
  invitedEmail: "jane@example.com",
  invitedByName: "John Smith",
  groupName: "Smith Family",
  invitationId: "inv123"
}
```

**Response:**
```javascript
// Success
{
  success: true,
  messageId: "msg123"
}

// Error
{
  error: "Failed to send invitation email",
  details: "Error message"
}
```

**Email Template Features:**
- Beautiful HTML design with gradient header
- Responsive layout
- One-click acceptance button
- Invitation link with fallback
- 7-day expiration notice
- Plain text fallback

**Environment Variables Required:**
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
VERCEL_URL=your-domain.com
```

**Implementation:**
```javascript
// Send invitation
const response = await fetch('/api/send-invitation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    invitedEmail: email,
    invitedByName: userName,
    groupName: groupName,
    invitationId: invitationId
  })
});

const result = await response.json();
if (result.success) {
  showToast('Invitation sent!', 'success');
}
```

---

## 9. Development Setup

### Prerequisites
- Node.js (v16 or higher)
- Firebase account
- Gmail account (for email invitations)
- Code editor (VS Code recommended)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd rupiya
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google

3. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Deploy security rules from `firestore.rules`

4. Create Storage Bucket:
   - Go to Storage
   - Get started
   - Deploy security rules from `storage.rules`

5. Get Firebase Configuration:
   - Go to Project Settings > General
   - Scroll to "Your apps"
   - Copy configuration

### Step 4: Environment Configuration

Create `.env.local` file:
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Email configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### Step 5: Gmail App Password Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate new app password for "Mail"
5. Copy the 16-character password
6. Add to `.env.local` as `GMAIL_APP_PASSWORD`

### Step 6: Start Development Server

**Option 1: Python**
```bash
python -m http.server 8000
```

**Option 2: Node.js**
```bash
npx http-server -p 8000
```

**Option 3: PHP**
```bash
php -S localhost:8000
```

**Option 4: VS Code Live Server**
- Install Live Server extension
- Right-click `index.html`
- Select "Open with Live Server"

### Step 7: Access Application
Open browser to: `http://localhost:8000`

**Important:** Always use `http://localhost:8000`, never open files directly (`file://`) as this causes CORS errors.

### Step 8: Deploy Firestore Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

---

## 10. Deployment

### Vercel Deployment

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Configure Environment Variables

Create `vercel.json`:
```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": ".",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### Step 4: Set Environment Variables in Vercel

Go to Vercel Dashboard > Project > Settings > Environment Variables

Add all variables from `.env.local`:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
GMAIL_USER
GMAIL_APP_PASSWORD
```

#### Step 5: Deploy
```bash
vercel
```

For production:
```bash
vercel --prod
```

### Firebase Hosting Deployment

#### Step 1: Build Project
```bash
npm run build
```

#### Step 2: Deploy to Firebase
```bash
firebase deploy
```

Deploy specific services:
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy rules only
firebase deploy --only firestore:rules,storage:rules
```

---

## 11. PWA (Progressive Web App)

### Service Worker

The application includes a service worker (`service-worker.js`) for offline functionality:

**Features:**
- Cache static assets (HTML, CSS, JS, images)
- Cache API responses
- Offline fallback page
- Background sync for pending requests
- Push notifications support

**Cache Strategy:**
```javascript
// Cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// Network-first for API calls
if (isApiCall(event.request.url)) {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
}
```

### Manifest.json

PWA configuration:
```json
{
  "name": "Rupiya - Personal Finance Tracker",
  "short_name": "Rupiya",
  "description": "AI-powered personal finance and expense tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4A90E2",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Installation

Users can install the app:
- **Android:** "Add to Home Screen" prompt
- **iOS:** Share > Add to Home Screen
- **Desktop:** Install button in address bar

---

## 12. Key Features Implementation

### Dashboard KPIs

The dashboard displays 4 key performance indicators:

```javascript
// Calculate KPIs
async function calculateKPIs() {
  const expenses = await firestoreService.getExpenses();
  const income = await firestoreService.getIncome();
  
  // Total income
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  
  // Total expenses
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Cash flow (income - expenses)
  const cashFlow = totalIncome - totalExpenses;
  
  // Savings rate
  const savingsRate = totalIncome > 0 
    ? ((cashFlow / totalIncome) * 100).toFixed(1)
    : 0;
  
  return {
    totalIncome,
    totalExpenses,
    cashFlow,
    savingsRate
  };
}
```

### Family Management

**Create Family Group:**
```javascript
// User creates a family group
const result = await familyService.createFamilyGroup("Smith Family");

if (result.success) {
  // User is automatically added as admin
  console.log('Family group created:', result.groupId);
}
```

**Invite Member:**
```javascript
// Admin invites a member
const result = await familyService.inviteMember(
  groupId,
  "jane@example.com",
  "member"
);

if (result.success) {
  // Email invitation is sent automatically
  // Invitation stored in Firestore
  console.log('Invitation sent:', result.invitationId);
}
```

**Accept Invitation:**
```javascript
// User receives email and clicks link
// URL: /family.html?invitation=inv123

// Page loads and auto-accepts invitation
const urlParams = new URLSearchParams(window.location.search);
const invitationId = urlParams.get('invitation');

if (invitationId) {
  const result = await familyService.acceptInvitation(invitationId);
  
  if (result.success) {
    // User is added to family group
    // Redirect to family page
    window.location.href = '/family.html';
  }
}
```

**View Family Expenses:**
```javascript
// Get all expenses for a family group
const expenses = await familyService.getFamilyExpenses(groupId);

// Group by member
const expensesByMember = expenses.reduce((acc, expense) => {
  const memberId = expense.userId;
  if (!acc[memberId]) acc[memberId] = [];
  acc[memberId].push(expense);
  return acc;
}, {});

// Calculate totals per member
const memberTotals = Object.entries(expensesByMember).map(([memberId, expenses]) => ({
  memberId,
  total: expenses.reduce((sum, e) => sum + e.amount, 0),
  count: expenses.length
}));
```

### Expense Tracking

**Add Expense:**
```javascript
// Add new expense
const result = await firestoreService.addExpense({
  amount: 1500,
  category: "Food & Dining",
  subcategory: "Restaurants",
  description: "Dinner with friends",
  date: new Date(),
  paymentMethod: "Credit Card",
  familyGroupId: selectedFamilyId || null
});

if (result.success) {
  showToast('Expense added successfully!', 'success');
  refreshExpenseList();
}
```

**Filter Expenses:**
```javascript
// Filter by date range
const startDate = new Date('2025-01-01');
const endDate = new Date('2025-01-31');

const expenses = await firestoreService.queryByDateRange(
  'expenses',
  startDate,
  endDate
);

// Filter by category
const foodExpenses = expenses.filter(e => e.category === 'Food & Dining');

// Calculate category totals
const categoryTotals = expenses.reduce((acc, expense) => {
  const category = expense.category;
  acc[category] = (acc[category] || 0) + expense.amount;
  return acc;
}, {});
```

### Budget Management

**Create Budget:**
```javascript
// Create monthly budget
const result = await firestoreService.addBudget({
  category: "Food & Dining",
  amount: 10000,
  month: "2025-01",
  spent: 0,
  remaining: 10000
});
```

**Track Budget Progress:**
```javascript
// Get current month expenses
const currentMonth = new Date().toISOString().slice(0, 7); // "2025-01"
const expenses = await firestoreService.getExpenses();

// Filter by month and category
const monthExpenses = expenses.filter(e => {
  const expenseMonth = e.date.toDate().toISOString().slice(0, 7);
  return expenseMonth === currentMonth && e.category === "Food & Dining";
});

// Calculate spent amount
const spent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

// Update budget
await firestoreService.updateBudget(budgetId, {
  spent: spent,
  remaining: budget.amount - spent
});

// Calculate progress percentage
const progress = (spent / budget.amount) * 100;
```

---

## 13. Error Handling

### Global Error Handler

```javascript
// utils/error-handler.js
export function handleError(error, context = '') {
  console.error(`[Error in ${context}]:`, error);
  
  // User-friendly error messages
  const errorMessages = {
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
    'already-exists': 'This resource already exists.',
    'unauthenticated': 'Please sign in to continue.',
    'network-error': 'Network error. Please check your connection.'
  };
  
  const message = errorMessages[error.code] || 'An error occurred. Please try again.';
  showToast(message, 'error');
  
  return { success: false, error: message };
}
```

### Try-Catch Pattern

```javascript
async function addExpense(data) {
  try {
    const result = await firestoreService.addExpense(data);
    
    if (result.success) {
      showToast('Expense added!', 'success');
      return result;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    return handleError(error, 'addExpense');
  }
}
```

---

## 14. Performance Optimization

### Caching Strategy

**1. User Service Caching:**
- In-memory cache with 5-minute expiry
- Prevents duplicate Firestore reads
- Automatic cache invalidation on logout

**2. Service Worker Caching:**
- Static assets cached indefinitely
- API responses cached with network-first strategy
- Offline fallback for better UX

### Lazy Loading

```javascript
// Load data only when needed
async function loadExpenses() {
  if (!expensesLoaded) {
    const expenses = await firestoreService.getExpenses();
    renderExpenses(expenses);
    expensesLoaded = true;
  }
}
```

### Debouncing

```javascript
// Debounce search input
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(e.target.value);
  }, 300);
});
```

### Pagination

```javascript
// Load expenses in batches
const BATCH_SIZE = 20;
let lastVisible = null;

async function loadMoreExpenses() {
  const q = query(
    collection(db, 'expenses'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    startAfter(lastVisible),
    limit(BATCH_SIZE)
  );
  
  const snapshot = await getDocs(q);
  lastVisible = snapshot.docs[snapshot.docs.length - 1];
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

---

## 15. Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google
- [ ] Password reset
- [ ] Sign out
- [ ] Protected route redirection

**User Profile:**
- [ ] Profile creation on signup
- [ ] Profile update
- [ ] Preferences update
- [ ] Profile picture upload

**Expenses:**
- [ ] Add expense
- [ ] Edit expense
- [ ] Delete expense
- [ ] Filter by date
- [ ] Filter by category
- [ ] Search expenses

**Family Management:**
- [ ] Create family group
- [ ] Invite member
- [ ] Accept invitation
- [ ] Decline invitation
- [ ] Remove member
- [ ] Leave family group
- [ ] Delete family group
- [ ] View family expenses

**Dashboard:**
- [ ] KPI calculations
- [ ] Recent transactions
- [ ] Charts and graphs
- [ ] Family switcher

### Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

### Device Testing

Test on:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 16. Common Issues & Solutions

### Issue 1: CORS Errors
**Problem:** JavaScript modules not loading, Firebase not working  
**Solution:** Use local server (`http://localhost:8000`), never open files directly

### Issue 2: Firebase Permission Denied
**Problem:** "Missing or insufficient permissions" error  
**Solution:** Deploy Firestore rules from `firestore.rules` file

### Issue 3: Email Invitations Not Sending
**Problem:** Email API returns 500 error  
**Solution:** 
1. Check Gmail credentials in environment variables
2. Verify Gmail App Password is correct
3. Check VERCEL_URL is set correctly

### Issue 4: User Profile Not Created
**Problem:** User signs up but profile not in Firestore  
**Solution:** Ensure `services-init.js` is imported in page

### Issue 5: Cache Not Clearing
**Problem:** Old data showing after updates  
**Solution:** Call `userService.invalidateCache()` after updates

---

## 17. Future Enhancements

### Planned Features

1. **AI Insights:**
   - Spending pattern analysis
   - Budget recommendations
   - Anomaly detection
   - Predictive analytics

2. **Advanced Budgeting:**
   - Envelope budgeting
   - Zero-based budgeting
   - Budget templates
   - Budget sharing

3. **Reports & Analytics:**
   - Monthly reports
   - Year-over-year comparison
   - Category breakdown
   - Export to PDF/Excel

4. **Integrations:**
   - Bank account linking
   - Credit card sync
   - Investment portfolio tracking
   - Tax document generation

5. **Collaboration:**
   - Shared budgets
   - Split expenses
   - Payment requests
   - Activity feed

6. **Mobile App:**
   - Native iOS app
   - Native Android app
   - Receipt scanning
   - Push notifications

---

## 18. API Reference

### Auth Service API

```javascript
// Sign in
await authService.signIn(email, password)
// Returns: { success: boolean, user?: User, error?: string }

// Sign up
await authService.signUp(email, password, displayName)
// Returns: { success: boolean, user?: User, error?: string }

// Sign in with Google
await authService.signInWithGoogle()
// Returns: { success: boolean, user?: User, error?: string }

// Sign out
await authService.signOut()
// Returns: { success: boolean, error?: string }

// Reset password
await authService.resetPassword(email)
// Returns: { success: boolean, error?: string }

// Get current user
authService.getCurrentUser()
// Returns: User | null

// Check authentication
authService.isAuthenticated()
// Returns: boolean

// Wait for auth initialization
await authService.waitForAuth()
// Returns: User | null

// Listen to auth state changes
authService.onAuthStateChanged((user) => {
  // Handle auth state change
})
```

### User Service API

```javascript
// Get or create user profile
await userService.getOrCreateUserProfile(user)
// Returns: { success: boolean, user?: UserProfile, isNewUser?: boolean, fromCache?: boolean, error?: string }

// Get user profile
await userService.getUserProfile(userId?)
// Returns: { success: boolean, user?: UserProfile, fromCache?: boolean, error?: string }

// Update user profile
await userService.updateUserProfile(updates)
// Returns: { success: boolean, error?: string }

// Update preferences
await userService.updatePreferences(preferences)
// Returns: { success: boolean, error?: string }

// Mark profile complete
await userService.markProfileComplete()
// Returns: { success: boolean, error?: string }

// Get current user ID
userService.getCurrentUserId()
// Returns: string | null

// Check if user exists
await userService.userExists(userId)
// Returns: boolean

// Clear cache
userService.clearCache()

// Invalidate cache
userService.invalidateCache(userId?)
```

### Firestore Service API

```javascript
// Generic CRUD
await firestoreService.add(collectionName, data)
// Returns: { success: boolean, id?: string, error?: string }

await firestoreService.get(collectionName, docId)
// Returns: { success: boolean, data?: any, error?: string }

await firestoreService.getAll(collectionName, orderByField?, orderDirection?)
// Returns: Array<any>

await firestoreService.update(collectionName, docId, data)
// Returns: { success: boolean, error?: string }

await firestoreService.delete(collectionName, docId)
// Returns: { success: boolean, error?: string }

// Expense methods
await firestoreService.addExpense(expense)
await firestoreService.getExpenses()
await firestoreService.updateExpense(id, expense)
await firestoreService.deleteExpense(id)

// Income methods
await firestoreService.addIncome(income)
await firestoreService.getIncome()
await firestoreService.updateIncome(id, income)
await firestoreService.deleteIncome(id)

// Budget methods
await firestoreService.addBudget(budget)
await firestoreService.getBudgets()
await firestoreService.updateBudget(id, budget)
await firestoreService.deleteBudget(id)

// Query helpers
await firestoreService.queryByDateRange(collectionName, startDate, endDate)
await firestoreService.getExpensesByLinked(linkedType, linkedId)
await firestoreService.getIncomeByLinked(linkedType, linkedId)
```

### Family Service API

```javascript
// Create family group
await familyService.createFamilyGroup(groupName)
// Returns: { success: boolean, groupId?: string, data?: FamilyGroup, error?: string }

// Get user's family groups
await familyService.getUserFamilyGroups()
// Returns: Array<FamilyGroup>

// Get specific family group
await familyService.getFamilyGroup(groupId)
// Returns: { success: boolean, data?: FamilyGroup, error?: string }

// Invite member
await familyService.inviteMember(groupId, email, role?)
// Returns: { success: boolean, invitationId?: string, data?: Invitation, error?: string }

// Get user's invitations
await familyService.getUserInvitations()
// Returns: Array<Invitation>

// Accept invitation
await familyService.acceptInvitation(invitationId)
// Returns: { success: boolean, groupId?: string, error?: string }

// Decline invitation
await familyService.declineInvitation(invitationId)
// Returns: { success: boolean, error?: string }

// Remove member
await familyService.removeMember(groupId, memberUserId)
// Returns: { success: boolean, error?: string }

// Leave family group
await familyService.leaveFamilyGroup(groupId)
// Returns: { success: boolean, error?: string }

// Delete family group
await familyService.deleteFamilyGroup(groupId)
// Returns: { success: boolean, error?: string }

// Update group settings
await familyService.updateGroupSettings(groupId, settings)
// Returns: { success: boolean, error?: string }

// Get family expenses
await familyService.getFamilyExpenses(groupId)
// Returns: Array<Expense>

// Get family income
await familyService.getFamilyIncome(groupId)
// Returns: Array<Income>

// Get member expenses
await familyService.getMemberExpenses(groupId, memberId)
// Returns: Array<Expense>
```

---

## 19. Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  providerId: string;
  preferences: {
    currency: string;
    language: string;
    theme: string;
    notifications: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  profileComplete: boolean;
  isActive: boolean;
  familyGroups?: string[];
}
```

### Expense
```typescript
interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  subcategory?: string;
  description: string;
  date: Timestamp;
  paymentMethod: string;
  familyGroupId?: string;
  linkedType?: 'house' | 'vehicle' | null;
  linkedId?: string;
  receiptUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Income
```typescript
interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  category: string;
  description: string;
  date: Timestamp;
  familyGroupId?: string;
  linkedType?: 'house' | 'vehicle' | null;
  linkedId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Family Group
```typescript
interface FamilyGroup {
  id: string;
  name: string;
  createdBy: string;
  members: Array<{
    userId: string;
    email: string;
    name: string;
    role: 'admin' | 'member';
    joinedAt: Timestamp;
  }>;
  settings: {
    currency: string;
    allowMemberInvites: boolean;
    shareAllTransactions: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Family Invitation
```typescript
interface FamilyInvitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  invitedByName: string;
  invitedEmail: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  declinedAt?: Timestamp;
}
```

---

## 20. Contributing Guidelines

### Code Style

**JavaScript:**
- Use ES6+ features
- Use async/await for asynchronous code
- Use arrow functions where appropriate
- Use template literals for strings
- Use destructuring where appropriate

**CSS:**
- Use CSS variables for colors and spacing
- Use BEM naming convention for classes
- Mobile-first responsive design
- Use flexbox/grid for layouts

**HTML:**
- Semantic HTML5 elements
- Accessibility attributes (ARIA)
- SEO meta tags

### Git Workflow

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes and commit: `git commit -m "Add feature"`
3. Push to remote: `git push origin feature/feature-name`
4. Create pull request
5. Code review
6. Merge to main

### Commit Messages

Format: `type(scope): message`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
- `feat(auth): add Google sign-in`
- `fix(expenses): fix date filter bug`
- `docs(readme): update setup instructions`

---

## 21. Support & Resources

### Documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Vercel Documentation](https://vercel.com/docs)

### Community
- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas

### Contact
- Email: support@rupiya.online
- Website: https://rupiya.online

---

## 22. License

This project is licensed under the MIT License.

---

## 23. Changelog

### Version 1.0.0 (Current)
- ✅ User authentication (Email/Password + Google)
- ✅ User profile management
- ✅ Dashboard with KPIs
- ✅ Family group management
- ✅ Email invitations
- ✅ Expense tracking (basic)
- ✅ Income tracking (basic)
- ✅ PWA support
- ✅ Offline functionality

### Upcoming (Version 1.1.0)
- 🔄 Advanced expense management
- 🔄 Budget tracking
- 🔄 Investment tracking
- 🔄 Goal management
- 🔄 Reports and analytics
- 🔄 AI insights

---

**Last Updated:** January 3, 2025  
**Version:** 1.0.0  
**Author:** Rupiya Development Team
