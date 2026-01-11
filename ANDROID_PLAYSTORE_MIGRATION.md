# Rupiya - Android Play Store Migration Guide

## Executive Summary

Your Rupiya app is already a fully-featured PWA - perfect for Android deployment.

**Recommended:** Trusted Web Activity (TWA) - fastest path, 1-2 days, minimal code changes.

---

## What You Already Have

- manifest.json with icons (192x192, 512x512)
- Service Worker with offline support
- Firebase Auth (Google OAuth + Email)
- Responsive mobile design
- Push notification infrastructure

---

## Migration Options

| Approach | Time | Cost | Native Features |
|----------|------|------|-----------------|
| **TWA** | 1-2 days | 25 USD | Limited |
| Capacitor | 3-5 days | 25 USD | Full |
| Native | 2-3 months | 25 USD | Full |

---

## Option 1: TWA (Recommended)

### What is TWA?
Wraps your PWA in Android shell using Chrome Custom Tabs. No browser UI shown.

### Prerequisites
- Android Studio + JDK 11+
- Play Developer Account (25 USD one-time)

### Step 1: Install Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
```

### Step 2: Initialize TWA Project

```bash
bubblewrap init --manifest https://rupiya.online/manifest.json
```

### Step 3: Build APK

```bash
bubblewrap build
```

### Step 4: Add Digital Asset Links

Create file: `.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.rupiya.twa",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### Step 5: Sign and Upload to Play Store

---

## Option 2: Capacitor (More Native Features)

Use if you need camera, contacts, biometrics, or deep native integration.

### Step 1: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
```

### Step 2: Initialize

```bash
npx cap init Rupiya com.rupiya.app
```

### Step 3: Add Android

```bash
npx cap add android
```

### Step 4: Build and Sync

```bash
npm run build
npx cap sync
```

### Step 5: Open in Android Studio

```bash
npx cap open android
```

---

## Play Store Requirements

### Required Assets
- App icon: 512x512 PNG (you have this already)
- Feature graphic: 1024x500 PNG (create this)
- Screenshots: minimum 2, recommended 8
- Short description: max 80 characters
- Full description: max 4000 characters

### Privacy Policy
- Required for apps collecting user data
- You already have: /privacy-policy.html

### App Signing
- Use Play App Signing (recommended)
- Or generate your own keystore

---

## Implementation Timeline

### Week 1: Preparation
- Day 1-2: Set up Play Developer account
- Day 3: Prepare store assets (screenshots, descriptions)
- Day 4-5: TWA setup and testing

### Week 2: Submission
- Day 1: Build signed APK/AAB
- Day 2: Submit to Play Store
- Day 3-7: Review period (typically 3-7 days)

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Play Developer Account | 25 USD (one-time) |
| Development | 0 (DIY) |
| Hosting | 0 (existing Vercel/Firebase) |
| **Total** | **25 USD** |

---

## Recommended Next Steps

1. Register for Google Play Developer account at https://play.google.com/console
2. Run Lighthouse PWA audit on your site (Chrome DevTools > Lighthouse)
3. Prepare store listing assets (screenshots, feature graphic)
4. Choose TWA approach for fastest deployment
5. Test on physical Android device before submission