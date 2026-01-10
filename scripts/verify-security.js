#!/usr/bin/env node

/**
 * Security Verification Script
 * 
 * This script verifies that Firebase configuration is properly secured
 * and not exposed in the codebase.
 * 
 * Usage: node scripts/verify-security.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// Configuration
const CHECKS = {
  hardcodedConfig: {
    name: 'Hardcoded Firebase Config',
    patterns: [
      /AIzaSy[A-Za-z0-9_-]{35}/g, // Firebase API key pattern
      /firebaseapp\.com/g,
      /firebasestorage\.app/g
    ],
    files: ['**/*.js', '**/*.html'],
    exclude: ['node_modules/**', '.git/**', 'api/config.js', 'MIGRATION_EXAMPLES.md']
  },
  envLocalFile: {
    name: 'env-local.js with Hardcoded Credentials',
    file: 'assets/js/config/env-local.js',
    shouldNotContain: ['AIzaSy', 'firebaseapp.com']
  },
  apiConfigExists: {
    name: 'API Config Endpoint',
    file: 'api/config.js',
    shouldExist: true
  },
  secureInitExists: {
    name: 'Secure Firebase Init Module',
    file: 'assets/js/config/firebase-config-secure.js',
    shouldExist: true
  },
  helperExists: {
    name: 'Firebase Init Helper',
    file: 'assets/js/config/firebase-init-helper.js',
    shouldExist: true
  }
};

let passCount = 0;
let failCount = 0;
let warningCount = 0;

/**
 * Check if file exists
 */
function checkFileExists(filePath, shouldExist = true) {
  const fullPath = path.join(rootDir, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (shouldExist && !exists) {
    return { pass: false, message: `File not found: ${filePath}` };
  }
  if (!shouldExist && exists) {
    return { pass: false, message: `File should not exist: ${filePath}` };
  }
  return { pass: true, message: `File exists: ${filePath}` };
}

/**
 * Check file content
 */
function checkFileContent(filePath, shouldNotContain = []) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { pass: false, message: `File not found: ${filePath}` };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = [];
  
  for (const pattern of shouldNotContain) {
    if (content.includes(pattern)) {
      found.push(pattern);
    }
  }
  
  if (found.length > 0) {
    return { 
      pass: false, 
      message: `File contains sensitive data: ${found.join(', ')}` 
    };
  }
  
  return { pass: true, message: `File is clean: ${filePath}` };
}

/**
 * Search for patterns in files
 */
function searchPatterns(patterns, fileGlobs, excludeGlobs) {
  const results = [];
  
  function walkDir(dir, relPath = '') {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relFullPath = path.join(relPath, file);
        
        // Check if should be excluded
        const shouldExclude = excludeGlobs.some(exclude => {
          const excludePattern = exclude.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
          return new RegExp(excludePattern).test(relFullPath);
        });
        
        if (shouldExclude) continue;
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath, relFullPath);
        } else if (stat.isFile()) {
          // Check if file matches glob
          const matchesGlob = fileGlobs.some(glob => {
            const globPattern = glob.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
            return new RegExp(globPattern).test(relFullPath);
          });
          
          if (matchesGlob) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              
              for (const pattern of patterns) {
                const matches = content.match(pattern);
                if (matches) {
                  results.push({
                    file: relFullPath,
                    matches: matches.slice(0, 3) // Limit to first 3 matches
                  });
                }
              }
            } catch (e) {
              // Skip files that can't be read
            }
          }
        }
      }
    } catch (e) {
      // Skip directories that can't be read
    }
  }
  
  walkDir(rootDir);
  return results;
}

/**
 * Run all checks
 */
function runChecks() {
  console.log('🔒 Security Verification Script');
  console.log('================================\n');
  
  // Check 1: File existence checks
  console.log('📋 File Existence Checks:');
  
  for (const [key, check] of Object.entries(CHECKS)) {
    if (check.file && check.shouldExist !== undefined) {
      const result = checkFileExists(check.file, check.shouldExist);
      printResult(check.name, result);
    }
  }
  
  console.log('\n📋 File Content Checks:');
  
  // Check 2: env-local.js content
  const envLocalResult = checkFileContent(
    'assets/js/config/env-local.js',
    ['AIzaSy', 'firebaseapp.com']
  );
  printResult(CHECKS.envLocalFile.name, envLocalResult);
  
  // Check 3: Search for hardcoded credentials
  console.log('\n🔍 Searching for Hardcoded Credentials:');
  
  const hardcodedResults = searchPatterns(
    CHECKS.hardcodedConfig.patterns,
    CHECKS.hardcodedConfig.files,
    CHECKS.hardcodedConfig.exclude
  );
  
  if (hardcodedResults.length === 0) {
    console.log('✅ No hardcoded Firebase credentials found');
    passCount++;
  } else {
    console.log(`⚠️  Found potential hardcoded credentials in ${hardcodedResults.length} file(s):`);
    for (const result of hardcodedResults) {
      console.log(`   - ${result.file}`);
      console.log(`     Matches: ${result.matches.join(', ')}`);
    }
    warningCount++;
  }
  
  // Check 4: API endpoint check
  console.log('\n📋 API Endpoint Check:');
  
  const apiConfigResult = checkFileExists('api/config.js', true);
  printResult('API Config Endpoint', apiConfigResult);
  
  if (apiConfigResult.pass) {
    const apiContent = fs.readFileSync(path.join(rootDir, 'api/config.js'), 'utf-8');
    if (apiContent.includes('process.env.VITE_FIREBASE_API_KEY')) {
      console.log('✅ API endpoint uses environment variables');
      passCount++;
    } else {
      console.log('⚠️  API endpoint may not be using environment variables correctly');
      warningCount++;
    }
  }
  
  // Check 5: Secure init modules
  console.log('\n📋 Secure Initialization Modules:');
  
  const secureInitResult = checkFileExists('assets/js/config/firebase-config-secure.js', true);
  printResult('Secure Firebase Init', secureInitResult);
  
  const helperResult = checkFileExists('assets/js/config/firebase-init-helper.js', true);
  printResult('Firebase Init Helper', helperResult);
  
  // Summary
  console.log('\n================================');
  console.log('📊 Verification Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ⚠️  Warnings: ${warningCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('================================\n');
  
  if (failCount === 0) {
    console.log('✨ Security verification passed!\n');
    console.log('📋 Next steps:');
    console.log('   1. Deploy the /api/config endpoint');
    console.log('   2. Set environment variables in your hosting platform');
    console.log('   3. Update HTML files with new initialization');
    console.log('   4. Test in development environment');
    console.log('   5. Deploy to production');
    console.log('   6. Verify Firebase config is not visible in DevTools\n');
  } else {
    console.log('❌ Security verification failed. Please fix the issues above.\n');
  }
}

/**
 * Print result
 */
function printResult(name, result) {
  if (result.pass) {
    console.log(`✅ ${name}`);
    passCount++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   ${result.message}`);
    failCount++;
  }
}

// Run verification
runChecks();
