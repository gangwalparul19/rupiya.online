# 🔐 Test Credentials & Test Data

## Test User Account

Use these credentials for testing across the application:

### Email/Password Login
```
Email:    test@rupiya.com
Password: Test@123456
```

### Alternative Test Account
```
Email:    demo@rupiya.com
Password: Demo@123456
```

---

## 🚀 First Time Setup

### Step 1: Create Test Account

1. Start the server: `start-server.bat`
2. Open: `http://localhost:8000/signup.html`
3. Fill in the form:
   ```
   Name:     Test User
   Email:    test@rupiya.com
   Password: Test@123456
   ```
4. Click "Sign Up"
5. You'll be redirected to dashboard

### Step 2: Add Test Data (Optional)

Once logged in, you can add test transactions to see the dashboard in action.

**Sample Expenses:**
- Groceries: ₹5,000
- Electricity Bill: ₹2,500
- Internet: ₹1,200
- Fuel: ₹3,000
- Restaurant: ₹1,500

**Sample Income:**
- Salary: ₹50,000
- Freelance: ₹10,000
- Interest: ₹500

---

## 🧪 Testing Workflow

### 1. Test Signup Flow
```
1. Go to: http://localhost:8000/signup.html
2. Enter test credentials above
3. Click "Sign Up"
4. Should redirect to dashboard
5. Verify user profile shows "Test User"
```

### 2. Test Login Flow
```
1. Logout from dashboard
2. Go to: http://localhost:8000/login.html
3. Enter: test@rupiya.com / Test@123456
4. Click "Login"
5. Should redirect to dashboard
```

### 3. Test Google Sign-In
```
1. Go to: http://localhost:8000/login.html
2. Click "Sign in with Google"
3. Select your Google account
4. Should redirect to dashboard
5. Verify user profile shows your Google name
```

### 4. Test Protected Routes
```
1. Logout from dashboard
2. Try to access: http://localhost:8000/dashboard.html
3. Should redirect to login page
4. Login again
5. Should redirect back to dashboard
```

---

## 🔒 Authentication Flow

### How It Works

1. **Signup:**
   - Creates Firebase user account
   - Stores user data in Firestore
   - Sets authentication token
   - Redirects to dashboard

2. **Login:**
   - Validates credentials with Firebase
   - Sets authentication token
   - Redirects to dashboard

3. **Protected Routes:**
   - Dashboard checks if user is authenticated
   - If not authenticated → redirect to login
   - If authenticated → load dashboard data

4. **Logout:**
   - Clears authentication token
   - Redirects to landing page

---

## 📊 Test Data Structure

### User Profile
```javascript
{
  uid: "firebase-user-id",
  email: "test@rupiya.com",
  displayName: "Test User",
  createdAt: "2026-01-02T10:00:00Z"
}
```

### Expense Document
```javascript
{
  userId: "firebase-user-id",
  amount: 5000,
  category: "Groceries",
  description: "Monthly groceries",
  date: "2026-01-02",
  createdAt: "2026-01-02T10:00:00Z"
}
```

### Income Document
```javascript
{
  userId: "firebase-user-id",
  amount: 50000,
  source: "Salary",
  description: "Monthly salary",
  date: "2026-01-01",
  createdAt: "2026-01-02T10:00:00Z"
}
```

---

## 🎯 Testing Scenarios

### Scenario 1: New User Journey
```
1. Visit landing page
2. Click "Get Started"
3. Fill signup form
4. Verify email confirmation (if enabled)
5. Login with credentials
6. See empty dashboard
7. Add first expense
8. Add first income
9. See KPI cards update
10. Test logout
```

### Scenario 2: Returning User Journey
```
1. Visit landing page
2. Click "Login"
3. Enter credentials
4. See dashboard with existing data
5. View recent transactions
6. Check KPI calculations
7. Test navigation
8. Test logout
```

### Scenario 3: Mobile User Journey
```
1. Open on mobile device
2. Login with credentials
3. Test hamburger menu
4. Navigate between sections
5. Add transaction on mobile
6. Verify responsive layout
7. Test logout
```

---

## 🔧 Troubleshooting

### Issue: "User not found"
**Solution:**
- Create account first using signup page
- Or use Google Sign-In

### Issue: "Invalid credentials"
**Solution:**
- Check email and password are correct
- Password is case-sensitive
- Make sure using test credentials above

### Issue: "Redirects to login immediately"
**Solution:**
- This is normal for protected routes
- Login first, then access dashboard

### Issue: "Dashboard shows no data"
**Solution:**
- This is normal for new accounts
- Add test transactions manually
- Or wait for Phase 3 to add bulk test data

---

## 📝 Password Requirements

When creating your own test accounts:

- ✅ Minimum 8 characters
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ At least one special character (@, #, $, etc.)

**Valid Examples:**
- `Test@123456`
- `Demo@123456`
- `MyPass@2026`
- `Secure#Pass1`

**Invalid Examples:**
- `test123` (no uppercase, no special char)
- `TEST@123` (no lowercase)
- `TestPass` (no number, no special char)
- `Test@12` (too short)

---

## 🎨 Test User Profiles

### Profile 1: Test User
```
Name:     Test User
Email:    test@rupiya.com
Password: Test@123456
Role:     Primary test account
```

### Profile 2: Demo User
```
Name:     Demo User
Email:    demo@rupiya.com
Password: Demo@123456
Role:     Secondary test account
```

### Profile 3: Your Google Account
```
Name:     (Your Google name)
Email:    (Your Google email)
Password: (Google handles this)
Role:     Real account testing
```

---

## 🚦 Quick Test Commands

### Create Test Account
```
1. http://localhost:8000/signup.html
2. Email: test@rupiya.com
3. Password: Test@123456
4. Click Sign Up
```

### Login to Test Account
```
1. http://localhost:8000/login.html
2. Email: test@rupiya.com
3. Password: Test@123456
4. Click Login
```

### Access Dashboard
```
1. Must be logged in first
2. http://localhost:8000/dashboard.html
3. Or click Dashboard in navigation
```

---

## 📱 Multi-Device Testing

### Desktop Browser
```
Email:    test@rupiya.com
Password: Test@123456
URL:      http://localhost:8000
```

### Mobile Browser (Same WiFi)
```
Email:    test@rupiya.com
Password: Test@123456
URL:      http://YOUR_IP:8000
Example:  http://192.168.1.100:8000
```

### Different Browser
```
Email:    demo@rupiya.com
Password: Demo@123456
Purpose:  Test multiple sessions
```

---

## 🔐 Security Notes

### For Testing Only
- These are TEST credentials only
- Don't use in production
- Don't share publicly
- Change before deployment

### Firebase Security
- All data is user-specific (filtered by userId)
- Users can only see their own data
- Authentication required for all operations
- Firestore rules enforce security

---

## ✅ Testing Checklist

### Authentication
- [ ] Can create account with test@rupiya.com
- [ ] Can login with test credentials
- [ ] Can login with Google
- [ ] Can logout successfully
- [ ] Protected routes redirect to login
- [ ] After login, redirects to dashboard

### Dashboard
- [ ] Shows user profile correctly
- [ ] Displays KPI cards
- [ ] Shows recent transactions (if any)
- [ ] Logout button works
- [ ] Navigation works

### Mobile
- [ ] Can login on mobile
- [ ] Dashboard displays correctly
- [ ] Hamburger menu works
- [ ] Can logout on mobile

---

## 🎯 Ready to Test?

1. ✅ Start server: `start-server.bat`
2. ✅ Open: `http://localhost:8000/signup.html`
3. ✅ Create account: `test@rupiya.com` / `Test@123456`
4. ✅ Verify dashboard loads
5. ✅ Test all features
6. ✅ Ready for Phase 3!

---

**Remember: Always use the test credentials above for consistent testing!**
