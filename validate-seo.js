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
console.log('🔍 Starting SEO Validation...\n');
console.log('=' .repeat(80));

const htmlFiles = Object.keys(seoConfig.pages);

htmlFiles.forEach(filename => {
  results.total++;
  const validation = validateHTMLFile(filename);
  
  if (validation.status === 'skip') {
    console.log(`⏭️  ${filename.padEnd(30)} - SKIPPED (${validation.message})`);
    return;
  }
  
  if (validation.status === 'pass') {
    results.passed++;
    console.log(`✅ ${filename.padEnd(30)} - PASSED (${validation.message})`);
  } else {
    results.warnings++;
    console.log(`⚠️  ${filename.padEnd(30)} - WARNING (${validation.message})`);
    
    // Show failed checks
    Object.entries(validation.checks).forEach(([check, passed]) => {
      if (!passed) {
        console.log(`   ❌ ${check}`);
      }
    });
  }
  
  results.details.push({
    file: filename,
    ...validation
  });
});

console.log('=' .repeat(80));
console.log('\n📊 Validation Summary\n');
console.log(`Total Files:     ${results.total}`);
console.log(`✅ Passed:       ${results.passed} (${Math.round(results.passed/results.total*100)}%)`);
console.log(`⚠️  Warnings:     ${results.warnings}`);
console.log(`❌ Failed:       ${results.failed}`);

// Check sitemap
console.log('\n🗺️  Sitemap Validation\n');
if (fs.existsSync('sitemap.xml')) {
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const urlCount = (sitemap.match(/<url>/g) || []).length;
  console.log(`✅ Sitemap exists with ${urlCount} URLs`);
  
  // Check if all pages are in sitemap
  const missingPages = htmlFiles.filter(file => !sitemap.includes(file));
  if (missingPages.length > 0) {
    console.log(`⚠️  Missing from sitemap: ${missingPages.join(', ')}`);
  } else {
    console.log(`✅ All pages included in sitemap`);
  }
} else {
  console.log('❌ Sitemap.xml not found');
}

// Check robots.txt
console.log('\n🤖 Robots.txt Validation\n');
if (fs.existsSync('robots.txt')) {
  const robots = fs.readFileSync('robots.txt', 'utf8');
  console.log(`✅ Robots.txt exists`);
  console.log(`✅ Sitemap reference: ${robots.includes('Sitemap:') ? 'Yes' : 'No'}`);
  console.log(`✅ User-agent rules: ${robots.includes('User-agent:') ? 'Yes' : 'No'}`);
} else {
  console.log('❌ Robots.txt not found');
}

// Check structured data file
console.log('\n📋 Structured Data Validation\n');
if (fs.existsSync('structured-data.json')) {
  try {
    const structuredData = JSON.parse(fs.readFileSync('structured-data.json', 'utf8'));
    console.log(`✅ Structured data file exists and is valid JSON`);
    console.log(`✅ Schema types: ${structuredData['@graph'].map(s => s['@type']).join(', ')}`);
  } catch (error) {
    console.log(`❌ Structured data file has JSON errors: ${error.message}`);
  }
} else {
  console.log('⚠️  Structured data file not found');
}

// Performance recommendations
console.log('\n⚡ Performance Recommendations\n');
console.log('1. Submit sitemap to Google Search Console');
console.log('2. Submit sitemap to Bing Webmaster Tools');
console.log('3. Verify structured data with Google Rich Results Test');
console.log('4. Test mobile-friendliness with Google Mobile-Friendly Test');
console.log('5. Check Core Web Vitals with PageSpeed Insights');
console.log('6. Monitor rankings with Google Search Console');

// SEO score
const seoScore = Math.round((results.passed / results.total) * 100);
console.log('\n🎯 Overall SEO Score\n');
console.log(`${seoScore}% - ${seoScore >= 90 ? '🏆 Excellent' : seoScore >= 70 ? '✅ Good' : '⚠️  Needs Improvement'}`);

console.log('\n✅ Validation Complete!\n');

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
console.log('📄 Detailed report saved to: seo-validation-report.json\n');
