#!/usr/bin/env node

/**
 * Verify CSS Bundles Deployment
 * Checks if all bundles exist and are properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_DIR = path.join(__dirname, 'assets', 'css', 'bundles');
const EXPECTED_BUNDLES = [
  'core.bundle.css',
  'dashboard.bundle.css',
  'auth.bundle.css',
  'landing.bundle.css',
  'legal.bundle.css'
];

console.log('🔍 Verifying CSS Bundles...\n');

let allGood = true;

// Check if bundles directory exists
if (!fs.existsSync(BUNDLE_DIR)) {
  console.error('❌ Bundles directory not found:', BUNDLE_DIR);
  console.log('💡 Run: npm run build:css\n');
  process.exit(1);
}

console.log('✅ Bundles directory exists\n');

// Check each bundle
console.log('📦 Checking bundles:\n');

for (const bundle of EXPECTED_BUNDLES) {
  const bundlePath = path.join(BUNDLE_DIR, bundle);
  
  if (!fs.existsSync(bundlePath)) {
    console.error(`❌ Missing: ${bundle}`);
    allGood = false;
  } else {
    const stats = fs.statSync(bundlePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`✅ ${bundle.padEnd(25)} ${sizeKB.padStart(6)} KB`);
  }
}

console.log('');

// Check .gitignore
const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  
  if (gitignore.includes('bundles/') || gitignore.includes('*.bundle.css')) {
    console.warn('⚠️  WARNING: Bundles may be in .gitignore!');
    console.log('   Check .gitignore and ensure bundles are committed\n');
    allGood = false;
  } else {
    console.log('✅ Bundles not in .gitignore\n');
  }
}

// Check if bundles are in git
try {
  const { execSync } = await import('child_process');
  
  for (const bundle of EXPECTED_BUNDLES) {
    const bundlePath = `assets/css/bundles/${bundle}`;
    try {
      execSync(`git ls-files --error-unmatch ${bundlePath}`, { stdio: 'ignore' });
      console.log(`✅ ${bundle} is tracked by git`);
    } catch (error) {
      console.warn(`⚠️  ${bundle} is NOT tracked by git`);
      console.log(`   Run: git add ${bundlePath}`);
      allGood = false;
    }
  }
  console.log('');
} catch (error) {
  console.log('ℹ️  Git check skipped (not in git repo)\n');
}

// Check vercel.json
const vercelPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  const hasCSSHeaders = vercel.headers?.some(h => 
    h.source?.includes('.css') || h.source?.includes('bundles')
  );
  
  if (hasCSSHeaders) {
    console.log('✅ vercel.json has CSS MIME type headers\n');
  } else {
    console.warn('⚠️  vercel.json missing CSS MIME type headers');
    console.log('   This may cause MIME type errors\n');
    allGood = false;
  }
}

// Check firebase.json
const firebasePath = path.join(__dirname, 'firebase.json');
if (fs.existsSync(firebasePath)) {
  const firebase = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
  
  const hasCSSHeaders = firebase.hosting?.headers?.some(h => 
    h.source?.includes('.css')
  );
  
  if (hasCSSHeaders) {
    console.log('✅ firebase.json has CSS MIME type headers\n');
  } else {
    console.warn('⚠️  firebase.json missing CSS MIME type headers');
    console.log('   This may cause MIME type errors\n');
    allGood = false;
  }
}

// Summary
console.log('═══════════════════════════════════════\n');

if (allGood) {
  console.log('✅ All checks passed!');
  console.log('   Bundles are ready for deployment\n');
  console.log('📝 Next steps:');
  console.log('   1. git add assets/css/bundles/');
  console.log('   2. git commit -m "Add CSS bundles"');
  console.log('   3. git push');
  console.log('   4. Deploy to production\n');
  process.exit(0);
} else {
  console.log('❌ Some issues found');
  console.log('   Please fix the issues above\n');
  console.log('💡 Quick fixes:');
  console.log('   - Run: npm run build:css');
  console.log('   - Run: git add assets/css/bundles/');
  console.log('   - Check .gitignore');
  console.log('   - Update vercel.json/firebase.json\n');
  process.exit(1);
}
