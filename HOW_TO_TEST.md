# 🧪 How to Test Rupiya App

## 🚨 CRITICAL FIRST STEP

**You MUST start a local server before testing!**

### Why?
- Opening files directly breaks JavaScript
- Firebase won't work without `http://` protocol
- Hamburger menu won't be clickable
- CSS changes won't be visible

---

## 📋 Step-by-Step Testing Guide

### Step 1: Start the Server

**Choose ONE method:**

#### Method A: Python (Recommended)
1. Open File Explorer
2. Navigate to `rupiya-vanilla` folder
3. **Double-click** `start-server.bat`
4. A black window opens showing:
   ```
   Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...
   ```
5. **KEEP THIS WINDOW OPEN!** (Don't close it)

#### Method B: Node.js
1. Navigate to `rupiya-vanilla` folder
2. **Double-click** `start-server-node.bat`
3. Wait for "Starting up http-server..."
4. **KEEP THIS WINDOW OPEN!**

#### Method C: Manual Command
1. Open Command Prompt
2. Navigate to rupiya-vanilla:
   ```bash
   cd path\to\rupiya-vanilla
   ```
3. Run:
   ```bash
   python -m http.server 8000
   ```
4. **KEEP THIS WINDOW OPEN!**

---

### Step 2: Open Browser

1. Open a **NEW** browser tab
2. In the address bar, type:
   ```
   http://localhost:8000/test-server.html
   ```
3. Press Enter

---

### Step 3: Run Server Test

You should see a test page with checks:

**✅ All checks should be GREEN:**
- Protocol check: `http://` ✅
- Module loading: ✅
- JavaScript working: ✅

**❌ If you see RED errors:**
- You're NOT using the server correctly
- Go back to Step 1
- Make sure URL starts with `http://localhost:8000`

---

### Step 4: Test Landing Page

1. Go to: `http://localhost:8000/index.html`
2. Check:
   - [ ] Page loads without errors
   - [ ] Header is visible with logo
   - [ ] Hero section displays correctly
   - [ ] Features section shows 4 cards in 2×2 grid
   - [ ] How It Works shows 2 cards in 1×2 grid
   - [ ] Stats section shows 3 cards in one row
   - [ ] Footer is visible
   - [ ] Login/Signup buttons work

---

### Step 5: Test Login Page

1. Go to: `http://localhost:8000/login.html`
2. Check:
   - [ ] Header and footer are visible
   - [ ] Login form displays
   - [ ] Email and password fields work
   - [ ] "Sign in with Google" button visible
   - [ ] Can navigate back to home via logo

3. **Test Login:**
   - Enter your email and password
   - Click "Login"
   - Should redirect to dashboard

---

### Step 6: Test Dashboard (Desktop View)

1. After login, you should be at: `http://localhost:8000/dashboard.html`
2. Check:
   - [ ] Sidebar is visible on left
   - [ ] Logo in sidebar
   - [ ] All navigation items present
   - [ ] User profile at bottom with your name/email
   - [ ] Logout button visible
   - [ ] 4 KPI cards in 2×2 grid
   - [ ] All cards have blue borders
   - [ ] Recent transactions section
   - [ ] No console errors (Press F12)

3. **Test Interactions:**
   - [ ] Hover over KPI cards (border turns cyan)
   - [ ] Click navigation items
   - [ ] Click logout button

---

### Step 7: Test Dashboard (Mobile View)

1. Press `F12` to open DevTools
2. Click device toggle icon (or press `Ctrl + Shift + M`)
3. Select "iPhone 12" or similar device

4. Check:
   - [ ] Sidebar is hidden
   - [ ] Mobile header visible at top
   - [ ] Hamburger menu (☰) visible
   - [ ] Logo in center of mobile header
   - [ ] 4 KPI cards in 2×2 grid (2 per row)
   - [ ] **NO horizontal scrolling!**
   - [ ] All content fits within screen width

5. **Test Hamburger Menu:**
   - [ ] Click hamburger icon (☰)
   - [ ] Sidebar slides in from left
   - [ ] Dark overlay appears
   - [ ] Can see all navigation items
   - [ ] Click overlay to close sidebar
   - [ ] Sidebar slides out

6. **Test Different Screen Sizes:**
   - [ ] 320px width (iPhone SE)
   - [ ] 375px width (iPhone 12)
   - [ ] 414px width (iPhone 12 Pro Max)
   - [ ] 768px width (iPad)
   - [ ] All sizes: NO horizontal scroll

---

### Step 8: Check Console for Errors

1. Press `F12` to open DevTools
2. Click "Console" tab
3. Look for errors

**✅ Good (No errors):**
```
(Empty or only info messages)
```

**❌ Bad (CORS error):**
```
Access to script at 'file://...' has been blocked by CORS policy
```

If you see CORS errors:
- You're NOT using the server!
- Close browser
- Go back to Step 1
- Make sure URL is `http://localhost:8000`

---

### Step 9: Test on Real Mobile Device (Optional)

1. Make sure mobile and computer are on **same WiFi**

2. Find your computer's IP address:
   - Open Command Prompt
   - Type: `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.100)

3. On your mobile device:
   - Open browser
   - Go to: `http://YOUR_IP:8000`
   - Example: `http://192.168.1.100:8000`

4. Test everything:
   - [ ] Landing page loads
   - [ ] Can login
   - [ ] Dashboard displays correctly
   - [ ] Hamburger menu works
   - [ ] No horizontal scrolling
   - [ ] All interactions work

---

## ✅ Success Checklist

Before proceeding to Phase 3, verify ALL of these:

### Server
- [ ] Server is running (terminal window open)
- [ ] URL shows `http://localhost:8000` (NOT `file://`)
- [ ] No CORS errors in console

### Landing Page
- [ ] Loads without errors
- [ ] 4 feature cards in 2×2 grid
- [ ] 2 "How It Works" cards in 1×2 grid
- [ ] 3 stats cards in one row
- [ ] All buttons work

### Authentication
- [ ] Login page has header/footer
- [ ] Can login with email/password
- [ ] Can login with Google
- [ ] Redirects to dashboard after login

### Dashboard (Desktop)
- [ ] Sidebar visible with all sections
- [ ] 4 KPI cards in 2×2 grid
- [ ] Blue borders on all cards
- [ ] Hover effects work (cyan border)
- [ ] User profile shows correct info
- [ ] Logout works

### Dashboard (Mobile)
- [ ] Hamburger menu visible
- [ ] Hamburger menu is clickable
- [ ] Sidebar opens/closes correctly
- [ ] 4 KPI cards in 2×2 grid (2 per row)
- [ ] **NO horizontal scrolling**
- [ ] All content fits screen width
- [ ] Text is readable

### Console
- [ ] No CORS errors
- [ ] No JavaScript errors
- [ ] All resources load (status 200)

---

## 🐛 Common Issues

### Issue: "I don't see any changes"
**Fix:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear cache: `Ctrl + Shift + Delete`
3. Make sure URL is `http://localhost:8000`

### Issue: "Hamburger menu doesn't work"
**Fix:**
1. Check URL starts with `http://` (NOT `file://`)
2. Check console for errors (F12)
3. Make sure server is running
4. Hard refresh the page

### Issue: "Still seeing horizontal scroll"
**Fix:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache
3. Make sure you're using the latest CSS files
4. Check DevTools for CSS loading errors

### Issue: "Firebase not working"
**Fix:**
1. Check `.env.local` file exists
2. Verify Firebase config is correct
3. Make sure using `http://` protocol
4. Check console for Firebase errors

---

## 📊 Test Results

After testing, you should have:

✅ **Working:**
- Local server running
- Landing page displays correctly
- Login/Signup functional
- Dashboard loads with data
- Hamburger menu works on mobile
- No horizontal scrolling
- All interactive elements functional

❌ **Not Working:**
- If anything doesn't work, see `TROUBLESHOOTING.md`

---

## 🎯 Ready for Phase 3?

Once ALL tests pass, you're ready to proceed with:

**Phase 3: Expense & Income Management**
- Add/Edit/Delete expenses
- Add/Edit/Delete income
- Category management
- Filters and search
- Export functionality

---

## 💡 Pro Tips

1. **Always check the URL** - Must be `http://localhost:8000`
2. **Keep server running** - Don't close the terminal window
3. **Hard refresh** - Use `Ctrl + Shift + R` to see changes
4. **Check console** - Press F12 to see errors
5. **Test mobile first** - Easier to catch responsive issues

---

## 🆘 Still Having Issues?

1. Read `TROUBLESHOOTING.md`
2. Check `START_SERVER.md`
3. Run `test-server.html`
4. Verify URL protocol
5. Check console errors

**Remember: The #1 issue is not using the local server correctly!**

---

## ✨ What's Next?

After successful testing:
1. Confirm all features work
2. Test on multiple devices
3. Verify no console errors
4. Ready to start Phase 3!

**Let me know when all tests pass and we'll proceed to Phase 3!**
