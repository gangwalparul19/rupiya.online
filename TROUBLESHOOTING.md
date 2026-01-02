# 🔧 Troubleshooting Guide

## Problem: Changes Not Visible / Hamburger Not Clickable

### Root Cause
You're opening files directly with `file://` protocol instead of using a local server with `http://` protocol.

### Symptoms
- ❌ Hamburger menu doesn't work
- ❌ CSS changes not visible
- ❌ JavaScript not running
- ❌ Console shows CORS errors
- ❌ Firebase authentication fails
- ❌ URL starts with `file:///`

### Solution: Use Local Server

## 🚀 STEP-BY-STEP FIX

### Step 1: Close All Browser Tabs
Close all tabs with the Rupiya app open.

### Step 2: Start the Server

**Option A: Python (Easiest)**
1. Navigate to `rupiya-vanilla` folder
2. Double-click `start-server.bat`
3. A black window will open showing "Serving HTTP on..."
4. **DO NOT CLOSE THIS WINDOW**

**Option B: Node.js**
1. Navigate to `rupiya-vanilla` folder
2. Double-click `start-server-node.bat`
3. Wait for "Starting up http-server..." message
4. **DO NOT CLOSE THIS WINDOW**

**Option C: Manual Command**
Open Command Prompt in `rupiya-vanilla` folder:
```bash
python -m http.server 8000
```

### Step 3: Open Browser Correctly
1. Open a NEW browser tab
2. Type in address bar: `http://localhost:8000`
3. Press Enter

### Step 4: Test the Server
1. Go to: `http://localhost:8000/test-server.html`
2. Check all tests pass (green checkmarks)
3. If any test fails, the server is NOT running correctly

### Step 5: Navigate to Dashboard
1. Go to: `http://localhost:8000/login.html`
2. Login with your credentials
3. You'll be redirected to dashboard
4. Test hamburger menu on mobile view

## ✅ Verification Checklist

After starting the server, verify:

- [ ] URL starts with `http://localhost:8000` (NOT `file://`)
- [ ] No CORS errors in console (Press F12 to check)
- [ ] Hamburger menu is clickable
- [ ] Sidebar opens/closes on mobile
- [ ] CSS styles are applied correctly
- [ ] All interactive elements work

## 🔍 How to Check Console for Errors

1. Press `F12` on your keyboard (or right-click > Inspect)
2. Click the "Console" tab
3. Look for red error messages

**Good (No errors):**
```
No errors shown
```

**Bad (CORS error):**
```
Access to script at 'file://...' has been blocked by CORS policy
```

If you see CORS errors, you're NOT using the server!

## 📱 Testing Mobile View

### In Browser (Desktop)
1. Press `F12` to open DevTools
2. Click the device toggle icon (or press `Ctrl + Shift + M`)
3. Select a mobile device (e.g., iPhone 12)
4. Test hamburger menu

### On Real Mobile Device
1. Make sure mobile and computer are on same WiFi
2. Find your computer's IP:
   - Windows: Open Command Prompt, type `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.100)
3. On mobile browser, go to: `http://YOUR_IP:8000`
   - Example: `http://192.168.1.100:8000`

## 🐛 Common Issues & Fixes

### Issue 1: "Python is not recognized"
**Fix:**
1. Install Python: https://www.python.org/downloads/
2. During installation, CHECK "Add Python to PATH"
3. Restart Command Prompt
4. Try again

### Issue 2: "Port 8000 is already in use"
**Fix:**
Use a different port:
```bash
python -m http.server 8001
```
Then open: `http://localhost:8001`

### Issue 3: Changes still not visible
**Fix:**
1. Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache:
   - Chrome: `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"
3. Close and reopen browser
4. Make sure you're accessing via `http://localhost:8000`

### Issue 4: Hamburger menu still not working
**Fix:**
1. Verify URL starts with `http://` (NOT `file://`)
2. Check console for JavaScript errors (F12)
3. Make sure `dashboard.js` is loading:
   - Open DevTools (F12)
   - Go to "Network" tab
   - Refresh page
   - Look for `dashboard.js` - should show status 200
4. If status is 404 or CORS error, server is not running correctly

### Issue 5: Firebase not working
**Fix:**
1. Check `.env.local` file exists in `rupiya-vanilla` folder
2. Verify Firebase config is correct
3. Make sure you're using `http://` protocol
4. Check console for Firebase errors

### Issue 6: Styles not applying
**Fix:**
1. Hard refresh: `Ctrl + Shift + R`
2. Check if CSS files are loading:
   - Open DevTools (F12)
   - Go to "Network" tab
   - Filter by "CSS"
   - All CSS files should show status 200
3. If 404 errors, check file paths in HTML

## 🎯 Quick Test Commands

### Test if Python is installed:
```bash
python --version
```

### Test if Node.js is installed:
```bash
node --version
```

### Test if server is running:
Open browser to: `http://localhost:8000/test-server.html`

## 📞 Still Having Issues?

If you've tried everything above and it's still not working:

1. **Check the URL bar** - It MUST start with `http://localhost:8000`
2. **Check the terminal** - Server must be running (don't close the window)
3. **Check the console** - Press F12 and look for errors
4. **Try a different browser** - Chrome, Firefox, or Edge
5. **Restart everything**:
   - Close all browser tabs
   - Stop the server (Ctrl + C in terminal)
   - Start server again
   - Open fresh browser tab

## 💡 Understanding the Problem

**Why file:// doesn't work:**
- Modern browsers block JavaScript modules from `file://` for security
- Firebase requires `http://` or `https://` protocol
- CORS policy prevents cross-origin requests from `file://`

**Why http:// works:**
- Local server serves files via `http://` protocol
- Browsers trust `http://localhost` for development
- All JavaScript features work correctly
- Firebase can make API calls

---

## ✅ Success Indicators

You'll know everything is working when:
- ✅ URL shows `http://localhost:8000/dashboard.html`
- ✅ Console shows no CORS errors
- ✅ Hamburger menu opens/closes sidebar
- ✅ All 4 KPI cards visible on mobile (2×2 grid)
- ✅ No horizontal scrolling on mobile
- ✅ Firebase authentication works
- ✅ Data loads from Firestore

**If all above are true, you're ready to proceed with Phase 3!**
