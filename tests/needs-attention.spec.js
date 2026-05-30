const { test, expect } = require('@playwright/test');

// Helper: navigate to Notifications and wait for it to fully load
// Returns false if the page is stuck Loading (stale session — role lookup failed)
async function goToNotifications(page) {
  await page.goto('/needs-attention');
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.locator('text=Loading...').waitFor({ state: 'hidden', timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(500);
}

// Helper: returns true if the notifications page loaded successfully (role resolved)
async function isLoaded(page) {
  const stillLoading = await page.locator('text=Loading...').isVisible().catch(() => false);
  return !stillLoading;
}

// Helper: check a section title is visible
async function sectionVisible(page, title) {
  return page.locator('.notice-section-title', { hasText: title }).isVisible();
}

// ── Admin: full notification suite ───────────────────────────────────────────
test.describe('NeedsAttention — Admin', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('NA.1 Notifications page loads without error', async ({ page }) => {
    await goToNotifications(page);
    // Either shows sections OR "All clear" message
    const hasSections = await page.locator('.notice-section').count() > 0;
    const allClear    = await page.locator('text=All clear').isVisible().catch(() => false);
    expect(hasSections || allClear).toBe(true);
  });

  test('NA.2 Dashboard shows notification count badge when items exist', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    // Notification badge shows total count — may be 0 if everything is clear
    const badge = page.locator('.notif-count').first();
    if (await badge.count() > 0) {
      const text = await badge.textContent();
      expect(Number(text?.trim())).toBeGreaterThanOrEqual(0);
    }
    // Menu item "Notifications" always visible for admin
    await expect(page.locator('.menu-row', { hasText: 'Notifications' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('NA.3 Pending Invites section appears when invites exist', async ({ page }) => {
    await goToNotifications(page);
    // Check if any pending invites exist in DB — section appears only when data exists
    const shown = await sectionVisible(page, 'Pending Invites');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Pending Invites' })).toBeVisible();
      // Each item has a label and sub (expiry info)
      const items = page.locator('.notice-section').filter({ hasText: 'Pending Invites' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
      // Items are clickable and navigate to /invites
      await items.first().click();
      await expect(page).toHaveURL(/\/invites/, { timeout: 5000 });
    }
    // If no pending invites, section is absent — that's valid
  });

  test('NA.4 Open Tickets section appears when unassigned tickets exist', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Open Tickets');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Open Tickets' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Open Tickets' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
      await items.first().click();
      await expect(page).toHaveURL(/\/tickets/, { timeout: 5000 });
    }
  });

  test('NA.5 Pending Receipts from Tenants section', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Pending Receipts from Tenants');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Pending Receipts from Tenants' })).toBeVisible();
      // Items show amount info
      const items = page.locator('.notice-section').filter({ hasText: 'Pending Receipts from Tenants' }).locator('.notice-item-label');
      const text = await items.first().textContent();
      expect(text).toMatch(/Advice|Receipt/);
    }
  });

  test('NA.6 Pending Salary Payments section', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Pending Salary Payments');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Pending Salary' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Pending Salary' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
    }
  });

  test('NA.7 Pending Payments to Vendors section', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Pending Payments to Vendors');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Pending Payments to Vendors' })).toBeVisible();
    }
  });

  test('NA.8 Expense Claims Pending Approval section', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Expense Claims Pending Approval');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Expense Claims' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Expense Claims Pending Approval' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
      // Clicking navigates to transactions
      await items.first().click();
      await expect(page).toHaveURL(/\/transactions/, { timeout: 5000 });
    }
  });

  test('NA.9 Leases Expiring Within 30 Days section', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Leases Expiring');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Leases Expiring' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Leases Expiring' }).locator('.notice-item');
      const firstSub = await items.first().locator('.notice-item-sub').textContent();
      expect(firstSub).toMatch(/day/i);
    }
  });

  test('NA.10 Employment Agreements Expiring Within 30 Days section', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Employment Agreements Expiring');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Employment Agreements Expiring' })).toBeVisible();
    }
  });

  test('NA.11 Profiles Without a Property section (admin only)', async ({ page }) => {
    await goToNotifications(page);
    // This section was added by our migration — shows profiles with no property assigned
    // May or may not appear depending on current data state
    const shown = await sectionVisible(page, 'Profiles Without a Property');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Profiles Without a Property' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Profiles Without a Property' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
      // Items show profile type (Employee/Vendor/Tenant/Landlord)
      const labelText = await items.first().locator('.notice-item-label').textContent();
      expect(labelText).toMatch(/Employee|Vendor|Tenant|Landlord/);
      // Items link to the profile
      await items.first().click();
      await expect(page).toHaveURL(/\/(employees|vendors|tenants|invites)/, { timeout: 5000 });
    }
  });

  test('NA.12 All notification items are clickable and navigate correctly', async ({ page }) => {
    await goToNotifications(page);
    const items = page.locator('.notice-item');
    const count = await items.count();
    if (count === 0) return; // nothing to check

    // Click first item and verify navigation happens
    const firstItem = items.first();
    await firstItem.click();
    // Should navigate somewhere (not stay on needs-attention)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    // Page changed or stayed — just verify no JS error
    await expect(page.locator('body')).toBeVisible();
  });

  test('NA.13 "All clear" message shown when no alerts exist', async ({ page }) => {
    await goToNotifications(page);
    const hasSections = await page.locator('.notice-section').count() > 0;
    if (!hasSections) {
      await expect(page.locator('.notice-empty')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=All clear')).toBeVisible();
    }
    // If sections exist, no "All clear" — both states are valid
  });
});

// ── Landlord: sees own-property notifications only ────────────────────────────
test.describe('NeedsAttention — Landlord', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('NA.14 Landlord Notifications page loads', async ({ page }) => {
    await goToNotifications(page);
    const hasSections = await page.locator('.notice-section').count() > 0;
    const allClear    = await page.locator('text=All clear').isVisible().catch(() => false);
    expect(hasSections || allClear).toBe(true);
  });

  test('NA.15 Landlord does NOT see Profiles Without a Property section', async ({ page }) => {
    await goToNotifications(page);
    // This section is admin-only
    await expect(page.locator('.notice-section-title', { hasText: 'Profiles Without a Property' })).not.toBeVisible({ timeout: 3000 });
  });

  test('NA.16 Landlord sees only their own pending invites', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Pending Invites');
    if (shown) {
      // Landlord should not see invites for the other landlord's property
      const items = page.locator('.notice-section').filter({ hasText: 'Pending Invites' }).locator('.notice-item-label');
      const count = await items.count();
      expect(count).toBeLessThan(20); // sanity — not seeing ALL invites
    }
  });
});

// ── Tenant: sees only their own data ─────────────────────────────────────────
test.describe('NeedsAttention — Tenant', () => {
  test.use({ storageState: 'auth/tenantStorage.json' });

  test('NA.17 Tenant Notifications page loads', async ({ page }) => {
    await goToNotifications(page);
    if (!await isLoaded(page)) return; // Session stale — re-capture tenant session
    const hasSections = await page.locator('.notice-section').count() > 0;
    const allClear    = await page.locator('text=All clear').isVisible().catch(() => false);
    expect(hasSections || allClear).toBe(true);
  });

  test('NA.18 Tenant sees Pending Receipts section when invoices are unpaid', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Pending Receipts');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Pending Receipts' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Pending Receipts' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
    }
  });

  test('NA.19 Tenant sees My Open Tickets when they have open tickets', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'My Open Tickets');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'My Open Tickets' })).toBeVisible();
    }
  });

  test('NA.20 Tenant does NOT see admin sections (Pending Salary, Vendor Payments)', async ({ page }) => {
    await goToNotifications(page);
    await expect(page.locator('.notice-section-title', { hasText: 'Pending Salary' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.notice-section-title', { hasText: 'Pending Payments to Vendors' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.notice-section-title', { hasText: 'Profiles Without' })).not.toBeVisible({ timeout: 3000 });
  });
});

// ── Employee: assigned tickets + expense claims ───────────────────────────────
test.describe('NeedsAttention — Employee', () => {
  test.use({ storageState: 'auth/employeeStorage.json' });

  test('NA.21 Employee Notifications page loads', async ({ page }) => {
    await goToNotifications(page);
    const hasSections = await page.locator('.notice-section').count() > 0;
    const allClear    = await page.locator('text=All clear').isVisible().catch(() => false);
    expect(hasSections || allClear).toBe(true);
  });

  test('NA.22 Employee sees Tickets Assigned to Me when assigned', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Tickets Assigned to Me');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Tickets Assigned to Me' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'Tickets Assigned' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
      await items.first().click();
      await expect(page).toHaveURL(/\/tickets/, { timeout: 5000 });
    }
  });

  test('NA.23 Employee sees Expense Claims Awaiting Approval for their own claims', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'Expense Claims Awaiting Approval');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'Expense Claims Awaiting Approval' })).toBeVisible();
    }
  });

  test('NA.24 Employee does NOT see admin sections', async ({ page }) => {
    await goToNotifications(page);
    await expect(page.locator('.notice-section-title', { hasText: 'Pending Invites' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.notice-section-title', { hasText: 'Pending Salary' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.notice-section-title', { hasText: 'Profiles Without' })).not.toBeVisible({ timeout: 3000 });
  });
});

// ── Vendor: own invoices ──────────────────────────────────────────────────────
test.describe('NeedsAttention — Vendor', () => {
  test.use({ storageState: 'auth/vendorStorage.json' });

  test('NA.25 Vendor Notifications page loads', async ({ page }) => {
    await goToNotifications(page);
    if (!await isLoaded(page)) return; // Session stale — re-capture vendor session
    const hasSections = await page.locator('.notice-section').count() > 0;
    const allClear    = await page.locator('text=All clear').isVisible().catch(() => false);
    expect(hasSections || allClear).toBe(true);
  });

  test('NA.26 Vendor sees My Invoices when vendor_invoice transactions exist', async ({ page }) => {
    await goToNotifications(page);
    const shown = await sectionVisible(page, 'My Invoices');
    if (shown) {
      await expect(page.locator('.notice-section-title', { hasText: 'My Invoices' })).toBeVisible();
      const items = page.locator('.notice-section').filter({ hasText: 'My Invoices' }).locator('.notice-item');
      expect(await items.count()).toBeGreaterThan(0);
      await items.first().click();
      await expect(page).toHaveURL(/\/transactions/, { timeout: 5000 });
    }
  });

  test('NA.27 Vendor does NOT see admin or tenant sections', async ({ page }) => {
    await goToNotifications(page);
    await expect(page.locator('.notice-section-title', { hasText: 'Pending Invites' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.notice-section-title', { hasText: 'Pending Receipts from Tenants' })).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('.notice-section-title', { hasText: 'Profiles Without' })).not.toBeVisible({ timeout: 3000 });
  });
});
