#!/usr/bin/env node

/**
 * Browser Testing Setup Script
 * 
 * This script helps set up the environment for cross-browser testing.
 * It checks for required dependencies and provides setup instructions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🌐 Cross-Browser Testing Setup\n');

// Check if Playwright is installed
function checkPlaywrightInstalled() {
  try {
    require.resolve('@playwright/test');
    console.log('✅ Playwright is installed');
    return true;
  } catch (e) {
    console.log('❌ Playwright is not installed');
    console.log('   Run: npm install --save-dev @playwright/test');
    return false;
  }
}

// Check if browsers are installed
function checkBrowsersInstalled() {
  try {
    const result = execSync('npx playwright --version', { encoding: 'utf-8' });
    console.log('✅ Playwright CLI is available');
    console.log(`   Version: ${result.trim()}`);
    return true;
  } catch (e) {
    console.log('❌ Playwright CLI not available');
    return false;
  }
}

// Check if test files exist
function checkTestFilesExist() {
  const testFile = path.join(__dirname, '../tests/cross-browser-test.spec.ts');
  const configFile = path.join(__dirname, '../playwright.config.ts');
  
  const testExists = fs.existsSync(testFile);
  const configExists = fs.existsSync(configFile);
  
  if (testExists) {
    console.log('✅ Test file exists: tests/cross-browser-test.spec.ts');
  } else {
    console.log('❌ Test file missing: tests/cross-browser-test.spec.ts');
  }
  
  if (configExists) {
    console.log('✅ Config file exists: playwright.config.ts');
  } else {
    console.log('❌ Config file missing: playwright.config.ts');
  }
  
  return testExists && configExists;
}

// Main setup check
function main() {
  console.log('Checking setup...\n');
  
  const playwrightInstalled = checkPlaywrightInstalled();
  const browsersAvailable = checkBrowsersInstalled();
  const testFilesExist = checkTestFilesExist();
  
  console.log('\n' + '='.repeat(50));
  
  if (!playwrightInstalled) {
    console.log('\n📦 Next Steps:');
    console.log('1. Install Playwright:');
    console.log('   npm install --save-dev @playwright/test\n');
  } else if (!browsersAvailable) {
    console.log('\n📦 Next Steps:');
    console.log('1. Install browsers:');
    console.log('   npx playwright install\n');
  } else if (!testFilesExist) {
    console.log('\n📦 Next Steps:');
    console.log('1. Ensure test files are in place');
    console.log('2. Check the tests/ directory\n');
  } else {
    console.log('\n✅ Setup Complete!');
    console.log('\n🚀 You can now run tests:');
    console.log('   npm run test:browser          # Run all tests');
    console.log('   npm run test:browser:ui       # Interactive mode');
    console.log('   npm run test:browser:report   # View report\n');
    
    console.log('📋 Manual Testing:');
    console.log('   See tests/CROSS_BROWSER_CHECKLIST.md\n');
    
    console.log('📚 Documentation:');
    console.log('   See tests/README.md\n');
  }
}

main();
