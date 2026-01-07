#!/usr/bin/env node
/**
 * Auto-increment version script
 * Runs on every commit via pre-commit hook
 * Increments the patch version (x.y.Z) automatically
 */

const fs = require('fs');
const path = require('path');

// File paths
const versionJsPath = path.join(__dirname, '..', 'assets', 'js', 'config', 'version.js');
const serviceWorkerPath = path.join(__dirname, '..', 'service-worker.js');

/**
 * Parse version string to object
 */
function parseVersion(versionStr) {
  const parts = versionStr.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * Increment patch version
 */
function incrementVersion(versionStr) {
  const version = parseVersion(versionStr);
  version.patch += 1;
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Read current version from version.js
 */
function getCurrentVersion() {
  try {
    const content = fs.readFileSync(versionJsPath, 'utf8');
    const match = content.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match) {
      return match[1];
    }
  } catch (error) {
    console.error('Error reading version.js:', error.message);
  }
  return '1.0.0';
}

/**
 * Update version.js file
 */
function updateVersionJs(newVersion) {
  const content = `// Single source of truth for app version
// Auto-updated on every commit
export const APP_VERSION = '${newVersion}';
`;
  fs.writeFileSync(versionJsPath, content, 'utf8');
  console.log(`Updated version.js to ${newVersion}`);
}

/**
 * Update service-worker.js file
 */
function updateServiceWorker(newVersion) {
  try {
    let content = fs.readFileSync(serviceWorkerPath, 'utf8');
    
    // Update CACHE_VERSION
    content = content.replace(
      /const CACHE_VERSION = ['"][^'"]+['"]/,
      `const CACHE_VERSION = '${newVersion}'`
    );
    
    fs.writeFileSync(serviceWorkerPath, content, 'utf8');
    console.log(`Updated service-worker.js to ${newVersion}`);
  } catch (error) {
    console.error('Error updating service-worker.js:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('Auto-incrementing version...');
  
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion);
  
  console.log(`Version: ${currentVersion} -> ${newVersion}`);
  
  // Update both files
  updateVersionJs(newVersion);
  updateServiceWorker(newVersion);
  
  console.log('Version increment complete!');
  
  return newVersion;
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, incrementVersion, getCurrentVersion };
