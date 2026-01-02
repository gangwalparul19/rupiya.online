# 🚀 QUICK START GUIDE

## 3 Simple Steps to Get Started

### Step 1: Start Server
```
📁 Navigate to: rupiya-vanilla folder
🖱️ Double-click: start-server.bat
⏳ Wait for: "Serving HTTP on..." message
✅ Keep window open!
```

### Step 2: Open Browser
```
🌐 Open browser
📝 Type: http://localhost:8000
⏎ Press Enter
```

### Step 3: Create Test Account
```
🧪 Go to: http://localhost:8000/signup.html
📝 Email: test@rupiya.com
🔒 Password: Test@123456
✅ Click Sign Up
🎯 You'll be redirected to dashboard
```

### Step 4: Test Dashboard
```
🎯 Should be at: http://localhost:8000/dashboard.html
✅ See 4 KPI cards
✅ Test hamburger menu (mobile view)
✅ Verify no horizontal scroll
```

---

## 🔐 Test Credentials

**Use these for all testing:**
```
Email:    test@rupiya.com
Password: Test@123456
```

**First time?** Create account at: `http://localhost:8000/signup.html`
**Already have account?** Login at: `http://localhost:8000/login.html`

See `TEST_CREDENTIALS.md` for more details.

---

## ⚠️ CRITICAL RULES

### ✅ DO
- ✅ Use `http://localhost:8000`
- ✅ Keep server window open
- ✅ Check URL starts with `http://`
- ✅ Test with `test-server.html` first

### ❌ DON'T
- ❌ Double-click HTML files
- ❌ Use `file://` protocol
- ❌ Close server window
- ❌ Forget to start server

---

## 🔍 Quick Checks

### Is Server Running?
```
✅ Terminal window is open
✅ Shows "Serving HTTP on..."
✅ URL is http://localhost:8000
```

### Is Everything Working?
```
✅ No CORS errors in console (F12)
✅ Hamburger menu is clickable
✅ No horizontal scrolling on mobile
✅ Dashboard loads data
```

---

## 🐛 Quick Fixes

### Problem: Changes not visible
```
Fix: Ctrl + Shift + R (hard refresh)
```

### Problem: Hamburger not working
```
Fix: Check URL starts with http:// (not file://)
```

### Problem: CORS errors
```
Fix: Start server, use http://localhost:8000
```

### Problem: Horizontal scroll on mobile
```
Fix: Hard refresh (Ctrl + Shift + R)
```

---

## 📱 Mobile Testing

### In Browser
```
1. Press F12
2. Click device icon (Ctrl + Shift + M)
3. Select iPhone 12
4. Test hamburger menu
```

### On Real Device
```
1. Find computer IP: ipconfig
2. On mobile: http://YOUR_IP:8000
3. Example: http://192.168.1.100:8000
```

---

## 📚 Need More Help?

- **Server setup:** `START_SERVER.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Full testing:** `HOW_TO_TEST.md`
- **Project info:** `README.md`

---

## ✅ Success Checklist

Before proceeding to Phase 3:

- [ ] Server is running
- [ ] URL: `http://localhost:8000`
- [ ] No CORS errors
- [ ] Hamburger menu works
- [ ] No horizontal scroll on mobile
- [ ] All 4 KPI cards visible (2×2 grid)
- [ ] Dashboard loads data
- [ ] Logout works

---

## 🎯 Current Status

**Phase 1:** ✅ Complete (Authentication)
**Phase 2:** ✅ Complete (Dashboard)
**Phase 3:** 🔄 Ready to start (Expense/Income)

---

**Remember: Always use http://localhost:8000 (never file://)**
