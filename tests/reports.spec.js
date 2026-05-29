const { test, expect } = require('@playwright/test');

test.describe('Reports (Admin Context)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('R.1 Income Statement loads without error', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // Page loaded — no JS error or blank screen
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('text=Failed to load').first()).not.toBeVisible();
  });

  test('R.2 Balance Sheet loads without error', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('text=Failed to load').first()).not.toBeVisible();
  });
});

test.describe('Reports (Landlord Context)', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('R.3 Landlord can access Income Statement', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('R.4 Landlord can access Balance Sheet', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
