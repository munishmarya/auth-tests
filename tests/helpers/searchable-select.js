// Helpers for interacting with the SearchableSelect combobox component that
// replaced native <select> on data-driven fields (property, unit, tenant,
// employee, vendor, expense_account, assigned_to, property_filter).
//
// Each combobox renders as <div data-field="{name}"><input .../>
// <ul class="searchable-select-options"><li role="option">...</li></ul></div>,
// with the options list only present in the DOM while open (input focused).
// Unlike a native <select>, there is no placeholder <option> in the list —
// index 0 is the first real option (native selects were usually index 1).

function comboRoot(page, name) {
  return page.locator(`[data-field="${name}"]`);
}

async function comboOpen(page, name) {
  const root = comboRoot(page, name);
  await root.locator('input').click();
  return root;
}

async function comboOptionTexts(page, name) {
  const root = await comboOpen(page, name);
  return root.locator('.searchable-select-options li').allTextContents();
}

async function comboOptionCount(page, name) {
  const root = await comboOpen(page, name);
  return root.locator('.searchable-select-options li').count();
}

// matcher: { index } | { label } | a plain label substring string
async function comboSelect(page, name, matcher) {
  const root = await comboOpen(page, name);
  const options = root.locator('.searchable-select-options li');
  if (matcher && typeof matcher === 'object' && 'index' in matcher) {
    await options.nth(matcher.index).click();
  } else {
    const label = typeof matcher === 'object' ? matcher.label : matcher;
    await options.filter({ hasText: label }).first().click();
  }
}

async function waitComboOptions(page, name, minCount = 2, timeout = 10000) {
  await comboOpen(page, name);
  await page.waitForFunction(
    ({ sel, min }) => {
      const r = document.querySelector(sel);
      return r && r.querySelectorAll('.searchable-select-options li').length >= min;
    },
    { sel: `[data-field="${name}"]`, min: minCount },
    { timeout }
  );
}

module.exports = { comboRoot, comboSelect, comboOptionTexts, comboOptionCount, waitComboOptions };
