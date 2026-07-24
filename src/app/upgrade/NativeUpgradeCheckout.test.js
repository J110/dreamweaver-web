const fs = require('fs');
const path = require('path');

test('native upgrade renders StoreKit plans inside the Emberlight page', () => {
  const source = fs.readFileSync(path.join(__dirname, 'UpgradeClient.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');

  expect(source).toContain('getNativeOfferings');
  expect(source).toContain('purchaseNative');
  expect(source).toContain('<NativePaywall router={router} />');
  expect(source).toContain('returnToIntent(router)');
  expect(source).toContain('Start my 7-day free trial');
  expect(styles).toContain('.planOption');
  expect(styles).toContain('var(--ember)');
});
