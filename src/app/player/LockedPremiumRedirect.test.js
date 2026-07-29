const fs = require('fs');
const path = require('path');

test('locked premium content redirects to the shared upgrade page', () => {
  const source = fs.readFileSync(path.join(__dirname, '[id]/page.js'), 'utf8');

  expect(source).toContain('router.replace(`/upgrade?intent=');
  expect(source).toContain('setUpgradeIntent(intentPath)');
  expect(source).not.toContain('<LockedCTA');
  expect(source).not.toContain('<UpgradeShowcase');
});
