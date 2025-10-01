const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the React app
  await page.goto('http://localhost:3000');
  
  // Wait a bit for the page to load
  await page.waitForTimeout(3000);
  
  // Take a screenshot
  await page.screenshot({ path: 'ui-screenshot.png', fullPage: true });
  
  // Check for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  // Check for network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('NETWORK ERROR:', response.url(), response.status());
    }
  });
  
  // Get page content to look for error messages
  const pageContent = await page.content();
  if (pageContent.includes('error') || pageContent.includes('Error')) {
    console.log('Found error text in page');
  }
  
  // Look for specific error elements
  const errorElements = await page.$$('[class*="error"], [class*="Error"]');
  console.log(`Found ${errorElements.length} potential error elements`);
  
  // Keep the browser open for 10 seconds to see what's happening
  await page.waitForTimeout(10000);
  
  await browser.close();
})();