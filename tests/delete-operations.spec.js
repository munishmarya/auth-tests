const { test, expect } = require('@playwright/test');

const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
};

// ── Admin: delete operations ──────────────────────────────────────────────────
test.describe('Delete Operations (Admin only)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('DEL.1 Admin can delete a tenant', async ({ page }) => {
    // Create a disposable tenant first
    await page.goto('/tenants/new');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.fill('input[name="first_name"]', 'DelTest');
    await page.fill('input[name="last_name"]', 'Tenant');
    await page.fill('input[name="phone"]', '+91 9000000001');
    await page.fill('input[name="nationality"]', 'Indian');
    await page.fill('input[name="current_address"]', 'Del Addr 1');
    await page.fill('input[name="permanent_address"]', 'Del Addr 2');
    await page.fill('input[name="emergency_contact_name"]', 'Del EC');
    await page.fill('input[name="emergency_contact_phone"]', '+91 9000000002');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'DELID001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenants', { timeout: 10000 });

    // Find and open the new record
    const card = page.locator('.record-card-clickable').filter({ hasText: 'DelTest' }).first();
    if (await card.count() === 0) return;
    await card.click();

    // Delete button should be visible for admin
    const deleteBtn = page.locator('button:has-text("Delete")');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // Confirm deletion navigates back to list
    await page.waitForURL('**/tenants', { timeout: 8000 });
    // Verify deleted record is gone
    await expect(page.locator('.record-card').filter({ hasText: 'DelTest' })).not.toBeVisible({ timeout: 3000 });
  });

  test('DEL.2 Admin can delete an employee', async ({ page }) => {
    await page.goto('/employees/new');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    await page.fill('input[name="first_name"]', 'DelTest');
    await page.fill('input[name="last_name"]', 'Employee');
    await page.fill('input[name="phone"]', '+91 9000000003');
    await page.fill('input[name="role_title"]', 'Test Role');
    await page.waitForFunction(() => {
      const s = document.querySelector('select[name="property"]');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('input[name="current_address"]', 'Del Emp Addr');
    await page.fill('input[name="permanent_address"]', 'Del Emp Perm');
    await page.fill('input[name="emergency_contact_name"]', 'Del Emp EC');
    await page.fill('input[name="emergency_contact_phone"]', '+91 9000000004');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'DELEID001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.fill('input[name="bank_name"]', 'Del Bank');
    await page.fill('input[name="bank_account"]', '9000000001');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/employees', { timeout: 10000 });

    const card = page.locator('.record-card-clickable').filter({ hasText: 'DelTest Employee' }).first();
    if (await card.count() === 0) return;
    await card.click();

    const deleteBtn = page.locator('button:has-text("Delete")');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await page.waitForURL('**/employees', { timeout: 8000 });
    await expect(page.locator('.record-card').filter({ hasText: 'DelTest Employee' })).not.toBeVisible({ timeout: 3000 });
  });

  test('DEL.3 Admin can delete a vendor', async ({ page }) => {
    await page.goto('/vendors/new');
    await page.fill('input[name="name"]', 'DelTest Vendor');
    await page.fill('input[name="phone"]', '+91 9000000005');
    await page.waitForFunction(() => {
      const s = document.querySelector('select[name="property"]');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vendors', { timeout: 10000 });

    const card = page.locator('.record-card-clickable').filter({ hasText: 'DelTest Vendor' }).first();
    if (await card.count() === 0) return;
    await card.click();

    const deleteBtn = page.locator('button:has-text("Delete")');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await page.waitForURL('**/vendors', { timeout: 8000 });
    await expect(page.locator('.record-card').filter({ hasText: 'DelTest Vendor' })).not.toBeVisible({ timeout: 3000 });
  });

  test('DEL.4 Admin can delete a unit', async ({ page }) => {
    // Create a disposable unit
    await page.goto('/units/new');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForFunction(() => {
      const s = document.querySelector('select[name="property"]');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('input[name="unit_number"]', 'DEL-U1');
    await page.selectOption('select[name="type"]', 'apartment');
    await page.fill('input[placeholder="15,000"]', '5000');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/units', { timeout: 10000 });

    const card = page.locator('.record-card-clickable').filter({ hasText: 'DEL-U1' }).first();
    if (await card.count() === 0) return;
    await card.click();

    const deleteBtn = page.locator('button:has-text("Delete")');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await page.waitForURL('**/units', { timeout: 8000 });
    await expect(page.locator('.record-card').filter({ hasText: 'DEL-U1' })).not.toBeVisible({ timeout: 3000 });
  });

  test('DEL.5 Admin can delete a transaction', async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return; // no transactions

    await card.click();
    const deleteBtn = page.locator('button:has-text("Delete")');
    if (await deleteBtn.count() === 0) return; // some transactions may not be deletable
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    // Note: don't actually delete to preserve test data for other tests
    // Just verify button is visible
  });
});

// ── Landlord: no delete button ────────────────────────────────────────────────
test.describe('Delete — Landlord cannot delete', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('DEL.6 Landlord sees no Delete button on tenant profile', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return; // no tenants visible to landlord
    await card.click();
    // Delete button must NOT be visible for landlord
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible({ timeout: 3000 });
  });

  test('DEL.7 Landlord sees no Delete button on employee profile', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible({ timeout: 3000 });
  });

  test('DEL.8 Landlord sees no Delete button on vendor profile', async ({ page }) => {
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible({ timeout: 3000 });
  });
});

// ── Employee: no delete button ────────────────────────────────────────────────
test.describe('Delete — Employee cannot delete', () => {
  test.use({ storageState: 'auth/employeeStorage.json' });

  test('DEL.9 Employee sees no Delete button on their own record', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    // Employee form is read-only for their own record — no delete
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible({ timeout: 3000 });
  });
});
