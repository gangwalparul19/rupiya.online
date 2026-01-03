#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * Injects environment variables into HTML files
 */

const fs = require('fs');
const path = require('path');

// HTML files that need environment variable injection
const htmlFiles = [
  'index.html',
  'login.html',
  'signup.html',
  'dashboard.html',
  'expenses.html',
  'income.html',
  'budgets.html',
  'investments.html',
  'goals.html',
  'analytics.html',
  'profile.html',
  'houses.html',
  'vehicles.html',
  'house-help.html',
  'documents.html',
  'notes.html',
  'recurring.html',
  'ai-insights.html',
  'split-expense.html',
  'family.html',
  'feedback.html',
  'achievements.html'
];

// Environment variable injection script
const envScript = `
<script>
  // Firebase environment variables injected at build time
  window.__ENV__ = {
    VITE_FIREBASE_API_KEY: '${process.env.VITE_FIREBASE_API_KEY || ''}',
    VITE_FIREBASE_AUTH_DOMAIN: '${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}',
    VITE_FIREBASE_PROJECT_ID: '${process.env.VITE_FIREBASE_PROJECT_ID || ''}',
    VITE_FIREBASE_STORAGE_BUCKET: '${process.env.VITE_FIREBASE_STORAGE_BUCKET || ''}',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}',
    VITE_FIREBASE_APP_ID: '${process.env.VITE_FIREBASE_APP_ID || ''}'
  };
</script>
`;

console.log('🔧 Starting build process...\n');

// Check if running in Vercel environment
const isVercel = process.env.VERCEL === '1';
console.log(`Environment: ${isVercel ? 'Vercel' : 'Local'}\n`);

// Process each HTML file
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if env script already exists
    if (content.includes('window.__ENV__')) {
      console.log(`✓ ${file} already has environment variables`);
      return;
    }

    // Inject script after <head> tag
    if (content.includes('<head>')) {
      content = content.replace('<head>', `<head>\n  ${envScript}`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Injected environment variables into ${file}`);
    } else {
      console.log(`⚠️  Could not find <head> tag in ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n✅ Build process completed!');
