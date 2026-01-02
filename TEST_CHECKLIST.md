# Phase 1 Testing Checklist

Use this checklist to verify Phase 1 is working correctly before proceeding to Phase 2.

## 🚀 Pre-Testing Setup

- [ ] Firebase configuration updated in `assets/js/config/firebase-config.js`
- [ ] Local server running (`python -m http.server 8000`)
- [ ] Browser opened to `http://localhost:8000`
- [ ] Browser console open (F12) to check for errors
- [ ] Firebase Console open to verify users

---

## 🏠 Landing Page Tests

### Visual Tests
- [ ] Page loads without errors
- [ ] Logo displays correctly
- [ ] Navigation bar visible
- [ ] Hero section displays with gradient background
- [ ] Stats section shows (10K+, ₹50Cr+, 4.9★)
- [ ] Features section displays 6 feature cards
- [ ] How It Works section shows 3 steps
- [ ] CTA section visible
- [ ] Footer displays

### Interaction Tests
- [ ] Navigation links scroll smoothly to sections
- [ ] "Sign Up" button redirects to signup.html
- [ ] "Login" button redirects to login.html
- [ ] "Get Started Free" button redirects to signup.html
- [ ] "Learn More" button scrolls to features
- [ ] Navigation becomes sticky on scroll
- [ ] Feature cards animate on scroll into view

### Responsive Tests
- [ ] Resize browser to mobile width (< 768px)
- [ ] Navigation adapts to mobile
- [ ] Hero text is readable
- [ ] Stats stack vertically
- [ ] Feature cards stack vertically
- [ ] CTA buttons stack vertically
- [ ] All text is readable

### Console Check
- [ ] No JavaScript errors in console
- [ ] No CSS errors
- [ ] No 404 errors for assets

---

## 🔐 Login Page Tests

### Visual Tests
- [ ] Page loads without errors
- [ ] Logo displays
- [ ] "Welcome Back" title visible
- [ ] Email input field visible
- [ ] Password input field visible
- [ ] "Forgot password?" link visible
- [ ] "Sign In" button visible
- [ ] "Continue with Google" button visible
- [ ] "Don't have an account? Sign up" link visible

### Form Validation Tests
- [ ] Submit empty form → Shows validation errors
- [ ] Enter invalid email → Shows "Please enter a valid email"
- [ ] Enter short password (< 6 chars) → Shows password error
- [ ] Enter valid email and password → No validation errors

### Password Toggle Tests
- [ ] Click eye icon → Password becomes visible
- [ ] Click eye icon again → Password becomes hidden
- [ ] Icon changes between eye and eye-slash

### Login Tests (Email/Password)
- [ ] Enter valid credentials
- [ ] Click "Sign In"
- [ ] Loading spinner appears
- [ ] Button becomes disabled
- [ ] Success toast appears
- [ ] Redirects to dashboard.html (will show 404 for now - that's OK)
- [ ] Check Firebase Console → User session created

### Login Tests (Google)
- [ ] Click "Continue with Google"
- [ ] Google popup opens
- [ ] Select Google account
- [ ] Success toast appears
- [ ] Redirects to dashboard.html
- [ ] Check Firebase Console → User created/logged in

### Forgot Password Tests
- [ ] Enter email in email field
- [ ] Click "Forgot password?" link
- [ ] Confirm dialog appears
- [ ] Click OK
- [ ] Success toast appears
- [ ] Check email inbox for reset link

### Error Handling Tests
- [ ] Enter wrong password → Error toast appears
- [ ] Enter non-existent email → Error toast appears
- [ ] Error messages are user-friendly

### Responsive Tests
- [ ] Resize to mobile width
- [ ] Form is readable and usable
- [ ] Buttons are touch-friendly
- [ ] All elements visible

### Console Check
- [ ] No JavaScript errors
- [ ] No Firebase errors (except expected ones)
- [ ] No 404 errors

---

## 📝 Signup Page Tests

### Visual Tests
- [ ] Page loads without errors
- [ ] Logo displays
- [ ] "Create Account" title visible
- [ ] Full Name input visible
- [ ] Email input visible
- [ ] Password input visible
- [ ] Confirm Password input visible
- [ ] Terms checkbox visible
- [ ] "Create Account" button visible
- [ ] "Sign up with Google" button visible
- [ ] "Already have an account? Sign in" link visible

### Form Validation Tests
- [ ] Submit empty form → Shows validation errors
- [ ] Enter name < 2 chars → Shows error
- [ ] Enter invalid email → Shows error
- [ ] Enter password < 6 chars → Shows error
- [ ] Enter non-matching passwords → Shows "Passwords do not match"
- [ ] Submit without checking terms → Shows error
- [ ] Enter all valid data → No validation errors

### Password Toggle Tests
- [ ] Click eye icon on password → Password visible
- [ ] Click eye icon on confirm password → Password visible
- [ ] Icons change correctly

### Signup Tests (Email/Password)
- [ ] Fill in all fields correctly
- [ ] Check terms checkbox
- [ ] Click "Create Account"
- [ ] Loading spinner appears
- [ ] Button becomes disabled
- [ ] Success toast appears
- [ ] Redirects to dashboard.html
- [ ] Check Firebase Console → New user created
- [ ] User has display name set

### Signup Tests (Google)
- [ ] Click "Sign up with Google"
- [ ] Google popup opens
- [ ] Select Google account
- [ ] Success toast appears
- [ ] Redirects to dashboard.html
- [ ] Check Firebase Console → User created

### Error Handling Tests
- [ ] Try to signup with existing email → Error toast
- [ ] Try weak password → Error toast
- [ ] Error messages are clear

### Responsive Tests
- [ ] Resize to mobile width
- [ ] Form is usable
- [ ] All fields accessible
- [ ] Buttons work

### Console Check
- [ ] No JavaScript errors
- [ ] No Firebase errors (except expected)
- [ ] No 404 errors

---

## 🔔 Toast Notification Tests

### Success Toast
- [ ] Appears after successful login
- [ ] Green color/icon
- [ ] Auto-dismisses after 3 seconds
- [ ] Can be manually closed

### Error Toast
- [ ] Appears on login error
- [ ] Red color/icon
- [ ] Auto-dismisses after 4 seconds
- [ ] Can be manually closed

### Warning Toast
- [ ] Appears when appropriate
- [ ] Orange color/icon
- [ ] Auto-dismisses after 3.5 seconds

### Info Toast
- [ ] Blue color/icon
- [ ] Auto-dismisses after 3 seconds

### Multiple Toasts
- [ ] Multiple toasts stack correctly
- [ ] Don't overlap
- [ ] Dismiss independently

### Responsive
- [ ] Toasts visible on mobile
- [ ] Positioned correctly
- [ ] Readable

---

## 🌐 Cross-Browser Tests

### Chrome
- [ ] All pages load
- [ ] All features work
- [ ] No console errors

### Firefox
- [ ] All pages load
- [ ] All features work
- [ ] No console errors

### Safari
- [ ] All pages load
- [ ] All features work
- [ ] No console errors

### Edge
- [ ] All pages load
- [ ] All features work
- [ ] No console errors

---

## 📱 Mobile Device Tests (Optional but Recommended)

### iOS Safari
- [ ] Pages load
- [ ] Forms work
- [ ] Touch interactions work

### Android Chrome
- [ ] Pages load
- [ ] Forms work
- [ ] Touch interactions work

---

## 🔍 Firebase Console Verification

### Authentication
- [ ] Go to Firebase Console → Authentication
- [ ] Verify test users appear
- [ ] Check user details (email, display name)
- [ ] Verify last sign-in time

### Enabled Methods
- [ ] Email/Password is enabled
- [ ] Google is enabled
- [ ] Authorized domains include localhost

---

## 🐛 Common Issues & Solutions

### Issue: "Module not found" error
**Solution**: Make sure you're using a local server, not opening files directly

### Issue: Firebase errors
**Solution**: Check firebase-config.js has correct credentials

### Issue: Google Sign-In popup blocked
**Solution**: Allow popups for localhost in browser settings

### Issue: CORS errors
**Solution**: Use local server (Python, Node, PHP)

### Issue: Styles not loading
**Solution**: Check file paths, clear cache

---

## ✅ Final Checklist

Before proceeding to Phase 2:

- [ ] All landing page tests pass
- [ ] All login page tests pass
- [ ] All signup page tests pass
- [ ] Toast notifications work
- [ ] Responsive design works
- [ ] No console errors
- [ ] Firebase authentication works
- [ ] At least 2 browsers tested
- [ ] Mobile responsive verified

---

## 📊 Test Results

**Date Tested**: _______________  
**Tested By**: _______________  
**Browser(s)**: _______________  
**Mobile Device(s)**: _______________  

**Issues Found**: 
- 
- 
- 

**Status**: 
- [ ] ✅ All tests passed - Ready for Phase 2
- [ ] ⚠️ Minor issues found - Can proceed with caution
- [ ] ❌ Major issues found - Need fixes before Phase 2

---

## 🎯 Next Steps

Once all tests pass:
1. Document any issues found
2. Fix critical issues
3. Review Phase 1 implementation
4. Prepare for Phase 2 (Dashboard & Navigation)
5. Review Phase 2 requirements

---

**Happy Testing! 🚀**
