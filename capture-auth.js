const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const roles = ['admin', 'landlord', 'tenant', 'employee', 'vendor'];
const roleMap = {
  admin:    'munish.marya@gmail.com',
  landlord: 'cs50mun.marya@gmail.com',
  // tenant/employee/vendor: fill in the email once a real portal user exists
  // (invite them via the profile page Invite to Application button, they sign in,
  // then capture their session here)
  tenant:   'REPLACE_WITH_REAL_TENANT_EMAIL',
  employee: 'REPLACE_WITH_REAL_EMPLOYEE_EMAIL',
  vendor:   'REPLACE_WITH_REAL_VENDOR_EMAIL',
};

const args = process.argv.slice(2);
const role = args[0] ? args[0].toLowerCase() : null;

if (!role || !roles.includes(role)) {
  console.error(`Error: Please specify a valid role. Choose one of: ${roles.join(', ')}`);
  console.log(`Example: node capture-auth.js admin`);
  process.exit(1);
}

const targetEmail = roleMap[role];
console.log(`\n======================================================`);
console.log(`🔑 CAPTURING SESSION FOR ROLE: ${role.toUpperCase()}`);
console.log(`📧 Expected Email: ${targetEmail}`);
console.log(`======================================================\n`);

async function capture() {
  const authDir = path.join(__dirname, 'auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const storagePath = path.join(authDir, `${role}Storage.json`);

  console.log('🚀 Launching headed browser with Google OAuth stealth bypass...');
  
  let browser;
  try {
    // Try official Chrome browser first for maximum Google trust
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      slowMo: 300,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled']
    });
  } catch (err) {
    console.log('⚠️ Official Chrome channel not found. Falling back to packaged Chromium...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 300,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled']
    });
  }

  // Create context with a realistic standard User-Agent
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  // Inject script to override navigator.webdriver to completely bypass Google detection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = await context.newPage();
  console.log('🔗 Navigating to Property Manager PWA...');
  await page.goto('https://testpmsmmarya.duckdns.org');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`\n👉 INSTRUCTIONS:`);
  console.log(`1. In the browser window, click "Sign in with Google".`);
  console.log(`2. Log in using the email: ${targetEmail}`);
  console.log(`3. Once you reach the Dashboard, return to this terminal.`);
  console.log(`4. Press [ENTER] in this terminal to capture and save the session.\n`);

  return new Promise((resolve) => {
    rl.question('Press [ENTER] here once you are logged in and on the Dashboard: ', async () => {
      rl.close();
      console.log('\n💾 Capturing storage state (cookies, tokens, session)...');
      try {
        await context.storageState({ path: storagePath });
        console.log(`✅ SUCCESS: Saved storage state to ${storagePath}`);
      } catch (err) {
        console.error(`❌ Failed to save storage state:`, err.message);
      }
      
      console.log('🧹 Closing browser...');
      await browser.close();
      resolve();
    });
  });
}

capture().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
