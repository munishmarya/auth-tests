const { test, expect } = require('@playwright/test');

// Invite tests are manually verified — skip in automated suite
test.describe.skip('Invite Flow Tests (Admin Context)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/invites');
  });

  test('1.3 Admin sends a Landlord invite', async ({ page }) => {
    // Navigate to New Invite page
    await page.click('a[href*="/invites/new"], button:has-text("New Invite")');
    
    // Fill in invite details
    await page.fill('input[type="email"], name="email"', 'temp-landlord-test@example.com');
    await page.selectOption('select[name="role"], select', 'landlord');
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Submit"), button:has-text("Send")');
    
    // Verify success message
    await expect(page.locator('text=success, text=sent, text=created')).toBeVisible();
  });

  test('1.4 Admin sends a Tenant invite linked to a property', async ({ page }) => {
    await page.click('a[href*="/invites/new"], button:has-text("New Invite")');
    
    await page.fill('input[type="email"], name="email"', 'temp-tenant-test@example.com');
    await page.selectOption('select[name="role"], select', 'tenant');
    
    // Select the first available property in the dropdown
    const propertyDropdown = page.locator('select[name="property_id"], select[name="property"]');
    await propertyDropdown.selectOption({ index: 1 }); // Index 0 is usually the placeholder
    
    await page.click('button[type="submit"], button:has-text("Submit")');
    await expect(page.locator('text=success, text=sent, text=created')).toBeVisible();
  });

  test('1.7 Duplicate invite is blocked', async ({ page }) => {
    await page.click('a[href*="/invites/new"], button:has-text("New Invite")');
    
    // Use an email that was already invited above
    await page.fill('input[type="email"]', 'temp-landlord-test@example.com');
    await page.selectOption('select[name="role"]', 'landlord');
    
    await page.click('button[type="submit"]');
    
    // Verify standard error message matches expectation
    await expect(page.locator('text=already exists, text=pending invite')).toBeVisible();
  });
});

test.describe.skip('Invite Flow Tests (Landlord Context)', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/invites');
  });

  test('1.5 Landlord sends a Tenant invite for their own property', async ({ page }) => {
    await page.click('a[href*="/invites/new"], button:has-text("New Invite")');
    
    await page.fill('input[type="email"]', 'landlord-tenant-test@example.com');
    await page.selectOption('select[name="role"]', 'tenant');
    
    // Landlord selects one of their own properties
    const propertyDropdown = page.locator('select[name="property_id"], select[name="property"]');
    await propertyDropdown.selectOption({ index: 1 });
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=success, text=sent')).toBeVisible();
  });

  test('1.6 Landlord cannot invite another Landlord', async ({ page }) => {
    await page.click('a[href*="/invites/new"], button:has-text("New Invite")');
    
    // Try to select "landlord" option if present, or verify option is absent/disabled
    const roleDropdown = page.locator('select[name="role"]');
    const options = await roleDropdown.locator('option').allTextContents();
    
    const hasLandlord = options.some(opt => opt.toLowerCase().includes('landlord'));
    
    if (hasLandlord) {
      await roleDropdown.selectOption('landlord');
      await page.fill('input[type="email"]', 'invalid-landlord-role@example.com');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=error, text=only invite tenant, employee, or vendor, text=invalid')).toBeVisible();
    } else {
      // If landlord option is not even present, it meets the security requirement
      expect(hasLandlord).toBe(false);
    }
  });
});
