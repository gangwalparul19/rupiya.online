#!/usr/bin/env node

/**
 * Rollback CSS bundles - restores original CSS links
 * Run this if you need to revert to individual CSS files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('⏮️  Rolling back CSS bundles...');
console.log('⚠️  This will restore individual CSS file links');
console.log('⚠️  You may need to manually verify the changes\n');

// TODO: Implement rollback logic if needed
// For now, you can restore from git: git checkout -- *.html

console.log('💡 To rollback, run: git checkout -- *.html');
console.log('💡 Or restore from your version control system');
