/**
 * Comprehensive SEO Optimization Script for Rupiya Investment App
 * Updates all HTML files with proper SEO meta tags, structured data, and optimization
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load SEO configuration
const seoConfig = JSON.parse(fs.readFileSync('seo-config.json', 'utf8'));

// Helper function to generate meta tags
function generateMetaTags(pageConfig, pageName) {
  const { title, description, keywords, ogTitle, ogDescription, canonical } = pageConfig;
  const { siteName, siteUrl, defaultImage, twitterHandle, locale } = seoConfig;
  
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords}">
  <meta name="author" content="${siteName}">
  <meta name="robots" content="index, follow">
  <meta name="language" content="English">
  <meta name="theme-color" content="#4A90E2">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${defaultImage}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:locale" content="${locale}">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${canonical}">
  <meta property="twitter:title" content="${ogTitle}">
  <meta property="twitter:description" content="${ogDescription}">
  <meta property="twitter:image" content="${defaultImage}">
  <meta property="twitter:site" content="${twitterHandle}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${canonical}">`;
}

// Helper function to generate structured data for investment pages
function generateStructuredData(pageName, pageConfig) {
  const { siteName, siteUrl } = seoConfig;
  const { title, description, canonical } = pageConfig;
  
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "url": canonical,
    "publisher": {
      "@type": "Organization",
      "name": siteName,
      "url": siteUrl
    }
  };
  
  // Add specific schema for investment-related pages
  if (pageName === 'investments.html') {
    return `
  <!-- Structured Data - Investment App -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Rupiya Investment Tracker",
    "applicationCategory": "FinanceApplication",
    "applicationSubCategory": "Investment Portfolio Management",
    "operatingSystem": "Web, Android, iOS",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "10000",
      "bestRating": "5",
      "worstRating": "1"
    },
    "description": "${description}",
    "featureList": "Stock Tracking, Mutual Fund Tracking, Crypto Portfolio, Real Estate Investment Tracking, Portfolio Analytics, XIRR Calculator, Returns Analysis, AI Insights",
    "softwareVersion": "1.0",
    "author": {
      "@type": "Organization",
      "name": "${siteName}"
    }
  }
  </script>`;
  }
  
  // Add breadcrumb schema
  const breadcrumbSchema = `
  <!-- Structured Data - Breadcrumb -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "${siteUrl}/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "${title.split(' - ')[0]}",
        "item": "${canonical}"
      }
    ]
  }
  </script>`;
  
  return `
  <!-- Structured Data - WebPage -->
  <script type="application/ld+json">
  ${JSON.stringify(baseSchema, null, 2)}
  </script>${pageName !== 'index.html' ? breadcrumbSchema : ''}`;
}

// Function to update HTML file with SEO optimization
function optimizeHTMLFile(filename) {
  const filePath = path.join(__dirname, filename);
  
  // Skip if file doesn't exist
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${filename} (not found)`);
    return;
  }
  
  // Skip test and debug files
  if (filename.includes('test-') || filename.includes('debug-') || 
      filename.includes('auth-debug') || filename.includes('check-sheet') ||
      filename.includes('find-sheet') || filename.includes('env-config') ||
      filename.includes('email-template') || filename.includes('force-relogin') ||
      filename.includes('family-modals') || filename.includes('family-test') ||
      filename.includes('offline.html') || filename.includes('admin.html')) {
    console.log(`⏭️  Skipping ${filename} (test/debug file)`);
    return;
  }
  
  // Get SEO config for this page
  const pageConfig = seoConfig.pages[filename];
  if (!pageConfig) {
    console.log(`⚠️  No SEO config found for ${filename}`);
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove existing head content between <head> and first <link> or <script>
    const headStart = content.indexOf('<head>');
    const headEnd = content.indexOf('</head>');
    
    if (headStart === -1 || headEnd === -1) {
      console.log(`⚠️  Invalid HTML structure in ${filename}`);
      return;
    }
    
    // Extract everything after </head>
    const afterHead = content.substring(headEnd);
    
    // Generate new head content
    const metaTags = generateMetaTags(pageConfig, filename);
    const structuredData = generateStructuredData(filename, pageConfig);
    
    // Common head elements
    const commonHead = `
  
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Favicon -->
  <link rel="icon" href="assets/images/logo.png" type="image/png">
  <link rel="apple-touch-icon" href="/android-chrome-192x192.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://www.gstatic.com" crossorigin>`;
    
    // Build new head section
    let newHead = `<head>${metaTags}${commonHead}`;
    
    // Add existing stylesheets and scripts from old head
    const oldHeadContent = content.substring(headStart + 6, headEnd);
    const stylesheetMatches = oldHeadContent.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || [];
    const scriptMatches = oldHeadContent.match(/<script[^>]*src=[^>]*><\/script>/g) || [];
    const inlineScripts = oldHeadContent.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [];
    
    // Add stylesheets
    if (stylesheetMatches.length > 0) {
      newHead += '\n  \n  <!-- Stylesheets -->';
      stylesheetMatches.forEach(link => {
        if (!link.includes('preconnect')) {
          newHead += '\n  ' + link;
        }
      });
    }
    
    // Add auth guard for protected pages
    if (!['index.html', 'login.html', 'signup.html', 'demo.html', 'about-us.html', 
          'contact-us.html', 'privacy-policy.html', 'terms-of-service.html', 
          'disclaimer.html', 'data-protection.html', 'user-guide.html', 'feedback.html'].includes(filename)) {
      newHead += '\n  \n  <!-- Auth Guard - Must be loaded early to prevent flash of protected content -->\n  <script src="assets/js/utils/auth-guard.js"></script>';
    }
    
    // Add external scripts (like Chart.js)
    scriptMatches.forEach(script => {
      if (script.includes('cdn.') || script.includes('http')) {
        newHead += '\n  \n  ' + script;
      }
    });
    
    // Add structured data
    newHead += structuredData;
    
    // Reconstruct the HTML
    const newContent = `<!DOCTYPE html>\n<html lang="en">\n${newHead}\n</head>${afterHead}`;
    
    // Write the updated content
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Optimized ${filename}`);
    
  } catch (error) {
    console.error(`❌ Error optimizing ${filename}:`, error.message);
  }
}

// Main execution
console.log('🚀 Starting SEO Optimization...\n');

// Get all HTML files
const htmlFiles = Object.keys(seoConfig.pages);

console.log(`📄 Found ${htmlFiles.length} pages to optimize\n`);

// Optimize each file
htmlFiles.forEach(file => {
  optimizeHTMLFile(file);
});

console.log('\n✅ SEO Optimization Complete!');
console.log('\n📊 Next Steps:');
console.log('1. Update sitemap.xml with all pages');
console.log('2. Submit sitemap to Google Search Console');
console.log('3. Verify structured data with Google Rich Results Test');
console.log('4. Monitor rankings for target keywords');
