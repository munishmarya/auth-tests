/**
 * Playwright globalSetup — runs once before all tests.
 * Creates a pre-test DB backup on the server so we can restore
 * if tests corrupt real data.
 */
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const SSH_KEY = path.join(os.homedir(), '.ssh/oracle-test');
const SSH_HOST = 'ubuntu@145.241.125.199';

function ssh(cmd, options = {}) {
  return execSync(`ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SSH_HOST} "${cmd}"`, {
    timeout: 60000,
    encoding: 'utf8',
    ...options,
  }).trim();
}

module.exports = async function globalSetup() {
  console.log('\n📦 Creating pre-test DB backup...');
  try {
    const out = ssh('/opt/auth-server/backup.sh 2>&1');
    console.log('  ✓', out.split('\n').pop());
  } catch (e) {
    console.warn('  ⚠ Backup failed — continuing anyway:', e.message.split('\n')[0]);
  }
};
