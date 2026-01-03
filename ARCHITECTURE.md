# Rupiya - System Architecture

## Overview

Rupiya is a client-side web application built with vanilla JavaScript that uses Firebase as its backend infrastructure. The architecture follows a service-oriented pattern with clear separation of concerns.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   HTML       │  │     CSS      │  │  Components  │          │
│  │   Pages      │  │   Styles     │  │  (Toast,     │          │
│  │              │  │              │  │   Loading)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Page       │  │   Utils      │  │   Helpers    │          │
│  │   Scripts    │  │   (Theme,    │  │   (Format,   │          │
│  │              │  │   Validate)  │  │   Calculate) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICES LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Auth      │  │    User      │  │  Firestore   │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Family     │  │   Storage    │  │  Categories  │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIREBASE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Firebase   │  │    Cloud     │  │    Cloud     │          │
│  │     Auth     │  │  Firestore   │  │   Storage    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   Vercel Serverless Functions (Email API)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. User Authentication Flow

```
User Action (Login)
       │
       ▼
Login Page (login.html)
       │
       ▼
Auth Service (signIn)
       │
       ▼
Firebase Auth (validate credentials)
       │
       ▼
Auth State Listener (onAuthStateChanged)
       │
       ▼
User Service (getOrCreateUserProfile)
       │
       ▼
Firestore (users collection)
       │
       ▼
Dashboard (redirect)
```

### 2. Expense Creation Flow

```
User Action (Add Expense)
       │
       ▼
Expense Form (expenses.html)
       │
       ▼
Form Validation
       │
       ▼
Firestore Service (addExpense)
       │
       ▼
Firestore (expenses collection)
       │
       ▼
Success Response
       │
       ▼
Toast Notification
       │
       ▼
Refresh Expense List
```

### 3. Family Invitation Flow

```
Admin Action (Invite Member)
       │
       ▼
Family Page (family.html)
       │
       ▼
Family Service (inviteMember)
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
Firestore              Email API           Update UI
(familyInvitations)    (send-invitation)
       │                     │
       ▼                     ▼
Invitation Stored      Email Sent
       │                     │
       └─────────────────────┘
                 │
                 ▼
       Member Receives Email
                 │
                 ▼
       Clicks Invitation Link
                 │
                 ▼
       Family Service (acceptInvitation)
                 │
                 ▼
       Update familyGroups
                 │
                 ▼
       Member Added to Group
```

---

## Service Architecture

### Auth Service
**Responsibilities:**
- User authentication (email/password, Google)
- Session management
- Auth state monitoring
- Password reset

**Dependencies:**
- Firebase Auth
- User Service (for profile creation)

**Exports:**
- `signIn(email, password)`
- `signUp(email, password, displayName)`
- `signInWithGoogle()`
- `signOut()`
- `resetPassword(email)`
- `getCurrentUser()`
- `isAuthenticated()`
- `onAuthStateChanged(callback)`

### User Service
**Responsibilities:**
- User profile management
- Profile caching
- Preference management

**Dependencies:**
- Firestore
- Auth Service

**Exports:**
- `getOrCreateUserProfile(user)`
- `getUserProfile(userId)`
- `updateUserProfile(updates)`
- `updatePreferences(preferences)`
- `clearCache()`

### Firestore Service
**Responsibilities:**
- Generic CRUD operations
- Query helpers
- Timestamp management

**Dependencies:**
- Firestore
- Auth Service

**Exports:**
- `add(collection, data)`
- `get(collection, docId)`
- `getAll(collection, orderBy, direction)`
- `update(collection, docId, data)`
- `delete(collection, docId)`
- Specific methods for each collection

### Family Service
**Responsibilities:**
- Family group management
- Member invitations
- Family data aggregation

**Dependencies:**
- Firestore
- Auth Service
- Email API

**Exports:**
- `createFamilyGroup(name)`
- `getUserFamilyGroups()`
- `inviteMember(groupId, email, role)`
- `acceptInvitation(invitationId)`
- `removeMember(groupId, memberId)`
- `getFamilyExpenses(groupId)`

---

## Database Schema

### Collections Hierarchy

```
Firestore Database
│
├── users/
│   └── {userId}
│       ├── email
│       ├── displayName
│       ├── preferences
│       └── familyGroups[]
│
├── expenses/
│   └── {expenseId}
│       ├── userId
│       ├── amount
│       ├── category
│       ├── date
│       └── familyGroupId (optional)
│
├── income/
│   └── {incomeId}
│       ├── userId
│       ├── amount
│       ├── source
│       └── date
│
├── familyGroups/
│   └── {groupId}
│       ├── name
│       ├── createdBy
│       ├── members[]
│       └── settings
│
├── familyInvitations/
│   └── {invitationId}
│       ├── groupId
│       ├── invitedEmail
│       ├── status
│       └── expiresAt
│
├── budgets/
├── investments/
├── goals/
├── houses/
├── vehicles/
├── documents/
└── notes/
```

---

## Security Model

### Authentication
- Firebase Authentication handles user identity
- Session tokens stored in browser
- Automatic token refresh

### Authorization
- Firestore Security Rules enforce access control
- User can only access their own data
- Family members can access shared family data
- Admin role for family group management

### Data Validation
- Client-side validation (forms)
- Server-side validation (Firestore rules)
- Type checking in services

---

## Caching Strategy

### User Service Cache
```
┌─────────────────────────────────────┐
│         User Service Cache          │
│  ┌───────────────────────────────┐  │
│  │  userId → {                   │  │
│  │    data: UserProfile,         │  │
│  │    timestamp: Date            │  │
│  │  }                            │  │
│  └───────────────────────────────┘  │
│                                     │
│  Cache Expiry: 5 minutes            │
│  Invalidation: On logout/update     │
└─────────────────────────────────────┘
```

### Service Worker Cache
```
┌─────────────────────────────────────┐
│      Service Worker Cache           │
│  ┌───────────────────────────────┐  │
│  │  Static Assets (HTML/CSS/JS)  │  │
│  │  Cache Strategy: Cache-first  │  │
│  │  Expiry: Never (versioned)    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  API Responses                │  │
│  │  Cache Strategy: Network-first│  │
│  │  Expiry: 5 minutes            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Component Communication

### Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Event Bus Pattern                     │
│                                                          │
│  Component A                Component B                 │
│      │                          │                       │
│      │ emit('event')            │                       │
│      └──────────────────────────┘                       │
│                  │                                       │
│                  ▼                                       │
│           Event Listener                                │
│                  │                                       │
│                  ▼                                       │
│      ┌──────────────────────┐                          │
│      │  Component B Handler  │                          │
│      └──────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### Example: Family Switcher

```javascript
// Family Switcher emits event
familySwitcher.onFamilyChange((familyId) => {
  // Dashboard listens and reloads data
  loadFamilyData(familyId);
});
```

---

## Error Handling

### Error Flow

```
Error Occurs
     │
     ▼
Try-Catch Block
     │
     ▼
Error Handler (utils/error-handler.js)
     │
     ├─────────────┬─────────────┐
     ▼             ▼             ▼
Console Log   Toast Message   Return Error
```

### Error Types

1. **Authentication Errors**
   - Invalid credentials
   - User not found
   - Network errors

2. **Permission Errors**
   - Insufficient permissions
   - Unauthorized access

3. **Validation Errors**
   - Invalid input
   - Missing required fields

4. **Network Errors**
   - Connection timeout
   - Server unavailable

---

## Performance Optimization

### Strategies

1. **Lazy Loading**
   - Load data only when needed
   - Defer non-critical resources

2. **Caching**
   - User profile caching (5 min)
   - Service worker caching
   - Browser caching (static assets)

3. **Pagination**
   - Load expenses in batches
   - Infinite scroll for large lists

4. **Debouncing**
   - Search input debouncing (300ms)
   - Form validation debouncing

5. **Code Splitting**
   - ES6 modules
   - Dynamic imports for large features

---

## Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Static File Hosting                   │    │
│  │  (HTML, CSS, JS, Images)                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │        Serverless Functions                     │    │
│  │  /api/send-invitation.js                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Edge Network (CDN)                    │    │
│  │  Global distribution                            │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Firebase Services

```
┌─────────────────────────────────────────────────────────┐
│                  Firebase Platform                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Firebase Authentication                 │    │
│  │  - Email/Password                              │    │
│  │  - Google OAuth                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Cloud Firestore                         │    │
│  │  - NoSQL Database                              │    │
│  │  - Real-time sync                              │    │
│  │  - Security rules                              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Cloud Storage                           │    │
│  │  - File uploads                                │    │
│  │  - Security rules                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Scalability Considerations

### Current Limitations
- Client-side processing (limited by browser)
- Firestore read/write limits
- Storage size limits

### Future Improvements
1. **Backend Processing**
   - Cloud Functions for heavy computations
   - Scheduled tasks for recurring transactions
   - Batch processing for reports

2. **Database Optimization**
   - Composite indexes for complex queries
   - Data aggregation collections
   - Archiving old data

3. **Caching Layer**
   - Redis for session management
   - CDN for static assets
   - API response caching

---

## Monitoring & Analytics

### Metrics to Track
- User authentication success rate
- Page load times
- API response times
- Error rates
- User engagement

### Tools
- Firebase Analytics
- Vercel Analytics
- Browser DevTools
- Lighthouse audits

---

**Last Updated:** January 3, 2025  
**Version:** 1.0.0
