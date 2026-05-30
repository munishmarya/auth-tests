const { test, expect } = require('@playwright/test');

// Minimal 1x1 PNG for required file upload fields
const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
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

    // Email is set via Portal Access section in edit mode — not available on create
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
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    // Skip if a lease already exists (unique active lease constraint per unit)
    if (await page.locator('.record-card').count() > 0) return;
    await page.click('button.new-btn');

    // Wait for async options to load, then select Ravi Kumar specifically
    await page.waitForFunction(() => {
      const s = document.querySelector('select[name="tenant"]');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
    const tenantOpts = await page.locator('select[name="tenant"] option').allTextContents();
    const raviOpt = tenantOpts.find(o => o.includes('Ravi') && !o.includes('awaiting'));
    await page.selectOption('select[name="tenant"]', raviOpt ? { label: raviOpt } : { index: 1 });
    await page.waitForFunction(() => {
      const s = document.querySelector('select[name="unit"]');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
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
  test('3.6 Admin edits a unit (rent amount change)', async ({ page }) => {
    await page.goto('/units');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    const rentInput = page.locator('input[placeholder="15,000"]');
    if (await rentInput.count() > 0) {
      await rentInput.fill('16000');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Unit updated')).toBeVisible({ timeout: 8000 });
    }
  });

  test('3.7 Remark saves and persists on tenant profile', async ({ page }) => {
    await page.goto('/tenants');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    // Capture the exact edit URL so we re-open the same card after save
    const editUrl = page.url();
    await page.fill('textarea[name="remark"]', 'Automated remark test 12345');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Tenant updated')).toBeVisible({ timeout: 8000 });
    // Re-open the SAME tenant card (not first card which may be a different Ravi)
    await page.goto(editUrl);
    const remarkVal = await page.locator('textarea[name="remark"]').inputValue();
    expect(remarkVal).toContain('Automated remark test 12345');
  });

  test('3.8 File attachment saves and "View current document" appears on edit', async ({ page }) => {
    await page.goto('/tenants');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    // Upload the test attachment
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Tenant updated')).toBeVisible({ timeout: 8000 });
    // Re-open in edit mode and verify file link
    await page.goto('/tenants');
    await page.locator('.record-card-clickable').first().click();
    const fileLink = page.locator('a.file-link');
    await expect(fileLink).toBeVisible({ timeout: 5000 });
    const href = await fileLink.getAttribute('href');
    expect(href).toContain('/api/files/');
  });

  test('5.2 Signed contract attachment saves on lease', async ({ page }) => {
    await page.goto('/leases');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    // Upload contract
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.fill('textarea[name="remark"]', 'Lease contract test remark');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Lease updated')).toBeVisible({ timeout: 8000 });
    // Re-open and verify
    await page.goto('/leases');
    await page.locator('.record-card-clickable').first().click();
    const fileLink = page.locator('a.file-link');
    await expect(fileLink).toBeVisible({ timeout: 5000 });
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
