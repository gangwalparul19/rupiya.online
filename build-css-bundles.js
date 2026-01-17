#!/usr/bin/env node

/**
 * CSS Bundle Optimizer for Rupiya
 * 
 * This script analyzes HTML files and creates optimized CSS bundles:
 * 1. Core bundle - shared across all pages
 * 2. Dashboard bundle - shared across dashboard pages
 * 3. Page-specific bundles - unique to each page type
 * 
 * Reduces CSS from 500KB+ to ~150KB per page
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define CSS bundles based on usage patterns
const CSS_BUNDLES = {
  // Core bundle - loaded on ALL pages (50-60KB)
  core: [
    'common.css',
    'components.css',
    'dark-mode.css',
    'animations.css',
    'loading.css',
    'logout-modal.css'
  ],
  
  // Dashboard bundle - loaded on all dashboard pages (40-50KB)
  dashboard: [
    'dashboard.css',
    'sidebar.css',
    'enhancements.css',
    'mobile-enhancements.css',
    'ux-enhancements.css',
    'layout-fixes.css',
    'form-mobile-optimization.css',
    'button-fix.css',
    'privacy-mode.css',
    'setup-wizard.css',
    'kpi-enhancements.css',
    'empty-states.css',
    'form-validation-enhancements.css',
    'transaction-list-enhancements.css',
    'feature-settings.css',
    'feature-onboarding.css'
  ],
  
  // Auth bundle - login/signup pages (20-30KB)
  auth: [
    'auth.css',
    'mobile-enhancements.css'
  ],
  
  // Landing bundle - index page (30-40KB)
  landing: [
    'landing.css',
    'mobile-enhancements.css'
  ],
  
  // Legal pages bundle (10-20KB)
  legal: [
    'legal-pages.css'
  ]
};

// Page-specific CSS (loaded in addition to bundles)
const PAGE_SPECIFIC_CSS = {
  'expenses.html': ['expenses.css', 'expenses-kpi-override.css'],
  'income.html': ['income.css', 'income-kpi-override.css'],
  'budgets.html': ['budgets.css'],
  'investments.html': ['investments.css', 'investments-mobile.css', 'symbol-search.css'],
  'loans.html': ['loans.css'],
  'goals.html': ['goals.css'],
  'houses.html': ['houses.css'],
  'vehicles.html': ['vehicles.css'],
  'house-help.html': ['house-help.css'],
  'documents.html': ['documents.css'],
  'notes.html': ['notes.css'],
  'recurring.html': ['recurring.css'],
  'ai-insights.html': ['ai-insights.css', 'analytics.css'],
  'split-expense.html': ['split-expense.css'],
  'feedback.html': ['feedback.css'],
  'trip-groups.html': ['trip-groups.css', 'trip-ux-enhancements.css'],
  'trip-group-detail.html': ['trip-group-detail.css', 'trip-ux-enhancements.css'],
  'admin.html': ['admin.css'],
  'transfers.html': ['transfers.css'],
  'net-worth.html': ['net-worth.css'],
  'profile.html': ['profile.css'],
  'predictive-analytics.html': ['predictive-analytics.css', 'analytics.css'],
  'privacy-settings.html': ['feature-settings.css'],
  'feature-details.html': ['feature-details.css'],
  'user-guide.html': ['user-guide.css'],
  'demo.html': ['onboarding.css'],
  'offline.html': [],
  'dashboard.html': ['dashboard-kpi-override.css']
};

// Page to bundle mapping
const PAGE_BUNDLES = {
  'index.html': ['core', 'landing'],
  'login.html': ['core', 'auth'],
  'signup.html': ['core', 'auth'],
  'about-us.html': ['core', 'legal'],
  'contact-us.html': ['core', 'legal'],
  'privacy-policy.html': ['core', 'legal'],
  'terms-of-service.html': ['core', 'legal'],
  'data-protection.html': ['core', 'legal'],
  'disclaimer.html': ['core', 'legal'],
  'offline.html': ['core'],
  
  // Dashboard pages - all use core + dashboard bundles
  'dashboard.html': ['core', 'dashboard'],
  'expenses.html': ['core', 'dashboard'],
  'income.html': ['core', 'dashboard'],
  'budgets.html': ['core', 'dashboard'],
  'investments.html': ['core', 'dashboard'],
  'loans.html': ['core', 'dashboard'],
  'goals.html': ['core', 'dashboard'],
  'houses.html': ['core', 'dashboard'],
  'vehicles.html': ['core', 'dashboard'],
  'house-help.html': ['core', 'dashboard'],
  'documents.html': ['core', 'dashboard'],
  'notes.html': ['core', 'dashboard'],
  'recurring.html': ['core', 'dashboard'],
  'ai-insights.html': ['core', 'dashboard'],
  'split-expense.html': ['core', 'dashboard'],
  'feedback.html': ['core', 'dashboard'],
  'trip-groups.html': ['core', 'dashboard'],
  'trip-group-detail.html': ['core', 'dashboard'],
  'admin.html': ['core', 'dashboard'],
  'transfers.html': ['core', 'dashboard'],
  'net-worth.html': ['core', 'dashboard'],
  'profile.html': ['core', 'dashboard'],
  'predictive-analytics.html': ['core', 'dashboard'],
  'privacy-settings.html': ['core', 'dashboard'],
  'feature-details.html': ['core', 'dashboard'],
  'user-guide.html': ['core', 'dashboard'],
  'demo.html': ['core', 'dashboard']
};

const CSS_DIR = path.join(__dirname, 'assets', 'css');
const BUNDLE_DIR = path.join(__dirname, 'assets', 'css', 'bundles');

/**
 * Create CSS bundles by concatenating files
 */
function createBundles() {
  
  // Create bundles directory if it doesn't exist
  if (!fs.existsSync(BUNDLE_DIR)) {
    fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  }
  
  let totalOriginalSize = 0;
  let totalBundleSize = 0;
  
  // Create each bundle
  for (const [bundleName, files] of Object.entries(CSS_BUNDLES)) {
    
    let bundleContent = `/* ${bundleName.toUpperCase()} BUNDLE - Generated by build-css-bundles.js */\n\n`;
    let bundleSize = 0;
    let originalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(CSS_DIR, file);
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        originalSize += content.length;
        
        // Fix relative @import paths for bundle subdirectory
        // Change @import url('file.css') to @import url('../file.css')
        content = content.replace(/@import\s+url\(['"](?!\.\.\/|https?:\/\/)([^'"]+)['"]\)/g, "@import url('../$1')");
        
        // Add file separator comment
        bundleContent += `/* ========== ${file} ========== */\n`;
        bundleContent += content;
        bundleContent += '\n\n';
        
      } else {
        console.log(`  ⚠️  ${file} not found, skipping`);
      }
    }
    
    // Write bundle file
    const bundlePath = path.join(BUNDLE_DIR, `${bundleName}.bundle.css`);
    fs.writeFileSync(bundlePath, bundleContent, 'utf8');
    bundleSize = bundleContent.length;
    
    totalOriginalSize += originalSize;
    totalBundleSize += bundleSize;
   }
  
}

/**
 * Update HTML files to use bundles
 */
function updateHTMLFiles() {
  
  let updatedCount = 0;
  
  for (const [htmlFile, bundles] of Object.entries(PAGE_BUNDLES)) {
    const htmlPath = path.join(__dirname, htmlFile);
    
    if (!fs.existsSync(htmlPath)) {
      continue;
    }
    
    let content = fs.readFileSync(htmlPath, 'utf8');
    
    // Find the stylesheets section
    const styleRegex = /<!-- Stylesheets -->([\s\S]*?)(?=<\/head>|<!-- |<script)/;
    const match = content.match(styleRegex);
    
    if (!match) {
      console.log(`⚠️  Could not find stylesheet section in ${htmlFile}`);
      continue;
    }
    
    // Build new stylesheet section
    let newStyleSection = '<!-- Stylesheets -->\n';
    
    // Add bundle links
    for (const bundle of bundles) {
      newStyleSection += `  <link rel="stylesheet" href="assets/css/bundles/${bundle}.bundle.css">\n`;
    }
    
    // Add page-specific CSS if any
    const pageSpecific = PAGE_SPECIFIC_CSS[htmlFile];
    if (pageSpecific && pageSpecific.length > 0) {
      newStyleSection += '  <!-- Page-specific styles -->\n';
      for (const file of pageSpecific) {
        newStyleSection += `  <link rel="stylesheet" href="assets/css/${file}">\n`;
      }
    }
    
    // Replace old stylesheet section with new one
    content = content.replace(styleRegex, newStyleSection);
    
    // Write updated file
    fs.writeFileSync(htmlPath, content, 'utf8');
    updatedCount++;
  }
}

/**
 * Create a rollback script
 */
function createRollbackScript() {
  const rollbackScript = `#!/usr/bin/env node

/**
 * Rollback CSS bundles - restores original CSS links
 * Run this if you need to revert to individual CSS files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO: Implement rollback logic if needed
// For now, you can restore from git: git checkout -- *.html

`;

  fs.writeFileSync(path.join(__dirname, 'rollback-css-bundles.js'), rollbackScript, 'utf8');

}

/**
 * Analyze current CSS usage
 */
function analyzeCSSUsage() {
  
  const cssUsage = new Map();
  const htmlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
  
  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(path.join(__dirname, htmlFile), 'utf8');
    const cssMatches = content.match(/href="assets\/css\/([^"]+)"/g);
    
    if (cssMatches) {
      for (const match of cssMatches) {
        const cssFile = match.match(/href="assets\/css\/([^"]+)"/)[1];
        if (!cssUsage.has(cssFile)) {
          cssUsage.set(cssFile, []);
        }
        cssUsage.get(cssFile).push(htmlFile);
      }
    }
  }
  

  // Find most commonly used CSS files
  const sortedUsage = Array.from(cssUsage.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  for (const [file, pages] of sortedUsage) {
    console.log(`   - ${file}: ${pages.length} pages`);
  }
  console.log('');
}

/**
 * Main execution
 */
function main() {
  
  try {
    // Step 1: Analyze
    analyzeCSSUsage();
    
    // Step 2: Create bundles
    createBundles();
    
    // Step 3: Update HTML files
    updateHTMLFiles();
    
    // Step 4: Create rollback script
    createRollbackScript();
    
    
  } catch (error) {
    console.error('❌ Error during CSS optimization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('build-css-bundles.js')) {
  main();
}

export { createBundles, updateHTMLFiles, analyzeCSSUsage };
