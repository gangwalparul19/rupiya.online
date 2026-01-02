# 🚀 Rupiya - Vanilla HTML/CSS/JS Version

Personal finance management application built with vanilla HTML, CSS, and JavaScript.

## ⚠️ IMPORTANT: Must Use Local Server!

**DO NOT** open HTML files directly by double-clicking them!

### Quick Start

1. **Start the server:**
   - Double-click `start-server.bat` (Python)
   - OR `start-server-node.bat` (Node.js)
   - OR `start-server-php.bat` (PHP)

2. **Open browser to:**
   ```
   http://localhost:8000
   ```

3. **Test everything works:**
   ```
   http://localhost:8000/test-server.html
   ```

### Why?
Opening files directly (`file://` protocol) causes CORS errors that break:
- JavaScript modules
- Firebase authentication
- Sidebar toggle
- All interactive features

See `START_SERVER.md` for detailed instructions.

## 📁 Project Structure

```
rupiya-vanilla/
├── index.html              # Landing page
├── login.html              # Login page
├── signup.html             # Signup page
├── dashboard.html          # Dashboard (requires auth)
├── assets/
│   ├── css/
│   │   ├── common.css      # Global styles & variables
│   │   ├── components.css  # Reusable components
│   │   ├── landing.css     # Landing page styles
│   │   ├── auth.css        # Login/Signup styles
│   │   └── dashboard.css   # Dashboard styles
│   ├── js/
│   │   ├── components/     # Reusable components (toast, etc.)
│   │   ├── services/       # Firebase services
│   │   ├── utils/          # Helper functions
│   │   └── pages/          # Page-specific logic
│   └── images/             # Images and icons
├── .env.local              # Firebase configuration
├── start-server.bat        # Python server launcher
├── start-server-node.bat   # Node.js server launcher
├── start-server-php.bat    # PHP server launcher
├── test-server.html        # Server test page
├── START_SERVER.md         # Server setup guide
└── TROUBLESHOOTING.md      # Common issues & fixes
```

## ✨ Features Implemented

### Phase 1: Foundation & Authentication ✅
- Landing page with features showcase
- User authentication (Email/Password + Google)
- Login and Signup pages
- Toast notifications
- Form validation
- Protected routes

### Phase 2: Dashboard & Navigation ✅
- Dashboard with 4 KPI cards (Income, Expenses, Cash Flow, Savings Rate)
- Sidebar navigation with all sections
- Recent transactions display
- User profile with logout
- Mobile responsive (2×2 grid on mobile)
- Blue theme with hover effects
- No horizontal scrolling

### Phase 3: Coming Next
- Expense management page
- Income management page
- Add/Edit/Delete functionality
- Filters and search

## 🎨 Design Features

- **Blue Theme:** Primary color #4A90E2
- **2px Blue Borders:** On all major cards
- **Hover Effects:** Borders change to cyan (#00D4FF)
- **Mobile Responsive:** 2×2 grid for KPI cards
- **No Horizontal Scroll:** Optimized for all screen sizes
- **Professional Layout:** Clean and modern design

## 🔧 Troubleshooting

### Problem: Changes not visible / Hamburger not working
**Solution:** You're not using the local server correctly!

1. Close all browser tabs
2. Start server: Double-click `start-server.bat`
3. Open NEW tab: `http://localhost:8000`
4. Check URL starts with `http://` (NOT `file://`)

See `TROUBLESHOOTING.md` for detailed fixes.

### Problem: CORS errors in console
**Solution:** Start the local server and access via `http://localhost:8000`

### Problem: Firebase not working
**Solution:** 
1. Check `.env.local` exists with Firebase config
2. Use local server (`http://` protocol required)
3. Check console for specific Firebase errors

## 📱 Mobile Testing

### In Browser
1. Press F12 (DevTools)
2. Click device toggle icon (Ctrl + Shift + M)
3. Select mobile device
4. Test all features

### On Real Device
1. Start server on computer
2. Find computer's IP: `ipconfig` (Windows)
3. On mobile: `http://YOUR_IP:8000`

## 🧪 Testing Checklist

Before proceeding to next phase:

- [ ] Server running correctly
- [ ] URL shows `http://localhost:8000`
- [ ] No CORS errors in console
- [ ] Landing page loads correctly
- [ ] Login/Signup works
- [ ] Dashboard displays 4 KPI cards
- [ ] Hamburger menu works on mobile
- [ ] 2×2 grid on mobile (no horizontal scroll)
- [ ] Recent transactions display
- [ ] Logout works

## 📚 Documentation

- `START_SERVER.md` - How to start local server
- `TROUBLESHOOTING.md` - Common issues and fixes
- `PHASE_2_SUMMARY.md` - Phase 2 implementation details
- `MOBILE_HORIZONTAL_SCROLL_FIX.md` - Mobile optimization details
- `MIGRATION_PLAN_NEXTJS_TO_VANILLA.md` - Full migration plan

## 🚦 Current Status

**Phase 1:** ✅ Complete
**Phase 2:** ✅ Complete
**Phase 3:** 🔄 Ready to start

## 🎯 Next Steps

1. Test current implementation:
   ```
   http://localhost:8000/test-server.html
   ```

2. Verify dashboard works:
   ```
   http://localhost:8000/dashboard.html
   ```

3. Confirm mobile view (no horizontal scroll)

4. Ready for Phase 3: Expense & Income Management

---

## 💡 Tips

- Always use `http://localhost:8000` (never `file://`)
- Keep server terminal window open while testing
- Hard refresh to see changes: `Ctrl + Shift + R`
- Check console (F12) for errors
- Test mobile view in DevTools

## 🆘 Need Help?

1. Read `TROUBLESHOOTING.md`
2. Check `START_SERVER.md`
3. Test with `test-server.html`
4. Verify URL starts with `http://`
5. Check console for errors (F12)

---

**Remember: The server MUST be running for the app to work!**
