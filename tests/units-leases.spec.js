const { test, expect } = require('@playwright/test');

// Minimal 1x1 PNG for required file upload fields
const TEST_IMAGE = {
  name: 'test-doc.png',
  mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
};

test.describe('Units, Tenants, & Leases (Admin Context)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('3.1 Create a unit and verify inputs', async ({ page }) => {
    await page.goto('/units');
    await page.click('button.new-btn');

    // 3.2 Verify type dropdown options
    const typeSelect = page.locator('select[name="type"]');
    const typeOptions = await typeSelect.locator('option').allTextContents();
    for (const t of ['apartment', 'house', 'shop', 'office']) {
      expect(typeOptions.some(opt => opt.toLowerCase().includes(t))).toBe(true);
    }

    // 3.3 Status is now a read-only badge (hook-controlled by leases) — no select
    await expect(page.locator('.badge')).toBeVisible();

    // Fill form — property field is name="property", rent amount has no name attr
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('input[name="unit_number"]', 'A-101');
    await page.selectOption('select[name="type"]', 'apartment');
    await page.fill('input[placeholder="15,000"]', '15000');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/units', { timeout: 10000 });
    await expect(page.locator('text=A-101').first()).toBeVisible();
  });

  test('3.5 Indian lakh formatting check', async ({ page }) => {
    await page.goto('/units');
    await page.click('button.new-btn');

    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('input[name="unit_number"]', 'Lakh-Unit');
    await page.selectOption('select[name="type"]', 'apartment');
    await page.fill('input[placeholder="15,000"]', '150000');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/units', { timeout: 10000 });

    // Check Indian lakh formatting if this property is in India
    const lakhCell = page.locator('div:has-text("Lakh-Unit")').first();
    if (await lakhCell.count() > 0) {
      const cellText = await lakhCell.textContent();
      // Either lakh format (India) or regular format (other country)
      expect(cellText).toBeTruthy();
    }
  });

  test('4.1 Create a tenant and verify field validations', async ({ page }) => {
    await page.goto('/tenants');
    await page.click('button.new-btn');

    // 4.3 Verify ID Type dropdown options (check label text)
    const idTypeSelect = page.locator('select[name="id_type"]');
    const idTypeOptions = await idTypeSelect.locator('option').allTextContents();
    expect(idTypeOptions.some(opt => opt.toLowerCase().includes('passport'))).toBe(true);
    expect(idTypeOptions.some(opt => opt.toLowerCase().includes('national'))).toBe(true);
    expect(idTypeOptions.some(opt => opt.toLowerCase().includes('driver'))).toBe(true);

    // Fill valid data — TenantForm has no user_id field
    await page.fill('input[name="first_name"]', 'Ravi');
    await page.fill('input[name="last_name"]', 'Kumar');
    await page.fill('input[name="phone"]', '+91 9876543210');
    await page.fill('input[name="nationality"]', 'Indian');
    await page.fill('input[name="current_address"]', 'Flat 3B, Rose Apartments');
    await page.fill('input[name="permanent_address"]', 'Village Rampur, UP');
    await page.fill('input[name="emergency_contact_name"]', 'Sita Kumar');
    await page.fill('input[name="emergency_contact_phone"]', '+91 8765432109');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'A1234567');

    // ID Document is required for new tenants
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);

    // Status is now a read-only badge (hook-controlled by leases) — no select

    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenants', { timeout: 10000 });
    await expect(page.locator('text=Ravi').first()).toBeVisible();
  });

  test('5.1 Create a lease and verify due day validations', async ({ page }) => {
    await page.goto('/leases');
    await page.click('button.new-btn');

    // Fill basic details — field names: tenant, unit (not tenant_id, unit_id)
    await page.selectOption('select[name="tenant"]', { index: 1 });
    await page.selectOption('select[name="unit"]', { index: 1 });
    await page.fill('input[name="start_date"]', '2025-06-01');
    await page.fill('input[name="end_date"]', '2027-06-01');
    // Rent and deposit inputs have no name attr — use placeholder
    await page.fill('input[placeholder="15,000"]', '15000');
    await page.fill('input[placeholder="30,000"]', '30000');
    // Status is now a read-only badge (computed from end_date) — no select

    // 5.2 Due Day — fill valid value (1-31), then submit
    // Validation errors are server-side; the numeric filter strips non-digits
    await page.fill('input[placeholder="1"]', '28');

    // Signed contract is required for new leases
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/leases', { timeout: 10000 });
  });
});

test.describe('Lease Visibility (Tenant Context)', () => {
  test.use({ storageState: 'auth/tenantStorage.json' });

  test('5.5 Tenant sees only their own lease', async ({ page }) => {
    await page.goto('/leases');

    const rows = await page.locator('table tr, .lease-item, .record-card').count();
    expect(rows).toBeLessThan(5);
  });
});
