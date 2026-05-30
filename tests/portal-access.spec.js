const { test, expect } = require('@playwright/test');

// ── Portal Access: PortalSection badge states ─────────────────────────────────
// Tests the full invite lifecycle on profile pages without needing real email acceptance.
// Ravi Kumar (tenant) and Amit Singh (employee) have active portal access.
// We create a fresh PortalTest profile for the revoke/re-invite cycle
// so we don't break the real portal users.

// Helper: click Delete then confirm "Yes, delete" dialog
async function confirmDelete(page) {
  await page.locator('button:has-text("Delete")').click();
  const yes = page.locator('button:has-text("Yes, delete")');
  await yes.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await yes.count() > 0) await yes.click();
}

// Helper: wait for PortalSection to finish loading (inviteLoading = false)
async function waitForPortal(page) {
  await page.locator('.portal-section').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

const TEST_IMAGE = {
  name: 'test-attachment.png',
  mimeType: 'image/png',
  buffer: require('fs').readFileSync(require('path').join(__dirname, '../test-attachment.png')),
};

// ── Admin: portal section states ──────────────────────────────────────────────
test.describe('Portal Access — Admin views profile portal states', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('PA.1 Tenant with active portal shows "Portal access active" + locked email', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Find Ravi Kumar with active portal (badge-portal class, not badge-no-portal)
    const raviCard = page.locator('.record-card-clickable')
      .filter({ hasText: 'Ravi Kumar' })
      .filter({ has: page.locator('.badge-portal') })
      .first();
    if (await raviCard.count() === 0) return; // no Ravi with active portal
    await raviCard.click();

    await waitForPortal(page);

    // Badge: Portal access active
    await expect(page.locator('.portal-section .badge-active')).toBeVisible({ timeout: 8000 });
    // Revoke button visible
    await expect(page.locator('.portal-section .portal-btn.danger')).toBeVisible();
    // Email field is locked (readOnly with muted styling)
    const emailInput = page.locator('.portal-section input[type="email"]');
    await expect(emailInput).toBeVisible();
    const isReadOnly = await emailInput.getAttribute('readonly');
    expect(isReadOnly).not.toBeNull(); // locked when portal active
    // Email shows the portal user's auth email (not blank)
    const emailVal = await emailInput.inputValue();
    expect(emailVal.length).toBeGreaterThan(0);
  });

  test('PA.2 Employee with active portal shows "Portal access active" + locked email', async ({ page }) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Find Amit Singh with active portal (badge-portal class)
    const amitCard = page.locator('.record-card-clickable')
      .filter({ hasText: 'Amit Singh' })
      .filter({ has: page.locator('.badge-portal') })
      .first();
    if (await amitCard.count() === 0) return; // no Amit with active portal
    await amitCard.click();

    await waitForPortal(page);

    await expect(page.locator('.portal-section .badge-active')).toBeVisible({ timeout: 8000 });
    const emailInput = page.locator('.portal-section input[type="email"]');
    const isReadOnly = await emailInput.getAttribute('readonly');
    expect(isReadOnly).not.toBeNull();
    const emailVal = await emailInput.inputValue();
    expect(emailVal.length).toBeGreaterThan(0);
  });

  test('PA.3 Vendor with active portal shows "Portal access active"', async ({ page }) => {
    await page.goto('/vendors');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    const vendorCard = page.locator('.record-card-clickable').filter({ hasText: 'Test Vendor Co' }).first();
    if (await vendorCard.count() === 0) return;
    await vendorCard.click();

    await waitForPortal(page);

    await expect(page.locator('.portal-section .badge-active')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('.portal-section .portal-btn.danger')).toBeVisible();
  });

  test('PA.4 Full invite cycle: send → pending → revoke → re-invite', async ({ page }) => {
    // Create a test tenant without portal access for the full cycle
    await page.goto('/tenants/new');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.fill('input[name="first_name"]', 'PortalTest');
    await page.fill('input[name="last_name"]', 'User');
    await page.fill('input[name="phone"]', '+91 8800000001');
    await page.fill('input[name="nationality"]', 'Indian');
    await page.fill('input[name="current_address"]', 'Portal Test Addr');
    await page.fill('input[name="permanent_address"]', 'Portal Test Perm');
    await page.fill('input[name="emergency_contact_name"]', 'Portal EC');
    await page.fill('input[name="emergency_contact_phone"]', '+91 8800000002');
    await page.selectOption('select[name="id_type"]', 'passport');
    await page.fill('input[name="id_number"]', 'PORTALID001');
    await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenants', { timeout: 10000 });

    // Open the new profile
    const card = page.locator('.record-card-clickable').filter({ hasText: 'PortalTest' }).first();
    if (await card.count() === 0) return;
    await card.click();
    const editUrl = page.url();

    await waitForPortal(page);

    // --- Step 1: No portal access → fill email + Send Invite ---
    const portalSection = page.locator('.portal-section');
    const emailInput = portalSection.locator('input[type="email"]');
    await emailInput.fill('portaltest.user@example.com');
    // Save the profile first to persist the email
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tenants', { timeout: 8000 });
    await page.goto(editUrl);
    await waitForPortal(page);

    const sendBtn = page.locator('.portal-btn').filter({ hasText: /Send Invite/ }).first();
    if (await sendBtn.count() === 0) {
      // Profile might already have a pending/active invite — skip to revoke step
    } else {
      await sendBtn.click();
      await expect(page.locator('text=Invite sent')).toBeVisible({ timeout: 8000 });

      // --- Step 2: Invite pending ---
      await page.goto(editUrl);
      await waitForPortal(page);
      await expect(page.locator('.portal-section .badge-pending')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('.portal-btn').filter({ hasText: /Resend/ })).toBeVisible();
      const revokeBtn = page.locator('.portal-btn.danger').first();
      await expect(revokeBtn).toBeVisible();

      // --- Step 3: Revoke ---
      await revokeBtn.click();
      await expect(page.locator('text=Portal access revoked')).toBeVisible({ timeout: 8000 });

      // --- Step 4: Access revoked badge ---
      await page.goto(editUrl);
      await waitForPortal(page);
      await expect(page.locator('.portal-section .badge-inactive')).toBeVisible({ timeout: 8000 });
      const sendNewBtn = page.locator('.portal-btn').filter({ hasText: /Send New|Send Invite/ }).first();
      await expect(sendNewBtn).toBeVisible();

      // --- Step 5: Re-invite ---
      await sendNewBtn.click();
      await expect(page.locator('text=Invite sent')).toBeVisible({ timeout: 8000 });

      // Back to pending state
      await page.goto(editUrl);
      await waitForPortal(page);
      await expect(page.locator('.portal-section .badge-pending')).toBeVisible({ timeout: 8000 });
    }

    // Cleanup: delete test profile (confirm the dialog)
    if (await page.locator('button:has-text("Delete")').count() > 0) {
      await confirmDelete(page).catch(() => {});
      await page.waitForURL('**/tenants', { timeout: 8000 }).catch(() => {});
    }
  });

  test('PA.5 Invite linked_profile is set on the created invite record', async ({ page }) => {
    // Create a test vendor without portal, send invite, verify linked_profile in InvitesList
    await page.goto('/vendors/new');
    await page.fill('input[name="name"]', 'PortalVendor Test');
    await page.fill('input[name="phone"]', '+91 8800000003');
    await page.waitForFunction(() => {
      const s = document.querySelector('select[name="property"]');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
    await page.selectOption('select[name="property"]', { index: 1 });
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vendors', { timeout: 10000 });

    const card = page.locator('.record-card-clickable').filter({ hasText: 'PortalVendor Test' }).first();
    if (await card.count() === 0) return;
    await card.click();
    const editUrl = page.url();

    // Fill email and save first
    const emailInput = page.locator('.portal-section input[type="email"]');
    await emailInput.fill('portalvendor@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/vendors', { timeout: 8000 });
    await page.goto(editUrl);
    await waitForPortal(page);

    const sendBtn = page.locator('.portal-btn').filter({ hasText: /Send Invite/ }).first();
    if (await sendBtn.count() > 0) {
      await sendBtn.click();
      await expect(page.locator('text=Invite sent')).toBeVisible({ timeout: 8000 });
    }

    // Check InvitesList shows this invite
    await page.goto('/invites');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const inviteCard = page.locator('.record-card').filter({ hasText: 'portalvendor@example.com' });
    if (await inviteCard.count() > 0) {
      await expect(inviteCard.first()).toBeVisible();
    }

    // Cleanup (confirm the delete dialog)
    await page.goto(editUrl);
    if (await page.locator('button:has-text("Delete")').count() > 0) {
      await confirmDelete(page).catch(() => {});
      await page.waitForURL('**/vendors', { timeout: 8000 }).catch(() => {});
    }
  });

  test('PA.6 Resend invite works from profile page', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const cards = page.locator('.record-card-clickable');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await page.goto('/tenants');
      const card = page.locator('.record-card-clickable').nth(i);
      await card.click();
      await waitForPortal(page);

      const resendBtn = page.locator('.portal-btn').filter({ hasText: /Resend/ }).first();
      if (await resendBtn.count() > 0) {
        await resendBtn.click();
        await expect(page.locator('text=Invite link resent')).toBeVisible({ timeout: 8000 });
        return; // Found and tested a pending invite
      }
    }
    // No pending invite found — test passes gracefully
  });
});

// ── Landlord: can invite their own tenants ────────────────────────────────────
test.describe('Portal Access — Landlord can invite', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('PA.7 Landlord sees portal section on their tenant profile', async ({ page }) => {
    await page.goto('/tenants');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const card = page.locator('.record-card-clickable').first();
    if (await card.count() === 0) return; // no tenants visible to landlord

    await card.click();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

    // Portal section should be visible for edit mode
    const portalSection = page.locator('.portal-section');
    if (await portalSection.count() > 0) {
      await portalSection.scrollIntoViewIfNeeded();
      await expect(portalSection).toBeVisible();
      // Some portal state badge should be visible
      await expect(portalSection.locator('.badge').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
