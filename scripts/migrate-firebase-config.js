#!/usr/bin/env node

/**
 * Migration Script: Update Firebase Configuration
 * 
 * This script helps migrate from hardcoded Firebase config to secure API-based config.
 * It updates HTML files to use the new initialization method.
 * 
 * Usage: node scripts/migrate-firebase-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// Configuration
const HTML_FILES_TO_UPDATE = [
  'index.html',
  'login.html',
  'signup.html',
  'dashboard.html',
  'expenses.html',
  'income.html',
  'investments.html',
  'budgets.html',
  'goals.html',
  'categories.html',
  'profile.html',
  'admin.html',
  'demo.html'
];

const OLD_SCRIPT_PATTERN = /<script[^>]*src="[^"]*firebase-config\.js"[^>]*><\/script>/g;
const NEW_SCRIPT = `<script type="module">
  import { initializeFirebase } from './assets/js/config/firebase-init-helper.js';
  
  // Initialize Firebase securely from API
  initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase:', error);
    // Show user-friendly error message
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Configuration Error</h1><p>Unable to load application. Please refresh the page.</p></div>';
  });
</script>`;

/**
 * Update a single HTML file
 */
function updateHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Replace old Firebase config script
    content = content.replace(OLD_SCRIPT_PATTERN, NEW_SCRIPT);

    // Check if file was modified
    if (content === originalContent) {
      console.log(`⚠️  No changes needed: ${filePath}`);
      return false;
    }

    // Write updated content
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main migration function
 */
function migrate() {
  console.log('🔒 Firebase Configuration Migration Script');
  console.log('==========================================\n');

  let updatedCount = 0;
  let skippedCount = 0;

  for (const htmlFile of HTML_FILES_TO_UPDATE) {
    const filePath = path.join(rootDir, htmlFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped (not found): ${htmlFile}`);
      skippedCount++;
      continue;
    }

    if (updateHtmlFile(filePath)) {
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\n==========================================');
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Updated: ${updatedCount} files`);
  console.log(`   ⏭️  Skipped: ${skippedCount} files`);
  console.log('==========================================\n');

  if (updatedCount > 0) {
    console.log('✨ Migration completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Test the application in development');
    console.log('   2. Verify Firebase initializes correctly');
    console.log('   3. Check browser DevTools - Firebase config should not be visible');
    console.log('   4. Deploy to production');
    console.log('   5. Monitor for any errors in production\n');
  } else {
    console.log('⚠️  No files were updated. Please check the HTML files manually.\n');
  }
}

// Run migration
migrate();
