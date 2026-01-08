# 🧪 Local Testing Guide

Complete guide to test the Rupiya application locally on your machine.

## 📋 Prerequisites

You need ONE of the following installed:
- **Python 3.x** (Recommended - usually pre-installed on most systems)
- **Node.js** (Alternative)
- **PHP** (Alternative)

## 🚀 Quick Start (3 Steps)

### Step 1: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **Your apps** section
5. If no web app exists, click **Add app** → Select **Web** (</>) icon
6. Copy the Firebase configuration values

### Step 2: Update .env File

Open the `.env` file in the project root and replace the placeholder values:

```env
VITE_FIREBASE_API_KEY=AIzaSyC...your_actual_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Note:** The other variables (Google Sheets, Pexels, Gmail) are optional and only needed for specific features.

### Step 3: Start Local Development

**Windows (Easiest):**
- Double-click `start-local.bat`

**Mac/Linux:**
```bash
node build-local.js && python3 -m http.server 8000
```

**What this does:**
1. Reads your `.env` file
2. Injects Firebase config into all HTML files
3. Starts local server on port 8000
4. Opens at http://localhost:8000

That's it! Your browser should now show the app at **http://localhost:8000**

## ✅ Verify Everything Works

### Test 1: Server Test Page
Visit: **http://localhost:8000/test-server.html**

You should see:
- ✅ Server is running correctly
- ✅ JavaScript modules working
- ✅ No CORS errors

### Test 2: Firebase Connection
1. Go to: **http://localhost:8000/login.html**
2. Open browser console (F12)
3. Look for: `[Firebase] Initialized successfully`
4. No errors should appear

### Test 3: Authentication
1. Go to: **http://localhost:8000/signup.html**
2. Create a test account
3. You should be redirected to dashboard

### Test 4: Confirmation Modal (Current Issue)
1. Login to the app
2. Go to: **http://localhost:8000/profile.html**
3. Scroll to Categories section
4. Click the ❌ button on any non-protected category
5. Confirmation modal should appear and stay visible

## 🐛 Testing the Modal Issue

To help debug the modal issue:

1. Open **http://localhost:8000/profile.html**
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Click delete (❌) on a category
5. Copy ALL console logs and share them

Expected logs:
```
[ConfirmationModal] Showing modal with options: {...}
[ConfirmationModal] Setting title...
[ConfirmationModal] Setting message...
[ConfirmationModal] Modal displayed successfully
[ConfirmationModal] Container computed display: block
[ConfirmationModal] Container computed opacity: 1
```

## 🔧 Troubleshooting

### Problem: "Cannot find module" error when running build-local.js
**Solution:** Make sure you have Node.js installed
- Download from: https://nodejs.org/
- Verify: `node --version`

### Problem: "Missing environment variable" errors
**Solution:**
1. Ensure `.env` file exists in project root
2. Verify all VITE_FIREBASE_* variables are set with REAL values (not placeholders)
3. Run `node build-local.js` again
4. Restart the server
5. Hard refresh browser (Ctrl + Shift + R)

### Problem: Changes not visible
**Solution:**
1. Stop the server (Ctrl + C)
2. Run `node build.js` if you changed .env
3. Start server again
4. Hard refresh browser (Ctrl + Shift + R)
5. Clear browser cache if needed

### Problem: Modal appears then disappears
**Solution:** This is the current issue we're debugging!
1. Check console for `hide()` calls
2. Verify button has `type="button"`
3. Share console logs with stack trace

## 📱 Testing on Mobile Device

### Same Network Method

1. Find your computer's IP address:
   
   **Windows:**
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)
   
   **Mac/Linux:**
   ```bash
   ifconfig
   ```
   Look for "inet" address

2. Start server on computer (Step 4 above)

3. On mobile device, open browser and go to:
   ```
   http://YOUR_IP_ADDRESS:8000
   ```
   Example: `http://192.168.1.100:8000`

4. Test all features on mobile

### Using ngrok (Alternative)

1. Install [ngrok](https://ngrok.com/)
2. Start your local server
3. Run: `ngrok http 8000`
4. Use the provided HTTPS URL on any device

## 🎯 What to Test

### Core Features
- [ ] Landing page loads
- [ ] Signup works
- [ ] Login works (email + Google)
- [ ] Dashboard displays correctly
- [ ] All sidebar navigation links work
- [ ] Add expense/income
- [ ] Edit expense/income
- [ ] Delete expense/income (with confirmation modal)
- [ ] Categories management
- [ ] Profile settings
- [ ] Logout

### Confirmation Modal (Priority)
- [ ] Modal appears when clicking delete
- [ ] Modal stays visible (doesn't disappear)
- [ ] Modal is centered on screen
- [ ] Modal overlay is visible (dark background)
- [ ] Confirm button works
- [ ] Cancel button works
- [ ] Close (X) button works
- [ ] Clicking outside modal closes it
- [ ] ESC key closes modal

### Mobile Responsive
- [ ] No horizontal scrolling
- [ ] Hamburger menu works
- [ ] All buttons are tappable
- [ ] Forms work on mobile
- [ ] Modal works on mobile

## 📊 Browser DevTools Tips

### Console Tab
- View all logs and errors
- Filter by severity (Errors, Warnings, Info)
- Search for specific messages

### Network Tab
- See all HTTP requests
- Check if files are loading
- Verify API calls to Firebase

### Elements Tab
- Inspect modal HTML structure
- Check computed CSS styles
- Verify z-index values
- See if modal is in DOM

### Application Tab
- View localStorage data
- Check Firebase authentication state
- Clear storage if needed

## 🆘 Still Having Issues?

1. **Check the URL:** Must be `http://localhost:8000` (NOT `file://`)
2. **Check console:** Look for red error messages
3. **Check Network tab:** Verify files are loading (200 status)
4. **Clear cache:** Hard refresh with Ctrl + Shift + R
5. **Try incognito:** Rules out extension conflicts
6. **Check Firebase Console:** Verify project is active

## 📝 Reporting Issues

When reporting issues, please provide:

1. **Browser & Version:** (e.g., Chrome 120, Firefox 121)
2. **Operating System:** (e.g., Windows 11, macOS 14)
3. **Console Logs:** Copy all errors from console
4. **Steps to Reproduce:** Exact steps that cause the issue
5. **Screenshots:** If visual issue
6. **Network Tab:** If loading issues

---

**Happy Testing! 🎉**

If you encounter the modal issue, please share the complete console logs including the new container debugging information.
