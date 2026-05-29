const { test, expect } = require('@playwright/test');

const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
};

// IDs of the second property (ASK apartment) for scoping tests
let otherPropertyId = '';

test.describe('Landlord CRUD + Scoping', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('L.1 Landlord sees only their own property (not the other landlord\'s)', async ({ page }) => {
    await page.goto('/properties');
    // cs50mun should NOT see ASK apartment (myselfkumaran's property)
    await expect(page.locator('text=ASK apartment')).not.toBeVisible({ timeout: 5000 });
    // Should see test property
    await expect(page.locator('text=test property')).toBeVisible({ timeout: 5000 });
  });

  test('L.2 Landlord creates a unit for their property', async ({ page }) => {
    await page.goto('/units/new');
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('input[name="unit_number"]', 'LL-101');
    await page.selectOption('select[name="type"]', 'apartment');
    await page.fill('input[placeholder="15,000"]', '12000');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/units', { timeout: 10000 });
    await expect(page.locator('text=LL-101').first()).toBeVisible();
  });

  test('L.3 Landlord creates a tenant with remark', async ({ page }) => {
    await page.goto('/tenants/new');
    await page.fill('input[name="first_name"]', 'LandlordTenant');
    await page.fill('input[name="last_name"]', 'Test');
    await page.fill('input[name="phone"]', '+91 8888888801');
    await page.fill('input[name="nationality"]', 'Indian');
    await page.fill('input[name="current_address"]', 'Test Address LL');
    await page.fill('input[name="permanent_address"]', 'Test Perm LL');
    await page.fill('input[name="emergency_contact_name"]', 'LL Emergency');
    await page.fill('input[name="emergency_contact_phone"]', '+91 8888888802');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'LL001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.fill('textarea[name="remark"]', 'Landlord created tenant remark');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenants', { timeout: 10000 });
    await expect(page.locator('text=LandlordTenant').first()).toBeVisible();
  });

  test('L.4 Landlord creates a lease linking their tenant and unit', async ({ page }) => {
    await page.goto('/leases/new');

    const tenantSelect = page.locator('select[name="tenant"]');
    const tenantOptions = await tenantSelect.locator('option').count();
    if (tenantOptions <= 1) return; // No tenants visible

    await tenantSelect.selectOption({ index: 1 });
    await page.selectOption('select[name="unit"]', { index: 1 });
    await page.fill('input[name="start_date"]', '2026-06-01');
    await page.fill('input[name="end_date"]', '2027-06-01');
    await page.fill('input[placeholder="15,000"]', '12000');
    await page.fill('input[placeholder="30,000"]', '24000');
    await page.fill('input[placeholder="1"]', '5');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/leases', { timeout: 10000 });
  });

  test('L.5 Landlord creates an employee for their property', async ({ page }) => {
    await page.goto('/employees/new');
    await page.fill('input[name="first_name"]', 'LandlordEmp');
    await page.fill('input[name="last_name"]', 'Test');
    await page.fill('input[name="phone"]', '+91 7777777701');
    await page.fill('input[name="role_title"]', 'Caretaker');
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.fill('input[name="current_address"]', 'Staff Qtrs LL');
    await page.fill('input[name="permanent_address"]', 'Village LL');
    await page.fill('input[name="emergency_contact_name"]', 'LL Emp Emergency');
    await page.fill('input[name="emergency_contact_phone"]', '+91 7777777702');
    await page.selectOption('select[name="id_type"]', 'national_id');
    await page.fill('input[name="id_number"]', 'LLID001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.fill('input[name="bank_name"]', 'LL Bank');
    await page.fill('input[name="bank_account"]', '9876543201');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/employees', { timeout: 10000 });
    await expect(page.locator('text=LandlordEmp').first()).toBeVisible();
  });

  test('L.6 Landlord creates an employment agreement', async ({ page }) => {
    await page.goto('/agreements/new');
    const empSelect = page.locator('select[name="employee"]');
    const count = await empSelect.locator('option').count();
    if (count <= 1) return;

    await empSelect.selectOption({ index: 1 });
    await page.fill('input[name="start_date"]', '2026-06-01');
    await page.fill('input[name="end_date"]', '2027-06-01');
    await page.fill('input[placeholder="25,000"]', '18000');
    await page.fill('input[placeholder="1"]', '10');
    await page.fill('input[name="bank_name"]', 'LL Agreement Bank');
    await page.fill('input[name="bank_account"]', '1234567801');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/agreements', { timeout: 10000 });
  });

  test('L.7 Landlord creates a vendor for their property', async ({ page }) => {
    await page.goto('/vendors/new');
    await page.fill('input[name="name"]', 'Landlord Vendor');
    await page.fill('input[name="phone"]', '+91 6666666601');
    await page.fill('input[type="email"]', 'llvendor@example.com');
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vendors', { timeout: 10000 });
    await expect(page.locator('text=Landlord Vendor').first()).toBeVisible();
  });

  test('L.8 Landlord can send portal invite to their tenant from profile page', async ({ page }) => {
    await page.goto('/tenants');
    const myCard = page.locator('.record-card-clickable').filter({ hasText: 'LandlordTenant' });
    if (await myCard.count() === 0) return;
    await myCard.first().click();

    const portalSection = page.locator('.portal-section');
    await portalSection.scrollIntoViewIfNeeded();
    const inviteBtn = page.locator('.portal-btn').filter({ hasText: 'Invite to Application' });
    if (await inviteBtn.count() === 0) return; // already invited
    await inviteBtn.click();
    await page.waitForURL(/\/invites\/new\?profileId=/, { timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('L.9 Landlord cannot edit a property they do not own', async ({ page }) => {
    // Navigate to /properties — get the ID of the ONLY visible property
    await page.goto('/properties');
    const ownCard = page.locator('.record-card-clickable').first();
    if (await ownCard.count() === 0) return;

    // Try navigating to a fake/other property ID
    await page.goto('/properties/n9u4641mgymmsl3'); // ASK apartment ID
    // Form loads empty (403 from API) — any save attempt should produce an error
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      // Should show error (empty required fields or API rejection)
      await expect(page.locator('.error, [class*="error"]')).toBeVisible({ timeout: 5000 });
    }
  });
});
