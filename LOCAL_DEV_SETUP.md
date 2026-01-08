# 🔒 Secure Local Development Setup

This guide explains how to run the app locally WITHOUT committing your Firebase credentials to git.

## 🎯 How It Works

Instead of hardcoding credentials in HTML files, we use a separate JavaScript file:

1. **`.env`** - Your Firebase credentials (gitignored, never committed)
2. **`env-local.js`** - Generated from .env (gitignored, never committed)
3. **HTML files** - Reference env-local.js via `<script>` tag (safe to commit)

## 🚀 Quick Setup (One-Time)

### Step 1: Configure Your .env File

Edit the `.env` file in the project root with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=AIzaSyC...your_actual_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 2: Run Setup Script

**Windows:**
```cmd
node add-env-script.js
```

**Mac/Linux:**
```bash
node add-env-script.js
```

This adds `<script src="assets/js/config/env-local.js"></script>` to all HTML files.

**You only need to run this ONCE** (or when you add new HTML files).

## 🏃 Daily Development Workflow

Every time you want to work on the project:

**Windows:**
- Double-click `start-local.bat`

**Mac/Linux:**
```bash
node build-local.js && python3 -m http.server 8000
```

This will:
1. Generate `env-local.js` from your `.env` file
2. Start the local server
3. Open http://localhost:8000

## 🔐 Security Benefits

### What's Gitignored (Safe)
- ✅ `.env` - Your actual credentials
- ✅ `assets/js/config/env-local.js` - Generated file with credentials
- ✅ These files will NEVER be committed to git

### What's Committed (Safe)
- ✅ HTML files with `<script src="assets/js/config/env-local.js"></script>`
- ✅ `build-local.js` - Script that generates env-local.js
- ✅ `add-env-script.js` - Script that adds script tags
- ✅ `.env.example` - Template without real credentials

## 📁 File Structure

```
project/
├── .env                              # Your credentials (gitignored)
├── .env.example                      # Template (committed)
├── .gitignore                        # Excludes .env and env-local.js
├── build-local.js                    # Generates env-local.js from .env
├── add-env-script.js                 # Adds script tag to HTML files
├── start-local.bat                   # One-click setup for Windows
├── assets/
│   └── js/
│       └── config/
│           ├── env-local.js          # Generated (gitignored)
│           ├── env.js                # Reads window.__ENV__
│           └── firebase-config.js    # Uses env.js
└── *.html                            # Has <script src="env-local.js">
```

## 🔄 How It Works Technically

### 1. Development (Local)
```
.env → build-local.js → env-local.js → HTML loads it → Firebase works
```

### 2. Production (Vercel)
```
Vercel Env Vars → build.js → Injects into HTML → Firebase works
```

## 🆚 Comparison: Old vs New Approach

### ❌ Old Approach (Insecure)
```html
<head>
  <script>
    window.__ENV__ = {
      VITE_FIREBASE_API_KEY: 'AIzaSyC...actual_key',  // EXPOSED!
      // ... more credentials hardcoded in HTML
    };
  </script>
</head>
```
**Problem:** Credentials are in HTML files that get committed to git!

### ✅ New Approach (Secure)
```html
<head>
  <script src="assets/js/config/env-local.js"></script>
</head>
```
**Solution:** HTML only references a file that's gitignored!

## 🛠️ Troubleshooting

### Problem: "env-local.js not found" error
**Solution:** Run `node build-local.js` to generate it

### Problem: Changes to .env not reflected
**Solution:** 
1. Stop the server (Ctrl+C)
2. Run `node build-local.js` again
3. Start server and hard refresh (Ctrl+Shift+R)

### Problem: Firebase errors on first load
**Solution:**
1. Check `.env` has correct values (no placeholders)
2. Run `node build-local.js`
3. Check `assets/js/config/env-local.js` was created
4. Hard refresh browser

### Problem: Script tag not in HTML files
**Solution:** Run `node add-env-script.js` again

## 🔍 Verify Security

### Check what's gitignored:
```bash
git status
```

You should NOT see:
- `.env`
- `assets/js/config/env-local.js`

You SHOULD see (if modified):
- HTML files (safe - they only reference the file)
- `build-local.js` (safe - no credentials)
- `add-env-script.js` (safe - no credentials)

### Check .gitignore:
```bash
cat .gitignore | grep env
```

Should show:
```
.env
.env.local
.env.*.local
assets/js/config/env-local.js
```

## 📝 Adding New HTML Files

When you create a new HTML file:

1. Add it to the `htmlFiles` array in `add-env-script.js`
2. Run `node add-env-script.js`
3. The script tag will be added automatically

## 🚀 Production Deployment (Vercel)

For production, use the original `build.js`:

1. Set environment variables in Vercel dashboard
2. Vercel runs `build.js` automatically
3. `build.js` injects env vars into HTML at build time
4. No `env-local.js` file is used in production

## ✅ Best Practices

1. **Never commit `.env`** - It's in .gitignore for a reason
2. **Never commit `env-local.js`** - It's auto-generated
3. **Always use `build-local.js`** - Don't manually edit env-local.js
4. **Keep `.env.example` updated** - Template for other developers
5. **Run `build-local.js` after changing .env** - Regenerate env-local.js

## 🎉 Summary

- ✅ Credentials stay in `.env` (gitignored)
- ✅ HTML files are safe to commit (no credentials)
- ✅ `env-local.js` is auto-generated and gitignored
- ✅ One command to start development: `start-local.bat`
- ✅ Works seamlessly with Vercel production builds

---

**Your credentials are now secure! 🔒**
