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

// TODO: Implement rollback logic if needed
// For now, you can restore from git: git checkout -- *.html

