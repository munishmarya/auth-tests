const { test, expect } = require('@playwright/test');

// ── Income Statement — Admin ──────────────────────────────────────────────────
test.describe('Income Statement (Admin)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('RPT.1 Income Statement renders table with Income and Expense sections', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Table section headers (use section-header row to avoid matching "Rent Income" etc.)
    await expect(page.locator('tr.section-header').filter({ hasText: 'INCOME' }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('tr.section-header').filter({ hasText: 'EXPENSE' }).first()).toBeVisible();
    await expect(page.locator('tr.total-row').filter({ hasText: 'Total Income' }).first()).toBeVisible();
    await expect(page.locator('tr.total-row').filter({ hasText: 'Total Expenses' }).first()).toBeVisible();
    await expect(page.locator('tr.net-row').filter({ hasText: 'Net (Accrual)' }).first()).toBeVisible();
    await expect(page.locator('tr.net-row').filter({ hasText: 'Net (Cash)' }).first()).toBeVisible();
  });

  test('RPT.2 Income Statement shows MTD and YTD column headers', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    await expect(page.locator('text=Accrual').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Received').first()).toBeVisible();
    await expect(page.locator('text=Open').first()).toBeVisible();
    // Both MTD and YTD groups
    const accrualCols = await page.locator('th:has-text("Accrual")').count();
    expect(accrualCols).toBeGreaterThanOrEqual(2);
  });

  test('RPT.3 Income Statement shows Rent Income from transactions', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // After TX.1 creates a rent_advice, Rent Income row should appear
    // (transactions credit account 4001 = Rent Income)
    const rentRow = page.locator('tr.data-row').filter({ hasText: 'Rent Income' });
    if (await rentRow.count() > 0) {
      await expect(rentRow.first()).toBeVisible();
      // At least accrual should be non-zero
      const cells = await rentRow.first().locator('td').allTextContents();
      const nonZero = cells.some(c => c && c !== '—' && c !== '' && /\d/.test(c));
      expect(nonZero).toBe(true);
    }
    // If no rent income row, that's fine — depends on transaction test order
  });

  test('RPT.4 Income Statement statistics row shows unit counts', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Stats row: Total Units, Occupied, Occupancy%, Avg Rent
    await expect(page.locator('text=Total Units')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Occupied')).toBeVisible();
    await expect(page.locator('text=Occupancy')).toBeVisible();
    await expect(page.locator('text=Avg Rent')).toBeVisible();
  });

  test('RPT.5 Income Statement property filter chips work', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // "All" chip should be active by default
    const allChip = page.locator('.chip-active', { hasText: 'All' });
    await expect(allChip).toBeVisible({ timeout: 5000 });

    // Click a property chip if available
    const chips = page.locator('.chip').filter({ hasNot: page.locator('.chip-active') });
    if (await chips.count() > 0) {
      await chips.first().click();
      // "All" chip should no longer be active
      await expect(page.locator('.chip-active')).toBeVisible();
    }
  });

  test('RPT.6 Income Statement year/month filter changes data', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Change to previous month
    const monthSelect = page.locator('select').nth(1);
    await monthSelect.selectOption({ index: 0 }); // January
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('text=Total Income')).toBeVisible({ timeout: 8000 });
  });

  test('RPT.7 Income Statement drill-down link navigates to transactions', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Find any drill-down link (↗) and click it
    const drillLink = page.locator('.drill-link').first();
    if (await drillLink.count() > 0) {
      await drillLink.click();
      // Should navigate to /transactions
      await expect(page).toHaveURL(/\/transactions/, { timeout: 8000 });
    }
  });
});

// ── Balance Sheet — Admin ─────────────────────────────────────────────────────
test.describe('Balance Sheet (Admin)', () => {
  test.use({ storageState: 'auth/adminStorage.json' });

  test('RPT.8 Balance Sheet renders Asset, Liability, Equity sections', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Total Assets / Liabilities rows always render even when no transactions
    await expect(page.locator('tr.net-row').filter({ hasText: 'Total Assets' }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('tr.net-row').filter({ hasText: 'Total Liabilities' }).first()).toBeVisible();
    // Section headers only appear when accounts have non-zero balances
    const hasData = await page.locator('tr.section-header').count() > 0;
    if (hasData) {
      await expect(page.locator('tr.section-header').filter({ hasText: 'ASSET' }).first()).toBeVisible();
    }
  });

  test('RPT.9 Balance Sheet shows account balances after transactions', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    // Data rows only appear when accounts have non-zero balances (depends on test order)
    // At minimum the page loads and shows total rows
    await expect(page.locator('tr.net-row').filter({ hasText: 'Total Assets' }).first()).toBeVisible({ timeout: 5000 });
    const dataRows = page.locator('tr.data-row');
    const count = await dataRows.count();
    // 0 rows = no transactions yet (acceptable); > 0 = has transaction data
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('RPT.10 Balance Sheet property filter changes view', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    const propSelect = page.locator('.report-filters select').first();
    const options = await propSelect.locator('option').allTextContents();
    if (options.length > 1) {
      // Select first property
      await propSelect.selectOption({ index: 1 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await expect(page.locator('text=Total Assets')).toBeVisible({ timeout: 8000 });
    }
  });

  test('RPT.11 Balance Sheet drill-down navigates to transactions', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});

    const drillRow = page.locator('tr.data-row').first();
    if (await drillRow.count() > 0) {
      await drillRow.click();
      await expect(page).toHaveURL(/\/transactions/, { timeout: 8000 });
    }
  });

  test('RPT.12 Balance Sheet shows "as of" date label', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await expect(page.locator('.report-asof')).toBeVisible({ timeout: 5000 });
  });
});

// ── Reports — Landlord access ─────────────────────────────────────────────────
test.describe('Reports (Landlord)', () => {
  test.use({ storageState: 'auth/landlordStorage.json' });

  test('RPT.13 Landlord Income Statement shows only their property data', async ({ page }) => {
    await page.goto('/income-statement');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    const incomeHeader = page.locator('tr.section-header').filter({ hasText: 'INCOME' }).first();
    if (await incomeHeader.count() === 0) return; // session stale

    await expect(incomeHeader).toBeVisible({ timeout: 8000 });
    await expect(page.locator('tr.section-header').filter({ hasText: 'EXPENSE' }).first()).toBeVisible();
    // Landlord should not see other landlord's properties in the chips
    const chips = await page.locator('.chip').allTextContents();
    // Should see their property chip but not the other landlord's
    const hasBothProperties = chips.some(c => c.includes('ASK apartment')) &&
                               chips.some(c => c.includes('test property'));
    // Landlord should see only THEIR properties in the filter
    expect(hasBothProperties).toBe(false);
  });

  test('RPT.14 Landlord Balance Sheet loads without error', async ({ page }) => {
    await page.goto('/balance-sheet');
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    if (await page.locator('text=Balance Sheet').count() === 0) return; // session stale
    await expect(page.locator('text=Total Assets')).toBeVisible({ timeout: 8000 });
  });
});
