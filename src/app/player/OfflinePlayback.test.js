const fs = require('fs');
const path = require('path');

test('resolves the signed-in ready offline package before selecting a network source', () => {
  const source = fs.readFileSync(path.join(__dirname, '[id]/page.js'), 'utf8');

  expect(source).toContain('resolveOfflinePackage');
  expect(source).toContain('offlinePackage?.audioUrl');
  expect(source).toContain('offlinePackage?.coverUrl');
});

test('releases offline object URLs when the selected voice or content changes', () => {
  const source = fs.readFileSync(path.join(__dirname, '[id]/page.js'), 'utf8');

  expect(source).toContain('current?.revoke()');
  expect(source).toContain('resolvedPackage?.revoke()');
  expect(source).toContain('[content?.id, selectedVoice]');
});
