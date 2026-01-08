#!/usr/bin/env node

/**
 * Adds env-local.js script reference to all HTML files for local development
 * This script is safe to run multiple times - it won't duplicate the script tag
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTML files that need the env-local.js script
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
  'user-guide.html',
  'demo.html',
  'offline.html',
  'trip-groups.html',
  'trip-group-detail.html',
  'admin.html',
  'about-us.html',
  'contact-us.html',
  'privacy-policy.html',
  'terms-of-service.html',
  'disclaimer.html',
  'data-protection.html'
];

const envScriptTag = '<script src="assets/js/config/env-local.js"></script>';

console.log('🔧 Adding env-local.js script to HTML files...\n');

let addedCount = 0;
let skippedCount = 0;
let alreadyHasCount = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    skippedCount++;
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has the script
    if (content.includes('env-local.js')) {
      console.log(`✓ ${file} already has env-local.js`);
      alreadyHasCount++;
      return;
    }

    // Remove any inline __ENV__ scripts from build-local.js
    content = content.replace(/<script>\s*\/\/ Firebase environment variables[\s\S]*?window\.__ENV__[\s\S]*?<\/script>/g, '');
    content = content.replace(/<script>\s*\/\/ Local development environment[\s\S]*?window\.__ENV__[\s\S]*?<\/script>/g, '');
    
    // Add env-local.js script at the beginning of <head>
    if (content.includes('<head>')) {
      content = content.replace('<head>', `<head>\n  ${envScriptTag}`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Added env-local.js to ${file}`);
      addedCount++;
    } else {
      console.log(`⚠️  Could not add to ${file} (no <head> tag found)`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log(`\n✅ Script addition completed!`);
console.log(`   Added: ${addedCount} files`);
console.log(`   Already had: ${alreadyHasCount} files`);
console.log(`   Skipped: ${skippedCount} files\n`);

console.log('📝 Next steps:');
console.log('   1. Run: node build-local.js (to generate env-local.js)');
console.log('   2. Start server: python -m http.server 8000');
console.log('   3. Visit: http://localhost:8000\n');
