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
  expect(source).toContain('isAmbiguousPurchaseResult(result)');
  expect(source).toContain('confirmAndRoute(controller, { ambiguous: true })');
  expect(styles).toContain('.planOption');
  expect(styles).toContain('var(--ember)');
});

test('upgrade page provides a back control to the app', () => {
  const source = fs.readFileSync(path.join(__dirname, 'UpgradeClient.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, 'page.module.css'), 'utf8');

  expect(source).toContain('aria-label="Back to Dream Valley"');
  expect(source).toContain('onClick={() => router.back()}');
  expect(styles).toContain('.headerRow');
  expect(styles).toContain('.backButton');
});
