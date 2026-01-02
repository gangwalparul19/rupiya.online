# Rupiya Vanilla - Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Copy Firebase Configuration

1. Open `rupiya/.env.local` in your existing Next.js project
2. Copy the Firebase configuration values
3. Open `rupiya-vanilla/assets/js/config/firebase-config.js`
4. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_FROM_ENV",
  authDomain: "YOUR_AUTH_DOMAIN_FROM_ENV",
  projectId: "YOUR_PROJECT_ID_FROM_ENV",
  storageBucket: "YOUR_STORAGE_BUCKET_FROM_ENV",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_FROM_ENV",
  appId: "YOUR_APP_ID_FROM_ENV"
};
```

### Step 2: Start Local Server

Choose one method:

**Python (Recommended)**
```bash
cd rupiya-vanilla
python -m http.server 8000
```

**Node.js**
```bash
cd rupiya-vanilla
npx serve
```

**PHP**
```bash
cd rupiya-vanilla
php -S localhost:8000
```

### Step 3: Open in Browser

Navigate to: `http://localhost:8000`

### Step 4: Test Authentication

1. Click "Sign Up" button
2. Create a new account or use Google sign-in
3. Verify you can log in and out

## 🔧 Detailed Setup

### Firebase Console Setup

If you haven't set up Firebase yet:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with Google account

2. **Create/Select Project**
   - Use your existing "rupiya" project
   - Or create a new one

3. **Enable Authentication**
   - Go to: Authentication > Sign-in method
   - Enable "Email/Password"
   - Enable "Google"
   - Add authorized domains (localhost, your domain)

4. **Get Configuration**
   - Go to: Project Settings (gear icon)
   - Scroll to "Your apps"
   - Click "Web" icon (</>) if no app exists
   - Copy the configuration object

5. **Update Code**
   - Paste config into `firebase-config.js`

### Firestore Setup (For Phase 2)

1. **Create Firestore Database**
   - Go to: Firestore Database
   - Click "Create database"
   - Choose "Start in production mode"
   - Select location (closest to users)

2. **Set Security Rules**
   - Copy rules from `rupiya/firestore.rules`
   - Paste into Firestore Rules tab
   - Publish rules

### Storage Setup (For Phase 7)

1. **Enable Storage**
   - Go to: Storage
   - Click "Get started"
   - Use default security rules

2. **Set Storage Rules**
   - Copy rules from `rupiya/storage.rules`
   - Paste into Storage Rules tab
   - Publish rules

## 🧪 Testing Phase 1

### Test Landing Page
1. Open `http://localhost:8000/`
2. Verify page loads
3. Click navigation links
4. Test responsive design (resize browser)

### Test Signup
1. Go to `http://localhost:8000/signup.html`
2. Fill in form with test data
3. Click "Create Account"
4. Verify success message
5. Check Firebase Console > Authentication > Users

### Test Login
1. Go to `http://localhost:8000/login.html`
2. Enter credentials from signup
3. Click "Sign In"
4. Verify success message

### Test Google Sign-In
1. Click "Continue with Google" button
2. Select Google account
3. Verify success message

### Test Password Reset
1. Go to login page
2. Enter email
3. Click "Forgot password?"
4. Check email for reset link

## 🐛 Troubleshooting

### Issue: "Module not found" error
**Solution**: Make sure you're running a local server, not opening files directly (file://)

### Issue: Firebase errors
**Solution**: 
1. Check Firebase config is correct
2. Verify authentication methods are enabled
3. Check browser console for specific errors

### Issue: Google Sign-In not working
**Solution**:
1. Enable Google sign-in in Firebase Console
2. Add authorized domains in Firebase Console
3. Check popup blockers

### Issue: CORS errors
**Solution**: Use a local server (Python, Node, PHP) instead of opening HTML files directly

### Issue: Styles not loading
**Solution**: 
1. Check file paths are correct
2. Verify CSS files exist
3. Clear browser cache

## 📱 Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🔐 Security Notes

### Development
- Use localhost for testing
- Don't commit Firebase config to public repos
- Use environment variables in production

### Production
- Enable Firebase App Check
- Set up proper security rules
- Use HTTPS only
- Enable rate limiting

## 📊 What's Included in Phase 1

### Pages
- ✅ Landing page (index.html)
- ✅ Login page (login.html)
- ✅ Signup page (signup.html)

### Features
- ✅ Email/password authentication
- ✅ Google sign-in
- ✅ Password reset
- ✅ Form validation
- ✅ Toast notifications
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

### Not Yet Included (Coming in Phase 2+)
- ⏳ Dashboard
- ⏳ Expense tracking
- ⏳ Income tracking
- ⏳ Budgets
- ⏳ Analytics
- ⏳ And more...

## 🎯 Next Steps

After Phase 1 is working:
1. Test all authentication flows
2. Verify responsive design
3. Check browser console for errors
4. Review Phase 1 checklist
5. Proceed to Phase 2 (Dashboard)

## 📞 Need Help?

1. Check browser console for errors
2. Review Firebase Console for auth issues
3. Verify all files are in correct locations
4. Check network tab for failed requests
5. Review this guide again

## ✅ Phase 1 Checklist

Before moving to Phase 2:
- [ ] Firebase configured
- [ ] Local server running
- [ ] Landing page loads
- [ ] Signup works
- [ ] Login works
- [ ] Google sign-in works
- [ ] Password reset works
- [ ] Toast notifications work
- [ ] Responsive on mobile
- [ ] No console errors

---

**Ready for Phase 2?** Once all checklist items are complete, you're ready to proceed with the Dashboard and Navigation implementation!
