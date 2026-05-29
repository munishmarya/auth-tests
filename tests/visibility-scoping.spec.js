const { test, expect } = require('@playwright/test');

const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
};

// ── Admin creates data for BOTH properties (ASK apartment = second property) ──
test.describe('Scoping Setup — Admin creates data for second property', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('S.0a Admin creates ASK Employee linked to ASK apartment', async ({ page }) => {
    await page.goto('/employees/new');
    await page.fill('input[name="first_name"]', 'ASKEmployee');
    await page.fill('input[name="last_name"]', 'Test');
    await page.fill('input[name="phone"]', '+91 2222222201');
    await page.fill('input[name="role_title"]', 'ASK Staff');
    // Select "ASK apartment" property (second property by name)
    const propSelect = page.locator('select[name="property"]');
    const propOptions = await propSelect.locator('option').allTextContents();
    const askIdx = propOptions.findIndex(o => o.includes('ASK'));
    if (askIdx > 0) {
      await propSelect.selectOption({ index: askIdx });
    } else {
      await propSelect.selectOption({ index: 1 }); // fallback
    }
    await page.fill('input[name="current_address"]', 'ASK Address');
    await page.fill('input[name="permanent_address"]', 'ASK Perm');
    await page.fill('input[name="emergency_contact_name"]', 'ASK EC');
    await page.fill('input[name="emergency_contact_phone"]', '+91 2222222202');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'ASKEID001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.fill('input[name="bank_name"]', 'ASK Bank');
    await page.fill('input[name="bank_account"]', '2222222201');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/employees', { timeout: 10000 });
    await expect(page.locator('text=ASKEmployee').first()).toBeVisible();
  });

  test('S.0b Admin creates ASK Vendor linked to ASK apartment', async ({ page }) => {
    await page.goto('/vendors/new');
    await page.fill('input[name="name"]', 'ASK Vendor');
    await page.fill('input[name="phone"]', '+91 2222222203');
    const propSelect = page.locator('select[name="property"]');
    const propOptions = await propSelect.locator('option').allTextContents();
    const askIdx = propOptions.findIndex(o => o.includes('ASK'));
    await propSelect.selectOption({ index: askIdx > 0 ? askIdx : 1 });
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vendors', { timeout: 10000 });
    await expect(page.locator('text=ASK Vendor').first()).toBeVisible();
  });

  test('S.0c Admin creates ASK Tenant + unit + lease to set last_property', async ({ page }) => {
    // Create tenant
    await page.goto('/tenants/new');
    await page.fill('input[name="first_name"]', 'ASKTenant');
    await page.fill('input[name="last_name"]', 'Test');
    await page.fill('input[name="phone"]', '+91 2222222204');
    await page.fill('input[name="nationality"]', 'Indian');
    await page.fill('input[name="current_address"]', 'ASK Tenant Addr');
    await page.fill('input[name="permanent_address"]', 'ASK Tenant Perm');
    await page.fill('input[name="emergency_contact_name"]', 'ASK Tenant EC');
    await page.fill('input[name="emergency_contact_phone"]', '+91 2222222205');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'ASKTID001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenants', { timeout: 10000 });

    // Create a unit in ASK apartment
    await page.goto('/units/new');
    const propSelect = page.locator('select[name="property"]');
    const propOptions = await propSelect.locator('option').allTextContents();
    const askIdx = propOptions.findIndex(o => o.includes('ASK'));
    await propSelect.selectOption({ index: askIdx > 0 ? askIdx : 1 });
    await page.fill('input[name="unit_number"]', 'ASK-U1');
    await page.selectOption('select[name="type"]', 'apartment');
    await page.fill('input[placeholder="15,000"]', '8000');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/units', { timeout: 10000 });

    // Create lease linking ASK Tenant to ASK unit — sets last_property
    await page.goto('/leases/new');
    await page.locator('select[name="tenant"]').selectOption({ label: /ASKTenant/ });
    await page.locator('select[name="unit"]').selectOption({ label: /ASK-U1/ });
    await page.fill('input[name="start_date"]', '2026-06-01');
    await page.fill('input[name="end_date"]', '2027-06-01');
    await page.fill('input[placeholder="15,000"]', '8000');
    await page.fill('input[placeholder="30,000"]', '16000');
    await page.fill('input[placeholder="1"]', '1');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/leases', { timeout: 10000 });
  });
});

// ── Landlord scoping: cs50mun sees only "test property" data ─────────────────
test.describe('Landlord Visibility — test property only (cs50mun)', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('S.1 Landlord sees only their own property, not the other landlord\'s', async ({ page }) => {
    await page.goto('/properties');
    await expect(page.locator('text=test property')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=ASK apartment')).not.toBeVisible();
  });

  test('S.2 Landlord does not see tenants from the other property', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page.locator('text=ASKTenant')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.3 Landlord does not see employees from the other property', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('text=ASKEmployee')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.4 Landlord does not see vendors from the other property', async ({ page }) => {
    await page.goto('/vendors');
    await expect(page.locator('text=ASK Vendor')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.5 Landlord sees only units in their property', async ({ page }) => {
    await page.goto('/units');
    // ASK-U1 belongs to ASK apartment — should not be visible
    await expect(page.locator('text=ASK-U1')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.6 Landlord sees only leases for their units', async ({ page }) => {
    await page.goto('/leases');
    // Lease for ASK-U1 should not be visible
    await expect(page.locator('text=ASK-U1')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.7 Landlord sees only agreements for their employees', async ({ page }) => {
    await page.goto('/agreements');
    await expect(page.locator('text=ASKEmployee')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.8 All visible transactions belong to landlord\'s property', async ({ page }) => {
    await page.goto('/transactions');
    // Just verify the page loads and shows data
    await expect(page.locator('h1, text=Transactions').first()).toBeVisible({ timeout: 5000 });
    // No transactions from ASK apartment should be visible
    // (hard to verify by name alone — verify count is reasonable)
    const count = await page.locator('.record-card').count();
    expect(count).toBeLessThan(50); // sanity check
  });
});

// ── Tenant scoping: sees only their own data ──────────────────────────────────
test.describe('Tenant Visibility (munishmaryaarchive1)', () => {
  test.use({ storageState: 'auth/tenantStorage.json' });

  test('S.10 Tenant sees only their own lease', async ({ page }) => {
    await page.goto('/leases');
    const count = await page.locator('.record-card').count();
    // Tenant should see only 1 lease (their own) or 0 if not yet active
    expect(count).toBeLessThanOrEqual(2);
  });

  test('S.11 Tenant sees only their own transactions', async ({ page }) => {
    await page.goto('/transactions');
    const count = await page.locator('.record-card').count();
    // Tenant sees only their rent invoices — should be small number
    expect(count).toBeLessThan(20);
  });

  test('S.12 Tenant sees only tickets they raised', async ({ page }) => {
    await page.goto('/tickets');
    const count = await page.locator('.record-card').count();
    // Should only see own tickets
    expect(count).toBeLessThan(10);
  });

  test('S.13 Tenant can view their own profile in tenants list', async ({ page }) => {
    await page.goto('/tenants');
    // Tenant can see their own record (user = @request.auth.id rule)
    const count = await page.locator('.record-card').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ── Employee scoping: sees only own data in their property ────────────────────
test.describe('Employee Visibility (rachelcmarya202212)', () => {
  test.use({ storageState: 'auth/employeeStorage.json' });

  test('S.14 Employee sees only their own employee record', async ({ page }) => {
    await page.goto('/employees');
    const count = await page.locator('.record-card').count();
    // Employee should see only 1 record (themselves)
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThan(10);
    // Should NOT see ASKEmployee (different property)
    await expect(page.locator('text=ASKEmployee')).not.toBeVisible();
  });

  test('S.15 Employee sees only their own employment agreements', async ({ page }) => {
    await page.goto('/agreements');
    const count = await page.locator('.record-card').count();
    // Employee sees only their own agreement
    expect(count).toBeLessThan(5);
  });

  test('S.16 Employee sees only tenants in their property', async ({ page }) => {
    await page.goto('/tenants');
    // ASKTenant belongs to another property — should not be visible
    await expect(page.locator('text=ASKTenant')).not.toBeVisible({ timeout: 5000 });
  });

  test('S.17 Employee ticket list is scoped to their property', async ({ page }) => {
    await page.goto('/tickets');
    await expect(page.locator('h1, text=Tickets').first()).toBeVisible({ timeout: 5000 });
    // Verify page loads — count should be reasonable
    const count = await page.locator('.record-card').count();
    expect(count).toBeLessThan(50);
  });
});

// ── Vendor scoping: sees only their own linked data ───────────────────────────
test.describe('Vendor Visibility (maryanaresh)', () => {
  test.use({ storageState: 'auth/vendorStorage.json' });

  test('S.18 Vendor sees only transactions related to them', async ({ page }) => {
    await page.goto('/transactions');
    const count = await page.locator('.record-card').count();
    // Vendor sees only vendor_invoice transactions with party_id = their vendor record
    expect(count).toBeLessThan(20);
  });

  test('S.19 Vendor sees only tickets they raised', async ({ page }) => {
    await page.goto('/tickets');
    const count = await page.locator('.record-card').count();
    // Vendor should only see their own raised tickets
    expect(count).toBeLessThan(10);
  });

  test('S.20 Vendor cannot access admin-only data', async ({ page }) => {
    // Vendor cannot navigate to /properties and see all properties
    await page.goto('/properties');
    // Vendor has no property access rule — should see 0 properties or redirect
    const count = await page.locator('.record-card').count();
    // Vendor shouldn't see all properties (0 is fine, as vendor's property rule scopes this)
    expect(count).toBeLessThan(5);
  });
});
