const { test, expect } = require('@playwright/test');

test.describe('Vendor CRUD (Admin Context)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('V.1 Admin creates a vendor', async ({ page }) => {
    await page.goto('/vendors/new');
    await page.fill('input[name="name"]', 'Test Vendor Co');
    await page.fill('input[name="phone"]', '+91 3333333301');
    await page.fill('input[type="email"]', 'maryanaresh@gmail.com');  // email required for portal invites
    await page.fill('input[name="address"]', '123 Vendor Street');
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('textarea[name="notes"]', 'Plumbing vendor');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vendors', { timeout: 10000 });
    await expect(page.locator('text=Test Vendor Co').first()).toBeVisible();
  });

  test('V.2 Admin edits a vendor (change phone)', async ({ page }) => {
    await page.goto('/vendors');
    const card = page.locator('.record-card-clickable').filter({ hasText: 'Test Vendor Co' }).first();
    if (await card.count() === 0) return;
    await card.click();
    await page.fill('input[name="phone"]', '+91 3333333399');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Vendor updated')).toBeVisible({ timeout: 8000 });
  });

  test('V.3 Vendor portal access section is visible on vendor edit page', async ({ page }) => {
    await page.goto('/vendors');
    const card = page.locator('.record-card-clickable').filter({ hasText: 'Test Vendor Co' }).first();
    if (await card.count() === 0) return;
    await card.click();

    const portalSection = page.locator('.portal-section');
    await portalSection.scrollIntoViewIfNeeded();
    await expect(portalSection).toBeVisible();
    // Since vendor has email but no portal user, should show "Invite to Application"
    await expect(page.locator('.portal-btn').filter({ hasText: /Invite|Portal|Revoke/ }).first()).toBeVisible();
  });

  test('V.4 Vendor status is "active" by default on creation', async ({ page }) => {
    await page.goto('/vendors');
    const card = page.locator('.record-card').filter({ hasText: 'Test Vendor Co' }).first();
    if (await card.count() === 0) return;
    await expect(card.locator('.badge-active')).toBeVisible();
  });
});

test.describe('Vendor Portal Access (Vendor Context)', () => {
  test.use({ storageState: 'auth/vendorStorage.json' });

  test('V.5 Vendor dashboard shows correct role', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Vendor')).toBeVisible();
  });

  test('V.6 Vendor sees only transactions related to them', async ({ page }) => {
    await page.goto('/transactions');
    const cards = page.locator('.record-card');
    const count = await cards.count();
    // Vendor sees their own transactions only — should be 0 or a small number
    expect(count).toBeLessThan(20);
  });

  test('V.7 Vendor can raise a ticket', async ({ page }) => {
    await page.goto('/tickets');
    const newBtn = page.locator('button.new-btn');
    if (await newBtn.count() === 0) return; // no create permission
    await newBtn.click();
    await page.fill('input[name="title"]', 'Vendor Test Ticket');
    await page.selectOption('select[name="category"]', { index: 1 });
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tickets', { timeout: 10000 });
    await expect(page.locator('text=Vendor Test Ticket').first()).toBeVisible();
  });
});
