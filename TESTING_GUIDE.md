# 🧪 Complete Testing Guide

## 🔐 Test Credentials (Use Everywhere)

```
Email:    test@rupiya.com
Password: Test@123456
```

---

## 🚀 Quick Start Testing

### 1️⃣ Start Server
```bash
Double-click: start-server.bat
Wait for: "Serving HTTP on 0.0.0.0 port 8000..."
Keep window open!
```

### 2️⃣ Create Test Account (First Time Only)
```
URL: http://localhost:8000/signup.html

Fill in:
- Name: Test User
- Email: test@rupiya.com
- Password: Test@123456

Click: Sign Up
Result: Redirected to dashboard
```

### 3️⃣ Login (Subsequent Times)
```
URL: http://localhost:8000/login.html

Fill in:
- Email: test@rupiya.com
- Password: Test@123456

Click: Login
Result: Redirected to dashboard
```

---

## 📋 Complete Test Flow

### Test 1: Landing Page
```
✅ URL: http://localhost:8000/index.html

Check:
- [ ] Page loads without errors
- [ ] Header with logo visible
- [ ] Hero section displays
- [ ] 4 feature cards in 2×2 grid
- [ ] 2 "How It Works" cards in 1×2 grid
- [ ] 3 stats cards in one row
- [ ] Footer visible
- [ ] "Get Started" button works
- [ ] "Login" button works
```

### Test 2: Signup Flow
```
✅ URL: http://localhost:8000/signup.html

Steps:
1. Fill name: Test User
2. Fill email: test@rupiya.com
3. Fill password: Test@123456
4. Click "Sign Up"

Check:
- [ ] Form validation works
- [ ] Success toast appears
- [ ] Redirects to dashboard
- [ ] User profile shows "Test User"
```

### Test 3: Login Flow
```
✅ URL: http://localhost:8000/login.html

Steps:
1. Fill email: test@rupiya.com
2. Fill password: Test@123456
3. Click "Login"

Check:
- [ ] Form validation works
- [ ] Success toast appears
- [ ] Redirects to dashboard
- [ ] User profile shows correct info
```

### Test 4: Dashboard (Desktop)
```
✅ URL: http://localhost:8000/dashboard.html

Check:
- [ ] Sidebar visible on left
- [ ] Logo in sidebar
- [ ] All navigation items present
- [ ] User profile at bottom
- [ ] Logout button visible
- [ ] 4 KPI cards in 2×2 grid
- [ ] All cards have blue borders
- [ ] Hover effects work (cyan border)
- [ ] Recent transactions section
- [ ] No console errors (F12)
```

### Test 5: Dashboard (Mobile)
```
✅ URL: http://localhost:8000/dashboard.html

Steps:
1. Press F12 (DevTools)
2. Click device toggle (Ctrl+Shift+M)
3. Select iPhone 12

Check:
- [ ] Sidebar hidden by default
- [ ] Mobile header visible
- [ ] Hamburger menu (☰) visible
- [ ] Logo in center
- [ ] 4 KPI cards in 2×2 grid
- [ ] 2 cards per row
- [ ] NO horizontal scrolling
- [ ] All content fits screen width

Test Hamburger:
- [ ] Click hamburger icon
- [ ] Sidebar slides in from left
- [ ] Dark overlay appears
- [ ] All navigation items visible
- [ ] Click overlay to close
- [ ] Sidebar slides out
```

### Test 6: Protected Routes
```
Test:
1. Logout from dashboard
2. Try: http://localhost:8000/dashboard.html

Check:
- [ ] Redirects to login page
- [ ] Cannot access without login

Then:
3. Login again
4. Try: http://localhost:8000/dashboard.html

Check:
- [ ] Dashboard loads successfully
- [ ] All data displays correctly
```

### Test 7: Logout Flow
```
Steps:
1. Click "Logout" button in sidebar
2. Confirm logout

Check:
- [ ] Confirmation dialog appears
- [ ] Success toast shows
- [ ] Redirects to landing page
- [ ] Cannot access dashboard anymore
```

### Test 8: Google Sign-In
```
✅ URL: http://localhost:8000/login.html

Steps:
1. Click "Sign in with Google"
2. Select Google account
3. Authorize

Check:
- [ ] Google popup opens
- [ ] Can select account
- [ ] Redirects to dashboard
- [ ] Profile shows Google name
- [ ] Profile shows Google email
```

---

## 📱 Mobile Device Testing

### On Real Mobile Device

#### Setup:
```
1. Start server on computer
2. Find computer IP:
   - Windows: ipconfig
   - Look for IPv4 Address
   - Example: 192.168.1.100

3. On mobile (same WiFi):
   - Open browser
   - Go to: http://192.168.1.100:8000
```

#### Test:
```
- [ ] Landing page loads
- [ ] Can signup/login
- [ ] Dashboard displays correctly
- [ ] Hamburger menu works
- [ ] No horizontal scrolling
- [ ] All interactions work
- [ ] Touch gestures work
- [ ] Forms are usable
```

---

## 🔍 Console Error Checking

### How to Check:
```
1. Press F12 (DevTools)
2. Click "Console" tab
3. Look for red errors
```

### ✅ Good (No Errors):
```
(Empty or only info messages)
```

### ❌ Bad (CORS Error):
```
Access to script at 'file://...' has been blocked by CORS policy
```

**Fix:** Use local server with `http://localhost:8000`

### ❌ Bad (Firebase Error):
```
Firebase: Error (auth/invalid-email)
```

**Fix:** Check email format and Firebase config

---

## 🎯 Test Scenarios

### Scenario 1: New User
```
1. Visit landing page
2. Click "Get Started"
3. Fill signup form (test@rupiya.com)
4. Verify email (if enabled)
5. Login
6. See empty dashboard
7. Explore navigation
8. Logout
```

### Scenario 2: Returning User
```
1. Visit landing page
2. Click "Login"
3. Enter test credentials
4. See dashboard
5. Check KPI cards
6. View transactions
7. Test navigation
8. Logout
```

### Scenario 3: Mobile User
```
1. Open on mobile
2. Login
3. Test hamburger menu
4. Navigate sections
5. Check responsiveness
6. Verify no horizontal scroll
7. Logout
```

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Changes not visible"
```
Fix: Ctrl + Shift + R (hard refresh)
```

### Issue: "Hamburger not working"
```
Fix: Check URL is http:// (not file://)
```

### Issue: "CORS errors"
```
Fix: Start server, use http://localhost:8000
```

### Issue: "User not found"
```
Fix: Create account first at signup page
```

### Issue: "Invalid credentials"
```
Fix: Use test@rupiya.com / Test@123456
```

### Issue: "Horizontal scroll on mobile"
```
Fix: Hard refresh (Ctrl + Shift + R)
```

---

## ✅ Final Checklist

Before proceeding to Phase 3:

### Server
- [ ] Server running (terminal open)
- [ ] URL: http://localhost:8000
- [ ] No CORS errors

### Authentication
- [ ] Can create account
- [ ] Can login with email/password
- [ ] Can login with Google
- [ ] Can logout
- [ ] Protected routes work

### Landing Page
- [ ] Loads correctly
- [ ] All sections visible
- [ ] Buttons work
- [ ] Responsive on mobile

### Dashboard (Desktop)
- [ ] Sidebar visible
- [ ] 4 KPI cards (2×2 grid)
- [ ] Blue borders on cards
- [ ] Hover effects work
- [ ] User profile correct
- [ ] Logout works

### Dashboard (Mobile)
- [ ] Hamburger menu works
- [ ] Sidebar opens/closes
- [ ] 4 KPI cards (2×2 grid)
- [ ] NO horizontal scroll
- [ ] All content fits screen
- [ ] Touch interactions work

### Console
- [ ] No CORS errors
- [ ] No JavaScript errors
- [ ] All resources load (200)

---

## 📊 Test Results Template

```
Date: _____________
Tester: ___________

Landing Page:     [ ] Pass  [ ] Fail
Signup:           [ ] Pass  [ ] Fail
Login:            [ ] Pass  [ ] Fail
Dashboard Desktop: [ ] Pass  [ ] Fail
Dashboard Mobile:  [ ] Pass  [ ] Fail
Hamburger Menu:    [ ] Pass  [ ] Fail
No Horiz Scroll:   [ ] Pass  [ ] Fail
Logout:           [ ] Pass  [ ] Fail

Issues Found:
_________________________________
_________________________________
_________________________________

Overall Status:   [ ] Ready for Phase 3  [ ] Needs Fixes
```

---

## 🎓 Testing Tips

1. **Always start with server test:**
   - `http://localhost:8000/test-server.html`
   - All checks should be GREEN

2. **Use consistent credentials:**
   - `test@rupiya.com` / `Test@123456`
   - Don't create multiple accounts

3. **Test mobile view in DevTools first:**
   - Faster than real device
   - Easier to debug

4. **Check console regularly:**
   - Press F12
   - Look for errors
   - Fix before proceeding

5. **Hard refresh after changes:**
   - `Ctrl + Shift + R`
   - Clears cache

---

## 🚦 Ready for Phase 3?

Once all tests pass:
- ✅ Server working correctly
- ✅ Authentication functional
- ✅ Dashboard displays properly
- ✅ Mobile responsive (no horizontal scroll)
- ✅ No console errors

**You're ready to proceed with Phase 3: Expense & Income Management!**

---

**Test Credentials:** `test@rupiya.com` / `Test@123456`
**Server URL:** `http://localhost:8000`
**Test Page:** `http://localhost:8000/test-server.html`
