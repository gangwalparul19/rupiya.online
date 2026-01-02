# Rupiya Deployment Guide

Complete guide for deploying Rupiya to production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Firebase Configuration](#firebase-configuration)
3. [Deployment Options](#deployment-options)
4. [Post-Deployment](#post-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Code Review
- [ ] All console.log statements removed or disabled in production
- [ ] No hardcoded credentials or API keys
- [ ] All TODO comments addressed
- [ ] Code is properly formatted and linted
- [ ] All tests passing

### Performance
- [ ] Images optimized (compressed, proper formats)
- [ ] CSS minified
- [ ] JavaScript minified
- [ ] Lazy loading implemented
- [ ] Caching strategies in place

### Security
- [ ] Firebase Security Rules configured
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Input validation on all forms
- [ ] XSS protection in place

### SEO
- [ ] Meta tags on all pages
- [ ] Sitemap.xml created
- [ ] Robots.txt configured
- [ ] Open Graph tags added
- [ ] Canonical URLs set

### Accessibility
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Color contrast checked
- [ ] ARIA labels added

### Testing
- [ ] Cross-browser testing complete
- [ ] Mobile responsive testing done
- [ ] All features tested
- [ ] Error handling verified
- [ ] Loading states tested

---

## Firebase Configuration

### 1. Create Firebase Project
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init
```

### 2. Configure Firebase Services

#### Authentication
1. Go to Firebase Console > Authentication
2. Enable Email/Password authentication
3. Enable Google Sign-In
4. Configure authorized domains

#### Firestore Database
1. Go to Firebase Console > Firestore Database
2. Create database in production mode
3. Deploy security rules:

```bash
firebase deploy --only firestore:rules
```

#### Storage
1. Go to Firebase Console > Storage
2. Create storage bucket
3. Deploy storage rules:

```bash
firebase deploy --only storage:rules
```

### 3. Update Firebase Config

Update `assets/js/config/firebase-config.js` with production credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_PRODUCTION_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

#### Setup
```bash
# Initialize Firebase Hosting
firebase init hosting

# Select options:
# - Public directory: rupiya-vanilla
# - Configure as single-page app: No
# - Set up automatic builds: No
```

#### Deploy
```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy with custom message
firebase deploy --only hosting -m "Version 1.0.0"
```

#### Custom Domain
1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow DNS configuration steps
4. Wait for SSL certificate provisioning

### Option 2: Vercel

#### Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login
```

#### Deploy
```bash
# Deploy from rupiya-vanilla directory
cd rupiya-vanilla
vercel

# Production deployment
vercel --prod
```

#### Configuration
Create `vercel.json`:
```json
{
  "version": 2,
  "public": true,
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Option 3: Netlify

#### Setup
1. Go to [Netlify](https://www.netlify.com/)
2. Click "Add new site"
3. Choose "Deploy manually" or connect Git repository

#### Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd rupiya-vanilla
netlify deploy

# Production deployment
netlify deploy --prod
```

#### Configuration
Create `netlify.toml`:
```toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

### Option 4: Traditional Hosting (cPanel, FTP)

#### Steps
1. Compress `rupiya-vanilla` folder
2. Upload to web server via FTP/cPanel
3. Extract files to public_html or www directory
4. Configure .htaccess for clean URLs:

```apache
# .htaccess
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security headers
Header set X-Content-Type-Options "nosniff"
Header set X-Frame-Options "DENY"
Header set X-XSS-Protection "1; mode=block"

# Caching
<FilesMatch "\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

---

## Post-Deployment

### 1. Verify Deployment
- [ ] Landing page loads correctly
- [ ] Login/Signup works
- [ ] Dashboard displays after login
- [ ] All features functional
- [ ] Firebase connection working
- [ ] PWA installable
- [ ] Service worker registered

### 2. Configure Domain
- [ ] DNS records configured
- [ ] SSL certificate active
- [ ] HTTPS enforced
- [ ] www redirect configured

### 3. SEO Setup
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify domain ownership
- [ ] Set up Google Analytics (optional)

### 4. Performance Testing
```bash
# Run Lighthouse audit
npx lighthouse https://your-domain.com --view

# Check Core Web Vitals
# Use PageSpeed Insights: https://pagespeed.web.dev/
```

### 5. Security Testing
- [ ] Run security headers check: https://securityheaders.com/
- [ ] Test SSL configuration: https://www.ssllabs.com/
- [ ] Verify Firebase Security Rules
- [ ] Test authentication flows

---

## Monitoring & Maintenance

### Firebase Monitoring
1. Go to Firebase Console > Performance
2. Enable Performance Monitoring
3. Monitor:
   - Page load times
   - Network requests
   - User sessions

### Error Tracking
```javascript
// Add error tracking service (e.g., Sentry)
// In firebase-config.js or app.js

import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 1.0
});
```

### Analytics
```html
<!-- Add Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Regular Maintenance
- [ ] Monitor Firebase usage and costs
- [ ] Review error logs weekly
- [ ] Update dependencies monthly
- [ ] Backup Firestore data regularly
- [ ] Review and update security rules
- [ ] Monitor performance metrics
- [ ] Check for broken links
- [ ] Update content as needed

### Backup Strategy
```bash
# Backup Firestore data
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)

# Schedule automated backups
# Use Cloud Scheduler or cron jobs
```

### Scaling Considerations
- Monitor Firebase quotas
- Optimize Firestore queries
- Implement pagination for large datasets
- Use Cloud Functions for heavy operations
- Consider CDN for static assets
- Enable Firebase App Check for security

---

## Troubleshooting

### Common Issues

#### 1. Firebase Connection Failed
- Check Firebase config credentials
- Verify authorized domains in Firebase Console
- Check browser console for errors

#### 2. Authentication Not Working
- Verify authentication methods enabled
- Check authorized domains
- Clear browser cache and cookies

#### 3. PWA Not Installing
- Verify manifest.json is accessible
- Check service worker registration
- Ensure HTTPS is enabled
- Verify icon files exist

#### 4. Slow Performance
- Enable caching
- Optimize images
- Minify CSS/JS
- Use CDN for static assets
- Implement lazy loading

---

## Rollback Procedure

### Firebase Hosting
```bash
# List previous deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Vercel
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Manual Rollback
1. Keep previous version backed up
2. Upload previous version files
3. Clear CDN cache
4. Verify rollback successful

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Netlify Documentation**: https://docs.netlify.com/
- **Web.dev**: https://web.dev/
- **MDN Web Docs**: https://developer.mozilla.org/

---

**Last Updated**: January 2, 2026
**Version**: 1.0.0

