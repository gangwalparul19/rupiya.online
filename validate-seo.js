/**
 * SEO Validation Script for Rupiya Investment App
 * Validates all SEO optimizations across HTML files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load SEO configuration
const seoConfig = JSON.parse(fs.readFileSync('seo-config.json', 'utf8'));

// Validation results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

// Validation checks
function validateHTMLFile(filename) {
  const filePath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filePath)) {
    return { status: 'skip', message: 'File not found' };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const checks = {
    hasTitle: /<title>.*<\/title>/.test(content),
    hasMetaDescription: /<meta name="description"/.test(content),
    hasMetaKeywords: /<meta name="keywords"/.test(content),
    hasCanonical: /<link rel="canonical"/.test(content),
    hasOgTags: /<meta property="og:title"/.test(content) && /<meta property="og:description"/.test(content),
    hasTwitterTags: /<meta property="twitter:card"/.test(content),
    hasStructuredData: /<script type="application\/ld\+json">/.test(content),
    hasViewport: /<meta name="viewport"/.test(content),
    hasThemeColor: /<meta name="theme-color"/.test(content),
    hasManifest: /<link rel="manifest"/.test(content),
    hasFavicon: /<link rel="icon"/.test(content)
  };
  
  const passed = Object.values(checks).filter(v => v).length;
  const total = Object.keys(checks).length;
  
  return {
    status: passed === total ? 'pass' : 'warning',
    passed,
    total,
    checks,
    message: `${passed}/${total} checks passed`
  };
}

// Main validation

const htmlFiles = Object.keys(seoConfig.pages);

htmlFiles.forEach(filename => {
  results.total++;
  const validation = validateHTMLFile(filename);
  
  if (validation.status === 'skip') {
    return;
  }
  
  if (validation.status === 'pass') {
    results.passed++;
  } else {
    results.warnings++;
    
    // Show failed checks
    Object.entries(validation.checks).forEach(([check, passed]) => {
      if (!passed) {
      }
    });
  }
  
  results.details.push({
    file: filename,
    ...validation
  });
});


// Check sitemap
if (fs.existsSync('sitemap.xml')) {
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const urlCount = (sitemap.match(/<url>/g) || []).length;
  
  // Check if all pages are in sitemap
  const missingPages = htmlFiles.filter(file => !sitemap.includes(file));
} else {
  console.log('❌ Sitemap.xml not found');
}

// Check robots.txt
if (fs.existsSync('robots.txt')) {
  const robots = fs.readFileSync('robots.txt', 'utf8');
} else {
  console.log('❌ Robots.txt not found');
}

// Check structured data file
if (fs.existsSync('structured-data.json')) {
  try {
    const structuredData = JSON.parse(fs.readFileSync('structured-data.json', 'utf8'));
  } catch (error) {
    console.log(`❌ Structured data file has JSON errors: ${error.message}`);
  }
}


// SEO score
const seoScore = Math.round((results.passed / results.total) * 100);

// Save detailed report
const report = {
  date: new Date().toISOString(),
  summary: {
    total: results.total,
    passed: results.passed,
    warnings: results.warnings,
    failed: results.failed,
    score: seoScore
  },
  details: results.details
};

fs.writeFileSync('seo-validation-report.json', JSON.stringify(report, null, 2));
