#!/usr/bin/env node

/**
 * Cache Version Updater
 * Automatically updates the cache version in service-worker.js on deployment
 * Run this script before deploying to ensure cache is cleared
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_WORKER_PATH = path.join(__dirname, 'service-worker.js');

function updateCacheVersion() {
  try {
    // Read service worker file
    let content = fs.readFileSync(SERVICE_WORKER_PATH, 'utf8');
    
    // Extract current version
    const versionMatch = content.match(/const CACHE_VERSION = '(\d+\.\d+\.\d+)'/);
    
    if (!versionMatch) {
      console.error('❌ Could not find CACHE_VERSION in service-worker.js');
      process.exit(1);
    }
    
    const currentVersion = versionMatch[1];
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // Increment patch version
    const newVersion = `${major}.${minor}.${patch + 1}`;
    
    // Update version in content
    content = content.replace(
      /const CACHE_VERSION = '\d+\.\d+\.\d+'/,
      `const CACHE_VERSION = '${newVersion}'`
    );
    
    // Write back to file
    fs.writeFileSync(SERVICE_WORKER_PATH, content, 'utf8');
    
    console.log(`✅ Cache version updated: ${currentVersion} → ${newVersion}`);
    console.log(`📦 Service worker cache will be cleared on next deployment`);
    
    return newVersion;
  } catch (error) {
    console.error('❌ Error updating cache version:', error.message);
    process.exit(1);
  }
}

// Run the update
updateCacheVersion();

export default updateCacheVersion;
