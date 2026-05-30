/**
 * Playwright globalTeardown — runs once after all tests complete.
 * Deletes only test-created artifacts from the DB.
 *
 * SAFE: only deletes records matching test-name patterns (Hook*, ASK*, DelTest*,
 * AutoAdvice*, PortalTest*, TEST-U101, etc.) or records explicitly created by
 * tests (e.g. transactions created today).
 *
 * NEVER deletes:
 *   - Ravi Kumar (user = efwjdvkigr2xvzu)
 *   - Amit Singh (user = euyk3qk4muten71)
 *   - Test Vendor Co (user = ms53mj3ytwxyq47)
 *   - Their leases, agreements, invites
 *   - Properties, landlord assignments, user accounts, roles
 */
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const SSH_KEY = path.join(os.homedir(), '.ssh/oracle-test');
const SSH_HOST = 'ubuntu@145.241.125.199';
const DB = '/opt/auth-server/pb_data/data.db';

const CLEANUP_SQL = `
-- 1. Agreements for test employees only
DELETE FROM employment_agreements WHERE employee IN (
  SELECT id FROM employees
  WHERE first_name LIKE 'Hook%' OR first_name LIKE 'ASK%'
     OR first_name IN ('DelTest','AutoAdvice')
);

-- 2. Leases for test tenants OR test units only
DELETE FROM leases WHERE
  tenant IN (
    SELECT id FROM tenants
    WHERE first_name LIKE 'Hook%' OR first_name LIKE 'ASK%'
       OR first_name IN ('DelTest','AutoAdvice','PortalTest')
  )
  OR unit IN (
    SELECT id FROM units
    WHERE unit_number LIKE 'Hook%' OR unit_number LIKE 'ASK%'
       OR unit_number IN ('DEL-U1','AA-U1','TEST-U101')
       OR unit_number LIKE 'Lakh%'
  );

-- 3. Test invites (by email pattern — never real users)
DELETE FROM invites WHERE
  email LIKE 'portaltest%'
  OR email LIKE 'portalvendor%'
  OR email LIKE 'revoke-test%'
  OR email LIKE 'test-no-role%';

-- 4. Test employees (hook/ASK/DelTest/AutoAdvice only, NOT Amit with portal user)
DELETE FROM employees WHERE
  first_name LIKE 'Hook%' OR first_name LIKE 'ASK%'
  OR first_name IN ('DelTest','AutoAdvice')
  OR (first_name = 'Amit' AND last_name = 'Singh' AND user = '');

-- 5. Test tenants (hook/ASK/DelTest/AutoAdvice/PortalTest, NOT Ravi with portal user)
DELETE FROM tenants WHERE
  first_name LIKE 'Hook%' OR first_name LIKE 'ASK%'
  OR first_name IN ('DelTest','AutoAdvice','PortalTest')
  OR (first_name = 'Ravi' AND last_name = 'Kumar' AND user = '');

-- 6. Test vendors (ASK/DelTest/PortalVendor, NOT Test Vendor Co with portal user)
DELETE FROM vendors WHERE
  name LIKE 'ASK%'
  OR name IN ('DelTest Vendor','PortalVendor Test')
  OR (name = 'Test Vendor Co' AND user = '');

-- 7. Test units (hook/ASK/DEL-U1/AA-U1/TEST-U101/Lakh)
DELETE FROM units WHERE
  unit_number LIKE 'Hook%' OR unit_number LIKE 'ASK%'
  OR unit_number IN ('DEL-U1','AA-U1','TEST-U101')
  OR unit_number LIKE 'Lakh%';

-- 8. Test tickets (by title pattern)
DELETE FROM tickets WHERE
  title LIKE 'Leaking tap%'
  OR title LIKE 'Tenant Ticket%'
  OR title LIKE 'Vendor Test%';

-- 9. Today's test transactions (type-based, date-limited to avoid touching old real data)
DELETE FROM transactions WHERE
  type IN ('rent_advice','salary_advice','vendor_invoice','other_tenant_advice',
           'payment_receipt','cash_payment','expense_claim')
  AND date(created) = date('now');
`;

function ssh(cmd, options = {}) {
  return execSync(`ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SSH_HOST} "${cmd}"`, {
    timeout: 60000,
    encoding: 'utf8',
    ...options,
  }).trim();
}

module.exports = async function globalTeardown() {
  console.log('\n🧹 Cleaning up test data after test suite...');
  try {
    // Write SQL to a temp file on server and run it (avoids shell quoting issues)
    const escaped = CLEANUP_SQL.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const result = ssh(`sqlite3 ${DB} "${escaped}" && sqlite3 ${DB} "SELECT 'tenants:',(SELECT COUNT(*) FROM tenants),' employees:',(SELECT COUNT(*) FROM employees),' units:',(SELECT COUNT(*) FROM units);"`);
    console.log('  ✓ Cleanup complete —', result.trim());
  } catch (e) {
    console.warn('  ⚠ Cleanup failed:', e.message.split('\n')[0]);
  }
};
