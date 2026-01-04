#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * - Injects environment variables into HTML files
 * - Injects shared sidebar component into all pages
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
  'loans.html',
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
  'achievements.html',
  'user-guide.html',
  'demo.html',
  'offline.html',
  'trip-groups.html',
  'trip-group-detail.html',
  'admin.html'
];

// Pages that have the dashboard layout with sidebar
const pagesWithSidebar = [
  'dashboard.html',
  'expenses.html',
  'income.html',
  'budgets.html',
  'investments.html',
  'loans.html',
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
  'achievements.html',
  'trip-groups.html',
  'trip-group-detail.html',
  'admin.html'
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

// Read the sidebar component template
function getSidebarHTML() {
  const sidebarPath = path.join(__dirname, 'components', 'sidebar.html');
  if (fs.existsSync(sidebarPath)) {
    return fs.readFileSync(sidebarPath, 'utf8');
  }
  return null;
}

// Generate the sidebar CSS link
const sidebarCSSLink = '<link rel="stylesheet" href="assets/css/sidebar.css">';

// Generate the sidebar JS import (added before closing body tag)
const sidebarJSImport = '<script type="module" src="assets/js/components/sidebar.js"></script>';

console.log('🔧 Starting build process...\n');

// Check if running in Vercel environment
const isVercel = process.env.VERCEL === '1';
console.log(`Environment: ${isVercel ? 'Vercel' : 'Local'}\n`);

// Get sidebar HTML
const sidebarHTML = getSidebarHTML();
if (sidebarHTML) {
  console.log('✓ Loaded sidebar component template\n');
} else {
  console.log('⚠️ Sidebar component template not found\n');
}

// Process each HTML file
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Inject environment variables if not already present
    if (!content.includes('window.__ENV__')) {
      if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>\n  ${envScript}`);
        modified = true;
        console.log(`✓ Injected environment variables into ${file}`);
      }
    }

    // Add sidebar CSS if this page has a sidebar and CSS not already included
    if (pagesWithSidebar.includes(file) && !content.includes('sidebar.css')) {
      // Add after the last CSS link in head
      const lastCSSMatch = content.match(/<link[^>]*\.css[^>]*>/g);
      if (lastCSSMatch) {
        const lastCSS = lastCSSMatch[lastCSSMatch.length - 1];
        content = content.replace(lastCSS, `${lastCSS}\n  ${sidebarCSSLink}`);
        modified = true;
        console.log(`✓ Added sidebar CSS to ${file}`);
      }
    }

    // Add sidebar JS import if this page has a sidebar and not already included
    if (pagesWithSidebar.includes(file) && !content.includes('sidebar.js')) {
      // Add before the page-specific script
      const pageScriptMatch = content.match(/<script type="module" src="assets\/js\/pages\/[^"]+"><\/script>/);
      if (pageScriptMatch) {
        content = content.replace(pageScriptMatch[0], `${sidebarJSImport}\n  ${pageScriptMatch[0]}`);
        modified = true;
        console.log(`✓ Added sidebar JS to ${file}`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    } else if (content.includes('window.__ENV__')) {
      console.log(`✓ ${file} already configured`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n✅ Build process completed!');
