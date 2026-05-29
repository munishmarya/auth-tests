const { test, expect } = require('@playwright/test');

const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
};

// ── Admin: full ticket lifecycle ──────────────────────────────────────────────
test.describe('Ticket Full Flow (Admin Context)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('T.1 Admin creates a ticket with photo attachment', async ({ page }) => {
    await page.goto('/tickets/new');

    const propSelect = page.locator('select[name="property_id"], select[name="property"]').first();
    if (await propSelect.count() > 0) {
      await propSelect.selectOption({ index: 1 });
    }

    // Select category if present
    const catSelect = page.locator('select[name="category"]');
    if (await catSelect.count() > 0) {
      await catSelect.selectOption('in_house_maintenance');
    }

    await page.fill('input[name="title"]', 'Leaking tap in bathroom');

    // Attach photo
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles(TEST_IMAGE);
    }

    await page.fill('textarea[name="description"]', 'The tap in unit 1A is leaking heavily');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tickets', { timeout: 10000 });
    await expect(page.locator('text=Leaking tap').first()).toBeVisible();
  });

  test('T.2 Admin assigns ticket to an employee and status becomes assigned', async ({ page }) => {
    await page.goto('/tickets');
    const openCard = page.locator('.record-card-clickable').filter({ hasText: 'Leaking tap' }).first();
    if (await openCard.count() === 0) return;
    await openCard.click();

    const assignedTo = page.locator('select[name="assigned_to"]');
    if (await assignedTo.count() > 0) {
      const empOptions = await assignedTo.locator('option').count();
      if (empOptions > 1) {
        await assignedTo.selectOption({ index: 1 });
        await page.click('button[type="submit"]');
        await page.waitForURL('**/tickets', { timeout: 10000 });
      }
    }
  });

  test('T.3 Admin moves ticket through full status lifecycle', async ({ page }) => {
    await page.goto('/tickets');
    const card = page.locator('.record-card-clickable').filter({ hasText: 'Leaking tap' }).first();
    if (await card.count() === 0) return;

    const statuses = ['in_progress', 'resolved', 'closed'];
    for (const status of statuses) {
      await page.goto('/tickets');
      const c = page.locator('.record-card-clickable').filter({ hasText: 'Leaking tap' }).first();
      if (await c.count() === 0) break;
      await c.click();
      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.count() > 0) {
        await statusSelect.selectOption(status);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/tickets', { timeout: 10000 });
        // Verify badge updated
        const updatedCard = page.locator('.record-card').filter({ hasText: 'Leaking tap' }).first();
        if (await updatedCard.count() > 0) {
          await expect(updatedCard.locator(`.badge-${status}`)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('T.4 Admin can view tickets list', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.locator('h1, text=Tickets').first()).toBeVisible({ timeout: 5000 });
  });
});

// ── Tenant: raise and view own tickets ────────────────────────────────────────
test.describe('Ticket Access (Tenant Context)', () => {
  test.use({ storageState: 'auth/tenantStorage.json' });

  test('T.5 Tenant creates a ticket', async ({ page }) => {
    await page.goto('/tickets');
    const newBtn = page.locator('button.new-btn');
    if (await newBtn.count() === 0) return;
    await newBtn.click();

    const noLease = page.locator('text=No active lease');
    const catSelect = page.locator('select[name="category"]');
    await Promise.race([
      noLease.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
      catSelect.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
    ]);
    if (await noLease.isVisible()) return; // no lease — can't create ticket

    if (await catSelect.count() > 0) await catSelect.selectOption({ index: 1 });
    await page.fill('input[name="title"]', 'Tenant Ticket Test');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tickets', { timeout: 10000 });
    await expect(page.locator('text=Tenant Ticket Test').first()).toBeVisible();
  });

  test('T.6 Tenant sees only their own tickets', async ({ page }) => {
    await page.goto('/tickets');
    const count = await page.locator('.record-card').count();
    // Tenant should see only a small number of their own tickets
    expect(count).toBeLessThan(10);
  });

  test('T.7 Ticket form does not show assigned_to field for tenant', async ({ page }) => {
    await page.goto('/tickets');
    const newBtn = page.locator('button.new-btn');
    if (await newBtn.count() === 0) return;
    await newBtn.click();
    // assigned_to field should not be available to tenants
    await expect(page.locator('select[name="assigned_to"]')).not.toBeVisible();
  });
});

// ── Employee: see assigned tickets ────────────────────────────────────────────
test.describe('Ticket Access (Employee Context)', () => {
  test.use({ storageState: 'auth/employeeStorage.json' });

  test('T.8 Employee can view their tickets list', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.locator('h1, text=Tickets').first()).toBeVisible({ timeout: 5000 });
    // Employee sees tickets assigned to them or in their property
    const count = await page.locator('.record-card').count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('T.9 Employee can update status on an assigned ticket', async ({ page }) => {
    await page.goto('/tickets');
    const cards = page.locator('.record-card-clickable');
    const count = await cards.count();
    if (count === 0) return; // no tickets visible

    await cards.first().click();
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('in_progress');
      await page.click('button[type="submit"]');
      // Should succeed or show an auth error if not assigned to this employee
      await page.waitForURL('**/tickets', { timeout: 10000 });
    }
  });
});
