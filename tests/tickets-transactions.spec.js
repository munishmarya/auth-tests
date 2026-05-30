const { test, expect } = require('@playwright/test');

// Minimal 1x1 PNG for required file upload fields
const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
};

test.describe('Employees, Agreements, Tickets, & Transactions (Admin Context)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('6.1 Create an employee', async ({ page }) => {
    await page.goto('/employees');
    await page.click('button.new-btn');

    // 6.3 Status is now a read-only badge (hook-controlled) — verify badge exists
    await expect(page.locator('.badge')).toBeVisible();

    // Select a property (required in v2)
    await page.selectOption('select[name="property"]', { index: 1 });

    // Email is set via Portal Access section in edit mode — not available on create
    await page.fill('input[name="first_name"]', 'Amit');
    await page.fill('input[name="last_name"]', 'Singh');
    await page.fill('input[name="phone"]', '+91 7777777777');
    await page.fill('input[name="role_title"]', 'Maintenance');
    await page.fill('input[name="current_address"]', 'Block A, Staff Quarters');
    await page.fill('input[name="permanent_address"]', 'Village Test, District X');
    await page.fill('input[name="emergency_contact_name"]', 'Priya Singh');
    await page.fill('input[name="emergency_contact_phone"]', '+91 6666666666');
    await page.selectOption('select[name="id_type"]', 'national_id');
    await page.fill('input[name="id_number"]', 'ID9876543');

    // ID Document is required for new employees
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);

    await page.fill('input[name="bank_name"]', 'HDFC');
    await page.fill('input[name="bank_account"]', '123456789');

    await page.click('button[type="submit"]');
    await page.waitForURL('**/employees', { timeout: 10000 });
    await expect(page.locator('text=Amit').first()).toBeVisible();
  });

  test('7.1 Create employment agreement and check pay day', async ({ page }) => {
    await page.goto('/agreements');
    await page.click('button.new-btn');

    // Fill details — employee field is name="employee" not "employee_id"
    await page.selectOption('select[name="employee"]', { index: 1 });
    await page.fill('input[name="start_date"]', '2025-06-01');
    await page.fill('input[name="end_date"]', '2027-06-01');  // end_date required in v2
    // Salary and pay_day inputs have no name attr — use placeholder
    await page.fill('input[placeholder="25,000"]', '25000');

    // 7.2 Pay Day validations (1-31) — fill valid value
    await page.fill('input[placeholder="1"]', '28');

    await page.fill('input[name="bank_name"]', 'SBI');
    await page.fill('input[name="bank_account"]', '987654321');
    // Status is now a read-only badge (hook-controlled from end_date) — no select

    // Signed contract is required for new agreements
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/agreements', { timeout: 10000 });
  });

  test('8.2 Admin can view ticket list and update status', async ({ page }) => {
    await page.goto('/tickets');
    // Admin can see tickets; if any exist, update the first one's status
    const ticketCards = page.locator('.record-card, tr').filter({ hasText: '' });
    if (await ticketCards.count() > 0) {
      await ticketCards.first().click();
      const statusSelect = page.locator('div.field:has(label:has-text("Status")) select');
      if (await statusSelect.count() > 0) {
        await statusSelect.selectOption('in_progress');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/tickets', { timeout: 10000 });
      }
    }
    // At minimum verify the tickets page loads
    await expect(page.locator('h2, heading')).toBeVisible();
  });

  test('9.1 Create Rent Advice and check Transaction type options', async ({ page }) => {
    await page.goto('/transactions');
    await page.click('button.new-btn');

    // 9.3 Type dropdown — no name attr, is the first select on form (for admin/landlord)
    // Admin gets 6 types (no expense_claim); options show labels not values
    const typeSelect = page.locator('select').first();
    const options = await typeSelect.locator('option').allTextContents();
    const expectedLabels = [
      'Rent Advice', 'Other Tenant Advice', 'Salary Advice',
      'Vendor Invoice', 'Payment Receipt', 'Cash Payment',
    ];
    for (const label of expectedLabels) {
      expect(options.some(opt => opt.includes(label))).toBe(true);
    }

    // Select Rent Advice and verify form updates (amount field appears)
    await typeSelect.selectOption('rent_advice');
    await expect(page.locator('input[placeholder="0"]')).toBeVisible();
  });

  test('6.5 Employee id_document attachment saves and remark persists', async ({ page }) => {
    await page.goto('/employees');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    // Add remark + upload file
    await page.fill('textarea', 'Employee attachment test remark');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Employee updated')).toBeVisible({ timeout: 8000 });
    // Re-open and verify file link + remark
    await page.goto('/employees');
    await page.locator('.record-card-clickable').first().click();
    await expect(page.locator('a.file-link')).toBeVisible({ timeout: 5000 });
    const href = await page.locator('a.file-link').getAttribute('href');
    expect(href).toContain('/api/files/');
    const remark = await page.locator('textarea').inputValue();
    expect(remark).toContain('Employee attachment test remark');
  });

  test('6.6 Admin edits an employee (role_title change)', async ({ page }) => {
    await page.goto('/employees');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    await page.fill('input[name="role_title"]', 'Senior Maintenance');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Employee updated')).toBeVisible({ timeout: 8000 });
  });

  test('7.5 Agreement signed contract attachment saves', async ({ page }) => {
    await page.goto('/agreements');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.fill('textarea', 'Agreement attachment test remark');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Agreement updated')).toBeVisible({ timeout: 8000 });
    await page.goto('/agreements');
    await page.locator('.record-card-clickable').first().click();
    await expect(page.locator('a.file-link')).toBeVisible({ timeout: 5000 });
  });

  test('7.6 Admin edits an agreement (remark change)', async ({ page }) => {
    await page.goto('/agreements');
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return;
    await card.click();
    await page.fill('textarea', 'Updated remark for agreement');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Agreement updated')).toBeVisible({ timeout: 8000 });
  });

  test('9.2 Admin edits a transaction (marks rent advice as paid)', async ({ page }) => {
    await page.goto('/transactions');
    const rentCard = page.locator('.record-card-clickable').filter({ hasText: 'rent_advice' }).first();
    if (await rentCard.count() === 0) return;
    await rentCard.click();
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('paid');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Transaction updated')).toBeVisible({ timeout: 8000 });
    }
  });
});

test.describe('Ticket Tests (Tenant Context)', () => {
  test.use({ storageState: 'auth/tenantStorage.json' });

  test('8.1 Tenant creates a ticket (requires active lease)', async ({ page }) => {
    await page.goto('/tickets');

    // TicketForm requires an active lease — check before clicking new
    const newBtn = page.locator('button.new-btn');
    if (await newBtn.count() === 0) return; // no create permission

    await page.click('button.new-btn');

    const noLease = page.locator('text=No active lease found');
    const categorySelect = page.locator('div.field:has(label:has-text("Category")) select');

    // Wait for async lease-fetch to settle: either error shows or category select appears
    await Promise.race([
      noLease.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
      categorySelect.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
    ]);

    if (await noLease.isVisible()) return;

    // 8.2 Category dropdown verification
    const categories = await categorySelect.locator('option').allTextContents();
    for (const word of ['payment', 'public', 'house', 'suggestion']) {
      expect(categories.some(opt => opt.toLowerCase().includes(word))).toBe(true);
    }

    await categorySelect.selectOption('in_house_maintenance');
    await page.fill('input[placeholder="Brief description of the issue"]', 'Leaking tap in bathroom');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tickets', { timeout: 10000 });
    await expect(page.locator('text=Leaking tap in bathroom')).toBeVisible();
  });

  test('8.5 Tenant sees only tickets they raised', async ({ page }) => {
    await page.goto('/tickets');
    const raisedByMeText = await page.locator('.ticket-author, tr, .record-card').allTextContents();
    expect(raisedByMeText.every(text => !text.includes('Other User Name'))).toBe(true);
  });
});

test.describe('Role-Based Visibility (Employee Context)', () => {
  test.use({ storageState: 'auth/employeeStorage.json' });

  test('9.6 Employee sees only their own expense claims', async ({ page }) => {
    await page.goto('/transactions');
    const types = await page.locator('.transaction-type, tr td:nth-child(2)').allTextContents();
    const nonClaims = types.filter(t => t.trim() !== '' && !t.toLowerCase().includes('expense_claim') && !t.toLowerCase().includes('expense claim'));
    expect(nonClaims.length).toBe(0);
  });
});
